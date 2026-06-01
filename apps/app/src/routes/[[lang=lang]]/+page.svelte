<script lang="ts">
  import { untrack } from 'svelte';
  import InputPane from '$lib/components/InputPane.svelte';
  import MaskedPane from '$lib/components/MaskedPane.svelte';
  import DetectionReview from '$lib/components/DetectionReview.svelte';
  import RestorePane from '$lib/components/RestorePane.svelte';
  import ZipReview from '$lib/components/ZipReview.svelte';
  import { analyze } from '$lib/core/pipeline.js';
  import { maskText } from '$lib/core/maskingService.js';
  import { inputStore } from '$lib/stores/inputStore.svelte.js';
  import { detectionStore } from '$lib/stores/detectionStore.svelte.js';
  import { errorStore } from '$lib/stores/errorStore.svelte.js';
  import { mappingStore } from '$lib/stores/mappingStore.svelte.js';
  import { engineStore } from '$lib/stores/engineStore.svelte.js';
  import { settingsStore } from '$lib/stores/settingsStore.svelte.js';
  import type { ZipManifest } from '@redactly/core/parsers';
  import type { FilePlan } from '@redactly/core/orchestrator';
  import type { ProgressState, PerFileResult } from '$lib/core/zipFlow.js';

  type Tab = 'redact' | 'restore';

  let maskedText = $state('');
  let isAnalyzing = $state(false);
  let hasMasked = $state(false);
  let activeTab = $state<Tab>('redact');

  // ZIP flow state
  let zipManifest = $state<ZipManifest | null>(null);
  let zipPlan = $state<FilePlan | null>(null);
  let zipPlanLoading = $state(false);
  let zipApplying = $state(false);
  let zipProgress = $state<ProgressState | null>(null);
  let zipLog = $state<PerFileResult[]>([]);
  let zipAborting = $state(false);
  let zipAbortController: AbortController | null = null;
  // Two-phase flow: analysis result is held here for review, then a
  // separate Download step writes the actual ZIP. disabledEntityKeys
  // is the user's exclusion set keyed by `${type}:${text}`.
  let zipAnalysis = $state<import('$lib/core/zipFlow.js').ZipAnalysis | null>(null);
  let zipDisabledEntities = $state<Set<string>>(new Set());
  let zipDownloading = $state(false);

  async function handleZipUpload(file: File) {
    try {
      zipPlanLoading = true;
      const { extractZip } = await import('@redactly/core/parsers');
      const { buildPlan } = await import('$lib/core/zipFlow.js');
      // dispatch chat engine lookup — only use webllm if it's loaded
      const { isWebLlmActive } = await import('$lib/core/llmLoader.js');
      const manifest = await extractZip(file, file.name);
      zipManifest = manifest;
      // Show the modal immediately with a heuristic plan so the user sees something
      const { heuristicPlan } = await import('@redactly/core/orchestrator');
      const llmManifest = manifest.entries
        .filter((e) => !e.isDir)
        .map((e) => ({
          path: e.path,
          size: e.size,
          mimeType: e.mimeType,
          format: e.format,
          preview: e.preview,
        }));
      zipPlan = heuristicPlan(llmManifest);

      // If WebLLM is loaded, try LLM-generated plan (better than heuristic).
      // For now we pass null engine — buildPlan falls back to heuristic.
      // Wiring the actual MLC engine into the orchestrator is a follow-up;
      // the heuristic plan is already shown so the user has a working baseline.
      if (isWebLlmActive()) {
        try {
          const plan = await buildPlan(manifest, null);
          zipPlan = plan;
        } catch (err) {
          console.warn('LLM plan failed, keeping heuristic:', err);
        }
      }
    } catch (err) {
      errorStore.show(
        `ZIP konnte nicht geladen werden: ${err instanceof Error ? err.message : 'Unbekannt'}`
      );
      closeZipModal();
    } finally {
      zipPlanLoading = false;
    }
  }

  function closeZipModal() {
    zipManifest = null;
    zipPlan = null;
    zipApplying = false;
    zipProgress = null;
    zipLog = [];
    zipAborting = false;
    zipAbortController = null;
    zipAnalysis = null;
    zipDisabledEntities = new Set();
    zipDownloading = false;
  }

  function abortZipApply() {
    if (!zipAbortController || zipAborting) return;
    zipAborting = true;
    zipAbortController.abort();
  }

  async function applyZipPlan(plan: FilePlan) {
    if (!zipManifest) return;
    zipApplying = true;
    zipLog = [];
    zipProgress = null;
    zipAborting = false;
    zipAbortController = new AbortController();
    try {
      const { analyzeFiles, ZipAbortError } = await import('$lib/core/zipFlow.js');
      // PHASE 1: parse + detect across all files. NO ZIP write yet, no
      // download. The result lands in zipAnalysis for the review UI.
      const analysis = await analyzeFiles(zipManifest, plan, {
        signal: zipAbortController.signal,
        onProgress: (state) => {
          zipProgress = state;
        },
        onFileComplete: (file) => {
          zipLog = [...zipLog, file];
        },
      });
      zipAnalysis = analysis;
      zipDisabledEntities = new Set();
      zipApplying = false;
      // Avoid unused import warning — ZipAbortError is referenced in catch.
      void ZipAbortError;
    } catch (err) {
      const isAbort = err instanceof Error && err.name === 'ZipAbortError';
      if (isAbort) {
        errorStore.show('ZIP-Verarbeitung abgebrochen');
      } else {
        errorStore.show(
          `ZIP-Verarbeitung fehlgeschlagen: ${err instanceof Error ? err.message : 'Unbekannt'}`
        );
      }
      closeZipModal();
    }
  }

  /** Phase 2: user-triggered. Pack the ZIP applying the entity filter. */
  async function downloadZipFromReview() {
    if (!zipManifest || !zipAnalysis) return;
    zipDownloading = true;
    try {
      const { packZipFromAnalysis } = await import('$lib/core/zipFlow.js');
      const outputName = zipManifest.filename.replace(/\.zip$/i, '') + '-masked.zip';
      const result = await packZipFromAnalysis(zipAnalysis, outputName, zipDisabledEntities);

      // Trigger download
      const url = URL.createObjectURL(result.blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = result.filename;
      a.click();
      URL.revokeObjectURL(url);

      mappingStore.set(result.mapping);
      detectionStore.setEntities(result.entities);

      const masked = result.perFile.filter((f) => f.action === 'masked').length;
      const skipped = result.perFile.filter((f) => f.action === 'skipped').length;
      const failed = result.perFile.filter((f) => f.action === 'failed').length;
      const placeholders = result.mapping.forward.size;
      errorStore.show(
        `ZIP fertig: ${masked} maskiert, ${skipped} übersprungen${failed > 0 ? `, ${failed} fehlgeschlagen` : ''} · ${placeholders} Platzhalter im Restore`
      );
      await new Promise((r) => setTimeout(r, 300));
      closeZipModal();
    } catch (err) {
      errorStore.show(
        `Download fehlgeschlagen: ${err instanceof Error ? err.message : 'Unbekannt'}`
      );
      zipDownloading = false;
    }
  }

  function toggleZipEntity(key: string) {
    const next = new Set(zipDisabledEntities);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    zipDisabledEntities = next;
  }

  async function handleMaskClick() {
    const text = inputStore.text;
    if (!text.trim()) {
      detectionStore.clear();
      maskedText = '';
      hasMasked = false;
      return;
    }
    // Guard against keyboard-shortcut bypass: the button is disabled while a
    // detector loads, but Cmd+Enter goes through window onkeydown and would
    // otherwise call this directly. Bail silently if a detector isn't ready.
    if (settingsStore.nerEnabled && engineStore.ner.status === 'loading') return;
    if (settingsStore.webllmEnabled && engineStore.webllm.status === 'loading') return;

    isAnalyzing = true;
    try {
      const entities = await analyze(text);
      detectionStore.setEntities(entities);
      hasMasked = true;
    } catch (err) {
      console.error('Analysis failed:', err);
    } finally {
      isAnalyzing = false;
      // Always clear LLM detect-progress so the InputPane button label
      // doesn't get stuck on 'Chunk N/M' after analyze() resolves or errors.
      engineStore.resetWebllmDetect();
    }
  }

  function handleInputChange() {
    if (hasMasked) {
      detectionStore.clear();
      maskedText = '';
      hasMasked = false;
    }
  }

  $effect(() => {
    const active = detectionStore.activeEntities;
    if (active.length === 0 && !hasMasked) return;
    const text = untrack(() => inputStore.text);
    if (!text.trim()) {
      maskedText = '';
      return;
    }
    const result = maskText(text);
    maskedText = result.maskedText;
  });

  // Keyboard shortcut: Cmd/Ctrl + Enter triggers mask
  function handleKeydown(e: KeyboardEvent) {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter' && activeTab === 'redact') {
      e.preventDefault();
      handleMaskClick();
    }
  }
</script>

<svelte:window onkeydown={handleKeydown} />

<div class="flex flex-col gap-5">
  <!-- Top tabs: redact / restore -->
  <div
    class="-mb-px flex gap-1 border-b border-[color:var(--color-rule)]"
    role="tablist"
    aria-label="Workspace mode"
  >
    <button
      class="tab-btn"
      class:active={activeTab === 'redact'}
      onclick={() => (activeTab = 'redact')}
      role="tab"
      aria-selected={activeTab === 'redact'}
    >
      redact
    </button>
    <button
      class="tab-btn"
      class:active={activeTab === 'restore'}
      onclick={() => (activeTab = 'restore')}
      role="tab"
      aria-selected={activeTab === 'restore'}
    >
      ↺ restore
    </button>
  </div>

  {#if activeTab === 'redact'}
    <!-- Two panes: input | output -->
    <div class="grid grid-cols-1 gap-5 lg:grid-cols-2">
      <InputPane
        onchange={handleInputChange}
        onmask={handleMaskClick}
        {isAnalyzing}
        onZip={handleZipUpload}
      />
      <MaskedPane {maskedText} />
    </div>

    <!-- Detection review — mapping table below panes -->
    <DetectionReview />
  {:else}
    <RestorePane />
  {/if}
</div>

{#if zipManifest && zipPlan}
  <ZipReview
    manifest={zipManifest}
    plan={zipPlan}
    loading={zipPlanLoading}
    applying={zipApplying}
    progress={zipProgress}
    log={zipLog}
    aborting={zipAborting}
    analysis={zipAnalysis}
    disabledEntities={zipDisabledEntities}
    downloading={zipDownloading}
    onClose={closeZipModal}
    onApply={applyZipPlan}
    onAbort={abortZipApply}
    onToggleEntity={toggleZipEntity}
    onDownload={downloadZipFromReview}
  />
{/if}

<style>
  .tab-btn {
    font-family: var(--font-mono);
    font-size: 12px;
    background: transparent;
    border: 0;
    padding: 9px 18px 11px;
    cursor: pointer;
    color: var(--color-ink-mute);
    border-bottom: 2px solid transparent;
    margin-bottom: -1px;
    letter-spacing: 0.02em;
    transition:
      color 0.12s,
      border-color 0.12s;
  }
  .tab-btn:hover {
    color: var(--color-ink-soft);
  }
  .tab-btn.active {
    color: var(--color-ink);
    border-bottom-color: var(--color-accent);
  }
</style>
