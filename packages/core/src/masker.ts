/**
 * masker.ts — Replace detected entities in text with stable placeholders.
 *
 * Design notes:
 * - Placeholder numbers are allocated left-to-right (first entity in the text
 *   gets _1, second gets _2, etc.) for human readability.
 * - Replacements are applied right-to-left to preserve character offsets.
 * - Counters per prefix are derived on the fly by scanning the forward map;
 *   this keeps the Mapping shape clean (only two Maps).
 * - The reverse map keys on entity.text only (case-sensitive). When the same
 *   string appears as two different EntityTypes, first-write wins. This is
 *   intentional: the placeholder still correctly masks the text regardless of
 *   entity type.
 * - All secret EntityTypes share the 'SECRET' prefix so the LLM never learns
 *   which kind of secret was redacted.
 */

import type { Entity, EntityType } from './types.js';

// Re-exported here so consumers can import it from the same '@redactly/core/masker'
// entry point as mask() (irreversible sibling — see redactor.ts).
export { redact } from './redactor.js';
export type { RedactOptions, RedactResult } from './redactor.js';

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export interface Mapping {
  /** placeholder -> original */
  forward: Map<string, string>;
  /** original (case-sensitive exact match) -> placeholder */
  reverse: Map<string, string>;
}

/** Arguments handed to a custom replacement generator (realistic fake values). */
export interface ReplacementArgs {
  type: EntityType;
  prefix: string;
  /** 1-based per-prefix counter for this allocation. */
  n: number;
}

/** Produces the string that replaces an entity (e.g. a realistic fake value). */
export type ReplacementFn = (args: ReplacementArgs) => string;

export interface MaskOptions {
  /**
   * Map from EntityType to placeholder prefix. Defaults provided.
   * Custom prefixes are merged over the defaults.
   */
  prefixes?: Partial<Record<EntityType, string>>;
  /**
   * Placeholder format. Default: '[{PREFIX}_{N}]'.
   * MUST contain literal {PREFIX} and {N} tokens.
   */
  format?: string;
  /**
   * Custom replacement generator. When provided, the returned string is used
   * verbatim as the replacement (and as the mapping key) instead of the
   * `[PREFIX_N]` placeholder — this is how realistic fake-values are produced.
   * Uniqueness is guaranteed by skipping any value already in the mapping.
   */
  replacement?: ReplacementFn;
  /**
   * Collision-proofing nonce appended to placeholders (`PERSON_1_k7a2`). Use
   * when the input might already contain placeholder-shaped strings, so the
   * round-trip stays exact. Ignored when a custom `replacement` is given.
   */
  nonce?: string;
  /**
   * If provided, the masker reuses its forward/reverse entries
   * (same original -> same placeholder) and extends it.
   * Use for incremental re-masking when the user toggles entities or
   * pastes additional text.
   */
  existing?: Mapping;
}

export interface MaskResult {
  maskedText: string;
  mapping: Mapping;
}

// ---------------------------------------------------------------------------
// Default configuration
// ---------------------------------------------------------------------------

const DEFAULT_FORMAT = '[{PREFIX}_{N}]';

const DEFAULT_PREFIXES: Record<EntityType, string> = {
  PERSON: 'PERSON',
  ORG: 'ORG',
  LOCATION: 'LOC',
  EMAIL: 'EMAIL',
  PHONE: 'PHONE',
  URL: 'URL',
  IP: 'IP',
  IBAN: 'IBAN',
  BIC: 'BIC',
  CREDIT_CARD: 'CARD',
  TAX_ID_DE: 'TAX_ID',
  VAT_ID: 'VAT_ID',
  // Identity (DACH-specific IDs)
  CH_AHV: 'AHV',
  CH_UID: 'UID',
  CH_PASSPORT: 'PASS',
  DE_PERSONALAUSWEIS: 'AUSWEIS',
  LICENSE_PLATE: 'KFZ',
  EMPLOYEE_ID: 'EMP_ID',
  INTERNAL_REF: 'REF',
  // Identity — dates, device & vehicle identifiers
  DATE: 'DATE',
  MAC: 'MAC',
  VIN: 'VIN',
  SERIAL: 'SERIAL',
  SOCIAL_SECURITY: 'SVNR',
  DEVICE_ID: 'DEVICE',
  // Address — precise geo coordinates
  GEO: 'GEO',
  // Other — LLM catch-all
  OTHER_PII: 'SONSTIGES',
  // Secrets - all map to 'SECRET'
  AWS_ACCESS_KEY: 'SECRET',
  AWS_SECRET_KEY: 'SECRET',
  GCP_KEY: 'SECRET',
  AZURE_KEY: 'SECRET',
  GITHUB_TOKEN: 'SECRET',
  SLACK_TOKEN: 'SECRET',
  STRIPE_KEY: 'SECRET',
  OPENAI_KEY: 'SECRET',
  ANTHROPIC_KEY: 'SECRET',
  JWT: 'SECRET',
  SSH_PRIVATE_KEY: 'SECRET',
  PGP_PRIVATE_KEY: 'SECRET',
  BEARER_TOKEN: 'SECRET',
  ENV_SECRET: 'SECRET',
  GENERIC_SECRET: 'SECRET',
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

export function createMapping(): Mapping {
  return {
    forward: new Map<string, string>(),
    reverse: new Map<string, string>(),
  };
}

/**
 * Derive the next counter value for a given prefix by scanning existing
 * forward-map placeholders. O(n) per prefix allocation, acceptable since
 * typical entity counts are small.
 */
function nextCounter(forward: Map<string, string>, prefix: string): number {
  let max = 0;
  const escaped = prefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const re = new RegExp(`\\b${escaped}_(\\d+)\\b`);
  for (const placeholder of forward.keys()) {
    const m = re.exec(placeholder);
    if (m?.[1] !== undefined) {
      const n = parseInt(m[1], 10);
      if (n > max) max = n;
    }
  }
  return max + 1;
}

/**
 * Build a placeholder string from the format template. When a `nonce` is given
 * it is appended to the number (`PERSON_1` → `PERSON_1_k7a2`) so the placeholder
 * cannot collide with arbitrary input text.
 */
function buildPlaceholder(format: string, prefix: string, n: number, nonce?: string): string {
  const num = nonce ? `${n}_${nonce}` : String(n);
  return format.replace('{PREFIX}', prefix).replace('{N}', num);
}

/**
 * Validate that the format string contains the required tokens.
 */
function validateFormat(format: string): void {
  if (!format.includes('{PREFIX}')) {
    throw new Error(
      `Invalid placeholder format: "${format}" — must contain literal {PREFIX} token.`
    );
  }
  if (!format.includes('{N}')) {
    throw new Error(`Invalid placeholder format: "${format}" — must contain literal {N} token.`);
  }
}

// ---------------------------------------------------------------------------
// Main API
// ---------------------------------------------------------------------------

/**
 * Replace detected entities in text with stable placeholders.
 *
 * Overlapping entities are not supported. The function will throw a clear
 * error if the input contains overlapping ranges. The calling pipeline
 * (Task 5) is responsible for deduplication.
 *
 * **Limitation:** Placeholder collisions. If the input text contains a literal
 * substring that already matches the placeholder format (e.g., the user wrote
 * `[PERSON_1]` as prose), the masker will not detect or escape it. During
 * `restore`, that substring will be replaced with the real value associated
 * with `[PERSON_1]`. To avoid this, either: (a) pass a `format` that uses an
 * unlikely shape, or (b) pre-scan the input for placeholder-shaped strings and
 * pass them as additional entities to the masker. A `sessionNonce` option is
 * planned for a future release to solve this automatically.
 */
export function mask(text: string, entities: Entity[], options?: MaskOptions): MaskResult {
  const format = options?.format ?? DEFAULT_FORMAT;
  validateFormat(format);

  const prefixMap: Record<EntityType, string> = {
    ...DEFAULT_PREFIXES,
    ...(options?.prefixes ?? {}),
  } as Record<EntityType, string>;

  const mapping: Mapping = options?.existing
    ? {
        forward: new Map(options.existing.forward),
        reverse: new Map(options.existing.reverse),
      }
    : createMapping();

  // Short-circuit: no entities to replace
  if (entities.length === 0) {
    return { maskedText: text, mapping };
  }

  // Sort ascending by start position (left-to-right)
  const sorted = [...entities].sort((a, b) => a.start - b.start || b.end - a.end);

  // Validate no overlapping entities
  for (let i = 0; i < sorted.length - 1; i++) {
    const curr = sorted[i]!;
    const next = sorted[i + 1]!;
    // If curr ends after next starts, they overlap
    if (curr.end > next.start) {
      throw new Error(
        `Overlapping entities detected at [${curr.start},${curr.end}) and [${next.start},${next.end}). ` +
          `Deduplicate entities before calling mask().`
      );
    }
  }

  // A nonce reuses the custom-replacement machinery: it generates collision-
  // proof placeholders with the same per-call counter + collision-skip path.
  const nonce = options?.nonce;
  const generate: ReplacementFn | undefined =
    options?.replacement ??
    (nonce ? ({ prefix, n }) => buildPlaceholder(format, prefix, n, nonce) : undefined);
  // Per-prefix counter for the generator path (the plain placeholder path
  // derives its counter from the forward map instead). Seeded lazily at 1.
  const fakeCounters = new Map<string, number>();
  // Coreference: per-primary-core counter for shared-number sub-placeholders.
  const corefCounters = new Map<string, number>();
  // Format wrappers, to recover a placeholder's "core" (e.g. "[PERSON_1]" →
  // "PERSON_1") regardless of the chosen format.
  const wrapPre = format.slice(0, format.indexOf('{PREFIX}'));
  const wrapPost = format.slice(format.indexOf('{N}') + '{N}'.length);
  const isSecondary = (e: Entity) => e.canonical !== undefined && e.canonical !== e.text;

  const placeholderFor = new Map<Entity, string>();
  const allocate = (entity: Entity): void => {
    const original = entity.text;
    if (mapping.reverse.has(original)) {
      // Reuse existing placeholder for this original text.
      // Note: first-write wins when the same string appears as different
      // EntityTypes (e.g., a name that's also an organization name). The
      // placeholder still correctly masks the text regardless of entity type.
      placeholderFor.set(entity, mapping.reverse.get(original)!);
      return;
    }

    // Coreference (default placeholder mode only): a linked mention shares the
    // primary's number — "Anna Schmidt" → [PERSON_1], "Anna" → [PERSON_1_1] —
    // so the masked text signals "same person" while round-tripping exactly.
    if (!generate && isSecondary(entity)) {
      const primaryPh = mapping.reverse.get(entity.canonical!);
      if (primaryPh !== undefined) {
        const core = primaryPh.slice(wrapPre.length, primaryPh.length - wrapPost.length);
        let k = (corefCounters.get(core) ?? 0) + 1;
        let replacement = buildPlaceholder(format, core, k);
        while (mapping.forward.has(replacement)) {
          k++;
          replacement = buildPlaceholder(format, core, k);
        }
        corefCounters.set(core, k);
        mapping.forward.set(replacement, original);
        mapping.reverse.set(original, replacement);
        placeholderFor.set(entity, replacement);
        return;
      }
      // Primary wasn't masked (e.g. its category is disabled) → fall through
      // and allocate a normal standalone placeholder for this mention.
    }

    const prefix = entity.prefix ?? prefixMap[entity.type] ?? entity.type;
    let replacement: string;
    if (generate) {
      // Realistic fake value — skip any value already taken so the mapping
      // stays bijective across incremental masks and prefixes.
      let n = fakeCounters.get(prefix) ?? 1;
      do {
        replacement = generate({ type: entity.type, prefix, n });
        n++;
      } while (mapping.forward.has(replacement));
      fakeCounters.set(prefix, n);
    } else {
      const n = nextCounter(mapping.forward, prefix);
      replacement = buildPlaceholder(format, prefix, n);
    }
    mapping.forward.set(replacement, original);
    mapping.reverse.set(original, replacement);
    placeholderFor.set(entity, replacement);
  };

  // Pass 1: allocate primaries first (in document order, so the first gets _1)
  // so a linked mention can reference its primary's already-assigned number.
  for (const entity of sorted) if (!isSecondary(entity)) allocate(entity);
  for (const entity of sorted) if (isSecondary(entity)) allocate(entity);

  // Pass 2 (right-to-left): apply replacements from the end to preserve
  // character offsets of earlier entities.
  let result = text;
  for (let i = sorted.length - 1; i >= 0; i--) {
    const entity = sorted[i]!;
    const placeholder = placeholderFor.get(entity)!;
    result = result.slice(0, entity.start) + placeholder + result.slice(entity.end);
  }

  return { maskedText: result, mapping };
}

// ---------------------------------------------------------------------------
// Mapping serialization (save / load so mask + restore can happen at
// different times). The serialized form contains the ORIGINAL values in clear
// text — it is the key that un-masks placeholders — so callers must treat the
// exported data as sensitive and never persist it without the user's intent.
// ---------------------------------------------------------------------------

const MAPPING_FORMAT = 'redactly-mapping' as const;

interface SerializedMapping {
  format: typeof MAPPING_FORMAT;
  version: 1;
  /** [placeholder, original] pairs from mapping.forward. */
  entries: [string, string][];
}

/** Serialize a mapping to pretty JSON. */
export function serializeMapping(mapping: Mapping): string {
  const payload: SerializedMapping = {
    format: MAPPING_FORMAT,
    version: 1,
    entries: [...mapping.forward.entries()],
  };
  return JSON.stringify(payload, null, 2);
}

/** Rebuild a Mapping from previously-serialized JSON. Throws on bad input. */
export function deserializeMapping(json: string): Mapping {
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch {
    throw new Error('Datei ist kein gültiges JSON');
  }
  const obj = parsed as Partial<SerializedMapping> | null;
  if (!obj || obj.format !== MAPPING_FORMAT || !Array.isArray(obj.entries)) {
    throw new Error('Kein gültiges Redactly-Mapping');
  }
  const mapping = createMapping();
  for (const pair of obj.entries) {
    if (!Array.isArray(pair) || pair.length !== 2) continue;
    const [placeholder, original] = pair;
    if (typeof placeholder !== 'string' || typeof original !== 'string') continue;
    mapping.forward.set(placeholder, original);
    // First original→placeholder wins, matching mask()'s reverse map.
    if (!mapping.reverse.has(original)) mapping.reverse.set(original, placeholder);
  }
  if (mapping.forward.size === 0) {
    throw new Error('Mapping ist leer');
  }
  return mapping;
}
