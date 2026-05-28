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
import { FORMAT_META, type SupportedFormat } from './formats.js';
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
    case 'eml':
      return writeEml(text, baseName);
    case 'pdf':
      return writePdf(text, baseName);
    case 'docx':
      return writeDocx(text, baseName);
    default: {
      // All text-like formats (txt/md/csv/tsv/json/yaml/etc) share the same
      // writer: the masked text wrapped in a Blob with the format's MIME
      // type and extension. PII placeholders are pure ASCII (no commas,
      // newlines, quotes) so CSV/TSV/JSON structure is preserved as long
      // as the source was well-formed.
      const meta = FORMAT_META[format];
      if (!meta.isText) {
        throw new Error(`Internal: format "${format}" has no writer`);
      }
      return writeText(text, baseName, format);
    }
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
    default:
      // All other formats (txt/md/eml/csv/tsv/json/yaml/etc.) are inherently
      // text — there's no layout beyond what's in the text itself, so the
      // masked text + plain-text writer gives a correct result. Fall through.
      return writeAsFormat(maskedText, format, baseName);
  }
}

// ---------------------------------------------------------------------------
// Plain-text writers (used when there's no original file to overlay)
// ---------------------------------------------------------------------------

/**
 * Generic text-blob writer: wraps the masked text in a Blob with the format's
 * MIME type and produces a filename with the format's canonical extension.
 * Used for all text-like formats (txt/md/csv/tsv/json/yaml/log/sql/etc).
 */
function writeText(text: string, baseName: string, format: SupportedFormat): WriteResult {
  const meta = FORMAT_META[format];
  const blob = new Blob([text], { type: `${meta.mime};charset=utf-8` });
  return {
    blob,
    filename: `${baseName}-masked.${meta.extension}`,
    mimeType: meta.mime,
  };
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
 * Approach:
 * 1. Pull all pdfjs text items for a page with their positions.
 * 2. Group items into lines by their baseline Y coordinate.
 * 3. Concatenate each line into a single string (inserting synthetic spaces
 *    where items have an X-gap), keeping a character → item index map.
 * 4. Find all mapping-key occurrences in each line string — including spans
 *    that cross multiple text items (e.g. an IBAN broken into 6 4-digit
 *    fragments, or "Moritz Hauff" split into two name items).
 * 5. For each match, whiteout the bounding box covering all spanned items
 *    and draw the placeholder text at the start position.
 *
 * Limitations:
 * - Replacement text uses Helvetica (standard font) regardless of the
 *   original font. Visually close enough for redaction markers.
 * - Background color underneath the redacted region is replaced with white.
 *   Documents with colored text-block backgrounds will show a white patch.
 * - Cross-line PII spans (PII wrapped across two visual lines) are not
 *   handled — rare for the entity types we mask.
 */

interface PdfTextItem {
  str: string;
  transform: number[];
  width: number;
  height: number;
}

interface CharOrigin {
  /** Index into the original page items array; null = synthetic space we inserted */
  itemIdx: number | null;
}

/**
 * Group items by baseline Y coordinate (within a small tolerance) and sort
 * by X within each line. The tolerance scales with font size so we don't
 * merge subscripts/superscripts with body text.
 */
function groupItemsIntoLines(items: PdfTextItem[]): { item: PdfTextItem; idx: number }[][] {
  const indexed = items.map((item, idx) => ({ item, idx }));
  const buckets: { item: PdfTextItem; idx: number }[][] = [];

  for (const entry of indexed) {
    const y = entry.item.transform[5] ?? 0;
    const tol = Math.max(2, Math.abs(entry.item.transform[3] ?? 10) * 0.3);
    const bucket = buckets.find((b) => {
      const by = b[0]?.item.transform[5] ?? 0;
      return Math.abs(by - y) <= tol;
    });
    if (bucket) {
      bucket.push(entry);
    } else {
      buckets.push([entry]);
    }
  }

  for (const b of buckets) {
    b.sort((a, b) => (a.item.transform[4] ?? 0) - (b.item.transform[4] ?? 0));
  }
  return buckets;
}

/**
 * Concatenate a line's items into a single string, tracking which original
 * item each character came from. Synthetic spaces inserted between visually-
 * separated items map to itemIdx=null.
 */
function buildLineText(line: { item: PdfTextItem; idx: number }[]): {
  text: string;
  origin: CharOrigin[];
} {
  let text = '';
  const origin: CharOrigin[] = [];

  for (let i = 0; i < line.length; i++) {
    const entry = line[i]!;
    if (i > 0) {
      const prev = line[i - 1]!;
      const prevEnd = (prev.item.transform[4] ?? 0) + (prev.item.width ?? 0);
      const currStart = entry.item.transform[4] ?? 0;
      const gap = currStart - prevEnd;
      const avgChar = Math.abs(prev.item.transform[3] ?? 10) * 0.25;
      // Insert a synthetic space if there's a visible gap and the previous
      // item didn't already end with whitespace.
      if (gap > avgChar && !prev.item.str.endsWith(' ')) {
        text += ' ';
        origin.push({ itemIdx: null });
      }
    }
    for (let c = 0; c < entry.item.str.length; c++) {
      text += entry.item.str[c];
      origin.push({ itemIdx: entry.idx });
    }
  }
  return { text, origin };
}

async function writePdfRedacted(
  originalBytes: Uint8Array,
  mapping: Mapping,
  baseName: string
): Promise<WriteResult> {
  const sortedKeys = sortedMappingKeys(mapping);
  if (sortedKeys.length === 0) {
    const blob = new Blob([new Uint8Array(originalBytes)], { type: 'application/pdf' });
    return { blob, filename: `${baseName}-masked.pdf`, mimeType: 'application/pdf' };
  }

  const pdfjsLib = await import('pdfjs-dist/legacy/build/pdf.mjs');
  const { PDFDocument, StandardFonts, rgb } = await import('pdf-lib');

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

    const items: PdfTextItem[] = [];
    for (const raw of content.items) {
      if (!('str' in raw)) continue;
      const tx = raw as { str: string; transform: number[]; width: number; height: number };
      items.push({
        str: tx.str,
        transform: tx.transform,
        width: tx.width ?? 0,
        height: tx.height ?? Math.abs(tx.transform[3] ?? 10),
      });
    }

    const lines = groupItemsIntoLines(items);

    for (const line of lines) {
      if (line.length === 0) continue;
      const { text, origin } = buildLineText(line);
      if (!text.trim()) continue;

      // Collect non-overlapping matches across all mapping keys (longest-first).
      const matches: { start: number; end: number; placeholder: string }[] = [];
      for (const key of sortedKeys) {
        if (!key) continue;
        let searchFrom = 0;
        while (searchFrom <= text.length - key.length) {
          const idx = text.indexOf(key, searchFrom);
          if (idx < 0) break;
          const end = idx + key.length;
          // Skip if this region overlaps a previously-recorded longer match
          const overlaps = matches.some((m) => !(end <= m.start || idx >= m.end));
          if (!overlaps) {
            matches.push({ start: idx, end, placeholder: mapping.reverse.get(key)! });
          }
          searchFrom = idx + 1;
        }
      }
      if (matches.length === 0) continue;

      // Sort matches left-to-right
      matches.sort((a, b) => a.start - b.start);

      for (const match of matches) {
        // Find items touched by chars [match.start, match.end)
        const touchedItemIdxs = new Set<number>();
        for (let c = match.start; c < match.end; c++) {
          const o = origin[c];
          if (o && o.itemIdx !== null) touchedItemIdxs.add(o.itemIdx);
        }
        if (touchedItemIdxs.size === 0) continue;

        // Compute bounding box covering all touched items
        let minX = Infinity;
        let maxX = -Infinity;
        let minY = Infinity;
        let maxFontSize = 0;
        for (const idx of touchedItemIdxs) {
          const it = items[idx]!;
          const x = it.transform[4] ?? 0;
          const y = it.transform[5] ?? 0;
          const w = it.width ?? 0;
          const fs = Math.abs(it.transform[3] ?? 10);
          if (x < minX) minX = x;
          if (x + w > maxX) maxX = x + w;
          if (y < minY) minY = y;
          if (fs > maxFontSize) maxFontSize = fs;
        }
        if (!isFinite(minX) || !isFinite(maxX) || maxFontSize === 0) continue;

        const padY = maxFontSize * 0.3;
        pdfLibPage.drawRectangle({
          x: minX - 1,
          y: minY - padY,
          width: maxX - minX + 2,
          height: maxFontSize + padY * 1.4,
          color: rgb(1, 1, 1),
          borderWidth: 0,
        });

        const safeText = sanitizeForWinAnsi(match.placeholder);
        const targetWidth = maxX - minX + 2;
        let drawSize = maxFontSize;
        try {
          const replWidth = helv.widthOfTextAtSize(safeText, maxFontSize);
          if (replWidth > targetWidth && targetWidth > 0) {
            drawSize = Math.max(6, maxFontSize * (targetWidth / replWidth));
          }
        } catch {
          /* width check failed — proceed at original size */
        }

        try {
          pdfLibPage.drawText(safeText, {
            x: minX,
            y: minY,
            size: drawSize,
            font: helv,
            color: rgb(0, 0, 0),
          });
        } catch {
          try {
            pdfLibPage.drawText(safeText.replace(/[^\x20-\x7E]/g, '?'), {
              x: minX,
              y: minY,
              size: drawSize,
              font: helv,
              color: rgb(0, 0, 0),
            });
          } catch {
            /* skip — whiteout still applied, the PII content is hidden */
          }
        }
      }
    }
  }

  await pdfjsDoc.destroy();
  const bytes = await pdfDoc.save();
  const blob = new Blob([new Uint8Array(bytes)], { type: 'application/pdf' });
  return { blob, filename: `${baseName}-masked.pdf`, mimeType: 'application/pdf' };
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
