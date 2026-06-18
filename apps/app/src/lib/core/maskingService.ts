import { untrack } from 'svelte';
import { mask } from '@redactly/core/masker';
import { restore } from '@redactly/core/restorer';
import type { MaskResult } from '@redactly/core/masker';
import type { RestoreResult } from '@redactly/core/restorer';
import { detectionStore } from '../stores/detectionStore.svelte.js';
import { mappingStore } from '../stores/mappingStore.svelte.js';

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
export function maskText(text: string): MaskResult {
  const activeEntities = detectionStore.activeEntities;
  const existing = untrack(() => mappingStore.current) ?? undefined;
  const result = mask(text, activeEntities, { existing });
  mappingStore.set(result.mapping);
  return result;
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
