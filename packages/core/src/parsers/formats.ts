/**
 * Single source of truth for supported file formats.
 *
 * Each entry maps a `SupportedFormat` discriminant to:
 *   - the canonical file extension used for downloads
 *   - the MIME type (without charset suffix)
 *   - whether it's a text-like format (parsed via parseTxtBlob, written via
 *     a generic text writer) or has a dedicated parser/writer (pdf, docx,
 *     eml — these have their own logic in their own files).
 */

export interface FormatMeta {
  extension: string;
  mime: string;
  /** True if the format is plain-text-like: parsed via parseTxtBlob and
   * written via a generic text-blob writer. Layout-preserving redaction
   * is meaningless for text formats — masked text just replaces source text. */
  isText: boolean;
}

export const FORMAT_META = {
  // Inherent text formats — parsed and written as UTF-8 text
  txt: { extension: 'txt', mime: 'text/plain', isText: true },
  md: { extension: 'md', mime: 'text/markdown', isText: true },
  csv: { extension: 'csv', mime: 'text/csv', isText: true },
  tsv: { extension: 'tsv', mime: 'text/tab-separated-values', isText: true },
  json: { extension: 'json', mime: 'application/json', isText: true },
  yaml: { extension: 'yaml', mime: 'application/yaml', isText: true },
  toml: { extension: 'toml', mime: 'application/toml', isText: true },
  ini: { extension: 'ini', mime: 'text/plain', isText: true },
  conf: { extension: 'conf', mime: 'text/plain', isText: true },
  env: { extension: 'env', mime: 'text/plain', isText: true },
  log: { extension: 'log', mime: 'text/plain', isText: true },
  sql: { extension: 'sql', mime: 'application/sql', isText: true },
  html: { extension: 'html', mime: 'text/html', isText: true },
  xml: { extension: 'xml', mime: 'application/xml', isText: true },

  // Structured formats — have dedicated parsers/writers in their own files
  rtf: { extension: 'rtf', mime: 'application/rtf', isText: false },
  odt: { extension: 'odt', mime: 'application/vnd.oasis.opendocument.text', isText: false },
  ods: { extension: 'ods', mime: 'application/vnd.oasis.opendocument.spreadsheet', isText: false },
  eml: { extension: 'eml', mime: 'message/rfc822', isText: false },
  pdf: { extension: 'pdf', mime: 'application/pdf', isText: false },
  docx: {
    extension: 'docx',
    mime: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    isText: false,
  },
  xlsx: {
    extension: 'xlsx',
    mime: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    isText: false,
  },
  pptx: {
    extension: 'pptx',
    mime: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    isText: false,
  },

  // Images — text extracted via OCR (Tesseract.js). Redaction overlays the
  // original raster: detected PII regions get whited out + relabeled in place.
  png: { extension: 'png', mime: 'image/png', isText: false },
  jpg: { extension: 'jpg', mime: 'image/jpeg', isText: false },
  webp: { extension: 'webp', mime: 'image/webp', isText: false },
} as const satisfies Record<string, FormatMeta>;

export type SupportedFormat = keyof typeof FORMAT_META;
