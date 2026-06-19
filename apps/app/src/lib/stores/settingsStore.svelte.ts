import type { EntityCategory } from '@redactly/core/types';

const ALL_CATEGORIES: EntityCategory[] = [
  'person',
  'contact',
  'address',
  'financial',
  'identity',
  'secret',
  'organization',
  'other',
];

const LS_CATEGORIES_KEY = 'de-pii:settings:categories';
const LS_NER_KEY = 'de-pii:settings:ner-enabled';
const LS_WEBLLM_KEY = 'de-pii:settings:webllm-enabled';
const LS_WEBLLM_MODEL_KEY = 'de-pii:settings:webllm-model';
const LS_WEBLLM_TEXT_PII_KEY = 'de-pii:settings:webllm-text-pii';
const LS_ALWAYS_MASK_KEY = 'de-pii:settings:always-mask';
const LS_NEVER_MASK_KEY = 'de-pii:settings:never-mask';
const LS_REDACT_MODE_KEY = 'de-pii:settings:redact-mode';
const LS_MIN_CONFIDENCE_KEY = 'de-pii:settings:min-confidence';

function loadMinConfidence(): number {
  const raw = safeLocalStorageGet(LS_MIN_CONFIDENCE_KEY);
  const n = raw === null ? 0 : Number.parseFloat(raw);
  if (!Number.isFinite(n)) return 0;
  return Math.min(0.95, Math.max(0, n));
}

const DEFAULT_WEBLLM_MODEL = 'Llama-3.2-3B-Instruct-q4f16_1-MLC';

function loadTermList(key: string): string[] {
  const raw = safeLocalStorageGet(key);
  if (raw === null) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (Array.isArray(parsed)) {
      return parsed.filter((t): t is string => typeof t === 'string' && t.trim().length > 0);
    }
  } catch {
    // ignore
  }
  return [];
}

function safeLocalStorageGet(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeLocalStorageSet(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    // private browsing mode may throw — silently ignore
  }
}

function loadEnabledCategories(): Set<EntityCategory> {
  const raw = safeLocalStorageGet(LS_CATEGORIES_KEY);
  if (raw === null) {
    return new Set(ALL_CATEGORIES);
  }
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (Array.isArray(parsed)) {
      const valid = (parsed as string[]).filter((c): c is EntityCategory =>
        (ALL_CATEGORIES as string[]).includes(c)
      );
      return new Set(valid.length > 0 ? valid : ALL_CATEGORIES);
    }
  } catch {
    // ignore parse errors
  }
  return new Set(ALL_CATEGORIES);
}

function loadNerEnabled(): boolean {
  // Default OFF — first-time visitors get instant regex-only detection with
  // no model download. NER is opt-in via Settings; the explicit choice is
  // persisted as 'true'/'false' and restored on the next visit.
  return safeLocalStorageGet(LS_NER_KEY) === 'true';
}

function loadWebllmEnabled(): boolean {
  // Without WebGPU we can't load the model, so an enabled flag would only
  // produce an immediate error (or a stuck loading state) — treat as off.
  if (typeof navigator === 'undefined' || !('gpu' in navigator)) return false;
  // Default OFF — same opt-in contract as NER: no multi-GB download until
  // the user enables WebLLM in Settings.
  return safeLocalStorageGet(LS_WEBLLM_KEY) === 'true';
}

function loadWebllmModelId(): string {
  return safeLocalStorageGet(LS_WEBLLM_MODEL_KEY) ?? DEFAULT_WEBLLM_MODEL;
}

function loadWebllmTextPii(): boolean {
  // Default ON — internal eval showed WebLLM-in-text-pipeline jumps name
  // recall from ~50% (NER alone) to ~100%. The latency cost (~15-45s per
  // mask) is acceptable when accuracy matters. Explicit 'false' opts out.
  const raw = safeLocalStorageGet(LS_WEBLLM_TEXT_PII_KEY);
  if (raw === 'false') return false;
  return true;
}

function createSettingsStore() {
  let enabledCategories = $state<Set<EntityCategory>>(loadEnabledCategories());
  let nerEnabled = $state<boolean>(loadNerEnabled());
  let webllmEnabled = $state<boolean>(loadWebllmEnabled());
  let webllmModelId = $state<string>(loadWebllmModelId());
  let webllmTextPii = $state<boolean>(loadWebllmTextPii());
  let alwaysMask = $state<string[]>(loadTermList(LS_ALWAYS_MASK_KEY));
  let neverMask = $state<string[]>(loadTermList(LS_NEVER_MASK_KEY));
  // Output mode: false = pseudonymize (reversible placeholders + mapping),
  // true = redact (opaque ████ blocks, irreversible, no mapping).
  let redactMode = $state<boolean>(safeLocalStorageGet(LS_REDACT_MODE_KEY) === 'true');
  // Minimum detector confidence (0..0.95) to keep an entity. Higher = fewer
  // false positives, lower recall. Manual / custom-term hits (confidence 1)
  // always pass.
  let minConfidence = $state<number>(loadMinConfidence());

  function addTerm(list: string[], term: string): string[] {
    const t = term.trim();
    if (!t) return list;
    if (list.some((x) => x.toLowerCase() === t.toLowerCase())) return list;
    return [...list, t];
  }
  function removeTerm(list: string[], term: string): string[] {
    return list.filter((x) => x !== term);
  }

  return {
    get enabledCategories() {
      return enabledCategories;
    },
    get nerEnabled() {
      return nerEnabled;
    },
    get webllmEnabled() {
      return webllmEnabled;
    },
    get webllmModelId() {
      return webllmModelId;
    },
    /** When true, WebLLM also runs in the text-PII detection pipeline (slow).
     * When false (default), WebLLM is only used for orchestration tasks
     * (file routing, document classification, plan generation). */
    get webllmTextPii() {
      return webllmTextPii;
    },
    get allCategories() {
      return ALL_CATEGORIES;
    },

    toggleCategory(cat: EntityCategory): void {
      const next = new Set(enabledCategories);
      if (next.has(cat)) {
        next.delete(cat);
      } else {
        next.add(cat);
      }
      enabledCategories = next;
      safeLocalStorageSet(LS_CATEGORIES_KEY, JSON.stringify([...next]));
    },

    setNerEnabled(b: boolean): void {
      nerEnabled = b;
      // Always persist explicit choice so a default-flip in a future release
      // can't silently re-enable something the user turned off.
      safeLocalStorageSet(LS_NER_KEY, b ? 'true' : 'false');
    },

    clearNerPreference(): void {
      nerEnabled = false;
      safeLocalStorageSet(LS_NER_KEY, 'false');
    },

    setWebllmEnabled(b: boolean): void {
      webllmEnabled = b;
      safeLocalStorageSet(LS_WEBLLM_KEY, b ? 'true' : 'false');
    },

    setWebllmModelId(id: string): void {
      webllmModelId = id;
      safeLocalStorageSet(LS_WEBLLM_MODEL_KEY, id);
    },

    clearWebllmPreference(): void {
      webllmEnabled = false;
      safeLocalStorageSet(LS_WEBLLM_KEY, 'false');
    },

    setWebllmTextPii(b: boolean): void {
      webllmTextPii = b;
      safeLocalStorageSet(LS_WEBLLM_TEXT_PII_KEY, b ? 'true' : 'false');
    },

    // ── Custom term lists ──────────────────────────────────────────────────
    /** Terms that should ALWAYS be masked, even if no detector finds them. */
    get alwaysMask() {
      return alwaysMask;
    },
    /** Terms that should NEVER be masked (suppress false positives). */
    get neverMask() {
      return neverMask;
    },
    addAlwaysMask(term: string): void {
      alwaysMask = addTerm(alwaysMask, term);
      safeLocalStorageSet(LS_ALWAYS_MASK_KEY, JSON.stringify(alwaysMask));
    },
    removeAlwaysMask(term: string): void {
      alwaysMask = removeTerm(alwaysMask, term);
      safeLocalStorageSet(LS_ALWAYS_MASK_KEY, JSON.stringify(alwaysMask));
    },
    addNeverMask(term: string): void {
      neverMask = addTerm(neverMask, term);
      safeLocalStorageSet(LS_NEVER_MASK_KEY, JSON.stringify(neverMask));
    },
    removeNeverMask(term: string): void {
      neverMask = removeTerm(neverMask, term);
      safeLocalStorageSet(LS_NEVER_MASK_KEY, JSON.stringify(neverMask));
    },

    // ── Output mode ────────────────────────────────────────────────────────
    /** true = irreversible redaction (████, no mapping); false = pseudonymize. */
    get redactMode() {
      return redactMode;
    },
    setRedactMode(b: boolean): void {
      redactMode = b;
      safeLocalStorageSet(LS_REDACT_MODE_KEY, b ? 'true' : 'false');
    },

    // ── Detection sensitivity ──────────────────────────────────────────────
    /** Minimum detector confidence to keep an entity (0..0.95). */
    get minConfidence() {
      return minConfidence;
    },
    setMinConfidence(n: number): void {
      minConfidence = Math.min(0.95, Math.max(0, Number.isFinite(n) ? n : 0));
      safeLocalStorageSet(LS_MIN_CONFIDENCE_KEY, String(minConfidence));
    },
  };
}

export const settingsStore = createSettingsStore();
export { ALL_CATEGORIES };
