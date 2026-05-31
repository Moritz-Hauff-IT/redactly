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
} from '@de-pii/core/parsers';
import {
  generateFilePlan,
  heuristicPlan,
  type FilePlan,
  type ManifestEntryForLlm,
  type ChatEngine,
} from '@de-pii/core/orchestrator';
import { analyze } from './pipeline.js';
import { mask } from '@de-pii/core/masker';

// Suppress unused warnings — these symbols are re-exposed for callers that
// import zipFlow alongside its sub-helpers.
void extractZip;

export interface ZipMaskResult {
  blob: Blob;
  filename: string;
  /** Per-file outcome — useful for surfacing in UI. */
  perFile: PerFileResult[];
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

  const toProcess = manifest.entries.filter((e) => !e.isDir);
  let done = 0;
  // Tracks the last time we yielded to the browser for a paint. Without
  // this, batches of tiny files (e.g. 100x 500-byte .eml) complete inside
  // a single task; Svelte coalesces all state updates into one render, the
  // user sees 0 → 100% with nothing in between, AND the Cancel button can't
  // receive clicks because the event loop never reaches input handling.
  // Starting at 0 forces a yield on iteration 1 so the user sees the modal
  // transition into apply-mode immediately. After that we throttle to
  // ~20fps which is enough for smooth progress without significantly
  // slowing real workloads.
  let lastYieldAt = 0;
  const YIELD_INTERVAL_MS = 50;

  for (const entry of toProcess) {
    if (signal?.aborted) throw new ZipAbortError();
    done++;
    const tick = (step: ProgressStep | null) =>
      onProgress?.({ done, total: toProcess.length, currentPath: entry.path, step });
    tick(null);
    if (performance.now() - lastYieldAt >= YIELD_INTERVAL_MS) {
      await new Promise<void>((r) => requestAnimationFrame(() => r()));
      lastYieldAt = performance.now();
    }

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
      const masked = mask(parsed.text, entities);
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
  return { blob, filename, perFile };
}
