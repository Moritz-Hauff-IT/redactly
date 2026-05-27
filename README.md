# de-pii

> Browser-only PII & secret masking for safe LLM input.

![Status: In Development](https://img.shields.io/badge/status-in%20development-orange)
![License: MIT](https://img.shields.io/badge/license-MIT-blue)

de-pii lets you strip personally identifiable information and secrets from text and files
**entirely in your browser** before sending them to AI assistants like ChatGPT or Claude.
Masking is reversible: paste the LLM's response back and recover the original values.
No data ever leaves your device — the hoster cannot see your content.

**Status: in development** — see the [sequencing plan](/.claude/plans/) for build order.

## Repo structure

```
de-pii/
├── packages/
│   └── core/          # Headless detection + masking engine (TS, framework-agnostic)
├── apps/
│   ├── app/           # SvelteKit app  →  app.<domain>
│   └── landing/       # SvelteKit landing  →  <domain>
├── deploy/            # Dockerfiles + k8s manifests
└── ...tooling configs
```

## Development

**Prerequisites:** Node 22+, pnpm 9.12.0+

```bash
# Install dependencies
pnpm install

# Run all tests
pnpm test

# Type-check all packages
pnpm typecheck

# Lint
pnpm lint

# Format
pnpm format

# Build all packages
pnpm build
```

## Privacy guarantee

All processing happens in the browser session. No server endpoint receives user content.
Verify this yourself via the Network tab — inputs never leave your browser.
