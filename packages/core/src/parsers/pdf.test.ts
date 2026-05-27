import { describe, it, expect, beforeAll } from 'vitest';
import { createRequire } from 'node:module';
import { parsePdfBlob, PdfWorkerNotConfiguredError } from './pdf.js';

// Configure the PDF.js worker for the Node/Vitest test environment.
// In browser/SvelteKit apps the consumer sets this via the ?url import.
const require = createRequire(import.meta.url);
const workerPath = require.resolve('pdfjs-dist/legacy/build/pdf.worker.mjs');
const { GlobalWorkerOptions } = await import('pdfjs-dist/legacy/build/pdf.mjs');
GlobalWorkerOptions.workerSrc = `file://${workerPath}`;

let pdfBytes: Uint8Array;

beforeAll(async () => {
  // Generate a small in-memory 2-page PDF using pdf-lib
  const { PDFDocument, StandardFonts } = await import('pdf-lib');

  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);

  const page1 = doc.addPage([400, 300]);
  page1.drawText('Page one content here.', {
    x: 50,
    y: 200,
    size: 12,
    font,
  });

  const page2 = doc.addPage([400, 300]);
  page2.drawText('Page two content here.', {
    x: 50,
    y: 200,
    size: 12,
    font,
  });

  const bytes = await doc.save();
  pdfBytes = new Uint8Array(bytes);
});

describe('parsePdfBlob', () => {
  it('returns format "pdf"', async () => {
    const result = await parsePdfBlob(pdfBytes);
    expect(result.meta.format).toBe('pdf');
  });

  it('reports page count in meta', async () => {
    const result = await parsePdfBlob(pdfBytes);
    expect(result.meta['pages']).toBe(2);
  });

  it('extracts text from page 1', async () => {
    const result = await parsePdfBlob(pdfBytes);
    expect(result.text).toContain('Page one');
  });

  it('extracts text from page 2', async () => {
    const result = await parsePdfBlob(pdfBytes);
    expect(result.text).toContain('Page two');
  });

  it('accepts an ArrayBuffer', async () => {
    const result = await parsePdfBlob(pdfBytes.buffer as ArrayBuffer);
    expect(result.text).toContain('Page');
  });

  it('accepts a Blob', async () => {
    const blob = new Blob([pdfBytes], { type: 'application/pdf' });
    const result = await parsePdfBlob(blob);
    expect(result.text).toContain('Page');
  });

  it('reports byte size in meta', async () => {
    const result = await parsePdfBlob(pdfBytes);
    expect(result.meta.bytes).toBeGreaterThan(0);
  });

  it('throws when given a string', async () => {
    await expect(parsePdfBlob('not a pdf' as unknown as Uint8Array)).rejects.toThrow(TypeError);
  });

  it('throws PdfWorkerNotConfiguredError when workerSrc is not set', async () => {
    const saved = GlobalWorkerOptions.workerSrc;
    try {
      GlobalWorkerOptions.workerSrc = '';
      await expect(parsePdfBlob(pdfBytes)).rejects.toThrow(PdfWorkerNotConfiguredError);
    } finally {
      GlobalWorkerOptions.workerSrc = saved;
    }
  });
});
