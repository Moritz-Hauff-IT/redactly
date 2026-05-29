/**
 * Static-prerender all locale-prefixed pages. SvelteKit's optional dynamic
 * segment `[[lang=lang]]` matches both the bare URL (lang=undefined, default
 * German) and the prefixed `/en/...` URLs. The `entries` export tells the
 * prerender crawler which values to render for the optional segment.
 */
export const prerender = true;
