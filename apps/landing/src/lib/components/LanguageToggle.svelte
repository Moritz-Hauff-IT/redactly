<script lang="ts">
  import { localeStore, t } from '$lib/i18n/locale.svelte.js';
  import { LOCALES } from '$lib/i18n/messages.js';
</script>

<div
  class="inline-flex items-center gap-px overflow-hidden border border-[color:var(--color-line)] font-[family-name:var(--font-mono)] text-[0.65rem] tracking-[0.08em] uppercase"
  role="group"
  aria-label={t('lang_switch_label')}
>
  {#each LOCALES as code}
    <button
      type="button"
      onclick={() => localeStore.set(code)}
      class="px-2 py-1 transition-colors"
      class:bg-current={localeStore.current === code}
      class:text-[color:var(--color-shell)]={localeStore.current === code}
      class:text-[color:var(--color-text-dim)]={localeStore.current !== code}
      class:hover:text-[color:var(--color-signal)]={localeStore.current !== code}
      aria-pressed={localeStore.current === code}
    >
      {code}
    </button>
  {/each}
</div>
