<script lang="ts">
  import '../../app.css';
  import '../../lib/setup/pdf.js';
  import Toast from '$lib/components/Toast.svelte';
  import SettingsDrawer from '$lib/components/SettingsDrawer.svelte';
  import LanguageToggle from '$lib/components/LanguageToggle.svelte';
  import { onMount } from 'svelte';
  import { settingsStore } from '$lib/stores/settingsStore.svelte.js';
  import { engineStore } from '$lib/stores/engineStore.svelte.js';
  import type { Snippet } from 'svelte';

  interface Props {
    children: Snippet;
  }

  const { children }: Props = $props();

  let drawerOpen = $state(false);

  onMount(() => {
    // Diagnostic dump on every mount so we can see WHY a detector is/isn't loading.

    console.log('[auto-load] mount', {
      nerEnabled: settingsStore.nerEnabled,
      webllmEnabled: settingsStore.webllmEnabled,
      webllmModelId: settingsStore.webllmModelId,
      hasNavigator: typeof navigator !== 'undefined',
      hasWebGPU: typeof navigator !== 'undefined' && 'gpu' in navigator,
    });

    if (settingsStore.nerEnabled) {
      console.log('[auto-load] starting NER…');
      import('$lib/core/nerLoader.js').then(({ loadNer }) => {
        loadNer().catch((err: unknown) => {
          console.error('Auto NER load failed:', err);
        });
      });
    } else {
      console.log('[auto-load] NER skipped (not enabled in settings)');
    }

    if (settingsStore.webllmEnabled && typeof navigator !== 'undefined' && 'gpu' in navigator) {
      const modelId = settingsStore.webllmModelId;

      console.log('[auto-load] starting WebLLM…', { modelId });
      import('$lib/core/llmLoader.js').then(({ loadWebLlm }) => {
        loadWebLlm(modelId).catch((err: unknown) => {
          console.error('Auto WebLLM load failed:', err);
        });
      });
    } else {
      console.log('[auto-load] WebLLM skipped', {
        webllmEnabled: settingsStore.webllmEnabled,
        hasWebGPU: typeof navigator !== 'undefined' && 'gpu' in navigator,
        reason: !settingsStore.webllmEnabled
          ? 'webllmEnabled is false in settings/localStorage'
          : 'navigator.gpu not available (no WebGPU support)',
      });
    }
  });

  // Backend pill computed from NER + WebLLM engine states.
  const backendStatus = $derived.by(() => {
    const ner = engineStore.ner.status;
    const llm = engineStore.webllm.status;
    if (ner === 'loading' || llm === 'loading') {
      const which = ner === 'loading' ? 'NER' : 'WebLLM';
      return { dot: 'loading', label: `lädt ${which}…`, title: which };
    }
    if (ner === 'error' || llm === 'error') {
      return { dot: 'error', label: 'fehler', title: 'Detektor-Fehler' };
    }
    if (ner === 'ready' && llm === 'ready') {
      return { dot: 'online', label: 'regex + NER + WebLLM', title: 'Alle Modi aktiv' };
    }
    if (ner === 'ready') {
      return { dot: 'online', label: 'regex + NER', title: 'NER aktiv' };
    }
    if (llm === 'ready') {
      return { dot: 'online', label: 'regex + WebLLM', title: 'WebLLM aktiv' };
    }
    return { dot: 'online', label: 'regex only', title: 'Nur Regex aktiv' };
  });
</script>

<div class="flex min-h-screen flex-col">
  <!-- Topbar — brand on left, status + settings on right -->
  <header
    class="flex items-baseline justify-between border-b border-[color:var(--color-rule)] px-9 pt-5 pb-4"
  >
    <a href="/" class="flex items-baseline gap-3.5">
      <span
        class="font-[family-name:var(--font-serif)] text-[22px] leading-none font-medium tracking-[-0.01em] text-[color:var(--color-ink)]"
      >
        Redactly
      </span>
      <span class="text-[color:var(--color-rule-strong)]">·</span>
      <span
        class="font-[family-name:var(--font-mono)] text-[11px] tracking-[0.02em] text-[color:var(--color-ink-mute)]"
      >
        local redaction · läuft in deinem Browser
      </span>
    </a>

    <div class="flex items-center gap-2.5">
      <span class="pill" title={backendStatus.title}>
        <span class="dot {backendStatus.dot}"></span>
        <span>{backendStatus.label}</span>
      </span>
      <LanguageToggle />
      <button
        class="btn-icon"
        onclick={() => (drawerOpen = true)}
        title="Einstellungen"
        aria-label="Einstellungen öffnen"
      >
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="1.6"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <circle cx="12" cy="12" r="3" />
          <path
            d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09a1.65 1.65 0 00-1-1.51 1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09a1.65 1.65 0 001.51-1 1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z"
          />
        </svg>
      </button>
    </div>
  </header>

  <main class="mx-auto w-full max-w-[1320px] flex-1 px-9 pt-6 pb-16">
    {@render children()}
  </main>

  <SettingsDrawer bind:open={drawerOpen} />
  <Toast />
</div>
