import { sveltekit } from '@sveltejs/kit/vite';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [tailwindcss(), sveltekit()],
  optimizeDeps: {
    // Ensure pdfjs-dist legacy build is pre-bundled properly
    exclude: ['pdfjs-dist'],
  },
  worker: {
    format: 'es',
  },
});
