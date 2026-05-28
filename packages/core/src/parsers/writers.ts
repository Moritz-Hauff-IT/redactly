/**
 * File-format writers — convert masked text back to a file matching the
 * original input format. Layout fidelity is NOT preserved (that would
 * require parsing+reconstructing the original document); we always write
 * a plain text document in the requested wrapper format.
 *
 * Use case: user uploads invoice.pdf, masks it, downloads invoice-masked.pdf
 * (rather than invoice-masked.txt). The visual layout is gone but the
 * content is preserved, the file is self-contained, and the user's tools
 * keep working.
 */
import type { SupportedFormat } from './index.js';

export interface WriteResult {
  blob: Blob;
  filename: string;
  mimeType: string;
}

/**
 * Write masked text as the given format. Falls back to plain text for
 * formats where binary reconstruction would lose layout (txt/md always
 * remain text).
 */
export async function writeAsFormat(
  text: string,
  format: SupportedFormat,
  baseName: string
): Promise<WriteResult> {
  switch (format) {
    case 'txt':
      return writeTxt(text, baseName);
    case 'md':
      return writeMd(text, baseName);
    case 'eml':
      return writeEml(text, baseName);
    case 'pdf':
      return writePdf(text, baseName);
    case 'docx':
      return writeDocx(text, baseName);
  }
}

function writeTxt(text: string, baseName: string): WriteResult {
  const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
  return { blob, filename: `${baseName}-masked.txt`, mimeType: 'text/plain' };
}

function writeMd(text: string, baseName: string): WriteResult {
  const blob = new Blob([text], { type: 'text/markdown;charset=utf-8' });
  return { blob, filename: `${baseName}-masked.md`, mimeType: 'text/markdown' };
}

function writeEml(text: string, baseName: string): WriteResult {
  // Minimal RFC822 envelope wrapping the masked text as the body.
  // We don't try to recover original headers (From/To/Subject would already
  // be redacted in the body anyway).
  const now = new Date().toUTCString();
  const eml = `From: redactly@local\r\nTo: redacted\r\nDate: ${now}\r\nSubject: Redacted message\r\nContent-Type: text/plain; charset=utf-8\r\n\r\n${text}\r\n`;
  const blob = new Blob([eml], { type: 'message/rfc822' });
  return { blob, filename: `${baseName}-masked.eml`, mimeType: 'message/rfc822' };
}

async function writePdf(text: string, baseName: string): Promise<WriteResult> {
  const { PDFDocument, StandardFonts, rgb } = await import('pdf-lib');
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  // pdf-lib StandardFonts use WinAnsi encoding which does NOT cover all
  // Unicode characters (notably some German extended chars or curly quotes).
  // We strip/replace unsupported chars to ASCII-safe equivalents.
  const safeText = text
    .replace(/[‘’]/g, "'")
    .replace(/[“”„]/g, '"')
    .replace(/[–—]/g, '-')
    .replace(/€/g, 'EUR');

  const pageSize: [number, number] = [595.28, 841.89]; // A4 in points
  const margin = 50;
  const fontSize = 11;
  const lineHeight = fontSize * 1.4;
  const usableWidth = pageSize[0] - 2 * margin;
  let page = doc.addPage(pageSize);
  let y = pageSize[1] - margin;

  // Word-wrap each input line to page width
  const lines = safeText.split(/\r?\n/);
  for (const rawLine of lines) {
    const words = rawLine.split(' ');
    let current = '';
    for (const word of words) {
      const test = current ? `${current} ${word}` : word;
      const width = font.widthOfTextAtSize(test, fontSize);
      if (width > usableWidth && current) {
        // Flush current line
        if (y < margin + lineHeight) {
          page = doc.addPage(pageSize);
          y = pageSize[1] - margin;
        }
        page.drawText(current, { x: margin, y, size: fontSize, font, color: rgb(0.1, 0.1, 0.1) });
        y -= lineHeight;
        current = word;
      } else {
        current = test;
      }
    }
    if (y < margin + lineHeight) {
      page = doc.addPage(pageSize);
      y = pageSize[1] - margin;
    }
    page.drawText(current, { x: margin, y, size: fontSize, font, color: rgb(0.1, 0.1, 0.1) });
    y -= lineHeight;
  }

  const bytes = await doc.save();
  const blob = new Blob([new Uint8Array(bytes)], { type: 'application/pdf' });
  return { blob, filename: `${baseName}-masked.pdf`, mimeType: 'application/pdf' };
}

async function writeDocx(text: string, baseName: string): Promise<WriteResult> {
  const { Document, Packer, Paragraph, TextRun } = await import('docx');
  const paragraphs = text.split(/\r?\n/).map(
    (line) =>
      new Paragraph({
        children: [new TextRun({ text: line })],
      })
  );
  const doc = new Document({
    creator: 'Redactly',
    title: 'Redacted document',
    sections: [{ children: paragraphs }],
  });
  const blob = await Packer.toBlob(doc);
  return {
    blob,
    filename: `${baseName}-masked.docx`,
    mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  };
}
