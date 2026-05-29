/**
 * URL param matcher for the optional `lang` segment in `[[lang=lang]]/...`.
 *
 * Only matches `'en'` because German is the URL-bare default — visiting `/`
 * is the German home; `/en` is the English home. Rejecting `'de'` here
 * prevents a duplicate URL pair (e.g. `/` and `/de/`) that would split
 * link equity and trigger duplicate-content warnings.
 *
 * If you add more locales later (e.g. `fr`), include them in this matcher
 * AND extend the `LOCALES` constant in `src/lib/i18n/messages.ts`.
 */
import type { ParamMatcher } from '@sveltejs/kit';

export const match: ParamMatcher = (param) => param === 'en';
