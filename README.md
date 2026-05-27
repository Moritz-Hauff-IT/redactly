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

# Run all tests (all packages via root vitest config — no per-package test scripts)
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

### Running the app

```bash
# Start the SvelteKit dev server (http://localhost:5173)
pnpm -F @de-pii/app dev

# Build the app for production (outputs to apps/app/build/)
pnpm -F @de-pii/app build

# Preview the production build locally
pnpm -F @de-pii/app preview
```

## Deployment

Both apps build to a static `build/` directory (adapter-static) and are served by a minimal nginx container.

```bash
# Build images locally
docker build -f apps/app/Dockerfile -t de-pii-app .
docker build -f apps/landing/Dockerfile -t de-pii-landing .

# Apply to Kubernetes (edit host placeholders first — see deploy/README.md)
kubectl apply -f deploy/k8s/namespace.yaml
kubectl apply -R -f deploy/k8s/
```

CI builds and pushes images to `ghcr.io/<owner>/de-pii-{app,landing}` on every push to `main`.
See [deploy/README.md](deploy/README.md) for full self-hosting instructions, required cluster prerequisites, and CD options.

## Privacy guarantee

All processing happens in the browser session. No server endpoint receives user content.
Verify this yourself via the Network tab — inputs never leave your browser.

The Kubernetes NetworkPolicy (`deploy/k8s/networkpolicy.yaml`) enforces this at the network layer too:
the server process is blocked from all egress except DNS — it cannot phone home even if compromised.
