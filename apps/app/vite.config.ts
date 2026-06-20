import { sveltekit } from '@sveltejs/kit/vite';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vite';
import path from 'path';

const coreRoot = path.resolve('../../packages/core/src');

export default defineConfig({
  plugins: [tailwindcss(), sveltekit()],
  resolve: {
    // Use array form so that more-specific sub-paths are matched before the root.
    // This prevents '@redactly/core' from matching '@redactly/core/parsers' first.
    alias: [
      {
        find: '@redactly/core/regex',
        replacement: path.join(coreRoot, 'detectors/regex.ts'),
      },
      {
        find: '@redactly/core/ner',
        replacement: path.join(coreRoot, 'detectors/ner.ts'),
      },
      {
        find: '@redactly/core/llm',
        replacement: path.join(coreRoot, 'detectors/llm.ts'),
      },
      {
        find: '@redactly/core/parsers',
        replacement: path.join(coreRoot, 'parsers/index.ts'),
      },
      {
        find: '@redactly/core/masker',
        replacement: path.join(coreRoot, 'masker.ts'),
      },
      {
        find: '@redactly/core/restorer',
        replacement: path.join(coreRoot, 'restorer.ts'),
      },
      {
        find: '@redactly/core/pipeline',
        replacement: path.join(coreRoot, 'pipeline.ts'),
      },
      {
        find: '@redactly/core/types',
        replacement: path.join(coreRoot, 'types.ts'),
      },
      {
        find: '@redactly/core/audit',
        replacement: path.join(coreRoot, 'audit.ts'),
      },
      {
        find: '@redactly/core/structural',
        replacement: path.join(coreRoot, 'structural.ts'),
      },
      {
        find: '@redactly/core/mappingCrypto',
        replacement: path.join(coreRoot, 'mappingCrypto.ts'),
      },
      {
        find: '@redactly/core/profiles',
        replacement: path.join(coreRoot, 'profiles.ts'),
      },
      {
        find: '@redactly/core/safety',
        replacement: path.join(coreRoot, 'safety.ts'),
      },
      // Root alias must come after sub-paths — use regex to avoid matching sub-paths
      {
        find: /^@redactly\/core$/,
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
