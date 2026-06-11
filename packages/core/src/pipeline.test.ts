import { describe, it, expect, vi } from 'vitest';
import { Pipeline } from './pipeline.js';
import type { Entity, Detector } from './types.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeEntity(
  overrides: Partial<Entity> & { start: number; end: number; type: Entity['type'] }
): Entity {
  return {
    category: 'contact',
    text: 'x'.repeat(overrides.end - overrides.start),
    confidence: 0.9,
    source: 'regex',
    ...overrides,
  };
}

function stubDetector(name: string, entities: Entity[]): Detector {
  return {
    name,
    detect: vi.fn().mockResolvedValue(entities),
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Pipeline — basic aggregation', () => {
  it('combines non-overlapping entities from two detectors', async () => {
    const d1 = stubDetector('d1', [makeEntity({ start: 0, end: 5, type: 'EMAIL' })]);
    const d2 = stubDetector('d2', [makeEntity({ start: 10, end: 15, type: 'PHONE' })]);

    const pipeline = new Pipeline({ detectors: [d1, d2] });
    const { entities } = await pipeline.analyze('hello world test');

    expect(entities).toHaveLength(2);
    expect(entities[0]!.type).toBe('EMAIL');
    expect(entities[1]!.type).toBe('PHONE');
  });

  it('returns entities sorted by start position', async () => {
    const d1 = stubDetector('d1', [
      makeEntity({ start: 20, end: 25, type: 'IP' }),
      makeEntity({ start: 0, end: 5, type: 'EMAIL' }),
    ]);

    const pipeline = new Pipeline({ detectors: [d1] });
    const { entities } = await pipeline.analyze('some text');

    expect(entities[0]!.start).toBe(0);
    expect(entities[1]!.start).toBe(20);
  });
});

describe('Pipeline — same-span deduplication', () => {
  it('keeps the entity with higher confidence when spans are identical', async () => {
    const low = makeEntity({
      start: 0,
      end: 10,
      type: 'EMAIL',
      confidence: 0.7,
      source: 'regex',
    });
    const high = makeEntity({
      start: 0,
      end: 10,
      type: 'EMAIL',
      confidence: 0.95,
      source: 'regex',
    });

    const pipeline = new Pipeline({ detectors: [stubDetector('d1', [low, high])] });
    const { entities } = await pipeline.analyze('some@text.com');

    expect(entities).toHaveLength(1);
    expect(entities[0]!.confidence).toBe(0.95);
  });

  it('prefers non-regex source when confidence is tied', async () => {
    // Span must cover the full token — non-regex entities ending mid-word
    // are dropped by the word-boundary sanity filter.
    const regexEnt = makeEntity({
      start: 0,
      end: 13,
      type: 'EMAIL',
      confidence: 0.9,
      source: 'regex',
    });
    const nerEnt = makeEntity({
      start: 0,
      end: 13,
      type: 'EMAIL',
      confidence: 0.9,
      source: 'ner',
    });

    const pipeline = new Pipeline({ detectors: [stubDetector('d1', [regexEnt, nerEnt])] });
    const { entities } = await pipeline.analyze('some@text.com');

    expect(entities).toHaveLength(1);
    expect(entities[0]!.source).toBe('ner');
  });
});

describe('Pipeline — documented overlap rules', () => {
  it('JWT beats BEARER_TOKEN when spans are identical', async () => {
    const token = 'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJ1c2VyIn0.abc';
    const jwt = makeEntity({
      start: 0,
      end: token.length,
      type: 'JWT',
      category: 'secret',
      confidence: 0.98,
      source: 'regex',
      text: token,
    });
    const bearer = makeEntity({
      start: 0,
      end: token.length,
      type: 'BEARER_TOKEN',
      category: 'secret',
      confidence: 0.85,
      source: 'regex',
      text: token,
    });

    const pipeline = new Pipeline({ detectors: [stubDetector('d1', [jwt, bearer])] });
    const { entities } = await pipeline.analyze(token);

    expect(entities).toHaveLength(1);
    expect(entities[0]!.type).toBe('JWT');
  });

  it('URL beats EMAIL when email is contained within URL span', async () => {
    const text = 'https://user@example.com/path';
    const url = makeEntity({
      start: 0,
      end: text.length,
      type: 'URL',
      category: 'contact',
      confidence: 0.9,
      source: 'regex',
      text,
    });
    const email = makeEntity({
      start: 8,
      end: 24,
      type: 'EMAIL',
      category: 'contact',
      confidence: 0.9,
      source: 'regex',
      text: 'user@example.com',
    });

    const pipeline = new Pipeline({ detectors: [stubDetector('d1', [url, email])] });
    const { entities } = await pipeline.analyze(text);

    expect(entities).toHaveLength(1);
    expect(entities[0]!.type).toBe('URL');
  });

  it('IBAN beats PHONE when spans overlap', async () => {
    const text = 'DE89 3704 0044 0532 0130 00';
    const iban = makeEntity({
      start: 0,
      end: text.length,
      type: 'IBAN',
      category: 'financial',
      confidence: 0.99,
      source: 'regex',
      text,
    });
    const phone = makeEntity({
      start: 5,
      end: 20,
      type: 'PHONE',
      category: 'contact',
      confidence: 0.75,
      source: 'regex',
      text: '3704 0044 0532',
    });

    const pipeline = new Pipeline({ detectors: [stubDetector('d1', [iban, phone])] });
    const { entities } = await pipeline.analyze(text);

    expect(entities).toHaveLength(1);
    expect(entities[0]!.type).toBe('IBAN');
  });
});

describe('Pipeline — generic overlap resolution', () => {
  it('keeps the longer-span entity when two generic entities overlap', async () => {
    const text = 'hello world test';
    const longer = makeEntity({
      start: 0,
      end: 11,
      type: 'URL',
      confidence: 0.9,
      source: 'regex',
      text: 'hello world',
    });
    const shorter = makeEntity({
      start: 0,
      end: 5,
      type: 'EMAIL',
      confidence: 0.95,
      source: 'regex',
      text: 'hello',
    });

    const pipeline = new Pipeline({ detectors: [stubDetector('d1', [longer, shorter])] });
    const { entities } = await pipeline.analyze(text);

    expect(entities).toHaveLength(1);
    expect(entities[0]!.type).toBe('URL');
  });

  it('keeps higher confidence when lengths are equal for generic overlap', async () => {
    const text = 'hello world';
    const a = makeEntity({
      start: 0,
      end: 5,
      type: 'EMAIL',
      confidence: 0.95,
      source: 'regex',
      text: 'hello',
    });
    const b = makeEntity({
      start: 0,
      end: 5,
      type: 'IP',
      confidence: 0.8,
      source: 'regex',
      text: 'hello',
    });

    const pipeline = new Pipeline({ detectors: [stubDetector('d1', [a, b])] });
    const { entities } = await pipeline.analyze(text);

    expect(entities).toHaveLength(1);
    expect(entities[0]!.confidence).toBe(0.95);
  });
});

describe('Pipeline — category & type filtering', () => {
  it('filters entities by enabledCategories', async () => {
    const contact = makeEntity({ start: 0, end: 5, type: 'EMAIL', category: 'contact' });
    const secret = makeEntity({
      start: 10,
      end: 15,
      type: 'JWT',
      category: 'secret',
    });

    const pipeline = new Pipeline({
      detectors: [stubDetector('d1', [contact, secret])],
      enabledCategories: ['contact'],
    });
    const { entities } = await pipeline.analyze('text');

    expect(entities).toHaveLength(1);
    expect(entities[0]!.category).toBe('contact');
  });

  it('filters entities by disabledTypes', async () => {
    const email = makeEntity({ start: 0, end: 5, type: 'EMAIL', category: 'contact' });
    const phone = makeEntity({ start: 10, end: 15, type: 'PHONE', category: 'contact' });

    const pipeline = new Pipeline({
      detectors: [stubDetector('d1', [email, phone])],
      disabledTypes: ['PHONE'],
    });
    const { entities } = await pipeline.analyze('text');

    expect(entities).toHaveLength(1);
    expect(entities[0]!.type).toBe('EMAIL');
  });
});

describe('Pipeline.toggle and Pipeline.toggleType', () => {
  it('toggle(category, false) removes that category from next analyze', async () => {
    const contact = makeEntity({ start: 0, end: 5, type: 'EMAIL', category: 'contact' });
    const secret = makeEntity({ start: 10, end: 15, type: 'JWT', category: 'secret' });

    const pipeline = new Pipeline({ detectors: [stubDetector('d1', [contact, secret])] });

    pipeline.toggle('contact', false);

    const { entities } = await pipeline.analyze('text');
    expect(entities.every((e) => e.category !== 'contact')).toBe(true);
    expect(entities.some((e) => e.category === 'secret')).toBe(true);
  });

  it('toggle(category, true) re-enables a previously disabled category', async () => {
    const contact = makeEntity({ start: 0, end: 5, type: 'EMAIL', category: 'contact' });

    const pipeline = new Pipeline({
      detectors: [stubDetector('d1', [contact])],
      enabledCategories: ['secret'],
    });

    // contact is disabled initially
    let result = await pipeline.analyze('text');
    expect(result.entities).toHaveLength(0);

    // re-enable
    pipeline.toggle('contact', true);
    result = await pipeline.analyze('text');
    expect(result.entities).toHaveLength(1);
  });

  it('toggleType(type, false) disables specific type', async () => {
    const email = makeEntity({ start: 0, end: 5, type: 'EMAIL', category: 'contact' });
    const phone = makeEntity({ start: 10, end: 15, type: 'PHONE', category: 'contact' });

    const pipeline = new Pipeline({ detectors: [stubDetector('d1', [email, phone])] });
    pipeline.toggleType('EMAIL', false);

    const { entities } = await pipeline.analyze('text');
    expect(entities.every((e) => e.type !== 'EMAIL')).toBe(true);
    expect(entities.some((e) => e.type === 'PHONE')).toBe(true);
  });

  it('toggleType(type, true) re-enables a previously disabled type', async () => {
    const email = makeEntity({ start: 0, end: 5, type: 'EMAIL', category: 'contact' });

    const pipeline = new Pipeline({
      detectors: [stubDetector('d1', [email])],
      disabledTypes: ['EMAIL'],
    });

    let result = await pipeline.analyze('text');
    expect(result.entities).toHaveLength(0);

    pipeline.toggleType('EMAIL', true);
    result = await pipeline.analyze('text');
    expect(result.entities).toHaveLength(1);
  });
});

describe('Pipeline — span sanity filters', () => {
  it('drops entities whose text spans a line break', async () => {
    const text = 'Viele Grüße\nLorenz';
    const wrapped = makeEntity({
      start: 6,
      end: 18,
      type: 'PERSON',
      category: 'person',
      text: text.slice(6, 18),
      source: 'llm',
    });

    const pipeline = new Pipeline({ detectors: [stubDetector('d1', [wrapped])] });
    const { entities } = await pipeline.analyze(text);
    expect(entities).toHaveLength(0);
  });

  it('drops non-regex entities that start or end mid-word', async () => {
    const text = 'Buchhaltung intern';
    // NER offset bug: span covers only "Buch" inside "Buchhaltung"
    const midWord = makeEntity({
      start: 0,
      end: 4,
      type: 'PERSON',
      category: 'person',
      text: 'Buch',
      source: 'ner',
    });

    const pipeline = new Pipeline({ detectors: [stubDetector('d1', [midWord])] });
    const { entities } = await pipeline.analyze(text);
    expect(entities).toHaveLength(0);
  });

  it('keeps regex entities even when bordered by letters (shape-anchored)', async () => {
    const text = 'Buchhaltung intern';
    const midWord = makeEntity({
      start: 0,
      end: 4,
      type: 'INTERNAL_REF',
      category: 'identity',
      text: 'Buch',
      source: 'regex',
    });

    const pipeline = new Pipeline({ detectors: [stubDetector('d1', [midWord])] });
    const { entities } = await pipeline.analyze(text);
    expect(entities).toHaveLength(1);
  });
});

describe('Pipeline — person name propagation', () => {
  it('marks additional mentions of confirmed multi-part person names', async () => {
    const text = 'Von: Sabine Hofmann\nWie besprochen meldet sich Frau Hofmann morgen.';
    const start = text.indexOf('Sabine Hofmann');
    const seed = makeEntity({
      start,
      end: start + 'Sabine Hofmann'.length,
      type: 'PERSON',
      category: 'person',
      text: 'Sabine Hofmann',
      source: 'ner',
    });

    const pipeline = new Pipeline({ detectors: [stubDetector('d1', [seed])] });
    const { entities } = await pipeline.analyze(text);

    const second = entities.find((e) => e.start > seed.end && e.type === 'PERSON');
    expect(second).toBeDefined();
    // The stopword "Frau" must NOT be absorbed into the propagated span
    expect(second!.text).toBe('Hofmann');
    expect(second!.source).toBe('manual');
  });

  it('does NOT propagate from single-word person entities', async () => {
    const text = 'Hallo Sabine, bitte melde dich. Sabine kommt morgen.';
    const seed = makeEntity({
      start: 6,
      end: 12,
      type: 'PERSON',
      category: 'person',
      text: 'Sabine',
      source: 'ner',
    });

    const pipeline = new Pipeline({ detectors: [stubDetector('d1', [seed])] });
    const { entities } = await pipeline.analyze(text);

    // Only the seed itself — no propagation seeded by a single token
    expect(entities.filter((e) => e.type === 'PERSON')).toHaveLength(1);
  });
});
