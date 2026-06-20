import { describe, expect, it } from 'vitest';
import { findResidualPii, verifyRoundTrip } from './safety.js';
import { mask } from './masker.js';
import { RegexDetector } from './detectors/regex.js';

describe('findResidualPii', () => {
  it('flags an email left in masked output', () => {
    const found = findResidualPii('Contact [PERSON_1] at real@leak.com please');
    expect(found.map((e) => e.type)).toContain('EMAIL');
    expect(found.find((e) => e.type === 'EMAIL')!.text).toBe('real@leak.com');
  });

  it('is clean when only placeholders remain', () => {
    expect(findResidualPii('Email [EMAIL_1], IBAN [IBAN_1], call [PHONE_1].')).toEqual([]);
  });

  it('does not flag fuzzy categories (names/locations are not residual types)', () => {
    // A realistic fake name left in output must not raise a leak alarm.
    expect(findResidualPii('Regards, Max Mustermann from Berlin')).toEqual([]);
  });

  it('dedupes repeated residual values', () => {
    const found = findResidualPii('a@b.com and again a@b.com');
    expect(found.filter((e) => e.type === 'EMAIL')).toHaveLength(1);
  });
});

describe('verifyRoundTrip', () => {
  const text = 'Mail to anna@example.com and call +49 89 12345678.';

  it('passes for a normal mask → restore round-trip', () => {
    const entities = new RegexDetector().detect(text);
    const { maskedText, mapping } = mask(text, entities);
    expect(verifyRoundTrip(text, maskedText, mapping)).toBe(true);
  });

  it('treats an empty mapping as trivially fine', () => {
    const { maskedText, mapping } = mask('no pii here', []);
    expect(verifyRoundTrip('no pii here', maskedText, mapping)).toBe(true);
  });

  it('detects a lossy round-trip', () => {
    const entities = new RegexDetector().detect(text);
    const { maskedText, mapping } = mask(text, entities);
    // Corrupt the mapping so restore can't reproduce the original.
    for (const key of [...mapping.forward.keys()]) mapping.forward.set(key, 'WRONG');
    expect(verifyRoundTrip(text, maskedText, mapping)).toBe(false);
  });
});
