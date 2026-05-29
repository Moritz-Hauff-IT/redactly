<script lang="ts">
  import { localeStore, t } from '$lib/i18n/locale.svelte.js';
  import { LOCALES } from '$lib/i18n/messages.js';
</script>

<div
  class="inline-flex items-center gap-px overflow-hidden rounded border border-[color:var(--color-rule)] font-[family-name:var(--font-mono)] text-[10.5px] uppercase"
  role="group"
  aria-label={t('lang_switch_label')}
>
  {#each LOCALES as code}
    <button
      type="button"
      onclick={() => localeStore.set(code)}
      class="px-1.5 py-0.5 transition-colors"
      class:bg-[color:var(--color-ink)]={localeStore.current === code}
      class:text-[color:var(--color-bg)]={localeStore.current === code}
      class:text-[color:var(--color-ink-mute)]={localeStore.current !== code}
      class:hover:text-[color:var(--color-ink)]={localeStore.current !== code}
      aria-pressed={localeStore.current === code}
    >
      {code}
    </button>
  {/each}
</div>
