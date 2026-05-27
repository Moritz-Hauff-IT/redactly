/**
 * PDF parser using pdfjs-dist (legacy build).
 *
 * ## Worker setup — REQUIRED by the consuming application
 *
 * This library does NOT configure `GlobalWorkerOptions.workerSrc`. The
 * consuming application MUST set it before calling `parsePdfBlob`, otherwise
 * a `PdfWorkerNotConfiguredError` is thrown.
 *
 * ### SvelteKit / Vite apps
 * ```ts
 * // In the consuming app (e.g. src/lib/pdfWorker.ts, imported once at startup):
 * import { GlobalWorkerOptions } from 'pdfjs-dist/legacy/build/pdf.mjs';
 * import pdfWorkerUrl from 'pdfjs-dist/legacy/build/pdf.worker.mjs?url';
 * GlobalWorkerOptions.workerSrc = pdfWorkerUrl;
 * ```
 *
 * ### Node.js / Vitest tests
 * ```ts
 * import { GlobalWorkerOptions } from 'pdfjs-dist/legacy/build/pdf.mjs';
 * import { createRequire } from 'node:module';
 * const require = createRequire(import.meta.url);
 * const workerPath = require.resolve('pdfjs-dist/legacy/build/pdf.worker.mjs');
 * GlobalWorkerOptions.workerSrc = `file://${workerPath}`;
 * ```
 *
 * - The legacy build (`pdfjs-dist/legacy/build/pdf.mjs`) is used because it
 *   works in both Node.js and browsers without additional polyfills.
 * - Note: pdfjs-dist transfers the data ArrayBuffer to the worker thread,
 *   which detaches it. Always pass a copy if you need the original buffer after parsing.
 */

import type { ParseResult } from './txt.js';

export interface PdfParseResult extends ParseResult {
  meta: ParseResult['meta'] & { pages: number };
}

/**
 * Thrown when `parsePdfBlob` is called without a configured PDF.js worker.
 *
 * Set `GlobalWorkerOptions.workerSrc` before calling this function.
 * See the module-level JSDoc for the recommended setup snippet.
 */
export class PdfWorkerNotConfiguredError extends Error {
  constructor() {
    super(
      'GlobalWorkerOptions.workerSrc is not set. ' +
        'The consuming application must configure the PDF.js worker before calling parsePdfBlob. ' +
        'See the pdfjs-dist documentation or the @de-pii/core README for the recommended setup.'
    );
    this.name = 'PdfWorkerNotConfiguredError';
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

  // The consuming application is responsible for setting workerSrc.
  // We do not set it here because a bare-specifier URL cannot be reliably
  // resolved by Vite when this library is inside node_modules.
  if (!pdfjsLib.GlobalWorkerOptions.workerSrc) {
    throw new PdfWorkerNotConfiguredError();
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

  const loadingTask = pdfjsLib.getDocument({ data: dataCopy });

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
