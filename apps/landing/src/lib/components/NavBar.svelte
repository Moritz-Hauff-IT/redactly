<script lang="ts">
  import { APP_URL } from '$lib/env';
  import { localizedHref, t } from '$lib/i18n/locale.svelte.js';
  import LanguageToggle from './LanguageToggle.svelte';

  let menuOpen = $state(false);

  const navLinks = $derived([
    { href: localizedHref('/features'), label: t('nav_features') },
    { href: localizedHref('/docs'), label: t('nav_docs') },
    { href: localizedHref('/privacy'), label: t('nav_privacy') },
    { href: localizedHref('/faq'), label: t('nav_faq') },
    { href: localizedHref('/blog'), label: t('nav_log') },
  ]);
</script>

<!-- Top status strip — always visible, signals the operational nature -->
<div
  class="relative z-20 border-b border-[color:var(--color-line)] bg-[color:var(--color-shell-sunken)]"
>
  <div
    class="mx-auto flex max-w-7xl items-center justify-between px-5 py-1.5 font-[family-name:var(--font-mono)] text-[0.625rem] tracking-[0.18em] uppercase sm:px-8"
  >
    <span class="text-[color:var(--color-text-mute)]">SYS://redactly</span>
    <div class="hidden items-center gap-5 sm:flex">
      <span class="status-row text-[color:var(--color-ok)]">
        <span class="status-dot"></span>
        {t('nav_status_client')}
      </span>
      <span class="status-row text-[color:var(--color-text-dim)]">
        <span class="h-1.5 w-1.5 bg-[color:var(--color-text-mute)]"></span>
        {t('nav_status_no_telemetry')}
      </span>
      <span class="status-row text-[color:var(--color-text-dim)]">
        <span class="h-1.5 w-1.5 bg-[color:var(--color-text-mute)]"></span>
        {t('nav_status_license')}
      </span>
      <LanguageToggle />
    </div>
    <span class="text-[color:var(--color-text-mute)]">v0.1.0-alpha</span>
  </div>
</div>

<header
  class="sticky top-0 z-10 border-b border-[color:var(--color-line)] bg-[color:var(--color-shell)]/95 backdrop-blur"
>
  <nav class="mx-auto flex max-w-7xl items-center justify-between px-5 py-4 sm:px-8">
    <!-- Wordmark with ASCII-bar redaction -->
    <a
      href={localizedHref('/')}
      class="group flex items-center gap-2 font-[family-name:var(--font-mono)] text-[1.05rem] font-bold tracking-tight text-[color:var(--color-text)]"
    >
      <span class="text-[color:var(--color-signal)]">█</span>
      <span class="transition-colors group-hover:text-[color:var(--color-signal)]">redactly</span>
      <span class="text-[color:var(--color-text-mute)]">.dev</span>
    </a>

    <!-- Desktop nav -->
    <ul class="hidden items-center gap-6 md:flex">
      {#each navLinks as link}
        <li>
          <a
            href={link.href}
            class="font-[family-name:var(--font-mono)] text-[0.75rem] tracking-[0.04em] uppercase text-[color:var(--color-text-dim)] transition-colors hover:text-[color:var(--color-signal)]"
          >
            {link.label}
          </a>
        </li>
      {/each}
    </ul>

    <!-- CTA -->
    <div class="hidden md:block">
      <a
        href={APP_URL}
        class="group inline-flex items-center gap-2 border border-[color:var(--color-signal)] bg-[color:var(--color-signal-soft)] px-4 py-2 font-[family-name:var(--font-mono)] text-[0.75rem] tracking-[0.08em] uppercase text-[color:var(--color-signal)] transition-all hover:bg-[color:var(--color-signal)] hover:text-[color:var(--color-shell)]"
      >
        <span aria-hidden="true">$</span>
        {t('nav_cta_run')}
        <span class="transition-transform group-hover:translate-x-0.5" aria-hidden="true">→</span>
      </a>
    </div>

    <!-- Mobile menu button -->
    <button
      class="flex flex-col gap-1.5 p-2 md:hidden"
      onclick={() => (menuOpen = !menuOpen)}
      aria-label={t('nav_menu_open')}
      aria-expanded={menuOpen}
    >
      <span
        class="block h-0.5 w-6 bg-[color:var(--color-text)] transition-transform"
        class:rotate-45={menuOpen}
        class:translate-y-2={menuOpen}
      ></span>
      <span
        class="block h-0.5 w-6 bg-[color:var(--color-text)] transition-opacity"
        class:opacity-0={menuOpen}
      ></span>
      <span
        class="block h-0.5 w-6 bg-[color:var(--color-text)] transition-transform"
        class:-rotate-45={menuOpen}
        class:-translate-y-2={menuOpen}
      ></span>
    </button>
  </nav>

  <!-- Mobile menu -->
  {#if menuOpen}
    <div
      class="border-t border-[color:var(--color-line)] bg-[color:var(--color-shell-raised)] px-5 pb-6 md:hidden"
    >
      <ul class="flex flex-col gap-4 pt-4">
        {#each navLinks as link}
          <li>
            <a
              href={link.href}
              class="block font-[family-name:var(--font-mono)] text-sm tracking-[0.04em] uppercase text-[color:var(--color-text-dim)] hover:text-[color:var(--color-signal)]"
              onclick={() => (menuOpen = false)}
            >
              {link.label}
            </a>
          </li>
        {/each}
        <li class="mt-2">
          <a
            href={APP_URL}
            class="inline-flex items-center gap-2 border border-[color:var(--color-signal)] bg-[color:var(--color-signal-soft)] px-4 py-2 font-[family-name:var(--font-mono)] text-xs tracking-[0.08em] uppercase text-[color:var(--color-signal)]"
          >
            <span aria-hidden="true">$</span>
            {t('nav_cta_run')}
            <span aria-hidden="true">→</span>
          </a>
        </li>
        <li class="pt-2">
          <LanguageToggle />
        </li>
      </ul>
    </div>
  {/if}
</header>
