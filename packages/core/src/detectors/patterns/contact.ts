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
    // RFC 5322-light with Unicode support for IDN domains (martin@müller.de).
    // \p{L} = any Unicode letter, \p{N} = any digit. Requires Unicode flag.
    pattern: /[\p{L}\p{N}.+\-_]+@[\p{L}\p{N}\-]+(?:\.[\p{L}\p{N}\-]+)*\.[\p{L}]{2,}/gu,
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
    // Three formats, all gated by a trailing digit-count validator (7–15).
    //   1. International with spaces / slashes / dashes:  +49 89 12345678, +41 79 123 45 67
    //   2. Bare international (E.164 compact):            +4989123456
    //   3. National / German format starting with 0:       089 12345678, (089) 123-456, 0049/...
    pattern:
      /(?<![\d+])(?:\+\d{1,3}(?:[\s/\-]?\d){6,14}|\+[1-9]\d{6,14}|0\d{1,5}(?:[\s/\-]?\(?\d{1,5}\)?){1,4}\d{2,8})(?!\d)/g,
    confidence: 0.8,
    validate: (match) => {
      const digits = match.replace(/\D/g, '');
      return digits.length >= 7 && digits.length <= 15;
    },
  },
  {
    // German / Swiss / Austrian street address: Straßenname + Hausnummer (+ optional PLZ Ort).
    // Captures common suffixes (-straße/-strasse/-str./-weg/-platz/-allee/-gasse/-ring).
    // Example matches:
    //   Marienplatz 8
    //   Bahnhofstrasse 42
    //   Marienplatz 8, 80331 München
    //   Hauptstr. 12a
    type: 'LOCATION',
    category: 'address',
    pattern:
      /\b[A-ZÄÖÜ][\p{L}\-]+(?:[\s\-][\p{L}\-]+)*(?:str(?:asse|aße)?\.?|weg|platz|allee|gasse|ring|hof|markt|ufer|damm)\s+\d{1,4}[a-zA-Z]?(?:[,\s]+\d{4,5}\s+[A-ZÄÖÜ][\p{L}\-]+(?:[\s\-][\p{L}\-]+)*)?\b/gu,
    confidence: 0.85,
  },
  {
    // Standalone PLZ Ort: 4 (CH) or 5 (DE/AT) digits + city name.
    // Example: 80331 München, 8001 Zürich. Low confidence — fires often.
    type: 'LOCATION',
    category: 'address',
    pattern: /\b\d{4,5}\s+[A-ZÄÖÜ][\p{L}\-]+(?:[\s\-][A-ZÄÖÜ]?[\p{L}\-]+){0,3}\b/gu,
    confidence: 0.55,
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
