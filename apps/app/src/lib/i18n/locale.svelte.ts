/**
 * Locale store + translation helper (app variant).
 *
 * Locale is persisted to localStorage (`redactly:locale` — shared key with
 * the landing site so the choice carries across domains when self-hosted
 * under the same eTLD+1). The store is reactive — components calling
 * `t(key)` re-render automatically when the user switches language.
 */

import { browser } from '$app/environment';
import { DEFAULT_LOCALE, messages, type Locale, type MessageKey } from './messages.js';

const STORAGE_KEY = 'redactly:locale';

function loadInitial(): Locale {
  if (!browser) return DEFAULT_LOCALE;
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === 'de' || stored === 'en') return stored;
    const nav = navigator.language?.slice(0, 2);
    if (nav === 'en') return 'en';
  } catch {
    /* private mode */
  }
  return DEFAULT_LOCALE;
}

function createLocaleStore() {
  let locale = $state<Locale>(loadInitial());
  return {
    get current() {
      return locale;
    },
    set(next: Locale) {
      locale = next;
      if (!browser) return;
      try {
        localStorage.setItem(STORAGE_KEY, next);
        document.documentElement.lang = next;
      } catch {
        /* ignore */
      }
    },
    toggle() {
      this.set(locale === 'de' ? 'en' : 'de');
    },
  };
}

export const localeStore = createLocaleStore();

export function t(key: MessageKey, params?: Record<string, string | number>): string {
  const entry = messages[key];
  if (!entry) return key;
  const value = entry[localeStore.current] ?? entry.de ?? key;
  if (!params) return value;
  return value.replace(/\{(\w+)\}/g, (_match, name) => String(params[name] ?? `{${name}}`));
}
