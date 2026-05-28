import type { EntityCategory, EntityType } from '../../types.js';

export interface RegexRule {
  type: EntityType;
  category: EntityCategory;
  pattern: RegExp; // must have global flag
  confidence: number;
  validate?: (match: string) => boolean;
  /** Words that should appear within ±60 chars of the match. When provided
   * and at least one is nearby, the emitted confidence is boosted by 0.3
   * (capped at 0.99). When `requiresContext` is true, the match is dropped
   * if no context word is found. */
  context?: string[];
  requiresContext?: boolean;
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
    // German / Swiss / Austrian street address: Strassenname + Hausnummer.
    // Only "safe" compound suffixes that don't appear inside common German
    // words (would false-positive otherwise: "ring" matches "Engineering",
    // "weg" matches "Bewegung", "hof" matches many compounds, etc.).
    // Example matches:
    //   Bahnhofstrasse 42
    //   Hauptstr. 12a
    //   Marienplatz 8
    //   Lindenallee 5
    //   Marktgasse 7
    type: 'LOCATION',
    category: 'address',
    pattern:
      /\b[A-ZÄÖÜ][\p{L}\-]*(?:strasse|straße|str\.|platz|gasse|allee)\s+\d{1,4}[a-zA-Z]?\b/gu,
    confidence: 0.85,
  },
  {
    // Address with article prefix + standalone suffix: "Am Wollmatinger Ried 7",
    // "An der alten Mühle Hof 5". The article (Am/An/In/...) is required so
    // we don't match random capitalized words preceding a suffix-noun (e.g.
    // "Rechnung Wollmatinger Ried 7" would otherwise match because "Ried"
    // is a valid suffix). Suffix list intentionally trimmed to words that
    // rarely appear standalone as people/business names.
    type: 'LOCATION',
    category: 'address',
    pattern:
      /\b(?:Am|An|In|Bei|Zur|Zum|Auf|Beim)\s+(?:der\s+|dem\s+|den\s+)?[A-ZÄÖÜ][\p{L}\-]+(?:\s+[A-ZÄÖÜ][\p{L}\-]+)?\s(?:Weg|Ring|Hof|Markt|Ufer|Damm|Ried|Anger|Steig|Stieg|Pfad)\s+\d{1,4}[a-zA-Z]?\b/gu,
    confidence: 0.78,
  },
  {
    // Standalone PLZ Ort: 4 (CH) or 5 (DE/AT) digits + city name.
    // Lookahead rejects 4-digit numbers that look like years (1900-2099)
    // or invoice/serial numbers padded with leading zeros — both create
    // false positives when the joined PDF text smushes "2025" against the
    // following column header. City must be at least 3 chars to skip
    // "2025 IT". Optional " am/im/... Main" suffix for Frankfurt am Main,
    // Bad Tölz, etc.
    // Example: 80331 München, 8001 Zürich, 60311 Frankfurt am Main
    type: 'LOCATION',
    category: 'address',
    pattern:
      /\b(?!19\d{2}\b|20\d{2}\b|0000\d?\b)\d{4,5}\s+[A-ZÄÖÜ][\p{L}\-]{2,}(?:\s+(?:am|im|an|bei|ob|unter|über|in der)\s+[A-ZÄÖÜ][\p{L}\-]+)?\b/gu,
    confidence: 0.6,
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
