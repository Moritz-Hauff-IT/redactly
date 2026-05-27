import { describe, it, expect } from 'vitest';
import { detectFormat, parseFile, UnsupportedFormatError } from './index.js';

describe('detectFormat', () => {
  it('detects .txt by extension', () => {
    expect(detectFormat('document.txt')).toBe('txt');
  });

  it('detects .md by extension', () => {
    expect(detectFormat('README.md')).toBe('md');
  });

  it('detects .markdown by extension', () => {
    expect(detectFormat('notes.markdown')).toBe('md');
  });

  it('detects .eml by extension', () => {
    expect(detectFormat('email.eml')).toBe('eml');
  });

  it('detects .pdf by extension', () => {
    expect(detectFormat('report.pdf')).toBe('pdf');
  });

  it('detects .docx by extension', () => {
    expect(detectFormat('letter.docx')).toBe('docx');
  });

  it('falls back to mime type when extension is unknown', () => {
    expect(detectFormat('data', 'application/pdf')).toBe('pdf');
  });

  it('mime fallback works for text/plain', () => {
    expect(detectFormat('noext', 'text/plain')).toBe('txt');
  });

  it('returns null for unknown extension without mime', () => {
    expect(detectFormat('file.xyz')).toBeNull();
  });

  it('returns null for unknown mime type', () => {
    expect(detectFormat('file.xyz', 'application/octet-stream')).toBeNull();
  });

  it('is case-insensitive for extensions', () => {
    expect(detectFormat('FILE.PDF')).toBe('pdf');
    expect(detectFormat('NOTES.MD')).toBe('md');
  });
});

describe('parseFile — routing', () => {
  it('routes .txt file to txt parser and returns text', async () => {
    const result = await parseFile({
      name: 'hello.txt',
      data: new TextEncoder().encode('Hello, World!'),
    });
    expect(result.meta.format).toBe('txt');
    expect(result.text).toContain('Hello, World!');
  });

  it('routes .md file to md parser', async () => {
    const result = await parseFile({
      name: 'notes.md',
      data: new TextEncoder().encode('# My Notes\n\nContent here.'),
    });
    expect(result.meta.format).toBe('md');
    expect(result.text).toContain('# My Notes');
  });

  it('routes .eml file to eml parser', async () => {
    const emlContent = [
      'From: test@example.com',
      'To: dest@example.com',
      'Subject: Test',
      '',
      'Body text.',
    ].join('\r\n');

    const result = await parseFile({
      name: 'message.eml',
      data: new TextEncoder().encode(emlContent),
    });
    expect(result.meta.format).toBe('eml');
    expect(result.text).toContain('Subject: Test');
  });

  it('throws UnsupportedFormatError for unknown extension', async () => {
    await expect(parseFile({ name: 'data.xyz', data: new Uint8Array([1, 2, 3]) })).rejects.toThrow(
      UnsupportedFormatError
    );
  });

  it('UnsupportedFormatError has correct name', async () => {
    try {
      await parseFile({ name: 'unknown.bin', data: new Uint8Array([0]) });
    } catch (e) {
      expect(e).toBeInstanceOf(UnsupportedFormatError);
      expect((e as Error).name).toBe('UnsupportedFormatError');
    }
  });

  it('falls back to mime type when extension is not recognized', async () => {
    const result = await parseFile({
      name: 'data',
      type: 'text/plain',
      data: new TextEncoder().encode('plain text content'),
    });
    expect(result.meta.format).toBe('txt');
    expect(result.text).toBe('plain text content');
  });
});
