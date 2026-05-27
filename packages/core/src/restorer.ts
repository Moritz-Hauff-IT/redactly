/**
 * restorer.ts — Substitute placeholders back to original values.
 *
 * Supports tolerant matching so that LLM-modified placeholder forms
 * (space instead of underscore, different bracket styles, no brackets)
 * are still restored correctly.
 */

import type { Mapping } from './masker.js';

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export interface RestoreOptions {
  /**
   * Tolerate common placeholder variants emitted by LLMs.
   * When true (default):
   *   [PERSON_1], [PERSON 1], <PERSON_1>, {PERSON_1}, PERSON_1
   *   all restore to the original value.
   * When false, only the exact placeholder form from the mapping is restored.
   */
  tolerant?: boolean;
}

export interface RestoreResult {
  restoredText: string;
  /** Placeholders that were found and successfully restored. */
  restored: string[];
  /** Placeholders in the mapping that did NOT appear in the input. */
  unused: string[];
  /** Strings that looked like placeholders but had no mapping match. */
  unknown: string[];
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Escape a string for safe inclusion in a RegExp.
 */
function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Parse the canonical placeholder into its prefix and numeric parts.
 * Returns null if the placeholder doesn't match the expected pattern.
 *
 * We scan for a segment matching [A-Z][A-Z_]*_\d+ and use the last
 * underscore-digit boundary as the split point, to handle prefixes like TAX_ID.
 */
function parsePlaceholder(placeholder: string): { prefix: string; n: string } | null {
  // Strip common bracket wrappers to get the core token
  const core = placeholder.replace(/^[\[<{]+/, '').replace(/[\]>}]+$/, '');
  // Match PREFIX_N where PREFIX may contain underscores (e.g. TAX_ID)
  const m = /^([A-Z][A-Z_]*)_(\d+)$/.exec(core);
  if (!m || m[1] === undefined || m[2] === undefined) return null;
  return { prefix: m[1], n: m[2] };
}

/**
 * Build a regex that matches the canonical placeholder and, when tolerant,
 * also common LLM-introduced variants.
 */
function buildMatchRegex(placeholder: string, tolerant: boolean): RegExp {
  if (!tolerant) {
    return new RegExp(escapeRegex(placeholder), 'g');
  }

  const parsed = parsePlaceholder(placeholder);
  if (!parsed) {
    // Fallback: exact match only
    return new RegExp(escapeRegex(placeholder), 'g');
  }

  const { prefix, n } = parsed;
  const escapedPrefix = escapeRegex(prefix);

  // Build alternatives:
  // 1. [PREFIX_N]  — canonical square brackets, underscore
  // 2. [PREFIX N]  — square brackets, space instead of underscore
  // 3. <PREFIX_N>  — angle brackets
  // 4. {PREFIX_N}  — curly brackets
  // 5. PREFIX_N    — bare, surrounded by non-word chars (word-boundary-ish)
  //    We use (?<!\w) and (?!\w) to avoid matching inside longer identifiers.
  const alts = [
    `\\[${escapedPrefix}_${n}\\]`,
    `\\[${escapedPrefix} ${n}\\]`,
    `<${escapedPrefix}_${n}>`,
    `\\{${escapedPrefix}_${n}\\}`,
    `(?<![\\w])${escapedPrefix}_${n}(?![\\w])`,
  ].join('|');

  return new RegExp(alts, 'g');
}

// ---------------------------------------------------------------------------
// Main API
// ---------------------------------------------------------------------------

/**
 * Restore original values by replacing placeholders in text using the mapping.
 *
 * **Limitation:** The restorer cannot distinguish a placeholder it inserted
 * from a placeholder-shaped string that was present in the original input.
 * See `mask()` docs for mitigation.
 */
export function restore(text: string, mapping: Mapping, options?: RestoreOptions): RestoreResult {
  const tolerant = options?.tolerant ?? true;

  const restored: string[] = [];
  const unused: string[] = [];

  let restoredText = text;

  for (const [placeholder, original] of mapping.forward) {
    const re = buildMatchRegex(placeholder, tolerant);

    let found = false;
    restoredText = restoredText.replace(re, () => {
      found = true;
      return original;
    });

    if (found) {
      restored.push(placeholder);
    } else {
      unused.push(placeholder);
    }
  }

  // Detect unknown placeholder-shaped strings remaining in the restored text.
  // A fresh regex is created each call to avoid g-flag lastIndex state leaking
  // between invocations.
  const placeholderShaped = /(?:\[|<|\{)?[A-Z][A-Z_]*_\d+(?:\]|>|\})?/g;
  const unknown: string[] = [];
  let m: RegExpExecArray | null;
  const seen = new Set<string>();

  while ((m = placeholderShaped.exec(restoredText)) !== null) {
    const candidate = m[0];
    // Only flag it if it looks like a genuine placeholder (uppercase + digits)
    // and is not in the forward map
    const core = candidate.replace(/^[\[<{]+/, '').replace(/[\]>}]+$/, '');
    if (
      /^[A-Z][A-Z_]*_\d+$/.test(core) &&
      !mapping.forward.has(candidate) &&
      !seen.has(candidate)
    ) {
      seen.add(candidate);
      unknown.push(candidate);
    }
  }

  return { restoredText, restored, unused, unknown };
}
