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
  /* eslint-disable no-console */
  console.log('[loadWebLlm] called', { modelId, currentStatus: engineStore.webllm.status });

  if (engineStore.webllm.status === 'loading' || engineStore.webllm.status === 'ready') {
    console.log('[loadWebLlm] early return — status is', engineStore.webllm.status);
    return;
  }

  engineStore.setWebllmStatus('loading');
  engineStore.setWebllmProgress(0, 'Initializing WebLLM engine…');
  console.log('[loadWebLlm] status set to loading, about to dynamic-import @de-pii/core/llm');

  try {
    // Dynamic import keeps @mlc-ai/web-llm out of the main bundle.
    const { WebLlmDetector } = await import('@de-pii/core/llm');
    console.log('[loadWebLlm] @de-pii/core/llm imported successfully');
    /* eslint-enable no-console */

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
    /* eslint-disable no-console */
    console.log('[loadWebLlm] constructing WebLlmDetector', { modelId });
    const webllmDetector = new WebLlmDetector({ modelId, onProgress, debug: true });
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
    /* eslint-enable no-console */

    if (reAnalyze) {
      await reAnalyze();
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    // eslint-disable-next-line no-console
    console.error('[loadWebLlm] FAILED', err);
    engineStore.setWebllmStatus('error');
    engineStore.setWebllmProgress(0, `WebLLM Fehler: ${msg}`);
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
