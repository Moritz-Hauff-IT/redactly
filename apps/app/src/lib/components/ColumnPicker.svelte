<script lang="ts">
  import { untrack } from 'svelte';
  import type { TableColumn } from '@redactly/core/structural';
  import { t } from '$lib/i18n/locale.svelte.js';

  interface Props {
    open: boolean;
    filename: string;
    columns: TableColumn[];
    /** Refs selected when the dialog opens. */
    initial: string[];
    onapply: (refs: string[]) => void;
    oncancel: () => void;
  }
  let { open, filename, columns, initial, onapply, oncancel }: Props = $props();

  let selected = $state<Set<string>>(new Set());

  // Re-seed the local selection each time the dialog opens (keyed on `open`
  // only — untrack `initial` so toggling inside the dialog isn't reset by an
  // unrelated parent re-render).
  $effect(() => {
    if (open) selected = new Set(untrack(() => initial));
  });

  function toggle(ref: string): void {
    const next = new Set(selected);
    if (next.has(ref)) next.delete(ref);
    else next.add(ref);
    selected = next;
  }

  function sample(col: TableColumn): string {
    const vals = col.values.slice(0, 2).map((v) => (v.length > 24 ? `${v.slice(0, 24)}…` : v));
    return vals.join(', ');
  }

  function onKeydown(e: KeyboardEvent): void {
    if (!open) return;
    if (e.key === 'Escape') oncancel();
  }
</script>

<svelte:window onkeydown={onKeydown} />

{#if open}
  <button class="cp-backdrop" aria-label={t('col_skip')} onclick={oncancel}></button>
  <div class="cp-dialog" role="dialog" aria-modal="true" aria-labelledby="cp-title">
    <h2
      id="cp-title"
      class="font-[family-name:var(--font-serif)] text-[17px] leading-none font-medium text-[color:var(--color-ink)]"
    >
      {t('col_title')}
    </h2>
    <p class="mt-2 text-[12.5px] leading-snug text-[color:var(--color-ink-soft)]">
      {t('col_intro', { file: filename })}
    </p>

    <div class="cp-list mt-4">
      {#each columns as col (col.ref)}
        {@const on = selected.has(col.ref)}
        <button class="cp-row" class:on type="button" onclick={() => toggle(col.ref)}>
          <input
            type="checkbox"
            checked={on}
            tabindex="-1"
            class="h-3.5 w-3.5 accent-[color:var(--color-accent)]"
          />
          <span class="cp-ref">{col.ref}</span>
          <span class="cp-main">
            <span class="cp-name">{col.name || `(${col.ref})`}</span>
            {#if col.values.length > 0}
              <span class="cp-sample">{sample(col)}</span>
            {/if}
          </span>
          <span class="cp-count">
            {col.values.length > 0 ? t('col_rows', { n: col.values.length }) : t('col_none')}
          </span>
        </button>
      {/each}
    </div>

    <div class="mt-5 flex items-center justify-between">
      <span
        class="font-[family-name:var(--font-mono)] text-[11px] text-[color:var(--color-ink-mute)]"
      >
        {t('col_applied', { cols: selected.size })}
      </span>
      <div class="flex gap-2">
        <button class="btn-ghost" onclick={oncancel}>{t('col_skip')}</button>
        <button class="btn-primary" onclick={() => onapply([...selected])}>{t('col_apply')}</button>
      </div>
    </div>
  </div>
{/if}

<style>
  .cp-backdrop {
    position: fixed;
    inset: 0;
    z-index: 60;
    border: none;
    cursor: pointer;
    background: color-mix(in srgb, var(--color-bg) 70%, transparent);
    backdrop-filter: blur(2px);
  }
  .cp-dialog {
    position: fixed;
    z-index: 61;
    top: 50%;
    left: 50%;
    width: min(520px, calc(100vw - 2rem));
    transform: translate(-50%, -50%);
    padding: 24px;
    border: 1px solid var(--color-rule-strong);
    border-radius: 12px;
    background: var(--color-bg-elev);
    box-shadow: 0 24px 60px rgba(0, 0, 0, 0.45);
  }
  .cp-list {
    display: flex;
    flex-direction: column;
    gap: 4px;
    max-height: min(50vh, 360px);
    overflow-y: auto;
  }
  .cp-row {
    display: flex;
    align-items: center;
    gap: 10px;
    width: 100%;
    padding: 8px 10px;
    border: 1px solid var(--color-rule);
    border-radius: 8px;
    background: var(--color-bg);
    text-align: left;
    cursor: pointer;
    transition:
      border-color 0.12s,
      background 0.12s;
  }
  .cp-row:hover {
    border-color: var(--color-rule-strong);
  }
  .cp-row.on {
    border-color: var(--color-accent);
    background: var(--color-accent-soft);
  }
  .cp-ref {
    flex-shrink: 0;
    width: 26px;
    text-align: center;
    font-family: var(--font-mono);
    font-size: 10.5px;
    color: var(--color-ink-mute);
    border: 1px solid var(--color-rule);
    border-radius: 4px;
    padding: 1px 0;
  }
  .cp-main {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 1px;
  }
  .cp-name {
    font-size: 12.5px;
    font-weight: 500;
    color: var(--color-ink);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .cp-sample {
    font-family: var(--font-mono);
    font-size: 10.5px;
    color: var(--color-ink-mute);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .cp-count {
    flex-shrink: 0;
    font-family: var(--font-mono);
    font-size: 10.5px;
    color: var(--color-ink-mute);
  }
</style>
