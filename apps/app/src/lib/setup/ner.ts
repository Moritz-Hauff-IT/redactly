/**
 * Self-host the runtime parts of the NER pipeline.
 *
 * Must be called explicitly from a layout via `setupNer()` — earlier
 * versions ran configuration as a top-level side effect on import, but
 * Vite's tree-shaker silently drops side-effect-only imports for app
 * modules, which left the config never applied and produced the
 * "Unexpected token '<'" JSON parse error from transformers.js trying
 * the default /models/ local path on a SPA-fallback HTML response.
 *
 * What's self-hosted:
 *   - onnxruntime-web WASM (~32MB total): served from `/ort/…`. We copy the
 *     relevant files at build time into `apps/app/static/ort/` from the
 *     `onnxruntime-web/dist/` package directory.
 *
 * What's NOT self-hosted (yet):
 *   - The NER model weights themselves (Xenova/bert-base-multilingual-
 *     cased-ner-hrl, ~80MB quantized). Still fetched from huggingface.co
 *     on first NER enable. To self-host, download the model files into
 *     apps/app/static/models/Xenova/bert-base-multilingual-cased-ner-hrl/
 *     and flip allowLocalModels: true + add localModelPath: '/models/'.
 */
import { configureNerModelHosting } from '@redactly/core/ner';

export function setupNer(): void {
  configureNerModelHosting({
    // ONNX-Runtime WASM is served from our origin — verifies in DevTools
    // Network tab as a same-origin fetch instead of cdn.jsdelivr.net.
    wasmPaths: '/ort/',

    // Model weights: HF CDN. Switch to local once weights are pre-downloaded
    // into static/models/ (see header note above).
    allowRemoteModels: true,

    // CRITICAL: skip local lookup entirely. transformers.js defaults to
    // local-first with localModelPath='/models/'; with no model files at
    // that path the SPA fallback returns index.html and JSON.parse() of
    // <!doctype html> throws.
    allowLocalModels: false,
  });
}
