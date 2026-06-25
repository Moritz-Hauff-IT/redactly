import { defineConfig } from 'vite';
import path from 'path';

const coreRoot = path.resolve(__dirname, '../../packages/core/src');

// Builds the content script as a single self-contained IIFE bundle. The
// manifest and popup live in public/ and are copied to dist/ verbatim.
export default defineConfig({
  resolve: {
    alias: {
      '@redactly/core/regex': path.join(coreRoot, 'detectors/regex.ts'),
      '@redactly/core/gazetteer': path.join(coreRoot, 'detectors/gazetteer.ts'),
      '@redactly/core/masker': path.join(coreRoot, 'masker.ts'),
      '@redactly/core/restorer': path.join(coreRoot, 'restorer.ts'),
      '@redactly/core/types': path.join(coreRoot, 'types.ts'),
    },
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    target: 'es2022',
    lib: {
      entry: path.resolve(__dirname, 'src/content.ts'),
      name: 'Redactly',
      formats: ['iife'],
      fileName: () => 'content.js',
    },
    rollupOptions: {
      output: { extend: true },
    },
  },
});
