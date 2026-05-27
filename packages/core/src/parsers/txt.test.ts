import { describe, it, expect } from 'vitest';
import { parseTxtBlob } from './txt.js';

describe('parseTxtBlob', () => {
  it('returns format "txt"', async () => {
    const result = await parseTxtBlob('hello world');
    expect(result.meta.format).toBe('txt');
  });

  it('round-trips UTF-8 text', async () => {
    const input = 'Hello, Wörld! 🌍\nSecond line.';
    const result = await parseTxtBlob(input);
    expect(result.text).toBe(input);
  });

  it('strips a UTF-8 BOM (U+FEFF) from string input', async () => {
    const withBom = '﻿Hello, World!';
    const result = await parseTxtBlob(withBom);
    expect(result.text).toBe('Hello, World!');
    expect(result.text.startsWith('﻿')).toBe(false);
  });

  it('strips a UTF-8 BOM from Uint8Array input', async () => {
    // UTF-8 BOM bytes: 0xEF 0xBB 0xBF
    const bom = new Uint8Array([0xef, 0xbb, 0xbf]);
    const text = new TextEncoder().encode('Stripped');
    const bytes = new Uint8Array([...bom, ...text]);
    const result = await parseTxtBlob(bytes);
    expect(result.text).toBe('Stripped');
  });

  it('accepts an ArrayBuffer', async () => {
    const bytes = new TextEncoder().encode('ArrayBuffer text');
    const result = await parseTxtBlob(bytes.buffer);
    expect(result.text).toBe('ArrayBuffer text');
  });

  it('accepts a Blob', async () => {
    const blob = new Blob(['Blob content'], { type: 'text/plain' });
    const result = await parseTxtBlob(blob);
    expect(result.text).toBe('Blob content');
  });

  it('reports byte length in meta', async () => {
    const input = 'abc';
    const result = await parseTxtBlob(input);
    expect(result.meta.bytes).toBe(3);
  });

  it('handles empty string', async () => {
    const result = await parseTxtBlob('');
    expect(result.text).toBe('');
    expect(result.meta.bytes).toBe(0);
  });
});
