/**
 * Round-trip property tests: for 50+ fixture inputs, verify that
 * mask() followed by restore() produces the exact original text.
 *
 * Entities are constructed manually (not via the regex detector) so that
 * the tests are isolated and deterministic. No real PII or secrets are used.
 */
import { describe, it, expect } from 'vitest';
import { mask } from './masker.js';
import { restore } from './restorer.js';
import type { Entity } from './types.js';

// ---------------------------------------------------------------------------
// Helper
// ---------------------------------------------------------------------------

function e(
  text: string,
  start: number,
  type: Entity['type'],
  category: Entity['category']
): Entity {
  return {
    start,
    end: start + text.length,
    type,
    category,
    text,
    confidence: 1,
    source: 'manual',
  };
}

/** Assert that mask → restore produces the original text. */
function assertRoundTrip(original: string, entities: Entity[]): void {
  const { maskedText, mapping } = mask(original, entities);
  const { restoredText } = restore(maskedText, mapping);
  expect(restoredText).toBe(original);
}

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

describe('round-trip property tests', () => {
  // --- Email fixtures ---
  it('single email', () =>
    assertRoundTrip('Contact user@example.com for info.', [
      e('user@example.com', 8, 'EMAIL', 'contact'),
    ]));

  it('two distinct emails', () =>
    assertRoundTrip('alice@example.com and bob@example.com', [
      e('alice@example.com', 0, 'EMAIL', 'contact'),
      e('bob@example.com', 22, 'EMAIL', 'contact'),
    ]));

  it('repeated email', () =>
    assertRoundTrip('user@x.com: see user@x.com for details', [
      e('user@x.com', 0, 'EMAIL', 'contact'),
      e('user@x.com', 16, 'EMAIL', 'contact'),
    ]));

  it('three emails', () =>
    assertRoundTrip('a@x.com, b@x.com, c@x.com', [
      e('a@x.com', 0, 'EMAIL', 'contact'),
      e('b@x.com', 9, 'EMAIL', 'contact'),
      e('c@x.com', 18, 'EMAIL', 'contact'),
    ]));

  // --- Phone fixtures ---
  it('single phone', () =>
    assertRoundTrip('Call 555-123-4567 now.', [e('555-123-4567', 5, 'PHONE', 'contact')]));

  it('two phones', () =>
    assertRoundTrip('Primary: 555-111-2222, Secondary: 555-333-4444', [
      e('555-111-2222', 9, 'PHONE', 'contact'),
      e('555-333-4444', 34, 'PHONE', 'contact'),
    ]));

  // --- URL fixtures ---
  it('single URL', () =>
    assertRoundTrip('Visit https://example.com today.', [
      e('https://example.com', 6, 'URL', 'contact'),
    ]));

  it('two URLs', () =>
    assertRoundTrip('Check https://foo.com and https://bar.com', [
      e('https://foo.com', 6, 'URL', 'contact'),
      e('https://bar.com', 26, 'URL', 'contact'),
    ]));

  // --- IP fixtures ---
  it('single IP address', () =>
    assertRoundTrip('Server: 10.0.0.1', [e('10.0.0.1', 8, 'IP', 'contact')]));

  it('two IP addresses', () =>
    assertRoundTrip('From 192.168.1.1 to 10.0.0.2', [
      e('192.168.1.1', 5, 'IP', 'contact'),
      e('10.0.0.2', 20, 'IP', 'contact'),
    ]));

  // --- IBAN fixtures ---
  it('single IBAN', () =>
    assertRoundTrip('IBAN: DE89370400440532013000', [
      e('DE89370400440532013000', 6, 'IBAN', 'financial'),
    ]));

  it('two IBANs', () =>
    assertRoundTrip('Pay DE89370400440532013000 or GB29NWBK60161331926819', [
      e('DE89370400440532013000', 4, 'IBAN', 'financial'),
      e('GB29NWBK60161331926819', 30, 'IBAN', 'financial'),
    ]));

  // --- Credit card fixtures ---
  it('credit card number', () =>
    assertRoundTrip('Card: 4111111111111111', [
      e('4111111111111111', 6, 'CREDIT_CARD', 'financial'),
    ]));

  it('two credit cards', () =>
    assertRoundTrip('4111111111111111 or 5500005555555559', [
      e('4111111111111111', 0, 'CREDIT_CARD', 'financial'),
      e('5500005555555559', 20, 'CREDIT_CARD', 'financial'),
    ]));

  // --- Person + email combination ---
  it('person and email together', () =>
    assertRoundTrip('Alice can be reached at alice@example.com.', [
      e('Alice', 0, 'PERSON', 'person'),
      e('alice@example.com', 24, 'EMAIL', 'contact'),
    ]));

  it('multiple persons', () =>
    assertRoundTrip('Alice met Bob and Charlie.', [
      e('Alice', 0, 'PERSON', 'person'),
      e('Bob', 10, 'PERSON', 'person'),
      e('Charlie', 18, 'PERSON', 'person'),
    ]));

  // --- Organization ---
  it('organization name', () =>
    assertRoundTrip('Works at Acme Corp.', [e('Acme Corp', 9, 'ORG', 'person')]));

  // --- Location ---
  it('location', () =>
    assertRoundTrip('Lives in Berlin.', [e('Berlin', 9, 'LOCATION', 'address')]));

  // --- Secret types ---
  it('GitHub token', () =>
    assertRoundTrip('Token: ghp_AABBCCDDEEFFGGHHIIJJKKLLMMNN', [
      e('ghp_AABBCCDDEEFFGGHHIIJJKKLLMMNN', 7, 'GITHUB_TOKEN', 'secret'),
    ]));

  it('generic secret', () =>
    assertRoundTrip('SECRET_KEY=aBcDeFgHiJkLmNoPqRsTuVwXyZ01234567', [
      e('aBcDeFgHiJkLmNoPqRsTuVwXyZ01234567', 11, 'GENERIC_SECRET', 'secret'),
    ]));

  it('bearer token', () =>
    assertRoundTrip('Authorization: Bearer my-super-secret-bearer-token-value-here-123', [
      e('my-super-secret-bearer-token-value-here-123', 22, 'BEARER_TOKEN', 'secret'),
    ]));

  // --- Multi-line text ---
  it('multi-line text with email', () =>
    assertRoundTrip('Hello,\n\nPlease contact user@example.com.\n\nThanks.', [
      e('user@example.com', 23, 'EMAIL', 'contact'),
    ]));

  it('multi-line with multiple entity types', () =>
    assertRoundTrip('Name: Alice\nEmail: alice@example.com\nPhone: 555-123-4567', [
      e('Alice', 6, 'PERSON', 'person'),
      e('alice@example.com', 19, 'EMAIL', 'contact'),
      e('555-123-4567', 44, 'PHONE', 'contact'),
    ]));

  // --- JSON-like config with secrets ---
  it('JSON-like config with secret', () =>
    assertRoundTrip('{"api_key": "sk-AABBCCDDEE1122334455FFGGHHIIJJKK"}', [
      e('sk-AABBCCDDEE1122334455FFGGHHIIJJKK', 13, 'GENERIC_SECRET', 'secret'),
    ]));

  it('JSON config with email and token', () => {
    const original = '{"user": "admin@corp.com", "token": "tok_AABBCCDDEEFF"}';
    const entities: Entity[] = [
      e('admin@corp.com', 10, 'EMAIL', 'contact'),
      e('tok_AABBCCDDEEFF', 37, 'GENERIC_SECRET', 'secret'),
    ];
    assertRoundTrip(original, entities);
  });

  // --- Special characters in the surrounding text ---
  it('email in HTML-like content', () =>
    assertRoundTrip('<a href="mailto:user@example.com">user@example.com</a>', [
      e('user@example.com', 16, 'EMAIL', 'contact'),
      e('user@example.com', 34, 'EMAIL', 'contact'),
    ]));

  it('parenthesized phone', () =>
    assertRoundTrip('Call (555-987-6543) for help.', [e('555-987-6543', 6, 'PHONE', 'contact')]));

  // --- Entity at start/end of string ---
  it('entity at start of string', () =>
    assertRoundTrip('alice@example.com is the contact.', [
      e('alice@example.com', 0, 'EMAIL', 'contact'),
    ]));

  it('entity at end of string', () =>
    assertRoundTrip('Contact: alice@example.com', [e('alice@example.com', 9, 'EMAIL', 'contact')]));

  it('entity spans entire string', () =>
    assertRoundTrip('alice@example.com', [e('alice@example.com', 0, 'EMAIL', 'contact')]));

  // --- Empty string / no entities ---
  it('empty string with no entities', () => assertRoundTrip('', []));
  it('text with no entities', () => assertRoundTrip('Nothing sensitive here.', []));

  // --- Multiple entity types mixed ---
  it('mixed: person + iban + email', () =>
    assertRoundTrip('Alice (alice@example.com) IBAN DE89370400440532013000', [
      e('Alice', 0, 'PERSON', 'person'),
      e('alice@example.com', 7, 'EMAIL', 'contact'),
      e('DE89370400440532013000', 31, 'IBAN', 'financial'),
    ]));

  it('mixed: org + location + url', () =>
    assertRoundTrip('Acme Corp in Berlin: https://acme.com', [
      e('Acme Corp', 0, 'ORG', 'person'),
      e('Berlin', 13, 'LOCATION', 'address'),
      e('https://acme.com', 21, 'URL', 'contact'),
    ]));

  // --- Text with numbers and punctuation ---
  it('text with numbers and punctuation around entity', () =>
    assertRoundTrip('Ref #42: user@example.com; priority=high', [
      e('user@example.com', 9, 'EMAIL', 'contact'),
    ]));

  it('URL with query string', () =>
    assertRoundTrip('See https://example.com/search?q=test&lang=en for results.', [
      e('https://example.com/search?q=test&lang=en', 4, 'URL', 'contact'),
    ]));

  // --- Many entities in one text ---
  it('10 emails in one text', () => {
    const emails = Array.from({ length: 10 }, (_, i) => `user${i}@example.com`);
    let text = '';
    const entities: Entity[] = [];
    for (const email of emails) {
      const start = text.length;
      entities.push(e(email, start, 'EMAIL', 'contact'));
      text += email + ' ';
    }
    text = text.trimEnd();
    assertRoundTrip(text, entities);
  });

  it('5 secrets in one text', () => {
    const secrets = [
      'aBcDeFgHiJkLmNoPqRsTuVwXyZ',
      'ZyXwVuTsRqPoNmLkJiHgFeDcBa',
      '01234567890123456789012345',
      'AAAABBBBCCCCDDDDEEEEFFFFFFFF',
      'xxYYzzWWvvUUttSSrrQQppOO1122',
    ];
    let text = '';
    const entities: Entity[] = [];
    for (const secret of secrets) {
      const start = text.length;
      entities.push(e(secret, start, 'GENERIC_SECRET', 'secret'));
      text += secret + ' ';
    }
    text = text.trimEnd();
    assertRoundTrip(text, entities);
  });

  // --- Repeated entities of different types ---
  it('same string detected as two entity types (first-write wins)', () => {
    // "Apple" could be a PERSON or ORG; first entity in sorted order wins
    const text = 'Apple Apple';
    const entities: Entity[] = [e('Apple', 0, 'PERSON', 'person'), e('Apple', 6, 'ORG', 'person')];
    // Should not throw; both should get the same placeholder
    const { maskedText, mapping } = mask(text, entities);
    const { restoredText } = restore(maskedText, mapping);
    expect(restoredText).toBe(text);
    // Only one entry in forward map
    expect(mapping.forward.size).toBe(1);
  });

  // --- TAX_ID and VAT_ID ---
  it('tax ID round-trip', () =>
    assertRoundTrip('Tax ID: 12345678901', [e('12345678901', 8, 'TAX_ID_DE', 'financial')]));

  it('VAT ID round-trip', () =>
    assertRoundTrip('VAT: DE123456789', [e('DE123456789', 5, 'VAT_ID', 'financial')]));

  // --- BIC ---
  it('BIC round-trip', () =>
    assertRoundTrip('BIC: DEUTDEDB', [e('DEUTDEDB', 5, 'BIC', 'financial')]));

  // --- Unicode text ---
  it('unicode surrounding text with email', () =>
    assertRoundTrip('Hé! Écrivez à user@example.com — merci.', [
      e('user@example.com', 14, 'EMAIL', 'contact'),
    ]));

  // --- Newlines and tabs ---
  it('tab-separated values with email and phone', () => {
    // 'Name\tEmail\tPhone\nAlice\tuser@example.com\t555-123-4567'
    // user@example.com at 23, 555-123-4567 at 40
    assertRoundTrip('Name\tEmail\tPhone\nAlice\tuser@example.com\t555-123-4567', [
      e('user@example.com', 23, 'EMAIL', 'contact'),
      e('555-123-4567', 40, 'PHONE', 'contact'),
    ]);
  });

  // --- Long text ---
  it('long text with entity in the middle', () => {
    const prefix = 'A'.repeat(500);
    const suffix = 'Z'.repeat(500);
    const original = `${prefix}user@example.com${suffix}`;
    assertRoundTrip(original, [e('user@example.com', 500, 'EMAIL', 'contact')]);
  });

  // --- Slug-like texts ---
  it('email inside a sentence ending with period', () =>
    assertRoundTrip('Please email user@example.com.', [
      e('user@example.com', 13, 'EMAIL', 'contact'),
    ]));

  // --- Multiple secret types ---
  it('JWT and API key together', () => {
    const jwt = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjMifQ.abc123';
    const apiKey = 'sk-AABBCCDDEEFF11223344556677889900';
    const original = `jwt=${jwt} key=${apiKey}`;
    assertRoundTrip(original, [
      e(jwt, 4, 'JWT', 'secret'),
      e(apiKey, 4 + jwt.length + 5, 'GENERIC_SECRET', 'secret'),
    ]);
  });

  // --- Paragraph with multiple entities ---
  it('paragraph with person, email, phone, URL', () => {
    const original =
      'Dear Alice, please visit https://example.com or call 555-000-1234. ' +
      'You can also email alice@example.com directly.';
    assertRoundTrip(original, [
      e('Alice', 5, 'PERSON', 'person'),
      e('https://example.com', 25, 'URL', 'contact'),
      e('555-000-1234', 53, 'PHONE', 'contact'),
      e('alice@example.com', 86, 'EMAIL', 'contact'),
    ]);
  });

  // --- Entity with special regex chars in text ---
  it('URL with parentheses in surrounding text', () =>
    assertRoundTrip('See (https://example.com) for details.', [
      e('https://example.com', 5, 'URL', 'contact'),
    ]));

  // --- Additional fixtures ---
  it('two persons with same first name different last', () =>
    assertRoundTrip('Alice Smith and Alice Jones', [
      e('Alice Smith', 0, 'PERSON', 'person'),
      e('Alice Jones', 16, 'PERSON', 'person'),
    ]));

  it('email with subdomain', () =>
    assertRoundTrip('Write to user@mail.internal.corp for help.', [
      e('user@mail.internal.corp', 9, 'EMAIL', 'contact'),
    ]));

  it('IP with port reference in text', () =>
    assertRoundTrip('Connect to 172.16.0.1 on port 8080.', [e('172.16.0.1', 11, 'IP', 'contact')]));

  it('Stripe key round-trip', () =>
    assertRoundTrip('stripe_key=sk_live_AABBCCDDEEFFGGHHIIJJKKLLMMNN', [
      e('sk_live_AABBCCDDEEFFGGHHIIJJKKLLMMNN', 11, 'STRIPE_KEY', 'secret'),
    ]));

  it('three IBANs in one text', () =>
    assertRoundTrip(
      'Accounts: DE89370400440532013000, GB29NWBK60161331926819, FR7630006000011234567890189',
      [
        e('DE89370400440532013000', 10, 'IBAN', 'financial'),
        e('GB29NWBK60161331926819', 34, 'IBAN', 'financial'),
        e('FR7630006000011234567890189', 58, 'IBAN', 'financial'),
      ]
    ));

  it('empty entities on a long text', () =>
    assertRoundTrip(
      'This long text has no entities whatsoever and should come back unchanged.',
      []
    ));

  // --- Hello Alice IBAN round-trip ---
  it('Hello Alice with IBAN', () =>
    assertRoundTrip('Hello Alice, your IBAN is DE89370400440532013000.', [
      e('Alice', 6, 'PERSON', 'person'),
      e('DE89370400440532013000', 26, 'IBAN', 'financial'),
    ]));
});
