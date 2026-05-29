<script lang="ts">
  import { page } from '$app/state';
  import { currentLocale, switchLocaleHref, t } from '$lib/i18n/locale.svelte.js';
  import { LOCALES } from '$lib/i18n/messages.js';
</script>

<div
  class="inline-flex items-center gap-px overflow-hidden border border-[color:var(--color-line)] font-[family-name:var(--font-mono)] text-[0.65rem] tracking-[0.08em] uppercase"
  role="group"
  aria-label={t('lang_switch_label')}
>
  {#each LOCALES as code}
    {@const isActive = currentLocale() === code}
    <a
      href={switchLocaleHref(page.url.pathname, code)}
      class="px-2 py-1 transition-colors"
      class:bg-[color:var(--color-text)]={isActive}
      class:text-[color:var(--color-shell)]={isActive}
      class:text-[color:var(--color-text-dim)]={!isActive}
      class:hover:text-[color:var(--color-signal)]={!isActive}
      aria-current={isActive ? 'page' : undefined}
      hreflang={code}
    >
      {code}
    </a>
  {/each}
</div>
