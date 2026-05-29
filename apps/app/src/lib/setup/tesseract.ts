/**
 * Point Tesseract.js at our self-hosted asset URLs so OCR runs without
 * touching any external CDN. The files live under `static/tesseract/`
 * (see apps/app/static/tesseract/ in the repo) and are served from the
 * same origin as the rest of the app.
 *
 * - Core WASM + JS:  static/tesseract/tesseract-core-simd.wasm[.js]
 * - Worker:          static/tesseract/worker.min.js
 * - Language data:   static/tesseract/lang-data/<lang>.traineddata.gz
 *
 * Without this configuration Tesseract would fetch its core from
 * cdn.jsdelivr.net and the language data from tessdata.projectnaptha.com.
 */
import { configureTesseractPaths } from '@de-pii/core/parsers';

configureTesseractPaths({
  corePath: '/tesseract',
  workerPath: '/tesseract/worker.min.js',
  langPath: '/tesseract/lang-data',
});
