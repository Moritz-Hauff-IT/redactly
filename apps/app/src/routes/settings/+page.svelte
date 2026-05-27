<script lang="ts">
  import { engineStore } from '$lib/stores/engineStore.svelte.js';
  import { settingsStore } from '$lib/stores/settingsStore.svelte.js';
  import { applyCategoryFilter } from '$lib/core/pipeline.js';
  import { loadNer, unloadNer } from '$lib/core/nerLoader.js';
  import { loadWebLlm, unloadWebLlm } from '$lib/core/llmLoader.js';
  import { SUPPORTED_WEBLLM_MODELS } from '@de-pii/core';
  import type { EntityCategory } from '@de-pii/core/types';

  const NER_MODEL = 'Xenova/bert-base-multilingual-cased-ner-hrl';

  interface CategoryInfo {
    cat: EntityCategory;
    label: string;
    description: string;
  }

  const CATEGORY_INFO: CategoryInfo[] = [
    {
      cat: 'person',
      label: 'Person',
      description: 'Full names and personal identifiers detected by NER.',
    },
    {
      cat: 'contact',
      label: 'Contact',
      description: 'Email addresses, phone numbers, URLs, and IP addresses.',
    },
    {
      cat: 'address',
      label: 'Address',
      description: 'Postal addresses, street names, cities, and locations (via NER).',
    },
    {
      cat: 'financial',
      label: 'Financial',
      description: 'IBANs, BICs, credit card numbers, tax IDs, and VAT numbers.',
    },
    {
      cat: 'secret',
      label: 'Secrets',
      description: 'API keys, tokens, JWTs, SSH/PGP private keys, and other credential patterns.',
    },
    {
      cat: 'organization',
      label: 'Organization',
      description: 'Company and institution names detected by NER.',
    },
  ];

  function handleCategoryToggle(cat: EntityCategory) {
    settingsStore.toggleCategory(cat);
    applyCategoryFilter([...settingsStore.enabledCategories] as EntityCategory[]);
  }

  async function handleEnableNer() {
    await loadNer();
  }

  async function handleDisableNer() {
    await unloadNer();
  }

  async function handleRetryNer() {
    // Reset error state so loadNer proceeds
    engineStore.setNerStatus('idle');
    await loadNer();
  }

  // ─── WebLLM state ────────────────────────────────────────────────────────
  /** Whether WebGPU is available — inline check avoids pulling the library eagerly. */
  const webgpuSupported = typeof navigator !== 'undefined' && 'gpu' in navigator;

  /** Currently selected model in the picker (may differ from the active loaded model). */
  let selectedModelId = $state(settingsStore.webllmModelId);

  /** Whether a model-change confirmation dialog is pending. */
  let confirmingModelChange = $state(false);
  /** Model id user wants to switch to, waiting for confirmation. */
  let pendingModelId = $state('');

  function handleModelSelect(id: string) {
    if (engineStore.webllm.status === 'ready' && id !== settingsStore.webllmModelId) {
      pendingModelId = id;
      confirmingModelChange = true;
    } else {
      selectedModelId = id;
      settingsStore.setWebllmModelId(id);
    }
  }

  async function confirmModelChange() {
    confirmingModelChange = false;
    selectedModelId = pendingModelId;
    // Unload current model, then load new one
    await unloadWebLlm();
    await loadWebLlm(pendingModelId);
  }

  function cancelModelChange() {
    confirmingModelChange = false;
    pendingModelId = '';
  }

  async function handleEnableWebLlm() {
    await loadWebLlm(selectedModelId);
  }

  async function handleDisableWebLlm() {
    await unloadWebLlm();
  }

  async function handleRetryWebLlm() {
    engineStore.setWebllmStatus('idle');
    await loadWebLlm(selectedModelId);
  }

  // ─── Cache management ────────────────────────────────────────────────────
  let cacheSize = $state<string>('Calculating…');
  let cacheCleared = $state(false);

  async function estimateCacheSize() {
    if (typeof navigator !== 'undefined' && 'storage' in navigator) {
      try {
        const estimate = await navigator.storage.estimate();
        const bytes = estimate.usage ?? 0;
        if (bytes === 0) {
          cacheSize = '0 MB';
        } else if (bytes < 1024 * 1024) {
          cacheSize = `${(bytes / 1024).toFixed(1)} KB`;
        } else {
          cacheSize = `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
        }
      } catch {
        cacheSize = 'N/A';
      }
    } else {
      cacheSize = 'N/A';
    }
  }

  async function handleClearCache() {
    const confirmed = confirm(
      'Damit werden alle gecachten Modelldaten aus deinem Browser gelöscht (NER ~140 MB + ggf. WebLLM-Modell). Fortfahren?'
    );
    if (!confirmed) return;

    if ('caches' in window) {
      try {
        const keys = await caches.keys();
        for (const k of keys) {
          if (k.startsWith('transformers') || k.startsWith('webllm')) {
            await caches.delete(k);
          }
        }
      } catch {
        // Cache API may not be available
      }
    }

    settingsStore.clearNerPreference();
    if (engineStore.ner.status === 'ready') {
      await unloadNer();
    }

    settingsStore.clearWebllmPreference();
    if (engineStore.webllm.status === 'ready') {
      await unloadWebLlm();
    }

    cacheCleared = true;
    await estimateCacheSize();
    setTimeout(() => {
      cacheCleared = false;
    }, 3000);
  }

  // Estimate cache size on mount (browser only)
  $effect(() => {
    estimateCacheSize();
  });
</script>

<div class="mx-auto max-w-2xl space-y-8">
  <h1 class="text-2xl font-bold text-white">Settings</h1>

  <!-- ─── Welchen Modus brauche ich? ─── -->
  <section class="space-y-4" id="mode-guide">
    <div>
      <h2 class="text-lg font-semibold text-white">Welchen Modus brauche ich?</h2>
      <p class="mt-1 text-sm text-slate-400">
        Redactly bietet drei Erkennungsmodi — du kannst sie kombinieren. Hier siehst du auf einen
        Blick, welcher für deinen Anwendungsfall passt.
      </p>
    </div>

    <div class="grid grid-cols-1 gap-4 sm:grid-cols-3">
      <!-- Regex card -->
      <div class="flex flex-col rounded-lg border border-slate-700 bg-slate-900 overflow-hidden">
        <div class="border-b border-slate-700 bg-slate-800 px-4 py-2.5">
          <span class="text-xs font-semibold uppercase tracking-wider text-slate-400">Regex</span>
          <p class="text-sm font-medium text-slate-100 mt-0.5">Immer aktiv</p>
        </div>
        <div class="flex flex-col gap-3 p-4 flex-1">
          <div class="space-y-1 text-xs text-slate-300">
            <p>
              ✅ <span class="font-medium text-slate-200">Erkennt:</span> E-Mails, IBANs,
              Kreditkarten, Telefon, URLs, API-Keys, Tokens, JWTs,
              <code class="font-mono text-slate-400">.env</code>-Werte
            </p>
            <p class="mt-2">
              ⚠️ <span class="font-medium text-slate-200">Erkennt nicht:</span> freie Namen ("Martin"),
              Firmennamen, Adressen ohne festes Muster
            </p>
            <p class="mt-2">
              💾 <span class="font-medium text-slate-200">Download:</span> 0 KB extra — läuft sofort
            </p>
            <p class="mt-2">
              🎯 <span class="font-medium text-slate-200">Ideal für:</span> Code-Snippets, Logs, Configs
              → reicht völlig
            </p>
          </div>
          <div class="mt-auto pt-2">
            <a
              href="#categories"
              class="inline-block rounded-md border border-slate-700 px-3 py-1.5 text-xs font-medium text-slate-300 transition-colors hover:border-slate-500 hover:text-white"
            >
              Konfigurieren ↓
            </a>
          </div>
        </div>
      </div>

      <!-- NER card -->
      <div class="flex flex-col rounded-lg border border-blue-800/60 bg-slate-900 overflow-hidden">
        <div class="border-b border-blue-800/60 bg-blue-950/50 px-4 py-2.5">
          <span class="text-xs font-semibold uppercase tracking-wider text-blue-400">NER</span>
          <p class="text-sm font-medium text-slate-100 mt-0.5">Named Entity Recognition</p>
        </div>
        <div class="flex flex-col gap-3 p-4 flex-1">
          <div class="space-y-1 text-xs text-slate-300">
            <p>
              ✅ <span class="font-medium text-slate-200">Erkennt zusätzlich:</span> freie Personennamen,
              Firmen, Orte auf Deutsch und Englisch
            </p>
            <p class="mt-2">
              ⚠️ <span class="font-medium text-slate-200">Tradeoffs:</span> einmaliger ~140 MB Download,
              ca. 1–3 Sek. pro Analyse auf normaler Hardware
            </p>
            <p class="mt-2">
              💾 <span class="font-medium text-slate-200">Cache:</span> nach dem ersten Download offline-fähig,
              bleibt im Browser
            </p>
            <p class="mt-2">
              🎯 <span class="font-medium text-slate-200">Ideal für:</span> E-Mails, Briefe, freie Texte
              → einschalten
            </p>
          </div>
          <div class="mt-auto pt-2">
            <a
              href="#ner"
              class="inline-block rounded-md border border-blue-700/60 px-3 py-1.5 text-xs font-medium text-blue-300 transition-colors hover:border-blue-500 hover:text-blue-200"
            >
              Konfigurieren ↓
            </a>
          </div>
        </div>
      </div>

      <!-- WebLLM card -->
      <div
        class="flex flex-col rounded-lg border border-purple-800/60 bg-slate-900 overflow-hidden"
      >
        <div class="border-b border-purple-800/60 bg-purple-950/40 px-4 py-2.5">
          <span class="text-xs font-semibold uppercase tracking-wider text-purple-400">WebLLM</span>
          <p class="text-sm font-medium text-slate-100 mt-0.5">Experimentell</p>
        </div>
        <div class="flex flex-col gap-3 p-4 flex-1">
          <div class="space-y-1 text-xs text-slate-300">
            <p>
              ✅ <span class="font-medium text-slate-200">Erkennt zusätzlich:</span> kontextuelle Fälle
              ("mein Chef Martin" → maskiert "Chef" + "Martin"), versteht Beziehungen, fängt kreative
              Edge-Cases
            </p>
            <p class="mt-2">
              ⚠️ <span class="font-medium text-slate-200">Tradeoffs:</span> GB-Download, braucht WebGPU
              (Chrome/Edge Desktop — kein Safari, kein Firefox), 5–30 Sek. pro Analyse
            </p>
            <p class="mt-2">
              💾 <span class="font-medium text-slate-200">Cache:</span> WebLLM speichert im IndexedDB,
              bleibt im Browser
            </p>
            <p class="mt-2">
              🎯 <span class="font-medium text-slate-200">Ideal für:</span> sehr sensible oder komplexe
              Dokumente ohne Zeit-Constraints
            </p>
          </div>
          <div class="mt-auto pt-2">
            <a
              href="#webllm"
              class="inline-block rounded-md border border-purple-700/60 px-3 py-1.5 text-xs font-medium text-purple-300 transition-colors hover:border-purple-500 hover:text-purple-200"
            >
              Konfigurieren ↓
            </a>
          </div>
        </div>
      </div>
    </div>
  </section>

  <!-- ─── Detection Categories ─── -->
  <section class="space-y-4" id="categories">
    <div>
      <h2 class="text-lg font-semibold text-white">Detection Categories</h2>
      <p class="mt-1 text-sm text-slate-400">
        Choose which types of sensitive data to detect and mask. All categories are enabled by
        default.
      </p>
    </div>

    <div class="divide-y divide-slate-800 rounded-lg border border-slate-800 bg-slate-900">
      {#each CATEGORY_INFO as info (info.cat)}
        {@const enabled = settingsStore.enabledCategories.has(info.cat)}
        <label
          class="flex cursor-pointer items-start gap-4 px-4 py-3 transition-colors hover:bg-slate-800/50"
        >
          <!-- Toggle switch -->
          <div class="mt-0.5 shrink-0">
            <button
              type="button"
              role="switch"
              aria-checked={enabled}
              aria-label={`${enabled ? 'Disable' : 'Enable'} ${info.label} detection`}
              onclick={() => handleCategoryToggle(info.cat)}
              class={[
                'relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:ring-2 focus:ring-violet-500 focus:ring-offset-2 focus:ring-offset-slate-900 focus:outline-none',
                enabled ? 'bg-violet-600' : 'bg-slate-700',
              ].join(' ')}
            >
              <span
                class={[
                  'inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform',
                  enabled ? 'translate-x-4.5' : 'translate-x-0.5',
                ].join(' ')}
              ></span>
            </button>
          </div>
          <!-- Info -->
          <div class="flex-1 min-w-0">
            <span class="block text-sm font-medium text-slate-100">{info.label}</span>
            <span class="block text-xs text-slate-400">{info.description}</span>
          </div>
        </label>
      {/each}
    </div>
  </section>

  <!-- ─── NER ─── -->
  <section class="space-y-4" id="ner">
    <div>
      <h2 class="text-lg font-semibold text-white">Named Entity Recognition (NER)</h2>
      <p class="mt-1 text-sm text-slate-400">
        Detects names, organisations, and locations even when they don't follow a predictable
        pattern. Uses a multilingual BERT model (~140 MB download, runs locally in your browser,
        cached for future sessions).
      </p>
    </div>

    <div class="rounded-lg border border-slate-800 bg-slate-900 p-4 space-y-4">
      <!-- Model info -->
      <div class="flex items-center gap-2 text-xs text-slate-500">
        <svg class="h-3.5 w-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
        <span>Model: <code class="font-mono">{NER_MODEL}</code></span>
      </div>
      <p class="text-xs text-slate-500">
        The model is fetched from HuggingFace once and cached locally by your browser. It never
        processes data server-side — all inference runs in-browser via WebAssembly.
      </p>

      <!-- Status display -->
      {#if engineStore.ner.status === 'idle'}
        <div class="flex items-center justify-between">
          <span class="text-sm text-slate-400"
            >Status: <span class="text-slate-300">Not loaded</span></span
          >
          <button
            onclick={handleEnableNer}
            class="rounded-md bg-violet-600 px-4 py-1.5 text-sm font-medium text-white transition-colors hover:bg-violet-500 focus:ring-2 focus:ring-violet-500 focus:ring-offset-2 focus:ring-offset-slate-900 focus:outline-none"
          >
            Enable NER
          </button>
        </div>
      {:else if engineStore.ner.status === 'loading'}
        <div class="space-y-2">
          <div class="flex items-center justify-between">
            <span class="text-sm text-slate-400">
              Status: <span class="text-blue-400">Loading…</span>
            </span>
            <button
              disabled
              class="cursor-not-allowed rounded-md bg-slate-700 px-4 py-1.5 text-sm font-medium text-slate-500"
              title="Cannot cancel — model loading in progress"
            >
              Loading…
            </button>
          </div>
          <div class="space-y-1">
            <div class="flex justify-between text-xs text-slate-500">
              <span>{engineStore.ner.message || 'Initializing…'}</span>
              <span>{Math.round(engineStore.ner.progress * 100)}%</span>
            </div>
            <div class="h-1.5 w-full overflow-hidden rounded-full bg-slate-700">
              <div
                class="h-full rounded-full bg-blue-500 transition-all duration-300"
                style="width: {Math.round(engineStore.ner.progress * 100)}%"
              ></div>
            </div>
          </div>
        </div>
      {:else if engineStore.ner.status === 'ready'}
        <div class="flex items-center justify-between">
          <span class="text-sm text-slate-400">
            Status:
            <span class="inline-flex items-center gap-1 text-emerald-400">
              <svg class="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fill-rule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                  clip-rule="evenodd"
                />
              </svg>
              NER enabled
            </span>
          </span>
          <button
            onclick={handleDisableNer}
            class="rounded-md border border-slate-700 px-4 py-1.5 text-sm font-medium text-slate-300 transition-colors hover:border-red-700 hover:text-red-400 focus:ring-2 focus:ring-slate-500 focus:ring-offset-2 focus:ring-offset-slate-900 focus:outline-none"
          >
            Disable
          </button>
        </div>
      {:else if engineStore.ner.status === 'error'}
        <div class="space-y-2">
          <div class="flex items-center justify-between">
            <span class="text-sm text-red-400">
              Error: {engineStore.ner.message || 'Failed to load NER model'}
            </span>
            <button
              onclick={handleRetryNer}
              class="rounded-md bg-slate-700 px-4 py-1.5 text-sm font-medium text-slate-200 transition-colors hover:bg-slate-600 focus:ring-2 focus:ring-slate-500 focus:ring-offset-2 focus:ring-offset-slate-900 focus:outline-none"
            >
              Retry
            </button>
          </div>
          <p class="text-xs text-slate-500">
            Regex detection remains active. Check your internet connection and try again.
          </p>
        </div>
      {/if}
    </div>
  </section>

  <!-- ─── WebLLM ─── -->
  <section class="space-y-4" id="webllm">
    <div>
      <h2 class="text-lg font-semibold text-white">
        WebLLM <span
          class="ml-1 text-xs font-normal text-purple-400 border border-purple-700/60 rounded px-1.5 py-0.5"
          >experimentell</span
        >
      </h2>
      <p class="mt-1 text-sm text-slate-400">
        Führt ein lokales Sprachmodell direkt in deinem Browser aus (WebGPU) für kontextbewusste
        PII-Erkennung. Erkennt auch indirekte Hinweise auf Personen und Beziehungen.
      </p>
    </div>

    {#if !webgpuSupported}
      <!-- WebGPU not available -->
      <div class="rounded-lg border border-red-800/60 bg-red-950/30 p-4 space-y-2">
        <div class="flex items-start gap-2">
          <svg class="h-4 w-4 mt-0.5 shrink-0 text-red-400" fill="currentColor" viewBox="0 0 20 20">
            <path
              fill-rule="evenodd"
              d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
              clip-rule="evenodd"
            />
          </svg>
          <p class="text-sm text-red-300">
            WebGPU nicht verfügbar in diesem Browser. Probier es mit aktueller Chrome- oder
            Edge-Desktop-Version. Safari und Firefox werden noch nicht offiziell unterstützt.
          </p>
        </div>
      </div>

      <!-- Controls disabled -->
      <div
        class="rounded-lg border border-slate-800/50 bg-slate-900/50 p-4 space-y-4 opacity-50 pointer-events-none"
      >
        <p class="text-sm text-slate-500">WebLLM ist in diesem Browser nicht verfügbar.</p>
      </div>
    {:else}
      <!-- WebGPU available -->
      <div class="rounded-lg border border-slate-800 bg-slate-900 p-4 space-y-5">
        <!-- Model picker -->
        <div class="space-y-2">
          <h3 class="text-sm font-medium text-slate-200">Modell auswählen</h3>
          <div class="space-y-2">
            {#each SUPPORTED_WEBLLM_MODELS as model (model.id)}
              {@const isSelected = selectedModelId === model.id}
              {@const isActive =
                engineStore.webllm.status === 'ready' && settingsStore.webllmModelId === model.id}
              {@const isLoading = engineStore.webllm.status === 'loading'}
              <button
                type="button"
                onclick={() => handleModelSelect(model.id)}
                disabled={isLoading}
                class={[
                  'w-full text-left rounded-lg border p-3 transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-1 focus:ring-offset-slate-900',
                  isSelected
                    ? 'border-purple-600 bg-purple-950/40'
                    : 'border-slate-700 bg-slate-800/50 hover:border-slate-600',
                  isLoading ? 'cursor-not-allowed opacity-60' : 'cursor-pointer',
                ].join(' ')}
              >
                <div class="flex items-start justify-between gap-2">
                  <div class="flex-1 min-w-0">
                    <div class="flex items-center gap-2 flex-wrap">
                      <span class="text-sm font-medium text-slate-100">{model.label}</span>
                      {#if model.recommendedFor === 'balanced'}
                        <span
                          class="text-xs bg-purple-700/60 text-purple-200 px-1.5 py-0.5 rounded font-medium"
                          >Empfohlen</span
                        >
                      {:else if model.recommendedFor === 'fast'}
                        <span
                          class="text-xs bg-slate-700 text-slate-300 px-1.5 py-0.5 rounded font-medium"
                          >Schnell</span
                        >
                      {:else if model.recommendedFor === 'best'}
                        <span
                          class="text-xs bg-amber-800/60 text-amber-300 px-1.5 py-0.5 rounded font-medium"
                          >Präzise</span
                        >
                      {/if}
                      {#if isActive}
                        <span
                          class="text-xs bg-emerald-800/60 text-emerald-300 px-1.5 py-0.5 rounded font-medium"
                          >Aktiv</span
                        >
                      {/if}
                    </div>
                    <p class="mt-1 text-xs text-slate-400">{model.description}</p>
                    <div class="mt-1.5 flex gap-3 text-xs text-slate-500">
                      <span
                        >Download ~{model.sizeMB >= 1000
                          ? `${(model.sizeMB / 1000).toFixed(1)} GB`
                          : `${model.sizeMB} MB`}</span
                      >
                      <span
                        >VRAM ~{model.vramMB >= 1000
                          ? `${(model.vramMB / 1000).toFixed(1)} GB`
                          : `${model.vramMB} MB`}</span
                      >
                    </div>
                  </div>
                  <!-- Radio indicator -->
                  <div
                    class={[
                      'mt-0.5 h-4 w-4 shrink-0 rounded-full border-2 transition-colors',
                      isSelected
                        ? 'border-purple-500 bg-purple-500'
                        : 'border-slate-600 bg-transparent',
                    ].join(' ')}
                  ></div>
                </div>
              </button>
            {/each}
          </div>
        </div>

        <!-- Status + actions -->
        {#if engineStore.webllm.status === 'idle'}
          <div class="flex items-center justify-between">
            <span class="text-sm text-slate-400"
              >Status: <span class="text-slate-300">Nicht geladen</span></span
            >
            <button
              onclick={handleEnableWebLlm}
              class="rounded-md bg-purple-600 px-4 py-1.5 text-sm font-medium text-white transition-colors hover:bg-purple-500 focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 focus:ring-offset-slate-900 focus:outline-none"
            >
              Aktivieren
            </button>
          </div>
        {:else if engineStore.webllm.status === 'loading'}
          <div class="space-y-2">
            <div class="flex items-center justify-between">
              <span class="text-sm text-slate-400">
                Status: <span class="text-purple-400">Lädt…</span>
              </span>
              <button
                disabled
                class="cursor-not-allowed rounded-md bg-slate-700 px-4 py-1.5 text-sm font-medium text-slate-500"
                title="Laden läuft — bitte warten"
              >
                Lädt…
              </button>
            </div>
            <div class="space-y-1">
              <div class="flex justify-between text-xs text-slate-500">
                <span>{engineStore.webllm.message || 'Initialisiere…'}</span>
                <span>{Math.round(engineStore.webllm.progress * 100)}%</span>
              </div>
              <div class="h-1.5 w-full overflow-hidden rounded-full bg-slate-700">
                <div
                  class="h-full rounded-full bg-purple-500 transition-all duration-300"
                  style="width: {Math.round(engineStore.webllm.progress * 100)}%"
                ></div>
              </div>
            </div>
          </div>
        {:else if engineStore.webllm.status === 'ready'}
          <div class="flex items-center justify-between">
            <span class="text-sm text-slate-400">
              Status:
              <span class="inline-flex items-center gap-1 text-emerald-400">
                <svg class="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fill-rule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                    clip-rule="evenodd"
                  />
                </svg>
                WebLLM aktiv
              </span>
            </span>
            <div class="flex items-center gap-2">
              <code
                class="text-xs font-mono text-purple-400 border border-purple-800/50 rounded px-1.5 py-0.5"
                >{settingsStore.webllmModelId}</code
              >
              <button
                onclick={handleDisableWebLlm}
                class="rounded-md border border-slate-700 px-4 py-1.5 text-sm font-medium text-slate-300 transition-colors hover:border-red-700 hover:text-red-400 focus:ring-2 focus:ring-slate-500 focus:ring-offset-2 focus:ring-offset-slate-900 focus:outline-none"
              >
                Deaktivieren
              </button>
            </div>
          </div>
        {:else if engineStore.webllm.status === 'error'}
          <div class="space-y-2">
            <div class="flex items-center justify-between">
              <span class="text-sm text-red-400">
                Fehler: {engineStore.webllm.message || 'WebLLM konnte nicht geladen werden'}
              </span>
              <button
                onclick={handleRetryWebLlm}
                class="rounded-md bg-slate-700 px-4 py-1.5 text-sm font-medium text-slate-200 transition-colors hover:bg-slate-600 focus:ring-2 focus:ring-slate-500 focus:ring-offset-2 focus:ring-offset-slate-900 focus:outline-none"
              >
                Erneut versuchen
              </button>
            </div>
            <p class="text-xs text-slate-500">
              Regex-Erkennung bleibt aktiv. Prüfe deine Internetverbindung und versuche es erneut.
            </p>
          </div>
        {/if}

        <!-- Persistence note -->
        <div
          class="rounded-md border border-slate-700/50 bg-slate-800/50 p-3 text-xs text-slate-400 space-y-1"
        >
          <p>
            <span class="font-medium text-slate-300">Persistenz:</span>
            Das heruntergeladene Modell bleibt in deinem Browser gespeichert (IndexedDB). Es wird nicht
            erneut geladen wenn du die Seite neu öffnest. Du kannst es jederzeit unter "Cache verwalten"
            löschen.
          </p>
        </div>
      </div>
    {/if}
  </section>

  <!-- ─── Model Change Confirmation Dialog ─── -->
  {#if confirmingModelChange}
    <div
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-dialog-title"
    >
      <div
        class="mx-4 w-full max-w-sm rounded-lg border border-slate-700 bg-slate-900 p-6 shadow-xl space-y-4"
      >
        <h3 id="confirm-dialog-title" class="text-base font-semibold text-white">
          Modell wechseln?
        </h3>
        <p class="text-sm text-slate-400">
          Das aktuelle Modell wird entladen und das neue heruntergeladen. Das kann einige Minuten
          dauern.
        </p>
        <div class="flex justify-end gap-3">
          <button
            onclick={cancelModelChange}
            class="rounded-md border border-slate-700 px-4 py-1.5 text-sm font-medium text-slate-300 transition-colors hover:border-slate-500 hover:text-white"
          >
            Abbrechen
          </button>
          <button
            onclick={confirmModelChange}
            class="rounded-md bg-purple-600 px-4 py-1.5 text-sm font-medium text-white transition-colors hover:bg-purple-500"
          >
            Wechseln
          </button>
        </div>
      </div>
    </div>
  {/if}

  <!-- ─── Cache Management ─── -->
  <section class="space-y-4">
    <div>
      <h2 class="text-lg font-semibold text-white">Cache verwalten</h2>
      <p class="mt-1 text-sm text-slate-400">
        Modelle werden von deinem Browser gecacht und nur einmal pro Browser-Profil heruntergeladen.
      </p>
    </div>

    <div class="rounded-lg border border-slate-800 bg-slate-900 p-4 space-y-3">
      <div class="flex items-center justify-between text-sm">
        <span class="text-slate-400">
          Ungefähr verwendeter Speicher: <span class="text-slate-200">{cacheSize}</span>
        </span>
        <button
          onclick={handleClearCache}
          class="rounded-md border border-slate-700 px-3 py-1.5 text-sm font-medium text-slate-300 transition-colors hover:border-red-700 hover:text-red-400 focus:ring-2 focus:ring-slate-500 focus:ring-offset-2 focus:ring-offset-slate-900 focus:outline-none"
        >
          Cache löschen
        </button>
      </div>

      {#if cacheCleared}
        <p class="text-xs text-emerald-400">Cache wurde erfolgreich gelöscht.</p>
      {/if}

      <p class="text-xs text-slate-500">
        Beim Löschen des Caches werden alle heruntergeladenen Modellgewichte aus deinem Browser
        entfernt (NER ~140 MB + ggf. WebLLM-Modell). Beim nächsten Aktivieren wird das Modell erneut
        geladen.
      </p>
    </div>
  </section>
</div>
