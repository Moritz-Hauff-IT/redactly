/**
 * Settings profiles — a named, portable snapshot of all masking-relevant
 * settings (categories, custom terms, structural rules, output mode,
 * sensitivity, engine preferences).
 *
 * Profiles let a user switch context in one click ("client A" vs "internal")
 * and share a configuration across machines via an exported JSON file. This
 * module owns the wire format + validation so it can be unit-tested; the app
 * maps its settings store to/from `ProfileSettings`.
 *
 * Profiles never contain document text or a mapping — only configuration the
 * user typed themselves. Custom terms can still be sensitive (e.g. client
 * names), so an exported profile should be treated with the same care as any
 * config file, but it is NOT the un-masking key a mapping export is.
 */

const PROFILE_FORMAT = 'redactly-profile' as const;

export interface ProfileSettings {
  categories: string[];
  nerEnabled: boolean;
  webllmEnabled: boolean;
  webllmModelId: string;
  webllmTextPii: boolean;
  alwaysMask: string[];
  neverMask: string[];
  redactMode: boolean;
  minConfidence: number;
  columnRules: string[];
  jsonKeyRules: string[];
  regexRules: string[];
  /** Placeholder format preset: 'brackets' | 'angle' | 'curly'. */
  placeholderFormat: string;
  /** Opt-in realistic fake values instead of [PREFIX_N] placeholders. */
  fakeValues: boolean;
}

export interface RedactlyProfile {
  format: typeof PROFILE_FORMAT;
  version: 1;
  name: string;
  settings: ProfileSettings;
}

function asStringArray(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return v.filter((x): x is string => typeof x === 'string');
}

function asBool(v: unknown, fallback: boolean): boolean {
  return typeof v === 'boolean' ? v : fallback;
}

/** Coerce arbitrary input into a well-formed ProfileSettings (defensive). */
export function normalizeSettings(input: unknown): ProfileSettings {
  const o = (input ?? {}) as Record<string, unknown>;
  let minConfidence = typeof o.minConfidence === 'number' ? o.minConfidence : 0;
  if (!Number.isFinite(minConfidence)) minConfidence = 0;
  minConfidence = Math.min(0.95, Math.max(0, minConfidence));
  return {
    categories: asStringArray(o.categories),
    nerEnabled: asBool(o.nerEnabled, false),
    webllmEnabled: asBool(o.webllmEnabled, false),
    webllmModelId: typeof o.webllmModelId === 'string' ? o.webllmModelId : '',
    webllmTextPii: asBool(o.webllmTextPii, true),
    alwaysMask: asStringArray(o.alwaysMask),
    neverMask: asStringArray(o.neverMask),
    redactMode: asBool(o.redactMode, false),
    minConfidence,
    columnRules: asStringArray(o.columnRules),
    jsonKeyRules: asStringArray(o.jsonKeyRules),
    regexRules: asStringArray(o.regexRules),
    placeholderFormat:
      o.placeholderFormat === 'angle' || o.placeholderFormat === 'curly'
        ? o.placeholderFormat
        : 'brackets',
    fakeValues: asBool(o.fakeValues, false),
  };
}

/** Serialize a named profile to pretty JSON for download. */
export function serializeProfile(name: string, settings: ProfileSettings): string {
  const profile: RedactlyProfile = {
    format: PROFILE_FORMAT,
    version: 1,
    name,
    settings: normalizeSettings(settings),
  };
  return JSON.stringify(profile, null, 2);
}

/** Parse + validate an exported profile. Throws on a non-profile file. */
export function parseProfile(json: string): RedactlyProfile {
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch {
    throw new Error('Datei ist kein gültiges JSON');
  }
  const o = parsed as Partial<RedactlyProfile> | null;
  if (!o || o.format !== PROFILE_FORMAT) {
    throw new Error('Keine gültige Redactly-Profil-Datei');
  }
  return {
    format: PROFILE_FORMAT,
    version: 1,
    name: typeof o.name === 'string' && o.name.trim() ? o.name : 'Profil',
    settings: normalizeSettings(o.settings),
  };
}
