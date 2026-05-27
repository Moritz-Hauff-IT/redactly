import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  // TODO: configure baseURL, browsers, etc. when SvelteKit app is scaffolded (task 6+)
  use: {
    baseURL: 'http://localhost:5173',
  },
  webServer: {
    command: 'pnpm dev',
    port: 5173,
    reuseExistingServer: !process.env['CI'],
  },
});
