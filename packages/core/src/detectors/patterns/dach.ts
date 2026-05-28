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
  // Salutation + capitalized name(s): "Hallo Martin Müller", "Sehr geehrte Frau Schmidt"
  {
    type: 'PERSON',
    category: 'person',
    pattern:
      /(?<=\b(?:Hallo|Hi|Liebe[rn]?|Sehr geehrte[rn]?|Werte[rn]?|Herr|Frau|Hr\.|Fr\.|Dr\.|Prof\.|Mag\.|Dipl\.) )(?:[A-ZÄÖÜ][a-zäöüß\-]+(?:[\s\-][A-ZÄÖÜ][a-zäöüß\-]+){0,3})/g,
    confidence: 0.8,
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
