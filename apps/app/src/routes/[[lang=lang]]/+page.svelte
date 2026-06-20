<script lang="ts">
  import { untrack } from 'svelte';
  import InputPane from '$lib/components/InputPane.svelte';
  import MaskedPane from '$lib/components/MaskedPane.svelte';
  import DetectionReview from '$lib/components/DetectionReview.svelte';
  import RestorePane from '$lib/components/RestorePane.svelte';
  import CautionBanner from '$lib/components/CautionBanner.svelte';
  import ZipReview from '$lib/components/ZipReview.svelte';
  import PasswordDialog from '$lib/components/PasswordDialog.svelte';
  import { analyze } from '$lib/core/pipeline.js';
  import { maskText, redactText } from '$lib/core/maskingService.js';
  import { inputStore } from '$lib/stores/inputStore.svelte.js';
  import { detectionStore } from '$lib/stores/detectionStore.svelte.js';
  import { errorStore } from '$lib/stores/errorStore.svelte.js';
  import { mappingStore } from '$lib/stores/mappingStore.svelte.js';
  import { engineStore } from '$lib/stores/engineStore.svelte.js';
  import { settingsStore } from '$lib/stores/settingsStore.svelte.js';
  import { uiStore } from '$lib/stores/uiStore.svelte.js';
  import { serializeMapping } from '@redactly/core/masker';
  import { findResidualPii, verifyRoundTrip } from '@redactly/core/safety';
  import { t } from '$lib/i18n/locale.svelte.js';
  import type { ZipManifest } from '@redactly/core/parsers';
  import type { FilePlan } from '@redactly/core/orchestrator';
  import type { ProgressState, PerFileResult, ZipFileOutput } from '$lib/core/zipFlow.js';

  let maskedText = $state('');
  let isAnalyzing = $state(false);
  let hasMasked = $state(false);

  // Block masking while an enabled detector is still loading — a half-loaded
  // NER engine would silently fall back to regex and miss entities.
  const detectorLoading = $derived.by(() => {
    const nerLoading = settingsStore.nerEnabled && engineStore.ner.status === 'loading';
    const llmLoading = settingsStore.webllmEnabled && engineStore.webllm.status === 'loading';
    if (nerLoading) return 'NER';
    if (llmLoading) return 'WebLLM';
    return null;
  });
  const canMask = $derived(
    inputStore.text.trim().length > 0 && !isAnalyzing && detectorLoading === null
  );
  const restoreDisabled = $derived(
    !mappingStore.current || mappingStore.current.forward.size === 0
  );

  // Live status shown in the bridge while a mask run is in flight, so an
  // LLM pass (which can take many seconds) never looks frozen.
  const analysisMessage = $derived.by(() => {
    if (detectorLoading) return t('btn_mask_loading', { detector: detectorLoading });
    if (engineStore.webllmDetect.total > 0) {
      return t('btn_mask_llm_chunk', {
        current: engineStore.webllmDetect.current,
        total: engineStore.webllmDetect.total,
      });
    }
    return t('btn_mask_analyzing');
  });
  // 0..1 when we have a real percentage, null → indeterminate bar.
  const analysisProgress = $derived.by(() => {
    if (detectorLoading === 'WebLLM') return engineStore.webllm.progress;
    if (detectorLoading === 'NER') return engineStore.ner.progress;
    if (engineStore.webllmDetect.total > 0) {
      return engineStore.webllmDetect.current / engineStore.webllmDetect.total;
    }
    return null;
  });

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

  // ZIP result, shown in the workspace panes (file list + per-file preview +
  // individual download) after processing. null → normal single-text mode.
  let zipResult = $state<{ files: ZipFileOutput[]; blob: Blob; filename: string } | null>(null);
  let zipSelected = $state(0);
  const selectedZipFile = $derived(zipResult?.files[zipSelected] ?? null);

  function triggerDownload(blob: Blob, name: string) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    a.click();
    URL.revokeObjectURL(url);
  }

  function baseName(path: string): string {
    return path.split('/').pop() || path;
  }

  function downloadZipFile(f: ZipFileOutput) {
    if (!f.bytes) return;
    triggerDownload(
      new Blob([f.bytes as BlobPart], { type: f.mimeType || 'application/octet-stream' }),
      baseName(f.path)
    );
  }

  function downloadAllZip() {
    if (zipResult) triggerDownload(zipResult.blob, zipResult.filename);
  }

  // Save the current mask→original mapping so it can be reloaded later (even
  // in a fresh session) to restore. The file holds the originals → we warn.
  const hasMapping = $derived((mappingStore.current?.forward.size ?? 0) > 0);
  function exportMapping() {
    const m = mappingStore.current;
    if (!m || m.forward.size === 0) return;
    triggerDownload(
      new Blob([serializeMapping(m)], { type: 'application/json' }),
      'redactly-mapping.json'
    );
    errorStore.show(t('map_export_warn'));
  }

  // Encrypted export — passphrase via dialog, AES-GCM envelope, never persisted.
  let pwDialogOpen = $state(false);
  function openEncryptedExport() {
    if (!hasMapping) return;
    pwDialogOpen = true;
  }
  async function exportMappingEncrypted(password: string) {
    const m = mappingStore.current;
    if (!m || m.forward.size === 0) return;
    pwDialogOpen = false;
    try {
      const { encryptMapping } = await import('@redactly/core/mappingCrypto');
      const envelope = await encryptMapping(m, password);
      triggerDownload(
        new Blob([envelope], { type: 'application/json' }),
        'redactly-mapping.enc.json'
      );
      errorStore.show(t('map_export_enc_ok'));
    } catch (err) {
      errorStore.show(
        t('map_import_err', { message: err instanceof Error ? err.message : 'unbekannt' })
      );
    }
  }

  function clearZipResult() {
    zipResult = null;
    zipSelected = 0;
    detectionStore.clear();
    inputStore.reset();
    hasMasked = false;
    maskedText = '';
  }

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

      mappingStore.set(result.mapping);
      detectionStore.setEntities(result.entities);

      // The modal's "ZIP herunterladen" button must actually download the
      // combined ZIP right away.
      triggerDownload(result.blob, result.filename);

      // …and also open the result in the workspace: every file stays visible,
      // clickable (preview original + masked) and individually downloadable,
      // plus the combined ZIP.
      zipResult = {
        files: result.perFileOutputs,
        blob: result.blob,
        filename: result.filename,
      };
      zipSelected = 0;
      uiStore.setMode('redact');

      const masked = result.perFile.filter((f) => f.action === 'masked').length;
      const skipped = result.perFile.filter((f) => f.action === 'skipped').length;
      const failed = result.perFile.filter((f) => f.action === 'failed').length;
      errorStore.show(
        `ZIP fertig: ${masked} maskiert, ${skipped} übersprungen${failed > 0 ? `, ${failed} fehlgeschlagen` : ''} — Dateien im Arbeitsbereich, einzeln oder als ZIP herunterladbar`
      );
      await new Promise((r) => setTimeout(r, 200));
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
    // Track the output mode so toggling it re-renders the output.
    const redactMode = settingsStore.redactMode;
    if (active.length === 0 && !hasMasked) return;
    const text = untrack(() => inputStore.text);
    if (!text.trim()) {
      maskedText = '';
      return;
    }
    maskedText = redactMode ? redactText(text) : maskText(text).maskedText;
  });

  // Output safety pass — runs on the masked result so a residual leak or a
  // lossy mapping is caught before the user sends the text anywhere.
  const residualPii = $derived.by(() => {
    if (!hasMasked || !maskedText.trim()) return [];
    const found = findResidualPii(maskedText);
    // In fake-value mode the output legitimately contains fake emails/IPs —
    // those are mapping keys, not leaks, so don't flag them.
    const fakes = mappingStore.current?.forward;
    return fakes && fakes.size > 0 ? found.filter((e) => !fakes.has(e.text)) : found;
  });
  const roundTripOk = $derived.by(() => {
    if (!hasMasked || settingsStore.redactMode || !maskedText.trim()) return true;
    const m = mappingStore.current;
    if (!m || m.forward.size === 0) return true;
    return verifyRoundTrip(
      untrack(() => inputStore.text),
      maskedText,
      m
    );
  });
  const residualSample = $derived(residualPii.slice(0, 6).map((e) => e.text));

  /** Mask + ensure the bridge shows the masked result. */
  function doMask() {
    uiStore.setMode('redact');
    handleMaskClick();
  }

  // Keyboard shortcut: Cmd/Ctrl + Enter triggers mask
  function handleKeydown(e: KeyboardEvent) {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter' && uiStore.mode === 'redact') {
      e.preventDefault();
      doMask();
    }
  }
</script>

<svelte:window onkeydown={handleKeydown} />

<div class="flex flex-col gap-3.5">
  <CautionBanner />

  {#if residualPii.length > 0 || !roundTripOk}
    <div class="safety-warn" role="alert">
      <svg
        width="17"
        height="17"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="1.8"
        stroke-linecap="round"
        stroke-linejoin="round"
        aria-hidden="true"
        class="mt-0.5 flex-shrink-0"
      >
        <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3z" />
        <line x1="12" y1="9" x2="12" y2="13" />
        <line x1="12" y1="17" x2="12.01" y2="17" />
      </svg>
      <div class="flex-1">
        {#if residualPii.length > 0}
          <p class="text-[13px] font-medium text-[color:var(--color-ink)]">
            {t('safety_residual_lead', { n: residualPii.length })}
          </p>
          <p class="mt-0.5 text-[12px] text-[color:var(--color-ink-soft)]">
            {t('safety_residual_body')}
          </p>
          <div class="mt-1.5 flex flex-wrap gap-1.5">
            {#each residualSample as val}
              <span
                class="token border-[color:var(--color-danger)] text-[color:var(--color-danger)]"
                >{val}</span
              >
            {/each}
            {#if residualPii.length > residualSample.length}
              <span class="text-[11px] text-[color:var(--color-ink-mute)]"
                >+{residualPii.length - residualSample.length}</span
              >
            {/if}
          </div>
        {/if}
        {#if !roundTripOk}
          <p
            class="text-[12px] text-[color:var(--color-ink-soft)]"
            class:mt-2={residualPii.length > 0}
          >
            <strong class="font-medium text-[color:var(--color-ink)]"
              >{t('safety_roundtrip_lead')}</strong
            >
            {t('safety_roundtrip_body')}
          </p>
        {/if}
      </div>
    </div>
  {/if}

  <!-- Three-column workspace: Original · Bridge (mask/restore) · Inspector -->
  <div class="work-grid">
    {#if zipResult}
      <!-- Original (ZIP): every file listed, clickable → original preview -->
      <div class="pane">
        <div class="pane-head">
          <span class="pane-title">
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
              <path
                d="M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-8l-2-2H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2Z"
              />
            </svg>
            {t('ws_original')} · {t('ws_zip_count', { n: zipResult.files.length })}
          </span>
          <button class="btn-ghost" onclick={clearZipResult}>✕ {t('ws_new_input')}</button>
        </div>
        <div class="ziplist">
          {#each zipResult.files as f, i (f.path)}
            <button
              class="zipitem"
              class:active={i === zipSelected}
              onclick={() => (zipSelected = i)}
            >
              <span class="zipname" title={f.path}>{baseName(f.path)}</span>
              <span class="zipbadge {f.action}">{t(`ws_act_${f.action}` as never)}</span>
            </button>
          {/each}
        </div>
        <div class="zippreview">
          {#if selectedZipFile?.originalText}
            <pre>{selectedZipFile.originalText}</pre>
          {:else}
            <span class="zipnote">{t('ws_zip_nopreview')}</span>
          {/if}
        </div>
      </div>
    {:else}
      <InputPane onchange={handleInputChange} onZip={handleZipUpload} />
    {/if}

    <!-- Bridge: switches between masked output and restore -->
    <div class="pane">
      <div class="pane-head">
        <div class="seg" role="tablist" aria-label="Bridge mode">
          <button
            class="seg-btn"
            class:active={uiStore.mode === 'redact'}
            onclick={() => uiStore.setMode('redact')}
            role="tab"
            aria-selected={uiStore.mode === 'redact'}
            data-testid="mask-tab"
          >
            {t('ws_tab_mask')}
          </button>
          <button
            class="seg-btn"
            class:active={uiStore.mode === 'restore'}
            onclick={() => uiStore.setMode('restore')}
            role="tab"
            aria-selected={uiStore.mode === 'restore'}
            data-testid="restore-tab"
          >
            {t('ws_tab_restore')}
          </button>
        </div>
      </div>

      {#if uiStore.mode === 'redact'}
        {#if zipResult}
          <div class="flex min-h-0 flex-1 flex-col">
            <div class="zip-toolbar">
              <span class="zipname truncate" title={selectedZipFile?.path}>
                {selectedZipFile ? baseName(selectedZipFile.path) : ''}
              </span>
              <div class="flex flex-shrink-0 items-center gap-2">
                <button
                  class="btn-ghost"
                  disabled={!selectedZipFile?.bytes}
                  onclick={() => selectedZipFile && downloadZipFile(selectedZipFile)}
                  title={t('ws_zip_dl_file')}
                >
                  ↓ {t('btn_download')}
                </button>
                <button class="btn-ghost" onclick={downloadAllZip}>↓ {t('ws_zip_all')}</button>
              </div>
            </div>
            <div class="zippreview">
              {#if selectedZipFile?.maskedText}
                <pre data-testid="masked-output">{selectedZipFile.maskedText}</pre>
              {:else if selectedZipFile?.action === 'kept'}
                <span class="zipnote">{t('ws_zip_kept_note')}</span>
              {:else if selectedZipFile?.action === 'skipped'}
                <span class="zipnote">{t('ws_zip_skipped_note')}</span>
              {:else if selectedZipFile?.action === 'failed'}
                <span class="zipnote">{t('ws_zip_failed_note')}</span>
              {:else}
                <span class="zipnote">{t('ws_zip_nopreview')}</span>
              {/if}
            </div>
          </div>
        {:else if isAnalyzing}
          <div class="analysis" data-testid="analysis-status">
            <svg
              class="h-7 w-7 animate-spin text-[color:var(--color-accent)]"
              viewBox="0 0 16 16"
              fill="none"
              aria-hidden="true"
            >
              <circle
                cx="8"
                cy="8"
                r="6"
                stroke="currentColor"
                stroke-opacity="0.25"
                stroke-width="2"
              />
              <path
                d="M14 8a6 6 0 00-6-6"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
              />
            </svg>
            <div class="w-full max-w-[280px]">
              <p class="analysis-msg">{analysisMessage}</p>
              <div class="mini-track" class:indeterminate={analysisProgress === null}>
                <div
                  class="mini-fill"
                  style:width={analysisProgress !== null
                    ? `${Math.round(analysisProgress * 100)}%`
                    : null}
                ></div>
              </div>
            </div>
            <p class="analysis-hint">{t('ws_analysis_hint')}</p>
          </div>
        {:else}
          <MaskedPane {maskedText} embedded />
        {/if}
      {:else}
        <RestorePane embedded />
      {/if}
    </div>

    <!-- Inspector -->
    <DetectionReview inspector />
  </div>

  <!-- Action bar -->
  <div class="actionbar">
    {#if zipResult}
      <span class="stat">
        ZIP: <b>{t('ws_zip_count', { n: zipResult.files.length })}</b>
      </span>
      {#if detectionStore.entities.length > 0}
        <span class="stat-sep">·</span>
        <span class="stat">{detectionStore.entities.length} PII</span>
      {/if}
      <div class="flex-1"></div>
      <button class="actionbtn" onclick={clearZipResult}>✕ {t('ws_new_input')}</button>
      <button
        class="actionbtn restore"
        disabled={restoreDisabled}
        onclick={() => uiStore.setMode('restore')}
      >
        <span>↺</span>
        {t('ws_btn_restore')}
      </button>
      {#if hasMapping}
        <button class="actionbtn" onclick={exportMapping}>↓ {t('map_export')}</button>
        <button class="actionbtn" onclick={openEncryptedExport} title={t('pw_export_body')}>
          🔒 {t('map_export_enc')}
        </button>
      {/if}
      <button class="actionbtn mask" onclick={downloadAllZip}>↓ {t('ws_zip_all')}</button>
    {:else}
      <span class="stat">
        {t('ws_status')}:
        <b>
          {hasMasked
            ? settingsStore.redactMode
              ? t('ws_state_redacted')
              : t('ws_state_masked')
            : t('ws_state_original')}
        </b>
      </span>
      {#if detectionStore.entities.length > 0}
        <span class="stat-sep">·</span>
        <span class="stat">
          {detectionStore.activeEntities.length}/{detectionStore.entities.length}
        </span>
      {/if}

      <div class="flex-1"></div>

      <button
        class="actionbtn restore"
        disabled={restoreDisabled}
        onclick={() => uiStore.setMode('restore')}
      >
        <span>↺</span>
        {t('ws_btn_restore')}
      </button>
      {#if hasMapping}
        <button class="actionbtn" onclick={exportMapping}>↓ {t('map_export')}</button>
        <button class="actionbtn" onclick={openEncryptedExport} title={t('pw_export_body')}>
          🔒 {t('map_export_enc')}
        </button>
      {/if}
      <button
        class="actionbtn mask"
        data-testid="mask-button"
        disabled={!canMask}
        onclick={doMask}
        title={detectorLoading
          ? t('btn_mask_waiting_for', { detector: detectorLoading })
          : 'Erkennt PII und maskiert (⌘↵)'}
      >
        {#if detectorLoading}
          <svg class="h-3.5 w-3.5 animate-spin" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <circle
              cx="8"
              cy="8"
              r="6"
              stroke="currentColor"
              stroke-opacity="0.35"
              stroke-width="2"
            />
            <path
              d="M14 8a6 6 0 00-6-6"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
            />
          </svg>
          {t('btn_mask_loading', { detector: detectorLoading })}
        {:else if isAnalyzing}
          <svg class="h-3.5 w-3.5 animate-spin" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <circle
              cx="8"
              cy="8"
              r="6"
              stroke="currentColor"
              stroke-opacity="0.35"
              stroke-width="2"
            />
            <path
              d="M14 8a6 6 0 00-6-6"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
            />
          </svg>
          {#if engineStore.webllmDetect.total > 0}
            {t('btn_mask_llm_chunk', {
              current: engineStore.webllmDetect.current,
              total: engineStore.webllmDetect.total,
            })}
          {:else}
            {t('btn_mask_analyzing')}
          {/if}
        {:else}
          <span>▮</span>
          {settingsStore.redactMode ? t('ws_btn_redact') : t('ws_btn_mask')}
        {/if}
      </button>
    {/if}
  </div>
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

<PasswordDialog
  open={pwDialogOpen}
  title={t('pw_export_title')}
  body={t('pw_export_body')}
  confirm
  onsubmit={exportMappingEncrypted}
  oncancel={() => (pwDialogOpen = false)}
/>

<style>
  .safety-warn {
    display: flex;
    align-items: flex-start;
    gap: 11px;
    padding: 11px 14px;
    border: 1px solid var(--color-danger);
    border-left: 3px solid var(--color-danger);
    border-radius: var(--r-md);
    background: color-mix(in srgb, var(--color-danger) 8%, var(--color-bg-elev));
    color: var(--color-danger);
  }
  .work-grid {
    display: grid;
    grid-template-columns: 1fr;
    gap: 14px;
    align-items: stretch;
  }
  @media (min-width: 1024px) {
    .work-grid {
      grid-template-columns: minmax(0, 1fr) minmax(0, 1fr) 340px;
    }
  }

  .actionbar {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 13px 18px;
    border: 1px solid var(--color-rule);
    border-radius: var(--r-lg);
    background: var(--color-bg-sunk);
  }
  .stat {
    font-family: var(--font-mono);
    font-size: 12px;
    color: var(--color-ink-mute);
  }
  .stat b {
    color: var(--color-accent);
    font-weight: 600;
  }
  .stat-sep {
    color: var(--color-rule-strong);
  }

  .actionbtn {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    font-family: var(--font-sans);
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
    border-radius: 11px;
    padding: 11px 22px;
    border: 1px solid var(--color-rule-strong);
    background: var(--color-bg-elev);
    color: var(--color-ink);
    transition:
      transform 0.14s var(--ease),
      background 0.14s,
      border-color 0.14s,
      box-shadow 0.18s;
  }
  .actionbtn.restore {
    background: #15243c;
    border-color: #33507a;
    color: #bcd4f5;
  }
  .actionbtn.restore:hover:not(:disabled) {
    border-color: #5b87c4;
    color: #e2ecfb;
    transform: translateY(-1px);
  }
  .actionbtn.mask {
    background: var(--color-accent);
    border-color: var(--color-accent);
    color: #1a1206;
    box-shadow: var(--glow-accent);
  }
  .actionbtn.mask:hover:not(:disabled) {
    background: #ffa92a;
    border-color: #ffa92a;
    transform: translateY(-1px);
    box-shadow: 0 6px 22px -4px rgba(242, 150, 12, 0.7);
  }
  .actionbtn:disabled {
    opacity: 0.4;
    cursor: not-allowed;
    box-shadow: none;
    transform: none;
  }

  /* In-bridge analysis status (keeps an LLM pass from looking frozen) */
  .analysis {
    display: flex;
    min-height: 0;
    flex: 1;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 16px;
    padding: 32px;
    text-align: center;
  }
  .analysis-msg {
    margin: 0 0 10px;
    font-family: var(--font-mono);
    font-size: 13px;
    color: var(--color-ink);
  }
  .analysis-hint {
    margin: 0;
    font-family: var(--font-mono);
    font-size: 11px;
    color: var(--color-ink-mute);
  }
  .mini-track {
    position: relative;
    height: 5px;
    overflow: hidden;
    border-radius: 999px;
    background: var(--color-bg-elev);
    border: 1px solid var(--color-rule);
  }
  .mini-fill {
    height: 100%;
    border-radius: 999px;
    background: var(--color-accent);
    box-shadow: 0 0 10px rgba(242, 150, 12, 0.6);
    transition: width 0.3s var(--ease);
  }
  .mini-track.indeterminate .mini-fill {
    width: 40%;
    animation: bridge-slide 1.1s var(--ease) infinite;
  }
  @keyframes bridge-slide {
    0% {
      transform: translateX(-120%);
    }
    100% {
      transform: translateX(320%);
    }
  }

  /* ZIP result view — file list + per-file preview */
  .ziplist {
    display: flex;
    flex-direction: column;
    gap: 2px;
    overflow: auto;
    padding: 8px;
    max-height: 40%;
    border-bottom: 1px solid var(--color-rule);
  }
  .zipitem {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    width: 100%;
    text-align: left;
    padding: 7px 10px;
    border: 0;
    border-radius: 8px;
    background: transparent;
    color: var(--color-ink-soft);
    cursor: pointer;
    font-family: var(--font-mono);
    font-size: 12px;
    transition: background 0.12s;
  }
  .zipitem:hover {
    background: var(--color-bg-sunk);
    color: var(--color-ink);
  }
  .zipitem.active {
    background: var(--color-accent-soft);
    color: var(--color-ink);
    box-shadow: inset 0 0 0 1px rgba(242, 150, 12, 0.32);
  }
  .zipname {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .zipbadge {
    flex-shrink: 0;
    font-size: 9.5px;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    padding: 1px 7px;
    border-radius: 999px;
    border: 1px solid var(--color-rule-strong);
    color: var(--color-ink-mute);
  }
  .zipbadge.masked {
    color: var(--color-accent);
    border-color: rgba(242, 150, 12, 0.4);
  }
  .zipbadge.failed {
    color: var(--color-danger);
    border-color: rgba(248, 113, 113, 0.4);
  }
  .zippreview {
    flex: 1;
    min-height: 0;
    overflow: auto;
    padding: 14px 16px;
  }
  .zippreview pre {
    margin: 0;
    font-family: var(--font-mono);
    font-size: 12.5px;
    line-height: 1.7;
    white-space: pre-wrap;
    word-break: break-word;
    color: var(--color-ink);
  }
  .zipnote {
    display: block;
    padding: 20px 4px;
    font-family: var(--font-mono);
    font-size: 12px;
    color: var(--color-ink-mute);
  }
  .zip-toolbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
    padding: 8px 12px;
    border-bottom: 1px solid var(--color-rule);
  }
  .zip-toolbar .zipname {
    font-family: var(--font-mono);
    font-size: 11.5px;
    color: var(--color-ink-soft);
  }
</style>
