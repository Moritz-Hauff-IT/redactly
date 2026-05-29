/**
 * URL-driven locale derivation + translation helper (app variant).
 * See landing-app sibling for full design notes.
 */

import { page } from '$app/state';
import { messages, type Locale, type MessageKey } from './messages.js';

export function currentLocale(): Locale {
  return page.params.lang === 'en' ? 'en' : 'de';
}

export function t(key: MessageKey, params?: Record<string, string | number>): string {
  const entry = messages[key];
  if (!entry) return key;
  const value = entry[currentLocale()] ?? entry.de ?? key;
  if (!params) return value;
  return value.replace(/\{(\w+)\}/g, (_match, name) => String(params[name] ?? `{${name}}`));
}

export function localizedHref(href: string, locale?: Locale): string {
  const loc = locale ?? currentLocale();
  if (loc === 'de') return href;
  if (href === '/') return '/en';
  return `/en${href.startsWith('/') ? href : '/' + href}`;
}

export function switchLocaleHref(currentPath: string, toLocale: Locale): string {
  const bare = currentPath.replace(/^\/en(?=\/|$)/, '') || '/';
  return localizedHref(bare, toLocale);
}

/**
 * Pick the current-locale value from a `{ de, en }` pair. Use this for
 * component-local bilingual data structures where defining flat keys in
 * `messages.ts` would be more friction than it's worth.
 */
export function loc<T>(value: { de: T; en: T }): T {
  return value[currentLocale()];
}
