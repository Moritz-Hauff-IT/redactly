import { describe, expect, it } from 'vitest';
import { findCustomTypeMatches, labelToPrefix } from './customTypes.js';
import { mask } from './masker.js';
import type { Entity } from './types.js';

describe('labelToPrefix', () => {
  it('sanitises a label into an uppercase prefix', () => {
    expect(labelToPrefix('Kundennummer')).toBe('KUNDENNUMMER');
    expect(labelToPrefix('Kunden-Nr.')).toBe('KUNDEN_NR');
    expect(labelToPrefix('  ')).toBe('CUSTOM');
  });
});

describe('findCustomTypeMatches', () => {
  it('matches a custom pattern and derives the prefix from the label', () => {
    const out = findCustomTypeMatches('Kunde KND-4711 und KND-0815', [
      { label: 'Kundennummer', pattern: 'KND-\\d+' },
    ]);
    expect(out.map((m) => m.text)).toEqual(['KND-4711', 'KND-0815']);
    expect(out[0]!.prefix).toBe('KUNDENNUMMER');
  });

  it('masks capture group 1 when present', () => {
    const out = findCustomTypeMatches('ticket: ABC-9', [
      { label: 'Ticket', pattern: 'ticket: (\\S+)' },
    ]);
    expect(out[0]!.text).toBe('ABC-9');
  });

  it('ignores invalid patterns', () => {
    expect(findCustomTypeMatches('x', [{ label: 'Bad', pattern: '(unclosed' }])).toEqual([]);
  });
});

describe('mask() honours a custom prefix', () => {
  it('uses the entity prefix override for the placeholder', () => {
    const text = 'Kunde KND-4711';
    const e: Entity = {
      start: 6,
      end: 14,
      type: 'OTHER_PII',
      category: 'other',
      text: 'KND-4711',
      confidence: 1,
      source: 'manual',
      prefix: 'KUNDENNUMMER',
    };
    expect(mask(text, [e]).maskedText).toBe('Kunde [KUNDENNUMMER_1]');
  });
});
