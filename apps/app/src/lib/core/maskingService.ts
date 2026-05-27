import { mask, restore } from '@de-pii/core';
import type { MaskResult, RestoreResult } from '@de-pii/core';
import { detectionStore } from '../stores/detectionStore.svelte.js';
import { mappingStore } from '../stores/mappingStore.svelte.js';

/**
 * Mask text using the currently active (enabled) entities from detectionStore.
 * Stores the resulting mapping into mappingStore and returns the mask result.
 */
export function maskText(text: string): MaskResult {
  const activeEntities = detectionStore.activeEntities;
  const existing = mappingStore.get() ?? undefined;

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
