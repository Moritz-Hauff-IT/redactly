/**
 * Realistic fake-value generator (opt-in alternative to `[PERSON_1]`).
 *
 * Produces natural-looking, obviously-synthetic stand-ins so the masked text
 * reads like real prose — which can make an LLM's response more useful — while
 * staying fully reversible (each fake value is a unique mapping key).
 *
 * Values are deterministic in the per-prefix counter `n`, so the masker's
 * collision-skip keeps them unique. Types without a sensible "realistic" form
 * (secrets, IDs, dates, …) fall back to the normal `[PREFIX_N]` placeholder —
 * we never fabricate a plausible secret. Fake values use reserved/example
 * ranges (example.com, 192.0.2.0/24) so they can't collide with anything real.
 */

import type { EntityType } from './types.js';
import type { ReplacementArgs, ReplacementFn } from './masker.js';

const FIRST_NAMES = [
  'Max',
  'Erika',
  'Hans',
  'Anna',
  'Felix',
  'Laura',
  'Jonas',
  'Sophie',
  'Lukas',
  'Marie',
  'Paul',
  'Lena',
  'Tim',
  'Sarah',
  'Jan',
  'Nina',
];

const LAST_NAMES = [
  'Mustermann',
  'Beispiel',
  'Muster',
  'Schmidt',
  'Weber',
  'Meier',
  'Fischer',
  'Keller',
  'Brunner',
  'Graf',
  'Huber',
  'Steiner',
  'Bauer',
  'Wolf',
  'Roth',
  'Vogel',
];

const COMPANIES = [
  'Beispiel GmbH',
  'Muster AG',
  'Acme Solutions GmbH',
  'Nordwind AG',
  'Beispiel & Partner',
  'Alpenblick GmbH',
  'Musterhaus AG',
  'Beispiel Industries',
];

const CITIES = [
  'Musterstadt',
  'Beispielheim',
  'Neudorf',
  'Berlin',
  'Hamburg',
  'Zürich',
  'Wien',
  'Bern',
  'Köln',
  'Graz',
];

function pick(list: string[], n: number): string {
  return list[(n - 1) % list.length] as string;
}

/** First+last name combo, cycling through both lists for many unique pairs. */
function fakeName(n: number): string {
  const first = FIRST_NAMES[(n - 1) % FIRST_NAMES.length] as string;
  const last = LAST_NAMES[Math.floor((n - 1) / FIRST_NAMES.length) % LAST_NAMES.length] as string;
  return `${first} ${last}`;
}

function asciiFold(s: string): string {
  return s
    .replace(/ä/g, 'ae')
    .replace(/ö/g, 'oe')
    .replace(/ü/g, 'ue')
    .replace(/ß/g, 'ss')
    .replace(/[^a-zA-Z0-9.]/g, '');
}

function fakeEmail(n: number): string {
  const first = FIRST_NAMES[(n - 1) % FIRST_NAMES.length] as string;
  const last = LAST_NAMES[Math.floor((n - 1) / FIRST_NAMES.length) % LAST_NAMES.length] as string;
  const local = asciiFold(`${first}.${last}`).toLowerCase();
  // Distinguish repeats beyond the first cycle with the counter.
  const suffix = n > FIRST_NAMES.length ? n : '';
  return `${local}${suffix}@example.com`;
}

/** Generators for the types where a realistic value makes sense. */
const GENERATORS: Partial<Record<EntityType, (n: number) => string>> = {
  PERSON: fakeName,
  ORG: (n) => pick(COMPANIES, n),
  LOCATION: (n) => pick(CITIES, n),
  EMAIL: fakeEmail,
  PHONE: (n) => `+49 30 ${String(1000000 + n).slice(0, 7)}`,
  URL: (n) => `https://example.com/seite-${n}`,
  IP: (n) => `192.0.2.${n % 254}`,
  DATE: (n) => `0${(n % 9) + 1}.01.2000`,
};

/**
 * Build a replacement function that yields realistic fake values for the
 * supported types and falls back to `[PREFIX_N]` placeholders (using `format`)
 * for everything else.
 */
export function createFakeGenerator(format: string): ReplacementFn {
  return ({ type, prefix, n }: ReplacementArgs): string => {
    const gen = GENERATORS[type];
    if (gen) return gen(n);
    return format.replace('{PREFIX}', prefix).replace('{N}', String(n));
  };
}
