// Shared types for the de-pii detection engine.
// No DOM or framework dependencies — this file is consumed by any environment.

export type EntityCategory =
  | 'contact' // email, phone, url, ip
  | 'person' // names (filled in by NER later)
  | 'organization' // companies, institutions (filled in by NER)
  | 'address' // postal / street / city (later NER)
  | 'financial' // IBAN, BIC, credit-card, tax IDs
  | 'identity' // gov-issued IDs not directly financial: passport, AHV, license plate, employee ID, case ref
  | 'secret' // API keys, tokens, JWT, private keys
  | 'other'; // LLM catch-all for clearly personal data outside the types above (health, religion, …)

export type EntityType =
  // contact
  | 'EMAIL'
  | 'PHONE'
  | 'URL'
  | 'IP'
  // person — filled in by NER (not covered by regex detector)
  | 'PERSON'
  // org — filled in by NER (not covered by regex detector)
  | 'ORG'
  // address — filled in by NER (not covered by regex detector)
  | 'LOCATION'
  // financial
  | 'IBAN'
  | 'BIC'
  | 'CREDIT_CARD'
  | 'TAX_ID_DE'
  | 'VAT_ID'
  // identity — DACH-specific IDs
  | 'CH_AHV'
  | 'CH_UID'
  | 'CH_PASSPORT'
  | 'DE_PERSONALAUSWEIS'
  | 'LICENSE_PLATE'
  | 'EMPLOYEE_ID'
  | 'INTERNAL_REF'
  // identity — dates, device & vehicle identifiers
  | 'DATE'
  | 'MAC'
  | 'VIN'
  | 'SERIAL'
  | 'SOCIAL_SECURITY'
  | 'DEVICE_ID'
  // address — precise geo coordinates (lat/lon, DMS, what3words, plus codes)
  | 'GEO'
  // other — LLM catch-all for clearly personal data outside the types above
  | 'OTHER_PII'
  // secrets
  | 'AWS_ACCESS_KEY'
  | 'AWS_SECRET_KEY'
  | 'GCP_KEY'
  | 'AZURE_KEY'
  | 'GITHUB_TOKEN'
  | 'SLACK_TOKEN'
  | 'STRIPE_KEY'
  | 'OPENAI_KEY'
  | 'ANTHROPIC_KEY'
  | 'JWT'
  | 'SSH_PRIVATE_KEY'
  | 'PGP_PRIVATE_KEY'
  | 'BEARER_TOKEN'
  | 'ENV_SECRET'
  | 'GENERIC_SECRET';

export interface Entity {
  /** Inclusive character offset into source text. */
  start: number;
  /** Exclusive character offset into source text. */
  end: number;
  type: EntityType;
  category: EntityCategory;
  /** Matched substring — must equal source.slice(start, end). */
  text: string;
  /** Detection confidence in the range 0..1. */
  confidence: number;
  source: 'regex' | 'ner' | 'llm' | 'manual';
  /**
   * Coreference link: the original text of the primary entity this mention
   * refers to (e.g. "Anna" → canonical "Anna Schmidt"). When set and the
   * primary is masked, the masker gives this mention a placeholder that shares
   * the primary's number (PERSON_1 → PERSON_1_1) so the masked text signals
   * "same person" while still round-tripping exactly.
   */
  canonical?: string;
  /**
   * Placeholder-prefix override. When set, the masker uses this prefix instead
   * of the type→prefix lookup — used by user-defined custom entity types so a
   * "Kundennummer" rule masks to [KUNDENNUMMER_1].
   */
  prefix?: string;
}

export interface DetectorHints {
  /**
   * Entities found by faster detectors in the same analyse pass. The
   * LLM detector uses this to bias toward filling gaps that NER / regex
   * may have missed — single names after greetings, signature blocks,
   * inline mentions — rather than re-finding what's already known.
   * Detectors that don't benefit from prior context can ignore this.
   */
  priorEntities?: readonly Entity[];
}

export interface Detector {
  readonly name: string;
  detect(text: string, hints?: DetectorHints): Entity[] | Promise<Entity[]>;
}
