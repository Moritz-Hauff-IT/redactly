/**
 * Structural diff between original text and its masked/redacted output.
 *
 * No LCS algorithm needed: the changes are exactly the entity spans, so we
 * walk the original text and split it into unchanged runs interleaved with
 * change segments (original slice → replacement). This drives a compact
 * before/after view so the user can verify what masking actually touched.
 */

export interface DiffChange {
  start: number;
  end: number;
  /** What the original span was replaced with (placeholder or ████). */
  replacement: string;
}

export interface DiffSegment {
  kind: 'same' | 'change';
  /** Unchanged text (kind 'same') or the original span (kind 'change'). */
  text: string;
  /** Present only for 'change' segments. */
  replacement?: string;
}

/**
 * Build the diff segments. Overlapping or out-of-range changes are skipped
 * defensively; changes are processed left-to-right.
 */
export function computeDiff(original: string, changes: DiffChange[]): DiffSegment[] {
  const valid = changes
    .filter((c) => c.start >= 0 && c.end <= original.length && c.start < c.end)
    .sort((a, b) => a.start - b.start);

  const segments: DiffSegment[] = [];
  let cursor = 0;
  for (const c of valid) {
    if (c.start < cursor) continue; // overlaps a previous change — skip
    if (c.start > cursor) {
      segments.push({ kind: 'same', text: original.slice(cursor, c.start) });
    }
    segments.push({
      kind: 'change',
      text: original.slice(c.start, c.end),
      replacement: c.replacement,
    });
    cursor = c.end;
  }
  if (cursor < original.length) {
    segments.push({ kind: 'same', text: original.slice(cursor) });
  }
  return segments;
}
