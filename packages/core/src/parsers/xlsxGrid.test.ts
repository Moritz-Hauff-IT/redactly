import { describe, expect, it } from 'vitest';
import { parseSharedStrings, parseXlsxGrid } from './xlsxGrid.js';

const SHARED = `<?xml version="1.0"?>
<sst xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" count="7" uniqueCount="7">
  <si><t>Name</t></si>
  <si><t>Email</t></si>
  <si><t>City</t></si>
  <si><t>Anna</t></si>
  <si><t>anna@x.com</t></si>
  <si><t>Beat</t></si>
  <si><t>beat@y.com</t></si>
</sst>`;

// Row 1 = headers (shared 0,1,2). Row 2: Anna / anna@x.com / Bern(inline).
// Row 3: Beat / beat@y.com / age 42 (number).
const SHEET = `<?xml version="1.0"?>
<worksheet><sheetData>
  <row r="1"><c r="A1" t="s"><v>0</v></c><c r="B1" t="s"><v>1</v></c><c r="C1" t="s"><v>2</v></c></row>
  <row r="2"><c r="A2" t="s"><v>3</v></c><c r="B2" t="s"><v>4</v></c><c r="C2" t="inlineStr"><is><t>Bern</t></is></c></row>
  <row r="3"><c r="A3" t="s"><v>5</v></c><c r="B3" t="s"><v>6</v></c><c r="C3"><v>42</v></c></row>
</sheetData></worksheet>`;

describe('parseSharedStrings', () => {
  it('reads <si> entries in order', () => {
    expect(parseSharedStrings(SHARED)).toEqual([
      'Name',
      'Email',
      'City',
      'Anna',
      'anna@x.com',
      'Beat',
      'beat@y.com',
    ]);
  });
});

describe('parseXlsxGrid', () => {
  it('reconstructs columns with header names and per-column values', () => {
    const cols = parseXlsxGrid(SHARED, SHEET);
    expect(cols.map((c) => c.ref)).toEqual(['A', 'B', 'C']);
    expect(cols.map((c) => c.name)).toEqual(['Name', 'Email', 'City']);
    expect(cols[0]!.values).toEqual(['Anna', 'Beat']);
    expect(cols[1]!.values).toEqual(['anna@x.com', 'beat@y.com']);
    // inline string + numeric literal both surface as values
    expect(cols[2]!.values).toEqual(['Bern', '42']);
  });

  it('returns no columns when there is only a header row', () => {
    const sheet = `<worksheet><sheetData><row r="1"><c r="A1" t="s"><v>0</v></c></row></sheetData></worksheet>`;
    expect(parseXlsxGrid(SHARED, sheet)).toEqual([]);
  });
});
