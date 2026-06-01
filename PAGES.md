# Self-host Redactly on GitHub Pages

This branch (`github-pages`) is a preset for hosting your own Redactly
instance on **GitHub Pages** — works on github.com (public/private repos
with paid plans) and on **GitHub Enterprise Server (GHES) self-hosted**
appliances.

The OSS `main` branch ships with legal pages (Impressum, Datenschutz,
Terms) and a footer — required for our public deploy at
`app.redactly.dev` but not for an internal company instance. This branch
strips them out so you can clone it and ship without legal cleanup.

What's different vs. `main`:

| Change | Why |
|---|---|
| `apps/app/src/routes/[[lang=lang]]/legal/` removed | Internal instance, no public Impressum obligation |
| Footer in `+layout.svelte` removed | No legal links to surface |
| `apps/app/svelte.config.js` → `fallback: '404.html'` | Pages serves 404.html on unknown paths; SvelteKit hydrates and routes from there |
| `kit.version` set from `GITHUB_SHA` | Pages can't send `Cache-Control: no-cache` on HTML — SvelteKit polls the version manifest and triggers an auto-reload when it sees a new deploy |
| `apps/app/static/CNAME` | Domain for the Pages site |
| `.github/workflows/pages.yml` | Build + deploy on every push to this branch |

What stays the same:

- All branding (Redactly favicon, mark, wordmark) — adjust if you want
  your own brand. The relevant files are in `apps/app/static/` and the
  inline SVG in `apps/app/src/routes/[[lang=lang]]/+layout.svelte`.
- All detection (Regex, NER, WebLLM) — works unchanged.
- LICENSE (FSL-1.1-Apache-2.0) — internal use is explicitly permitted.

---

## Setup — concrete steps

### 1. Fork or mirror the repo

```bash
# fork via your GitHub UI, then:
git clone git@github.your-ghes-host.com:your-org/redactly.git
cd redactly
git checkout github-pages
```

### 2. Set your custom domain

Edit `apps/app/static/CNAME` — single line, no `https://`, no trailing
slash:

```
redactly.your-company.internal
```

If you don't want a custom domain and are OK with the default GHES Pages
URL (e.g. `https://your-org.pages.your-ghes-host.com/redactly/`), delete
the `CNAME` file and read **§ Sub-path hosting** below.

### 3. DNS

Point your domain at GitHub Pages:

- **GitHub.com Pages**: CNAME → `<org>.github.io` (or A records to
  Pages IPs, see GitHub docs)
- **GHES Pages**: CNAME → `pages.<your-ghes-host>` (your appliance admin
  knows the exact target)

For HTTPS, both .com and GHES Pages can manage Let's Encrypt
certificates automatically once the CNAME resolves.

### 4. Enable Pages

Repo → **Settings → Pages**:

- **Source**: "GitHub Actions" (not "Deploy from a branch")
- **Custom domain**: enter the same value as in `CNAME`
- Check **"Enforce HTTPS"** once the cert is issued (usually a few
  minutes after DNS propagates)

### 5. Push and watch the deploy

```bash
git push origin github-pages
```

The `Deploy to GitHub Pages` workflow in `.github/workflows/pages.yml`
will:

1. Install pnpm + Node 22
2. `pnpm -F @redactly/app build` (writes `apps/app/build/`)
3. Upload that folder as a Pages artifact
4. Deploy

Check **Actions** tab for progress. First deploy takes ~2–4 min.

### 6. Done

Open your domain. Detection works immediately for Regex. NER and WebLLM
require user opt-in in Settings — once enabled, models download from
HuggingFace / MLC CDN to the user's browser (not via your server) and
cache locally.

---

## Sub-path hosting (no custom domain)

If you skip the CNAME and Pages serves you at
`https://your-org.pages.your-ghes-host.com/redactly/`, add a `paths.base`
to `apps/app/svelte.config.js`:

```js
kit: {
  paths: { base: '/redactly' },
  // …
}
```

All asset URLs in the build will be prefixed with `/redactly`. Without
this the SPA loads at the right URL but assets 404 because they reference
absolute root paths.

---

## GHES-specific notes

### Self-hosted runner

If your GHES doesn't have hosted runners, edit
`.github/workflows/pages.yml` and change `runs-on: ubuntu-latest` to
your runner label, e.g.:

```yaml
runs-on: [self-hosted, linux, x64]
```

### Firewall / model CDN allowlist

NER and WebLLM models download from external CDNs. If your users' browsers
are behind a corporate proxy or firewall, allowlist:

- `huggingface.co`, `*.huggingface.co`, `cdn-lfs.huggingface.co`,
  `cdn-lfs-us-1.huggingface.co`, `cas-bridge.xethub.hf.co` (NER + LLM
  weights)
- `cdn.jsdelivr.net`, `unpkg.com` (small JS loaders for transformers.js)

Or pre-cache the models on an internal mirror — out of scope for this
preset, but possible via the `transformers.env.remoteHost` setting in
`apps/app/src/lib/setup/ner.ts`.

### Air-gapped install

The `app.redactly.dev` deploy fetches models from HuggingFace on first
use. For a fully air-gapped install you'd need to: (a) self-host the
model files on a server inside your network, (b) point
`transformers.env.remoteHost` and `transformers.env.allowRemoteModels`
accordingly, and (c) widen `connect-src` in the CSP defined in
`svelte.config.js`. Not done in this preset — file an issue if you need it.

---

## Updating to upstream changes

Bring in new Redactly features from upstream:

```bash
git remote add upstream https://github.com/moritz-hauff-it/redactly.git
git fetch upstream
git checkout github-pages
git merge upstream/main
```

Expect merge conflicts in the removed files (legal pages, footer). Drop
the upstream changes for those — that's the whole point of this branch.

---

## Verifying privacy posture

After deploy:

1. Open DevTools → Network tab on your instance
2. Type some text containing PII (real or fake — your call)
3. Click **Maskieren**
4. Confirm: **no network requests fire** during masking (regex-only mode)
   or only HuggingFace requests for the one-time NER model download
5. Inspect any masked output: confirm placeholders match what you expect

This is the same guarantee the public deploy gives — independently
verifiable, no trust required.
