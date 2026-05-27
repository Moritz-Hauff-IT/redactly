import { mask } from '@de-pii/core/masker';
import { restore } from '@de-pii/core/restorer';
import type { MaskResult } from '@de-pii/core/masker';
import type { RestoreResult } from '@de-pii/core/restorer';
import { detectionStore } from '../stores/detectionStore.svelte.js';
import { mappingStore } from '../stores/mappingStore.svelte.js';

/**
 * Mask text using the currently active (enabled) entities from detectionStore.
 * Stores the resulting mapping into mappingStore and returns the mask result.
 *
 * Note: we intentionally do NOT read mappingStore here. Reading + writing the
 * same Svelte $state inside one effect tick triggers Svelte 5's
 * effect_update_depth_exceeded loop guard. The masker is deterministic on
 * (text, entities) so rebuilding from scratch produces identical placeholders.
 */
export function maskText(text: string): MaskResult {
  const activeEntities = detectionStore.activeEntities;
  const result = mask(text, activeEntities);
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
