/**
 * Irreversible redaction — replace detected entities with an opaque marker
 * (default ████) and return ONLY the redacted text. Unlike mask(), this
 * produces no mapping, so the result cannot be restored. Use it for sharing a
 * document externally where the originals must be unrecoverable.
 *
 * A single fixed-width marker is used per entity (not one block per character)
 * so the redacted output does not leak the length of the original value.
 */
import type { Entity } from './types.js';

export interface RedactOptions {
  /** Replacement marker for each redacted span. Default '████'. */
  marker?: string;
}

export interface RedactResult {
  redactedText: string;
}

export function redact(text: string, entities: Entity[], options?: RedactOptions): RedactResult {
  const marker = options?.marker ?? '████';
  if (entities.length === 0) return { redactedText: text };

  // Sort ascending by start (longer span first on ties), then apply
  // right-to-left so earlier offsets stay valid as we splice.
  const sorted = [...entities].sort((a, b) => a.start - b.start || b.end - a.end);

  let result = text;
  // Start offset (in original coordinates) of the most recently applied span.
  let appliedStart = Infinity;
  for (let i = sorted.length - 1; i >= 0; i--) {
    const e = sorted[i]!;
    // Skip anything overlapping a span we already redacted to its right.
    if (e.end > appliedStart) continue;
    result = result.slice(0, e.start) + marker + result.slice(e.end);
    appliedStart = e.start;
  }

  return { redactedText: result };
}
