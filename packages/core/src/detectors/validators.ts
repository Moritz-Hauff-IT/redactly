/**
 * Pure validation helpers used by the regex detector.
 * No side-effects, no DOM, no Node-only APIs.
 */

/**
 * Luhn algorithm check. Returns true if the digit string passes.
 * Strips all non-digit characters before checking.
 */
export function luhn(digits: string): boolean {
  const s = digits.replace(/\D/g, '');
  if (s.length < 13) return false;
  let sum = 0;
  let alt = false;
  for (let i = s.length - 1; i >= 0; i--) {
    let n = parseInt(s[i]!, 10);
    if (alt) {
      n *= 2;
      if (n > 9) n -= 9;
    }
    sum += n;
    alt = !alt;
  }
  return sum % 10 === 0;
}

/**
 * ISO 7064 MOD-97-10 check for IBANs.
 * Rearranges, converts letters to digits, and checks remainder == 1.
 */
export function ibanMod97(iban: string): boolean {
  // Remove spaces, uppercase
  const clean = iban.replace(/\s/g, '').toUpperCase();
  if (clean.length < 15 || clean.length > 34) return false;
  // Move first 4 chars to end
  const rearranged = clean.slice(4) + clean.slice(0, 4);
  // Convert letters to digits: A=10, B=11, …, Z=35
  const numeric = rearranged
    .split('')
    .map((ch) => {
      const code = ch.charCodeAt(0);
      return code >= 65 && code <= 90 ? String(code - 55) : ch;
    })
    .join('');
  // Compute mod-97 in chunks to avoid BigInt overflow in plain JS
  let remainder = 0;
  for (const ch of numeric) {
    remainder = (remainder * 10 + parseInt(ch, 10)) % 97;
  }
  return remainder === 1;
}

/**
 * Shannon entropy (bits per character) of a string.
 * Returns 0 for empty strings.
 */
export function shannonEntropy(s: string): number {
  if (s.length === 0) return 0;
  const freq: Record<string, number> = {};
  for (const ch of s) {
    freq[ch] = (freq[ch] ?? 0) + 1;
  }
  let entropy = 0;
  for (const count of Object.values(freq)) {
    const p = count / s.length;
    entropy -= p * Math.log2(p);
  }
  return entropy;
}
