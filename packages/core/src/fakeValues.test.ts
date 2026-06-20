import { describe, expect, it } from 'vitest';
import { createFakeGenerator } from './fakeValues.js';
import { mask } from './masker.js';
import { restore } from './restorer.js';
import type { Entity } from './types.js';

function ent(start: number, end: number, type: Entity['type'], text: string): Entity {
  return { start, end, type, category: 'other', text, confidence: 1, source: 'manual' };
}

const gen = createFakeGenerator('[{PREFIX}_{N}]');

describe('createFakeGenerator', () => {
  it('produces realistic values for supported types', () => {
    expect(gen({ type: 'PERSON', prefix: 'PERSON', n: 1 })).toBe('Max Mustermann');
    expect(gen({ type: 'EMAIL', prefix: 'EMAIL', n: 1 })).toMatch(/@example\.com$/);
    expect(gen({ type: 'IP', prefix: 'IP', n: 1 })).toMatch(/^192\.0\.2\.\d+$/);
  });

  it('falls back to a placeholder for types without a realistic form', () => {
    expect(gen({ type: 'GENERIC_SECRET', prefix: 'SECRET', n: 2 })).toBe('[SECRET_2]');
  });
});

describe('mask() with fake values', () => {
  const text = 'Hallo Anna Schmidt, schreib an anna@x.com.';
  const entities = [ent(6, 18, 'PERSON', 'Anna Schmidt'), ent(31, 41, 'EMAIL', 'anna@x.com')];

  it('replaces entities with fake values and round-trips exactly', () => {
    const { maskedText, mapping } = mask(text, entities, { replacement: gen });
    expect(maskedText).toContain('Max Mustermann');
    expect(maskedText).not.toContain('Anna Schmidt');
    expect(maskedText).not.toContain('anna@x.com');
    const back = restore(maskedText, mapping, { tolerant: false }).restoredText;
    expect(back).toBe(text);
  });

  it('keeps fake values unique across incremental masks (no collision)', () => {
    const a = mask('Name: Anna Schmidt', [ent(6, 18, 'PERSON', 'Anna Schmidt')], {
      replacement: gen,
    });
    const b = mask('Name: Beat Weber', [ent(6, 16, 'PERSON', 'Beat Weber')], {
      replacement: gen,
      existing: a.mapping,
    });
    const names = [...b.mapping.forward.keys()];
    expect(new Set(names).size).toBe(names.length);
    expect(names).toContain('Max Mustermann');
    expect(names).toContain('Erika Mustermann');
  });
});

describe('mask() with a custom placeholder format', () => {
  it('round-trips a curly {{X_N}} format even in tolerant restore', () => {
    const text = 'Call Anna Schmidt';
    const { maskedText, mapping } = mask(text, [ent(5, 17, 'PERSON', 'Anna Schmidt')], {
      format: '{{{PREFIX}_{N}}}',
    });
    expect(maskedText).toBe('Call {{PERSON_1}}');
    expect(restore(maskedText, mapping, { tolerant: true }).restoredText).toBe(text);
  });
});
