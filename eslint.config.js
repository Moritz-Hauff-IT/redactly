import tseslint from '@typescript-eslint/eslint-plugin';
import tsParser from '@typescript-eslint/parser';
import sveltePlugin from 'eslint-plugin-svelte';
import prettierConfig from 'eslint-config-prettier';
import globals from 'globals';

/** @type {import("eslint").Linter.FlatConfig[]} */
export default [
  // Base TypeScript config for all TS/JS files
  {
    files: ['**/*.{ts,tsx,js,mjs,cjs}'],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: 2022,
        sourceType: 'module',
      },
      // core runs in the browser; tooling configs run in Node — allow both
      globals: { ...globals.browser, ...globals.node },
    },
    plugins: {
      '@typescript-eslint': tseslint,
    },
    rules: {
      ...tseslint.configs.recommended.rules,
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      '@typescript-eslint/no-explicit-any': 'warn',
    },
  },
  // Svelte files (for when svelte packages are added later)
  ...sveltePlugin.configs['flat/recommended'],
  // Override Svelte files with browser globals and TypeScript parser for script blocks
  {
    files: ['**/*.svelte'],
    languageOptions: {
      globals: { ...globals.browser },
      parserOptions: {
        parser: tsParser,
      },
    },
  },
  // Disable ESLint rules that conflict with Prettier (must be last)
  prettierConfig,
  // Ignores
  {
    ignores: [
      'node_modules/**',
      '**/node_modules/**',
      '**/dist/**',
      '**/.svelte-kit/**',
      '**/build/**',
      '**/coverage/**',
      'playwright-report/**',
      'test-results/**',
      // Vendored static assets — Tesseract WASM/JS glue, onnxruntime-web glue.
      // These are copied verbatim from npm packages; do not lint them.
      'apps/app/static/tesseract/**',
      'apps/app/static/ort/**',
      'apps/app/static/models/**',
    ],
  },
];
