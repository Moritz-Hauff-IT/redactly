import { Pipeline } from '@de-pii/core/pipeline';
import { RegexDetector } from '@de-pii/core/regex';
import type { Entity, EntityCategory } from '@de-pii/core/types';
import type { Detector } from '@de-pii/core/types';
import { settingsStore } from '$lib/stores/settingsStore.svelte.js';

/** Minimal public interface we need from NerDetector — avoids importing the class directly. */
export interface NerDetectorLike extends Detector {
  ready(): Promise<void>;
  dispose(): Promise<void>;
}

/** Minimal public interface we need from WebLlmDetector — avoids importing the class directly. */
export interface WebLlmDetectorLike extends Detector {
  ready(): Promise<void>;
  dispose(): Promise<void>;
}

let nerDetector: NerDetectorLike | null = null;
let webllmDetector: WebLlmDetectorLike | null = null;

function buildPipeline(): Pipeline {
  const detectors: Detector[] = [new RegexDetector()];
  if (nerDetector !== null) {
    detectors.push(nerDetector);
  }
  // WebLLM only enters the text-PII pipeline when the user explicitly opts in
  // (Settings → "WebLLM auch für Text-PII"). By default, an active WebLLM is
  // reserved for orchestration tasks (file routing, plan generation) where
  // small-LLM strengths fit better than primary entity extraction.
  if (webllmDetector !== null && settingsStore.webllmTextPii) {
    detectors.push(webllmDetector);
  }
  const cats = [...settingsStore.enabledCategories] as EntityCategory[];
  return new Pipeline({
    detectors,
    enabledCategories: cats.length > 0 ? cats : undefined,
    disabledTypes: [],
  });
}

let pipeline: Pipeline = buildPipeline();

export function getPipeline(): Pipeline {
  return pipeline;
}

/**
 * Analyze text for PII entities using the current pipeline configuration.
 */
export async function analyze(text: string): Promise<Entity[]> {
  console.log('[pipeline.analyze] called', {
    textLength: text.length,
    nerDetectorPresent: nerDetector !== null,
    webllmDetectorPresent: webllmDetector !== null,
  });

  const result = await getPipeline().analyze(text);

  console.log('[pipeline.analyze] returned', { entityCount: result.entities.length });
  return result.entities;
}

/**
 * Add a NER detector to the pipeline. Call after `detector.ready()` resolves.
 */
export async function enableNer(detector: NerDetectorLike): Promise<void> {
  nerDetector = detector;
  pipeline = buildPipeline();
}

/**
 * Remove the NER detector from the pipeline and dispose it.
 */
export async function disableNer(): Promise<void> {
  if (nerDetector !== null) {
    await nerDetector.dispose();
    nerDetector = null;
  }
  pipeline = buildPipeline();
}

/**
 * Add a WebLLM detector to the pipeline. Call after `detector.ready()` resolves.
 */
export async function enableWebLlm(detector: WebLlmDetectorLike): Promise<void> {
  webllmDetector = detector;
  pipeline = buildPipeline();
}

/**
 * Remove the WebLLM detector from the pipeline and dispose it.
 */
export async function disableWebLlm(): Promise<void> {
  if (webllmDetector !== null) {
    await webllmDetector.dispose();
    webllmDetector = null;
  }
  pipeline = buildPipeline();
}

/**
 * Rebuild the pipeline with updated category filters (keeps existing detectors).
 */
export function applyCategoryFilter(_enabled: EntityCategory[]): void {
  pipeline = buildPipeline();
}
