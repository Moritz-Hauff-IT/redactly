/**
 * .rtf parser — extract plain text from Rich Text Format.
 *
 * RTF is a control-word language wrapped in `{}` groups. We don't render it;
 * we walk it and emit the visible text: control words like `\par`/`\tab` map
 * to whitespace, `\'hh` is a cp1252 byte, `\uN` is a Unicode code point, and
 * non-content destinations (font/colour tables, stylesheet, info, pictures,
 * ignorable `{\*…}` groups) are skipped wholesale. Good enough to feed the
 * detection pipeline; the masked download is a plain-text dump.
 */

import type { ParseResult } from './txt.js';

// Control destinations whose entire group is non-visible metadata.
const SKIP_DESTINATIONS = new Set([
  'fonttbl',
  'colortbl',
  'stylesheet',
  'info',
  'pict',
  'header',
  'footer',
  'generator',
  'themedata',
  'colorschememapping',
  'latentstyles',
  'datastore',
  'mmathPr',
]);

// cp1252 high range (0x80–0x9F) special mappings; the rest is Latin-1.
const CP1252: Record<number, number> = {
  0x80: 0x20ac,
  0x82: 0x201a,
  0x83: 0x0192,
  0x84: 0x201e,
  0x85: 0x2026,
  0x86: 0x2020,
  0x87: 0x2021,
  0x88: 0x02c6,
  0x89: 0x2030,
  0x8a: 0x0160,
  0x8b: 0x2039,
  0x8c: 0x0152,
  0x8e: 0x017d,
  0x91: 0x2018,
  0x92: 0x2019,
  0x93: 0x201c,
  0x94: 0x201d,
  0x95: 0x2022,
  0x96: 0x2013,
  0x97: 0x2014,
  0x98: 0x02dc,
  0x99: 0x2122,
  0x9a: 0x0161,
  0x9b: 0x203a,
  0x9c: 0x0153,
  0x9e: 0x017e,
  0x9f: 0x0178,
};

function cp1252Char(byte: number): string {
  return String.fromCharCode(byte >= 0x80 && byte <= 0x9f ? (CP1252[byte] ?? byte) : byte);
}

const SIMPLE_WORDS: Record<string, string> = {
  par: '\n',
  line: '\n',
  tab: '\t',
  emdash: '—',
  endash: '–',
  lquote: '‘',
  rquote: '’',
  ldblquote: '“',
  rdblquote: '”',
  bullet: '•',
};

/** Convert an RTF document string to plain text. */
export function rtfToText(rtf: string): string {
  let out = '';
  let i = 0;
  const n = rtf.length;
  // `skip` = currently inside a non-visible destination; `stack` remembers each
  // open group's inherited skip so `}` restores the parent's state. A group
  // becomes a skip group via `\*` or a skip-destination control word.
  let skip = false;
  const stack: boolean[] = [];
  let ucSkip = 1; // chars to skip after a \uN, per \ucN

  while (i < n) {
    const ch = rtf[i];

    if (ch === '{') {
      stack.push(skip);
      i++;
      continue;
    }
    if (ch === '}') {
      skip = stack.pop() ?? false;
      i++;
      continue;
    }
    if (ch === '\\') {
      const next = rtf[i + 1];
      // Escaped literals
      if (next === '\\' || next === '{' || next === '}') {
        if (!skip) out += next;
        i += 2;
        continue;
      }
      // \'hh hex byte
      if (next === "'") {
        const hex = rtf.slice(i + 2, i + 4);
        const code = Number.parseInt(hex, 16);
        if (!skip && Number.isFinite(code)) out += cp1252Char(code);
        i += 4;
        continue;
      }
      // Ignorable destination "\*" — this group is non-visible.
      if (next === '*') {
        skip = true;
        i += 2;
        continue;
      }
      // Control word: letters, optional signed number, optional single space.
      const m = /^\\([a-zA-Z]+)(-?\d+)?\s?/.exec(rtf.slice(i));
      if (m) {
        const word = m[1] as string;
        const param = m[2] !== undefined ? Number.parseInt(m[2], 10) : null;
        i += m[0].length;
        if (word === 'u' && param !== null) {
          if (!skip) out += String.fromCharCode(param < 0 ? param + 65536 : param);
          // Skip the following ucSkip fallback chars.
          let skipped = 0;
          while (skipped < ucSkip && i < n) {
            if (rtf[i] === '\\') {
              const fm = /^\\([a-zA-Z]+)(-?\d+)?\s?|^\\'..|^\\./.exec(rtf.slice(i));
              i += fm ? fm[0].length : 2;
            } else {
              i++;
            }
            skipped++;
          }
          continue;
        }
        if (word === 'uc' && param !== null) {
          ucSkip = param;
          continue;
        }
        if (SKIP_DESTINATIONS.has(word)) {
          skip = true;
          continue;
        }
        if (!skip && word in SIMPLE_WORDS) out += SIMPLE_WORDS[word];
        continue;
      }
      // Lone backslash followed by something odd — skip the backslash.
      i++;
      continue;
    }

    // Plain character. RTF ignores raw CR/LF (formatting is via \par).
    if (ch !== '\r' && ch !== '\n') {
      if (!skip) out += ch;
    }
    i++;
  }

  return out.replace(/[ \t]+\n/g, '\n').trim();
}

export async function parseRtfBlob(
  input: Blob | ArrayBuffer | Uint8Array | string
): Promise<ParseResult> {
  let text: string;
  let bytes: number;
  if (typeof input === 'string') {
    text = input;
    bytes = new TextEncoder().encode(input).length;
  } else if (input instanceof Uint8Array) {
    text = new TextDecoder().decode(input);
    bytes = input.byteLength;
  } else if (input instanceof ArrayBuffer) {
    text = new TextDecoder().decode(input);
    bytes = input.byteLength;
  } else {
    const buf = await input.arrayBuffer();
    text = new TextDecoder().decode(buf);
    bytes = input.size;
  }
  return { text: rtfToText(text), meta: { source: 'rtf', format: 'rtf', bytes } };
}
