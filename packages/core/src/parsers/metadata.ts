/**
 * Metadata scrubbing for masked downloads.
 *
 * The layout-preserving redaction writers patch a document's *visible text*
 * but pass the rest of the container through untouched — including
 * `docProps/core.xml` (author, "last modified by", title) and the PDF Info
 * dictionary. Those carry real personal data that would survive masking, so
 * we blank them on the masked copy. (The user's original file is never
 * modified — only the generated download.)
 *
 * The OOXML helpers here are pure string transforms so they can be unit
 * tested; the PDF Info dict is cleared via pdf-lib at the call site.
 */

/** Office core.xml tags that can carry personal data. */
const CORE_PII_TAGS = [
  'dc:creator',
  'cp:lastModifiedBy',
  'dc:title',
  'dc:subject',
  'dc:description',
  'cp:keywords',
  'cp:category',
  'cp:lastPrinted',
];

/** Office app.xml tags that can carry personal data. */
const APP_PII_TAGS = ['Company', 'Manager'];

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Empty the inner text of each named tag, leaving the (now empty) element. */
function blankTags(xml: string, tags: readonly string[]): string {
  let out = xml;
  for (const tag of tags) {
    const t = escapeRegExp(tag);
    const re = new RegExp(`(<${t}(?:\\s[^>]*)?>)[\\s\\S]*?(</${t}>)`, 'g');
    out = out.replace(re, '$1$2');
  }
  return out;
}

/** Strip personal data from a `docProps/core.xml` document. */
export function stripOoxmlCoreXml(xml: string): string {
  return blankTags(xml, CORE_PII_TAGS);
}

/** Strip personal data from a `docProps/app.xml` document. */
export function stripOoxmlAppXml(xml: string): string {
  return blankTags(xml, APP_PII_TAGS);
}
