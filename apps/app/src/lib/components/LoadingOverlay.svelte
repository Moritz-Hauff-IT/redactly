<script lang="ts">
  import { engineStore } from '$lib/stores/engineStore.svelte.js';
  import { settingsStore } from '$lib/stores/settingsStore.svelte.js';
  import { unloadNer } from '$lib/core/nerLoader.js';
  import { unloadWebLlm } from '$lib/core/llmLoader.js';
  import { loc } from '$lib/i18n/locale.svelte.js';

  // Local strings — overlay copy is too tied to a state machine to live
  // in the global messages table.
  const s = {
    title: { de: 'Redactly wird vorbereitet', en: 'Preparing Redactly' },
    subtitle: {
      de: 'Privacy-Engines laden einmalig in deinen Browser. Danach läuft alles offline — kein Server sieht deine Daten.',
      en: 'Privacy engines are loading into your browser. After this, everything runs offline — no server ever sees your data.',
    },
    nerLabel: { de: 'NER · Personen, Orte, Firmen', en: 'NER · Names, places, companies' },
    nerSize: { de: '~140 MB · einmalig', en: '~140 MB · one-time' },
    llmLabel: { de: 'WebLLM · Llama 3.2 3B', en: 'WebLLM · Llama 3.2 3B' },
    llmSize: { de: '~1.7 GB · einmalig', en: '~1.7 GB · one-time' },
    skip: { de: 'Überspringen — nur Regex verwenden', en: 'Skip — use regex only' },
    skipHint: {
      de: 'Schneller verfügbar, aber Recall fällt auf ~60 % bei freien Namen.',
      en: 'Available sooner, but recall drops to ~60% on free-text names.',
    },
    ready: { de: 'Bereit', en: 'Ready' },
    error: { de: 'Fehler', en: 'Error' },
    waiting: { de: 'wartet …', en: 'waiting…' },
  } as const;

  // Show the overlay while either enabled engine is still loading.
  // Once both are ready (or errored, or disabled) → hide.
  const shouldShow = $derived.by(() => {
    const nerBlocks =
      settingsStore.nerEnabled &&
      engineStore.ner.status !== 'ready' &&
      engineStore.ner.status !== 'error';
    const llmBlocks =
      settingsStore.webllmEnabled &&
      engineStore.webllm.status !== 'ready' &&
      engineStore.webllm.status !== 'error';
    return nerBlocks || llmBlocks;
  });

  function statusLabel(status: string): string {
    if (status === 'ready') return loc(s.ready);
    if (status === 'error') return loc(s.error);
    if (status === 'loading') return '';
    return loc(s.waiting);
  }

  async function skipAll(): Promise<void> {
    // Persist the opt-out so we don't keep nagging on every visit. Also
    // tear down anything mid-load so we don't fight a half-loaded model.
    if (engineStore.ner.status === 'ready' || engineStore.ner.status === 'loading') {
      await unloadNer().catch(() => {
        /* best-effort */
      });
    }
    if (engineStore.webllm.status === 'ready' || engineStore.webllm.status === 'loading') {
      await unloadWebLlm().catch(() => {
        /* best-effort */
      });
    }
    settingsStore.setNerEnabled(false);
    settingsStore.setWebllmEnabled(false);
  }
</script>

{#if shouldShow}
  <div class="overlay-backdrop"></div>
  <div class="overlay" role="dialog" aria-modal="true" aria-labelledby="loading-title">
    <div class="card">
      <h2 id="loading-title" class="title">{loc(s.title)}</h2>
      <p class="subtitle">{loc(s.subtitle)}</p>

      <ul class="engines">
        {#if settingsStore.nerEnabled}
          <li>
            <div class="row">
              <div class="text">
                <span class="name">{loc(s.nerLabel)}</span>
                <span class="size">{loc(s.nerSize)}</span>
              </div>
              <span class="status" data-status={engineStore.ner.status}>
                {#if engineStore.ner.status === 'loading'}
                  {Math.round(engineStore.ner.progress * 100)}%
                {:else}
                  {statusLabel(engineStore.ner.status)}
                {/if}
              </span>
            </div>
            <div class="track">
              <div
                class="fill"
                class:complete={engineStore.ner.status === 'ready'}
                class:errored={engineStore.ner.status === 'error'}
                style:width="{engineStore.ner.status === 'ready'
                  ? 100
                  : Math.round(engineStore.ner.progress * 100)}%"
              ></div>
            </div>
            {#if engineStore.ner.message}
              <p class="msg">{engineStore.ner.message}</p>
            {/if}
          </li>
        {/if}
        {#if settingsStore.webllmEnabled}
          <li>
            <div class="row">
              <div class="text">
                <span class="name">{loc(s.llmLabel)}</span>
                <span class="size">{loc(s.llmSize)}</span>
              </div>
              <span class="status" data-status={engineStore.webllm.status}>
                {#if engineStore.webllm.status === 'loading'}
                  {Math.round(engineStore.webllm.progress * 100)}%
                {:else}
                  {statusLabel(engineStore.webllm.status)}
                {/if}
              </span>
            </div>
            <div class="track">
              <div
                class="fill"
                class:complete={engineStore.webllm.status === 'ready'}
                class:errored={engineStore.webllm.status === 'error'}
                style:width="{engineStore.webllm.status === 'ready'
                  ? 100
                  : Math.round(engineStore.webllm.progress * 100)}%"
              ></div>
            </div>
            {#if engineStore.webllm.message}
              <p class="msg">{engineStore.webllm.message}</p>
            {/if}
          </li>
        {/if}
      </ul>

      <div class="skip-row">
        <button type="button" class="skip-btn" onclick={skipAll}>{loc(s.skip)}</button>
        <p class="skip-hint">{loc(s.skipHint)}</p>
      </div>
    </div>
  </div>
{/if}

<style>
  .overlay-backdrop {
    position: fixed;
    inset: 0;
    background: rgba(26, 24, 20, 0.7);
    backdrop-filter: blur(4px);
    z-index: 9000;
  }
  .overlay {
    position: fixed;
    inset: 0;
    z-index: 9001;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 24px;
  }
  .card {
    width: 100%;
    max-width: 560px;
    background: var(--color-bg);
    border: 1px solid var(--color-rule-strong);
    border-radius: 8px;
    padding: 28px 28px 22px;
    box-shadow: 0 24px 60px rgba(0, 0, 0, 0.35);
  }
  .title {
    font-family: var(--font-serif);
    font-size: 22px;
    font-weight: 500;
    letter-spacing: -0.01em;
    color: var(--color-ink);
    margin: 0 0 6px;
  }
  .subtitle {
    font-size: 13px;
    line-height: 1.55;
    color: var(--color-ink-soft);
    margin: 0 0 22px;
  }
  .engines {
    list-style: none;
    margin: 0 0 22px;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 18px;
  }
  .row {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 12px;
    margin-bottom: 6px;
  }
  .text {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }
  .name {
    font-family: var(--font-mono);
    font-size: 13px;
    color: var(--color-ink);
  }
  .size {
    font-family: var(--font-mono);
    font-size: 10.5px;
    color: var(--color-ink-mute);
  }
  .status {
    font-family: var(--font-mono);
    font-size: 12px;
    color: var(--color-accent);
    text-transform: lowercase;
  }
  .status[data-status='ready'] {
    color: #16a34a;
  }
  .status[data-status='error'] {
    color: #dc2626;
  }
  .track {
    height: 4px;
    background: var(--color-rule);
    border-radius: 2px;
    overflow: hidden;
  }
  .fill {
    height: 100%;
    background: var(--color-accent);
    transition: width 0.2s ease-out;
  }
  .fill.complete {
    background: #16a34a;
  }
  .fill.errored {
    background: #dc2626;
  }
  .msg {
    margin: 6px 0 0;
    font-family: var(--font-mono);
    font-size: 10.5px;
    color: var(--color-ink-mute);
  }
  .skip-row {
    border-top: 1px solid var(--color-rule);
    padding-top: 16px;
    display: flex;
    flex-direction: column;
    gap: 4px;
  }
  .skip-btn {
    align-self: flex-start;
    background: transparent;
    border: 1px solid var(--color-rule-strong);
    color: var(--color-ink-soft);
    font-family: var(--font-mono);
    font-size: 12px;
    padding: 8px 14px;
    border-radius: 4px;
    cursor: pointer;
    transition: all 0.12s;
  }
  .skip-btn:hover {
    border-color: var(--color-ink-mute);
    color: var(--color-ink);
  }
  .skip-hint {
    margin: 0;
    font-size: 11.5px;
    color: var(--color-ink-mute);
    line-height: 1.5;
  }
</style>
