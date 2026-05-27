import { describe, it, expect } from 'vitest';
import { luhn, ibanMod97, shannonEntropy } from './validators.js';

// ---------------------------------------------------------------------------
// Luhn algorithm
// ---------------------------------------------------------------------------
describe('luhn', () => {
  // Well-known test PANs (ECB and industry-standard)
  it('accepts Visa test PAN 4111111111111111', () => {
    expect(luhn('4111111111111111')).toBe(true);
  });

  it('accepts Mastercard test PAN 5500005555555559', () => {
    expect(luhn('5500005555555559')).toBe(true);
  });

  it('accepts Amex test PAN 371449635398431', () => {
    expect(luhn('371449635398431')).toBe(true);
  });

  it('accepts Discover test PAN 6011111111111117', () => {
    expect(luhn('6011111111111117')).toBe(true);
  });

  it('accepts Visa test PAN 4012888888881881', () => {
    expect(luhn('4012888888881881')).toBe(true);
  });

  it('rejects PAN with wrong check digit (4111111111111112)', () => {
    expect(luhn('4111111111111112')).toBe(false);
  });

  it('rejects PAN with wrong check digit (5500005555555558)', () => {
    expect(luhn('5500005555555558')).toBe(false);
  });

  it('rejects sequential digits that fail Luhn (1234567890123456)', () => {
    // 1234567890123456 has a Luhn check digit of 0, not 6
    expect(luhn('1234567890123456')).toBe(false);
  });

  it('rejects strings shorter than 13 chars', () => {
    expect(luhn('411111111111')).toBe(false);
  });

  it('strips spaces/dashes and still validates', () => {
    // 4111 1111 1111 1111
    expect(luhn('4111 1111 1111 1111')).toBe(true);
    expect(luhn('4111-1111-1111-1111')).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// IBAN mod-97 check
// ---------------------------------------------------------------------------
describe('ibanMod97', () => {
  it('accepts DE89 3704 0044 0532 0130 00 (Bundesbank test IBAN)', () => {
    expect(ibanMod97('DE89370400440532013000')).toBe(true);
  });

  it('accepts DE89 with spaces', () => {
    expect(ibanMod97('DE89 3704 0044 0532 0130 00')).toBe(true);
  });

  it('accepts GB29 NWBK 6016 1331 9268 19', () => {
    expect(ibanMod97('GB29NWBK60161331926819')).toBe(true);
  });

  it('accepts FR76 3000 6000 0112 3456 7890 189', () => {
    expect(ibanMod97('FR7630006000011234567890189')).toBe(true);
  });

  it('accepts NL91 ABNA 0417 1643 00', () => {
    expect(ibanMod97('NL91ABNA0417164300')).toBe(true);
  });

  it('rejects IBAN with wrong check digit (DE00370400440532013000)', () => {
    expect(ibanMod97('DE00370400440532013000')).toBe(false);
  });

  it('rejects IBAN with wrong check digit (GB00NWBK60161331926819)', () => {
    expect(ibanMod97('GB00NWBK60161331926819')).toBe(false);
  });

  it('rejects string that is too short', () => {
    expect(ibanMod97('DE89')).toBe(false);
  });

  it('rejects string that is too long (> 34 chars)', () => {
    expect(ibanMod97('DE89370400440532013000' + '0'.repeat(13))).toBe(false);
  });

  it('rejects a random alphanumeric string', () => {
    expect(ibanMod97('AB12ABCDEF1234567890')).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Shannon entropy
// ---------------------------------------------------------------------------
describe('shannonEntropy', () => {
  it('returns 0 for an empty string', () => {
    expect(shannonEntropy('')).toBe(0);
  });

  it('returns 0 for a single repeated character', () => {
    expect(shannonEntropy('aaaaaaaaaa')).toBe(0);
  });

  it('returns 1 for perfectly balanced two-symbol string (aabb -> not quite, use abab)', () => {
    // "abababab" — equal a and b
    const e = shannonEntropy('abababab');
    expect(e).toBeCloseTo(1.0, 5);
  });

  it('has low entropy for "password123"', () => {
    expect(shannonEntropy('password123')).toBeLessThan(3.5);
  });

  it('has high entropy for a random base64 token', () => {
    const token = 'sK9mP2nXqR7vL4jZ0cW8eY3tA6fB1dU5'; // 32 chars, mixed case+digits
    expect(shannonEntropy(token)).toBeGreaterThan(3.5);
  });

  it('has high entropy for a typical API key value', () => {
    const key = 'xK2pL9mN4qR7vJ0cW5eY8zA3fB6dU1sT';
    expect(shannonEntropy(key)).toBeGreaterThan(3.5);
  });

  it('has low entropy for a low-diversity secret placeholder', () => {
    expect(shannonEntropy('secret')).toBeLessThan(3.5);
  });

  it('scales toward log2(alphabet) for uniform distribution', () => {
    // 4-symbol uniform: expected entropy = log2(4) = 2
    const s = 'abcdabcdabcdabcd';
    expect(shannonEntropy(s)).toBeCloseTo(2.0, 4);
  });
});
