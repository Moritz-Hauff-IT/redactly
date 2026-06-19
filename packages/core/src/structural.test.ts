import { describe, expect, it } from 'vitest';
import {
  extractDelimitedColumns,
  findStructuralSpans,
  type StructuralRules,
} from './structural.js';

const EMPTY: StructuralRules = { columns: [], jsonKeys: [], regexes: [] };

function maskedValues(text: string, rules: Partial<StructuralRules>): string[] {
  const spans = findStructuralSpans(text, { ...EMPTY, ...rules });
  return spans.map((s) => text.slice(s.start, s.end));
}

describe('findStructuralSpans — column rules', () => {
  const csv = ['name,email,city', 'Anna,anna@x.com,Bern', 'Beat,beat@y.com,Zürich'].join('\n');

  it('masks a column by header name (case-insensitive)', () => {
    expect(maskedValues(csv, { columns: ['Email'] })).toEqual(['anna@x.com', 'beat@y.com']);
  });

  it('masks a column by spreadsheet letter', () => {
    expect(maskedValues(csv, { columns: ['A'] })).toEqual(['Anna', 'Beat']);
  });

  it('masks a column by 1-based index', () => {
    expect(maskedValues(csv, { columns: ['3'] })).toEqual(['Bern', 'Zürich']);
  });

  it('handles semicolon delimiter (DE/CH Excel exports)', () => {
    const semi = ['vorname;plz', 'Max;3000', 'Eva;8000'].join('\n');
    expect(maskedValues(semi, { columns: ['plz'] })).toEqual(['3000', '8000']);
  });

  it('respects quoted fields containing the delimiter', () => {
    const quoted = ['name,note', '"Doe, John","ok"', 'Eva,fine'].join('\n');
    expect(maskedValues(quoted, { columns: ['name'] })).toEqual(['Doe, John', 'Eva']);
  });

  it('returns nothing for non-tabular prose', () => {
    const prose = 'This is just a sentence, with a comma, but not a table.';
    expect(maskedValues(prose, { columns: ['name'] })).toEqual([]);
  });
});

describe('findStructuralSpans — JSON key rules', () => {
  it('masks scalar string values under a matching key at any depth', () => {
    const json = '{"user":{"email":"a@b.com","name":"Anna"},"email":"c@d.com"}';
    expect(maskedValues(json, { jsonKeys: ['email'] })).toEqual(['a@b.com', 'c@d.com']);
  });

  it('masks numeric literal values but skips null/booleans', () => {
    const json = '{"ssn":123456,"active":true,"deleted":null}';
    expect(maskedValues(json, { jsonKeys: ['ssn', 'active', 'deleted'] })).toEqual(['123456']);
  });

  it('does not mask whole object/array values', () => {
    const json = '{"address":{"city":"Bern"}}';
    expect(maskedValues(json, { jsonKeys: ['address'] })).toEqual([]);
  });
});

describe('findStructuralSpans — regex rules', () => {
  it('masks whole matches when there is no capture group', () => {
    const text = 'ids: AB-12, CD-34, EF-56';
    expect(maskedValues(text, { regexes: ['[A-Z]{2}-\\d{2}'] })).toEqual([
      'AB-12',
      'CD-34',
      'EF-56',
    ]);
  });

  it('masks capture group 1 when present', () => {
    const text = 'token=abc123 token=def456';
    expect(maskedValues(text, { regexes: ['token=(\\w+)'] })).toEqual(['abc123', 'def456']);
  });

  it('ignores invalid patterns instead of throwing', () => {
    expect(() => maskedValues('x', { regexes: ['(unclosed'] })).not.toThrow();
    expect(maskedValues('x', { regexes: ['(unclosed'] })).toEqual([]);
  });
});

describe('findStructuralSpans — combination & overlap', () => {
  it('removes overlapping spans, keeping non-overlapping coverage', () => {
    const json = '{"email":"a@b.com"}';
    // regex would also match the same email; result must not double-count.
    const spans = findStructuralSpans(json, {
      ...EMPTY,
      jsonKeys: ['email'],
      regexes: ['\\w+@\\w+\\.com'],
    });
    expect(spans).toHaveLength(1);
    expect(json.slice(spans[0].start, spans[0].end)).toBe('a@b.com');
  });

  it('returns spans in document order', () => {
    const text = 'name,email\nAnna,a@b.com';
    const spans = findStructuralSpans(text, { ...EMPTY, columns: ['name', 'email'] });
    expect(spans.map((s) => s.start)).toEqual([...spans.map((s) => s.start)].sort((a, b) => a - b));
  });

  it('empty rules produce no spans', () => {
    expect(findStructuralSpans('anything', EMPTY)).toEqual([]);
  });
});

describe('extractDelimitedColumns', () => {
  const csv = ['name,email,city', 'Anna,anna@x.com,Bern', 'Beat,beat@y.com,Zürich'].join('\n');

  it('returns one column per header with refs, names and values', () => {
    const cols = extractDelimitedColumns(csv);
    expect(cols).not.toBeNull();
    expect(cols!.map((c) => c.ref)).toEqual(['A', 'B', 'C']);
    expect(cols!.map((c) => c.name)).toEqual(['name', 'email', 'city']);
    expect(cols![1]!.values).toEqual(['anna@x.com', 'beat@y.com']);
  });

  it('handles semicolon delimiter and quoted fields', () => {
    const semi = ['name;note', '"Doe, John";ok', 'Eva;fine'].join('\n');
    const cols = extractDelimitedColumns(semi);
    expect(cols![0]!.values).toEqual(['Doe, John', 'Eva']);
  });

  it('returns null for non-tabular prose', () => {
    expect(extractDelimitedColumns('just a sentence, with commas, but no table')).toBeNull();
  });
});
