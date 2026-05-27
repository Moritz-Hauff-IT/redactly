import type { EntityCategory, EntityType } from '../../types.js';

export interface RegexRule {
  type: EntityType;
  category: EntityCategory;
  pattern: RegExp; // must have global flag
  confidence: number;
  validate?: (match: string) => boolean;
}

export const contactRules: RegexRule[] = [
  {
    type: 'EMAIL',
    category: 'contact',
    // RFC 5322-light: local@domain.tld
    pattern: /[\w.+\-]+@[\w.\-]+\.[a-zA-Z]{2,}/g,
    confidence: 0.9,
  },
  {
    type: 'URL',
    category: 'contact',
    pattern: /https?:\/\/[^\s<>"']+/g,
    confidence: 0.9,
  },
  {
    type: 'PHONE',
    category: 'contact',
    // E.164 plus DE/AT/CH formats (with parens, spaces, slashes, dashes).
    // Must start with + or 0 and have total digits between 7 and 15.
    pattern:
      /(?<!\d)(?:\+[1-9]\d{1,14}|(?:0\d{2,4}[\s/\-]?\(?\d{1,4}\)?[\s/\-]?\d{2,10}(?:[\s/\-]\d{2,6})?))(?!\d)/g,
    confidence: 0.8,
    validate: (match) => {
      const digits = match.replace(/\D/g, '');
      return digits.length >= 7 && digits.length <= 15;
    },
  },
  {
    type: 'IP',
    category: 'contact',
    // IPv4: four octets 0-255
    pattern:
      /(?<!\d)(?:(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\.){3}(?:25[0-5]|2[0-4]\d|[01]?\d\d?)(?!\d)/g,
    confidence: 0.85,
  },
  {
    type: 'IP',
    category: 'contact',
    // IPv6: simplified — full or compressed forms
    pattern:
      /(?<![:\w])(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}|(?:[0-9a-fA-F]{1,4}:){1,7}:|(?:[0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|::(?:[0-9a-fA-F]{1,4}:){0,5}[0-9a-fA-F]{1,4}(?<![:\w])/g,
    confidence: 0.8,
  },
];
