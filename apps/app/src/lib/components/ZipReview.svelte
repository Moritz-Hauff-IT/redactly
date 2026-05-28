<script lang="ts">
  import type { ZipManifest } from '@de-pii/core/parsers';
  import type { FilePlan, FileAction } from '@de-pii/core/orchestrator';

  interface Props {
    manifest: ZipManifest;
    plan: FilePlan;
    loading: boolean;
    onClose: () => void;
    onApply: (plan: FilePlan) => void;
    onRegeneratePlan?: () => void;
  }

  let { manifest, plan, loading, onClose, onApply, onRegeneratePlan }: Props = $props();

  // Local working copy of the plan so user toggles don't immediately apply.
  let editedPlan = $state<FilePlan>(plan);
  $effect(() => {
    editedPlan = plan;
  });

  function setAction(path: string, action: FileAction): void {
    editedPlan = {
      ...editedPlan,
      entries: editedPlan.entries.map((e) => (e.path === path ? { ...e, action } : e)),
    };
  }

  function bulkSet(action: FileAction): void {
    editedPlan = {
      ...editedPlan,
      entries: editedPlan.entries.map((e) => ({ ...e, action })),
    };
  }

  function formatSize(b: number): string {
    if (b < 1024) return `${b} B`;
    if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
    return `${(b / (1024 * 1024)).toFixed(1)} MB`;
  }

  const counts = $derived.by(() => {
    const c = { mask: 0, skip: 0, review: 0 };
    for (const e of editedPlan.entries) c[e.action]++;
    return c;
  });
</script>

<div class="drawer-backdrop"></div>
<div
  class="fixed inset-0 z-50 flex items-center justify-center p-6"
  role="dialog"
  aria-modal="true"
  aria-labelledby="zip-review-title"
>
  <div
    class="flex max-h-[85vh] w-full max-w-3xl flex-col rounded-lg border border-[color:var(--color-rule-strong)] bg-[color:var(--color-bg)] shadow-2xl"
  >
    <header
      class="flex items-baseline justify-between border-b border-[color:var(--color-rule)] px-6 pt-5 pb-4"
    >
      <div>
        <h2
          id="zip-review-title"
          class="font-[family-name:var(--font-serif)] text-[20px] leading-none font-medium tracking-[-0.01em]"
        >
          Archiv-Maskierung
        </h2>
        <p
          class="mt-2 font-[family-name:var(--font-mono)] text-[11px] text-[color:var(--color-ink-mute)]"
        >
          {manifest.filename} · {manifest.totalEntries} Dateien · {formatSize(manifest.totalBytes)}
        </p>
      </div>
      <button class="btn-icon" onclick={onClose} aria-label="Schließen">
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="1.6"
          stroke-linecap="round"
        >
          <path d="M18 6 6 18M6 6l12 12" />
        </svg>
      </button>
    </header>

    <div
      class="border-b border-[color:var(--color-rule)] bg-[color:var(--color-bg-sunk)] px-6 py-3"
    >
      {#if loading}
        <p class="text-[12.5px] text-[color:var(--color-ink-soft)]">Plan wird generiert …</p>
      {:else}
        <p class="text-[12.5px] text-[color:var(--color-ink)]">
          <strong class="text-[color:var(--color-accent)]">Vorschlag:</strong>
          {editedPlan.summary || 'Heuristik-basierter Standard-Plan.'}
        </p>
        <div class="mt-2 flex flex-wrap items-center gap-3 text-[11.5px]">
          <span class="text-[color:var(--color-ink-mute)]">{counts.mask} maskieren</span>
          <span class="text-[color:var(--color-ink-mute)]">·</span>
          <span class="text-[color:var(--color-ink-mute)]">{counts.skip} überspringen</span>
          <span class="text-[color:var(--color-ink-mute)]">·</span>
          <span class="text-[color:var(--color-ink-mute)]">{counts.review} prüfen</span>
          <span class="ml-auto flex items-center gap-1.5">
            <button class="btn-ghost" onclick={() => bulkSet('mask')}>alle maskieren</button>
            <button class="btn-ghost" onclick={() => bulkSet('skip')}>alle überspringen</button>
            {#if onRegeneratePlan}
              <button class="btn-ghost" onclick={onRegeneratePlan}>↻ neu planen</button>
            {/if}
          </span>
        </div>
      {/if}
    </div>

    <div class="flex-1 overflow-y-auto px-6 py-4">
      <ul class="space-y-1.5">
        {#each editedPlan.entries as entry (entry.path)}
          {@const m = manifest.entries.find((e) => e.path === entry.path)}
          <li
            class="flex items-start gap-3 rounded border border-[color:var(--color-rule)] bg-[color:var(--color-bg-elev)] px-3 py-2.5"
          >
            <div class="flex-1 min-w-0">
              <div class="flex items-center gap-2">
                <code
                  class="truncate font-[family-name:var(--font-mono)] text-[12.5px] text-[color:var(--color-ink)]"
                  title={entry.path}>{entry.path}</code
                >
                {#if m}
                  <span
                    class="font-[family-name:var(--font-mono)] text-[10.5px] text-[color:var(--color-ink-mute)]"
                  >
                    {m.format ?? m.mimeType.split('/')[1] ?? '?'} · {formatSize(m.size)}
                  </span>
                {/if}
              </div>
              <p class="mt-1 text-[11.5px] text-[color:var(--color-ink-soft)]">
                {entry.reason}
              </p>
            </div>
            <div class="seg flex-shrink-0">
              <button
                class="seg-btn"
                class:active={entry.action === 'mask'}
                onclick={() => setAction(entry.path, 'mask')}>maskieren</button
              >
              <button
                class="seg-btn"
                class:active={entry.action === 'review'}
                onclick={() => setAction(entry.path, 'review')}>behalten</button
              >
              <button
                class="seg-btn"
                class:active={entry.action === 'skip'}
                onclick={() => setAction(entry.path, 'skip')}>weglassen</button
              >
            </div>
          </li>
        {/each}
      </ul>
    </div>

    <footer
      class="flex items-center justify-between gap-3 border-t border-[color:var(--color-rule)] px-6 py-4"
    >
      <span class="text-[11.5px] text-[color:var(--color-ink-mute)]">
        Output: ZIP mit gleichem Verzeichnis-Layout, maskierte Dateien ersetzen Originale.
      </span>
      <div class="flex items-center gap-2">
        <button class="btn-ghost" onclick={onClose}>abbrechen</button>
        <button
          class="btn-primary"
          disabled={loading || counts.mask === 0}
          onclick={() => onApply(editedPlan)}
        >
          Plan ausführen
        </button>
      </div>
    </footer>
  </div>
</div>

<style>
  .drawer-backdrop {
    position: fixed;
    inset: 0;
    background: rgba(26, 24, 20, 0.45);
    backdrop-filter: blur(2px);
    z-index: 40;
  }
</style>
