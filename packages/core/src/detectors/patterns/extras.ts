/**
 * Extended recognizers beyond the core contact/financial/secret/DACH sets.
 * Covers dates, geo coordinates, device & vehicle identifiers, social
 * security / insurance numbers, postal & multi-script addresses, and the
 * long tail of reference numbers (orders, bookings, tracking, registers).
 *
 * Most rules here are context-gated (`requiresContext: true`) because their
 * raw shapes (plain digit runs, PREFIX-NUMBER tokens) are too ambiguous to
 * fire unconditionally. The ±60-char context window in the regex detector
 * keeps precision high while the context list keeps recall practical.
 */
import type { RegexRule } from './contact.js';

export const extraRules: RegexRule[] = [
  // ---- Dates (DOB, appointment / booking dates are identifying) ----
  {
    type: 'DATE',
    category: 'identity',
    // dd.mm.yyyy / dd-mm-yyyy / dd/mm/yyyy, years 1900-2099
    pattern: /\b(?:0?[1-9]|[12]\d|3[01])[.\-/](?:0?[1-9]|1[0-2])[.\-/](?:19|20)\d{2}\b/g,
    confidence: 0.7,
  },
  {
    type: 'DATE',
    category: 'identity',
    // ISO 8601: yyyy-mm-dd
    pattern: /\b(?:19|20)\d{2}-(?:0[1-9]|1[0-2])-(?:0[1-9]|[12]\d|3[01])\b/g,
    confidence: 0.7,
  },
  {
    type: 'DATE',
    category: 'identity',
    // German prose dates: "14. März 1987", "3 Okt 2024"
    pattern:
      /\b(?:0?[1-9]|[12]\d|3[01])\.?\s+(?:Januar|Februar|März|April|Mai|Juni|Juli|August|September|Oktober|November|Dezember|Jan|Feb|Mär|Apr|Jun|Jul|Aug|Sep|Okt|Nov|Dez)\.?\s+(?:19|20)\d{2}\b/giu,
    confidence: 0.7,
  },
  {
    type: 'DATE',
    category: 'identity',
    // Partial date "14.03." at end of clause. The lookbehind rejects section /
    // chapter / version numberings ("Abschnitt 3.2." is not a date).
    pattern:
      /(?<!(?:Abschnitt|Kapitel|Seite|Punkt|Nr\.?|Version|Artikel|Absatz|Ziffer|Pos\.?|Rn\.?)[ \t])\b(?:0?[1-9]|[12]\d|3[01])\.(?:0?[1-9]|1[0-2])\.(?=\s|$)/g,
    confidence: 0.5,
  },

  // ---- Common business reference formats ----
  {
    type: 'EMPLOYEE_ID',
    category: 'identity',
    // Kundennummer in KD-NNNNNN form
    pattern: /\bKD-\d{6}\b/g,
    confidence: 0.92,
  },
  {
    type: 'INTERNAL_REF',
    category: 'identity',
    // Payment references: PAY-998812, PAY-CH-998812
    pattern: /\bPAY-(?:[A-Z]{2}-)?\d{4,8}\b/g,
    confidence: 0.9,
  },
  {
    type: 'CH_PASSPORT',
    category: 'identity',
    // Kinderreisepass references in KRP-NNNNNN form
    pattern: /\bKRP-\d{6}\b/g,
    confidence: 0.9,
  },
  {
    type: 'CH_PASSPORT',
    category: 'identity',
    // Generic passport numbers: letter + 7-9 alphanumerics, context-gated
    pattern: /\b[A-Z][A-Z0-9]{7,9}\b/g,
    confidence: 0.55,
    context: ['Reisepass', 'Kinderreisepass', 'Passnummer', 'Pass-Nr', 'Passport', 'Pass'],
    requiresContext: true,
  },

  // ---- Street addresses (variants the core contact rules don't cover) ----
  {
    type: 'LOCATION',
    category: 'address',
    // Standalone-word street suffix with house number: "Lange Straße 5",
    // "Berliner Allee 12a". Lookbehind rejects matches glued to a preceding
    // word ("Bahnhofstraße" is covered by the compound-suffix rule).
    pattern:
      /(?<![\p{L}\p{N}])[A-ZÄÖÜ][\p{L}\-]+(?:[ \t]+[A-ZÄÖÜ][\p{L}\-]+)?[ \t]+(?:Stra(?:ß|ss)e|Allee|Weg|Platz|Gasse|Ring|Damm|Ufer|Steig|Pfad)[ \t]+\d{1,4}[a-zA-Z]?\b/gu,
    confidence: 0.7,
  },
  {
    type: 'LOCATION',
    category: 'address',
    // Compound lowercase suffixes that are unsafe without a house number
    // ("ring" in "Engineering") — the trailing number disambiguates.
    pattern:
      /\b[A-ZÄÖÜ][a-zäöüß\-]+(?:weg|ring|damm|ufer|steig|pfad|gürtel|guertel|chaussee|promenade)[ \t]+\d{1,4}[a-zA-Z]?\b/gu,
    confidence: 0.65,
  },
  {
    type: 'LOCATION',
    category: 'address',
    // Swiss PLZ + Ort + canton abbreviation: "8810 Horgen ZH"
    pattern:
      /\b(?!19\d{2}\b|20\d{2}\b)\d{4}[ \t]+[A-ZÄÖÜ][\p{L}\-]+(?:[ \t]+[A-ZÄÖÜ][\p{L}\-]+)?[ \t]+(?:ZH|BE|LU|UR|SZ|OW|NW|GL|ZG|FR|SO|BS|BL|SH|AR|AI|SG|GR|AG|TG|TI|VD|VS|NE|GE|JU)\b/gu,
    confidence: 0.7,
  },
  {
    type: 'LOCATION',
    category: 'address',
    // Street name WITHOUT house number — low confidence, the street name
    // alone is still identifying in context ("wohnhaft Lange Straße").
    pattern:
      /(?<![\p{L}\p{N}])[A-ZÄÖÜ][\p{L}\-]+(?:[ \t]+[A-ZÄÖÜ][\p{L}\-]+)?[ \t]+(?:Stra(?:ß|ss)e|Allee|Platz|Gasse|Ring)\b/gu,
    confidence: 0.5,
  },
  {
    type: 'LOCATION',
    category: 'address',
    // PO box: "Postfach 12 34 56"
    pattern: /\bPostfach[ \t]+\d[\d ]{3,}\d\b/g,
    confidence: 0.7,
  },
  {
    type: 'LOCATION',
    category: 'address',
    // Article-prefixed addresses without a registered suffix noun:
    // "Am Sonnenhang 12", "Zur Alten Mühle 3"
    pattern:
      /\b(?:Am|An|Zur|Zum|Beim|Hinterm|Vorm)[ \t]+[A-ZÄÖÜ][A-Za-zäöüß\-]+(?:[ \t]+[A-ZÄÖÜ][A-Za-zäöüß\-]+)?[ \t]+\d{1,4}\b/g,
    confidence: 0.55,
  },

  // ---- Credit-card fragments (context-gated — bare digits otherwise) ----
  {
    type: 'CREDIT_CARD',
    category: 'financial',
    // Last four digits: "Kartenendung 1234"
    pattern: /\b\d{4}\b/g,
    confidence: 0.5,
    context: ['Endung', 'endet auf', 'Kartenendung', 'letzten vier', 'letzten 4', 'ending'],
    requiresContext: true,
  },
  {
    type: 'CREDIT_CARD',
    category: 'financial',
    // CVV/CVC security codes
    pattern: /\b\d{3,4}\b/g,
    confidence: 0.6,
    context: ['CVV', 'CVC', 'CVV2', 'Prüfziffer', 'Kartenprüf', 'Sicherheitscode'],
    requiresContext: true,
  },
  {
    type: 'CREDIT_CARD',
    category: 'financial',
    // Expiry date MM/YY or MM/YYYY
    pattern: /\b(?:0[1-9]|1[0-2])\/(?:\d{2}|\d{4})\b/g,
    confidence: 0.6,
    context: [
      'gültig',
      'Gültig bis',
      'Ablauf',
      'Ablaufdatum',
      'expiry',
      'exp',
      'valid thru',
      'MM/JJ',
    ],
    requiresContext: true,
  },

  // ---- Device / network identifiers ----
  {
    type: 'MAC',
    category: 'identity',
    pattern: /\b(?:[0-9A-Fa-f]{2}[:-]){5}[0-9A-Fa-f]{2}\b/g,
    confidence: 0.9,
  },
  {
    type: 'VIN',
    category: 'identity',
    // 17-char vehicle identification number (no I/O/Q per ISO 3779)
    pattern: /\b[A-HJ-NPR-Z0-9]{17}\b/g,
    confidence: 0.7,
    context: ['VIN', 'Fahrgestellnummer', 'Fahrgestell', 'Fahrzeug', 'Chassis'],
  },
  {
    type: 'DEVICE_ID',
    category: 'identity',
    // Explicit device_<hex> identifiers from logs
    pattern: /\bdevice[_-][0-9a-fA-F]{6,}(?:-[0-9a-fA-F]+){0,4}\b/g,
    confidence: 0.8,
  },
  {
    type: 'DEVICE_ID',
    category: 'identity',
    // UUID v1-v5 — session IDs, device IDs, tracking IDs
    pattern: /\b[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}\b/g,
    confidence: 0.8,
  },
  {
    type: 'DEVICE_ID',
    category: 'identity',
    // IMEI: 15-16 digits, often grouped
    pattern: /\b\d{2}[- ]?\d{6}[- ]?\d{6}[- ]?\d{1,2}\b/g,
    confidence: 0.75,
    context: ['IMEI', 'IMEISV', 'Gerätenummer', 'Geraetenummer'],
    requiresContext: true,
  },
  {
    type: 'DEVICE_ID',
    category: 'identity',
    // IMSI for DACH networks (262 = DE, 232 = AT, 228 = CH)
    pattern: /\b(?:262|232|228)\d{12}\b/g,
    confidence: 0.8,
    context: ['IMSI', 'Teilnehmerkennung', 'Subscriber Identity'],
    requiresContext: true,
  },
  {
    type: 'DEVICE_ID',
    category: 'identity',
    // ICCID (SIM card number): starts with 89 + 17-21 digits
    pattern: /\b89\d{2}\d{1,2}\d{10,14}[0-9F]?\b/gi,
    confidence: 0.8,
    context: ['ICCID', 'SIM-Kartennummer', 'SIM-Nr', 'Kartennummer SIM'],
    requiresContext: true,
  },

  // ---- Social security / insurance numbers ----
  {
    type: 'SOCIAL_SECURITY',
    category: 'identity',
    // DE Sozialversicherungsnummer: 12 123456 A 123
    pattern: /\b\d{2}\s?\d{6}\s?[A-Z]\s?\d{2,3}\b/g,
    confidence: 0.8,
    context: ['Sozialversicherung', 'SV-Nr', 'SVNr', 'Versicherungsnummer', 'Rentenversicherung'],
  },
  {
    type: 'SOCIAL_SECURITY',
    category: 'identity',
    // CH Krankenversicherten-Nummer (KVG): 807xx.xxxx.xxxx.xx
    pattern: /\b807\d{2}\.\d{4}\.\d{4}\.\d{2}\b/g,
    confidence: 0.9,
  },
  {
    type: 'SOCIAL_SECURITY',
    category: 'identity',
    // DE Krankenversichertennummer (KVNR): letter + 9 digits
    pattern: /\b[A-Z]\d{9}\b/g,
    confidence: 0.7,
    context: [
      'Versichertennummer',
      'Versicherten-Nr',
      'Versichertennr',
      'KVNR',
      'Krankenversicherung',
      'eGK',
      'Versicherten-ID',
    ],
    requiresContext: true,
  },
  {
    type: 'SOCIAL_SECURITY',
    category: 'identity',
    // AT Sozialversicherungsnummer: NNNN DDMMYY (serial + birthdate)
    pattern: /\b\d{4}[ ]?(?:0[1-9]|[12]\d|3[01])(?:0[1-9]|1[0-2])\d{2}\b/g,
    confidence: 0.8,
    context: [
      'Sozialversicherungsnummer',
      'SV-Nr',
      'SVNr',
      'Versicherungsnummer',
      'österreichische',
      'Versicherte',
    ],
    requiresContext: true,
  },
  {
    type: 'SOCIAL_SECURITY',
    category: 'identity',
    // DE Rentenversicherungsnummer: area + DDMMYY + initial + serial
    pattern: /\b\d{2}(?:0[1-9]|[12]\d|3[01])(?:0[1-9]|1[0-2])\d{2}[A-Z]\d{3}\b/g,
    confidence: 0.8,
    context: [
      'Rentenversicherungsnummer',
      'Versicherungsnummer',
      'SV-Nummer',
      'RV-Nummer',
      'Sozialversicherungsnummer',
    ],
    requiresContext: true,
  },

  // ---- Serial numbers (context-gated) ----
  {
    type: 'SERIAL',
    category: 'identity',
    pattern: /\b[A-Z0-9]{2,4}-\d{6,12}\b/g,
    confidence: 0.55,
    context: ['Seriennummer', 'Serien-Nr', 'Serial', 'S/N', 'Geräte', 'Router'],
    requiresContext: true,
  },
  {
    type: 'SERIAL',
    category: 'identity',
    pattern: /\b\d{8,12}\b/g,
    confidence: 0.45,
    context: ['Seriennummer', 'Serien-Nr', 'Serial', 'S/N'],
    requiresContext: true,
  },

  // ---- Order / booking / case references ----
  {
    type: 'INTERNAL_REF',
    category: 'identity',
    // Plain 6-8 digit number with order/insurance context
    pattern: /\b\d{6,8}\b/g,
    confidence: 0.5,
    context: [
      'Bestellnummer',
      'Bestellnr',
      'Bestellung',
      'Antrag',
      'Antragsnummer',
      'Auftrag',
      'Auftragsnummer',
      'Vorgang',
      'Police',
      'Versicherungsschein',
      'Schein-Nr',
      'Tagebuch',
    ],
    requiresContext: true,
  },
  {
    type: 'INTERNAL_REF',
    category: 'identity',
    // Hash-prefixed plain number: #482913
    pattern: /#\d{4,8}\b/g,
    confidence: 0.6,
  },
  {
    type: 'INTERNAL_REF',
    category: 'identity',
    // Member-card style NNNN-L
    pattern: /\b\d{3,6}-[A-Z]\b/g,
    confidence: 0.55,
    context: ['Mitgliedskarte', 'Mitglied', 'Karte', 'Kartennummer', 'Mitgliedsnummer'],
    requiresContext: true,
  },
  {
    type: 'INTERNAL_REF',
    category: 'identity',
    // Country-coded references: MT-CH-2098, ABC-DE-12345
    pattern: /\b[A-Z]{2,4}-(?:CH|DE|AT|LI|FR|IT)-\d{3,6}\b/g,
    confidence: 0.85,
  },
  {
    type: 'INTERNAL_REF',
    category: 'identity',
    // Dotted booking numbers: 1234.567.890 (not part of a longer dotted chain)
    pattern: /(?<![\d.])\d{3,5}\.\d{3}\.\d{3}(?![\d.])/g,
    confidence: 0.6,
    context: [
      'Buchungsnummer',
      'Buchung',
      'Booking',
      'Reservierung',
      'Reservierungsnummer',
      'Bestätigungsnummer',
      'Confirmation',
      'Bestätigung',
    ],
    requiresContext: true,
  },
  {
    type: 'INTERNAL_REF',
    category: 'identity',
    // PREFIX-NUMBER with explicit customer/member/contract context
    pattern: /\b[A-Z]{2,4}-\d{4,9}\b/g,
    confidence: 0.6,
    context: [
      'Kundennummer',
      'Kunden-Nr',
      'Kundennr',
      'Kunde',
      'Mitgliedsnummer',
      'Mitgliedsnr',
      'Mitglied',
      'Mitgliedschaft',
      'Vertrag',
      'Vertragsnummer',
    ],
    requiresContext: true,
  },
  {
    type: 'INTERNAL_REF',
    category: 'identity',
    // Frequent-flyer numbers after a "Vielflieger(nummer):" label
    pattern: /(?<=Vielflieger(?:nummer)?[ \t]*:?[ \t]*)[A-Z]{2}[ \t]?\d{7,11}\b/g,
    confidence: 0.8,
  },
  {
    type: 'INTERNAL_REF',
    category: 'identity',
    // Generic multi-segment reference: AB-C2-2024/01. The validator demands
    // ≥4 digits so plain word-dash-word tokens never fire.
    pattern: /\b[A-Z]{1,5}(?:-[A-Z0-9]{1,8}){1,3}(?:\/\d{1,3})*\b/g,
    confidence: 0.75,
    validate: (match) => (match.match(/\d/g) ?? []).length >= 4,
  },
  {
    type: 'INTERNAL_REF',
    category: 'identity',
    // UPS tracking: 1Z + 16 alphanumerics
    pattern: /\b1Z[0-9A-Z]{16}\b/g,
    confidence: 0.85,
  },
  {
    type: 'INTERNAL_REF',
    category: 'identity',
    // Amazon order numbers: 123-1234567-1234567
    pattern: /\b\d{3}-\d{7}-\d{7}\b/g,
    confidence: 0.8,
  },
  {
    type: 'INTERNAL_REF',
    category: 'identity',
    // Pharmazentralnummer: PZN-12345678
    pattern: /\bPZN[-\s]?\d{7,8}\b/g,
    confidence: 0.85,
  },
  {
    type: 'INTERNAL_REF',
    category: 'identity',
    // Swiss case/dossier numbers: 98.12.123456.12345678
    pattern: /\b9[89]\.\d{2}\.\d{6}\.\d{8}\b/g,
    confidence: 0.85,
  },
  {
    type: 'INTERNAL_REF',
    category: 'identity',
    // Swiss Post tracking: 3S + 9-15 alphanumerics
    pattern: /\b3S[A-Z0-9]{9,15}\b/g,
    confidence: 0.75,
  },
  {
    type: 'INTERNAL_REF',
    category: 'identity',
    // European Case Law Identifier: ECLI:DE:BGH:2024:...
    pattern: /\bECLI:[A-Z]{2}:[A-Z0-9]{1,7}:\d{4}:[A-Za-z0-9._\-]+\b/g,
    confidence: 0.85,
  },

  // ---- Company-register / financial references ----
  {
    type: 'INTERNAL_REF',
    category: 'organization',
    // DE Handelsregister: HRB 12345, HRA 999, VR/GnR/PR registers
    pattern: /\b(?:HRB|HRA|VR|GnR|PR)\s?\d{1,7}(?:\s?[A-Z]{1,2})?\b/g,
    confidence: 0.7,
  },
  {
    type: 'INTERNAL_REF',
    category: 'organization',
    // AT Firmenbuchnummer: FN 123456a
    pattern: /\bFN[ ]?\d{1,6}[a-z]\b/g,
    confidence: 0.8,
  },
  {
    type: 'INTERNAL_REF',
    category: 'organization',
    // Legal Entity Identifier: 20 alphanumerics ending in 2 check digits
    pattern: /\b[A-Z0-9]{18}\d{2}\b/g,
    confidence: 0.75,
    context: ['LEI', 'Legal Entity Identifier', 'LEI-Code', 'Rechtsträgerkennung'],
    requiresContext: true,
  },
  {
    type: 'INTERNAL_REF',
    category: 'financial',
    // ISO 11649 structured creditor reference: RF18 5390 0754 7034
    pattern: /\bRF\d{2}(?:[ ]?[A-Z0-9]{1,4}){1,6}\b/g,
    confidence: 0.8,
  },
  {
    type: 'INTERNAL_REF',
    category: 'financial',
    // SEPA creditor identifier: DE98ZZZ09999999999
    pattern: /\b(?:DE|AT|CH)\d{2}ZZZ\d{11}\b/g,
    confidence: 0.85,
  },
  {
    type: 'INTERNAL_REF',
    category: 'financial',
    // ISIN — context-gated since the shape collides with other IDs
    pattern: /\b[A-Z]{2}[A-Z0-9]{9}\d\b/g,
    confidence: 0.75,
    context: ['ISIN', 'Wertpapier', 'Depot', 'WKN', 'Wertpapierkennnummer', 'Fonds', 'Aktie'],
    requiresContext: true,
  },
  {
    type: 'INTERNAL_REF',
    category: 'financial',
    // EORI customs number — context-gated
    pattern:
      /\b(?:DE|AT|FR|IT|NL|BE|ES|PL|LU|DK|SE|FI|IE|PT|CZ|SK|HU|RO|BG|HR|SI|GR|CHE?)[0-9A-Z]{8,15}\b/g,
    confidence: 0.7,
    context: ['EORI', 'Zoll', 'Customs', 'Zollnummer', 'Ausfuhr', 'Einfuhr', 'Versanddokument'],
    requiresContext: true,
  },

  // ---- Tax numbers (variants beyond the core financial rules) ----
  {
    type: 'TAX_ID_DE',
    category: 'financial',
    // Spaced VAT-ID style: DE 123 456 789
    pattern: /\bDE[ \t]\d{3}[ \t]\d{3}[ \t]\d{3}\b/g,
    confidence: 0.85,
  },
  {
    type: 'TAX_ID_DE',
    category: 'financial',
    // Steuernummer in Finanzamt notation: 12/345/67890
    pattern: /\b\d{2,3}\/\d{3}\/\d{4,5}\b/g,
    confidence: 0.8,
    context: ['Steuernummer', 'Steuer-Nr', 'St.-Nr', 'StNr', 'Finanzamt', 'Steuernr'],
    requiresContext: true,
  },

  // ---- Geo coordinates — meter-precise locations ----
  {
    type: 'GEO',
    category: 'address',
    // Decimal pair: 48.1374, 11.5755
    pattern: /\b-?\d{1,3}\.\d{4,},[ \t]*-?\d{1,3}\.\d{4,}\b/g,
    confidence: 0.8,
  },
  {
    type: 'GEO',
    category: 'address',
    // Labeled single coordinate: lat=48.137, longitude: 11.575
    pattern:
      /\b(?:lat|latitude|lon|lng|long|longitude|breite|länge)[ \t]*[:=][ \t]*-?\d{1,3}\.\d{3,}\b/gi,
    confidence: 0.75,
  },
  {
    type: 'GEO',
    category: 'address',
    // DMS: 48° 8' 14.6" N
    pattern: /\b\d{1,3}°[ \t]?\d{1,2}['′][ \t]?[\d.]+["″][ \t]?[NSEWnsewNOSW]\b/g,
    confidence: 0.8,
  },
  {
    type: 'GEO',
    category: 'address',
    // Compass-prefixed degrees: N 48° 08.123'
    pattern: /\b[NSEWO][ \t]?\d{1,3}°[ \t]?\d{1,2}(?:[.,]\d+)?[ \t]?['′]?/g,
    confidence: 0.8,
  },
  {
    type: 'GEO',
    category: 'address',
    // what3words: ///drei.deutsche.wörter
    pattern: /\/{3}[a-zäöüß]+\.[a-zäöüß]+\.[a-zäöüß]+/giu,
    confidence: 0.85,
  },
  {
    type: 'GEO',
    category: 'address',
    // Open Location Code (Plus Code): 8FWH4HQ8+6X
    pattern: /\b[23456789CFGHJMPQRVWX]{4,8}\+[23456789CFGHJMPQRVWX]{2,3}\b/g,
    confidence: 0.8,
  },

  // ---- Multi-script contact data ----
  {
    type: 'PHONE',
    category: 'contact',
    // Arabic-Indic digit groups (٠١٢٣ / ۰۱۲۳) — phone numbers in Arabic text
    pattern: /[\u0660-\u0669\u06F0-\u06F9]{2,}(?:[ \t\u00A0][\u0660-\u0669\u06F0-\u06F9]{2,}){1,}/g,
    confidence: 0.7,
  },
  {
    type: 'LOCATION',
    category: 'address',
    // Chinese addresses: 省/市/区/路/号 markers
    pattern:
      /[\u4e00-\u9fff]{2,}(?:省|市|区|县|镇|村|路|街|道|号|室|楼)[\u4e00-\u9fff0-9０-９号室]*/g,
    confidence: 0.7,
  },
  {
    type: 'LOCATION',
    category: 'address',
    // Russian addresses: улица/проспект/дом markers + Cyrillic tail
    pattern:
      /(?:улица|ул\.|проспект|пр-т|переулок|дом|д\.|кв\.?|корпус)[ \t]*[\u0400-\u04FF0-9№.\- ]{0,40}/giu,
    confidence: 0.6,
  },
  {
    type: 'IP',
    category: 'contact',
    // Exhaustive IPv6 incl. all compressed forms (the core rule misses some)
    pattern:
      /(?:(?:[0-9A-Fa-f]{1,4}:){7}[0-9A-Fa-f]{1,4}|(?:[0-9A-Fa-f]{1,4}:){1,7}:|(?:[0-9A-Fa-f]{1,4}:){1,6}:[0-9A-Fa-f]{1,4}|(?:[0-9A-Fa-f]{1,4}:){1,5}(?::[0-9A-Fa-f]{1,4}){1,2}|(?:[0-9A-Fa-f]{1,4}:){1,4}(?::[0-9A-Fa-f]{1,4}){1,3}|(?:[0-9A-Fa-f]{1,4}:){1,3}(?::[0-9A-Fa-f]{1,4}){1,4}|(?:[0-9A-Fa-f]{1,4}:){1,2}(?::[0-9A-Fa-f]{1,4}){1,5}|[0-9A-Fa-f]{1,4}:(?::[0-9A-Fa-f]{1,4}){1,6}|:(?:(?::[0-9A-Fa-f]{1,4}){1,7}|:))/g,
    confidence: 0.85,
  },
  {
    type: 'EMAIL',
    category: 'contact',
    // De-Mail addresses (legally binding German e-mail)
    pattern: /\b[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.de-mail\.de\b/g,
    confidence: 0.9,
  },

  // ---- Passport MRZ (machine-readable zone) ----
  {
    type: 'CH_PASSPORT',
    category: 'identity',
    // MRZ lines contain `<` filler runs: P<CHEMUSTER<<HANS<<...
    pattern: /\b[A-Z0-9]+<{2,}[A-Z0-9<]{2,}/g,
    confidence: 0.8,
  },

  // ---- DE plates with E (electric) / H (historic) suffix ----
  {
    type: 'LICENSE_PLATE',
    category: 'identity',
    // Fires without context (unlike the dach.ts variant) because the
    // optional E/H suffix + strict shape make false positives rare.
    pattern: /\b[A-ZÄÖÜ]{1,3}-[A-ZÄÖÜ]{1,2}[ ]?\d{1,4}[EH]?\b/g,
    confidence: 0.7,
  },

  // ---- Organizations without legal-form suffix ----
  {
    type: 'ORG',
    category: 'organization',
    // Name + business-noun suffix: "Nordwind Logistik", "Apex Consulting"
    pattern:
      /\b[A-ZÄÖÜ][A-Za-zäöüß\-]+(?:[ \t]+[A-ZÄÖÜ][A-Za-zäöüß\-]+)?[ \t]+(?:Consulting|Partners|Group|Solutions|Services|Holding|Ventures|Logistik|Spedition|Systems|Technologies|Capital|Immobilien)\b/g,
    confidence: 0.55,
  },

  // ---- Person-name patterns (beyond the salutation/signature rules) ----
  {
    type: 'PERSON',
    category: 'person',
    // "Familie Müller", "Familie Schmidt-Weber"
    pattern: /\bFamilie[ \t]+[A-ZÄÖÜ][A-Za-zäöüß]+(?:-[A-ZÄÖÜ][A-Za-zäöüß]+)?\b/g,
    confidence: 0.7,
  },
  {
    type: 'PERSON',
    category: 'person',
    // Labeled name fields: "Name des Gastes: Anna Berger", "Versicherte: …"
    pattern:
      /(?<=\b(?:Name des Gastes|Name des Reisenden|Name des Hauptgastes|Gastname|Hauptgast|Reisende[r]?|Rechnungsempfänger|Empfänger|Kundenname|Versicherte[r]?|Patient(?:in)?|Mieter(?:in)?)[ \t]*:?[ \t]*)[A-ZÄÖÜ][A-Za-zäöüß]+(?:[ \t]+[A-ZÄÖÜ][A-Za-zäöüß]+)?/g,
    confidence: 0.75,
  },
  {
    type: 'PERSON',
    category: 'person',
    // Surname directly after "Herr/Frau" (incl. "Herr Dr. Weber") — covers
    // mid-sentence mentions the salutation rule (which requires a leading
    // greeting) does not reach.
    pattern:
      /(?<=\b(?:Herr|Frau|Hr\.|Fr\.)[ \t]+(?:Dr\.[ \t]+|Prof\.[ \t]+)?)[A-ZÄÖÜ][A-Za-zäöüß]{2,}(?:-[A-ZÄÖÜ][A-Za-zäöüß]+)?\b/g,
    confidence: 0.7,
    validate: (match) => !['Doktor', 'Professor'].includes(match),
  },
  {
    type: 'PERSON',
    category: 'person',
    // Name list entries followed by passport/birth keywords:
    // "Anna Berger, Reisepass C01X00T47" / "Jonas Berger, geb. 12.03.2014"
    pattern:
      /[A-ZÄÖÜ][A-Za-zäöüß]+(?:-[A-ZÄÖÜ][A-Za-zäöüß]+)?(?:[ \t][A-ZÄÖÜ][A-Za-zäöüß]+(?:-[A-ZÄÖÜ][A-Za-zäöüß]+)?){0,2}(?=[ \t]*,[ \t]*(?:Reisepass|Reisepassnr|Pass|Kinderreisepass|geb\.|geboren|Geburtsdatum))/g,
    confidence: 0.7,
  },
];
