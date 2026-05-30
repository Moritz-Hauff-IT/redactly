/**
 * Point Tesseract.js at our self-hosted asset URLs so OCR runs without
 * touching any external CDN. Must be called explicitly from a layout
 * via `setupTesseract()` — top-level side-effect imports get tree-shaken.
 *
 * Files live under `static/tesseract/` (see apps/app/static/tesseract/
 * in the repo) and are served from the same origin as the rest of the app.
 *
 * - Core WASM + JS:  static/tesseract/tesseract-core-simd.wasm[.js]
 * - Worker:          static/tesseract/worker.min.js
 * - Language data:   static/tesseract/lang-data/<lang>.traineddata.gz
 */
import { configureTesseractPaths } from '@de-pii/core/parsers';

export function setupTesseract(): void {
  configureTesseractPaths({
    corePath: '/tesseract',
    workerPath: '/tesseract/worker.min.js',
    langPath: '/tesseract/lang-data',
  });
}
