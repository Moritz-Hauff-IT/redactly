/**
 * Shared NER load/unload flow used by both the Settings page button and
 * the root layout auto-load (when the user previously enabled NER).
 *
 * The NerDetector class is only imported dynamically so it stays out of the
 * main bundle — this is the code-split boundary.
 */

import { engineStore } from '$lib/stores/engineStore.svelte.js';
import { settingsStore } from '$lib/stores/settingsStore.svelte.js';
import { enableNer, disableNer } from '$lib/core/pipeline.js';
import type { NerDetectorLike } from '$lib/core/pipeline.js';
import type { NerProgressEvent } from '@redactly/core/ner';

/** Re-analyze callback — injected by the page so we don't depend on a global store. */
export type ReAnalyzeFn = () => Promise<void> | void;

/**
 * Load NER model, wire it into the pipeline, and trigger re-analysis.
 *
 * @param reAnalyze — called once NER is ready so the current input is re-processed.
 */
export async function loadNer(reAnalyze?: ReAnalyzeFn): Promise<void> {
  if (engineStore.status === 'loading' || engineStore.status === 'ready') {
    return;
  }

  engineStore.setStatus('loading');
  engineStore.setProgress(0, 'Loading NER model…');

  // Tracks whether the load has terminated (success or error). Once true
  // we silence late-arriving progress callbacks so they can't overwrite
  // an error message with a stale "NER model ready" string after the
  // download completes but pipeline init throws downstream.
  let terminated = false;

  try {
    // Dynamic import keeps @huggingface/transformers out of the main bundle.
    const { NerDetector } = await import('@redactly/core/ner');

    const onProgress = (event: NerProgressEvent): void => {
      if (terminated) return;
      if (event.status === 'download' || event.status === 'progress') {
        engineStore.setProgress(event.progress / 100, `Downloading ${event.file}…`);
      } else if (event.status === 'ready') {
        engineStore.setProgress(1, `Loaded ${event.file}`);
      } else if (event.status === 'done') {
        engineStore.setProgress(1, 'NER model ready');
      }
    };

    // debug: true → logs raw entity counts + dropped-by-reason to the console
    // on every detect() call. Helps diagnose detection issues during alpha.
    const detector = new NerDetector({
      onProgress,
      debug: true,
    }) as unknown as NerDetectorLike;

    await detector.ready();
    await enableNer(detector);

    settingsStore.setNerEnabled(true);
    engineStore.setStatus('ready');
    engineStore.setProgress(1, 'NER ready');
    terminated = true;

    if (reAnalyze) {
      await reAnalyze();
    }
  } catch (err) {
    terminated = true;
    const msg = err instanceof Error ? err.message : String(err);
    // eslint-disable-next-line no-console
    console.error('[nerLoader] load failed', err);
    engineStore.setStatus('error');
    engineStore.setProgress(0, msg || 'unknown error — see console');
    settingsStore.setNerEnabled(false);
  }
}

/**
 * Unload NER: dispose the detector, remove from pipeline, update stores.
 */
export async function unloadNer(reAnalyze?: ReAnalyzeFn): Promise<void> {
  await disableNer();
  settingsStore.clearNerPreference();
  engineStore.setStatus('idle');
  engineStore.setProgress(0, '');

  if (reAnalyze) {
    await reAnalyze();
  }
}
