import adapter from '@sveltejs/adapter-static';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/** @type {import('@sveltejs/kit').Config} */
const config = {
  preprocess: vitePreprocess(),
  kit: {
    adapter: adapter({
      fallback: 'index.html',
    }),
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
