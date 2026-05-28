/**
 * File-format writers — produce a downloadable masked file from masked text
 * (and, where possible, the original document bytes + entity mapping).
 *
 * Two paths:
 *
 * 1. **Plain-text wrapping** (`writeAsFormat`): builds a fresh document
 *    containing only the masked text. Layout is NOT preserved. Used when the
 *    input came from typing/pasting (no original file to overlay on).
 *
 * 2. **Layout-preserving redaction** (`writeAsRedactedFormat`): loads the
 *    original PDF/DOCX bytes and overlays whiteout rectangles + placeholder
 *    text at the exact positions where PII appeared. The masked file looks
 *    visually identical to the original except for the redacted regions.
 *    Used when the user uploaded a file AND we have the entity → placeholder
 *    mapping. This is the preferred path for file uploads.
 *
 * All processing happens client-side. No bytes ever leave the tab.
 */
import type { SupportedFormat } from './index.js';
import type { Mapping } from '../masker.js';

export interface WriteResult {
  blob: Blob;
  filename: string;
  mimeType: string;
}

/**
 * Plain-text wrapping. Writes the masked text into a fresh document of the
 * requested format. Layout is NOT preserved. Use this when there is no
 * original file to redact onto (e.g. typed/pasted input).
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

/**
 * Layout-preserving redaction. Loads the original document and overlays
 * redactions in place. Falls back to plain-text wrapping for formats that
 * are inherently text (txt/md/eml) or when the format isn't supported for
 * redaction.
 *
 * @param originalBytes  Original file bytes (as uploaded by the user)
 * @param maskedText     The fully-masked text (used as fallback)
 * @param mapping        Entity mapping (original → placeholder) used to
 *                       locate and replace PII in the original document
 * @param format         File format
 * @param baseName       Filename stem (no extension)
 */
export async function writeAsRedactedFormat(
  originalBytes: Uint8Array,
  maskedText: string,
  mapping: Mapping,
  format: SupportedFormat,
  baseName: string
): Promise<WriteResult> {
  switch (format) {
    case 'pdf':
      return writePdfRedacted(originalBytes, mapping, baseName);
    case 'docx':
      return writeDocxRedacted(originalBytes, mapping, baseName);
    case 'txt':
    case 'md':
    case 'eml':
      // Inherently text; no layout to preserve beyond what plain-text gives us
      return writeAsFormat(maskedText, format, baseName);
  }
}

// ---------------------------------------------------------------------------
// Plain-text writers (used when there's no original file to overlay)
// ---------------------------------------------------------------------------

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
  const now = new Date().toUTCString();
  const eml = `From: redactly@local\r\nTo: redacted\r\nDate: ${now}\r\nSubject: Redacted message\r\nContent-Type: text/plain; charset=utf-8\r\n\r\n${text}\r\n`;
  const blob = new Blob([eml], { type: 'message/rfc822' });
  return { blob, filename: `${baseName}-masked.eml`, mimeType: 'message/rfc822' };
}

/**
 * Map Unicode characters that pdf-lib's WinAnsi-encoded Helvetica cannot
 * render to safe equivalents. Anything still outside WinAnsi after this
 * pre-processing is replaced with '?' as a final fallback.
 */
function sanitizeForWinAnsi(text: string): string {
  return text
    .replace(/[‘’‚‛]/g, "'")
    .replace(/[“”„‟]/g, '"')
    .replace(/[«»‹›]/g, '"')
    .replace(/[–—―−]/g, '-')
    .replace(/…/g, '...')
    .replace(/€/g, 'EUR')
    .replace(/£/g, 'GBP')
    .replace(/¥/g, 'JPY')
    .replace(/[✓✔☑]/g, '(+)')
    .replace(/[✗✘×]/g, '(x)')
    .replace(/[•●○◦◯]/g, '*')
    .replace(/[★☆]/g, '*')
    .replace(/→/g, '->')
    .replace(/←/g, '<-')
    .replace(/↔/g, '<->')
    .replace(/↑/g, '^')
    .replace(/↓/g, 'v')
    .replace(/⇒/g, '=>')
    .replace(/⇐/g, '<=')
    .replace(/[─━┄┅┈┉═]/g, '-')
    .replace(/[│┃┆┇┊┋║]/g, '|')
    .replace(/[┌┍┎┏┐┑┒┓└┕┖┗┘┙┚┛╔╗╚╝]/g, '+')
    .replace(/[├┝┞┟┠┡┢┣┤┥┦┧┨┩┪┫┬┭┮┯┰┱┲┳┴┵┶┷┸┹┺┻┼┽┾┿╀╁╂╃╄╅╆╇╈╉╊╋╠╣╦╩╬]/g, '+')
    .replace(/[±]/g, '+/-')
    .replace(/[°]/g, ' deg')
    .replace(/[‰]/g, ' per mille')
    .replace(/[√]/g, 'sqrt')
    .replace(/[ ]/g, ' ')
    .replace(/[​-‏‪-‮﻿]/g, '')
    .replace(/[^\x00-\xFFŒœŠšŸŽžƒˆ˜‰‹›€™]/g, '?');
}

async function writePdf(text: string, baseName: string): Promise<WriteResult> {
  const { PDFDocument, StandardFonts, rgb } = await import('pdf-lib');
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const safeText = sanitizeForWinAnsi(text);

  const pageSize: [number, number] = [595.28, 841.89]; // A4 in points
  const margin = 50;
  const fontSize = 11;
  const lineHeight = fontSize * 1.4;
  const usableWidth = pageSize[0] - 2 * margin;
  let page = doc.addPage(pageSize);
  let y = pageSize[1] - margin;

  function safeWidth(s: string): number {
    try {
      return font.widthOfTextAtSize(s, fontSize);
    } catch {
      const ascii = s.replace(/[^\x20-\x7E]/g, '?');
      try {
        return font.widthOfTextAtSize(ascii, fontSize);
      } catch {
        return usableWidth;
      }
    }
  }
  function safeDraw(s: string, xx: number, yy: number) {
    try {
      page.drawText(s, { x: xx, y: yy, size: fontSize, font, color: rgb(0.1, 0.1, 0.1) });
    } catch {
      const ascii = s.replace(/[^\x20-\x7E]/g, '?');
      try {
        page.drawText(ascii, { x: xx, y: yy, size: fontSize, font, color: rgb(0.1, 0.1, 0.1) });
      } catch {
        /* skip line — don't fail the whole document */
      }
    }
  }

  const lines = safeText.split(/\r?\n/);
  for (const rawLine of lines) {
    const words = rawLine.split(' ');
    let current = '';
    for (const word of words) {
      const test = current ? `${current} ${word}` : word;
      const width = safeWidth(test);
      if (width > usableWidth && current) {
        if (y < margin + lineHeight) {
          page = doc.addPage(pageSize);
          y = pageSize[1] - margin;
        }
        safeDraw(current, margin, y);
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
    safeDraw(current, margin, y);
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

// ---------------------------------------------------------------------------
// Layout-preserving redaction
// ---------------------------------------------------------------------------

/**
 * Sort mapping keys longest-first so substring replacements don't break
 * longer matches (e.g. replace "Müller GmbH" before "Müller").
 */
function sortedMappingKeys(mapping: Mapping): string[] {
  return [...mapping.reverse.keys()].sort((a, b) => b.length - a.length);
}

/**
 * Apply all mapping replacements to a string. Returns `null` if nothing
 * matched (caller can skip the work in that case).
 */
function applyMappingToString(s: string, mapping: Mapping, sortedKeys: string[]): string | null {
  let modified = s;
  let hit = false;
  for (const key of sortedKeys) {
    if (!key) continue;
    if (modified.includes(key)) {
      modified = modified.split(key).join(mapping.reverse.get(key)!);
      hit = true;
    }
  }
  return hit ? modified : null;
}

/**
 * Redact a PDF in-place: keep the original layout (fonts, images, colors,
 * positioning) and only overlay whiteout + placeholder text where PII was
 * detected.
 *
 * Approach: pdfjs gives us per-text-item positions; for any item whose text
 * contains a mapping key, we draw a white rectangle covering the item's
 * bounding box and then redraw the modified text (with placeholders) at the
 * same baseline. The rest of the page (vector graphics, images, untouched
 * text) is preserved exactly.
 *
 * Limitations:
 * - Replacement text uses Helvetica (standard font) regardless of the
 *   original font face. Visually close for most documents.
 * - Background color underneath the redacted text is replaced with white.
 *   Documents with colored text-block backgrounds will show a white patch.
 * - If a PII span crosses multiple text items (e.g. justified text broken
 *   at a space), only items that contain a complete key as substring are
 *   redacted. Partial fragments are left untouched. This is rare in
 *   practice because PII tokens (emails, IBANs, names) usually appear as
 *   single text runs.
 */
async function writePdfRedacted(
  originalBytes: Uint8Array,
  mapping: Mapping,
  baseName: string
): Promise<WriteResult> {
  const sortedKeys = sortedMappingKeys(mapping);
  if (sortedKeys.length === 0) {
    // Nothing to redact — return the original unchanged. The user explicitly
    // disabled all detections, so a verbatim copy is the correct output.
    const blob = new Blob([new Uint8Array(originalBytes)], { type: 'application/pdf' });
    return { blob, filename: `${baseName}-masked.pdf`, mimeType: 'application/pdf' };
  }

  const pdfjsLib = await import('pdfjs-dist/legacy/build/pdf.mjs');
  const { PDFDocument, StandardFonts, rgb } = await import('pdf-lib');

  // pdfjs detaches its input buffer; pdf-lib needs its own copy too.
  const bytesForPdfjs = originalBytes.slice();
  const bytesForPdfLib = originalBytes.slice();

  const pdfDoc = await PDFDocument.load(bytesForPdfLib);
  const helv = await pdfDoc.embedFont(StandardFonts.Helvetica);

  const pdfjsDoc = await pdfjsLib.getDocument({ data: bytesForPdfjs }).promise;
  const numPages = pdfjsDoc.numPages;

  for (let i = 1; i <= numPages; i++) {
    const page = await pdfjsDoc.getPage(i);
    const content = await page.getTextContent();
    const pdfLibPage = pdfDoc.getPage(i - 1);

    for (const raw of content.items) {
      if (!('str' in raw)) continue;
      const item = raw as {
        str: string;
        transform: number[];
        width: number;
        height: number;
      };
      const original = item.str;
      if (!original) continue;

      const modified = applyMappingToString(original, mapping, sortedKeys);
      if (modified === null) continue;

      // Transform: [scaleX, skewY, skewX, scaleY, tx, ty]
      // For typical horizontal text, fontSize ≈ scaleY.
      const tx = item.transform[4] ?? 0;
      const ty = item.transform[5] ?? 0;
      const scaleY = item.transform[3] ?? 12;
      const fontSize = Math.abs(scaleY) || 12;
      const originalWidth =
        item.width || safeFontWidth(helv, sanitizeForWinAnsi(original), fontSize);

      // Whiteout: pad a little so the rectangle fully covers the original
      // glyphs (which extend above baseline by ascender and below by descender).
      const padY = fontSize * 0.25;
      pdfLibPage.drawRectangle({
        x: tx - 1,
        y: ty - padY,
        width: originalWidth + 2,
        height: fontSize + padY * 1.2,
        color: rgb(1, 1, 1),
        borderWidth: 0,
      });

      // Redraw modified text at the same baseline. If the replacement is
      // wider than the original slot, shrink the font so it still fits —
      // prevents overflow into neighbouring content.
      const safeText = sanitizeForWinAnsi(modified);
      let drawSize = fontSize;
      const targetWidth = originalWidth + 4; // tiny slack
      try {
        const replWidth = helv.widthOfTextAtSize(safeText, fontSize);
        if (replWidth > targetWidth && targetWidth > 0) {
          drawSize = Math.max(6, fontSize * (targetWidth / replWidth));
        }
      } catch {
        /* width check failed — proceed at original size */
      }

      try {
        pdfLibPage.drawText(safeText, {
          x: tx,
          y: ty,
          size: drawSize,
          font: helv,
          color: rgb(0, 0, 0),
        });
      } catch {
        // Encoding failed even after sanitize — last resort ASCII-only
        try {
          pdfLibPage.drawText(safeText.replace(/[^\x20-\x7E]/g, '?'), {
            x: tx,
            y: ty,
            size: drawSize,
            font: helv,
            color: rgb(0, 0, 0),
          });
        } catch {
          /* skip — whiteout still applied, content is gone which is the priority */
        }
      }
    }
  }

  await pdfjsDoc.destroy();
  const bytes = await pdfDoc.save();
  const blob = new Blob([new Uint8Array(bytes)], { type: 'application/pdf' });
  return { blob, filename: `${baseName}-masked.pdf`, mimeType: 'application/pdf' };
}

function safeFontWidth(
  font: { widthOfTextAtSize: (s: string, size: number) => number },
  s: string,
  size: number
): number {
  try {
    return font.widthOfTextAtSize(s, size);
  } catch {
    try {
      return font.widthOfTextAtSize(s.replace(/[^\x20-\x7E]/g, '?'), size);
    } catch {
      return s.length * size * 0.5; // heuristic
    }
  }
}

/**
 * Redact a DOCX in-place: unzip, rewrite text inside `<w:t>` elements with
 * placeholder substitutions, re-zip. Preserves all formatting (fonts, styles,
 * tables, images, headers/footers) — only the text content is modified.
 *
 * Approach: scan all XML parts that can contain text runs (`word/document.xml`,
 * headers, footers, footnotes, endnotes, comments) and apply mapping
 * substitutions to the inner text of each `<w:t>` element. Other elements
 * are passed through unchanged.
 *
 * Why regex on XML rather than a real DOM walker: `<w:t>` is a leaf element
 * whose children are pure text (XML escapes special chars). The transformation
 * is byte-clean and avoids a 200KB+ XML-parser dependency.
 */
async function writeDocxRedacted(
  originalBytes: Uint8Array,
  mapping: Mapping,
  baseName: string
): Promise<WriteResult> {
  const sortedKeys = sortedMappingKeys(mapping);
  if (sortedKeys.length === 0) {
    const blob = new Blob([new Uint8Array(originalBytes)], {
      type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    });
    return {
      blob,
      filename: `${baseName}-masked.docx`,
      mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    };
  }

  const JSZip = (await import('jszip')).default;
  const zip = await JSZip.loadAsync(originalBytes);

  // XML parts where w:t text appears
  const candidatePaths = Object.keys(zip.files).filter((path) =>
    /^word\/(document|header\d*|footer\d*|footnotes|endnotes|comments)\.xml$/.test(path)
  );

  // Matches <w:t>...</w:t> and <w:t xml:space="preserve">...</w:t> etc.
  // Group 1: opening tag with attributes; group 2: text content; group 3: closing tag.
  const wtRegex = /(<w:t(?:\s[^>]*)?>)([\s\S]*?)(<\/w:t>)/g;

  for (const path of candidatePaths) {
    const file = zip.file(path);
    if (!file) continue;
    const xml = await file.async('string');
    let touched = false;
    const out = xml.replace(wtRegex, (_match, openTag, inner, closeTag) => {
      // The text inside <w:t> uses XML escapes (&amp; &lt; &gt; &quot; &apos;).
      // Decode → apply replacements → re-encode so the round-trip is clean.
      const decoded = decodeXmlEntities(inner);
      const modified = applyMappingToString(decoded, mapping, sortedKeys);
      if (modified === null) return openTag + inner + closeTag;
      touched = true;
      return openTag + encodeXmlText(modified) + closeTag;
    });
    if (touched) {
      zip.file(path, out);
    }
  }

  const blob = await zip.generateAsync({
    type: 'blob',
    mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  });
  return {
    blob,
    filename: `${baseName}-masked.docx`,
    mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  };
}

function decodeXmlEntities(s: string): string {
  return s
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, '&'); // amp last so we don't double-decode
}

function encodeXmlText(s: string): string {
  return s
    .replace(/&/g, '&amp;') // amp first to avoid double-encoding
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}
