/**
 * Locale store + translation helper.
 *
 * Locale is persisted to localStorage (`redactly:locale`). The store is
 * reactive — components that call `t(key)` re-render automatically when
 * the user switches language.
 *
 * URL-prefix routing is intentionally NOT used for the initial release:
 * the prerender pipeline + matcher refactor is invasive, and the DACH/
 * German-speaking user is the primary audience. Language switching is
 * client-only; SEO sees the German baseline. If English SEO becomes a
 * goal later, migrate to `[[lang=lang]]` route segments — the messages
 * file stays as-is.
 */

import { browser } from '$app/environment';
import { DEFAULT_LOCALE, messages, type Locale, type MessageKey } from './messages.js';

const STORAGE_KEY = 'redactly:locale';

function loadInitial(): Locale {
  if (!browser) return DEFAULT_LOCALE;
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === 'de' || stored === 'en') return stored;
    // Best-effort browser-language detection on first visit
    const nav = navigator.language?.slice(0, 2);
    if (nav === 'en') return 'en';
  } catch {
    /* private mode, etc. — fall through to default */
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
        // Update <html lang> for accessibility + browser language indicators
        document.documentElement.lang = next;
      } catch {
        /* ignore — non-fatal */
      }
    },
    toggle() {
      this.set(locale === 'de' ? 'en' : 'de');
    },
  };
}

export const localeStore = createLocaleStore();

/**
 * Look up a translated string. Falls back to German if the requested locale
 * has no translation for the key. Supports `{placeholder}` interpolation.
 */
export function t(key: MessageKey, params?: Record<string, string | number>): string {
  const entry = messages[key];
  if (!entry) return key;
  const value = entry[localeStore.current] ?? entry.de ?? key;
  if (!params) return value;
  return value.replace(/\{(\w+)\}/g, (_match, name) => String(params[name] ?? `{${name}}`));
}
