import { ibanMod97, luhn } from '../validators.js';
import type { RegexRule } from './contact.js';

export const financialRules: RegexRule[] = [
  {
    type: 'IBAN',
    category: 'financial',
    // Spaced human-readable form: CC + 2 digits + 2-7 groups of 4 alphanum
    // chars (separated by single spaces) + optional 1-3 char remainder.
    // Structured so the regex CAN'T greedily absorb a following BIC like
    // "...7200 7 KBTGCH22" (the suffix isn't a 4-char group separator).
    pattern: /\b[A-Z]{2}\d{2}(?: [A-Z0-9]{4}){2,7}(?: [A-Z0-9]{1,3})?\b/g,
    confidence: 0.99,
    validate: (match) => ibanMod97(match),
  },
  {
    type: 'IBAN',
    category: 'financial',
    // Compact form (no spaces): CC + 2 digits + 11-30 alphanumeric chars.
    pattern: /\b[A-Z]{2}\d{2}[A-Z0-9]{11,30}\b/g,
    confidence: 0.99,
    validate: (match) => ibanMod97(match),
  },
  {
    type: 'IBAN',
    category: 'financial',
    // Lenient SEPA fallback for typos (mod-97 fails but format is plausible).
    // Same 4-char-group structure so it can't greedily absorb adjacent tokens.
    pattern:
      /\b(?:DE|AT|CH|LI|FR|IT|ES|NL|BE|LU|PT|IE|FI|EE|LV|LT|SK|SI|CZ|PL|HU|DK|SE|NO|GB|MT|CY|GR|BG|RO|HR|IS|MC|SM|AD|VA)\d{2}(?: [A-Z0-9]{4}){2,7}(?: [A-Z0-9]{1,3})?\b/g,
    confidence: 0.5,
  },
  {
    type: 'IBAN',
    category: 'financial',
    // Lenient SEPA fallback (compact form): catches IBAN-shaped strings with
    // real ISO country codes whose mod-97 fails — typically source-document
    // typos. Lower confidence than the strict rules so dedup prefers them.
    pattern:
      /\b(?:DE|AT|CH|LI|FR|IT|ES|NL|BE|LU|PT|IE|FI|EE|LV|LT|SK|SI|CZ|PL|HU|DK|SE|NO|GB|MT|CY|GR|BG|RO|HR|IS|MC|SM|AD|VA)\d{2}[A-Z0-9]{11,30}\b/g,
    confidence: 0.5,
  },
  {
    type: 'BIC',
    category: 'financial',
    // 8 or 11 character SWIFT/BIC code
    // Format: AAAABBCCDDD where:
    //   AAAA = bank code (4 alpha)
    //   BB   = country code (2 alpha)
    //   CC   = location code (2 alphanumeric, second char not O or 1)
    //   DDD  = optional branch code (3 alphanumeric)
    // Confidence is intentionally low (0.55): proper validation would require
    // a live SWIFT registry lookup, which is out of scope here. Any all-caps
    // 8/11-char token that matches the structural format will fire.
    pattern: /\b[A-Z]{6}[A-Z2-9][A-NP-Z0-9](?:[A-Z0-9]{3})?\b/g,
    confidence: 0.55,
  },
  {
    type: 'CREDIT_CARD',
    category: 'financial',
    // 13-19 digits, optionally grouped with spaces or dashes
    pattern: /\b(?:\d[ \-]?){12,18}\d\b/g,
    confidence: 0.95,
    validate: (match) => {
      const digits = match.replace(/[\s\-]/g, '');
      return digits.length >= 13 && digits.length <= 19 && luhn(digits);
    },
  },
  {
    type: 'TAX_ID_DE',
    category: 'financial',
    // German Steueridentifikationsnummer: exactly 11 digits, first digit 1-9
    pattern: /\b[1-9]\d{10}\b/g,
    confidence: 0.7,
  },
  {
    type: 'VAT_ID',
    category: 'financial',
    // EU VAT IDs — DE, AT, CH, FR formats
    // DE: DE + 9 digits
    // AT: ATU + 8 digits
    // CH: CHE + 9 digits + optional suffix
    // FR: FR + 2 alphanum + 9 digits
    pattern:
      /\b(?:DE\d{9}|ATU\d{8}|CHE[-\s]?\d{3}\.?\d{3}\.?\d{3}(?:\s?(?:MWST|TVA|IVA))?|FR[A-Z0-9]{2}\d{9})\b/g,
    confidence: 0.88,
  },
];
