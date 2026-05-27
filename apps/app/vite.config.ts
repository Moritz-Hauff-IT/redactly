import { sveltekit } from '@sveltejs/kit/vite';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vite';
import path from 'path';

const coreRoot = path.resolve('../../packages/core/src');

export default defineConfig({
  plugins: [tailwindcss(), sveltekit()],
  resolve: {
    // Use array form so that more-specific sub-paths are matched before the root.
    // This prevents '@de-pii/core' from matching '@de-pii/core/parsers' first.
    alias: [
      {
        find: '@de-pii/core/regex',
        replacement: path.join(coreRoot, 'detectors/regex.ts'),
      },
      {
        find: '@de-pii/core/ner',
        replacement: path.join(coreRoot, 'detectors/ner.ts'),
      },
      {
        find: '@de-pii/core/parsers',
        replacement: path.join(coreRoot, 'parsers/index.ts'),
      },
      {
        find: '@de-pii/core/masker',
        replacement: path.join(coreRoot, 'masker.ts'),
      },
      {
        find: '@de-pii/core/restorer',
        replacement: path.join(coreRoot, 'restorer.ts'),
      },
      {
        find: '@de-pii/core/pipeline',
        replacement: path.join(coreRoot, 'pipeline.ts'),
      },
      {
        find: '@de-pii/core/types',
        replacement: path.join(coreRoot, 'types.ts'),
      },
      // Root alias must come after sub-paths
      {
        find: '@de-pii/core',
        replacement: path.join(coreRoot, 'index.ts'),
      },
    ],
  },
  optimizeDeps: {
    // Ensure pdfjs-dist legacy build is pre-bundled properly
    exclude: ['pdfjs-dist'],
  },
  worker: {
    format: 'es',
  },
});
