import { describe, expect, it } from 'vitest';
import { rtfToText } from './rtf.js';

describe('rtfToText', () => {
  it('extracts plain text and turns \\par into newlines', () => {
    const rtf = '{\\rtf1\\ansi Hello \\b world\\b0.\\par Second line.}';
    expect(rtfToText(rtf)).toBe('Hello world.\nSecond line.');
  });

  it('skips font and colour tables', () => {
    const rtf = '{\\rtf1{\\fonttbl{\\f0 Arial;}}{\\colortbl;\\red0\\green0\\blue0;}Visible text.}';
    expect(rtfToText(rtf)).toBe('Visible text.');
  });

  it("decodes \\'hh cp1252 bytes and unicode \\u", () => {
    // \'e9 = é ; 荤 = € (with one fallback char to skip)
    const rtf = "{\\rtf1 caf\\'e9 \\u8364?}";
    expect(rtfToText(rtf)).toBe('café €');
  });

  it('ignores \\* ignorable destinations', () => {
    const rtf = '{\\rtf1 keep{\\*\\generator Foo;}this.}';
    expect(rtfToText(rtf)).toBe('keepthis.');
  });
});
