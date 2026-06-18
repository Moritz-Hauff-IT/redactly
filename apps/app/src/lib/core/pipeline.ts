import { Pipeline } from '@redactly/core/pipeline';
import { RegexDetector } from '@redactly/core/regex';
import type { Entity, EntityCategory } from '@redactly/core/types';
import type { Detector } from '@redactly/core/types';
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
 * Apply the user's custom term lists on top of detector output:
 * - drop any entity whose text matches a "never mask" term (false positives);
 * - add a manual entity for every occurrence of an "always mask" term that
 *   isn't already covered, so domain-specific words (codenames, client
 *   names, …) the detectors can't know about still get masked.
 * Added spans never overlap existing or each other (the masker requires it).
 */
function applyCustomTerms(text: string, entities: Entity[]): Entity[] {
  const never = new Set(settingsStore.neverMask.map((t) => t.trim().toLowerCase()));
  let result =
    never.size > 0 ? entities.filter((e) => !never.has(e.text.trim().toLowerCase())) : entities;

  const always = settingsStore.alwaysMask;
  if (always.length === 0) return result;

  const spans: Array<[number, number]> = result.map((e) => [e.start, e.end]);
  const overlaps = (s: number, en: number) => spans.some(([a, b]) => s < b && a < en);
  const lower = text.toLowerCase();
  const additions: Entity[] = [];

  for (const raw of always) {
    const term = raw.trim();
    if (!term) continue;
    const needle = term.toLowerCase();
    let from = 0;
    for (;;) {
      const idx = lower.indexOf(needle, from);
      if (idx === -1) break;
      const end = idx + term.length;
      if (!overlaps(idx, end)) {
        additions.push({
          start: idx,
          end,
          type: 'OTHER_PII',
          category: 'other',
          text: text.slice(idx, end),
          confidence: 1,
          source: 'manual',
        });
        spans.push([idx, end]);
      }
      from = idx + term.length;
    }
  }

  if (additions.length === 0) return result;
  result = [...result, ...additions];
  result.sort((a, b) => a.start - b.start || b.end - a.end);
  return result;
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
  const entities = applyCustomTerms(text, result.entities);

  console.log('[pipeline.analyze] returned', { entityCount: entities.length });
  return entities;
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
