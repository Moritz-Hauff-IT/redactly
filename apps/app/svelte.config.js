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
        // 'wasm-unsafe-eval' for ONNX/WebLLM WASM execution.
        // jsdelivr is used by @huggingface/transformers to dynamic-import the ONNX-Runtime-Web WASM backend modules.
        'script-src': ['self', 'wasm-unsafe-eval', 'https://cdn.jsdelivr.net'],
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
          // ONNX-Runtime-Web WASM binaries + transformers.js modules
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
      // The '@de-pii/core/*' entry below causes SvelteKit to wrap '@de-pii/core'
      // with a strict regex (^@de-pii/core$), preventing prefix match on sub-paths.
      '@de-pii/core/regex': '../../packages/core/src/detectors/regex.ts',
      '@de-pii/core/ner': '../../packages/core/src/detectors/ner.ts',
      '@de-pii/core/llm': '../../packages/core/src/detectors/llm.ts',
      '@de-pii/core/parsers': '../../packages/core/src/parsers/index.ts',
      '@de-pii/core/masker': '../../packages/core/src/masker.ts',
      '@de-pii/core/restorer': '../../packages/core/src/restorer.ts',
      '@de-pii/core/pipeline': '../../packages/core/src/pipeline.ts',
      '@de-pii/core/types': '../../packages/core/src/types.ts',
      // The '/*' wildcard makes SvelteKit use a strict-match regex for the root.
      '@de-pii/core/*': '../../packages/core/src/*',
      '@de-pii/core': '../../packages/core/src/index.ts',
    },
  },
};

export default config;
