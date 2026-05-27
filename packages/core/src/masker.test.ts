import { describe, it, expect } from 'vitest';
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
// createMapping
// ---------------------------------------------------------------------------

describe('createMapping', () => {
  it('returns empty maps', () => {
    const m = createMapping();
    expect(m.forward.size).toBe(0);
    expect(m.reverse.size).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// Allocation: same original → same placeholder
// ---------------------------------------------------------------------------

describe('mask — allocation', () => {
  it('same original → same placeholder', () => {
    // 'alice@example.com and alice@example.com'
    //  0                     22
    const text = 'alice@example.com and alice@example.com';
    const e1 = makeEntity('alice@example.com', 0, 'EMAIL');
    const e2 = makeEntity('alice@example.com', 22, 'EMAIL');
    const { maskedText, mapping } = mask(text, [e1, e2]);
    expect(maskedText).toBe('[EMAIL_1] and [EMAIL_1]');
    expect(mapping.forward.size).toBe(1);
    expect(mapping.forward.get('[EMAIL_1]')).toBe('alice@example.com');
  });

  it('different originals → different placeholders', () => {
    // 'alice@example.com and bob@example.com'
    //  0                     22
    const text = 'alice@example.com and bob@example.com';
    const e1 = makeEntity('alice@example.com', 0, 'EMAIL');
    const e2 = makeEntity('bob@example.com', 22, 'EMAIL');
    const { maskedText, mapping } = mask(text, [e1, e2]);
    expect(maskedText).toBe('[EMAIL_1] and [EMAIL_2]');
    expect(mapping.forward.size).toBe(2);
  });
});

// ---------------------------------------------------------------------------
// Per-prefix counters
// ---------------------------------------------------------------------------

describe('mask — per-prefix counters', () => {
  it('two emails and one person use separate counters', () => {
    // 'Hi John, contact alice@example.com or bob@example.com'
    //     3               17                  38
    const text = 'Hi John, contact alice@example.com or bob@example.com';
    const person = makeEntity('John', 3, 'PERSON', 'person');
    const email1 = makeEntity('alice@example.com', 17, 'EMAIL');
    const email2 = makeEntity('bob@example.com', 38, 'EMAIL');
    const { maskedText, mapping } = mask(text, [person, email1, email2]);
    expect(maskedText).toBe('Hi [PERSON_1], contact [EMAIL_1] or [EMAIL_2]');
    expect(mapping.forward.get('[PERSON_1]')).toBe('John');
    expect(mapping.forward.get('[EMAIL_1]')).toBe('alice@example.com');
    expect(mapping.forward.get('[EMAIL_2]')).toBe('bob@example.com');
  });
});

// ---------------------------------------------------------------------------
// Reuse via existing mapping
// ---------------------------------------------------------------------------

describe('mask — existing mapping reuse', () => {
  it('reuses placeholder for pre-seeded original', () => {
    const existing = createMapping();
    existing.forward.set('[PERSON_1]', 'Martin');
    existing.reverse.set('Martin', '[PERSON_1]');

    // 'Martin sent an email to alice@example.com'
    //  0                       24
    const text = 'Martin sent an email to alice@example.com';
    const eMail = makeEntity('alice@example.com', 24, 'EMAIL');
    const ePerson = makeEntity('Martin', 0, 'PERSON', 'person');

    const { maskedText, mapping } = mask(text, [eMail, ePerson], { existing });

    // Martin must still be [PERSON_1] — no [PERSON_2] allocated
    expect(maskedText).toBe('[PERSON_1] sent an email to [EMAIL_1]');
    expect(mapping.forward.get('[PERSON_1]')).toBe('Martin');
    // No [PERSON_2] in the forward map
    expect(mapping.forward.has('[PERSON_2]')).toBe(false);
  });

  it('extends the existing mapping without mutating the original', () => {
    const existing = createMapping();
    existing.forward.set('[EMAIL_1]', 'alice@example.com');
    existing.reverse.set('alice@example.com', '[EMAIL_1]');

    const text = 'bob@example.com';
    const e = makeEntity('bob@example.com', 0, 'EMAIL');
    const { mapping } = mask(text, [e], { existing });

    // New entry allocated as [EMAIL_2]
    expect(mapping.forward.get('[EMAIL_2]')).toBe('bob@example.com');
    // Original mapping NOT mutated
    expect(existing.forward.size).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// Secret types collapse to SECRET namespace
// ---------------------------------------------------------------------------

describe('mask — secret types', () => {
  it('JWT and GITHUB_TOKEN share the SECRET namespace', () => {
    const jwtToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjMifQ.abc';
    const ghToken = 'ghp_1234567890abcdefghij1234567890';
    // 'jwt=[jwtToken] gh=[ghToken]'
    // jwtToken at 4, ghToken at 4 + jwtToken.length + 4 = 67
    const text = `jwt=${jwtToken} gh=${ghToken}`;
    const jwtStart = 4;
    const ghStart = 4 + jwtToken.length + 4;
    const e1 = makeEntity(jwtToken, jwtStart, 'JWT', 'secret');
    const e2 = makeEntity(ghToken, ghStart, 'GITHUB_TOKEN', 'secret');
    const { maskedText, mapping } = mask(text, [e1, e2]);
    expect(maskedText).toBe('jwt=[SECRET_1] gh=[SECRET_2]');
    expect(mapping.forward.get('[SECRET_1]')).toBe(jwtToken);
    expect(mapping.forward.get('[SECRET_2]')).toBe(ghToken);
  });

  it('all secret types produce SECRET_ placeholders', () => {
    const secretTypes: Array<Entity['type']> = [
      'AWS_ACCESS_KEY',
      'AWS_SECRET_KEY',
      'GCP_KEY',
      'AZURE_KEY',
      'GITHUB_TOKEN',
      'SLACK_TOKEN',
      'STRIPE_KEY',
      'OPENAI_KEY',
      'ANTHROPIC_KEY',
      'JWT',
      'SSH_PRIVATE_KEY',
      'PGP_PRIVATE_KEY',
      'BEARER_TOKEN',
      'ENV_SECRET',
      'GENERIC_SECRET',
    ];

    // Build a text with one entity per secret type (unique values)
    const entries: string[] = secretTypes.map((t, i) => `${t}_val_${i}`);
    let text = entries.join(' ');
    let pos = 0;
    const entities: Entity[] = entries.map((val, i) => {
      const e = makeEntity(val, pos, secretTypes[i], 'secret');
      pos += val.length + 1;
      return e;
    });

    const { maskedText } = mask(text, entities);
    // All replacements should be [SECRET_N]
    expect(maskedText).toMatch(/^(\[SECRET_\d+\] *)+$/);
  });
});

// ---------------------------------------------------------------------------
// Custom prefix override
// ---------------------------------------------------------------------------

describe('mask — custom prefix', () => {
  it('overrides PERSON prefix with NAME', () => {
    // 'Hello Alice'  Alice at 6
    const text = 'Hello Alice';
    const e = makeEntity('Alice', 6, 'PERSON', 'person');
    const { maskedText, mapping } = mask(text, [e], {
      prefixes: { PERSON: 'NAME' },
    });
    expect(maskedText).toBe('Hello [NAME_1]');
    expect(mapping.forward.get('[NAME_1]')).toBe('Alice');
  });
});

// ---------------------------------------------------------------------------
// Custom format
// ---------------------------------------------------------------------------

describe('mask — custom format', () => {
  it('supports angle-bracket format <PREFIX{N}>', () => {
    const text = 'alice@example.com';
    const e = makeEntity('alice@example.com', 0, 'EMAIL');
    const { maskedText } = mask(text, [e], { format: '<{PREFIX}{N}>' });
    expect(maskedText).toBe('<EMAIL1>');
  });

  it('throws when format is missing {PREFIX}', () => {
    const text = 'alice@example.com';
    const e = makeEntity('alice@example.com', 0, 'EMAIL');
    expect(() => mask(text, [e], { format: '[NOPE_{N}]' })).toThrow('{PREFIX}');
  });

  it('throws when format is missing {N}', () => {
    const text = 'alice@example.com';
    const e = makeEntity('alice@example.com', 0, 'EMAIL');
    expect(() => mask(text, [e], { format: '[{PREFIX}_NOPE]' })).toThrow('{N}');
  });
});

// ---------------------------------------------------------------------------
// Empty entities short-circuits
// ---------------------------------------------------------------------------

describe('mask — empty entities', () => {
  it('returns original text unchanged with empty mapping when no entities', () => {
    const text = 'Nothing to see here.';
    const { maskedText, mapping } = mask(text, []);
    expect(maskedText).toBe(text);
    expect(mapping.forward.size).toBe(0);
  });

  it('returns original text unchanged with existing mapping preserved', () => {
    const existing = createMapping();
    existing.forward.set('[EMAIL_1]', 'alice@example.com');
    existing.reverse.set('alice@example.com', '[EMAIL_1]');
    const { maskedText, mapping } = mask('nothing', [], { existing });
    expect(maskedText).toBe('nothing');
    expect(mapping.forward.get('[EMAIL_1]')).toBe('alice@example.com');
  });
});

// ---------------------------------------------------------------------------
// Overlapping entities throws a clear error
// ---------------------------------------------------------------------------

describe('mask — overlapping entities', () => {
  it('throws a clear error for overlapping ranges', () => {
    const text = 'john.doe@example.com';
    // Overlapping: [0,20) contains [5,12)
    const outer = makeEntity('john.doe@example.com', 0, 'EMAIL');
    const inner = makeEntity('doe@exa', 5, 'EMAIL');
    expect(() => mask(text, [outer, inner])).toThrow('Overlapping entities');
  });

  it('does not throw for adjacent (non-overlapping) entities', () => {
    const text = 'Alice Bob';
    const e1 = makeEntity('Alice', 0, 'PERSON', 'person');
    const e2 = makeEntity('Bob', 6, 'PERSON', 'person');
    expect(() => mask(text, [e1, e2])).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// Multi-entity ordering
// ---------------------------------------------------------------------------

describe('mask — entity ordering', () => {
  it('correctly replaces entities regardless of input order', () => {
    // 'alice@example.com and bob@example.com'
    //  0                     22
    const text = 'alice@example.com and bob@example.com';
    const e1 = makeEntity('alice@example.com', 0, 'EMAIL');
    const e2 = makeEntity('bob@example.com', 22, 'EMAIL');
    // Pass in reverse order — masker must sort and assign _1 to leftmost
    const { maskedText } = mask(text, [e2, e1]);
    expect(maskedText).toBe('[EMAIL_1] and [EMAIL_2]');
  });
});
