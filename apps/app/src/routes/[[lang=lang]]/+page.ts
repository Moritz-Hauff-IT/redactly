/**
 * Entry-generator for the optional `[[lang=lang]]` segment on the home page.
 * The crawler then follows links into /about (etc.) for each locale.
 */
import type { EntryGenerator } from './$types.js';

export const entries: EntryGenerator = () => [{ lang: undefined }, { lang: 'en' }];
