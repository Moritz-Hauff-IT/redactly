/**
 * Self-host the runtime parts of the NER pipeline.
 *
 * Two things move off external CDNs:
 *   1. onnxruntime-web WASM (~32MB total): served from `/ort/...`. We copy
 *      the relevant files at build time into `apps/app/static/ort/` from the
 *      `onnxruntime-web/dist/` package directory.
 *   2. (Optional) the NER model weights themselves: by default still fetched
 *      from huggingface.co because the quantized `bert-base-multilingual-
 *      cased-ner-hrl` model is ~80MB and would bloat the static bundle for
 *      every visitor whether they use NER or not. To go fully self-hosted,
 *      download the model files from
 *        https://huggingface.co/Xenova/bert-base-multilingual-cased-ner-hrl
 *      and place them under `apps/app/static/models/Xenova/
 *      bert-base-multilingual-cased-ner-hrl/`, then flip the
 *      `allowRemoteModels: false` line below.
 */
import { configureNerModelHosting } from '@de-pii/core/ner';

configureNerModelHosting({
  // ONNX-Runtime WASM is served from our origin — verifies in DevTools Network
  // tab as a same-origin fetch instead of cdn.jsdelivr.net.
  wasmPaths: '/ort/',

  // Model weights: where to look IF you opted into local hosting (see header
  // comment). Even when files aren't present locally, this just sets the
  // search path — remote fetch from HF still works because allowRemoteModels
  // stays true below.
  localModelPath: '/models/',

  // Set to `false` to lock down model loading to local files only (no HF CDN
  // fetch). Keep true for the public default so the app works without the
  // operator having to pre-download model weights.
  allowRemoteModels: true,
});
