import { describe, it, expect, beforeAll } from 'vitest';
import { parseDocxBlob } from './docx.js';

let docxBytes: Uint8Array;

beforeAll(async () => {
  // Generate a small in-memory .docx using the `docx` npm package
  const { Document, Packer, Paragraph, TextRun } = await import('docx');

  const doc = new Document({
    sections: [
      {
        children: [
          new Paragraph({
            children: [new TextRun('Hello from docx fixture.')],
          }),
          new Paragraph({
            children: [new TextRun('Second paragraph here.')],
          }),
        ],
      },
    ],
  });

  const buffer = await Packer.toBuffer(doc);
  docxBytes = new Uint8Array(buffer);
});

describe('parseDocxBlob', () => {
  it('returns format "docx"', async () => {
    const result = await parseDocxBlob(docxBytes);
    expect(result.meta.format).toBe('docx');
  });

  it('extracts paragraph text', async () => {
    const result = await parseDocxBlob(docxBytes);
    expect(result.text).toContain('Hello from docx fixture.');
  });

  it('extracts multiple paragraphs', async () => {
    const result = await parseDocxBlob(docxBytes);
    expect(result.text).toContain('Second paragraph here.');
  });

  it('accepts an ArrayBuffer', async () => {
    const result = await parseDocxBlob(docxBytes.buffer as ArrayBuffer);
    expect(result.text).toContain('Hello');
  });

  it('accepts a Blob', async () => {
    const blob = new Blob([docxBytes], {
      type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    });
    const result = await parseDocxBlob(blob);
    expect(result.text).toContain('Hello');
  });

  it('reports byte size in meta', async () => {
    const result = await parseDocxBlob(docxBytes);
    expect(result.meta.bytes).toBeGreaterThan(0);
  });

  it('throws when given a string', async () => {
    await expect(parseDocxBlob('not a docx' as unknown as Uint8Array)).rejects.toThrow(TypeError);
  });
});
