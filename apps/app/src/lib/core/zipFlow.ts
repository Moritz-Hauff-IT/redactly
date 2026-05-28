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
  perFile: Array<{
    path: string;
    action: 'masked' | 'skipped' | 'failed' | 'kept';
    entityCount?: number;
    error?: string;
  }>;
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

/**
 * Apply a plan: mask each 'mask' entry, skip others (kept in archive as-is
 * unless action === 'skip' which DROPS the file from the output).
 */
export async function applyPlan(
  manifest: ZipManifest,
  plan: FilePlan,
  outputName: string,
  onProgress?: (done: number, total: number, currentPath: string) => void
): Promise<ZipMaskResult> {
  const planByPath = new Map(plan.entries.map((e) => [e.path, e]));
  const outputEntries: ZipPackEntry[] = [];
  const perFile: ZipMaskResult['perFile'] = [];

  const toProcess = manifest.entries.filter((e) => !e.isDir);
  let done = 0;
  for (const entry of toProcess) {
    done++;
    onProgress?.(done, toProcess.length, entry.path);

    const planEntry = planByPath.get(entry.path);
    const action = planEntry?.action ?? 'review';

    if (action === 'skip') {
      // Dropped from output entirely
      perFile.push({ path: entry.path, action: 'skipped' });
      continue;
    }

    if (action === 'review') {
      // Keep original in output but don't mask — user said unclear
      outputEntries.push({ path: entry.path, bytes: entry.bytes });
      perFile.push({ path: entry.path, action: 'kept' });
      continue;
    }

    if (action !== 'mask') {
      outputEntries.push({ path: entry.path, bytes: entry.bytes });
      perFile.push({ path: entry.path, action: 'kept' });
      continue;
    }

    // action === 'mask'
    if (entry.format === null) {
      // Can't parse — keep original
      outputEntries.push({ path: entry.path, bytes: entry.bytes });
      perFile.push({
        path: entry.path,
        action: 'kept',
        error: 'No parser for this format',
      });
      continue;
    }

    try {
      const blob = new Blob([new Uint8Array(entry.bytes)]);
      const parsed = await parseFile({
        name: entry.path,
        type: entry.mimeType,
        data: blob,
      });
      const entities = await analyze(parsed.text);
      const masked = mask(parsed.text, entities);

      const baseName = entry.path.replace(/\.[^.]+$/, '');
      const fmt = entry.format as SupportedFormat;
      const written = await writeAsFormat(masked.maskedText, fmt, baseName);
      const writtenBytes = new Uint8Array(await written.blob.arrayBuffer());

      // Keep the masked file at the SAME path so directory structure is preserved.
      outputEntries.push({ path: entry.path, bytes: writtenBytes });
      perFile.push({
        path: entry.path,
        action: 'masked',
        entityCount: entities.length,
      });
    } catch (err) {
      // Mask failed — keep original so the user doesn't lose data
      outputEntries.push({ path: entry.path, bytes: entry.bytes });
      perFile.push({
        path: entry.path,
        action: 'failed',
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  const { blob, filename } = await packZip(outputEntries, outputName);
  return { blob, filename, perFile };
}
