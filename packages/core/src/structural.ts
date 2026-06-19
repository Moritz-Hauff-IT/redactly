/**
 * Structural always-mask rules.
 *
 * Beyond per-value detection, users often know *structurally* where PII lives:
 * "the `email` column", "the `ssn` JSON key", "anything matching this regex".
 * These rules turn that knowledge into spans the masker can consume, without
 * any model and without sending data anywhere.
 *
 * Three rule kinds, all operating on the plain text the pipeline already sees:
 *   - column rules   → cells of a CSV/TSV column (by header name, spreadsheet
 *                      letter like `B`, or 1-based index)
 *   - JSON key rules → scalar values under a matching object key (any depth)
 *   - regex rules    → raw user regex; masks capture group 1 if present, else
 *                      the whole match
 *
 * Everything is offset-preserving: we never `JSON.parse`/CSV-decode and lose
 * positions, we scan and emit `[start, end)` ranges into the original text so
 * the masker can replace contiguous slices.
 */

export interface StructuralRules {
  /** CSV/TSV columns to mask — header name (case-insensitive), spreadsheet
   * letter (A, B, …, AA), or 1-based column index. */
  columns: string[];
  /** Object keys whose scalar values should be masked (case-insensitive). */
  jsonKeys: string[];
  /** Raw regular-expression sources. Group 1 is masked if present, else the
   * whole match. Invalid patterns are ignored. */
  regexes: string[];
}

export interface StructuralSpan {
  start: number;
  end: number;
  text: string;
}

/** A column detected in a table, for the dynamic upload-time picker. */
export interface TableColumn {
  /** Spreadsheet-style column ref: A, B, C, … */
  ref: string;
  /** Header-cell text (may be empty). */
  name: string;
  /** Non-empty data-cell values, in row order. */
  values: string[];
}

/** 0-based column index → spreadsheet ref (0→A, 25→Z, 26→AA). */
function indexToRef(i: number): string {
  let n = i + 1;
  let s = '';
  while (n > 0) {
    const r = (n - 1) % 26;
    s = String.fromCharCode(65 + r) + s;
    n = Math.floor((n - 1) / 26);
  }
  return s;
}

const CANDIDATE_DELIMITERS = [',', ';', '\t'] as const;
const MAX_REGEX_MATCHES = 10000;

/** Trim ASCII whitespace and one layer of surrounding double quotes. */
function tightenSpan(text: string, start: number, end: number): [number, number] {
  let s = start;
  let e = end;
  while (s < e && (text[s] === ' ' || text[s] === '\t' || text[s] === '\r')) s++;
  while (e > s && (text[e - 1] === ' ' || text[e - 1] === '\t' || text[e - 1] === '\r')) e--;
  if (e - s >= 2 && text[s] === '"' && text[e - 1] === '"') {
    s++;
    e--;
  }
  return [s, e];
}

/** Parse a delimited record set, returning each field as a raw [start, end) span. */
function parseDelimited(text: string, delim: string): Array<Array<[number, number]>> {
  const rows: Array<Array<[number, number]>> = [];
  let row: Array<[number, number]> = [];
  let fieldStart = 0;
  let inQuotes = false;
  let i = 0;
  const n = text.length;

  const pushField = (end: number) => {
    row.push([fieldStart, end]);
  };
  const pushRow = () => {
    rows.push(row);
    row = [];
  };

  while (i < n) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          i += 2;
          continue;
        }
        inQuotes = false;
      }
      i++;
      continue;
    }
    if (ch === '"') {
      inQuotes = true;
      i++;
      continue;
    }
    if (ch === delim) {
      pushField(i);
      fieldStart = i + 1;
      i++;
      continue;
    }
    if (ch === '\n') {
      pushField(i);
      pushRow();
      fieldStart = i + 1;
      i++;
      continue;
    }
    i++;
  }
  pushField(n);
  pushRow();

  // Drop rows that are a single empty field (trailing newline artefact).
  return rows.filter((r) => !(r.length === 1 && r[0] !== undefined && r[0][0] >= r[0][1]));
}

/** Best-guess delimiter from the first line; null if none looks tabular. */
function detectDelimiter(text: string): string | null {
  const firstLine = text.slice(0, text.indexOf('\n') === -1 ? text.length : text.indexOf('\n'));
  let best: string | null = null;
  let bestCount = 0;
  for (const d of CANDIDATE_DELIMITERS) {
    const count = firstLine.split(d).length - 1;
    if (count > bestCount) {
      bestCount = count;
      best = d;
    }
  }
  return bestCount >= 1 ? best : null;
}

/** Convert a column rule to a 0-based index given the header row. */
function resolveColumnIndex(
  rule: string,
  header: string[],
  headerSpans: Array<[number, number]>,
  text: string
): number | null {
  const trimmed = rule.trim();
  if (!trimmed) return null;

  // Spreadsheet letter(s): A, B, …, Z, AA, AB…
  if (
    /^[A-Za-z]{1,3}$/.test(trimmed) &&
    !header.some((h) => h.toLowerCase() === trimmed.toLowerCase())
  ) {
    let idx = 0;
    for (const ch of trimmed.toUpperCase()) {
      idx = idx * 26 + (ch.charCodeAt(0) - 64);
    }
    return idx - 1;
  }

  // 1-based numeric index
  if (/^\d+$/.test(trimmed)) {
    return Number.parseInt(trimmed, 10) - 1;
  }

  // Header name (case-insensitive, against the tightened header cells)
  const needle = trimmed.toLowerCase();
  for (let c = 0; c < header.length; c++) {
    if ((header[c] ?? '').toLowerCase() === needle) return c;
    // also match the tightened raw text in case header[] decoding differs
    const span = headerSpans[c];
    if (!span) continue;
    const [hs, he] = tightenSpan(text, span[0], span[1]);
    if (text.slice(hs, he).trim().toLowerCase() === needle) return c;
  }
  return null;
}

function findColumnSpans(text: string, columns: string[]): StructuralSpan[] {
  if (columns.length === 0) return [];
  const delim = detectDelimiter(text);
  if (delim === null) return [];

  const rows = parseDelimited(text, delim);
  if (rows.length < 2) return [];
  const headerSpans = rows[0];
  if (!headerSpans || headerSpans.length < 2) return [];

  // Require the body to be mostly rectangular, else this isn't really a table.
  const width = headerSpans.length;
  const consistent = rows.slice(1).filter((r) => r.length === width).length;
  if (consistent < (rows.length - 1) / 2) return [];

  const header = headerSpans.map(([s, e]) => {
    const [ts, te] = tightenSpan(text, s, e);
    return text.slice(ts, te);
  });

  const targets = new Set<number>();
  for (const rule of columns) {
    const idx = resolveColumnIndex(rule, header, headerSpans, text);
    if (idx !== null && idx >= 0 && idx < width) targets.add(idx);
  }
  if (targets.size === 0) return [];

  const spans: StructuralSpan[] = [];
  for (let r = 1; r < rows.length; r++) {
    const cells = rows[r];
    if (!cells) continue;
    for (const c of targets) {
      const cell = cells[c];
      if (!cell) continue;
      const [s, e] = tightenSpan(text, cell[0], cell[1]);
      if (e > s) spans.push({ start: s, end: e, text: text.slice(s, e) });
    }
  }
  return spans;
}

interface JsonToken {
  kind: 'string' | 'literal' | 'punct';
  start: number;
  end: number;
  ch?: string;
  /** Decoded value (strings) for key matching. */
  value?: string;
  /** Inner content bounds (strings), excluding the surrounding quotes. */
  contentStart?: number;
  contentEnd?: number;
}

function tokenizeJson(text: string): JsonToken[] {
  const toks: JsonToken[] = [];
  let i = 0;
  const n = text.length;
  while (i < n) {
    const ch = text[i];
    if (ch === ' ' || ch === '\n' || ch === '\r' || ch === '\t') {
      i++;
      continue;
    }
    if (ch === '"') {
      const start = i;
      i++;
      const contentStart = i;
      let value = '';
      while (i < n && text[i] !== '"') {
        if (text[i] === '\\' && i + 1 < n) {
          const nx = text[i + 1];
          value += nx === 'n' ? '\n' : nx === 't' ? '\t' : nx;
          i += 2;
        } else {
          value += text[i];
          i++;
        }
      }
      const contentEnd = i;
      if (i < n) i++; // past closing quote
      toks.push({ kind: 'string', start, end: i, value, contentStart, contentEnd });
      continue;
    }
    if (ch === '{' || ch === '}' || ch === '[' || ch === ']' || ch === ':' || ch === ',') {
      toks.push({ kind: 'punct', start: i, end: i + 1, ch });
      i++;
      continue;
    }
    const start = i;
    while (i < n && !/[\s,}\]:]/.test(text.charAt(i))) i++;
    toks.push({ kind: 'literal', start, end: i });
  }
  return toks;
}

function findJsonKeySpans(text: string, jsonKeys: string[]): StructuralSpan[] {
  if (jsonKeys.length === 0) return [];
  if (!/[[{]/.test(text)) return [];
  const keys = new Set(jsonKeys.map((k) => k.trim().toLowerCase()).filter(Boolean));
  if (keys.size === 0) return [];

  const toks = tokenizeJson(text);
  const spans: StructuralSpan[] = [];
  for (let i = 0; i + 2 < toks.length; i++) {
    const key = toks[i];
    const colon = toks[i + 1];
    const value = toks[i + 2];
    if (!key || !colon || !value) continue;
    if (key.kind !== 'string' || colon.ch !== ':') continue;
    if (!keys.has((key.value ?? '').trim().toLowerCase())) continue;

    if (value.kind === 'string') {
      const s = value.contentStart ?? value.start;
      const e = value.contentEnd ?? value.end;
      if (e > s) spans.push({ start: s, end: e, text: text.slice(s, e) });
    } else if (value.kind === 'literal') {
      const lit = text.slice(value.start, value.end);
      if (lit !== 'null' && lit !== 'true' && lit !== 'false') {
        spans.push({ start: value.start, end: value.end, text: lit });
      }
    }
    // object/array values are intentionally skipped — masking a whole
    // structure isn't what a key rule means.
  }
  return spans;
}

function findRegexSpans(text: string, patterns: string[]): StructuralSpan[] {
  const spans: StructuralSpan[] = [];
  for (const raw of patterns) {
    const src = raw.trim();
    if (!src) continue;
    let re: RegExp;
    try {
      re = new RegExp(src, 'g');
    } catch {
      continue; // invalid pattern — ignore rather than throw
    }
    let match: RegExpExecArray | null;
    let count = 0;
    while ((match = re.exec(text)) !== null) {
      if (count++ >= MAX_REGEX_MATCHES) break;
      // Prefer capture group 1 (lets users anchor on a label, mask the value).
      const group = match[1];
      let start: number;
      let end: number;
      if (group !== undefined && group.length > 0) {
        const rel = match[0].indexOf(group);
        start = match.index + (rel === -1 ? 0 : rel);
        end = start + group.length;
      } else {
        start = match.index;
        end = match.index + match[0].length;
      }
      if (end > start) spans.push({ start, end, text: text.slice(start, end) });
      // Guard against zero-length matches looping forever.
      if (match.index === re.lastIndex) re.lastIndex++;
    }
  }
  return spans;
}

/** Greedy overlap removal: keep earliest start, longest span. */
function dedupeSpans(spans: StructuralSpan[]): StructuralSpan[] {
  if (spans.length <= 1) return spans;
  const sorted = [...spans].sort((a, b) => a.start - b.start || b.end - a.end);
  const out: StructuralSpan[] = [];
  let lastEnd = -1;
  for (const sp of sorted) {
    if (sp.start >= lastEnd) {
      out.push(sp);
      lastEnd = sp.end;
    }
  }
  return out;
}

/**
 * Resolve all structural rules against `text` into non-overlapping spans.
 * Spans are returned in document order; callers turn them into entities.
 */
export function findStructuralSpans(text: string, rules: StructuralRules): StructuralSpan[] {
  const all = [
    ...findColumnSpans(text, rules.columns),
    ...findJsonKeySpans(text, rules.jsonKeys),
    ...findRegexSpans(text, rules.regexes),
  ];
  return dedupeSpans(all);
}

/**
 * Detect the columns of a delimited (CSV/TSV) table for the upload-time
 * column picker. Returns one entry per column with its header and the list of
 * data-cell values, or `null` when the text isn't a rectangular table.
 */
export function extractDelimitedColumns(text: string): TableColumn[] | null {
  const delim = detectDelimiter(text);
  if (delim === null) return null;
  const rows = parseDelimited(text, delim);
  if (rows.length < 2) return null;
  const headerSpans = rows[0];
  if (!headerSpans || headerSpans.length < 2) return null;

  const width = headerSpans.length;
  const consistent = rows.slice(1).filter((r) => r.length === width).length;
  if (consistent < (rows.length - 1) / 2) return null;

  const slice = (span: [number, number]): string => {
    const [s, e] = tightenSpan(text, span[0], span[1]);
    return text.slice(s, e);
  };

  const cols: TableColumn[] = [];
  for (let c = 0; c < width; c++) {
    const headerSpan = headerSpans[c];
    const name = headerSpan ? slice(headerSpan) : '';
    const values: string[] = [];
    for (let r = 1; r < rows.length; r++) {
      const cell = rows[r]?.[c];
      if (!cell) continue;
      const v = slice(cell);
      if (v) values.push(v);
    }
    cols.push({ ref: indexToRef(c), name, values });
  }
  return cols;
}
