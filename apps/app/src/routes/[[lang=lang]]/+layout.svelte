<script lang="ts">
  import '../../app.css';
  import { setupPdf } from '../../lib/setup/pdf.js';
  import { setupTesseract } from '../../lib/setup/tesseract.js';
  import { setupNer } from '../../lib/setup/ner.js';

  // Run all three setup hooks at module-init. We can't rely on
  // side-effect-only imports (`import './pdf.js'`) because Vite tree-shakes
  // those for app modules — the assignments never reached the deployed
  // bundle, which left transformers.js falling through to its default
  // local-first /models/ path (HTML SPA fallback → JSON parse error).
  setupPdf();
  setupTesseract();
  setupNer();
  import Toast from '$lib/components/Toast.svelte';
  import SettingsDrawer from '$lib/components/SettingsDrawer.svelte';
  import OnboardingHint from '$lib/components/OnboardingHint.svelte';
  import LanguageToggle from '$lib/components/LanguageToggle.svelte';
  import LoadingOverlay from '$lib/components/LoadingOverlay.svelte';
  import { onMount } from 'svelte';
  import { settingsStore } from '$lib/stores/settingsStore.svelte.js';
  import { engineStore } from '$lib/stores/engineStore.svelte.js';
  import { page } from '$app/state';
  import { t } from '$lib/i18n/locale.svelte.js';
  import type { Snippet } from 'svelte';

  // Mirror URL locale onto <html lang> for a11y / browser hints.
  $effect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.lang = page.params.lang === 'en' ? 'en' : 'de';
    }
  });

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
  <!-- Topbar — brand left, privacy chips + controls right -->
  <header class="app-header flex items-center gap-4 px-6 py-3">
    <a href="/" class="flex items-center gap-2.5" aria-label="Redactly">
      <!-- Original Redactly mark — navy tile with three redaction bars -->
      <svg
        width="22"
        height="22"
        viewBox="0 0 100 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
        class="brand-mark flex-shrink-0"
      >
        <rect
          x="0.5"
          y="0.5"
          width="99"
          height="99"
          rx="20"
          fill="#0F172A"
          stroke="rgba(255,255,255,0.12)"
        />
        <rect x="22" y="25.5" width="42" height="11" rx="2.5" fill="#3A475C" />
        <rect x="22" y="44.5" width="57.6" height="11" rx="2.5" fill="#F2960C" />
        <rect x="22" y="63.5" width="27.6" height="11" rx="2.5" fill="#3A475C" />
      </svg>
      <span class="brand-word text-[17px] leading-none">Redactly</span>
    </a>

    <div class="hidden items-center gap-4 lg:flex">
      <span class="hchip"><span class="led"></span>{t('chip_runtime')}</span>
      <span class="hchip">{t('chip_server')}</span>
      <span class="hchip">{t('chip_telemetry')}</span>
    </div>

    <div class="flex-1"></div>

    <div class="flex items-center gap-2.5">
      <span class="pill" title={backendStatus.title}>
        <span class="dot {backendStatus.dot}"></span>
        <span class="hidden sm:inline">{backendStatus.label}</span>
      </span>
      <LanguageToggle />
      <button
        class="btn-icon"
        onclick={() => (drawerOpen = true)}
        title={t('app_settings')}
        aria-label={t('app_settings_open')}
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
    <OnboardingHint onOpenSettings={() => (drawerOpen = true)} />
    {@render children()}
  </main>

  <footer
    class="border-t border-[color:var(--color-rule)] px-9 py-5 font-[family-name:var(--font-mono)] text-[11px] text-[color:var(--color-ink-mute)]"
  >
    <div class="mx-auto flex w-full max-w-[1320px] flex-wrap items-center justify-between gap-3">
      <span>© {new Date().getFullYear()} Moritz Hauff IT · Tägerwilen, Schweiz</span>
      <nav class="flex flex-wrap items-center gap-x-5 gap-y-2">
        <a class="footer-link" href="/legal/impressum">{t('footer_imprint')}</a>
        <a class="footer-link" href="/legal/datenschutz">{t('footer_privacy')}</a>
        <a class="footer-link" href="/legal/terms">{t('footer_terms')}</a>
        <a
          class="footer-link"
          href="https://github.com/moritz-hauff-it/redactly"
          target="_blank"
          rel="noopener noreferrer">github</a
        >
      </nav>
    </div>
  </footer>

  <SettingsDrawer bind:open={drawerOpen} />
  <Toast />
  <LoadingOverlay />
</div>

<style>
  .footer-link {
    color: var(--color-ink-mute);
    text-decoration: none;
    transition: color 0.12s;
  }
  .footer-link:hover {
    color: var(--color-accent);
  }
  /* Top-bar reassurance chips */
  .hchip {
    display: inline-flex;
    align-items: center;
    gap: 7px;
    font-family: var(--font-mono);
    font-size: 11.5px;
    color: var(--color-ink-mute);
  }
  .led {
    width: 7px;
    height: 7px;
    border-radius: 50%;
    background: var(--color-ok);
    box-shadow: 0 0 8px rgba(34, 197, 94, 0.55);
  }
</style>
