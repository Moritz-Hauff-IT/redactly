<script lang="ts">
  import { engineStore } from '$lib/stores/engineStore.svelte.js';
  import { settingsStore } from '$lib/stores/settingsStore.svelte.js';
  import { applyCategoryFilter } from '$lib/core/pipeline.js';
  import { loadNer, unloadNer } from '$lib/core/nerLoader.js';
  import { loadWebLlm, unloadWebLlm } from '$lib/core/llmLoader.js';
  import { SUPPORTED_WEBLLM_MODELS } from '@de-pii/core';
  import type { EntityCategory } from '@de-pii/core/types';

  interface Props {
    open: boolean;
  }

  let { open = $bindable() }: Props = $props();

  const CATEGORY_INFO: Array<{ cat: EntityCategory; label: string; description: string }> = [
    { cat: 'person', label: 'Personen', description: 'Namen (NER)' },
    { cat: 'contact', label: 'Kontakt', description: 'Email, Telefon, URL, IP' },
    { cat: 'address', label: 'Adressen', description: 'Orte, Straßen (NER)' },
    { cat: 'financial', label: 'Finanz', description: 'IBAN, Kreditkarte, Steuer-ID' },
    { cat: 'secret', label: 'Secrets', description: 'API-Keys, JWTs, Tokens' },
    { cat: 'organization', label: 'Organisationen', description: 'Firmennamen (NER)' },
  ];

  function isEnabled(cat: EntityCategory): boolean {
    return settingsStore.enabledCategories.has(cat);
  }

  function toggleCat(cat: EntityCategory): void {
    settingsStore.toggleCategory(cat);
    applyCategoryFilter([...settingsStore.enabledCategories] as EntityCategory[]);
  }

  const webgpuSupported = $derived(typeof navigator !== 'undefined' && 'gpu' in navigator);

  async function handleNerToggle(): Promise<void> {
    if (engineStore.ner.status === 'ready') {
      await unloadNer();
    } else {
      await loadNer();
    }
  }

  async function handleWebLlmToggle(): Promise<void> {
    if (engineStore.webllm.status === 'ready') {
      await unloadWebLlm();
    } else {
      await loadWebLlm(settingsStore.webllmModelId);
    }
  }

  function close(): void {
    open = false;
  }

  // ESC to close
  function handleKeydown(e: KeyboardEvent): void {
    if (e.key === 'Escape' && open) close();
  }
</script>

<svelte:window onkeydown={handleKeydown} />

{#if open}
  <!-- backdrop — click closes -->
  <button class="drawer-backdrop" onclick={close} aria-label="Drawer schließen" type="button"
  ></button>

  <div class="drawer" role="dialog" aria-modal="true" aria-labelledby="drawer-title">
    <header
      class="flex items-baseline justify-between border-b border-[color:var(--color-rule)] px-7 pt-6 pb-4"
    >
      <h2
        id="drawer-title"
        class="font-[family-name:var(--font-serif)] text-[20px] leading-none font-medium tracking-[-0.01em]"
      >
        Einstellungen
      </h2>
      <button class="btn-icon" onclick={close} aria-label="Schließen">
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="1.6"
          stroke-linecap="round"
        >
          <path d="M18 6 6 18M6 6l12 12" />
        </svg>
      </button>
    </header>

    <div class="flex-1 overflow-y-auto px-7 py-6">
      <!-- Detection categories -->
      <section>
        <span class="label">Kategorien</span>
        <p class="mt-1 text-[12.5px] leading-snug text-[color:var(--color-ink-soft)]">
          Was soll erkannt werden? Deaktivierte Kategorien werden im Detection-Review nicht
          angezeigt.
        </p>
        <ul class="mt-4 space-y-2">
          {#each CATEGORY_INFO as info}
            <li>
              <button
                type="button"
                class="flex w-full items-start justify-between gap-3 rounded-md border border-[color:var(--color-rule)] bg-[color:var(--color-bg-elev)] px-3.5 py-2.5 text-left transition-colors hover:border-[color:var(--color-rule-strong)]"
                onclick={() => toggleCat(info.cat)}
              >
                <span class="flex-1">
                  <span class="block text-[13px] font-medium text-[color:var(--color-ink)]"
                    >{info.label}</span
                  >
                  <span
                    class="block font-[family-name:var(--font-mono)] text-[11px] text-[color:var(--color-ink-mute)]"
                  >
                    {info.description}
                  </span>
                </span>
                <span
                  class="mt-0.5 inline-flex h-5 w-9 flex-shrink-0 items-center rounded-full p-0.5 transition-colors {isEnabled(
                    info.cat
                  )
                    ? 'bg-[color:var(--color-accent)]'
                    : 'bg-[color:var(--color-rule-strong)]'}"
                >
                  <span
                    class="h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform {isEnabled(
                      info.cat
                    )
                      ? 'translate-x-4'
                      : 'translate-x-0'}"
                  ></span>
                </span>
              </button>
            </li>
          {/each}
        </ul>
      </section>

      <hr class="my-7 border-[color:var(--color-rule)]" />

      <!-- NER -->
      <section>
        <span class="label">NER · Named Entity Recognition</span>
        <p class="mt-1 text-[12.5px] leading-snug text-[color:var(--color-ink-soft)]">
          Erkennt Personennamen, Organisationen und Orte, die kein vorhersagbares Muster haben.
          Multilingual BERT, ~140 MB Download, danach offline. DE + EN out of the box.
        </p>

        <div class="mt-4">
          {#if engineStore.ner.status === 'loading'}
            <div
              class="rounded-md border border-[color:var(--color-accent)] bg-[color:var(--color-accent-soft)] px-3.5 py-3"
            >
              <div class="flex items-center justify-between">
                <span class="text-[12px] font-medium text-[color:var(--color-accent)]"
                  >Lade NER-Modell …</span
                >
                <span
                  class="font-[family-name:var(--font-mono)] text-[11px] text-[color:var(--color-accent)]"
                >
                  {Math.round(engineStore.ner.progress * 100)}%
                </span>
              </div>
              <div class="mt-2 h-1 overflow-hidden rounded bg-[color:var(--color-rule)]">
                <div
                  class="h-full bg-[color:var(--color-accent)] transition-all"
                  style="width: {Math.round(engineStore.ner.progress * 100)}%"
                ></div>
              </div>
              {#if engineStore.ner.message}
                <p
                  class="mt-2 font-[family-name:var(--font-mono)] text-[10.5px] text-[color:var(--color-ink-mute)]"
                >
                  {engineStore.ner.message}
                </p>
              {/if}
            </div>
          {:else if engineStore.ner.status === 'ready'}
            <div class="flex items-center justify-between gap-3">
              <span class="pill" title="NER bereit">
                <span class="dot online"></span>
                NER aktiv
              </span>
              <button class="btn-ghost" onclick={handleNerToggle}>Deaktivieren</button>
            </div>
          {:else if engineStore.ner.status === 'error'}
            <div class="rounded-md border border-[color:var(--color-danger)] bg-red-50 px-3.5 py-3">
              <p class="text-[12px] font-medium text-[color:var(--color-danger)]">
                Fehler beim Laden des NER-Modells
              </p>
              {#if engineStore.ner.message}
                <p
                  class="mt-1 font-[family-name:var(--font-mono)] text-[10.5px] text-[color:var(--color-danger)] opacity-80"
                >
                  {engineStore.ner.message}
                </p>
              {/if}
              <button class="btn-ghost mt-3" onclick={handleNerToggle}>Erneut versuchen</button>
            </div>
          {:else}
            <button class="btn-primary" onclick={handleNerToggle}> NER aktivieren </button>
          {/if}
        </div>
      </section>

      <hr class="my-7 border-[color:var(--color-rule)]" />

      <!-- WebLLM -->
      <section>
        <span class="label">WebLLM · Kontextuelles LLM (experimentell)</span>
        <p class="mt-1 text-[12.5px] leading-snug text-[color:var(--color-ink-soft)]">
          Lokales LLM im Browser via WebGPU. Versteht Kontext, fängt Edge-Cases ab, die NER
          übersieht. Modell-Download in GB-Größe, bleibt im Browser-Cache (IndexedDB).
        </p>

        {#if !webgpuSupported}
          <div
            class="mt-4 rounded-md border border-[color:var(--color-rule-strong)] bg-[color:var(--color-bg-sunk)] px-3.5 py-3"
          >
            <p class="text-[12px] text-[color:var(--color-ink-soft)]">
              WebGPU nicht verfügbar. Aktuelle Chrome oder Edge Desktop nötig.
            </p>
          </div>
        {:else}
          <div class="mt-4">
            <label
              for="webllm-model-select"
              class="block font-[family-name:var(--font-mono)] text-[10.5px] tracking-[0.08em] text-[color:var(--color-ink-mute)] uppercase"
            >
              Modell
            </label>
            <select
              id="webllm-model-select"
              class="mt-1.5 w-full rounded-md border border-[color:var(--color-rule-strong)] bg-[color:var(--color-bg-elev)] px-3 py-2 font-[family-name:var(--font-mono)] text-[12px] text-[color:var(--color-ink)] focus:border-[color:var(--color-accent)] focus:outline-none"
              value={settingsStore.webllmModelId}
              onchange={(e) =>
                settingsStore.setWebllmModelId((e.currentTarget as HTMLSelectElement).value)}
              disabled={engineStore.webllm.status === 'loading' ||
                engineStore.webllm.status === 'ready'}
            >
              {#each SUPPORTED_WEBLLM_MODELS as model}
                <option value={model.id}>
                  {model.label} · ~{model.sizeMB} MB
                </option>
              {/each}
            </select>
            <p class="mt-1.5 text-[11px] text-[color:var(--color-ink-mute)]">
              {SUPPORTED_WEBLLM_MODELS.find((m) => m.id === settingsStore.webllmModelId)
                ?.description ?? ''}
            </p>
          </div>

          <div class="mt-4">
            {#if engineStore.webllm.status === 'loading'}
              <div
                class="rounded-md border border-[color:var(--color-accent)] bg-[color:var(--color-accent-soft)] px-3.5 py-3"
              >
                <div class="flex items-center justify-between">
                  <span class="text-[12px] font-medium text-[color:var(--color-accent)]"
                    >Lade WebLLM …</span
                  >
                  <span
                    class="font-[family-name:var(--font-mono)] text-[11px] text-[color:var(--color-accent)]"
                  >
                    {Math.round(engineStore.webllm.progress * 100)}%
                  </span>
                </div>
                <div class="mt-2 h-1 overflow-hidden rounded bg-[color:var(--color-rule)]">
                  <div
                    class="h-full bg-[color:var(--color-accent)] transition-all"
                    style="width: {Math.round(engineStore.webllm.progress * 100)}%"
                  ></div>
                </div>
                {#if engineStore.webllm.message}
                  <p
                    class="mt-2 font-[family-name:var(--font-mono)] text-[10.5px] text-[color:var(--color-ink-mute)]"
                  >
                    {engineStore.webllm.message}
                  </p>
                {/if}
              </div>
            {:else if engineStore.webllm.status === 'ready'}
              <div class="flex items-center justify-between gap-3">
                <span class="pill">
                  <span class="dot online"></span>
                  WebLLM aktiv
                </span>
                <button class="btn-ghost" onclick={handleWebLlmToggle}>Deaktivieren</button>
              </div>
            {:else if engineStore.webllm.status === 'error'}
              <div
                class="rounded-md border border-[color:var(--color-danger)] bg-red-50 px-3.5 py-3"
              >
                <p class="text-[12px] font-medium text-[color:var(--color-danger)]">
                  Fehler beim Laden des WebLLM-Modells
                </p>
                {#if engineStore.webllm.message}
                  <p
                    class="mt-1 font-[family-name:var(--font-mono)] text-[10.5px] text-[color:var(--color-danger)] opacity-80"
                  >
                    {engineStore.webllm.message}
                  </p>
                {/if}
                <button class="btn-ghost mt-3" onclick={handleWebLlmToggle}>
                  Erneut versuchen
                </button>
              </div>
            {:else}
              <button class="btn-primary" onclick={handleWebLlmToggle}>WebLLM aktivieren</button>
            {/if}
          </div>
        {/if}
      </section>

      <hr class="my-7 border-[color:var(--color-rule)]" />

      <section>
        <span class="label">Info</span>
        <p class="mt-2 text-[12.5px] leading-snug text-[color:var(--color-ink-soft)]">
          Redactly läuft 100 % in deinem Browser. Es gibt keinen Server, der deinen Text empfängt.
          Modelle werden einmalig vom HuggingFace-CDN geladen und im Browser gecacht.
        </p>
        <p class="mt-2 text-[11.5px] text-[color:var(--color-ink-mute)]">
          v0.1.0-alpha · MIT-Lizenz
        </p>
      </section>
    </div>
  </div>
{/if}

<style>
  .drawer-backdrop {
    border: none;
    cursor: pointer;
  }
</style>
