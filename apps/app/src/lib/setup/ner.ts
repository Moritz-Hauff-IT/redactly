/**
 * Self-host the runtime parts of the NER pipeline.
 *
 * What's self-hosted:
 *   - onnxruntime-web WASM (~32MB total): served from `/ort/…`. We copy the
 *     relevant files at build time into `apps/app/static/ort/` from the
 *     `onnxruntime-web/dist/` package directory.
 *
 * What's NOT self-hosted (yet):
 *   - The NER model weights themselves (Xenova/bert-base-multilingual-
 *     cased-ner-hrl, ~80MB quantized). Still fetched from huggingface.co
 *     on first NER enable because bundling 80MB in static/ would slow every
 *     page load whether or not the visitor uses NER.
 *
 *     To go fully self-hosted, download the model files from
 *       https://huggingface.co/Xenova/bert-base-multilingual-cased-ner-hrl
 *     into `apps/app/static/models/Xenova/bert-base-multilingual-cased-ner-hrl/`,
 *     then add to the configureNerModelHosting() call below:
 *       localModelPath: '/models/',
 *       allowRemoteModels: false,
 *
 *     IMPORTANT: do NOT set `localModelPath` without also placing the model
 *     files there. transformers.js tries the local path first; if it 404s
 *     into the SPA fallback (index.html), JSON.parse() throws
 *     "Unexpected token '<', \"<!doctype \" ... is not valid JSON" and the
 *     model never loads.
 */
import { configureNerModelHosting } from '@de-pii/core/ner';

configureNerModelHosting({
  // ONNX-Runtime WASM is served from our origin — verifies in DevTools Network
  // tab as a same-origin fetch instead of cdn.jsdelivr.net.
  wasmPaths: '/ort/',

  // Model weights: HF CDN. Switch to local once weights are pre-downloaded
  // into static/models/ (see header note above for the exact path).
  allowRemoteModels: true,

  // CRITICAL: skip local lookup entirely. transformers.js defaults to
  // tries-local-first; with no model files at /models/ this hits the
  // SPA fallback (index.html) and produces "Unexpected token '<'" on
  // JSON.parse. Explicitly disable until we actually bundle the weights.
  allowLocalModels: false,
});
