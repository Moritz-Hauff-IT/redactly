import { describe, it, expect } from 'vitest';
import { redact } from './redactor.js';
import type { Entity } from './types.js';

function ent(start: number, end: number, text: string): Entity {
  return { start, end, text, type: 'PERSON', category: 'person', confidence: 1, source: 'manual' };
}

describe('redact', () => {
  it('replaces a single entity with the default marker', () => {
    const text = 'Hallo Max Müller';
    const { redactedText } = redact(text, [ent(6, 16, 'Max Müller')]);
    expect(redactedText).toBe('Hallo ████');
  });

  it('replaces multiple entities, preserving the surrounding text', () => {
    const text = 'Von Max an Anna';
    const { redactedText } = redact(text, [ent(4, 7, 'Max'), ent(11, 15, 'Anna')]);
    expect(redactedText).toBe('Von ████ an ████');
  });

  it('returns the text unchanged when there are no entities', () => {
    expect(redact('nothing here', []).redactedText).toBe('nothing here');
  });

  it('honours a custom marker', () => {
    const { redactedText } = redact('Hi Max', [ent(3, 6, 'Max')], { marker: '[REDACTED]' });
    expect(redactedText).toBe('Hi [REDACTED]');
  });

  it('does not leak the original length (fixed-width marker)', () => {
    const a = redact('X', [ent(0, 1, 'X')]).redactedText;
    const b = redact('Maximilian', [ent(0, 10, 'Maximilian')]).redactedText;
    expect(a).toBe(b);
  });

  it('produces no mapping/restorable artifact — only text is returned', () => {
    const result = redact('Max', [ent(0, 3, 'Max')]);
    expect(Object.keys(result)).toEqual(['redactedText']);
  });
});
