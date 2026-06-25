import { describe, expect, it } from 'vitest';
import { extractOdfText } from './opendocument.js';

describe('extractOdfText', () => {
  it('extracts paragraph text with newlines between paragraphs', () => {
    const xml =
      '<office:body><office:text><text:p>Hallo Anna Schmidt</text:p><text:p>Zweite Zeile</text:p></office:text></office:body>';
    expect(extractOdfText(xml)).toBe('Hallo Anna Schmidt\nZweite Zeile');
  });

  it('turns table rows/cells into tab-separated lines (.ods)', () => {
    const xml =
      '<office:body><office:spreadsheet><table:table><table:table-row><table:table-cell><text:p>Name</text:p></table:table-cell><table:table-cell><text:p>Mail</text:p></table:table-cell></table:table-row></table:table></office:spreadsheet></office:body>';
    expect(extractOdfText(xml)).toContain('Name\tMail');
  });

  it('decodes entities and handles text:tab / text:s', () => {
    const xml = '<office:body><text:p>A<text:tab/>B<text:s/>&amp; C</text:p></office:body>';
    expect(extractOdfText(xml)).toBe('A\tB & C');
  });
});
