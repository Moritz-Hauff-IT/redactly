import adapter from '@sveltejs/adapter-static';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/** @type {import('@sveltejs/kit').Config} */
const config = {
  preprocess: vitePreprocess(),
  kit: {
    adapter: adapter({
      fallback: 'index.html',
    }),
    csp: {
      mode: 'hash',
      directives: {
        'default-src': ['self'],
        // 'wasm-unsafe-eval' for ONNX/WebLLM/Tesseract WASM execution.
        // Tesseract + onnxruntime-web WASM are self-hosted. But transformers.js
        // still does dynamic-import() of some JS modules from jsdelivr at
        // runtime (the ESM loader for the bundled ort core), so jsdelivr +
        // unpkg stay in script-src as a fallback. Without these, NER model
        // initialisation fails with a CSP-blocked dynamic import.
        'script-src': [
          'self',
          'wasm-unsafe-eval',
          'blob:',
          'https://cdn.jsdelivr.net',
          'https://unpkg.com',
        ],
        'style-src': ['self', 'unsafe-inline'],
        'img-src': ['self', 'data:'],
        'connect-src': [
          'self',
          'https://huggingface.co',
          'https://*.huggingface.co',
          'https://cdn-lfs.huggingface.co',
          'https://cdn-lfs-us-1.huggingface.co',
          'https://cas-bridge.xethub.hf.co',
          'https://raw.githubusercontent.com',
          'https://s3.amazonaws.com',
          'https://*.s3.amazonaws.com',
          // Tesseract assets + onnxruntime-web WASM are self-hosted under
          // 'self' above. NER model weights still fetched from HuggingFace
          // by default; WebLLM models too. CDN paths kept so existing
          // self-hosters who haven't pre-downloaded model weights still work.
          'https://cdn.jsdelivr.net',
        ],
        'worker-src': ['self', 'blob:'],
        'object-src': ['none'],
        'base-uri': ['self'],
        'form-action': ['none'],
      },
    },
    alias: {
      // Specific sub-path entries (resolved first by Vite since they're strings).
      // The '@redactly/core/*' entry below causes SvelteKit to wrap '@redactly/core'
      // with a strict regex (^@redactly/core$), preventing prefix match on sub-paths.
      '@redactly/core/regex': '../../packages/core/src/detectors/regex.ts',
      '@redactly/core/ner': '../../packages/core/src/detectors/ner.ts',
      '@redactly/core/llm': '../../packages/core/src/detectors/llm.ts',
      '@redactly/core/parsers': '../../packages/core/src/parsers/index.ts',
      '@redactly/core/masker': '../../packages/core/src/masker.ts',
      '@redactly/core/restorer': '../../packages/core/src/restorer.ts',
      '@redactly/core/pipeline': '../../packages/core/src/pipeline.ts',
      '@redactly/core/types': '../../packages/core/src/types.ts',
      '@redactly/core/audit': '../../packages/core/src/audit.ts',
      '@redactly/core/structural': '../../packages/core/src/structural.ts',
      '@redactly/core/mappingCrypto': '../../packages/core/src/mappingCrypto.ts',
      '@redactly/core/profiles': '../../packages/core/src/profiles.ts',
      '@redactly/core/safety': '../../packages/core/src/safety.ts',
      '@redactly/core/fakeValues': '../../packages/core/src/fakeValues.ts',
      // The '/*' wildcard makes SvelteKit use a strict-match regex for the root.
      '@redactly/core/*': '../../packages/core/src/*',
      '@redactly/core': '../../packages/core/src/index.ts',
    },
  },
};

export default config;
