/**
 * DACH-specific custom recognizers.
 * Patterns ported from the `depii-tool` reference (Presidio + custom recognizers).
 * Uses the `context` field on RegexRule for high-precision context-gated matches.
 */
import type { RegexRule } from './contact.js';

export const dachRules: RegexRule[] = [
  // ---- CH AHV (Sozialversicherungsnummer) — strict format, no context needed ----
  {
    type: 'CH_AHV',
    category: 'identity',
    pattern: /\b756\.\d{4}\.\d{4}\.\d{2}\b/g,
    confidence: 0.95,
  },

  // ---- CH UID (Unternehmens-ID) — strict format ----
  {
    type: 'CH_UID',
    category: 'identity',
    pattern: /\bCHE[-\s]?\d{3}\.\d{3}\.\d{3}\b/g,
    confidence: 0.95,
  },

  // ---- CH Passport: 1 letter + 7 digits — REQUIRES context to avoid false positives ----
  {
    type: 'CH_PASSPORT',
    category: 'identity',
    pattern: /\b[A-Z]\d{7}\b/g,
    confidence: 0.6,
    context: ['Passnummer', 'Pass-Nr', 'Reisepass', 'Passport', 'Pass'],
    requiresContext: true,
  },

  // ---- DE Steuer-ID with spaces: 2-3-3-3 digit grouping (common in DE forms) ----
  {
    type: 'TAX_ID_DE',
    category: 'financial',
    pattern: /\b\d{2}\s\d{3}\s\d{3}\s\d{3}\b/g,
    confidence: 0.85,
    context: ['Steuer-ID', 'Steueridentifikationsnummer', 'Steuer', 'IdNr', 'Steuer-Nr'],
  },

  // ---- DE Personalausweis: letter + 8 alphanumeric — REQUIRES context ----
  {
    type: 'DE_PERSONALAUSWEIS',
    category: 'identity',
    pattern: /\b[A-Z]\d{8}\b/g,
    confidence: 0.6,
    context: ['Personalausweis', 'Perso', 'Ausweis', 'Ausweisnummer'],
    requiresContext: true,
  },

  // ---- DE/CH KFZ-Kennzeichen ----
  {
    type: 'LICENSE_PLATE',
    category: 'identity',
    // CH cantons (2 letters) + space + up to 6 digits
    pattern:
      /\b(?:ZH|BE|GE|VD|TI|BS|BL|LU|SG|AG|TG|GR|VS|FR|NE|JU|SO|SH|SZ|GL|UR|OW|NW|AR|AI|ZG)\s\d{1,6}\b/g,
    confidence: 0.75,
  },
  {
    type: 'LICENSE_PLATE',
    category: 'identity',
    // DE: 1-3 letters + dash + 1-2 letters + optional space + 1-4 digits
    pattern: /\b[A-ZÄÖÜ]{1,3}-[A-ZÄÖÜ]{1,2}\s?\d{1,4}\b/g,
    confidence: 0.7,
    context: ['Kennzeichen', 'KFZ', 'Auto', 'Wagen', 'Fahrzeug'],
  },

  // ---- Mitarbeiter-Nr / Personalnummer / Kunden-Nr (context-required, low-confidence pattern) ----
  {
    type: 'EMPLOYEE_ID',
    category: 'identity',
    // Dashed format: 2-4 digits + dash + 4-6 digits
    pattern: /\b\d{2,4}-\d{4,6}\b/g,
    confidence: 0.5,
    context: [
      'Mitarbeiter-Nr',
      'Mitarbeiternummer',
      'Personalnr',
      'Personalnummer',
      'MA-Nr',
      'Kunden-Nr',
      'Kundennummer',
    ],
    requiresContext: true,
  },
  {
    type: 'EMPLOYEE_ID',
    category: 'identity',
    // Plain 5-8 digit number — only emit with strong context match
    pattern: /\b\d{5,8}\b/g,
    confidence: 0.4,
    context: [
      'Mitarbeiter-Nr',
      'Mitarbeiternummer',
      'Personalnr',
      'Personalnummer',
      'MA-Nr',
      'Kunden-Nr',
      'Kundennummer',
    ],
    requiresContext: true,
  },

  // ---- Organization with legal-form suffix (AG/GmbH/Co.KG/Ltd/Inc/etc.) ----
  // Captures company names ending in a known legal-form abbreviation.
  // Multilingual BERT NER reliably misses these — the deterministic suffix
  // makes a high-precision regex match instead.
  // Examples:
  //   Häberlin Architekten AG
  //   Müller GmbH
  //   Schmidt & Partner GbR
  //   Foo Bar Co. KG
  //   Acme Inc.
  {
    type: 'ORG',
    category: 'organization',
    pattern:
      /\b[A-ZÄÖÜ][\p{L}\-]+(?:[ \t](?:&[ \t])?[A-ZÄÖÜ][\p{L}\-]+){0,4}[ \t](?:AG|GmbH|GbR|KG|OHG|UG|SE|mbH|Co\.[ \t]*KG|e\.[ \t]?V\.|gAG|gGmbH|Sàrl|S\.[ \t]?à[ \t]?r\.[ \t]?l\.|Inc\.?|Ltd\.?|LLC|S\.A\.|N\.V\.|B\.V\.|S\.r\.l\.|S\.p\.A\.|S\.A\.S\.|Pty\.?[ \t]*Ltd\.?)\b/gu,
    confidence: 0.9,
  },

  // ---- Naked domain (without https://) — common in email signatures ----
  // TLD whitelist keeps precision high; lookbehind rejects @-prefixed
  // matches so we don't double-detect email-domain parts (the EMAIL rule
  // already covers those). Lowercase-only host part since real domains
  // are case-insensitive but written lowercase by convention.
  {
    type: 'URL',
    category: 'contact',
    pattern:
      /(?<![@\w.])[a-z0-9](?:[a-z0-9\-]*[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9\-]*[a-z0-9])?)*\.(?:com|net|org|io|app|dev|eu|ch|de|at|li|fr|it|es|uk|nl|be|info|biz|me|co|us|ca|au|jp|cn|tv|fm|ai|tech|store|online|site|cloud|email|news|blog|shop|pro|name|gov|edu)\b/g,
    confidence: 0.7,
  },

  // ---- Internal reference IDs: Aktenzeichen / Auftragsnummer / Ticket-Nr ----
  // Examples: VB-2024-0317, FOR-2024-019, SOC-2024-44719, #FOR-2024-019
  {
    type: 'INTERNAL_REF',
    category: 'identity',
    pattern: /\b[A-Z]{2,5}-\d{4}-\d{2,6}\b/g,
    confidence: 0.8,
  },
  {
    type: 'INTERNAL_REF',
    category: 'identity',
    // Hash-prefixed (#FOR-12345) — often used in ticketing
    pattern: /#[A-Z]{1,5}-?\d{3,8}(?:-\d{2,6})?\b/g,
    confidence: 0.65,
  },
  {
    type: 'INTERNAL_REF',
    category: 'identity',
    // Short PREFIX-NUMBER without year — context required
    pattern: /\b[A-Z]{2,5}-\d{3,7}\b/g,
    confidence: 0.45,
    context: [
      'Aktenzeichen',
      'Auftrag',
      'Auftragsnummer',
      'Vorgang',
      'Vorgangsnummer',
      'Ticket',
      'Referenz',
      'Geschäftsnummer',
      'Order',
      'Bestellnummer',
      'Fallnummer',
      'Belegnummer',
      'Beleg',
      'Dossier',
    ],
    requiresContext: true,
  },

  // ---- Person name patterns ----
  // Email-header prefix: "Von: Max Mustermann <mail@…>", "An: Erika Mustermann",
  // "From: Max Power", "To: Lisa Müller", "Cc: …", "Bcc: …", "Reply-To: …".
  // Quoted-email replies in business correspondence are the single most common
  // place where person names appear in structured form — covering this raises
  // detection recall on real-world emails dramatically.
  // The pattern stops at the first non-capitalised-word boundary (so
  // "An: Thomas Lemmer — CDH GmbH" captures only "Thomas Lemmer", not the
  // company suffix, and "Von: Max Mustermann <mail@x.de>" stops before the <).
  {
    type: 'PERSON',
    category: 'person',
    pattern:
      /(?<=(?:^|\n|\r)\s*(?:Von|An|Cc|Bcc|From|To|Sender|Reply-To|Sent\sTo):[ \t]+)[A-ZÄÖÜ][a-zäöüß\-]+(?:[ \t][A-ZÄÖÜ][a-zäöüß\-]+){0,3}/gm,
    confidence: 0.85,
  },
  // Salutation + capitalized name(s): "Hallo Martin Müller", "Sehr geehrte Frau Schmidt"
  {
    type: 'PERSON',
    category: 'person',
    pattern:
      /(?<=\b(?:Hallo|Hi|Liebe[rn]?|Sehr geehrte[rn]?|Werte[rn]?|Herr|Frau|Hr\.|Fr\.|Dr\.|Prof\.|Mag\.|Dipl\.) )(?:[A-ZÄÖÜ][a-zäöüß\-]+(?:[\s\-][A-ZÄÖÜ][a-zäöüß\-]+){0,3})/g,
    confidence: 0.8,
  },
  // Closing-salutation + person name: "Mit freundlichen Grüßen [NAME]".
  // Captures the FULL name (first + last + optional middle) so NER's
  // single-name splits get covered by this regex. Required because the
  // multilingual BERT NER reliably misses names after closing-salutation
  // signature blocks. Supports DE/CH (Grüße/Grüsse), formal & informal,
  // and English equivalents commonly used in DACH business mail.
  {
    type: 'PERSON',
    category: 'person',
    pattern:
      /(?<=\b(?:Mit freundlichen Grü(?:ß|ss)en|Freundliche Grü(?:ß|ss)e|Beste Grü(?:ß|ss)e|Herzliche Grü(?:ß|ss)e|Liebe Grü(?:ß|ss)e|Viele Grü(?:ß|ss)e|MfG|LG|VG|Best regards|Kind regards|Regards|Sincerely|Cheers|Hochachtungsvoll|Gru(?:ß|ss))[ \t,]*(?:\n[ \t]*){0,3})[A-ZÄÖÜ][a-zäöüß\-]+(?:[ \-][A-ZÄÖÜ][a-zäöüß\-]+){1,3}(?=\s|[,.;:]|$)/gu,
    confidence: 0.78,
  },
  // Signature line: "Dr. K. Schmidt", "M. Bianchi" with strong context (Grüsse/Grüßen/MfG)
  {
    type: 'PERSON',
    category: 'person',
    pattern:
      /\b(?:Dr|Prof|Mr|Mrs|Ms|Hr|Fr|Herr|Frau)?\.? ?[A-ZÄÖÜ]\.(?:-?[A-ZÄÖÜ]\.)? [A-ZÄÖÜ][a-zäöüß][a-zäöüßA-ZÄÖÜ\-]+\b/g,
    confidence: 0.55,
    context: [
      'Grüsse',
      'Grüßen',
      'Gruss',
      'Gruß',
      'MfG',
      'freundlichen',
      'regards',
      'sincerely',
      'Hochachtungsvoll',
      'Unterschrift',
      'gez',
    ],
  },
];
