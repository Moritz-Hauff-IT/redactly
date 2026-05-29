# Contributing to Redactly

Thank you for your interest in contributing. Redactly is released under
the [Functional Source License, Version 1.1, Apache 2.0 Future
License](LICENSE) and welcomes contributions of all kinds.

## Development setup

**Prerequisites:** Node 22+, pnpm 9.12.0+

```bash
git clone https://github.com/moritz-hauff-it/redactly.git
cd redactly
pnpm install
```

Run the app locally:

```bash
pnpm -F @de-pii/app dev      # http://localhost:5173
```

## Before submitting a PR

All three checks must pass:

```bash
pnpm test        # unit tests (vitest)
pnpm lint        # ESLint + Prettier check
pnpm typecheck   # TypeScript strict
```

Build the app to catch bundler errors:

```bash
pnpm -F @de-pii/app build
```

## Branch naming

Use the pattern `<type>/<short-description>`, e.g.:

- `feat/webllm-streaming`
- `fix/ner-tokenizer-crash`
- `chore/update-deps`

## Commit message style

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
feat: add streaming support for WebLLM detector
fix: handle empty input in NER loader
chore: update onnxruntime-web to 1.18
docs: clarify self-hosting prerequisites
```

Keep the subject line under 72 characters. Add a body if the change needs explanation.

## Where to discuss

- **Bug reports / feature requests:** [GitHub Issues](https://github.com/moritz-hauff-it/redactly/issues)
- **Questions:** open a Discussion or an Issue tagged `question`

## License note

By submitting a pull request you agree that your contribution is licensed
under the project's license — [FSL-1.1-Apache-2.0](LICENSE) — under the
same terms as the rest of the project. In particular, your contribution
will fall under the same two-year Apache 2.0 Future Grant as the rest of
the codebase.

If your contribution requires a different licensing arrangement (for
example, you maintain your own commercial product downstream), please
open an issue first so we can coordinate.
