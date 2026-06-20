import { describe, expect, it } from 'vitest';
import { stripOoxmlAppXml, stripOoxmlCoreXml } from './metadata.js';

describe('stripOoxmlCoreXml', () => {
  const core = `<?xml version="1.0"?>
<cp:coreProperties xmlns:cp="..." xmlns:dc="..." xmlns:dcterms="...">
<dc:title>Q2 Salaries</dc:title>
<dc:creator>Anna Müller</dc:creator>
<cp:lastModifiedBy>Beat Weber</cp:lastModifiedBy>
<dcterms:created xsi:type="dcterms:W3CDTF">2026-01-01T00:00:00Z</dcterms:created>
<cp:revision>3</cp:revision>
</cp:coreProperties>`;

  it('blanks creator, lastModifiedBy and title', () => {
    const out = stripOoxmlCoreXml(core);
    expect(out).not.toContain('Anna Müller');
    expect(out).not.toContain('Beat Weber');
    expect(out).not.toContain('Q2 Salaries');
    // Tags themselves remain (valid OOXML), just empty.
    expect(out).toContain('<dc:creator></dc:creator>');
    expect(out).toContain('<cp:lastModifiedBy></cp:lastModifiedBy>');
  });

  it('leaves non-PII tags (dates, revision) untouched', () => {
    const out = stripOoxmlCoreXml(core);
    expect(out).toContain('<cp:revision>3</cp:revision>');
    expect(out).toContain('2026-01-01T00:00:00Z');
  });

  it('is a no-op when there is nothing to strip', () => {
    const xml = '<cp:coreProperties><cp:revision>1</cp:revision></cp:coreProperties>';
    expect(stripOoxmlCoreXml(xml)).toBe(xml);
  });
});

describe('stripOoxmlAppXml', () => {
  it('blanks Company and Manager', () => {
    const app = `<Properties><Application>Excel</Application><Company>ACME AG</Company><Manager>Eva Chef</Manager></Properties>`;
    const out = stripOoxmlAppXml(app);
    expect(out).not.toContain('ACME AG');
    expect(out).not.toContain('Eva Chef');
    expect(out).toContain('<Application>Excel</Application>');
  });
});
