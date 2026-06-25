/**
 * User-defined custom entity types.
 *
 * Beyond the built-in detectors, users often know a domain-specific identifier
 * the tool can't: an internal "Kundennummer", a ticket id, a project code.
 * A custom type pairs a human label with a regex; matches are masked under a
 * placeholder derived from the label (`[KUNDENNUMMER_1]`) so the masked text
 * stays readable and the category is obvious.
 *
 * Pure and offset-preserving so it can be unit tested; the app turns the
 * matches into manual entities (with a `prefix` override) for the masker.
 */

export interface CustomType {
  /** Display name; also the basis for the placeholder prefix. */
  label: string;
  /** Regex source. Group 1 is masked if present, else the whole match. */
  pattern: string;
}

export interface CustomMatch {
  start: number;
  end: number;
  text: string;
  /** Sanitised placeholder prefix derived from the label. */
  prefix: string;
  label: string;
}

const MAX_MATCHES = 10000;

/** Turn an arbitrary label into a safe placeholder prefix (KUNDEN_NR). */
export function labelToPrefix(label: string): string {
  const p = label
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
  return p || 'CUSTOM';
}

/** Find all matches of the given custom types in `text` (non-overlapping). */
export function findCustomTypeMatches(text: string, types: CustomType[]): CustomMatch[] {
  const matches: CustomMatch[] = [];
  for (const type of types) {
    const src = type.pattern.trim();
    if (!src) continue;
    let re: RegExp;
    try {
      re = new RegExp(src, 'g');
    } catch {
      continue; // invalid pattern — ignore rather than throw
    }
    const prefix = labelToPrefix(type.label);
    let m: RegExpExecArray | null;
    let count = 0;
    while ((m = re.exec(text)) !== null) {
      if (count++ >= MAX_MATCHES) break;
      const group = m[1];
      let start: number;
      let end: number;
      if (group !== undefined && group.length > 0) {
        const rel = m[0].indexOf(group);
        start = m.index + (rel === -1 ? 0 : rel);
        end = start + group.length;
      } else {
        start = m.index;
        end = m.index + m[0].length;
      }
      if (end > start) {
        matches.push({ start, end, text: text.slice(start, end), prefix, label: type.label });
      }
      if (m.index === re.lastIndex) re.lastIndex++;
    }
  }

  // Greedy non-overlap: earliest start, longest span wins.
  matches.sort((a, b) => a.start - b.start || b.end - a.end);
  const out: CustomMatch[] = [];
  let lastEnd = -1;
  for (const mt of matches) {
    if (mt.start >= lastEnd) {
      out.push(mt);
      lastEnd = mt.end;
    }
  }
  return out;
}
