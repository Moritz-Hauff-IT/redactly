/**
 * .docx parser using mammoth.
 * Extracts raw text from a .docx file (Office Open XML format).
 */

import type { ParseResult } from './txt.js';

export async function parseDocxBlob(input: Blob | ArrayBuffer | Uint8Array): Promise<ParseResult> {
  if (typeof input === 'string') {
    throw new TypeError(
      'parseDocxBlob does not accept string input; provide a Blob or ArrayBuffer.'
    );
  }

  // mammoth is a CJS module; dynamic import for ESM compatibility
  const mammoth = await import('mammoth');

  let nodeBuffer: Buffer;
  let bytes: number;

  if (input instanceof Uint8Array) {
    nodeBuffer = Buffer.from(input.buffer, input.byteOffset, input.byteLength);
    bytes = input.byteLength;
  } else if (input instanceof ArrayBuffer) {
    nodeBuffer = Buffer.from(input);
    bytes = input.byteLength;
  } else {
    // Blob
    const ab = await (input as Blob).arrayBuffer();
    nodeBuffer = Buffer.from(ab);
    bytes = (input as Blob).size;
  }

  // mammoth Node API accepts { buffer: Buffer }
  const result = await mammoth.extractRawText({ buffer: nodeBuffer });
  const text = result.value.trim();

  return {
    text,
    meta: {
      source: 'docx',
      format: 'docx',
      bytes,
    },
  };
}
