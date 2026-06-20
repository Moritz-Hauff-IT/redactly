/**
 * GazetteerNameDetector — lightweight, model-free person-name detection.
 *
 * NER catches free-text names but needs a ~140 MB model download; first-time
 * visitors run regex-only and miss most names. This detector closes part of
 * that gap with a curated list of common DACH first names: when a known first
 * name is immediately followed by a capitalized word (optionally a noble
 * particle like "von"), the pair is almost certainly a person — "Anna Schmidt",
 * "Ludwig van Beethoven". That two-token shape keeps precision high; bare
 * first names (already handled by the salutation regex) are intentionally not
 * emitted here to avoid false positives on common words.
 *
 * It runs synchronously in the default pipeline, so regex-only users get
 * markedly better name recall with no download. NER / WebLLM, when enabled,
 * add the harder cases and the pipeline dedupes overlaps.
 */

import type { Detector, Entity } from '../types.js';
import { FIRST_NAMES, SURNAMES } from './gazetteer-data.js';

/** Lowercase particles allowed between first and last name. */
const PARTICLES = new Set(['von', 'van', 'de', 'der', 'den', 'zu', 'zur', 'del', 'la', 'di', 'da']);

interface Token {
  text: string;
  start: number;
  end: number;
}

function isCapitalized(t: string): boolean {
  const c = t[0];
  return c !== undefined && c === c.toUpperCase() && c !== c.toLowerCase();
}

export class GazetteerNameDetector implements Detector {
  readonly name = 'regex';

  detect(text: string): Entity[] {
    const tokens: Token[] = [];
    for (const m of text.matchAll(/\p{L}+(?:[-'’]\p{L}+)*/gu)) {
      const start = m.index ?? 0;
      tokens.push({ text: m[0], start, end: start + m[0].length });
    }

    const out: Entity[] = [];
    for (let i = 0; i < tokens.length; i++) {
      const first = tokens[i]!;
      if (!isCapitalized(first.text) || !FIRST_NAMES.has(first.text.toLowerCase())) continue;

      // Optional particle, then a capitalized surname token.
      let lastIdx = i + 1;
      if (
        tokens[lastIdx] &&
        PARTICLES.has(tokens[lastIdx]!.text.toLowerCase()) &&
        tokens[lastIdx + 1] &&
        isCapitalized(tokens[lastIdx + 1]!.text)
      ) {
        lastIdx = i + 2;
      }
      const last = tokens[lastIdx];
      if (!last || !isCapitalized(last.text) || FIRST_NAMES.has(last.text.toLowerCase())) {
        // No surname-shaped token follows (or the next token is itself a first
        // name, e.g. "Anna Maria" — ambiguous, skip to stay precise).
        continue;
      }

      const known = SURNAMES.has(last.text.toLowerCase());
      out.push({
        start: first.start,
        end: last.end,
        type: 'PERSON',
        category: 'person',
        text: text.slice(first.start, last.end),
        confidence: known ? 0.8 : 0.7,
        source: 'regex',
      });
      i = lastIdx; // don't re-scan tokens already consumed by this name
    }
    return out;
  }
}
