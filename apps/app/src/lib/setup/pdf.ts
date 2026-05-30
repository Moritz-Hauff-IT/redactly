/**
 * Configure pdfjs-dist worker source so PDF parsing can find its WebWorker.
 *
 * Must be called explicitly from a layout via `setupPdf()` — earlier versions
 * relied on top-level side effects from a `import './pdf.js'` line, but
 * Vite tree-shakes side-effect-only imports in app modules. Switching to
 * an exported function called from the layout's <script> body guarantees
 * the assignment runs.
 */
import { GlobalWorkerOptions } from 'pdfjs-dist/legacy/build/pdf.mjs';
import pdfWorkerUrl from 'pdfjs-dist/legacy/build/pdf.worker.mjs?url';

export function setupPdf(): void {
  GlobalWorkerOptions.workerSrc = pdfWorkerUrl;
}
