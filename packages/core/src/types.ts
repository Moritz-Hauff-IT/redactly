// Shared types for the de-pii detection engine.
// No DOM or framework dependencies — this file is consumed by any environment.

export type EntityCategory =
  | 'contact' // email, phone, url, ip
  | 'person' // names (filled in by NER later)
  | 'organization' // companies, institutions (filled in by NER)
  | 'address' // postal / street / city (later NER)
  | 'financial' // IBAN, BIC, credit-card, tax IDs
  | 'secret'; // API keys, tokens, JWT, private keys

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
}

export interface Detector {
  readonly name: string;
  detect(text: string): Entity[] | Promise<Entity[]>;
}
