/**
 * URL-driven locale derivation + translation helper.
 *
 * Locale comes from the route's `[[lang=lang]]` param:
 *   /...       → de (default, German)
 *   /en/...    → en (English)
 *
 * The matcher in `src/params/lang.ts` only accepts `'en'`, so the URL
 * space is exactly two locales. `t(key)` reads `page.params.lang`
 * reactively, so any component re-renders automatically when the user
 * navigates between locales.
 *
 * No localStorage / no first-visit detection: the URL is the single
 * source of truth — same string is always the same translation regardless
 * of who/when. This keeps SSR/prerender deterministic and avoids the
 * flash-of-wrong-language problem that client-only locale state has.
 */

import { page } from '$app/state';
import { messages, type Locale, type MessageKey } from './messages.js';

/** The active locale, derived live from the current URL. */
export function currentLocale(): Locale {
  return page.params.lang === 'en' ? 'en' : 'de';
}

/**
 * Resolve a message to the current locale. Falls back to German if the
 * English translation is missing for the key. Supports `{placeholder}`
 * interpolation.
 */
export function t(key: MessageKey, params?: Record<string, string | number>): string {
  const entry = messages[key];
  if (!entry) return key;
  const value = entry[currentLocale()] ?? entry.de ?? key;
  if (!params) return value;
  return value.replace(/\{(\w+)\}/g, (_match, name) => String(params[name] ?? `{${name}}`));
}

/**
 * Given an unprefixed path, return the locale-prefixed URL.
 * Use this for every internal `<a href>` so language navigation stays
 * within the same locale.
 *   localizedHref('/blog')          → '/blog'         (de)
 *   localizedHref('/blog', 'en')    → '/en/blog'
 *   localizedHref('/', 'en')        → '/en'
 */
export function localizedHref(href: string, locale?: Locale): string {
  const loc = locale ?? currentLocale();
  if (loc === 'de') return href;
  if (href === '/') return '/en';
  return `/en${href.startsWith('/') ? href : '/' + href}`;
}

/**
 * Given the CURRENT path, return what it should be in the OTHER locale.
 * Used by the language toggle to flip languages while preserving the
 * page the user is on.
 */
export function switchLocaleHref(currentPath: string, toLocale: Locale): string {
  // Strip an existing /en prefix if present
  const bare = currentPath.replace(/^\/en(?=\/|$)/, '') || '/';
  return localizedHref(bare, toLocale);
}
