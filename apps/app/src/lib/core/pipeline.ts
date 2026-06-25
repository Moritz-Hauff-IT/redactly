import { Pipeline } from '@redactly/core/pipeline';
import { RegexDetector } from '@redactly/core/regex';
import { GazetteerNameDetector } from '@redactly/core/gazetteer';
import type { Entity, EntityCategory } from '@redactly/core/types';
import type { Detector } from '@redactly/core/types';
import { findStructuralSpans } from '@redactly/core/structural';
import { linkCoreferences } from '@redactly/core/coreference';
import { settingsStore } from '$lib/stores/settingsStore.svelte.js';
import { tableMaskStore } from '$lib/stores/tableMaskStore.svelte.js';

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
  // Regex + the model-free name gazetteer run by default so regex-only users
  // (no NER download) still catch common DACH "First Last" names.
  const detectors: Detector[] = [new RegexDetector(), new GazetteerNameDetector()];
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
 * The always-mask list combines the user's settings terms with the values of
 * any columns picked at upload time (CSV/Excel column masking).
 * Added spans never overlap existing or each other (the masker requires it).
 */
function applyCustomTerms(text: string, entities: Entity[]): Entity[] {
  const never = new Set(settingsStore.neverMask.map((t) => t.trim().toLowerCase()));
  let result =
    never.size > 0 ? entities.filter((e) => !never.has(e.text.trim().toLowerCase())) : entities;

  const always = [...settingsStore.alwaysMask, ...tableMaskStore.maskValues];
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
 * Apply structural always-mask rules (CSV/TSV columns, JSON keys, custom
 * regex) on top of detector + custom-term output. Resolved spans become
 * manual entities wherever they don't overlap something already detected.
 */
function applyStructuralRules(text: string, entities: Entity[]): Entity[] {
  const rules = {
    columns: settingsStore.columnRules,
    jsonKeys: settingsStore.jsonKeyRules,
    regexes: settingsStore.regexRules,
  };
  if (rules.columns.length === 0 && rules.jsonKeys.length === 0 && rules.regexes.length === 0) {
    return entities;
  }

  const spans = findStructuralSpans(text, rules);
  if (spans.length === 0) return entities;

  const taken: Array<[number, number]> = entities.map((e) => [e.start, e.end]);
  const overlaps = (s: number, en: number) => taken.some(([a, b]) => s < b && a < en);
  const additions: Entity[] = [];
  for (const sp of spans) {
    if (overlaps(sp.start, sp.end)) continue;
    additions.push({
      start: sp.start,
      end: sp.end,
      type: 'OTHER_PII',
      category: 'other',
      text: sp.text,
      confidence: 1,
      source: 'manual',
    });
    taken.push([sp.start, sp.end]);
  }
  if (additions.length === 0) return entities;
  const result = [...entities, ...additions];
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
  // Sensitivity threshold: drop low-confidence detector hits. Manual / custom
  // entities (confidence 1) always pass; applyCustomTerms adds them afterwards.
  const minConf = settingsStore.minConfidence;
  const filtered =
    minConf > 0 ? result.entities.filter((e) => e.confidence >= minConf) : result.entities;
  let entities = applyStructuralRules(text, applyCustomTerms(text, filtered));

  // Coreference: link bare re-mentions of detected full names ("Anna" after
  // "Anna Schmidt"). Catches partial-name leaks and keeps the masked text
  // consistent. Only links to names already found, so it can't invent people.
  const coref = linkCoreferences(text, entities);
  if (coref.length > 0) {
    entities = [...entities, ...coref].sort((a, b) => a.start - b.start || b.end - a.end);
  }

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
