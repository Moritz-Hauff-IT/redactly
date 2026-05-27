/**
 * Plain-text parser.
 * Accepts a string, Blob, ArrayBuffer, or Uint8Array.
 * Strips a UTF-8 BOM (EF BB BF) if present.
 */

export interface ParseResult {
  text: string;
  meta: {
    source: string;
    format: 'txt' | 'md' | 'eml' | 'pdf' | 'docx';
    bytes: number;
    [key: string]: unknown;
  };
}

function stripBom(text: string): string {
  return text.startsWith('﻿') ? text.slice(1) : text;
}

async function toUint8Array(
  input: Blob | ArrayBuffer | Uint8Array | string
): Promise<{ bytes: Uint8Array; size: number }> {
  if (typeof input === 'string') {
    const encoded = new TextEncoder().encode(input);
    return { bytes: encoded, size: encoded.byteLength };
  }
  if (input instanceof Uint8Array) {
    return { bytes: input, size: input.byteLength };
  }
  if (input instanceof ArrayBuffer) {
    return { bytes: new Uint8Array(input), size: input.byteLength };
  }
  // Blob
  const ab = await input.arrayBuffer();
  const bytes = new Uint8Array(ab);
  return { bytes, size: bytes.byteLength };
}

export async function parseTxtBlob(
  input: Blob | ArrayBuffer | Uint8Array | string
): Promise<ParseResult> {
  const { bytes, size } = await toUint8Array(input);
  const raw = new TextDecoder('utf-8').decode(bytes);
  const text = stripBom(raw);
  return {
    text,
    meta: {
      source: 'txt',
      format: 'txt',
      bytes: size,
    },
  };
}
