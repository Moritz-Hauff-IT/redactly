# Redactly

> Mask PII and secrets in your browser — _before_ they reach ChatGPT, Claude, or any other LLM.

[Live demo →](https://app.redactly.dev) · [Docs →](https://redactly.dev/docs) · [Privacy promise →](https://redactly.dev/privacy)

[![License: FSL-1.1-Apache-2.0](https://img.shields.io/badge/license-FSL--1.1--Apache--2.0-blue)](LICENSE)
[![CI](https://github.com/moritz-hauff-it/redactly/actions/workflows/ci.yml/badge.svg)](https://github.com/moritz-hauff-it/redactly/actions/workflows/ci.yml)
[![No telemetry](https://img.shields.io/badge/telemetry-none-green)](https://redactly.dev/privacy)

## Why

Pasting a support ticket, medical record, or internal email into an LLM exposes sensitive data to a third-party server. Redactly replaces names, emails, phone numbers, IBANs, API keys, and other PII with reversible placeholders entirely inside your browser tab. The LLM never sees the real values — and neither does Redactly's server, because there is no server-side processing.

## Features

- **Browser-only** — no server processing of your text or files; verify via the Network tab
- **Reversible** — paste the LLM's response back to restore originals locally, session-scoped
- **Hybrid detection** — Regex (always-on, instant) + NER (opt-in, ~80 MB download) + WebLLM (opt-in, 1–4 GB)
- **Layout-preserving redaction** — PDF / DOCX / XLSX / PPTX downloads keep the original styling, fonts, images, tables; only PII regions get whited out and labelled
- **OCR for images** — PNG / JPG / WebP via Tesseract.js, masked output drawn back onto the original raster
- **Wide file support** — documents (`.pdf`, `.docx`, `.xlsx`, `.pptx`, `.eml`), text & code (`.txt`, `.md`, `.csv`, `.tsv`, `.json`, `.yaml`, `.toml`, `.ini`, `.env`, `.conf`, `.log`, `.sql`, `.html`, `.xml`), images (`.png`, `.jpg`, `.webp`), ZIP archives
- **Bilingual UI** — German + English with localStorage-backed switcher
- **Source-available, FSL-1.1** — read the code, self-host for your own use; converts to Apache 2.0 after two years

## How it works

```
1. Paste text or drop a file
         |
         v
2. Redactly detects PII → replaces with [NAME_1], [EMAIL_1], …
         |
         v
3. Copy the clean text → paste into ChatGPT / Claude / etc.
         |
         v
4. Copy the LLM response → paste back into Redactly → originals restored
```

## Try it locally

**Prerequisites:** Node 22+, pnpm 9.12.0+

```bash
pnpm install
pnpm -F @redactly/app dev      # http://localhost:5173
```

Run all checks:

```bash
pnpm test        # unit tests
pnpm typecheck   # TypeScript
pnpm lint        # ESLint + Prettier
```

## Architecture

```
redactly/
├── packages/
│   └── core/          # Headless detection + masking engine (TS, framework-agnostic)
├── apps/
│   └── app/           # SvelteKit app  →  intended for app.<your-domain>
├── deploy/
│   ├── docker-compose.yml  # Single-host quick start
│   ├── k8s/                # Kubernetes manifests (generic templates)
│   └── nginx/              # nginx config used inside the container
└── .github/workflows/      # CI (lint/test/typecheck) + image build/push
```

Internal package scope is `@redactly/*` — historical naming, external product
is **Redactly**. The marketing landing site that runs at
[redactly.dev](https://redactly.dev) is operator-specific and not part of
this repository.

## Deployment

The app builds to a static `build/` directory (SvelteKit adapter-static)
and is served by a minimal non-root nginx container. Images are published
to `ghcr.io/moritz-hauff-it/redactly-app` on every push to `main`.

Two self-hosting paths are documented in [deploy/README.md](deploy/README.md):

- **Docker Compose** (quick start, single host)
- **Kubernetes** (ingress-nginx + cert-manager) with generic templates
  you point at your own domain.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md). Security issues: [SECURITY.md](SECURITY.md).

## License

[Functional Source License, Version 1.1, with Apache 2.0 Future
License](LICENSE) (FSL-1.1-Apache-2.0). In plain English:

- You can **read, audit, fork, and run Redactly for yourself** (personal
  use, internal company use, education, research, non-commercial
  research) — that is the whole point of publishing the source.
- You **cannot offer Redactly (or a substantially similar product) as a
  commercial service or product that competes with the original**, for
  the first two years after each release.
- After **two years**, every commit automatically converts to **Apache
  License 2.0** — so this is OSS on a delay, not source-available
  forever.

If you want a commercial use grant before the two-year sunset (e.g. to
offer a managed Redactly to your customers), contact `hello@redactly.dev`
to discuss licensing.
