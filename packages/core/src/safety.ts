/**
 * Output safety pass — automate the "check it yourself" reminder.
 *
 * Two cheap, local checks run on the masked output before the user sends it:
 *
 *  1. Residual-PII scan: re-run the high-precision regex patterns over the
 *     *masked* text. Anything that still looks like an email / IBAN / phone /
 *     secret is something masking missed (a near-duplicate, an edit after
 *     detection, a disabled category) and is surfaced as a soft warning.
 *
 *  2. Round-trip integrity: restoring the masked text with its mapping must
 *     reproduce the original exactly. If it doesn't, the mapping is lossy for
 *     this text (placeholder collision — a documented masker limitation) and
 *     restore could be inaccurate.
 *
 * Only high-precision entity types feed the residual scan: fuzzy categories
 * (names, locations) would raise false alarms, especially once realistic
 * fake-values are in play. Both checks are pure and unit-tested.
 */

import { RegexDetector } from './detectors/regex.js';
import { restore } from './restorer.js';
import type { Entity, EntityType } from './types.js';
import type { Mapping } from './masker.js';

/** Types whose presence in masked output is almost certainly a real leak. */
const RESIDUAL_TYPES = new Set<EntityType>([
  'EMAIL',
  'PHONE',
  'IP',
  'IBAN',
  'BIC',
  'CREDIT_CARD',
  'TAX_ID_DE',
  'VAT_ID',
  'CH_AHV',
  'CH_UID',
  'CH_PASSPORT',
  'DE_PERSONALAUSWEIS',
  'MAC',
  'VIN',
  'GEO',
  'AWS_ACCESS_KEY',
  'AWS_SECRET_KEY',
  'GCP_KEY',
  'AZURE_KEY',
  'GITHUB_TOKEN',
  'SLACK_TOKEN',
  'STRIPE_KEY',
  'OPENAI_KEY',
  'ANTHROPIC_KEY',
  'JWT',
  'SSH_PRIVATE_KEY',
  'PGP_PRIVATE_KEY',
  'BEARER_TOKEN',
  'ENV_SECRET',
  'GENERIC_SECRET',
]);

/**
 * Scan already-masked text for high-precision PII that slipped through.
 * Returns the matching entities (deduped by text), empty when the output
 * looks clean.
 */
export function findResidualPii(maskedText: string): Entity[] {
  if (!maskedText) return [];
  const found = new RegexDetector().detect(maskedText).filter((e) => RESIDUAL_TYPES.has(e.type));
  const seen = new Set<string>();
  const out: Entity[] = [];
  for (const e of found) {
    const key = `${e.type}:${e.text}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(e);
  }
  return out;
}

/**
 * Verify that restoring the masked text reproduces the original exactly.
 * `false` means the mapping is lossy for this text (e.g. a placeholder string
 * collided with real content) and restore may be inaccurate.
 */
export function verifyRoundTrip(original: string, maskedText: string, mapping: Mapping): boolean {
  if (mapping.forward.size === 0) return true;
  const back = restore(maskedText, mapping, { tolerant: false }).restoredText;
  return back === original;
}
