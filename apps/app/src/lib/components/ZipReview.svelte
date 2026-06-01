<script lang="ts">
  import { untrack } from 'svelte';
  import type { ZipManifest } from '@redactly/core/parsers';
  import type { FilePlan, FileAction } from '@redactly/core/orchestrator';
  import type {
    ProgressState,
    ProgressStep,
    PerFileResult,
    ZipAnalysis,
  } from '$lib/core/zipFlow.js';
  import { loc } from '$lib/i18n/locale.svelte.js';

  const s = {
    title: { de: 'Archiv-Maskierung', en: 'Archive masking' },
    files: { de: 'Dateien', en: 'files' },
    close: { de: 'Schließen', en: 'Close' },
    planning: { de: 'Plan wird generiert …', en: 'Generating plan…' },
    suggestion: { de: 'Vorschlag:', en: 'Suggestion:' },
    defaultPlan: { de: 'Heuristik-basierter Standard-Plan.', en: 'Heuristic default plan.' },
    mask: { de: 'maskieren', en: 'mask' },
    skip: { de: 'überspringen', en: 'skip' },
    review: { de: 'prüfen', en: 'review' },
    allMask: { de: 'alle maskieren', en: 'mask all' },
    allSkip: { de: 'alle überspringen', en: 'skip all' },
    replan: { de: '↻ neu planen', en: '↻ re-plan' },
    keep: { de: 'behalten', en: 'keep' },
    drop: { de: 'weglassen', en: 'drop' },
    outputNote: {
      de: 'Output: ZIP mit gleichem Verzeichnis-Layout, maskierte Dateien ersetzen Originale.',
      en: 'Output: ZIP with the same directory layout, masked files replace originals.',
    },
    cancel: { de: 'abbrechen', en: 'cancel' },
    apply: { de: 'Plan ausführen', en: 'Apply plan' },
    // Progress panel
    progressTitle: { de: 'Maskierung läuft …', en: 'Masking in progress…' },
    of: { de: 'von', en: 'of' },
    eta: { de: 'verbleibend', en: 'remaining' },
    etaCalc: { de: 'berechne …', en: 'calculating…' },
    stepParse: { de: 'parsen', en: 'parsing' },
    stepDetect: { de: 'erkennen', en: 'detecting' },
    stepMask: { de: 'maskieren', en: 'masking' },
    stepWrite: { de: 'schreiben', en: 'writing' },
    abort: { de: 'Abbrechen', en: 'Cancel' },
    abortingMsg: { de: 'Abbruch nach aktueller Datei …', en: 'Cancelling after current file…' },
    masked: { de: 'maskiert', en: 'masked' },
    skipped: { de: 'übersprungen', en: 'skipped' },
    kept: { de: 'unverändert', en: 'kept' },
    failed: { de: 'fehlgeschlagen', en: 'failed' },
    // Phase-2 review panel
    reviewTitle: { de: 'Review vor Download', en: 'Review before download' },
    reviewSummary: {
      de: '{files} Dateien · {kept} von {entities} Treffern werden maskiert',
      en: '{files} files · {kept} of {entities} entities will be masked',
    },
    reviewHint: {
      de: 'Klick auf einen Treffer um ihn aus der Maskierung auszuschließen — er bleibt dann als Klartext im Output.',
      en: 'Click an entity to exclude it from masking — it stays in plaintext in the output.',
    },
    download: { de: 'ZIP herunterladen', en: 'Download ZIP' },
    downloading: { de: 'ZIP wird gepackt …', en: 'Packing ZIP…' },
    back: { de: '← zurück zur Datei-Auswahl', en: '← back to file selection' },
    noEntitiesInFile: {
      de: 'Keine PII gefunden',
      en: 'No PII found',
    },
    fileUnparsable: {
      de: 'Nicht parsbar — bleibt unverändert',
      en: 'Not parsable — kept unchanged',
    },
    fileSkipped: { de: 'Aus Output ausgeschlossen', en: 'Excluded from output' },
    fileKept: { de: 'Unverändert übernommen', en: 'Kept as-is' },
  } as const;

  interface Props {
    manifest: ZipManifest;
    plan: FilePlan;
    loading: boolean;
    /** When true, switch to progress-panel view (file list hidden). */
    applying?: boolean;
    /** Live progress — only meaningful when applying. */
    progress?: ProgressState | null;
    /** Rolling completion log — most recent at top. */
    log?: PerFileResult[];
    /** True once the user has clicked Cancel and we're waiting for current file. */
    aborting?: boolean;
    /** Phase-2 review state: populated once analysis is done. */
    analysis?: ZipAnalysis | null;
    /** User-selected entity exclusion set, keyed by `${type}:${text}`. */
    disabledEntities?: ReadonlySet<string>;
    /** True while the ZIP is being packed for download. */
    downloading?: boolean;
    onClose: () => void;
    onApply: (plan: FilePlan) => void;
    onAbort?: () => void;
    onRegeneratePlan?: () => void;
    onToggleEntity?: (key: string) => void;
    onDownload?: () => void;
  }

  let {
    manifest,
    plan,
    loading,
    applying = false,
    progress = null,
    log = [],
    aborting = false,
    analysis = null,
    disabledEntities = new Set(),
    downloading = false,
    onClose,
    onApply,
    onAbort,
    onRegeneratePlan,
    onToggleEntity,
    onDownload,
  }: Props = $props();

  // Local working copy of the plan so user toggles don't immediately apply.
  // Initialise to an empty plan; the $effect below mirrors prop changes.
  let editedPlan = $state<FilePlan>({ summary: '', entries: [] });
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

  // Rolling-average ETA. We sample the wall-clock time on every progress
  // tick and keep the last N intervals; mean × remaining = ETA.
  // Updated only on file-complete events (via reactive $effect on log.length)
  // so it doesn't jitter every sub-step.
  let etaSamples = $state<number[]>([]);
  let lastSampleAt = $state<number | null>(null);
  const ETA_WINDOW = 8;

  // Trigger this effect ONLY when log.length changes (per-file completion)
  // or applying flips. Wrap all state reads/writes in untrack so they don't
  // create self-referential dependencies — the previous version read
  // etaSamples to slice it, then wrote back to etaSamples, which Svelte
  // sees as a write triggering its own read and aborts with
  // effect_update_depth_exceeded. That crash killed the whole modal's
  // reactivity, freezing progress at 0/0 even though applyPlan was
  // happily processing files in the background.
  $effect(() => {
    const len = log.length;
    const isApplying = applying;
    void len;
    untrack(() => {
      if (!isApplying) {
        etaSamples = [];
        lastSampleAt = null;
        return;
      }
      const now = performance.now();
      if (lastSampleAt !== null) {
        const dt = now - lastSampleAt;
        etaSamples = [...etaSamples.slice(-(ETA_WINDOW - 1)), dt];
      }
      lastSampleAt = now;
    });
  });

  const etaSeconds = $derived.by(() => {
    if (!applying || !progress || etaSamples.length === 0) return null;
    const avg = etaSamples.reduce((a, b) => a + b, 0) / etaSamples.length;
    const remaining = progress.total - progress.done;
    return Math.round((avg * remaining) / 1000);
  });

  function formatEta(seconds: number): string {
    if (seconds < 60) return `≈ ${seconds}s`;
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `≈ ${m}m ${s.toString().padStart(2, '0')}s`;
  }

  const stepLabel = $derived.by(() => {
    if (!progress?.step) return '';
    const map: Record<ProgressStep, { de: string; en: string }> = {
      parse: s.stepParse,
      detect: s.stepDetect,
      mask: s.stepMask,
      write: s.stepWrite,
    };
    return loc(map[progress.step]);
  });

  const percent = $derived.by(() => {
    if (!progress || progress.total === 0) return 0;
    return Math.round((progress.done / progress.total) * 100);
  });

  function actionLabel(a: PerFileResult['action']): string {
    if (a === 'masked') return loc(s.masked);
    if (a === 'skipped') return loc(s.skipped);
    if (a === 'failed') return loc(s.failed);
    return loc(s.kept);
  }

  // Phase-2 review stats: files count + total entities found + how many
  // are currently slated to be masked (not excluded by the user).
  const analysisStats = $derived.by(() => {
    if (analysis === null) return { files: 0, totalEntities: 0, keptEntities: 0 };
    let total = 0;
    let kept = 0;
    for (const f of analysis.files) {
      if (f.entities) {
        for (const e of f.entities) {
          total++;
          if (!disabledEntities.has(`${e.type}:${e.text}`)) kept++;
        }
      }
    }
    return { files: analysis.files.length, totalEntities: total, keptEntities: kept };
  });

  /** Truncate long secret-like text so the review row doesn't blow up. */
  function truncate(t: string, max = 60): string {
    if (t.length <= max) return t;
    return `${t.slice(0, Math.floor(max * 0.6))}…${t.slice(-Math.floor(max * 0.3))}`;
  }
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
          {loc(s.title)}
        </h2>
        <p
          class="mt-2 font-[family-name:var(--font-mono)] text-[11px] text-[color:var(--color-ink-mute)]"
        >
          {manifest.filename} · {manifest.totalEntries}
          {loc(s.files)} · {formatSize(manifest.totalBytes)}
        </p>
      </div>
      <button class="btn-icon" onclick={onClose} aria-label={loc(s.close)}>
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
      {#if applying}
        <p class="text-[12.5px] text-[color:var(--color-ink)]">
          <strong class="text-[color:var(--color-accent)]">{loc(s.progressTitle)}</strong>
        </p>
      {:else if analysis}
        <p class="text-[12.5px] text-[color:var(--color-ink)]">
          <strong class="text-[color:var(--color-accent)]">{loc(s.reviewTitle)}</strong>
          —
          {loc(s.reviewSummary)
            .replace('{files}', String(analysisStats.files))
            .replace('{entities}', String(analysisStats.totalEntities))
            .replace('{kept}', String(analysisStats.keptEntities))}
        </p>
      {:else if loading}
        <p class="text-[12.5px] text-[color:var(--color-ink-soft)]">{loc(s.planning)}</p>
      {:else}
        <p class="text-[12.5px] text-[color:var(--color-ink)]">
          <strong class="text-[color:var(--color-accent)]">{loc(s.suggestion)}</strong>
          {editedPlan.summary || loc(s.defaultPlan)}
        </p>
        <div class="mt-2 flex flex-wrap items-center gap-3 text-[11.5px]">
          <span class="text-[color:var(--color-ink-mute)]">{counts.mask} {loc(s.mask)}</span>
          <span class="text-[color:var(--color-ink-mute)]">·</span>
          <span class="text-[color:var(--color-ink-mute)]">{counts.skip} {loc(s.skip)}</span>
          <span class="text-[color:var(--color-ink-mute)]">·</span>
          <span class="text-[color:var(--color-ink-mute)]">{counts.review} {loc(s.review)}</span>
          <span class="ml-auto flex items-center gap-1.5">
            <button class="btn-ghost" onclick={() => bulkSet('mask')}>{loc(s.allMask)}</button>
            <button class="btn-ghost" onclick={() => bulkSet('skip')}>{loc(s.allSkip)}</button>
            {#if onRegeneratePlan}
              <button class="btn-ghost" onclick={onRegeneratePlan}>{loc(s.replan)}</button>
            {/if}
          </span>
        </div>
      {/if}
    </div>

    {#if applying}
      <!-- Progress panel — replaces file list while apply runs -->
      <div class="flex-1 overflow-hidden px-6 py-5 flex flex-col gap-4">
        <!-- Top: counter + ETA -->
        <div class="flex items-baseline justify-between">
          <div class="flex items-baseline gap-2">
            <span
              class="font-[family-name:var(--font-mono)] text-[24px] font-medium text-[color:var(--color-ink)]"
            >
              {progress?.done ?? 0}
            </span>
            <span class="text-[12px] text-[color:var(--color-ink-mute)]">
              {loc(s.of)}
              {progress?.total ?? 0}
            </span>
            <span
              class="ml-1 font-[family-name:var(--font-mono)] text-[12px] text-[color:var(--color-accent)]"
            >
              {percent}%
            </span>
          </div>
          <span
            class="font-[family-name:var(--font-mono)] text-[11.5px] text-[color:var(--color-ink-soft)]"
            title={loc(s.eta)}
          >
            {etaSeconds === null ? loc(s.etaCalc) : `${formatEta(etaSeconds)} ${loc(s.eta)}`}
          </span>
        </div>

        <!-- Progress bar -->
        <div class="progress-track">
          <div
            class="progress-fill"
            class:indeterminate={progress === null}
            style:width="{percent}%"
          ></div>
        </div>

        <!-- Current file + step -->
        <div class="min-h-[42px]">
          {#if progress}
            <code
              class="block truncate font-[family-name:var(--font-mono)] text-[12px] text-[color:var(--color-ink)]"
              title={progress.currentPath}
            >
              {progress.currentPath}
            </code>
            {#if stepLabel}
              <p class="mt-1 text-[11px] text-[color:var(--color-ink-mute)]">
                <span class="text-[color:var(--color-accent)]">▸</span>
                {stepLabel}
              </p>
            {/if}
          {/if}
        </div>

        <!-- Rolling per-file log (most recent at top, scrollable) -->
        {#if log.length > 0}
          <div class="flex-1 min-h-0 overflow-hidden flex flex-col">
            <div
              class="mb-1.5 text-[10.5px] uppercase tracking-[0.06em] text-[color:var(--color-ink-mute)]"
            >
              log
            </div>
            <ul class="flex-1 overflow-y-auto space-y-0.5 pr-1">
              {#each log.slice().reverse() as result (result.path + result.action)}
                <li class="flex items-center gap-2 font-[family-name:var(--font-mono)] text-[11px]">
                  <span class="log-badge" data-action={result.action}>
                    {actionLabel(result.action)}
                  </span>
                  <code
                    class="truncate text-[color:var(--color-ink-soft)]"
                    title={result.error ?? result.path}
                  >
                    {result.path}
                  </code>
                  {#if result.entityCount !== undefined && result.entityCount > 0}
                    <span class="ml-auto text-[10px] text-[color:var(--color-ink-mute)]">
                      {result.entityCount}
                    </span>
                  {/if}
                </li>
              {/each}
            </ul>
          </div>
        {/if}
      </div>

      <footer
        class="flex items-center justify-between gap-3 border-t border-[color:var(--color-rule)] px-6 py-4"
      >
        <span class="text-[11.5px] text-[color:var(--color-ink-mute)]">
          {aborting ? loc(s.abortingMsg) : ''}
        </span>
        <button class="btn-ghost" disabled={aborting} onclick={() => onAbort?.()}>
          {loc(s.abort)}
        </button>
      </footer>
    {:else if analysis}
      <!-- Phase 2: Review panel — per-file accordion with per-entity toggles -->
      <div class="flex-1 overflow-y-auto px-6 py-4">
        <p
          class="mb-3 font-[family-name:var(--font-mono)] text-[11px] text-[color:var(--color-ink-mute)]"
        >
          {loc(s.reviewHint)}
        </p>
        <ul class="space-y-2">
          {#each analysis.files as file (file.path)}
            <li
              class="rounded border border-[color:var(--color-rule)] bg-[color:var(--color-bg-elev)] px-3 py-2.5"
            >
              <div class="flex items-baseline gap-2">
                <code
                  class="flex-1 truncate font-[family-name:var(--font-mono)] text-[12.5px] text-[color:var(--color-ink)]"
                  title={file.path}>{file.path}</code
                >
                <span
                  class="font-[family-name:var(--font-mono)] text-[10.5px] text-[color:var(--color-ink-mute)]"
                >
                  {file.action === 'skip'
                    ? loc(s.fileSkipped)
                    : file.action !== 'mask'
                      ? loc(s.fileKept)
                      : file.entities && file.entities.length > 0
                        ? `${file.entities.length} ${loc({ de: 'Treffer', en: 'matches' })}`
                        : file.error
                          ? loc(s.fileUnparsable)
                          : loc(s.noEntitiesInFile)}
                </span>
              </div>
              {#if file.entities && file.entities.length > 0}
                <ul class="mt-2 flex flex-wrap gap-1.5">
                  {#each file.entities as entity}
                    {@const key = `${entity.type}:${entity.text}`}
                    {@const disabled = disabledEntities.has(key)}
                    <li>
                      <button
                        type="button"
                        class="entity-chip"
                        class:disabled
                        onclick={() => onToggleEntity?.(key)}
                        title={disabled
                          ? 'Aktivieren — wird wieder maskiert'
                          : 'Deaktivieren — bleibt im Output sichtbar'}
                      >
                        <span class="chip-type">{entity.type}</span>
                        <span class="chip-text">{truncate(entity.text)}</span>
                      </button>
                    </li>
                  {/each}
                </ul>
              {/if}
            </li>
          {/each}
        </ul>
      </div>
      <footer
        class="flex items-center justify-between gap-3 border-t border-[color:var(--color-rule)] px-6 py-4"
      >
        <span class="text-[11.5px] text-[color:var(--color-ink-mute)]">
          {downloading ? loc(s.downloading) : ''}
        </span>
        <div class="flex items-center gap-2">
          <button class="btn-ghost" disabled={downloading} onclick={onClose}>{loc(s.cancel)}</button
          >
          <button
            class="btn-primary"
            disabled={downloading || analysisStats.keptEntities === 0}
            onclick={() => onDownload?.()}
          >
            {downloading ? loc(s.downloading) : loc(s.download)}
          </button>
        </div>
      </footer>
    {:else}
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
                  onclick={() => setAction(entry.path, 'mask')}>{loc(s.mask)}</button
                >
                <button
                  class="seg-btn"
                  class:active={entry.action === 'review'}
                  onclick={() => setAction(entry.path, 'review')}>{loc(s.keep)}</button
                >
                <button
                  class="seg-btn"
                  class:active={entry.action === 'skip'}
                  onclick={() => setAction(entry.path, 'skip')}>{loc(s.drop)}</button
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
          {loc(s.outputNote)}
        </span>
        <div class="flex items-center gap-2">
          <button class="btn-ghost" onclick={onClose}>{loc(s.cancel)}</button>
          <button
            class="btn-primary"
            disabled={loading || counts.mask === 0}
            onclick={() => onApply(editedPlan)}
          >
            {loc(s.apply)}
          </button>
        </div>
      </footer>
    {/if}
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

  .progress-track {
    height: 4px;
    width: 100%;
    background: var(--color-rule);
    border-radius: 2px;
    overflow: hidden;
  }
  .progress-fill {
    height: 100%;
    background: var(--color-accent);
    transition: width 0.18s ease-out;
  }
  .progress-fill.indeterminate {
    width: 30% !important;
    animation: slide 1.4s ease-in-out infinite;
  }
  @keyframes slide {
    0% {
      transform: translateX(-100%);
    }
    100% {
      transform: translateX(333%);
    }
  }

  .log-badge {
    display: inline-block;
    padding: 1px 6px;
    border-radius: 2px;
    font-size: 9.5px;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    flex-shrink: 0;
    min-width: 58px;
    text-align: center;
  }
  .log-badge[data-action='masked'] {
    background: color-mix(in oklab, var(--color-accent) 18%, transparent);
    color: var(--color-accent);
  }
  .log-badge[data-action='skipped'] {
    background: var(--color-rule);
    color: var(--color-ink-mute);
  }
  .log-badge[data-action='kept'] {
    background: var(--color-rule);
    color: var(--color-ink-soft);
  }
  .log-badge[data-action='failed'] {
    background: color-mix(in oklab, #dc2626 22%, transparent);
    color: #fca5a5;
  }

  .entity-chip {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 3px 8px 4px;
    border-radius: 4px;
    border: 1px solid var(--color-rule-strong);
    background: var(--color-bg);
    font-family: var(--font-mono);
    font-size: 11px;
    color: var(--color-ink);
    cursor: pointer;
    transition: all 0.12s;
    max-width: 100%;
  }
  .entity-chip:hover {
    border-color: var(--color-accent);
  }
  .entity-chip.disabled {
    background: var(--color-bg-sunk);
    color: var(--color-ink-mute);
    text-decoration: line-through;
    text-decoration-color: var(--color-ink-mute);
    text-decoration-thickness: 1px;
    opacity: 0.7;
  }
  .chip-type {
    font-size: 9px;
    letter-spacing: 0.06em;
    color: var(--color-accent);
    text-transform: uppercase;
  }
  .entity-chip.disabled .chip-type {
    color: var(--color-ink-mute);
  }
  .chip-text {
    max-width: 280px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
</style>
