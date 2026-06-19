/**
 * .xlsx grid parser — recovers the column structure the flat text extractor
 * (xlsx.ts) throws away.
 *
 * The plain parser concatenates every `<t>` string for detection, which is
 * fine for value-level PII but loses the rows/columns. For the upload-time
 * column picker we need the actual grid: which header sits above which column,
 * and every value in that column. We read just enough SpreadsheetML to rebuild
 * that — shared strings + the first worksheet's cells addressed by their `r`
 * reference (e.g. `B2`).
 *
 * `parseXlsxGrid` is pure (XML in, columns out) so it can be unit-tested
 * without constructing a real workbook; `extractXlsxColumns` unzips and feeds
 * it the two relevant parts.
 */

import type { TableColumn } from '../structural.js';

function decodeXmlEntities(s: string): string {
  return s
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, '&');
}

const T_REGEX = /<t(?:\s[^>]*)?>([\s\S]*?)<\/t>/g;
const SI_REGEX = /<si>([\s\S]*?)<\/si>/g;
const ROW_REGEX = /<row\b[^>]*>([\s\S]*?)<\/row>/g;
const CELL_REGEX = /<c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g;
const V_REGEX = /<v>([\s\S]*?)<\/v>/;

/** Concatenate all `<t>` text inside one shared-string `<si>` entry. */
function siText(inner: string): string {
  let out = '';
  for (const m of inner.matchAll(T_REGEX)) out += m[1] ?? '';
  return decodeXmlEntities(out);
}

/** Parse `xl/sharedStrings.xml` into an index → string table. */
export function parseSharedStrings(xml: string): string[] {
  const table: string[] = [];
  for (const m of xml.matchAll(SI_REGEX)) table.push(siText(m[1] ?? ''));
  return table;
}

function attr(attrs: string, name: string): string | null {
  const m = new RegExp(`${name}="([^"]*)"`).exec(attrs);
  return m ? (m[1] ?? null) : null;
}

/** Column letters of a cell ref ("AB12" → "AB"), or '' if none. */
function colLetters(ref: string): string {
  const m = /^[A-Za-z]+/.exec(ref);
  return m ? m[0].toUpperCase() : '';
}

/** Spreadsheet ref letters → 0-based index ("A"→0, "AA"→26). */
function refToIndex(letters: string): number {
  let idx = 0;
  for (const ch of letters) idx = idx * 26 + (ch.charCodeAt(0) - 64);
  return idx - 1;
}

/** Resolve a single cell's display text given the shared-string table. */
function cellValue(attrs: string, inner: string, shared: string[]): string {
  const type = attr(attrs, 't');
  if (type === 'inlineStr') {
    let out = '';
    for (const m of inner.matchAll(T_REGEX)) out += m[1] ?? '';
    return decodeXmlEntities(out);
  }
  const v = V_REGEX.exec(inner);
  const raw = v ? (v[1] ?? '') : '';
  if (type === 's') {
    const i = Number.parseInt(raw, 10);
    return Number.isInteger(i) ? (shared[i] ?? '') : '';
  }
  // 'str' (formula result), numbers, booleans — value is literal text.
  return decodeXmlEntities(raw);
}

/**
 * Rebuild the table columns from a worksheet + shared strings. The first
 * `<row>` is treated as the header; later rows supply each column's values.
 */
export function parseXlsxGrid(sharedStringsXml: string, sheetXml: string): TableColumn[] {
  const shared = parseSharedStrings(sharedStringsXml);

  // rows: array of (colIndex → text) maps, in document order.
  const rows: Array<Map<number, string>> = [];
  for (const rowMatch of sheetXml.matchAll(ROW_REGEX)) {
    const rowInner = rowMatch[1] ?? '';
    const cells = new Map<number, string>();
    for (const cellMatch of rowInner.matchAll(CELL_REGEX)) {
      const attrs = cellMatch[1] ?? '';
      const inner = cellMatch[2] ?? '';
      const ref = attr(attrs, 'r') ?? '';
      const letters = colLetters(ref);
      if (!letters) continue;
      const col = refToIndex(letters);
      const value = cellValue(attrs, inner, shared);
      if (value) cells.set(col, value);
    }
    rows.push(cells);
  }

  if (rows.length < 2) return [];
  const header = rows[0];
  if (!header || header.size < 1) return [];

  // Column set = whatever appears in the header row.
  const indices = [...header.keys()].sort((a, b) => a - b);
  const cols: TableColumn[] = [];
  for (const c of indices) {
    const values: string[] = [];
    for (let r = 1; r < rows.length; r++) {
      const v = rows[r]?.get(c);
      if (v) values.push(v);
    }
    cols.push({ ref: indexToRefLocal(c), name: header.get(c) ?? '', values });
  }
  return cols;
}

function indexToRefLocal(i: number): string {
  let n = i + 1;
  let s = '';
  while (n > 0) {
    const r = (n - 1) % 26;
    s = String.fromCharCode(65 + r) + s;
    n = Math.floor((n - 1) / 26);
  }
  return s;
}

/** Unzip an .xlsx and return its first sheet's columns for the picker. */
export async function extractXlsxColumns(
  input: Blob | ArrayBuffer | Uint8Array
): Promise<TableColumn[]> {
  const JSZip = (await import('jszip')).default;
  const zip = await JSZip.loadAsync(input);

  const sharedXml = (await zip.file('xl/sharedStrings.xml')?.async('string')) ?? '';
  const sheetPath = Object.keys(zip.files)
    .filter((p) => /^xl\/worksheets\/sheet\d+\.xml$/.test(p))
    .sort()[0];
  if (!sheetPath) return [];
  const sheetXml = (await zip.file(sheetPath)?.async('string')) ?? '';
  return parseXlsxGrid(sharedXml, sheetXml);
}
