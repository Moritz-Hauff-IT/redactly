import { describe, it, expect } from 'vitest';
import { parseEmlBlob } from './eml.js';

// A minimal but realistic .eml fixture
const SAMPLE_EML = `From: Alice Example <alice@example.com>
To: Bob Smith <bob@example.org>
Cc: Carol Jones <carol@example.net>
Subject: Hello from Alice
Date: Wed, 27 May 2026 10:00:00 +0000
MIME-Version: 1.0
Content-Type: text/plain; charset=UTF-8

Hi Bob,

This is a test email.

Best,
Alice
`.trim();

const HTML_ONLY_EML = `From: sender@test.com
To: receiver@test.com
Subject: HTML only
MIME-Version: 1.0
Content-Type: text/html; charset=UTF-8

<html><body><p>Hello <b>World</b></p><p>Second paragraph</p></body></html>
`.trim();

describe('parseEmlBlob', () => {
  it('returns format "eml"', async () => {
    const result = await parseEmlBlob(SAMPLE_EML);
    expect(result.meta.format).toBe('eml');
  });

  it('includes Subject in output text', async () => {
    const result = await parseEmlBlob(SAMPLE_EML);
    expect(result.text).toContain('Subject: Hello from Alice');
  });

  it('includes From header in output text', async () => {
    const result = await parseEmlBlob(SAMPLE_EML);
    expect(result.text).toContain('From:');
    expect(result.text).toContain('alice@example.com');
  });

  it('includes To header in output text', async () => {
    const result = await parseEmlBlob(SAMPLE_EML);
    expect(result.text).toContain('To:');
    expect(result.text).toContain('bob@example.org');
  });

  it('includes Cc header in output text', async () => {
    const result = await parseEmlBlob(SAMPLE_EML);
    expect(result.text).toContain('Cc:');
    expect(result.text).toContain('carol@example.net');
  });

  it('includes the plain-text body', async () => {
    const result = await parseEmlBlob(SAMPLE_EML);
    expect(result.text).toContain('This is a test email.');
  });

  it('stores subject, from, to in meta', async () => {
    const result = await parseEmlBlob(SAMPLE_EML);
    expect(result.meta['subject']).toBe('Hello from Alice');
    expect(result.meta['from']).toContain('alice@example.com');
    expect(result.meta['to']).toContain('bob@example.org');
  });

  it('strips HTML tags for HTML-only emails', async () => {
    const result = await parseEmlBlob(HTML_ONLY_EML);
    expect(result.text).toContain('Hello');
    expect(result.text).toContain('World');
    expect(result.text).not.toContain('<html>');
    expect(result.text).not.toContain('<p>');
  });

  it('accepts a Uint8Array input', async () => {
    const bytes = new TextEncoder().encode(SAMPLE_EML);
    const result = await parseEmlBlob(bytes);
    expect(result.text).toContain('Hello from Alice');
  });

  it('reports byte size in meta', async () => {
    const result = await parseEmlBlob(SAMPLE_EML);
    expect(result.meta.bytes).toBeGreaterThan(0);
  });

  it('strips <script> block content from HTML-only emails', async () => {
    const emlWithScript = `From: sender@test.com
To: receiver@test.com
Subject: Script test
MIME-Version: 1.0
Content-Type: text/html; charset=UTF-8

<html><head><script>alert("secret token");</script></head><body><p>Visible text</p></body></html>`.trim();
    const result = await parseEmlBlob(emlWithScript);
    expect(result.text).not.toContain('secret token');
    expect(result.text).not.toContain('alert');
    expect(result.text).toContain('Visible text');
  });

  it('strips <style> block content from HTML-only emails', async () => {
    const emlWithStyle = `From: sender@test.com
To: receiver@test.com
Subject: Style test
MIME-Version: 1.0
Content-Type: text/html; charset=UTF-8

<html><head><style>.secret { color: red; font-family: Arial; }</style></head><body><p>Real content</p></body></html>`.trim();
    const result = await parseEmlBlob(emlWithStyle);
    expect(result.text).not.toContain('.secret');
    expect(result.text).not.toContain('font-family');
    expect(result.text).toContain('Real content');
  });
});
