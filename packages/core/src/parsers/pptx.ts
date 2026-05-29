/**
 * .pptx parser — Office Open XML PresentationML.
 *
 * Approach: unzip via jszip, pull text from all slide / layout / master XML
 * files. PresentationML uses `<a:t>...</a:t>` (DrawingML text-run) elements
 * for visible text — analogous to DOCX's `<w:t>` and XLSX's `<t>`.
 *
 * Files scanned:
 *   - ppt/slides/slide*.xml
 *   - ppt/slideLayouts/slideLayout*.xml (placeholder text)
 *   - ppt/slideMasters/slideMaster*.xml (header/footer placeholders)
 *   - ppt/notesSlides/notesSlide*.xml (speaker notes — often forgotten,
 *     huge PII leak source)
 */

import type { ParseResult } from './txt.js';

const AT_REGEX = /<a:t(?:\s[^>]*)?>([\s\S]*?)<\/a:t>/g;

function decodeXmlEntities(s: string): string {
  return s
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, '&');
}

export async function parsePptxBlob(input: Blob | ArrayBuffer | Uint8Array): Promise<ParseResult> {
  if (typeof input === 'string') {
    throw new TypeError(
      'parsePptxBlob does not accept string input; provide a Blob or ArrayBuffer.'
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

  const textPaths = Object.keys(zip.files).filter((path) =>
    /^ppt\/(slides|slideLayouts|slideMasters|notesSlides)\/[a-zA-Z]+\d+\.xml$/.test(path)
  );

  const parts: string[] = [];
  for (const path of textPaths) {
    const file = zip.file(path);
    if (!file) continue;
    const xml = await file.async('string');
    for (const match of xml.matchAll(AT_REGEX)) {
      const decoded = decodeXmlEntities(match[1] ?? '');
      if (decoded) parts.push(decoded);
    }
  }

  return {
    text: parts.join('\n'),
    meta: {
      source: 'pptx',
      format: 'pptx',
      bytes,
    },
  };
}
