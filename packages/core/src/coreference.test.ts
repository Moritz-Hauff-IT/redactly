import { describe, expect, it } from 'vitest';
import { linkCoreferences } from './coreference.js';
import { mask } from './masker.js';
import { restore } from './restorer.js';
import type { Entity } from './types.js';

function person(text: string, start: number): Entity {
  return {
    start,
    end: start + text.length,
    type: 'PERSON',
    category: 'person',
    text,
    confidence: 0.9,
    source: 'ner',
  };
}

describe('linkCoreferences', () => {
  it('finds bare re-mentions of a detected full name', () => {
    const text = 'Anna Schmidt kam. Anna war müde. Auch Schmidt blieb.';
    const found = linkCoreferences(text, [person('Anna Schmidt', 0)]);
    const texts = found.map((e) => e.text);
    expect(texts).toContain('Anna');
    expect(texts).toContain('Schmidt');
    // All carry the canonical link.
    expect(found.every((e) => e.canonical === 'Anna Schmidt')).toBe(true);
  });

  it('does not overlap the original full-name span', () => {
    const text = 'Anna Schmidt';
    expect(linkCoreferences(text, [person('Anna Schmidt', 0)])).toEqual([]);
  });

  it('ignores short tokens and matches whole words only', () => {
    // "Annahme" must not match the first name "Anna".
    const text = 'Anna Schmidt schrieb eine Annahme.';
    const found = linkCoreferences(text, [person('Anna Schmidt', 0)]);
    expect(found.every((e) => e.text === 'Anna' || e.text === 'Schmidt')).toBe(true);
    expect(found.some((e) => e.start >= 26)).toBe(false); // nothing inside "Annahme"
  });

  it('returns nothing without a multi-token name', () => {
    expect(linkCoreferences('just Anna here', [person('Anna', 5)])).toEqual([]);
  });
});

describe('mask() with coreference links', () => {
  it('gives linked mentions a shared-number placeholder and round-trips exactly', () => {
    const text = 'Anna Schmidt kam. Anna war müde.';
    const entities = [
      person('Anna Schmidt', 0),
      ...linkCoreferences(text, [person('Anna Schmidt', 0)]),
    ];
    const { maskedText, mapping } = mask(text, entities);
    expect(maskedText).toBe('[PERSON_1] kam. [PERSON_1_1] war müde.');
    expect(restore(maskedText, mapping, { tolerant: false }).restoredText).toBe(text);
  });

  it('reuses the same sub-placeholder for repeated mentions', () => {
    const text = 'Anna Schmidt, Anna und Anna.';
    const entities = [
      person('Anna Schmidt', 0),
      ...linkCoreferences(text, [person('Anna Schmidt', 0)]),
    ];
    const { maskedText } = mask(text, entities);
    expect(maskedText).toBe('[PERSON_1], [PERSON_1_1] und [PERSON_1_1].');
  });
});
