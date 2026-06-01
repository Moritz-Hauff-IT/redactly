<script lang="ts">
  import { localizedHref, loc } from '$lib/i18n/locale.svelte.js';
  import type { Snippet } from 'svelte';

  interface Props {
    title: string;
    children: Snippet;
  }

  const { title, children }: Props = $props();

  const backLabel = $derived(loc({ de: '← zurück zur App', en: '← back to app' }));
</script>

<div class="legal-container">
  <nav class="mb-6">
    <a href={localizedHref('/')} class="legal-back">{backLabel}</a>
  </nav>

  <h1
    class="font-[family-name:var(--font-serif)] text-[32px] font-medium tracking-[-0.01em] text-[color:var(--color-ink)]"
  >
    {title}
  </h1>

  <article class="legal-prose mt-8">
    {@render children()}
  </article>
</div>

<style>
  .legal-container {
    max-width: 760px;
    margin: 0 auto;
    padding: 16px 0 80px;
  }
  .legal-back {
    font-family: var(--font-mono);
    font-size: 12px;
    color: var(--color-ink-mute);
    text-decoration: none;
    letter-spacing: 0.02em;
  }
  .legal-back:hover {
    color: var(--color-accent);
  }

  /* Scoped prose: keep the app aesthetic instead of bringing in Tailwind's
     prose classes (which we don't ship). Style only what legal pages need:
     headings, paragraphs, lists, tables, code, links. */
  .legal-prose :global(h2) {
    font-family: var(--font-serif);
    font-size: 22px;
    font-weight: 500;
    letter-spacing: -0.005em;
    color: var(--color-ink);
    margin: 36px 0 12px;
  }
  .legal-prose :global(h3) {
    font-family: var(--font-serif);
    font-size: 18px;
    font-weight: 500;
    color: var(--color-ink);
    margin: 28px 0 10px;
  }
  .legal-prose :global(p) {
    font-size: 14.5px;
    line-height: 1.7;
    color: var(--color-ink-soft);
    margin: 0 0 14px;
  }
  .legal-prose :global(ul) {
    margin: 0 0 14px;
    padding-left: 22px;
  }
  .legal-prose :global(li) {
    font-size: 14.5px;
    line-height: 1.7;
    color: var(--color-ink-soft);
    margin: 0 0 4px;
  }
  .legal-prose :global(a) {
    color: var(--color-accent);
    text-decoration: underline;
    text-underline-offset: 2px;
  }
  .legal-prose :global(a:hover) {
    text-decoration: none;
  }
  .legal-prose :global(strong) {
    color: var(--color-ink);
    font-weight: 600;
  }
  .legal-prose :global(table) {
    width: 100%;
    border-collapse: collapse;
    margin: 12px 0 18px;
    font-size: 13px;
  }
  .legal-prose :global(th),
  .legal-prose :global(td) {
    border: 1px solid var(--color-rule);
    padding: 8px 12px;
    text-align: left;
    vertical-align: top;
    color: var(--color-ink-soft);
  }
  .legal-prose :global(th) {
    background: var(--color-bg-sunk);
    color: var(--color-ink);
    font-weight: 500;
    font-family: var(--font-mono);
    font-size: 11px;
    letter-spacing: 0.04em;
    text-transform: uppercase;
  }
  .legal-prose :global(code) {
    font-family: var(--font-mono);
    font-size: 12.5px;
    background: var(--color-bg-sunk);
    padding: 1px 5px;
    border-radius: 3px;
    color: var(--color-ink);
  }
  .legal-prose :global(address) {
    font-style: normal;
    font-family: var(--font-mono);
    font-size: 13px;
    line-height: 1.7;
    color: var(--color-ink);
    background: var(--color-bg-sunk);
    border-left: 2px solid var(--color-accent);
    padding: 12px 16px;
    margin: 0 0 14px;
  }
  .legal-prose :global(.lang-note) {
    font-style: italic;
    color: var(--color-ink-mute);
    font-size: 13px;
  }
  .legal-prose :global(hr) {
    border: 0;
    border-top: 1px solid var(--color-rule);
    margin: 32px 0;
  }
</style>
