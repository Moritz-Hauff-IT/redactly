/**
 * Image OCR parser — runs Tesseract.js against PNG/JPG/WebP and extracts the
 * recognised text. Detection pipeline then processes the text exactly like
 * any other document; redaction writer (writers.ts) re-runs OCR to get fresh
 * bounding boxes and paints whiteout + placeholders onto a canvas.
 *
 * Languages: German + English (covers the DACH/EN use case for Redactly).
 *
 * Asset hosting: the consuming application is responsible for serving the
 * Tesseract WASM core + worker script + language traineddata files. Pass
 * URL paths via `configureTesseractPaths()` before the first `runOcr()`
 * call. If unconfigured, Tesseract falls back to the default jsdelivr CDN
 * for the core and tessdata.projectnaptha.com for the language data — the
 * Redactly app sets local paths so nothing leaves the origin.
 *
 * Per-image OCR cost: ~2-8 seconds for a typical screenshot on a recent CPU.
 * The result is cached on a per-byte basis (see ocrCache) so the redaction
 * writer doesn't re-run the costly recognition for the same image.
 */

import type { ParseResult } from './txt.js';
import type { SupportedFormat } from './formats.js';

interface TesseractPaths {
  /** URL prefix where tesseract-core-simd.wasm.js etc. live. */
  corePath?: string;
  /** URL prefix where `eng.traineddata.gz` etc. live. */
  langPath?: string;
  /** Full URL to the Tesseract worker script. */
  workerPath?: string;
}

let tesseractPaths: TesseractPaths = {};

/**
 * Point Tesseract at self-hosted asset URLs. Call once at app startup
 * (typically alongside the PDF.js worker setup). Without this, Tesseract
 * loads its core + language data from public CDNs.
 */
export function configureTesseractPaths(paths: TesseractPaths): void {
  tesseractPaths = paths;
}

export interface OcrWord {
  /** Recognised text content (one logical token, often a single word). */
  text: string;
  /** Pixel bounding box on the source image. Coordinates are top-left origin. */
  bbox: { x0: number; y0: number; x1: number; y1: number };
  /** 0..100 — Tesseract's confidence in this token. */
  confidence: number;
}

export interface OcrResult {
  /** Plain-text concatenation of all recognised tokens, separated by spaces. */
  text: string;
  words: OcrWord[];
  imageWidth: number;
  imageHeight: number;
}

/**
 * Cache OCR results so the redaction writer doesn't re-recognise the same
 * image. Keyed by the input byte length + a short content fingerprint; safe
 * because users typically run mask once then download once for the same file.
 */
const ocrCache = new Map<string, OcrResult>();

function cacheKey(bytes: Uint8Array): string {
  // Cheap fingerprint: length + first/middle/last 16 bytes hashed.
  // Collisions across different uploads are basically impossible.
  let h = bytes.byteLength.toString(36);
  const probe = (i: number) => bytes[i] ?? 0;
  const len = bytes.byteLength;
  for (let i = 0; i < 16; i++) h += probe(i).toString(36);
  for (let i = 0; i < 16; i++) h += probe(Math.floor(len / 2 + i)).toString(36);
  for (let i = 0; i < 16; i++) h += probe(len - 16 + i).toString(36);
  return h;
}

/** Read the cached OCR result for a given image, if one exists. */
export function getCachedOcr(bytes: Uint8Array): OcrResult | undefined {
  return ocrCache.get(cacheKey(bytes));
}

async function toUint8(input: Blob | ArrayBuffer | Uint8Array): Promise<Uint8Array> {
  if (input instanceof Uint8Array) return input;
  if (input instanceof ArrayBuffer) return new Uint8Array(input);
  return new Uint8Array(await input.arrayBuffer());
}

/**
 * Run OCR on an image. Returns the extracted text plus word-level bounding
 * boxes (used by the redaction writer to locate PII regions visually).
 */
export async function runOcr(input: Blob | ArrayBuffer | Uint8Array): Promise<OcrResult> {
  const bytes = await toUint8(input);
  const cached = ocrCache.get(cacheKey(bytes));
  if (cached) return cached;

  // tesseract.js exports both ESM and CJS; the default import works in Vite.
  const Tesseract = await import('tesseract.js');

  // Pass any configured self-hosted paths; Tesseract falls back to its
  // built-in CDN defaults for any path left undefined.
  const workerOptions = Object.fromEntries(
    Object.entries(tesseractPaths).filter(([, v]) => typeof v === 'string')
  ) as Record<string, string>;

  const worker = await Tesseract.createWorker(['deu', 'eng'], 1, workerOptions);
  try {
    // Tesseract accepts Blob/string/HTMLImageElement etc. Wrap our bytes
    // in a Blob for browser-safe typing (no Node Buffer dependency).
    const recognized = await worker.recognize(new Blob([new Uint8Array(bytes)]));
    const data = recognized.data as unknown as {
      text: string;
      words?: Array<{
        text: string;
        bbox?: { x0: number; y0: number; x1: number; y1: number };
        confidence?: number;
      }>;
      blocks?: unknown;
    };

    const words: OcrWord[] = [];
    for (const w of data.words ?? []) {
      if (!w.text || !w.bbox) continue;
      words.push({
        text: w.text,
        bbox: w.bbox,
        confidence: w.confidence ?? 0,
      });
    }

    // Image dimensions — read from a temporary ImageBitmap so the redaction
    // writer doesn't have to decode twice.
    let imageWidth = 0;
    let imageHeight = 0;
    if (typeof createImageBitmap === 'function') {
      try {
        const blob = new Blob([new Uint8Array(bytes)]);
        const bitmap = await createImageBitmap(blob);
        imageWidth = bitmap.width;
        imageHeight = bitmap.height;
        bitmap.close?.();
      } catch {
        /* image dimensions optional; fall back to 0 */
      }
    }

    const result: OcrResult = {
      text: data.text.trim(),
      words,
      imageWidth,
      imageHeight,
    };
    ocrCache.set(cacheKey(bytes), result);
    return result;
  } finally {
    await worker.terminate();
  }
}

export async function parseImageBlob(
  input: Blob | ArrayBuffer | Uint8Array,
  format: SupportedFormat = 'png'
): Promise<ParseResult> {
  const bytes = await toUint8(input);
  const ocr = await runOcr(bytes);
  return {
    text: ocr.text,
    meta: {
      source: 'ocr',
      format,
      bytes: bytes.byteLength,
      ocrWordCount: ocr.words.length,
      imageWidth: ocr.imageWidth,
      imageHeight: ocr.imageHeight,
    },
  };
}
