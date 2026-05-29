/**
 * .xlsx parser — Office Open XML SpreadsheetML.
 *
 * Approach: unzip via jszip, pull text content from two sources:
 *   1. `xl/sharedStrings.xml` — string interning table; cells reference
 *      strings here by index. Contains `<t>...</t>` elements (and rich text
 *      `<r><t>...</t></r>` runs).
 *   2. `xl/worksheets/sheet*.xml` — inline strings on cells that don't go
 *      through the shared table (rare but valid). Contains `<c t="inlineStr">
 *      <is><t>...</t></is></c>`.
 *
 * Output text concatenates all extracted strings with newlines so the
 * detection pipeline sees one row's content per line.
 *
 * The same `<t>` element appears in BOTH places and is the in-place patch
 * point used by the redaction writer — keeping the extraction and redaction
 * targets aligned by construction.
 */

import type { ParseResult } from './txt.js';

const T_REGEX = /<t(?:\s[^>]*)?>([\s\S]*?)<\/t>/g;

function decodeXmlEntities(s: string): string {
  return s
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, '&');
}

export async function parseXlsxBlob(input: Blob | ArrayBuffer | Uint8Array): Promise<ParseResult> {
  if (typeof input === 'string') {
    throw new TypeError(
      'parseXlsxBlob does not accept string input; provide a Blob or ArrayBuffer.'
    );
  }

  const JSZip = (await import('jszip')).default;

  let bytes: number;
  let data: Uint8Array | ArrayBuffer | Blob;
  if (input instanceof Uint8Array) {
    data = input;
    bytes = input.byteLength;
  } else if (input instanceof ArrayBuffer) {
    data = input;
    bytes = input.byteLength;
  } else {
    data = input;
    bytes = (input as Blob).size;
  }

  const zip = await JSZip.loadAsync(data);

  const textPaths = Object.keys(zip.files).filter(
    (path) => path === 'xl/sharedStrings.xml' || /^xl\/worksheets\/sheet\d+\.xml$/.test(path)
  );

  const parts: string[] = [];
  for (const path of textPaths) {
    const file = zip.file(path);
    if (!file) continue;
    const xml = await file.async('string');
    for (const match of xml.matchAll(T_REGEX)) {
      const decoded = decodeXmlEntities(match[1] ?? '');
      if (decoded) parts.push(decoded);
    }
  }

  return {
    text: parts.join('\n'),
    meta: {
      source: 'xlsx',
      format: 'xlsx',
      bytes,
    },
  };
}
