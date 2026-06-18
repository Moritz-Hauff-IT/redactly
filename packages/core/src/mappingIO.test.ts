import { describe, it, expect } from 'vitest';
import { createMapping, serializeMapping, deserializeMapping } from './masker.js';

function makeMapping(pairs: [string, string][]) {
  const m = createMapping();
  for (const [ph, orig] of pairs) {
    m.forward.set(ph, orig);
    if (!m.reverse.has(orig)) m.reverse.set(orig, ph);
  }
  return m;
}

describe('mapping serialization', () => {
  it('round-trips forward + reverse entries', () => {
    const original = makeMapping([
      ['[PERSON_1]', 'Martin Müller'],
      ['[EMAIL_1]', 'martin@example.com'],
      ['[IBAN_1]', 'DE89370400440532013000'],
    ]);
    const restored = deserializeMapping(serializeMapping(original));

    expect([...restored.forward.entries()]).toEqual([...original.forward.entries()]);
    expect(restored.reverse.get('Martin Müller')).toBe('[PERSON_1]');
    expect(restored.reverse.get('martin@example.com')).toBe('[EMAIL_1]');
  });

  it('rejects non-JSON', () => {
    expect(() => deserializeMapping('not json {')).toThrow();
  });

  it('rejects JSON without the redactly format marker', () => {
    expect(() => deserializeMapping(JSON.stringify({ entries: [['a', 'b']] }))).toThrow(
      /Redactly-Mapping/
    );
  });

  it('rejects an empty mapping', () => {
    expect(() =>
      deserializeMapping(JSON.stringify({ format: 'redactly-mapping', version: 1, entries: [] }))
    ).toThrow(/leer/);
  });

  it('skips malformed entry pairs but keeps valid ones', () => {
    const json = JSON.stringify({
      format: 'redactly-mapping',
      version: 1,
      entries: [['[PERSON_1]', 'Anna'], ['bad'], [1, 2], ['[EMAIL_1]', 'a@b.test']],
    });
    const m = deserializeMapping(json);
    expect(m.forward.size).toBe(2);
    expect(m.forward.get('[PERSON_1]')).toBe('Anna');
    expect(m.forward.get('[EMAIL_1]')).toBe('a@b.test');
  });
});
