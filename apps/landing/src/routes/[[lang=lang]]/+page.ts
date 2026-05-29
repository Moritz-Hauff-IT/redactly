/**
 * Tells the static-prerender crawler which values the optional `[[lang=lang]]`
 * segment should take when generating the home page. From here the crawler
 * follows links (with locale-aware hrefs) into every sub-route.
 */
import type { EntryGenerator } from './$types.js';

export const entries: EntryGenerator = () => [{ lang: undefined }, { lang: 'en' }];
