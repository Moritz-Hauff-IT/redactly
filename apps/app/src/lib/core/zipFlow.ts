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
  type FileAction,
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
 * Per-file analysis result. Has all info needed to re-mask the file
 * with a filtered entity set in the pack phase, without re-running
 * parsing or detection (both expensive).
 */
export interface FileAnalysis {
  path: string;
  mimeType: string;
  format: SupportedFormat | null;
  /** What the user originally said to do with this file in the plan. */
  action: FileAction;
  /**
   * Raw input bytes — preserved so 'review' (keep-as-is) files can be
   * re-packed without re-parsing, and so 'mask' files whose parse failed
   * fall back to the original bytes cleanly.
   */
  originalBytes: Uint8Array;
  /**
   * Only present for files where action='mask' AND parse succeeded.
   * The detected entities (regex + NER + LLM merge already done).
   */
  parsedText?: string;
  entities?: Entity[];
  /** Set when parse failed or no parser available — used for UI hinting. */
  error?: string;
}

export interface ZipAnalysis {
  files: FileAnalysis[];
  /**
   * Cross-file mapping with EVERY detected entity included. The pack
   * phase will re-run mask() with a possibly-filtered subset; this
   * unfiltered map is for the review UI to show what's available.
   */
  fullMapping: Mapping;
}

/**
 * Phase 1: Parse + detect entities for every file in the plan. Does NOT
 * write a ZIP — returns a structured analysis the caller can show to the
 * user for review. Caller invokes packZipFromAnalysis() afterwards (with
 * optional per-entity filters) to actually produce the downloadable ZIP.
 *
 * Splitting this two-phase makes per-entity toggling possible: the
 * expensive work (parse, NER, LLM) runs once; the user can then exclude
 * individual entities and we re-mask quickly with no second NER/LLM cost.
 */
export async function analyzeFiles(
  manifest: ZipManifest,
  plan: FilePlan,
  options: ApplyPlanOptions = {}
): Promise<ZipAnalysis> {
  const { onProgress, onFileComplete, signal } = options;
  const planByPath = new Map(plan.entries.map((e) => [e.path, e]));
  const files: FileAnalysis[] = [];
  // Accumulates across every masked file in the batch — used by mask(...,
  // { existing }) so identical originals across files reuse the same
  // placeholder index. Single source of truth across the analysis.
  let runningMapping: Mapping | undefined = undefined;

  const toProcess = manifest.entries.filter((e) => !e.isDir);
  let done = 0;

  for (const entry of toProcess) {
    if (signal?.aborted) throw new ZipAbortError();
    done++;
    const tick = (step: ProgressStep | null) =>
      onProgress?.({ done, total: toProcess.length, currentPath: entry.path, step });
    tick(null);
    // Yield to the browser after every file so the UI paints + Cancel
    // button stays clickable. Brave's coarsened performance.now() made
    // the time-throttled version unreliable for small batches.
    await new Promise<void>((r) => requestAnimationFrame(() => r()));

    const planEntry = planByPath.get(entry.path);
    const action: FileAction = planEntry?.action ?? 'review';
    const originalBytes = new Uint8Array(entry.bytes);

    if (action === 'skip') {
      files.push({
        path: entry.path,
        mimeType: entry.mimeType,
        format: entry.format,
        action,
        originalBytes,
      });
      onFileComplete?.({ path: entry.path, action: 'skipped' });
      continue;
    }

    if (action !== 'mask') {
      files.push({
        path: entry.path,
        mimeType: entry.mimeType,
        format: entry.format,
        action,
        originalBytes,
      });
      onFileComplete?.({ path: entry.path, action: 'kept' });
      continue;
    }

    // action === 'mask' but no parser for this format → keep original
    if (entry.format === null) {
      files.push({
        path: entry.path,
        mimeType: entry.mimeType,
        format: null,
        action,
        originalBytes,
        error: 'No parser for this format',
      });
      onFileComplete?.({
        path: entry.path,
        action: 'kept',
        error: 'No parser for this format',
      });
      continue;
    }

    try {
      tick('parse');
      const blob = new Blob([originalBytes]);
      const parsed = await parseFile({
        name: entry.path,
        type: entry.mimeType,
        data: blob,
      });
      tick('detect');
      const entities = await analyze(parsed.text);
      tick('mask');
      // Run mask now to ACCUMULATE the cross-file mapping. We discard the
      // masked output for this phase — pack phase re-runs mask with the
      // user's filter to produce the actual bytes. The existing-mapping
      // chain still ensures placeholder indices stay consistent.
      const masked = mask(parsed.text, entities, { existing: runningMapping });
      runningMapping = masked.mapping;

      files.push({
        path: entry.path,
        mimeType: entry.mimeType,
        format: entry.format,
        action,
        originalBytes,
        parsedText: parsed.text,
        entities,
      });
      onFileComplete?.({
        path: entry.path,
        action: 'masked',
        entityCount: entities.length,
      });
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      files.push({
        path: entry.path,
        mimeType: entry.mimeType,
        format: entry.format,
        action,
        originalBytes,
        error: errMsg,
      });
      onFileComplete?.({
        path: entry.path,
        action: 'failed',
        error: errMsg,
      });
    }
  }

  if (signal?.aborted) throw new ZipAbortError();
  const { createMapping } = await import('@redactly/core/masker');
  return { files, fullMapping: runningMapping ?? createMapping() };
}

/**
 * Phase 2: Take an analysis from analyzeFiles + a set of entity keys the
 * user wants to EXCLUDE, re-run mask() per file with the filter, pack
 * everything into a ZIP. Cheap — no parse/NER/LLM work.
 *
 * disabledEntityKeys are `${type}:${text}` strings; matching any entity's
 * (type, text) tuple means it stays in plain text in the output. Empty
 * set = mask everything.
 */
export async function packZipFromAnalysis(
  analysis: ZipAnalysis,
  outputName: string,
  disabledEntityKeys: ReadonlySet<string> = new Set()
): Promise<ZipMaskResult> {
  const { createMapping } = await import('@redactly/core/masker');
  const outputEntries: ZipPackEntry[] = [];
  const perFile: ZipMaskResult['perFile'] = [];
  // Rebuild mapping from scratch so it only contains entities the user
  // ACTUALLY masked — the Restore tab + DetectionReview reflect what's
  // really in the output, not what the analyser found.
  let runningMapping: Mapping = createMapping();

  for (const file of analysis.files) {
    if (file.action === 'skip') {
      perFile.push({ path: file.path, action: 'skipped' });
      continue;
    }

    if (file.action !== 'mask') {
      outputEntries.push({ path: file.path, bytes: file.originalBytes });
      perFile.push({ path: file.path, action: 'kept' });
      continue;
    }

    // mask action but parse/detect failed → keep original
    if (!file.entities || !file.parsedText || file.format === null) {
      outputEntries.push({ path: file.path, bytes: file.originalBytes });
      perFile.push({
        path: file.path,
        action: 'kept',
        error: file.error ?? 'No parsed text',
      });
      continue;
    }

    const enabledEntities = file.entities.filter(
      (e) => !disabledEntityKeys.has(`${e.type}:${e.text}`)
    );

    if (enabledEntities.length === 0) {
      // All entities were unchecked → keep file as-is, no placeholder noise
      outputEntries.push({ path: file.path, bytes: file.originalBytes });
      perFile.push({ path: file.path, action: 'kept' });
      continue;
    }

    try {
      const masked = mask(file.parsedText, enabledEntities, { existing: runningMapping });
      runningMapping = masked.mapping;
      const baseName = file.path.replace(/\.[^.]+$/, '');
      const written = await writeAsFormat(masked.maskedText, file.format, baseName);
      const writtenBytes = new Uint8Array(await written.blob.arrayBuffer());
      outputEntries.push({ path: file.path, bytes: writtenBytes });
      perFile.push({
        path: file.path,
        action: 'masked',
        entityCount: enabledEntities.length,
      });
    } catch (err) {
      outputEntries.push({ path: file.path, bytes: file.originalBytes });
      perFile.push({
        path: file.path,
        action: 'failed',
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  const { blob, filename } = await packZip(outputEntries, outputName);
  const entities = mappingToSyntheticEntities(runningMapping);
  return { blob, filename, perFile, mapping: runningMapping, entities };
}

/**
 * Convenience: legacy one-shot — analyze + immediately pack with no
 * filter. Kept for callers that don't need the review step.
 */
export async function applyPlan(
  manifest: ZipManifest,
  plan: FilePlan,
  outputName: string,
  options: ApplyPlanOptions = {}
): Promise<ZipMaskResult> {
  const analysis = await analyzeFiles(manifest, plan, options);
  if (options.signal?.aborted) throw new ZipAbortError();
  return packZipFromAnalysis(analysis, outputName);
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
