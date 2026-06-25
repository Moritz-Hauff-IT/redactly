<script lang="ts">
  import { networkAuditStore } from '$lib/stores/networkAuditStore.svelte.js';
  import { t } from '$lib/i18n/locale.svelte.js';

  let open = $state(false);
  let rootEl = $state<HTMLElement | null>(null);
  const safe = $derived(networkAuditStore.uploads === 0);

  function kindLabel(kind: 'same-origin' | 'model' | 'other'): string {
    if (kind === 'model') return t('net_kind_model');
    if (kind === 'same-origin') return t('net_kind_same');
    return t('net_kind_other');
  }

  function onWindowClick(e: MouseEvent): void {
    if (open && rootEl && !rootEl.contains(e.target as Node)) open = false;
  }
</script>

<svelte:window onclick={onWindowClick} />

<div class="na-wrap" bind:this={rootEl}>
  <button
    class="na-pill"
    class:warn={!safe}
    onclick={() => (open = !open)}
    title={t('net_title')}
    aria-expanded={open}
  >
    <svg
      width="13"
      height="13"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
      aria-hidden="true"
    >
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" />
      {#if safe}<path d="m9 12 2 2 4-4" />{:else}<path d="M12 8v4M12 16h.01" />{/if}
    </svg>
    <span class="hidden sm:inline">{t('net_uploads', { n: networkAuditStore.uploads })}</span>
  </button>

  {#if open}
    <div class="na-pop">
      <p class="na-head" class:ok={safe} class:bad={!safe}>
        {safe ? `🔒 ${t('net_safe')}` : `⚠ ${t('net_uploads', { n: networkAuditStore.uploads })}`}
      </p>
      <p class="na-intro">{t('net_intro')}</p>
      <p class="na-stat">
        {t('net_downloads', { n: networkAuditStore.total - networkAuditStore.uploads })} ·
        {t('net_uploads', { n: networkAuditStore.uploads })}
      </p>
      {#if networkAuditStore.hosts.length === 0}
        <p class="na-empty">{t('net_none')}</p>
      {:else}
        <ul class="na-list">
          {#each networkAuditStore.hosts as h (h.host)}
            <li class="na-row" class:bad={h.kind === 'other'}>
              <span class="na-host">{h.host}</span>
              <span class="na-kind">{kindLabel(h.kind)}</span>
              <span class="na-count">{h.count}</span>
            </li>
          {/each}
        </ul>
      {/if}
    </div>
  {/if}
</div>

<style>
  .na-wrap {
    position: relative;
  }
  .na-pill {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 4px 9px;
    border: 1px solid var(--color-rule-strong);
    border-radius: 999px;
    background: var(--color-bg-elev);
    color: var(--color-ok);
    font-size: 11.5px;
    cursor: pointer;
    transition: border-color 0.14s;
  }
  .na-pill:hover {
    border-color: var(--color-ok);
  }
  .na-pill.warn {
    color: var(--color-danger);
    border-color: var(--color-danger);
  }
  .na-pop {
    position: absolute;
    right: 0;
    top: calc(100% + 8px);
    z-index: 50;
    width: min(360px, calc(100vw - 2rem));
    padding: 14px;
    border: 1px solid var(--color-rule-strong);
    border-radius: 10px;
    background: var(--color-bg-elev);
    box-shadow: 0 18px 44px rgba(0, 0, 0, 0.4);
  }
  .na-head {
    font-size: 13px;
    font-weight: 600;
  }
  .na-head.ok {
    color: var(--color-ok);
  }
  .na-head.bad {
    color: var(--color-danger);
  }
  .na-intro {
    margin-top: 4px;
    font-size: 11.5px;
    line-height: 1.5;
    color: var(--color-ink-soft);
  }
  .na-stat {
    margin-top: 8px;
    font-family: var(--font-mono);
    font-size: 11px;
    color: var(--color-ink-mute);
  }
  .na-empty {
    margin-top: 8px;
    font-size: 11.5px;
    color: var(--color-ink-mute);
  }
  .na-list {
    margin-top: 8px;
    max-height: 220px;
    overflow-y: auto;
    border-top: 1px solid var(--color-rule);
  }
  .na-row {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 5px 0;
    border-bottom: 1px solid var(--color-rule);
    font-size: 11px;
  }
  .na-host {
    flex: 1;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-family: var(--font-mono);
    color: var(--color-ink);
  }
  .na-kind {
    flex-shrink: 0;
    color: var(--color-ink-mute);
  }
  .na-row.bad .na-kind {
    color: var(--color-danger);
  }
  .na-count {
    flex-shrink: 0;
    width: 28px;
    text-align: right;
    font-family: var(--font-mono);
    color: var(--color-ink-mute);
  }
</style>
