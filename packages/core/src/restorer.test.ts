import { describe, it, expect } from 'vitest';
import { restore } from './restorer.js';
import { mask, createMapping } from './masker.js';
import type { Entity } from './types.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeEntity(
  text: string,
  start: number,
  type: Entity['type'],
  category: Entity['category'] = 'contact'
): Entity {
  return {
    start,
    end: start + text.length,
    type,
    category,
    text,
    confidence: 1,
    source: 'manual',
  };
}

// ---------------------------------------------------------------------------
// Strict round-trip tests
// ---------------------------------------------------------------------------

describe('restore — strict round-trips', () => {
  const cases: Array<[string, Entity[]]> = [
    ['Contact alice@example.com for details.', [makeEntity('alice@example.com', 8, 'EMAIL')]],
    ['Call +49 30 1234567 tomorrow.', [makeEntity('+49 30 1234567', 5, 'PHONE')]],
    ['Visit https://example.com for more.', [makeEntity('https://example.com', 6, 'URL')]],
    ['Server at 192.168.1.1 is down.', [makeEntity('192.168.1.1', 10, 'IP')]],
    [
      'Wire to DE89370400440532013000.',
      [makeEntity('DE89370400440532013000', 8, 'IBAN', 'financial')],
    ],
    ['Pay with 4111111111111111.', [makeEntity('4111111111111111', 9, 'CREDIT_CARD', 'financial')]],
    [
      'Token: ghp_1234567890abcdefghij1234567890.',
      [makeEntity('ghp_1234567890abcdefghij1234567890', 7, 'GITHUB_TOKEN', 'secret')],
    ],
    [
      'alice@example.com and bob@example.com',
      [makeEntity('alice@example.com', 0, 'EMAIL'), makeEntity('bob@example.com', 22, 'EMAIL')],
    ],
    [
      'Hello Alice, your IBAN is DE89370400440532013000.',
      [
        makeEntity('Alice', 6, 'PERSON', 'person'),
        makeEntity('DE89370400440532013000', 26, 'IBAN', 'financial'),
      ],
    ],
    [
      'alice@example.com appears twice: alice@example.com',
      [makeEntity('alice@example.com', 0, 'EMAIL'), makeEntity('alice@example.com', 33, 'EMAIL')],
    ],
  ];

  for (const [original, entities] of cases) {
    it(`round-trips: "${original.slice(0, 40)}..."`, () => {
      const { maskedText, mapping } = mask(original, entities);
      const { restoredText } = restore(maskedText, mapping);
      expect(restoredText).toBe(original);
    });
  }
});

// ---------------------------------------------------------------------------
// Tolerant matching
// ---------------------------------------------------------------------------

describe('restore — tolerant matching (default)', () => {
  it('restores [PERSON 1] (space instead of underscore)', () => {
    const mapping = createMapping();
    mapping.forward.set('[PERSON_1]', 'Alice');
    mapping.reverse.set('Alice', '[PERSON_1]');

    const { restoredText, restored } = restore('Hello [PERSON 1]!', mapping);
    expect(restoredText).toBe('Hello Alice!');
    expect(restored).toContain('[PERSON_1]');
  });

  it('restores <PERSON_1> (angle brackets)', () => {
    const mapping = createMapping();
    mapping.forward.set('[PERSON_1]', 'Alice');
    mapping.reverse.set('Alice', '[PERSON_1]');

    const { restoredText } = restore('Hello <PERSON_1>!', mapping);
    expect(restoredText).toBe('Hello Alice!');
  });

  it('restores {PERSON_1} (curly brackets)', () => {
    const mapping = createMapping();
    mapping.forward.set('[PERSON_1]', 'Alice');
    mapping.reverse.set('Alice', '[PERSON_1]');

    const { restoredText } = restore('Hello {PERSON_1}!', mapping);
    expect(restoredText).toBe('Hello Alice!');
  });

  it('restores bare PERSON_1 (no brackets)', () => {
    const mapping = createMapping();
    mapping.forward.set('[PERSON_1]', 'Alice');
    mapping.reverse.set('Alice', '[PERSON_1]');

    const { restoredText } = restore('Hello PERSON_1!', mapping);
    expect(restoredText).toBe('Hello Alice!');
  });

  it('does NOT restore MYPERSON_1 (longer identifier)', () => {
    const mapping = createMapping();
    mapping.forward.set('[PERSON_1]', 'Alice');
    mapping.reverse.set('Alice', '[PERSON_1]');

    const { restoredText } = restore('MYPERSON_1', mapping);
    expect(restoredText).toBe('MYPERSON_1');
  });
});

// ---------------------------------------------------------------------------
// Strict mode
// ---------------------------------------------------------------------------

describe('restore — strict mode', () => {
  it('only restores exact [PERSON_1], not variants', () => {
    const mapping = createMapping();
    mapping.forward.set('[PERSON_1]', 'Alice');
    mapping.reverse.set('Alice', '[PERSON_1]');

    const text = '[PERSON_1] <PERSON_1> {PERSON_1} [PERSON 1] PERSON_1';
    const { restoredText } = restore(text, mapping, { tolerant: false });
    // Only the first one should be restored
    expect(restoredText).toBe('Alice <PERSON_1> {PERSON_1} [PERSON 1] PERSON_1');
  });
});

// ---------------------------------------------------------------------------
// Unknown placeholder detection
// ---------------------------------------------------------------------------

describe('restore — unknown placeholder detection', () => {
  it('flags [PERSON_99] not in mapping as unknown', () => {
    const mapping = createMapping();
    mapping.forward.set('[PERSON_1]', 'Alice');
    mapping.reverse.set('Alice', '[PERSON_1]');

    const { unknown } = restore('[PERSON_1] wrote to [PERSON_99]', mapping);
    expect(unknown).toContain('[PERSON_99]');
    expect(unknown).not.toContain('[PERSON_1]');
  });

  it('returns empty unknown when no hallucinated placeholders', () => {
    const mapping = createMapping();
    mapping.forward.set('[PERSON_1]', 'Alice');
    mapping.reverse.set('Alice', '[PERSON_1]');

    const { unknown } = restore('Alice wrote something.', mapping);
    expect(unknown).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// Unused placeholder detection
// ---------------------------------------------------------------------------

describe('restore — unused placeholder detection', () => {
  it('flags [PERSON_2] when mapping has it but text does not', () => {
    const mapping = createMapping();
    mapping.forward.set('[PERSON_1]', 'Alice');
    mapping.reverse.set('Alice', '[PERSON_1]');
    mapping.forward.set('[PERSON_2]', 'Bob');
    mapping.reverse.set('Bob', '[PERSON_2]');

    const { unused, restored } = restore('Hello [PERSON_1]', mapping);
    expect(unused).toContain('[PERSON_2]');
    expect(restored).toContain('[PERSON_1]');
    expect(restored).not.toContain('[PERSON_2]');
  });
});

// ---------------------------------------------------------------------------
// Long text with 20+ placeholders
// ---------------------------------------------------------------------------

describe('restore — long text with many placeholders', () => {
  it('restores 20+ placeholders correctly', () => {
    // Build a text and mapping with 25 email placeholders
    const emails = Array.from({ length: 25 }, (_, i) => `user${i}@example.com`);
    const mapping = createMapping();
    const parts: string[] = [];
    for (let i = 0; i < emails.length; i++) {
      const placeholder = `[EMAIL_${i + 1}]`;
      mapping.forward.set(placeholder, emails[i]);
      mapping.reverse.set(emails[i], placeholder);
      parts.push(placeholder);
    }
    const maskedText = parts.join(' ');
    const originalText = emails.join(' ');

    const { restoredText, restored, unused } = restore(maskedText, mapping);
    expect(restoredText).toBe(originalText);
    expect(restored).toHaveLength(25);
    expect(unused).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// Multi-type restore
// ---------------------------------------------------------------------------

describe('restore — multi-type', () => {
  it('restores different entity types correctly', () => {
    const mapping = createMapping();
    mapping.forward.set('[PERSON_1]', 'Alice');
    mapping.forward.set('[EMAIL_1]', 'alice@example.com');
    mapping.forward.set('[IBAN_1]', 'DE89370400440532013000');
    mapping.reverse.set('Alice', '[PERSON_1]');
    mapping.reverse.set('alice@example.com', '[EMAIL_1]');
    mapping.reverse.set('DE89370400440532013000', '[IBAN_1]');

    const masked = 'Hi [PERSON_1], your email [EMAIL_1] has IBAN [IBAN_1].';
    const { restoredText } = restore(masked, mapping);
    expect(restoredText).toBe(
      'Hi Alice, your email alice@example.com has IBAN DE89370400440532013000.'
    );
  });
});
