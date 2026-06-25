/**
 * Coreference linking for person names.
 *
 * Detectors emit full names ("Anna Schmidt"), but later bare re-mentions
 * ("Anna", "Schmidt", "Frau Schmidt") often go undetected — a real leak, and
 * the masked text reads as several different people. This pass scans the text
 * for standalone occurrences of each detected full name's first/last token and
 * emits them as PERSON entities tagged with `canonical` = the full name. The
 * masker then gives them a placeholder that shares the primary's number
 * (PERSON_1 → PERSON_1_1), so the output is consistent and still round-trips.
 *
 * Conservative by design: only links to names a detector already found (never
 * invents people), only whole-word matches, and skips name tokens shorter than
 * three characters to avoid noise.
 */

import type { Entity } from './types.js';

const MIN_TOKEN = 3;
const PARTICLES = new Set(['von', 'van', 'de', 'der', 'den', 'zu', 'zur', 'del', 'la', 'di', 'da']);

function nameTokens(fullName: string): string[] {
  return fullName
    .split(/\s+/)
    .map((t) => t.trim())
    .filter((t) => t.length >= MIN_TOKEN && !PARTICLES.has(t.toLowerCase()) && /\p{L}/u.test(t));
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Given detector output, return additional PERSON entities for bare re-mentions
 * of detected full names. The returned entities never overlap each other or the
 * input entities, and each carries `canonical` pointing at its full name.
 */
export function linkCoreferences(text: string, entities: Entity[]): Entity[] {
  const fullNames = entities.filter((e) => e.type === 'PERSON' && nameTokens(e.text).length >= 2);
  if (fullNames.length === 0) return [];

  // Map each component token → the full name to link it to (first writer wins,
  // so an earlier-detected name takes precedence for an ambiguous token).
  const tokenToCanonical = new Map<string, string>();
  for (const fn of fullNames) {
    for (const tok of nameTokens(fn.text)) {
      const key = tok.toLowerCase();
      if (!tokenToCanonical.has(key)) tokenToCanonical.set(key, fn.text);
    }
  }

  // Spans already covered, so we never double-cover or overlap.
  const taken: Array<[number, number]> = entities.map((e) => [e.start, e.end]);
  const overlaps = (s: number, en: number) => taken.some(([a, b]) => s < b && a < en);

  const additions: Entity[] = [];
  for (const [token, canonical] of tokenToCanonical) {
    const re = new RegExp(`(?<![\\p{L}\\p{N}_])${escapeRegExp(token)}(?![\\p{L}\\p{N}_])`, 'giu');
    let m: RegExpExecArray | null;
    while ((m = re.exec(text)) !== null) {
      const start = m.index;
      const end = start + m[0].length;
      if (overlaps(start, end)) continue;
      additions.push({
        start,
        end,
        type: 'PERSON',
        category: 'person',
        text: text.slice(start, end),
        confidence: 0.6,
        source: 'regex',
        canonical,
      });
      taken.push([start, end]);
    }
  }

  additions.sort((a, b) => a.start - b.start);
  return additions;
}
