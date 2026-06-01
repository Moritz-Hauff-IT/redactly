/**
 * ZIP archive multi-file masking flow.
 *
 * 1. Extract → ZipManifest
 * 2. (optional) Orchestrate via WebLLM → FilePlan
 * 3. User reviews/edits plan
 * 4. Batch-mask all 'mask' entries
 * 5. Pack back into ZIP for download
 *
 * The plan generation uses the active WebLLM engine if present; otherwise
 * falls back to a heuristic plan based on MIME types.
 */

import {
  extractZip,
  packZip,
  writeAsFormat,
  parseFile,
  type SupportedFormat,
  type ZipManifest,
  type ZipPackEntry,
} from '@redactly/core/parsers';
import {
  generateFilePlan,
  heuristicPlan,
  type FilePlan,
  type ManifestEntryForLlm,
  type ChatEngine,
} from '@redactly/core/orchestrator';
import { analyze } from './pipeline.js';
import { mask, type Mapping } from '@redactly/core/masker';
import type { Entity, EntityCategory, EntityType } from '@redactly/core/types';

// Suppress unused warnings — these symbols are re-exposed for callers that
// import zipFlow alongside its sub-helpers.
void extractZip;

export interface ZipMaskResult {
  blob: Blob;
  filename: string;
  /** Per-file outcome — useful for surfacing in UI. */
  perFile: PerFileResult[];
  /**
   * Cross-file mapping: every original→placeholder pair seen across the
   * whole batch. Same original value in different files maps to the same
   * placeholder, so restore from a single LLM response covering multiple
   * documents works correctly. Caller stores this in mappingStore so the
   * Restore tab is ready immediately after the download.
   */
  mapping: Mapping;
  /**
   * Synthetic entity list reflecting EVERY masking that happened across
   * the whole batch — one per (original-value, type) pair from the
   * accumulated mapping. Positions are stubbed (start=0) because there's
   * no single source text to anchor against; the list exists so the
   * detection-review UI in the redact tab can show 'X entities were
   * masked' after a ZIP run, rather than being empty.
   */
  entities: Entity[];
}

export type PerFileResult = {
  path: string;
  action: 'masked' | 'skipped' | 'failed' | 'kept';
  entityCount?: number;
  error?: string;
};

export type ProgressStep = 'parse' | 'detect' | 'mask' | 'write';

export interface ProgressState {
  done: number;
  total: number;
  currentPath: string;
  /** What sub-stage the current file is in. null between files. */
  step: ProgressStep | null;
}

export class ZipAbortError extends Error {
  constructor() {
    super('ZIP processing aborted');
    this.name = 'ZipAbortError';
  }
}

function toManifestEntries(manifest: ZipManifest): ManifestEntryForLlm[] {
  return manifest.entries
    .filter((e) => !e.isDir)
    .map((e) => ({
      path: e.path,
      size: e.size,
      mimeType: e.mimeType,
      format: e.format,
      preview: e.preview,
    }));
}

/** Build a plan via LLM if engine provided, else heuristic. */
export async function buildPlan(
  manifest: ZipManifest,
  engine: ChatEngine | null
): Promise<FilePlan> {
  const llmManifest = toManifestEntries(manifest);
  if (engine === null) {
    return heuristicPlan(llmManifest);
  }
  return generateFilePlan(engine, llmManifest, { debug: true });
}

export interface ApplyPlanOptions {
  /** Fires whenever the current file moves to the next sub-stage. */
  onProgress?: (state: ProgressState) => void;
  /** Fires once per file with its final outcome — drives the per-file log UI. */
  onFileComplete?: (result: PerFileResult) => void;
  /**
   * Checked between files. We can't interrupt mid-NER or mid-parse (they're
   * single async calls), so cancellation has at most one-file latency.
   * Throws ZipAbortError; callers should catch and treat as user-cancel.
   */
  signal?: AbortSignal;
}

/**
 * Apply a plan: mask each 'mask' entry, skip others (kept in archive as-is
 * unless action === 'skip' which DROPS the file from the output).
 *
 * On cancel: throws ZipAbortError without packing partial output. We deliberately
 * don't return a partial ZIP — the user clicked cancel, presumably because the
 * result was wrong (e.g. forgot to toggle a file), and a half-baked archive is
 * confusing. Re-running is the right path.
 */
export async function applyPlan(
  manifest: ZipManifest,
  plan: FilePlan,
  outputName: string,
  options: ApplyPlanOptions = {}
): Promise<ZipMaskResult> {
  const { onProgress, onFileComplete, signal } = options;
  const planByPath = new Map(plan.entries.map((e) => [e.path, e]));
  const outputEntries: ZipPackEntry[] = [];
  const perFile: ZipMaskResult['perFile'] = [];
  // Accumulates across every masked file in the batch — passed back into
  // mask(..., { existing }) per call so identical originals across files
  // reuse the same placeholder index.
  let runningMapping: Mapping | undefined = undefined;

  const toProcess = manifest.entries.filter((e) => !e.isDir);
  let done = 0;
  // Yield to the browser after EVERY file so:
  //   - Svelte paints the per-file state transition
  //   - the Cancel button can actually receive clicks
  //   - tiny-file batches (12x 500-byte .eml) don't run inside one task
  // We tried a time-based throttle (yield only when >50ms since last yield)
  // but Brave's privacy shields coarsen performance.now() resolution, so
  // the threshold was never crossed for fast batches. A per-file yield
  // costs ~16ms/file (one animation frame); for 100 files that's ~1.6s
  // total — acceptable, especially since real workloads have heavier per-
  // file work (NER, PDF parse) that dwarfs the yield cost.

  for (const entry of toProcess) {
    if (signal?.aborted) throw new ZipAbortError();
    done++;
    const tick = (step: ProgressStep | null) =>
      onProgress?.({ done, total: toProcess.length, currentPath: entry.path, step });
    tick(null);
    await new Promise<void>((r) => requestAnimationFrame(() => r()));

    const planEntry = planByPath.get(entry.path);
    const action = planEntry?.action ?? 'review';

    if (action === 'skip') {
      const r: PerFileResult = { path: entry.path, action: 'skipped' };
      perFile.push(r);
      onFileComplete?.(r);
      continue;
    }

    if (action === 'review' || action !== 'mask') {
      outputEntries.push({ path: entry.path, bytes: entry.bytes });
      const r: PerFileResult = { path: entry.path, action: 'kept' };
      perFile.push(r);
      onFileComplete?.(r);
      continue;
    }

    // action === 'mask'
    if (entry.format === null) {
      outputEntries.push({ path: entry.path, bytes: entry.bytes });
      const r: PerFileResult = {
        path: entry.path,
        action: 'kept',
        error: 'No parser for this format',
      };
      perFile.push(r);
      onFileComplete?.(r);
      continue;
    }

    try {
      tick('parse');
      const blob = new Blob([new Uint8Array(entry.bytes)]);
      const parsed = await parseFile({
        name: entry.path,
        type: entry.mimeType,
        data: blob,
      });
      tick('detect');
      const entities = await analyze(parsed.text);
      tick('mask');
      const masked = mask(parsed.text, entities, { existing: runningMapping });
      runningMapping = masked.mapping;
      tick('write');
      const baseName = entry.path.replace(/\.[^.]+$/, '');
      const fmt = entry.format as SupportedFormat;
      const written = await writeAsFormat(masked.maskedText, fmt, baseName);
      const writtenBytes = new Uint8Array(await written.blob.arrayBuffer());

      outputEntries.push({ path: entry.path, bytes: writtenBytes });
      const r: PerFileResult = {
        path: entry.path,
        action: 'masked',
        entityCount: entities.length,
      };
      perFile.push(r);
      onFileComplete?.(r);
    } catch (err) {
      outputEntries.push({ path: entry.path, bytes: entry.bytes });
      const r: PerFileResult = {
        path: entry.path,
        action: 'failed',
        error: err instanceof Error ? err.message : String(err),
      };
      perFile.push(r);
      onFileComplete?.(r);
    }
  }

  if (signal?.aborted) throw new ZipAbortError();
  const { blob, filename } = await packZip(outputEntries, outputName);
  // Empty mapping if no files were actually masked (all skip/kept) — that's
  // a valid state, the masker exports createMapping() but we don't need it
  // here because mappingStore handles null itself; caller decides what to do.
  const { createMapping } = await import('@redactly/core/masker');
  const finalMapping = runningMapping ?? createMapping();
  const entities = mappingToSyntheticEntities(finalMapping);
  return { blob, filename, perFile, mapping: finalMapping, entities };
}

// ---------------------------------------------------------------------------
// Mapping → synthetic Entity[] for UI display
// ---------------------------------------------------------------------------

/**
 * Reverse-mapping from masker prefix (e.g. PERSON, EMAIL, LOC, SECRET)
 * back to the canonical EntityType + category. Masker collapses many
 * secret subtypes into the single 'SECRET' prefix and renames a few
 * others (LOCATION → LOC, CREDIT_CARD → CARD), so reversal is lossy
 * but good enough for a list display.
 */
const PREFIX_TO_TYPE: Record<string, { type: EntityType; category: EntityCategory }> = {
  PERSON: { type: 'PERSON', category: 'person' },
  ORG: { type: 'ORG', category: 'organization' },
  LOC: { type: 'LOCATION', category: 'address' },
  EMAIL: { type: 'EMAIL', category: 'contact' },
  PHONE: { type: 'PHONE', category: 'contact' },
  URL: { type: 'URL', category: 'contact' },
  IP: { type: 'IP', category: 'contact' },
  IBAN: { type: 'IBAN', category: 'financial' },
  BIC: { type: 'BIC', category: 'financial' },
  CARD: { type: 'CREDIT_CARD', category: 'financial' },
  TAX_ID: { type: 'TAX_ID_DE', category: 'financial' },
  VAT_ID: { type: 'VAT_ID', category: 'financial' },
  AHV: { type: 'CH_AHV', category: 'identity' },
  UID: { type: 'CH_UID', category: 'identity' },
  PASS: { type: 'CH_PASSPORT', category: 'identity' },
  AUSWEIS: { type: 'DE_PERSONALAUSWEIS', category: 'identity' },
  KFZ: { type: 'LICENSE_PLATE', category: 'identity' },
  EMP_ID: { type: 'EMPLOYEE_ID', category: 'identity' },
  REF: { type: 'INTERNAL_REF', category: 'identity' },
  SECRET: { type: 'GENERIC_SECRET', category: 'secret' },
};

function mappingToSyntheticEntities(mapping: Mapping): Entity[] {
  const out: Entity[] = [];
  // mapping.forward is Map<placeholder, original>. Iterate that.
  for (const [placeholder, original] of mapping.forward) {
    const m = placeholder.match(/^\[([A-Z_]+)_\d+\]$/);
    const prefix = m?.[1] ?? 'SECRET';
    const mapped = PREFIX_TO_TYPE[prefix] ?? PREFIX_TO_TYPE.SECRET!;
    out.push({
      start: 0,
      end: original.length,
      type: mapped.type,
      category: mapped.category,
      text: original,
      confidence: 1,
      source: 'llm',
    });
  }
  return out;
}
