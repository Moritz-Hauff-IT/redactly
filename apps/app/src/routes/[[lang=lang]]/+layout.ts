/**
 * Prerender both locale variants of every page (bare and /en-prefixed).
 * `ssr=false` on the app — masking runs purely client-side so the server
 * never needs to render anything live; the prerendered shell is enough.
 */
export const prerender = true;
export const ssr = false;
