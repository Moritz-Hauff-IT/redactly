import type { EntityCategory } from '@redactly/core/types';

const ALL_CATEGORIES: EntityCategory[] = [
  'person',
  'contact',
  'address',
  'financial',
  'identity',
  'secret',
  'organization',
];

const LS_CATEGORIES_KEY = 'de-pii:settings:categories';
const LS_NER_KEY = 'de-pii:settings:ner-enabled';
const LS_WEBLLM_KEY = 'de-pii:settings:webllm-enabled';
const LS_WEBLLM_MODEL_KEY = 'de-pii:settings:webllm-model';
const LS_WEBLLM_TEXT_PII_KEY = 'de-pii:settings:webllm-text-pii';

const DEFAULT_WEBLLM_MODEL = 'Llama-3.2-3B-Instruct-q4f16_1-MLC';

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

function safeLocalStorageRemove(key: string): void {
  try {
    localStorage.removeItem(key);
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
  const raw = safeLocalStorageGet(LS_NER_KEY);
  return raw === 'true';
}

function loadWebllmEnabled(): boolean {
  const raw = safeLocalStorageGet(LS_WEBLLM_KEY);
  return raw === 'true';
}

function loadWebllmModelId(): string {
  return safeLocalStorageGet(LS_WEBLLM_MODEL_KEY) ?? DEFAULT_WEBLLM_MODEL;
}

function loadWebllmTextPii(): boolean {
  // Off by default — small browser LLMs are too slow/unreliable for primary
  // text-PII extraction. WebLLM is preferred for orchestration (file routing,
  // plan generation) where its strengths actually fit.
  const raw = safeLocalStorageGet(LS_WEBLLM_TEXT_PII_KEY);
  return raw === 'true';
}

function createSettingsStore() {
  let enabledCategories = $state<Set<EntityCategory>>(loadEnabledCategories());
  let nerEnabled = $state<boolean>(loadNerEnabled());
  let webllmEnabled = $state<boolean>(loadWebllmEnabled());
  let webllmModelId = $state<string>(loadWebllmModelId());
  let webllmTextPii = $state<boolean>(loadWebllmTextPii());

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
      if (b) {
        safeLocalStorageSet(LS_NER_KEY, 'true');
      } else {
        safeLocalStorageRemove(LS_NER_KEY);
      }
    },

    clearNerPreference(): void {
      nerEnabled = false;
      safeLocalStorageRemove(LS_NER_KEY);
    },

    setWebllmEnabled(b: boolean): void {
      webllmEnabled = b;
      if (b) {
        safeLocalStorageSet(LS_WEBLLM_KEY, 'true');
      } else {
        safeLocalStorageRemove(LS_WEBLLM_KEY);
      }
    },

    setWebllmModelId(id: string): void {
      webllmModelId = id;
      safeLocalStorageSet(LS_WEBLLM_MODEL_KEY, id);
    },

    clearWebllmPreference(): void {
      webllmEnabled = false;
      safeLocalStorageRemove(LS_WEBLLM_KEY);
    },

    setWebllmTextPii(b: boolean): void {
      webllmTextPii = b;
      if (b) {
        safeLocalStorageSet(LS_WEBLLM_TEXT_PII_KEY, 'true');
      } else {
        safeLocalStorageRemove(LS_WEBLLM_TEXT_PII_KEY);
      }
    },
  };
}

export const settingsStore = createSettingsStore();
export { ALL_CATEGORIES };
