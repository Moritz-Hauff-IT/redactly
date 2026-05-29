/**
 * URL param matcher for the optional `lang` segment in `[[lang=lang]]/...`.
 * See landing-app sibling file for full rationale.
 */
import type { ParamMatcher } from '@sveltejs/kit';

export const match: ParamMatcher = (param) => param === 'en';
