import { ibanMod97, luhn } from '../validators.js';
import type { RegexRule } from './contact.js';

export const financialRules: RegexRule[] = [
  {
    type: 'IBAN',
    category: 'financial',
    // Country code + check digits + BBAN (11-30 alphanumeric chars)
    // Spaces allowed (common human-readable format)
    pattern: /\b[A-Z]{2}\d{2}[A-Z0-9 ]{11,34}\b/g,
    confidence: 0.99,
    validate: (match) => ibanMod97(match),
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
    pattern: /\b[A-Z]{6}[A-Z2-9][A-NP-Z0-9](?:[A-Z0-9]{3})?\b/g,
    confidence: 0.75,
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
