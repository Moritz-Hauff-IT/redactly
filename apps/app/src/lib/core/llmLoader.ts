/**
 * Shared WebLLM load/unload flow used by both the Settings page button and
 * the root layout auto-load (when the user previously enabled WebLLM).
 *
 * The WebLlmDetector class is only imported dynamically so it stays out of the
 * main bundle — this is the code-split boundary.
 */

import { engineStore } from '$lib/stores/engineStore.svelte.js';
import { settingsStore } from '$lib/stores/settingsStore.svelte.js';
import { enableWebLlm, disableWebLlm } from '$lib/core/pipeline.js';
import type { WebLlmDetectorLike } from '$lib/core/pipeline.js';

/** Re-analyze callback — injected by the page so we don't depend on a global store. */
export type ReAnalyzeFn = () => Promise<void> | void;

let detector: WebLlmDetectorLike | null = null;

/**
 * Load WebLLM model, wire it into the pipeline, and trigger re-analysis.
 *
 * @param modelId — which model variant to load.
 * @param reAnalyze — called once the model is ready so current input is re-processed.
 */
export async function loadWebLlm(modelId: string, reAnalyze?: ReAnalyzeFn): Promise<void> {
  console.log('[loadWebLlm] called', { modelId, currentStatus: engineStore.webllm.status });

  if (engineStore.webllm.status === 'loading' || engineStore.webllm.status === 'ready') {
    console.log('[loadWebLlm] early return — status is', engineStore.webllm.status);
    return;
  }

  engineStore.setWebllmStatus('loading');
  engineStore.setWebllmProgress(0, 'Initializing WebLLM engine…');
  console.log('[loadWebLlm] status set to loading, about to dynamic-import @redactly/core/llm');

  // Request persistent storage BEFORE the download starts. Without this,
  // Brave (and Chrome on small disks) cap the origin at ~1 GB shared
  // across IndexedDB+Cache → Llama 3.2 3B (~1.7 GB) hits 'Quota exceeded'
  // mid-download. With persistent storage granted, the quota jumps to
  // ~50 % of free disk. Browsers grant it silently for engaged origins,
  // otherwise show a one-time prompt. Failure is non-fatal — we still
  // try the download and surface the real error if it fails later.
  if (typeof navigator !== 'undefined' && navigator.storage?.persist) {
    try {
      const already = await navigator.storage.persisted();
      if (!already) {
        const granted = await navigator.storage.persist();
        console.log('[loadWebLlm] navigator.storage.persist() →', granted ? 'granted' : 'denied');
      } else {
        console.log('[loadWebLlm] storage already persistent');
      }
      if (navigator.storage.estimate) {
        const { usage, quota } = await navigator.storage.estimate();
        const usageMb = Math.round((usage ?? 0) / 1024 / 1024);
        const quotaMb = Math.round((quota ?? 0) / 1024 / 1024);
        console.log(`[loadWebLlm] storage usage: ${usageMb} MB / quota: ${quotaMb} MB`);
      }
    } catch (err) {
      console.warn('[loadWebLlm] storage.persist() failed', err);
    }
  }

  try {
    // Dynamic import keeps @mlc-ai/web-llm out of the main bundle.
    const { WebLlmDetector } = await import('@redactly/core/llm');
    console.log('[loadWebLlm] @redactly/core/llm imported successfully');

    const onProgress = (event: {
      status: string;
      message?: string;
      progress?: number;
      error?: string;
    }): void => {
      if (event.status === 'init') {
        engineStore.setWebllmProgress(0, event.message ?? '');
      } else if (event.status === 'download') {
        const pct = event.progress ?? 0;
        engineStore.setWebllmProgress(pct, event.message ?? '');
      } else if (event.status === 'ready') {
        engineStore.setWebllmProgress(1, 'WebLLM bereit');
      } else if (event.status === 'error') {
        engineStore.setWebllmStatus('error');
        engineStore.setWebllmProgress(0, `WebLLM Fehler: ${event.error ?? 'Unbekannter Fehler'}`);
      }
    };

    // debug: true → console.log on every detect() call (early + summary) so
    // users can diagnose silent LLM failures during alpha.

    // Per-chunk detect progress so the UI can show 'LLM chunk N/M' while
    // a single-file mask is running. Writes to engineStore.webllmDetect,
    // which InputPane reads reactively. The mask handler clears it once
    // analyze() resolves so the UI doesn't get a stuck progress bar.
    const onChunkProgress = (current: number, total: number): void => {
      engineStore.setWebllmDetect(current, total);
    };

    console.log('[loadWebLlm] constructing WebLlmDetector', { modelId });
    const webllmDetector = new WebLlmDetector({
      modelId,
      onProgress,
      onChunkProgress,
      debug: true,
    });
    detector = webllmDetector as unknown as WebLlmDetectorLike;

    console.log('[loadWebLlm] calling detector.ready() — this triggers CreateMLCEngine');
    await detector.ready();
    console.log('[loadWebLlm] detector.ready() resolved');

    await enableWebLlm(detector);
    console.log('[loadWebLlm] enableWebLlm() done — detector wired into pipeline');

    settingsStore.setWebllmEnabled(true);
    settingsStore.setWebllmModelId(modelId);
    engineStore.setWebllmStatus('ready');
    engineStore.setWebllmProgress(1, 'WebLLM bereit');
    console.log('[loadWebLlm] DONE — WebLLM is ready');

    if (reAnalyze) {
      await reAnalyze();
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);

    console.error('[loadWebLlm] FAILED', err);
    engineStore.setWebllmStatus('error');

    // Quota-exceeded is a specific recoverable case: tell the user how to
    // recover instead of just dumping the raw browser error string.
    const isQuotaErr = /quota|QuotaExceeded|exceeded the quota/i.test(msg);
    if (isQuotaErr) {
      let quotaInfo = '';
      try {
        if (navigator.storage?.estimate) {
          const { usage, quota } = await navigator.storage.estimate();
          const usageMb = Math.round((usage ?? 0) / 1024 / 1024);
          const quotaMb = Math.round((quota ?? 0) / 1024 / 1024);
          quotaInfo = ` (${usageMb}/${quotaMb} MB belegt)`;
        }
      } catch {
        /* estimate is best-effort */
      }
      engineStore.setWebllmProgress(
        0,
        `Browser-Speicher voll${quotaInfo}. Lösung: DevTools → Application → Storage → "Clear site data" und ein kleineres Modell wählen (Llama 3.2 1B), oder Chrome/Firefox statt Brave nutzen.`
      );
    } else {
      engineStore.setWebllmProgress(0, `WebLLM Fehler: ${msg}`);
    }
    settingsStore.setWebllmEnabled(false);
    detector = null;
  }
}

/**
 * Unload WebLLM: dispose the detector, remove from pipeline, update stores.
 */
export async function unloadWebLlm(reAnalyze?: ReAnalyzeFn): Promise<void> {
  await disableWebLlm();
  detector = null;
  settingsStore.clearWebllmPreference();
  engineStore.setWebllmStatus('idle');
  engineStore.setWebllmProgress(0, '');

  if (reAnalyze) {
    await reAnalyze();
  }
}

/**
 * Returns true if a WebLLM detector is currently wired into the pipeline.
 */
export function isWebLlmActive(): boolean {
  return detector !== null;
}
