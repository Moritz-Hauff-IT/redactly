/**
 * Markdown parser.
 * Same as the txt parser but format is 'md'.
 * Optionally strips YAML front-matter (--- ... ---) at the top of the file.
 */

import { parseTxtBlob, type ParseResult } from './txt.js';

export interface MdParseOptions {
  /**
   * Strip YAML front-matter (`^---\n...\n---\n`) from the top of the file.
   * @default true
   */
  stripFrontmatter?: boolean;
}

const FRONTMATTER_RE = /^---\r?\n[\s\S]*?\n---(\r?\n|$)/;

export async function parseMdBlob(
  input: Blob | ArrayBuffer | Uint8Array | string,
  options: MdParseOptions = {}
): Promise<ParseResult> {
  const { stripFrontmatter = true } = options;

  const base = await parseTxtBlob(input);

  let text = base.text;
  if (stripFrontmatter) {
    text = text.replace(FRONTMATTER_RE, '');
  }

  return {
    text,
    meta: {
      ...base.meta,
      source: 'md',
      format: 'md',
    },
  };
}
