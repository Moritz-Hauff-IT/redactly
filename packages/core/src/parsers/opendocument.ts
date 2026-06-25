/**
 * OpenDocument parser (.odt / .ods) — LibreOffice/OpenOffice text & sheets.
 *
 * ODF files are ZIP containers with the body in `content.xml`. We pull the
 * visible text out of that XML: paragraph/heading/row ends become newlines,
 * `<text:tab/>`/`<text:s/>` become whitespace, every other tag is stripped.
 * Enough for detection; the masked download is a plain-text dump.
 */

import type { ParseResult } from './txt.js';
import type { SupportedFormat } from './formats.js';

function decodeXmlEntities(s: string): string {
  return s
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_m, d) => String.fromCharCode(Number.parseInt(d, 10)))
    .replace(/&amp;/g, '&');
}

/** Extract plain text from an ODF `content.xml` string. */
export function extractOdfText(contentXml: string): string {
  // Only the office body holds content; drop styles/meta preamble if present.
  const bodyStart = contentXml.indexOf('<office:body');
  const xml = bodyStart === -1 ? contentXml : contentXml.slice(bodyStart);

  return (
    decodeXmlEntities(
      xml
        // Structural boundaries → newlines / whitespace before stripping tags.
        .replace(/<text:tab\b[^>]*\/?>/g, '\t')
        .replace(/<text:s\b[^>]*\/?>/g, ' ')
        .replace(/<text:line-break\b[^>]*\/?>/g, '\n')
        .replace(/<\/(text:p|text:h)>/g, '\n')
        .replace(/<\/table:table-row>/g, '\n')
        .replace(/<\/table:table-cell>/g, '\t')
        // Strip all remaining tags.
        .replace(/<[^>]+>/g, '')
    )
      // A paragraph newline that sits just before a cell tab is noise.
      .replace(/\n\t/g, '\t')
      .replace(/[ \t]+\n/g, '\n')
      .replace(/\n{3,}/g, '\n\n')
      .trim()
  );
}

export async function parseOpenDocumentBlob(
  input: Blob | ArrayBuffer | Uint8Array,
  format: SupportedFormat
): Promise<ParseResult> {
  if (typeof input === 'string') {
    throw new TypeError('parseOpenDocumentBlob expects a Blob or ArrayBuffer, not a string.');
  }
  const JSZip = (await import('jszip')).default;
  const bytes =
    input instanceof Uint8Array
      ? input.byteLength
      : input instanceof ArrayBuffer
        ? input.byteLength
        : (input as Blob).size;

  const zip = await JSZip.loadAsync(input);
  const content = (await zip.file('content.xml')?.async('string')) ?? '';
  return { text: extractOdfText(content), meta: { source: format, format, bytes } };
}
