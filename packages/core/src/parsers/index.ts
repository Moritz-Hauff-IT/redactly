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

import { parseTxtBlob } from './txt.js';
import { parseMdBlob } from './md.js';
import { parseEmlBlob } from './eml.js';
import { parsePdfBlob } from './pdf.js';
import { parseDocxBlob } from './docx.js';
import type { ParseResult } from './txt.js';

export type SupportedFormat = 'txt' | 'md' | 'eml' | 'pdf' | 'docx';

/**
 * Thrown when `parseFile` encounters a file format it cannot handle.
 */
export class UnsupportedFormatError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'UnsupportedFormatError';
  }
}

const EXT_MAP: Record<string, SupportedFormat> = {
  txt: 'txt',
  md: 'md',
  markdown: 'md',
  eml: 'eml',
  pdf: 'pdf',
  docx: 'docx',
};

const MIME_MAP: Record<string, SupportedFormat> = {
  'text/plain': 'txt',
  'text/markdown': 'md',
  'message/rfc822': 'eml',
  'application/pdf': 'pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
};

/**
 * Detect the supported format from a filename and optional MIME type.
 * Returns `null` if the format is not recognized.
 */
export function detectFormat(filename: string, mimeType?: string): SupportedFormat | null {
  // Try filename extension first
  const ext = filename.split('.').pop()?.toLowerCase() ?? '';
  if (ext && ext in EXT_MAP) {
    return EXT_MAP[ext] as SupportedFormat;
  }

  // Fall back to MIME type
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

  switch (format) {
    case 'txt':
      return parseTxtBlob(data as Blob | ArrayBuffer | Uint8Array | string);
    case 'md':
      return parseMdBlob(data as Blob | ArrayBuffer | Uint8Array | string);
    case 'eml':
      return parseEmlBlob(data as Blob | ArrayBuffer | Uint8Array | string);
    case 'pdf':
      return parsePdfBlob(data as Blob | ArrayBuffer | Uint8Array);
    case 'docx':
      return parseDocxBlob(data as Blob | ArrayBuffer | Uint8Array);
  }
}
