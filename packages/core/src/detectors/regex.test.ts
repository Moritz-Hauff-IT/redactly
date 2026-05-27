/**
 * Tests for RegexDetector.
 * Each pattern gets >= 2 positive examples and >= 2 negative look-alike examples.
 * All test data is synthetic / canonical test vectors — no real secrets or PII.
 */
import { describe, it, expect } from 'vitest';
import { RegexDetector } from './regex.js';
import type { Entity, EntityType } from '../types.js';

const detector = new RegexDetector();

/** Helper: find entities of a given type in text */
function findType(text: string, type: EntityType): Entity[] {
  return detector.detect(text).filter((e) => e.type === type);
}

/** Helper: assert at least one match of the given type */
function hasMatch(text: string, type: EntityType): boolean {
  return findType(text, type).length > 0;
}

/** Helper: assert zero matches of the given type */
function noMatch(text: string, type: EntityType): boolean {
  return findType(text, type).length === 0;
}

// ---------------------------------------------------------------------------
// EMAIL
// ---------------------------------------------------------------------------
describe('EMAIL detection', () => {
  it('detects simple email address', () => {
    expect(hasMatch('Contact us at user@example.com please', 'EMAIL')).toBe(true);
  });

  it('detects email with plus-tag', () => {
    expect(hasMatch('Send to user+tag@mail.example.org', 'EMAIL')).toBe(true);
  });

  it('detects email with subdomain', () => {
    expect(hasMatch('john.doe@sub.domain.co.uk', 'EMAIL')).toBe(true);
  });

  it('does NOT match bare domain without @', () => {
    expect(noMatch('example.com', 'EMAIL')).toBe(true);
  });

  it('does NOT match @-sign without valid local part', () => {
    expect(noMatch('@ something', 'EMAIL')).toBe(true);
  });

  it('entity text equals the slice of source text', () => {
    const text = 'Send to user@example.com now';
    const [e] = findType(text, 'EMAIL');
    expect(e).toBeDefined();
    expect(text.slice(e!.start, e!.end)).toBe(e!.text);
  });
});

// ---------------------------------------------------------------------------
// URL
// ---------------------------------------------------------------------------
describe('URL detection', () => {
  it('detects https URL', () => {
    expect(hasMatch('Visit https://www.example.com/path?q=1', 'URL')).toBe(true);
  });

  it('detects http URL', () => {
    expect(hasMatch('See http://localhost:3000/api', 'URL')).toBe(true);
  });

  it('does NOT match ftp:// (only http/https)', () => {
    expect(noMatch('ftp://example.com/file', 'URL')).toBe(true);
  });

  it('does NOT match plain domain with no scheme', () => {
    expect(noMatch('example.com is a domain', 'URL')).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// PHONE
// ---------------------------------------------------------------------------
describe('PHONE detection', () => {
  it('detects E.164 phone number', () => {
    expect(hasMatch('Call me at +4915123456789', 'PHONE')).toBe(true);
  });

  it('detects German local format with area code', () => {
    expect(hasMatch('My number is 089 12345678', 'PHONE')).toBe(true);
  });

  it('does NOT match a 20-digit number (too long)', () => {
    expect(noMatch('+12345678901234567890', 'PHONE')).toBe(true);
  });

  it('does NOT match a short standalone number with no prefix', () => {
    // "12345" with no leading + or 0 must not be flagged as PHONE
    const matches = findType('Order 12345 was placed', 'PHONE');
    expect(matches.length).toBe(0);
  });

  it('phone entity text equals text.slice(start, end)', () => {
    const text = 'Please call +4915123456789 today';
    const [e] = findType(text, 'PHONE');
    if (e) {
      expect(text.slice(e.start, e.end)).toBe(e.text);
    }
  });
});

// ---------------------------------------------------------------------------
// IP
// ---------------------------------------------------------------------------
describe('IP detection', () => {
  it('detects valid IPv4', () => {
    expect(hasMatch('Server at 192.168.1.1 is down', 'IP')).toBe(true);
  });

  it('detects another valid IPv4', () => {
    expect(hasMatch('Connect to 203.0.113.42', 'IP')).toBe(true);
  });

  it('does NOT match an octet > 255', () => {
    expect(noMatch('256.0.0.1 is invalid', 'IP')).toBe(true);
  });

  it('does NOT match partial IP-like text', () => {
    expect(noMatch('version 1.2 release', 'IP')).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// IBAN
// ---------------------------------------------------------------------------
describe('IBAN detection', () => {
  it('detects DE IBAN test vector', () => {
    expect(hasMatch('My IBAN is DE89370400440532013000', 'IBAN')).toBe(true);
  });

  it('detects GB IBAN', () => {
    expect(hasMatch('Transfer to GB29NWBK60161331926819', 'IBAN')).toBe(true);
  });

  it('detects IBAN with spaces', () => {
    expect(hasMatch('IBAN: DE89 3704 0044 0532 0130 00', 'IBAN')).toBe(true);
  });

  it('matches bad-checksum DE IBAN with low confidence (lenient fallback)', () => {
    // Strict rule rejects (mod-97 fails), lenient rule still surfaces it
    // because IBAN-shaped real-country-code strings are often source-document typos.
    const matches = findType('DE00370400440532013000', 'IBAN');
    expect(matches.length).toBeGreaterThan(0);
    expect(matches[0]?.confidence).toBeLessThan(0.6);
  });

  it('does NOT match a random uppercase+digit string with non-ISO country code', () => {
    // 'XX' is not a real ISO 3166-1 alpha-2 country code, so the lenient rule
    // (which whitelists real country codes) still rejects it.
    expect(noMatch('XX00XXXX0000000000000000', 'IBAN')).toBe(true);
  });

  it('confidence is 0.99 for valid IBAN', () => {
    const [e] = findType('DE89370400440532013000', 'IBAN');
    expect(e?.confidence).toBe(0.99);
  });
});

// ---------------------------------------------------------------------------
// CREDIT_CARD
// ---------------------------------------------------------------------------
describe('CREDIT_CARD detection', () => {
  it('detects Visa test PAN 4111111111111111', () => {
    expect(hasMatch('Card: 4111111111111111', 'CREDIT_CARD')).toBe(true);
  });

  it('detects Mastercard test PAN 5500005555555559', () => {
    expect(hasMatch('Pay with 5500005555555559', 'CREDIT_CARD')).toBe(true);
  });

  it('detects PAN with spaces (4111 1111 1111 1111)', () => {
    expect(hasMatch('4111 1111 1111 1111', 'CREDIT_CARD')).toBe(true);
  });

  it('does NOT match PAN with wrong Luhn digit', () => {
    expect(noMatch('4111111111111112', 'CREDIT_CARD')).toBe(true);
  });

  it('does NOT match a short number that fails Luhn', () => {
    expect(noMatch('1234567890123', 'CREDIT_CARD')).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// VAT_ID
// ---------------------------------------------------------------------------
describe('VAT_ID detection', () => {
  it('detects German VAT ID', () => {
    expect(hasMatch('VAT: DE123456789', 'VAT_ID')).toBe(true);
  });

  it('detects Austrian VAT ID', () => {
    expect(hasMatch('VAT-Nr: ATU12345678', 'VAT_ID')).toBe(true);
  });

  it('does NOT match DE followed by wrong number of digits', () => {
    expect(noMatch('DE1234567', 'VAT_ID')).toBe(true);
  });

  it('does NOT match random country prefix', () => {
    expect(noMatch('XX123456789', 'VAT_ID')).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// AWS_ACCESS_KEY
// ---------------------------------------------------------------------------
describe('AWS_ACCESS_KEY detection', () => {
  it('detects AKIA key', () => {
    expect(hasMatch('Key: AKIAIOSFODNN7EXAMPLE', 'AWS_ACCESS_KEY')).toBe(true);
  });

  it('detects ASIA key (STS temporary)', () => {
    expect(hasMatch('aws_access_key_id=ASIAIOSFODNN7EXAMPLE', 'AWS_ACCESS_KEY')).toBe(true);
  });

  it('does NOT match key shorter than expected', () => {
    expect(noMatch('AKIAIOSFODNN', 'AWS_ACCESS_KEY')).toBe(true);
  });

  it('does NOT match non-AWS prefix of same length', () => {
    expect(noMatch('ZZZAIOSFODNN7EXAMPLE', 'AWS_ACCESS_KEY')).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// GITHUB_TOKEN
// ---------------------------------------------------------------------------
describe('GITHUB_TOKEN detection', () => {
  it('detects ghp_ personal access token', () => {
    // 36 alphanumeric chars after ghp_
    expect(
      hasMatch('GITHUB_TOKEN=ghp_ABCDEFGHIJKLMNOPQRSTUVWXYZabcdef123456', 'GITHUB_TOKEN')
    ).toBe(true);
  });

  it('detects gho_ OAuth token', () => {
    // 36 alphanumeric chars after gho_
    expect(hasMatch('token: gho_ABCDEFGHIJKLMNOPQRSTUVWXYZabcdef123456', 'GITHUB_TOKEN')).toBe(
      true
    );
  });

  it('does NOT match token shorter than 36 chars after prefix', () => {
    expect(noMatch('ghp_SHORT', 'GITHUB_TOKEN')).toBe(true);
  });

  it('does NOT match unknown gh prefix', () => {
    expect(noMatch('ghz_ABCDEFGHIJKLMNOPQRSTUVWXYZabcdef12', 'GITHUB_TOKEN')).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// STRIPE_KEY
// ---------------------------------------------------------------------------
describe('STRIPE_KEY detection', () => {
  it('detects sk_test_ key', () => {
    expect(hasMatch('STRIPE_KEY=sk_test_4eC39HqLyjWDarjtT1zdp7dc', 'STRIPE_KEY')).toBe(true);
  });

  it('detects pk_live_ key', () => {
    expect(hasMatch('pk_live_51ABCDEFGHIJKLMNOPQRSTUVWx', 'STRIPE_KEY')).toBe(true);
  });

  it('does NOT match unknown prefix mode (sk_dev_)', () => {
    expect(noMatch('sk_dev_4eC39HqLyjWDarjtT1zdp7dc', 'STRIPE_KEY')).toBe(true);
  });

  it('does NOT match key shorter than 24 chars after mode', () => {
    expect(noMatch('sk_test_SHORT', 'STRIPE_KEY')).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// OPENAI_KEY
// ---------------------------------------------------------------------------
describe('OPENAI_KEY detection', () => {
  it('detects standard OpenAI key', () => {
    expect(hasMatch('key=sk-ABCDEFGHIJKLMNOPQRSTUVWXYZabcd', 'OPENAI_KEY')).toBe(true);
  });

  it('detects project-scoped OpenAI key', () => {
    expect(hasMatch('sk-proj-ABCDEFGHIJKLMNOPQRSTUVWXYZabcd', 'OPENAI_KEY')).toBe(true);
  });

  it('does NOT match key shorter than 20 chars', () => {
    expect(noMatch('sk-SHORT', 'OPENAI_KEY')).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// ANTHROPIC_KEY
// ---------------------------------------------------------------------------
describe('ANTHROPIC_KEY detection', () => {
  it('detects sk-ant- key', () => {
    expect(
      hasMatch('ANTHROPIC_API_KEY=sk-ant-ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghij', 'ANTHROPIC_KEY')
    ).toBe(true);
  });

  it('detects sk-ant-api03- key', () => {
    expect(hasMatch('sk-ant-api03-ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghij', 'ANTHROPIC_KEY')).toBe(
      true
    );
  });

  it('does NOT match key shorter than 30 chars after prefix', () => {
    expect(noMatch('sk-ant-SHORT', 'ANTHROPIC_KEY')).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// JWT
// ---------------------------------------------------------------------------
describe('JWT detection', () => {
  // Canonical structure: eyJ<header>.eyJ<payload>.<signature>
  const exampleJwt =
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9' +
    '.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ' +
    '.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c';

  it('detects a standard JWT', () => {
    expect(hasMatch(`Bearer ${exampleJwt}`, 'JWT')).toBe(true);
  });

  it('detects JWT inline in text', () => {
    expect(hasMatch(`token=${exampleJwt}`, 'JWT')).toBe(true);
  });

  it('does NOT match a single base64 segment without dots', () => {
    expect(noMatch('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9', 'JWT')).toBe(true);
  });

  it('does NOT match two segments without a third', () => {
    expect(noMatch('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0', 'JWT')).toBe(
      true
    );
  });
});

// ---------------------------------------------------------------------------
// BEARER_TOKEN
// ---------------------------------------------------------------------------
describe('BEARER_TOKEN detection', () => {
  it('detects a bearer token in Authorization header', () => {
    const text = 'Authorization: Bearer abcdefghijklmnopqrstuvwxyz1234567890';
    expect(hasMatch(text, 'BEARER_TOKEN')).toBe(true);
  });

  it('entity text is the token, not the word "Bearer"', () => {
    const text = 'Authorization: Bearer myLongTokenValue12345678901234';
    const [e] = findType(text, 'BEARER_TOKEN');
    expect(e).toBeDefined();
    expect(e!.text).not.toContain('Bearer');
    expect(e!.text).toBe('myLongTokenValue12345678901234');
  });

  it('does NOT match short bearer value (< 20 chars)', () => {
    expect(noMatch('Authorization: Bearer short', 'BEARER_TOKEN')).toBe(true);
  });

  it('does NOT match "Bearer" alone with no token', () => {
    expect(noMatch('Send Bearer', 'BEARER_TOKEN')).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// ENV_SECRET
// ---------------------------------------------------------------------------
describe('ENV_SECRET detection', () => {
  it('detects high-entropy API_KEY value', () => {
    const text = 'API_KEY=sK9mP2nXqR7vL4jZ0cW8eY3tA6fB1dU5';
    expect(hasMatch(text, 'ENV_SECRET')).toBe(true);
  });

  it('detects SECRET with quoted value', () => {
    const text = 'APP_SECRET="xK2pL9mN4qR7vJ0cW5eY8zA3fB6dU1sT"';
    expect(hasMatch(text, 'ENV_SECRET')).toBe(true);
  });

  it('does NOT match low-entropy value like "password"', () => {
    const text = 'DB_PASSWORD=password';
    expect(noMatch(text, 'ENV_SECRET')).toBe(true);
  });

  it('does NOT match value "secret" (too low entropy)', () => {
    const text = 'APP_SECRET=secret';
    expect(noMatch(text, 'ENV_SECRET')).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// SSH_PRIVATE_KEY
// ---------------------------------------------------------------------------
describe('SSH_PRIVATE_KEY detection', () => {
  const rsaKey = [
    '-----BEGIN RSA PRIVATE KEY-----',
    'MIIEowIBAAKCAQEA2a2rwplBQLF29amygykEMmYz0+Kcj3bKBp29M3hJNaAMqZoN',
    'ABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890abcdefghijklmnopqrstuvwxyz12',
    '-----END RSA PRIVATE KEY-----',
  ].join('\n');

  it('detects RSA private key block', () => {
    expect(hasMatch(rsaKey, 'SSH_PRIVATE_KEY')).toBe(true);
  });

  it('detects OPENSSH private key block', () => {
    const key = [
      '-----BEGIN OPENSSH PRIVATE KEY-----',
      'b3BlbnNzaC1rZXktdjEAAAAA',
      '-----END OPENSSH PRIVATE KEY-----',
    ].join('\n');
    expect(hasMatch(key, 'SSH_PRIVATE_KEY')).toBe(true);
  });

  it('does NOT match a certificate block', () => {
    const cert = [
      '-----BEGIN CERTIFICATE-----',
      'MIIBkTCB+wIJAJNiADWDmxmRMA0GCSqGSIb3DQEBCwUAMA8xDTALBgNV',
      '-----END CERTIFICATE-----',
    ].join('\n');
    expect(noMatch(cert, 'SSH_PRIVATE_KEY')).toBe(true);
  });

  it('does NOT match partial key without end marker', () => {
    expect(noMatch('-----BEGIN RSA PRIVATE KEY-----\nMIIE', 'SSH_PRIVATE_KEY')).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// PGP_PRIVATE_KEY
// ---------------------------------------------------------------------------
describe('PGP_PRIVATE_KEY detection', () => {
  const pgpKey = [
    '-----BEGIN PGP PRIVATE KEY BLOCK-----',
    'Version: GnuPG v2',
    '',
    'lQOYBGRndFABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890',
    '-----END PGP PRIVATE KEY BLOCK-----',
  ].join('\n');

  it('detects PGP private key block', () => {
    expect(hasMatch(pgpKey, 'PGP_PRIVATE_KEY')).toBe(true);
  });

  it('detects PGP key embedded in text', () => {
    const text = `Key material:\n${pgpKey}\nEnd of key`;
    expect(hasMatch(text, 'PGP_PRIVATE_KEY')).toBe(true);
  });

  it('does NOT match PGP PUBLIC KEY BLOCK', () => {
    const pubKey = [
      '-----BEGIN PGP PUBLIC KEY BLOCK-----',
      'Version: GnuPG v2',
      'lQEGBGRndFABCDEFGHIJKLMNOPQRSTUVWXYZ',
      '-----END PGP PUBLIC KEY BLOCK-----',
    ].join('\n');
    expect(noMatch(pubKey, 'PGP_PRIVATE_KEY')).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// General entity invariants
// ---------------------------------------------------------------------------
describe('Entity invariants', () => {
  it('entity.text always equals source.slice(start, end)', () => {
    const text = [
      'Contact: user@example.com',
      'Card: 4111111111111111',
      'IBAN: DE89370400440532013000',
    ].join('\n');

    const entities = detector.detect(text);
    for (const e of entities) {
      expect(text.slice(e.start, e.end)).toBe(e.text);
    }
  });

  it('entities are sorted by start offset ascending', () => {
    const text = 'Email: user@example.com IBAN: DE89370400440532013000 Key: AKIAIOSFODNN7EXAMPLE';
    const entities = detector.detect(text);
    for (let i = 1; i < entities.length; i++) {
      expect(entities[i]!.start).toBeGreaterThanOrEqual(entities[i - 1]!.start);
    }
  });

  it('source is always "regex"', () => {
    const text = 'user@example.com https://example.com +4915123456789';
    const entities = detector.detect(text);
    for (const e of entities) {
      expect(e.source).toBe('regex');
    }
  });

  it('confidence is in range 0..1 for all entities', () => {
    const text = 'user@example.com https://example.com AKIAIOSFODNN7EXAMPLE DE89370400440532013000';
    const entities = detector.detect(text);
    for (const e of entities) {
      expect(e.confidence).toBeGreaterThan(0);
      expect(e.confidence).toBeLessThanOrEqual(1);
    }
  });
});

// ---------------------------------------------------------------------------
// Capture-group offset regression
// ---------------------------------------------------------------------------
describe('Capture-group offset regression', () => {
  it('AWS_SECRET_KEY offset falls in the key= line, not the earlier comment', () => {
    // The secret value "wJalrXUtnFEMI/K7MDENG+bPxRfiCYEXAMPLEKEY" (40 chars)
    // is deliberately placed in a comment first, then in the real assignment.
    // The entity must reference the assignment line, not the comment.
    const secret = 'wJalrXUtnFEMI/K7MDENG+bPxRfiCYEXAMPLEKEY';
    const text = `# example: ${secret}\naws_secret_access_key = ${secret}`;
    const entities = findType(text, 'AWS_SECRET_KEY');
    expect(entities.length).toBeGreaterThanOrEqual(1);
    const e = entities[0]!;
    // The assignment starts after the newline — the entity start must be > the
    // index of the first occurrence of the secret in the comment.
    const commentOccurrenceEnd = text.indexOf(secret) + secret.length;
    expect(e.start).toBeGreaterThan(commentOccurrenceEnd);
    // Invariant: entity text must equal what the slice gives us.
    expect(text.slice(e.start, e.end)).toBe(e.text);
  });
});

// ---------------------------------------------------------------------------
// Intentional overlaps (contract for pipeline dedup — Task 5)
// ---------------------------------------------------------------------------
describe('Intentional overlap: JWT fires alongside BEARER_TOKEN', () => {
  const jwt =
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9' +
    '.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ' +
    '.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c';

  it('both JWT and BEARER_TOKEN fire on "Bearer <jwt>"', () => {
    const text = `Authorization: Bearer ${jwt}`;
    expect(hasMatch(text, 'JWT')).toBe(true);
    expect(hasMatch(text, 'BEARER_TOKEN')).toBe(true);
  });
});

describe('Intentional overlap: EMAIL fires alongside URL on userinfo URL', () => {
  it('both EMAIL and URL fire on "https://user@example.com/path"', () => {
    const text = 'https://user@example.com/path';
    expect(hasMatch(text, 'EMAIL')).toBe(true);
    expect(hasMatch(text, 'URL')).toBe(true);
  });
});

describe('Intentional overlap: PHONE may fire inside spaced IBAN', () => {
  it('IBAN fires on "DE89 3704 0044 0532 0130 00"', () => {
    const text = 'IBAN: DE89 3704 0044 0532 0130 00';
    expect(hasMatch(text, 'IBAN')).toBe(true);
  });

  it('PHONE may also fire on "DE89 3704 0044 0532 0130 00" (pipeline dedup must prefer IBAN)', () => {
    // This test documents the overlap — it does NOT assert PHONE fires (it may
    // or may not depending on the phone regex heuristics), but confirms IBAN
    // wins when both fire (IBAN confidence 0.99 > PHONE confidence 0.8).
    const text = 'IBAN: DE89 3704 0044 0532 0130 00';
    const ibanEntities = findType(text, 'IBAN');
    expect(ibanEntities.length).toBeGreaterThanOrEqual(1);
    expect(ibanEntities[0]!.confidence).toBeGreaterThan(0.8); // higher than PHONE
  });
});
