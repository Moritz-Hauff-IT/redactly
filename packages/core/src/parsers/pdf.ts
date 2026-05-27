/**
 * PDF parser using pdfjs-dist (legacy build).
 *
 * Worker setup notes:
 * - In Node / Vitest: we configure `GlobalWorkerOptions.workerSrc` to point to
 *   the legacy worker bundle path so pdfjs can set up its inline "fake worker".
 *   The `standardFontDataUrl` is also configured to point to the font data
 *   bundled with pdfjs-dist.
 * - In SvelteKit / Vite production builds, configure the worker via:
 *   ```ts
 *   import { GlobalWorkerOptions } from 'pdfjs-dist';
 *   GlobalWorkerOptions.workerSrc = new URL(
 *     'pdfjs-dist/legacy/build/pdf.worker.mjs',
 *     import.meta.url,
 *   ).toString();
 *   ```
 * - The legacy build (`pdfjs-dist/legacy/build/pdf.mjs`) is used here because
 *   it works in both Node.js and browsers without additional polyfills.
 * - Note: pdfjs-dist transfers the data ArrayBuffer to the worker thread,
 *   which detaches it. Always pass a copy if you need the original buffer after parsing.
 */

import { createRequire } from 'node:module';
import type { ParseResult } from './txt.js';

export interface PdfParseResult extends ParseResult {
  meta: ParseResult['meta'] & { pages: number };
}

/**
 * Resolve the pdfjs-dist package root directory.
 * Returns a file:// URL ending with '/' suitable for standardFontDataUrl.
 */
function resolvePdfjsRoot(): string {
  try {
    const require = createRequire(import.meta.url);
    const pdfjsMain = require.resolve('pdfjs-dist/legacy/build/pdf.mjs');
    // pdfjsMain is something like /.../pdfjs-dist/legacy/build/pdf.mjs
    // We want /.../pdfjs-dist/ as a URL
    const root = pdfjsMain.replace(/legacy\/build\/pdf\.mjs$/, '');
    return `file://${root}`;
  } catch {
    return '';
  }
}

export async function parsePdfBlob(
  input: Blob | ArrayBuffer | Uint8Array
): Promise<PdfParseResult> {
  if (typeof input === 'string') {
    throw new TypeError(
      'parsePdfBlob does not accept string input; provide a Blob or ArrayBuffer.'
    );
  }

  // Dynamically import pdfjs-dist legacy build to avoid Node worker issues at
  // module load time.
  const pdfjsLib = await import('pdfjs-dist/legacy/build/pdf.mjs');

  // Configure workerSrc so pdfjs can load its worker (or inline fake-worker).
  if (!pdfjsLib.GlobalWorkerOptions.workerSrc) {
    pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
      'pdfjs-dist/legacy/build/pdf.worker.mjs',
      import.meta.url
    ).href;
  }

  let bytes: number;
  let dataCopy: Uint8Array;

  if (input instanceof Uint8Array) {
    // Make a copy so the original isn't detached when pdfjs transfers it
    dataCopy = input.slice();
    bytes = input.byteLength;
  } else if (input instanceof ArrayBuffer) {
    dataCopy = new Uint8Array(input.slice(0));
    bytes = input.byteLength;
  } else {
    // Blob
    const ab = await (input as Blob).arrayBuffer();
    dataCopy = new Uint8Array(ab);
    bytes = (input as Blob).size;
  }

  const pdfjsRoot = resolvePdfjsRoot();
  const standardFontDataUrl = pdfjsRoot ? `${pdfjsRoot}standard_fonts/` : undefined;

  const loadingTask = pdfjsLib.getDocument({
    data: dataCopy,
    ...(standardFontDataUrl ? { standardFontDataUrl } : {}),
  });

  const pdfDocument = await loadingTask.promise;
  const numPages = pdfDocument.numPages;
  const pageTexts: string[] = [];

  for (let i = 1; i <= numPages; i++) {
    const page = await pdfDocument.getPage(i);
    const content = await page.getTextContent();
    const pageText = content.items
      .map((item) => ('str' in item ? item.str : ''))
      .join(' ')
      .replace(/ {2,}/g, ' ')
      .trim();
    pageTexts.push(pageText);
  }

  await pdfDocument.destroy();

  return {
    text: pageTexts.join('\n\n'),
    meta: {
      source: 'pdf',
      format: 'pdf',
      bytes,
      pages: numPages,
    },
  };
}
