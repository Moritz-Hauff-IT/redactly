/**
 * .eml parser using postal-mime.
 *
 * Parses an email file and concatenates subject, from, to, cc, bcc, date,
 * and the plain-text body into a single string.
 *
 * If only an HTML body is available, we strip tags with a simple heuristic
 * to avoid adding a full HTML parser dependency.
 */

import PostalMime from 'postal-mime';
import type { Address } from 'postal-mime';
import type { ParseResult } from './txt.js';

/**
 * Very light heuristic HTML → plain-text conversion.
 * Replaces block elements with newlines, then strips all remaining tags.
 */
function stripHtml(html: string): string {
  return html
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/?(p|div|li|tr|h[1-6]|blockquote)[^>]*>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function addressToString(addr: Address | undefined): string {
  if (!addr) return '';
  if ('group' in addr && addr.group !== undefined) {
    return addr.group.map(addressToString).join(', ');
  }
  const mailbox = addr as { name?: string; address?: string };
  if (mailbox.name && mailbox.address) return `${mailbox.name} <${mailbox.address}>`;
  if (mailbox.address) return mailbox.address;
  return mailbox.name ?? '';
}

function addressListToString(list: Address[] | undefined): string {
  if (!list || list.length === 0) return '';
  return list.map(addressToString).join(', ');
}

export async function parseEmlBlob(
  input: Blob | ArrayBuffer | Uint8Array | string
): Promise<ParseResult> {
  let raw: string | ArrayBuffer | Uint8Array | Blob;

  if (typeof input === 'string') {
    raw = input;
  } else if (input instanceof Uint8Array) {
    raw = input;
  } else if (input instanceof ArrayBuffer) {
    raw = input;
  } else {
    // Blob
    raw = input;
  }

  const bytes: number =
    typeof raw === 'string'
      ? new TextEncoder().encode(raw).byteLength
      : raw instanceof Uint8Array
        ? raw.byteLength
        : raw instanceof ArrayBuffer
          ? raw.byteLength
          : (raw as Blob).size;

  const parser = new PostalMime();
  const email = await parser.parse(raw as Parameters<typeof parser.parse>[0]);

  // Build header block
  const parts: string[] = [];

  if (email.subject) parts.push(`Subject: ${email.subject}`);
  if (email.from) parts.push(`From: ${addressToString(email.from)}`);
  if (email.to && email.to.length > 0) parts.push(`To: ${addressListToString(email.to)}`);
  if (email.cc && email.cc.length > 0) parts.push(`Cc: ${addressListToString(email.cc)}`);
  if (email.bcc && email.bcc.length > 0) parts.push(`Bcc: ${addressListToString(email.bcc)}`);
  if (email.date) parts.push(`Date: ${email.date}`);

  const headerBlock = parts.join('\n');

  // Prefer plain text body; fall back to HTML → text
  const bodyText = email.text ?? (email.html ? stripHtml(email.html) : '');

  const text = headerBlock ? `${headerBlock}\n\n${bodyText}` : bodyText;

  return {
    text,
    meta: {
      source: 'eml',
      format: 'eml',
      bytes,
      from: email.from ? addressToString(email.from) : undefined,
      to: email.to ? addressListToString(email.to) : undefined,
      subject: email.subject ?? undefined,
    },
  };
}
