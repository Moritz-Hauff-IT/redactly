/**
 * ZIP archive handling for multi-file PII masking.
 * - extractZip(blob): unpacks a ZIP and returns a manifest of entries
 * - packZip(entries): re-packs masked entries into a downloadable ZIP
 *
 * All processing happens in-browser via jszip.
 */
import type { SupportedFormat } from './index.js';
import { detectFormat } from './index.js';

export interface ZipEntry {
  /** Path within the archive (e.g. 'docs/invoice.pdf'). */
  path: string;
  /** Uncompressed byte size. */
  size: number;
  /** Best-guess MIME type from extension. */
  mimeType: string;
  /** Detected SupportedFormat, or null if not a supported text format. */
  format: SupportedFormat | null;
  /** First ~500 chars of the content as preview (text-like files only). */
  preview: string;
  /** Raw bytes — kept for later masking/repack. */
  bytes: Uint8Array;
  /** True if jszip flagged the entry as a directory. */
  isDir: boolean;
}

export interface ZipManifest {
  filename: string;
  totalEntries: number;
  totalBytes: number;
  entries: ZipEntry[];
}

const MIME_BY_EXT: Record<string, string> = {
  txt: 'text/plain',
  md: 'text/markdown',
  eml: 'message/rfc822',
  pdf: 'application/pdf',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  json: 'application/json',
  csv: 'text/csv',
  yml: 'text/yaml',
  yaml: 'text/yaml',
  html: 'text/html',
  xml: 'application/xml',
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  gif: 'image/gif',
  svg: 'image/svg+xml',
  zip: 'application/zip',
};

function extOf(path: string): string {
  const m = path.toLowerCase().match(/\.([a-z0-9]+)$/);
  return m?.[1] ?? '';
}

/**
 * Unpack a ZIP blob and return a manifest of its contents.
 * Text-like files get a UTF-8 decoded preview (first ~500 chars).
 */
export async function extractZip(blob: Blob, filename: string): Promise<ZipManifest> {
  const JSZip = (await import('jszip')).default;
  const zip = await JSZip.loadAsync(blob);
  const entries: ZipEntry[] = [];

  const files = Object.values(zip.files);
  for (const file of files) {
    const bytes = await file.async('uint8array');
    const ext = extOf(file.name);
    const mimeType = MIME_BY_EXT[ext] ?? 'application/octet-stream';
    const format = detectFormat(file.name, mimeType);

    // Text preview — only attempt for text-like MIMEs and reasonable sizes.
    let preview = '';
    if (!file.dir && mimeType.startsWith('text/') && bytes.byteLength < 5 * 1024 * 1024) {
      try {
        preview = new TextDecoder('utf-8', { fatal: false }).decode(bytes.slice(0, 1500));
        if (preview.length > 500) preview = preview.slice(0, 500) + '…';
      } catch {
        preview = '';
      }
    } else if (!file.dir && format !== null) {
      // Non-text supported format (pdf, docx, eml) — no preview at extract
      // time; caller can pre-parse if it wants previews of those too.
      preview = '';
    }

    entries.push({
      path: file.name,
      size: bytes.byteLength,
      mimeType,
      format,
      preview,
      bytes,
      isDir: file.dir,
    });
  }

  return {
    filename,
    totalEntries: entries.length,
    totalBytes: entries.reduce((sum, e) => sum + e.size, 0),
    entries,
  };
}

export interface ZipPackEntry {
  path: string;
  bytes: Uint8Array;
}

/**
 * Re-pack a list of (path, bytes) into a downloadable ZIP blob.
 */
export async function packZip(
  entries: ZipPackEntry[],
  outputName: string
): Promise<{
  blob: Blob;
  filename: string;
}> {
  const JSZip = (await import('jszip')).default;
  const zip = new JSZip();
  for (const e of entries) {
    zip.file(e.path, e.bytes);
  }
  const blob = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE' });
  const filename = outputName.endsWith('.zip') ? outputName : `${outputName}.zip`;
  return { blob, filename };
}
