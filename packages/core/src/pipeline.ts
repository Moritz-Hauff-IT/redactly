/**
 * Pipeline orchestrator — runs multiple detectors, deduplicates overlapping
 * entities and filters by category / type.
 *
 * Overlap resolution rules (in priority order):
 * 1. JWT vs BEARER_TOKEN at same span → keep JWT
 * 2. EMAIL fully inside URL span → keep URL
 * 3. PHONE overlapping with a financial entity (IBAN, CREDIT_CARD, etc.) → keep financial
 * 4. Same (start, end): keep higher confidence; tie-break: prefer non-regex source
 * 5. Generic overlap: keep longer span; tie-break: higher confidence
 */

import type { Detector, Entity, EntityCategory, EntityType } from './types.js';

export interface PipelineOptions {
  detectors: Detector[];
  /** Categories to enable. If undefined, all categories are enabled. */
  enabledCategories?: EntityCategory[];
  /** EntityTypes to suppress even if their category is enabled. */
  disabledTypes?: EntityType[];
}

export interface PipelineResult {
  /** Original input text (unchanged). */
  text: string;
  /** Deduplicated entities sorted by start position ascending. */
  entities: Entity[];
}

const FINANCIAL_TYPES = new Set<EntityType>(['IBAN', 'BIC', 'CREDIT_CARD', 'TAX_ID_DE', 'VAT_ID']);

function overlaps(a: Entity, b: Entity): boolean {
  return a.start < b.end && b.start < a.end;
}

function sourcePriority(source: Entity['source']): number {
  // Lower is better when confidence is tied
  switch (source) {
    case 'manual':
      return 0;
    case 'llm':
      return 1;
    case 'ner':
      return 2;
    case 'regex':
      return 3;
  }
}

/**
 * Given two overlapping entities, decide which one to keep.
 * Returns `true` if `a` wins, `false` if `b` wins.
 */
function aBeatsB(a: Entity, b: Entity): boolean {
  // Rule 1 — JWT vs BEARER_TOKEN at same span: keep JWT
  if (a.type === 'JWT' && b.type === 'BEARER_TOKEN') return true;
  if (b.type === 'JWT' && a.type === 'BEARER_TOKEN') return false;

  // Rule 2 — EMAIL fully inside URL: keep URL
  if (a.type === 'URL' && b.type === 'EMAIL' && b.start >= a.start && b.end <= a.end) return true;
  if (b.type === 'URL' && a.type === 'EMAIL' && a.start >= b.start && a.end <= b.end) return false;

  // Rule 3 — PHONE overlapping financial: keep financial
  if (a.type === 'PHONE' && FINANCIAL_TYPES.has(b.type)) return false;
  if (b.type === 'PHONE' && FINANCIAL_TYPES.has(a.type)) return true;

  // Rule 4 — Identical span: higher confidence wins; tie: prefer non-regex
  if (a.start === b.start && a.end === b.end) {
    if (a.confidence !== b.confidence) return a.confidence > b.confidence;
    return sourcePriority(a.source) < sourcePriority(b.source);
  }

  // Rule 5 — Generic: longer span wins; tie: higher confidence
  const aLen = a.end - a.start;
  const bLen = b.end - b.start;
  if (aLen !== bLen) return aLen > bLen;
  return a.confidence >= b.confidence;
}

/**
 * Deduplicate a flat array of entities using the priority rules above.
 * Returns a new sorted array with all overlaps resolved.
 */
function deduplicate(entities: Entity[]): Entity[] {
  // Sort by start ascending, then by span length descending (greedy approach)
  const sorted = [...entities].sort((a, b) => {
    if (a.start !== b.start) return a.start - b.start;
    return b.end - b.start - (a.end - a.start);
  });

  const kept: Entity[] = [];

  for (const candidate of sorted) {
    let dominated = false;

    for (let i = kept.length - 1; i >= 0; i--) {
      const existing = kept[i]!;

      // Once we're past the candidate's start, no earlier kept entity can
      // overlap (they're sorted by start) — but an earlier one might extend
      // past candidate.start, so we check all that could overlap.
      if (existing.end <= candidate.start) break;

      if (overlaps(existing, candidate)) {
        if (aBeatsB(existing, candidate)) {
          // The existing entity wins — skip this candidate
          dominated = true;
          break;
        } else {
          // The candidate wins — remove the existing entity
          kept.splice(i, 1);
        }
      }
    }

    if (!dominated) {
      kept.push(candidate);
      // Re-sort kept array by start for correct overlap detection on next iteration
      kept.sort((a, b) => a.start - b.start);
    }
  }

  return kept.sort((a, b) => a.start - b.start);
}

export class Pipeline {
  private detectors: Detector[];
  private enabledCategories: Set<EntityCategory> | null;
  private disabledTypes: Set<EntityType>;

  constructor(options: PipelineOptions) {
    this.detectors = options.detectors;
    this.enabledCategories = options.enabledCategories ? new Set(options.enabledCategories) : null;
    this.disabledTypes = options.disabledTypes ? new Set(options.disabledTypes) : new Set();
  }

  /**
   * Enable or disable a whole category for subsequent `analyze()` calls.
   */
  toggle(category: EntityCategory, enabled: boolean): void {
    if (enabled) {
      if (this.enabledCategories === null) {
        // All categories were enabled — removing one means we need explicit set
        // Just ensure it's not removed (nothing to do)
        return;
      }
      this.enabledCategories.add(category);
    } else {
      if (this.enabledCategories === null) {
        // Build explicit set of all categories minus this one
        const ALL: EntityCategory[] = [
          'contact',
          'person',
          'organization',
          'address',
          'financial',
          'identity',
          'secret',
        ];
        this.enabledCategories = new Set(ALL.filter((c) => c !== category));
      } else {
        this.enabledCategories.delete(category);
      }
    }
  }

  /**
   * Enable or disable a specific entity type for subsequent `analyze()` calls.
   */
  toggleType(type: EntityType, enabled: boolean): void {
    if (enabled) {
      this.disabledTypes.delete(type);
    } else {
      this.disabledTypes.add(type);
    }
  }

  /**
   * Run all detectors on the given text, deduplicate, filter, and return
   * sorted entities.
   */
  async analyze(text: string): Promise<PipelineResult> {
    // Run all detectors concurrently
    const rawResults = await Promise.all(
      this.detectors.map((d) => Promise.resolve(d.detect(text)))
    );

    // Flatten
    const all: Entity[] = rawResults.flat();

    // Filter by category and type
    const filtered = all.filter((e) => {
      if (this.enabledCategories !== null && !this.enabledCategories.has(e.category)) {
        return false;
      }
      if (this.disabledTypes.has(e.type)) {
        return false;
      }
      return true;
    });

    // Deduplicate and sort
    const entities = deduplicate(filtered);

    return { text, entities };
  }
}
