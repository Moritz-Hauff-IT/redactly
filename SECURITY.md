# Security Policy

## Reporting a Vulnerability

If you discover a security issue in Redactly, please report it by email rather than a public GitHub issue:

**Contact:** security@redactly.dev

You can expect:

- An acknowledgement within 72 hours
- A fix and disclosure timeline within 14 days for confirmed issues
- Credit in the release notes (unless you prefer anonymity)

## Scope

Redactly is a 100% client-side tool — there is no server that processes user input. The relevant attack surface is therefore:

- **Detection bypass** — patterns that should trigger redaction but don't (false negatives that leak PII)
- **Restoration leak** — masked text being restored when it shouldn't, or restored to the wrong values
- **Supply chain** — compromised dependencies that could exfiltrate input
- **Bundle integrity** — the deployed app silently fetching or sending data we don't advertise
- **CSP weaknesses** — Content Security Policy gaps that would allow injected scripts to bypass the privacy promise

Issues like XSS in the app, dependency CVEs with browser impact, or anything that would let the hoster or a third party observe user input are in scope.

## Out of Scope

- Best-effort detection limitations that are documented (e.g. user-typed placeholder collisions, regex false positives — see the [README](README.md) and [JSDoc on `mask()`/`restore()`](packages/core/src/))
- Issues in third-party LLM responses
- Self-hosted-deployment misconfigurations (your own CSP overrides, missing TLS, etc.)
