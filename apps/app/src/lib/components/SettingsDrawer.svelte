<script lang="ts">
  import { engineStore } from '$lib/stores/engineStore.svelte.js';
  import { settingsStore } from '$lib/stores/settingsStore.svelte.js';
  import { applyCategoryFilter } from '$lib/core/pipeline.js';
  import { loadNer, unloadNer } from '$lib/core/nerLoader.js';
  import { loadWebLlm, unloadWebLlm } from '$lib/core/llmLoader.js';
  import { clearModelCaches } from '$lib/core/modelCacheCleanup.js';
  import { SUPPORTED_WEBLLM_MODELS } from '@redactly/core';
  import type { EntityCategory } from '@redactly/core/types';
  import { loc } from '$lib/i18n/locale.svelte.js';

  interface BL {
    de: string;
    en: string;
  }

  interface Props {
    open: boolean;
  }

  let { open = $bindable() }: Props = $props();

  const CATEGORY_INFO: Array<{ cat: EntityCategory; label: BL; description: BL }> = [
    {
      cat: 'person',
      label: { de: 'Personen', en: 'People' },
      description: { de: 'Namen (Regex Anrede + NER)', en: 'Names (salutation regex + NER)' },
    },
    {
      cat: 'contact',
      label: { de: 'Kontakt', en: 'Contact' },
      description: { de: 'Email, Telefon, URL, IP', en: 'Email, phone, URL, IP' },
    },
    {
      cat: 'address',
      label: { de: 'Adressen', en: 'Addresses' },
      description: {
        de: 'Straßen, Orte, Postleitzahlen',
        en: 'Streets, cities, postal codes',
      },
    },
    {
      cat: 'financial',
      label: { de: 'Finanz', en: 'Financial' },
      description: {
        de: 'IBAN, BIC, Kreditkarte, Steuer-ID',
        en: 'IBAN, BIC, credit card, tax ID',
      },
    },
    {
      cat: 'identity',
      label: { de: 'IDs (DACH)', en: 'IDs (DACH)' },
      description: {
        de: 'AHV-Nr, UID, Pass, Personalausweis, KFZ, Mitarbeiter-Nr, Aktenzeichen',
        en: 'AHV no., UID, passport, ID card, plates, employee no., case ref.',
      },
    },
    {
      cat: 'secret',
      label: { de: 'Secrets', en: 'Secrets' },
      description: {
        de: 'API-Keys, JWTs, Tokens, Passwörter',
        en: 'API keys, JWTs, tokens, passwords',
      },
    },
    {
      cat: 'organization',
      label: { de: 'Organisationen', en: 'Organisations' },
      description: { de: 'Firmennamen (NER)', en: 'Company names (NER)' },
    },
    {
      cat: 'other',
      label: { de: 'Sonstiges', en: 'Other' },
      description: {
        de: 'Sensible Angaben ohne eigene Kategorie, z. B. Gesundheitsdaten (nur WebLLM)',
        en: 'Sensitive data without its own category, e.g. health info (WebLLM only)',
      },
    },
  ];

  // Inline UI strings used by the drawer template.
  const s = {
    title: { de: 'Einstellungen', en: 'Settings' },
    close: { de: 'Schließen', en: 'Close' },
    backdropClose: { de: 'Drawer schließen', en: 'Close drawer' },
    categoriesLabel: { de: 'Kategorien', en: 'Categories' },
    categoriesIntro: {
      de: 'Was soll erkannt werden? Deaktivierte Kategorien werden im Detection-Review nicht angezeigt.',
      en: "What should be detected? Disabled categories don't appear in the detection review.",
    },
    nerLabel: {
      de: 'NER · Named Entity Recognition',
      en: 'NER · Named entity recognition',
    },
    nerIntro: {
      de: 'Erkennt Personennamen, Organisationen und Orte, die kein vorhersagbares Muster haben. Multilingual BERT, ~140 MB Download, danach offline. DE + EN out of the box.',
      en: 'Detects person names, organisations, and places that have no predictable pattern. Multilingual BERT, ~140 MB download, then offline. German + English out of the box.',
    },
    nerLoading: { de: 'Lade NER-Modell …', en: 'Loading NER model…' },
    nerActive: { de: 'NER aktiv', en: 'NER active' },
    nerTitle: { de: 'NER bereit', en: 'NER ready' },
    nerDisable: { de: 'Deaktivieren', en: 'Disable' },
    nerError: {
      de: 'Fehler beim Laden des NER-Modells',
      en: 'Error loading NER model',
    },
    nerRetry: { de: 'Erneut versuchen', en: 'Try again' },
    nerEnable: { de: 'NER aktivieren', en: 'Enable NER' },
    webllmLabel: {
      de: 'WebLLM · Lokales LLM (für Orchestrierung)',
      en: 'WebLLM · Local LLM (for orchestration)',
    },
    webllmIntroA: {
      de: 'Lokales LLM im Browser via WebGPU. Standardrolle: ',
      en: 'Local LLM in the browser via WebGPU. Default role: ',
    },
    webllmIntroEm: { de: 'Orchestrierung', en: 'orchestration' },
    webllmIntroB: {
      de: ' — entscheidet bei ZIP-Uploads welche Files maskiert werden sollen, klassifiziert Dokumente, schlägt Custom-Rules vor. Für reine Text-PII-Erkennung sind Regex und NER schneller und zuverlässiger.',
      en: ' — decides which files in a ZIP upload should be masked, classifies documents, suggests custom rules. For raw text PII detection, regex + NER are faster and more reliable.',
    },
    webgpuMissing: {
      de: 'WebGPU nicht verfügbar. Aktuelle Chrome oder Edge Desktop nötig.',
      en: 'WebGPU not available. A current Chrome or Edge on desktop is required.',
    },
    modelLabel: { de: 'Modell', en: 'Model' },
    webllmLoading: { de: 'Lade WebLLM …', en: 'Loading WebLLM…' },
    webllmActive: { de: 'WebLLM aktiv', en: 'WebLLM active' },
    webllmError: {
      de: 'Fehler beim Laden des WebLLM-Modells',
      en: 'Error loading WebLLM model',
    },
    webllmEnable: { de: 'WebLLM aktivieren', en: 'Enable WebLLM' },
    webllmTextPiiTitle: {
      de: 'WebLLM auch für Text-PII (genauer)',
      en: 'Use WebLLM for text PII too (more accurate)',
    },
    webllmTextPiiBody: {
      de: 'Das LLM läuft zusätzlich zur Regex+NER-Pipeline auf deinem Text. NER allein erkennt ca. 50 % der Namen — WebLLM (Llama 3.2 3B) bringt die Erkennung auf ~100 %. Kostet 10–60 s pro Maskierung. Empfohlen wenn Namen-Erkennung kritisch ist.',
      en: 'The LLM runs in addition to the regex + NER pipeline on your text. NER alone catches ~50% of names — WebLLM (Llama 3.2 3B) brings detection to ~100%. Costs 10–60 s per mask. Recommended when name detection is critical.',
    },
    nerRecallNotice: {
      de: 'NER fängt etwa 50 % der freien Namen. Für nahezu 100 % Recall WebLLM unten aktivieren (Llama 3.2 3B empfohlen).',
      en: 'NER catches around 50 % of free-text names. Enable WebLLM below (Llama 3.2 3B recommended) for ~100 % recall.',
    },
    cleanupLabel: { de: 'Modell-Cache', en: 'Model cache' },
    cleanupBody: {
      de: 'Löscht alle zwischengespeicherten NER- und WebLLM-Modelle aus dem Browser. Deine Einstellungen bleiben erhalten. Nützlich wenn der Browser-Speicher voll ist oder du ein Modell neu laden willst.',
      en: 'Clears all cached NER and WebLLM model weights from the browser. Your settings are kept. Useful when storage is full or you want to re-download a model.',
    },
    cleanupButton: { de: 'Modelle aus Cache löschen', en: 'Clear cached models' },
    cleanupRunning: { de: 'Räume auf …', en: 'Cleaning up…' },
    cleanupDone: {
      de: '{dbs} Datenbank(en), {cache} Cache-Einträge gelöscht{bytes}',
      en: '{dbs} database(s), {cache} cache entries removed{bytes}',
    },
    cleanupBytes: { de: ' · {mb} MB freigegeben', en: ' · {mb} MB freed' },
    infoLabel: { de: 'Info', en: 'Info' },
    infoBody: {
      de: 'Redactly läuft 100 % in deinem Browser. Es gibt keinen Server, der deinen Text empfängt. Modelle werden einmalig vom HuggingFace-CDN geladen und im Browser gecacht.',
      en: 'Redactly runs 100% in your browser. There is no server that receives your text. Models are downloaded once from the HuggingFace CDN and cached in the browser.',
    },
    infoVersion: {
      de: 'v0.1.0-alpha · FSL-1.1-Apache-2.0',
      en: 'v0.1.0-alpha · FSL-1.1-Apache-2.0',
    },
  } as const;

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

  let cleanupRunning = $state(false);
  let cleanupResult = $state<string | null>(null);

  async function runModelCacheCleanup(): Promise<void> {
    // Unload active engines first so their IndexedDB handles are released —
    // otherwise deleteDatabase() blocks waiting for the open connection.
    if (engineStore.ner.status === 'ready') await unloadNer();
    if (engineStore.webllm.status === 'ready') await unloadWebLlm();

    cleanupRunning = true;
    cleanupResult = null;
    try {
      const result = await clearModelCaches();
      const mb =
        result.bytesRecovered !== null && result.bytesRecovered > 0
          ? Math.round(result.bytesRecovered / 1024 / 1024)
          : null;
      const bytesPart = mb !== null ? loc(s.cleanupBytes).replace('{mb}', String(mb)) : '';
      cleanupResult = loc(s.cleanupDone)
        .replace('{dbs}', String(result.databases.length))
        .replace('{cache}', String(result.cacheEntries))
        .replace('{bytes}', bytesPart);
    } catch (err) {
      cleanupResult = err instanceof Error ? err.message : String(err);
    } finally {
      cleanupRunning = false;
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
  <button class="drawer-backdrop" onclick={close} aria-label={loc(s.backdropClose)} type="button"
  ></button>

  <div class="drawer" role="dialog" aria-modal="true" aria-labelledby="drawer-title">
    <header
      class="flex items-baseline justify-between border-b border-[color:var(--color-rule)] px-7 pt-6 pb-4"
    >
      <h2
        id="drawer-title"
        class="font-[family-name:var(--font-serif)] text-[20px] leading-none font-medium tracking-[-0.01em]"
      >
        {loc(s.title)}
      </h2>
      <button class="btn-icon" onclick={close} aria-label={loc(s.close)}>
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
        <span class="label">{loc(s.categoriesLabel)}</span>
        <p class="mt-1 text-[12.5px] leading-snug text-[color:var(--color-ink-soft)]">
          {loc(s.categoriesIntro)}
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
                    >{loc(info.label)}</span
                  >
                  <span
                    class="block font-[family-name:var(--font-mono)] text-[11px] text-[color:var(--color-ink-mute)]"
                  >
                    {loc(info.description)}
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
        <span class="label">{loc(s.nerLabel)}</span>
        <p class="mt-1 text-[12.5px] leading-snug text-[color:var(--color-ink-soft)]">
          {loc(s.nerIntro)}
        </p>

        <div class="mt-4">
          {#if engineStore.ner.status === 'loading'}
            <div
              class="rounded-md border border-[color:var(--color-accent)] bg-[color:var(--color-accent-soft)] px-3.5 py-3"
            >
              <div class="flex items-center justify-between">
                <span class="text-[12px] font-medium text-[color:var(--color-accent)]"
                  >{loc(s.nerLoading)}</span
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
              <span class="pill" title={loc(s.nerTitle)}>
                <span class="dot online"></span>
                {loc(s.nerActive)}
              </span>
              <button class="btn-ghost" onclick={handleNerToggle}>{loc(s.nerDisable)}</button>
            </div>
            {#if !(engineStore.webllm.status === 'ready' && settingsStore.webllmTextPii)}
              <!-- Recall hint: NER alone misses ~50% of free-text names per
                   our internal evaluation. Only show while WebLLM isn't
                   already covering the gap — otherwise it's noise. -->
              <div class="recall-notice mt-3">
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="1.8"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  aria-hidden="true"
                  class="flex-shrink-0"
                >
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
                <span>{loc(s.nerRecallNotice)}</span>
              </div>
            {/if}
          {:else if engineStore.ner.status === 'error'}
            <div class="rounded-md border border-[color:var(--color-danger)] bg-red-50 px-3.5 py-3">
              <p class="text-[12px] font-medium text-[color:var(--color-danger)]">
                {loc(s.nerError)}
              </p>
              {#if engineStore.ner.message}
                <p
                  class="mt-1 font-[family-name:var(--font-mono)] text-[10.5px] text-[color:var(--color-danger)] opacity-80"
                >
                  {engineStore.ner.message}
                </p>
              {/if}
              <button class="btn-ghost mt-3" onclick={handleNerToggle}>{loc(s.nerRetry)}</button>
            </div>
          {:else}
            <button class="btn-primary" onclick={handleNerToggle}>{loc(s.nerEnable)}</button>
          {/if}
        </div>
      </section>

      <hr class="my-7 border-[color:var(--color-rule)]" />

      <!-- WebLLM -->
      <section>
        <span class="label">{loc(s.webllmLabel)}</span>
        <p class="mt-1 text-[12.5px] leading-snug text-[color:var(--color-ink-soft)]">
          {loc(s.webllmIntroA)}<strong>{loc(s.webllmIntroEm)}</strong>{loc(s.webllmIntroB)}
        </p>

        {#if !webgpuSupported}
          <div
            class="mt-4 rounded-md border border-[color:var(--color-rule-strong)] bg-[color:var(--color-bg-sunk)] px-3.5 py-3"
          >
            <p class="text-[12px] text-[color:var(--color-ink-soft)]">
              {loc(s.webgpuMissing)}
            </p>
          </div>
        {:else}
          <div class="mt-4">
            <label
              for="webllm-model-select"
              class="block font-[family-name:var(--font-mono)] text-[10.5px] tracking-[0.08em] text-[color:var(--color-ink-mute)] uppercase"
            >
              {loc(s.modelLabel)}
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
                    >{loc(s.webllmLoading)}</span
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
                  {loc(s.webllmActive)}
                </span>
                <button class="btn-ghost" onclick={handleWebLlmToggle}>{loc(s.nerDisable)}</button>
              </div>
            {:else if engineStore.webllm.status === 'error'}
              <div
                class="rounded-md border border-[color:var(--color-danger)] bg-red-50 px-3.5 py-3"
              >
                <p class="text-[12px] font-medium text-[color:var(--color-danger)]">
                  {loc(s.webllmError)}
                </p>
                {#if engineStore.webllm.message}
                  <p
                    class="mt-1 font-[family-name:var(--font-mono)] text-[10.5px] text-[color:var(--color-danger)] opacity-80"
                  >
                    {engineStore.webllm.message}
                  </p>
                {/if}
                <button class="btn-ghost mt-3" onclick={handleWebLlmToggle}>
                  {loc(s.nerRetry)}
                </button>
              </div>
            {:else}
              <button class="btn-primary" onclick={handleWebLlmToggle}>{loc(s.webllmEnable)}</button
              >
            {/if}
          </div>

          <!-- Text-PII opt-in: WebLLM also runs as a detector for raw text -->
          {#if engineStore.webllm.status === 'ready'}
            <div
              class="mt-4 rounded-md border border-[color:var(--color-rule)] bg-[color:var(--color-bg-elev)] p-3.5"
            >
              <button
                type="button"
                class="flex w-full items-start justify-between gap-3 text-left"
                onclick={() => settingsStore.setWebllmTextPii(!settingsStore.webllmTextPii)}
              >
                <span class="flex-1">
                  <span class="block text-[13px] font-medium text-[color:var(--color-ink)]">
                    {loc(s.webllmTextPiiTitle)}
                  </span>
                  <span
                    class="mt-0.5 block font-[family-name:var(--font-mono)] text-[11px] text-[color:var(--color-ink-mute)]"
                  >
                    {loc(s.webllmTextPiiBody)}
                  </span>
                </span>
                <span
                  class="mt-0.5 inline-flex h-5 w-9 flex-shrink-0 items-center rounded-full p-0.5 transition-colors {settingsStore.webllmTextPii
                    ? 'bg-[color:var(--color-accent)]'
                    : 'bg-[color:var(--color-rule-strong)]'}"
                >
                  <span
                    class="h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform {settingsStore.webllmTextPii
                      ? 'translate-x-4'
                      : 'translate-x-0'}"
                  ></span>
                </span>
              </button>
            </div>
          {/if}
        {/if}
      </section>

      <hr class="my-7 border-[color:var(--color-rule)]" />

      <!-- Model-cache cleanup — targeted alternative to browser-wide
           'Clear site data'. Keeps user settings (localStorage) but
           drops cached NER + WebLLM model weights from IndexedDB /
           Cache API. Surfaces what was freed so the user sees it work. -->
      <section>
        <span class="label">{loc(s.cleanupLabel)}</span>
        <p class="mt-1 text-[12.5px] leading-snug text-[color:var(--color-ink-soft)]">
          {loc(s.cleanupBody)}
        </p>
        <button class="btn-ghost mt-3" disabled={cleanupRunning} onclick={runModelCacheCleanup}>
          {cleanupRunning ? loc(s.cleanupRunning) : loc(s.cleanupButton)}
        </button>
        {#if cleanupResult}
          <p
            class="mt-2 font-[family-name:var(--font-mono)] text-[11px] text-[color:var(--color-ink-mute)]"
          >
            {cleanupResult}
          </p>
        {/if}
      </section>

      <hr class="my-7 border-[color:var(--color-rule)]" />

      <section>
        <span class="label">{loc(s.infoLabel)}</span>
        <p class="mt-2 text-[12.5px] leading-snug text-[color:var(--color-ink-soft)]">
          {loc(s.infoBody)}
        </p>
        <p class="mt-2 text-[11.5px] text-[color:var(--color-ink-mute)]">
          {loc(s.infoVersion)}
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
  .recall-notice {
    display: flex;
    align-items: flex-start;
    gap: 8px;
    padding: 10px 12px;
    border: 1px solid var(--color-accent);
    background: var(--color-accent-soft);
    border-radius: 6px;
    font-size: 12px;
    line-height: 1.5;
    color: var(--color-accent);
  }
</style>
