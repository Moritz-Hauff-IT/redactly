# Redactly Browser Extension (MVP / Beta)

Mask personal data **locally** inside ChatGPT and Claude before you send it.
The extension shares Redactly's detection/masking core (`@redactly/core`) and
runs entirely in your browser — regex + a name gazetteer, no model download,
nothing leaves the tab.

## What it does

On `chatgpt.com`, `chat.openai.com` and `claude.ai` a small toolbar appears at
the bottom-right:

- **🛡 Maskieren** — detects PII in the prompt editor and replaces it with
  reversible placeholders (`[PERSON_1]`, `[EMAIL_1]`, …) in place.
- **↩︎ Wiederherstellen** — walks the page and swaps those placeholders back to
  the real values in the assistant's reply, so you read the originals while the
  model only ever saw the masked text.

The reversible mapping lives only in the page's memory for the tab's lifetime.

## Build

```bash
pnpm --filter @redactly/extension build
```

Output lands in `apps/extension/dist/` (`manifest.json`, `content.js`,
`popup.html`).

## Load it (Chrome / Edge)

1. Open `chrome://extensions`, enable **Developer mode**.
2. **Load unpacked** → select `apps/extension/dist`.
3. Open ChatGPT or Claude; the toolbar appears bottom-right.

## Status & caveats

This is an MVP. ChatGPT and Claude use React-controlled editors whose DOM
changes frequently, so:

- The editor lookup and value injection are **heuristic** and may need tuning
  when the sites change their markup.
- Detection is regex + gazetteer only (instant, no model). For the full
  NER/WebLLM pipeline, structural rules, profiles, files and more, use the web
  app at [redactly.app](https://redactly.app).

Planned next: per-site adapters, an on/off toggle synced via `chrome.storage`,
and optional auto-restore of streamed replies.
