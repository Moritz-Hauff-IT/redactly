import { untrack } from 'svelte';
import { mask, redact } from '@redactly/core/masker';
import { restore } from '@redactly/core/restorer';
import { createFakeGenerator } from '@redactly/core/fakeValues';
import { verifyRoundTrip } from '@redactly/core/safety';
import type { MaskResult } from '@redactly/core/masker';
import type { RestoreResult } from '@redactly/core/restorer';
import { detectionStore } from '../stores/detectionStore.svelte.js';
import { mappingStore } from '../stores/mappingStore.svelte.js';
import { settingsStore } from '../stores/settingsStore.svelte.js';

/**
 * Mask text using the currently active (enabled) entities from detectionStore.
 * Stores the resulting mapping into mappingStore and returns the mask result.
 *
 * The existing mapping is REUSED so placeholders stay consistent across
 * successive masks (mask message 1, then message 2 → the same value keeps the
 * same placeholder) and earlier masked output stays restorable. We read the
 * existing mapping `untrack`-ed: maskText runs inside a Svelte $effect, and a
 * tracked read-then-write of the same $state would trip Svelte 5's
 * effect_update_depth_exceeded loop guard. Untracking the read breaks the
 * dependency so the write never re-triggers the effect.
 */
// Stable per-page-load nonce, only applied when a placeholder collision is
// actually detected — keeps placeholders clean ([PERSON_1]) in the common case.
const SESSION_NONCE = (() => {
  try {
    const buf = new Uint8Array(2);
    crypto.getRandomValues(buf);
    return Array.from(buf, (b) => b.toString(16).padStart(2, '0')).join('');
  } catch {
    return 'r0';
  }
})();

export function maskText(text: string): MaskResult {
  const activeEntities = detectionStore.activeEntities;
  const existing = untrack(() => mappingStore.current) ?? undefined;
  const format = settingsStore.placeholderTemplate;
  // Realistic fake values are opt-in; the default stays [PREFIX_N] placeholders.
  const replacement = settingsStore.fakeValues ? createFakeGenerator(format) : undefined;
  let result = mask(text, activeEntities, { existing, format, replacement });
  // Auto-fix placeholder collisions: if the masked text can't round-trip
  // exactly (input already contained a placeholder-shaped string), re-mask
  // with a collision-proof nonce. Only triggers in the rare clashing case.
  if (!replacement && !verifyRoundTrip(text, result.maskedText, result.mapping)) {
    result = mask(text, activeEntities, { existing, format, nonce: SESSION_NONCE });
  }
  mappingStore.set(result.mapping);
  return result;
}

/**
 * Irreversibly redact text (opaque ████ blocks) using the active entities.
 * Produces NO mapping — the result can't be restored. Clears any existing
 * mapping so the Restore tab is correctly unavailable in redact mode.
 */
export function redactText(text: string): string {
  const activeEntities = detectionStore.activeEntities;
  const { redactedText } = redact(text, activeEntities);
  if (untrack(() => mappingStore.current) !== null) mappingStore.clear();
  return redactedText;
}

/**
 * Restore masked text using the current mapping from mappingStore.
 */
export function restoreText(maskedText: string): RestoreResult {
  const currentMapping = mappingStore.get();
  if (!currentMapping) {
    return {
      restoredText: maskedText,
      restored: [],
      unused: [],
      unknown: [],
    };
  }
  return restore(maskedText, currentMapping);
}
