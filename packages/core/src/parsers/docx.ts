/**
 * .docx parser using mammoth.
 * Extracts raw text from a .docx file (Office Open XML format).
 *
 * mammoth's browser build (resolved by Vite via the package.json `browser`
 * field) accepts `{ arrayBuffer: ArrayBuffer }`.
 * mammoth's Node/CJS build accepts `{ buffer: Buffer }`.
 * We pass `{ arrayBuffer }` in browsers and fall back to `{ buffer: Buffer }`
 * in Node (where the global `Buffer` class is available).
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

  let arrayBuf: ArrayBuffer;
  let bytes: number;

  if (input instanceof Uint8Array) {
    arrayBuf = input.buffer.slice(
      input.byteOffset,
      input.byteOffset + input.byteLength
    ) as ArrayBuffer;
    bytes = input.byteLength;
  } else if (input instanceof ArrayBuffer) {
    arrayBuf = input;
    bytes = input.byteLength;
  } else {
    arrayBuf = await (input as Blob).arrayBuffer();
    bytes = (input as Blob).size;
  }

  // In browsers (Vite resolves mammoth's browser build) use { arrayBuffer }.
  // In Node (CJS build) use { buffer: Buffer } — Buffer is accessed via
  // globalThis so there is no static Node-only import in this module.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const NodeBuffer: typeof Buffer | undefined = (globalThis as any).Buffer;
  const mammothInput = NodeBuffer
    ? { buffer: NodeBuffer.from(arrayBuf) }
    : { arrayBuffer: arrayBuf };

  const result = await mammoth.extractRawText(
    mammothInput as Parameters<typeof mammoth.extractRawText>[0]
  );
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
