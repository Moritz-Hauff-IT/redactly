import type { EntityCategory } from '@de-pii/core/types';

const ALL_CATEGORIES: EntityCategory[] = [
  'person',
  'contact',
  'address',
  'financial',
  'secret',
  'organization',
];

const LS_CATEGORIES_KEY = 'de-pii:settings:categories';
const LS_NER_KEY = 'de-pii:settings:ner-enabled';

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

function createSettingsStore() {
  let enabledCategories = $state<Set<EntityCategory>>(loadEnabledCategories());
  let nerEnabled = $state<boolean>(loadNerEnabled());

  return {
    get enabledCategories() {
      return enabledCategories;
    },
    get nerEnabled() {
      return nerEnabled;
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
  };
}

export const settingsStore = createSettingsStore();
export { ALL_CATEGORIES };
