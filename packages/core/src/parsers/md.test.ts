import { describe, it, expect } from 'vitest';
import { parseMdBlob } from './md.js';

const FRONTMATTER_DOC = `---
title: Test
author: Alice
---
# Heading

Body text here.`;

describe('parseMdBlob', () => {
  it('returns format "md"', async () => {
    const result = await parseMdBlob('# hello');
    expect(result.meta.format).toBe('md');
  });

  it('strips YAML front-matter by default', async () => {
    const result = await parseMdBlob(FRONTMATTER_DOC);
    expect(result.text).not.toContain('title: Test');
    expect(result.text).toContain('# Heading');
    expect(result.text).toContain('Body text here.');
  });

  it('preserves front-matter when stripFrontmatter is false', async () => {
    const result = await parseMdBlob(FRONTMATTER_DOC, { stripFrontmatter: false });
    expect(result.text).toContain('title: Test');
    expect(result.text).toContain('# Heading');
  });

  it('handles document without front-matter gracefully', async () => {
    const doc = '# Just a heading\n\nParagraph.';
    const result = await parseMdBlob(doc);
    expect(result.text).toBe(doc);
  });

  it('strips UTF-8 BOM', async () => {
    const withBom = '﻿# heading';
    const result = await parseMdBlob(withBom);
    expect(result.text.startsWith('﻿')).toBe(false);
    expect(result.text).toContain('# heading');
  });

  it('accepts a Blob', async () => {
    const blob = new Blob(['# markdown'], { type: 'text/markdown' });
    const result = await parseMdBlob(blob);
    expect(result.text).toContain('# markdown');
  });

  it('strips frontmatter even when file ends with --- without a trailing newline', async () => {
    const docWithoutTrailingNewline = '---\ntitle: Test\nauthor: Alice\n---';
    const result = await parseMdBlob(docWithoutTrailingNewline);
    expect(result.text).not.toContain('title: Test');
    expect(result.text.trim()).toBe('');
  });
});
