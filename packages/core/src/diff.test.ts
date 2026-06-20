import { describe, expect, it } from 'vitest';
import { computeDiff } from './diff.js';

describe('computeDiff', () => {
  const text = 'Hallo Anna Schmidt, IBAN DE123.';

  it('interleaves unchanged runs with change segments', () => {
    const segs = computeDiff(text, [
      { start: 6, end: 18, replacement: '[PERSON_1]' },
      { start: 25, end: 30, replacement: '[IBAN_1]' },
    ]);
    expect(segs).toEqual([
      { kind: 'same', text: 'Hallo ' },
      { kind: 'change', text: 'Anna Schmidt', replacement: '[PERSON_1]' },
      { kind: 'same', text: ', IBAN ' },
      { kind: 'change', text: 'DE123', replacement: '[IBAN_1]' },
      { kind: 'same', text: '.' },
    ]);
  });

  it('returns a single same-segment when there are no changes', () => {
    expect(computeDiff('plain text', [])).toEqual([{ kind: 'same', text: 'plain text' }]);
  });

  it('skips overlapping changes', () => {
    const segs = computeDiff('abcdef', [
      { start: 0, end: 3, replacement: 'X' },
      { start: 2, end: 5, replacement: 'Y' }, // overlaps the first → skipped
    ]);
    expect(segs).toEqual([
      { kind: 'change', text: 'abc', replacement: 'X' },
      { kind: 'same', text: 'def' },
    ]);
  });

  it('ignores out-of-range changes', () => {
    expect(computeDiff('short', [{ start: 2, end: 99, replacement: 'Z' }])).toEqual([
      { kind: 'same', text: 'short' },
    ]);
  });
});
