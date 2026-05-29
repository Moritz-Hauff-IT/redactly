<script lang="ts">
  import { page } from '$app/state';
  import { currentLocale, switchLocaleHref, t } from '$lib/i18n/locale.svelte.js';
  import { LOCALES } from '$lib/i18n/messages.js';
</script>

<div
  class="inline-flex items-center gap-px overflow-hidden rounded border border-[color:var(--color-rule)] font-[family-name:var(--font-mono)] text-[10.5px] uppercase"
  role="group"
  aria-label={t('lang_switch_label')}
>
  {#each LOCALES as code}
    {@const isActive = currentLocale() === code}
    <a
      href={switchLocaleHref(page.url.pathname, code)}
      class="px-1.5 py-0.5 transition-colors"
      class:bg-[color:var(--color-ink)]={isActive}
      class:text-[color:var(--color-bg)]={isActive}
      class:text-[color:var(--color-ink-mute)]={!isActive}
      class:hover:text-[color:var(--color-ink)]={!isActive}
      aria-current={isActive ? 'page' : undefined}
      hreflang={code}
    >
      {code}
    </a>
  {/each}
</div>
