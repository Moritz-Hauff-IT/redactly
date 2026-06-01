import adapter from '@sveltejs/adapter-static';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/** @type {import('@sveltejs/kit').Config} */
const config = {
  preprocess: vitePreprocess(),
  kit: {
    adapter: adapter({
      // GitHub Pages doesn't support nginx-style try_files: unknown paths
      // serve 404.html with an HTTP 404. We accept the 404 status and let
      // SvelteKit's client router hydrate + navigate to the correct route
      // — the user never sees the wrong content, only a brief flash.
      fallback: '404.html',
    }),
    // version.name embeds the git SHA in the build manifest. SvelteKit
    // polls it; a mismatch (i.e. the server has a newer deploy than the
    // client's loaded bundle) triggers a full reload before the next nav.
    // Required on Pages because we can't send Cache-Control: no-cache on
    // index.html the way nginx does — without this, users would keep their
    // stale shell pointing at chunks that no longer exist.
    version: {
      name: process.env.GITHUB_SHA || process.env.PUBLIC_VERSION || Date.now().toString(),
      pollInterval: 60_000,
    },
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
      // The '/*' wildcard makes SvelteKit use a strict-match regex for the root.
      '@redactly/core/*': '../../packages/core/src/*',
      '@redactly/core': '../../packages/core/src/index.ts',
    },
  },
};

export default config;
