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
 *
 * Before dedup, two sanity filters run over all detector output:
 * - entities spanning a line break are dropped (no real PII value wraps lines)
 * - NER/LLM entities whose span starts or ends mid-word are dropped
 *   (tokenizer offset bugs produce these; regex spans are shape-anchored
 *   and exempt)
 *
 * After filtering, a name-propagation pass marks further occurrences of
 * already-confirmed person names (see `propagatePersonNames`).
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

/**
 * Words that are NOT name parts even when capitalized: salutation/role/legal
 * vocabulary plus common German/English function words that start sentences.
 * Used by the name-propagation pass to (a) reject stopword-only "names" and
 * (b) trim expansion at the edges of a propagated span.
 */
const NAME_STOPWORDS = new Set([
  'herr',
  'frau',
  'hr',
  'fr',
  'dr',
  'prof',
  'mag',
  'dipl',
  'familie',
  'firma',
  'team',
  'support',
  'service',
  'premium',
  'hotline',
  'kundenservice',
  'kundendienst',
  'empfang',
  'rezeption',
  'sekretariat',
  'reisebuero',
  'reisebüro',
  'schadenteam',
  'fuhrpark',
  'sales',
  'billing',
  'admin',
  'staff',
  'gmbh',
  'ag',
  'kg',
  'ohg',
  'consulting',
  'partners',
  'group',
  'solutions',
  'services',
  'holding',
  'logistik',
  'spedition',
  'systems',
  'technologies',
  'kundenbetreuung',
  'akademie',
  'institut',
  'verlag',
  'klinik',
  'hotel',
  'praxis',
  'kanzlei',
  'agentur',
  'zentrale',
  'januar',
  'februar',
  'märz',
  'april',
  'mai',
  'juni',
  'juli',
  'august',
  'september',
  'oktober',
  'november',
  'dezember',
  'schon',
  'bitte',
  'hallo',
  'danke',
  'sehr',
  'vielen',
  'viele',
  'mein',
  'meine',
  'meiner',
  'unser',
  'unsere',
  'ihre',
  'ihr',
  'ihren',
  'der',
  'die',
  'das',
  'dem',
  'den',
  'ein',
  'eine',
  'einen',
  'wir',
  'sie',
  'ich',
  'es',
  'und',
  'oder',
  'aber',
  'auch',
  'nur',
  'hier',
  'heute',
  'morgen',
  'gestern',
  'wenn',
  'weil',
  'dass',
  'mit',
  'von',
  'bei',
  'für',
  'als',
  'wie',
  'noch',
  'dann',
  'guten',
  'liebe',
  'lieber',
  'werte',
  'werter',
  'betreff',
  'datum',
  'geehrte',
  'geehrter',
  'hello',
  'hi',
  'dear',
  'please',
  'thanks',
  'best',
  'kind',
  'regards',
]);

/** A token qualifies as a propagatable name part: ≥3 chars, capitalized,
 * letters only, and not in the stopword list. */
function isNamePart(token: string): boolean {
  if (token.length < 3) return false;
  if (!/^[A-ZÄÖÜ][\p{L}äöüß]+$/u.test(token)) return false;
  return !NAME_STOPWORDS.has(token.toLowerCase());
}

/**
 * Name propagation: when a detector confirmed a multi-part person name
 * ("Sabine Hofmann"), other mentions of its parts ("Frau Hofmann schrieb…",
 * "Sabine antwortete…") are very likely the same person — but NER often
 * misses them outside of well-structured contexts. This pass scans the text
 * for capitalized word runs containing a known name part and emits them as
 * PERSON entities, expanding at most one non-stopword token to each side
 * (so "Sabine Hofmann-Berger" propagates fully, while "Hallo Sabine" only
 * captures "Sabine").
 */
function propagatePersonNames(text: string, entities: Entity[]): Entity[] {
  const nameParts = new Set<string>();
  for (const e of entities) {
    if (e.category !== 'person') continue;
    const parts = e.text
      .split(/[\s\-]+/)
      .map((p) => p.replace(/[.,;:]+$/u, ''))
      .filter(isNamePart);
    // Only multi-part names seed propagation — a single confirmed token is
    // too weak a signal to project across the whole document.
    if (parts.length < 2) continue;
    for (const p of parts) nameParts.add(p);
  }
  if (nameParts.size === 0) return entities;

  // Collect all capitalized tokens with offsets
  const tokens: Array<{ t: string; s: number; e: number }> = [];
  const tokenRe = /[A-ZÄÖÜ][\p{L}äöüß]+/gu;
  let m: RegExpExecArray | null;
  while ((m = tokenRe.exec(text)) !== null) {
    tokens.push({ t: m[0], s: m.index, e: m.index + m[0].length });
  }

  const propagated: Entity[] = [];
  let i = 0;
  while (i < tokens.length) {
    // Group adjacent tokens separated by exactly one space or hyphen
    let j = i;
    while (
      j + 1 < tokens.length &&
      tokens[j + 1]!.s - tokens[j]!.e === 1 &&
      (text[tokens[j]!.e] === ' ' || text[tokens[j]!.e] === '-')
    ) {
      j++;
    }
    const run = tokens.slice(i, j + 1);
    const hits = run.map((tok, idx) => (nameParts.has(tok.t) ? idx : -1)).filter((x) => x >= 0);
    if (hits.length > 0) {
      let lo = Math.max(0, hits[0]! - 1);
      let hi = Math.min(run.length - 1, hits[hits.length - 1]! + 1);
      // Don't absorb leading/trailing stopwords ("Hallo", "Frau", …)
      while (lo < hits[0]! && NAME_STOPWORDS.has(run[lo]!.t.toLowerCase())) lo++;
      while (hi > hits[hits.length - 1]! && NAME_STOPWORDS.has(run[hi]!.t.toLowerCase())) hi--;
      const start = run[lo]!.s;
      const end = run[hi]!.e;
      propagated.push({
        start,
        end,
        type: 'PERSON',
        category: 'person',
        text: text.slice(start, end),
        confidence: 0.75,
        source: 'manual',
      });
    }
    i = j + 1;
  }

  return propagated.length > 0 ? [...entities, ...propagated] : entities;
}

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
          'other',
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
    // Two-phase execution: fast deterministic detectors first (regex,
    // NER, anything not flagged 'llm'), then slow LLM detectors with the
    // first-phase results passed as hints. Lets the LLM focus on filling
    // gaps NER / regex may have missed instead of re-finding the same
    // entities. When no LLM detector is present this behaves the same as
    // a single Promise.all over everything.
    const isLlmDetector = (d: Detector) => d.name === 'webllm' || d.name === 'llm';
    const fastDetectors = this.detectors.filter((d) => !isLlmDetector(d));
    const llmDetectors = this.detectors.filter(isLlmDetector);

    const fastResults = await Promise.all(
      fastDetectors.map((d) => Promise.resolve(d.detect(text)))
    );
    const fastFlat: Entity[] = fastResults.flat();

    const llmResults = await Promise.all(
      llmDetectors.map((d) => Promise.resolve(d.detect(text, { priorEntities: fastFlat })))
    );

    // Flatten
    const all: Entity[] = [...fastFlat, ...llmResults.flat()];

    // Filter by category and type, plus two sanity checks on the spans
    const filtered = all.filter((e) => {
      // No real PII value wraps across a line break — multi-line spans are
      // detector artifacts (typically over-eager LLM spans).
      if (/[\r\n]/.test(e.text)) {
        return false;
      }
      // NER/LLM offsets can land mid-word (tokenizer artifacts). A span
      // bordered by a letter on either side is bogus. Regex spans are
      // shape-anchored (\b, lookarounds) and exempt — some legitimately
      // match sub-tokens (e.g. capture groups).
      if (e.source !== 'regex') {
        const before = e.start > 0 ? text[e.start - 1]! : '';
        const after = e.end < text.length ? text[e.end]! : '';
        if (/\p{L}/u.test(before) || /\p{L}/u.test(after)) {
          return false;
        }
      }
      if (this.enabledCategories !== null && !this.enabledCategories.has(e.category)) {
        return false;
      }
      if (this.disabledTypes.has(e.type)) {
        return false;
      }
      return true;
    });

    // Propagate confirmed person names to mentions the detectors missed,
    // then deduplicate and sort.
    const withPropagated = propagatePersonNames(text, filtered);
    const entities = deduplicate(withPropagated);

    return { text, entities };
  }
}
