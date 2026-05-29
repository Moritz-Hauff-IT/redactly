/**
 * File parser dispatcher.
 * Routes files to the appropriate parser based on filename / mime type.
 */

export type { ParseResult } from './txt.js';
export { parseTxtBlob } from './txt.js';
export { parseMdBlob } from './md.js';
export { parseEmlBlob } from './eml.js';
export { parsePdfBlob, PdfWorkerNotConfiguredError } from './pdf.js';
export { parseDocxBlob } from './docx.js';
export { parseXlsxBlob } from './xlsx.js';
export { parsePptxBlob } from './pptx.js';
export { parseImageBlob, runOcr, type OcrResult, type OcrWord } from './image.js';
export { writeAsFormat, writeAsRedactedFormat, type WriteResult } from './writers.js';
export { extractZip, packZip, type ZipManifest, type ZipEntry, type ZipPackEntry } from './zip.js';
export type { SupportedFormat } from './formats.js';
export { FORMAT_META } from './formats.js';

import { parseTxtBlob } from './txt.js';
import { parseMdBlob } from './md.js';
import { parseEmlBlob } from './eml.js';
import { parsePdfBlob } from './pdf.js';
import { parseDocxBlob } from './docx.js';
import { parseXlsxBlob } from './xlsx.js';
import { parsePptxBlob } from './pptx.js';
import { parseImageBlob } from './image.js';
import { FORMAT_META, type SupportedFormat } from './formats.js';
import type { ParseResult } from './txt.js';

/**
 * Thrown when `parseFile` encounters a file format it cannot handle.
 */
export class UnsupportedFormatError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'UnsupportedFormatError';
  }
}

/**
 * Filename extensions → SupportedFormat. Order matters for the comma-joined
 * hint shown in the UI (drives the accept attribute order).
 */
const EXT_MAP: Record<string, SupportedFormat> = {
  txt: 'txt',
  md: 'md',
  markdown: 'md',
  csv: 'csv',
  tsv: 'tsv',
  json: 'json',
  yaml: 'yaml',
  yml: 'yaml',
  toml: 'toml',
  ini: 'ini',
  cfg: 'conf',
  conf: 'conf',
  env: 'env',
  log: 'log',
  sql: 'sql',
  html: 'html',
  htm: 'html',
  xml: 'xml',
  eml: 'eml',
  pdf: 'pdf',
  docx: 'docx',
  xlsx: 'xlsx',
  pptx: 'pptx',
  png: 'png',
  jpg: 'jpg',
  jpeg: 'jpg',
  webp: 'webp',
};

const MIME_MAP: Record<string, SupportedFormat> = {
  'text/plain': 'txt',
  'text/markdown': 'md',
  'text/csv': 'csv',
  'text/tab-separated-values': 'tsv',
  'application/json': 'json',
  'application/yaml': 'yaml',
  'text/yaml': 'yaml',
  'application/toml': 'toml',
  'application/sql': 'sql',
  'text/html': 'html',
  'application/xhtml+xml': 'html',
  'application/xml': 'xml',
  'text/xml': 'xml',
  'message/rfc822': 'eml',
  'application/pdf': 'pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'xlsx',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': 'pptx',
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
};

/**
 * Detect the supported format from a filename and optional MIME type.
 * Returns `null` if the format is not recognized.
 *
 * Filename extensions are checked FIRST because browser-supplied MIME types
 * are unreliable (many text-like formats arrive as empty or `text/plain`).
 */
export function detectFormat(filename: string, mimeType?: string): SupportedFormat | null {
  const ext = filename.split('.').pop()?.toLowerCase() ?? '';
  if (ext && ext in EXT_MAP) {
    return EXT_MAP[ext] as SupportedFormat;
  }

  if (mimeType) {
    const normalizedMime = mimeType.split(';')[0]?.trim().toLowerCase() ?? '';
    if (normalizedMime in MIME_MAP) {
      return MIME_MAP[normalizedMime] as SupportedFormat;
    }
  }

  return null;
}

export interface FileInput {
  name: string;
  type?: string;
  data: Blob | ArrayBuffer | Uint8Array;
}

/**
 * Comma-separated list of accepted extensions (for `<input accept>`) and a
 * human-readable hint string. Derived from FORMAT_META so all three lists
 * — the accept attribute, the UI hint, and the parser dispatcher — stay in
 * sync automatically when a new format is added.
 */
export const ACCEPTED_EXTENSIONS = (() => {
  const exts = new Set<string>();
  for (const ext of Object.keys(EXT_MAP)) {
    exts.add(`.${ext}`);
  }
  exts.add('.zip'); // ZIP is routed separately by the app (multi-file flow)
  return [...exts].join(',');
})();

/**
 * Parse a file by detecting its format from the filename / mime type and
 * routing to the appropriate parser.
 *
 * @throws {UnsupportedFormatError} if the file format is not recognized.
 */
export async function parseFile(file: File | FileInput): Promise<ParseResult> {
  const name = file.name;
  const mimeType = file.type;

  const format = detectFormat(name, mimeType);
  if (!format) {
    throw new UnsupportedFormatError(
      `Unsupported file format: "${name}"${mimeType ? ` (${mimeType})` : ''}. ` +
        `Supported formats: ${Object.keys(EXT_MAP).join(', ')}.`
    );
  }

  let data: Blob | ArrayBuffer | Uint8Array | string;

  if (file instanceof File) {
    data = file;
  } else {
    data = file.data;
  }

  // Dedicated parsers for formats with structure beyond plain text
  switch (format) {
    case 'md':
      return parseMdBlob(data as Blob | ArrayBuffer | Uint8Array | string);
    case 'eml':
      return parseEmlBlob(data as Blob | ArrayBuffer | Uint8Array | string);
    case 'pdf':
      return parsePdfBlob(data as Blob | ArrayBuffer | Uint8Array);
    case 'docx':
      return parseDocxBlob(data as Blob | ArrayBuffer | Uint8Array);
    case 'xlsx':
      return parseXlsxBlob(data as Blob | ArrayBuffer | Uint8Array);
    case 'pptx':
      return parsePptxBlob(data as Blob | ArrayBuffer | Uint8Array);
    case 'png':
    case 'jpg':
    case 'webp':
      return parseImageBlob(data as Blob | ArrayBuffer | Uint8Array, format);
    default: {
      // All other formats are text-like (FORMAT_META[format].isText === true).
      // Same UTF-8 decoder, format discriminant preserves the original
      // extension/MIME for the download path.
      const meta = FORMAT_META[format];
      if (!meta.isText) {
        // Defensive — every non-text format should be handled in a case above.
        throw new UnsupportedFormatError(
          `Internal error: format "${format}" has isText=false but no dedicated parser.`
        );
      }
      return parseTxtBlob(data as Blob | ArrayBuffer | Uint8Array | string, format);
    }
  }
}
