/**
 * Intentional pattern overlaps — pipeline dedup (Task 5) must handle these:
 *
 * JWT vs BEARER_TOKEN:
 *   `JWT` is a more specific pattern than `BEARER_TOKEN`. When the value of a
 *   Bearer token is a well-formed JWT, both rules will fire. Pipeline dedup
 *   should suppress BEARER_TOKEN whenever its span is fully contained within a
 *   JWT span (prefer the higher-specificity match).
 *
 * PHONE inside spaced IBAN:
 *   A spaced IBAN like "DE89 3704 0044 0532 0130 00" can cause PHONE to fire
 *   on a subsequence of digits that looks like a local phone number. Pipeline
 *   dedup should prefer higher-confidence financial entities (IBAN, CREDIT_CARD)
 *   over PHONE when the spans overlap.
 *
 * EMAIL inside URL:
 *   A URL with userinfo such as "https://user@example.com/path" will trigger
 *   both URL and EMAIL. Pipeline dedup should prefer URL (larger, more specific
 *   span) over EMAIL when fully contained.
 */
import { shannonEntropy } from '../validators.js';
import type { RegexRule } from './contact.js';

export const secretRules: RegexRule[] = [
  {
    type: 'AWS_ACCESS_KEY',
    category: 'secret',
    // AKIA, ASIA, AGPA, AROA, AIPA, ANPA, ANVA, APKA prefixes + 16 uppercase alphanumeric chars
    pattern: /\b(?:AKIA|ASIA|AGPA|AROA|AIPA|ANPA|ANVA|APKA)[0-9A-Z]{16}\b/g,
    confidence: 0.97,
  },
  {
    type: 'AWS_SECRET_KEY',
    category: 'secret',
    // 40-char base64-ish string following an aws_secret_access_key context
    pattern: /(?:aws_secret_access_key|AWS_SECRET_ACCESS_KEY)\s*[:=]\s*([A-Za-z0-9/+]{40})/g,
    confidence: 0.97,
    // capture group 1 is the actual secret — handled by specialized extraction in regex.ts
  },
  {
    type: 'GCP_KEY',
    category: 'secret',
    // Match the private_key value in a GCP service account JSON
    pattern:
      /"private_key"\s*:\s*"(-----BEGIN [A-Z ]+-----(?:\\n|[\s\S])*?-----END [A-Z ]+-----(?:\\n)?)"/g,
    confidence: 0.97,
  },
  {
    type: 'AZURE_KEY',
    category: 'secret',
    // Azure storage account key: 88-char base64 following AccountKey=
    pattern: /AccountKey=([A-Za-z0-9+/]{86}==)/g,
    confidence: 0.97,
  },
  {
    type: 'GITHUB_TOKEN',
    category: 'secret',
    // GitHub personal access tokens, OAuth tokens, server tokens, etc.
    pattern: /\bgh[pousr]_[A-Za-z0-9]{36,}\b/g,
    confidence: 0.97,
  },
  {
    type: 'SLACK_TOKEN',
    category: 'secret',
    // xoxb = bot, xoxa = app, xoxp = user, xoxr = refresh, xoxs = socket
    pattern: /\bxox[baprs]-\d+-\d+-\d+-[a-f0-9]+\b/g,
    confidence: 0.97,
  },
  {
    type: 'STRIPE_KEY',
    category: 'secret',
    // sk_, pk_, rk_ in test or live mode
    pattern: /\b(?:sk|pk|rk)_(?:test|live)_[A-Za-z0-9]{24,}\b/g,
    confidence: 0.97,
  },
  {
    type: 'OPENAI_KEY',
    category: 'secret',
    // OpenAI API keys: sk- optionally followed by proj-
    pattern: /\bsk-(?:proj-)?[A-Za-z0-9\-_]{20,}\b/g,
    confidence: 0.95,
  },
  {
    type: 'ANTHROPIC_KEY',
    category: 'secret',
    // Anthropic API keys: sk-ant- optionally followed by api03-
    pattern: /\bsk-ant-(?:api03-)?[A-Za-z0-9\-_]{30,}\b/g,
    confidence: 0.97,
  },
  {
    type: 'JWT',
    category: 'secret',
    // Three base64url segments separated by dots — header starts with eyJ
    pattern: /\beyJ[A-Za-z0-9_-]+\.eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/g,
    confidence: 0.95,
  },
  {
    type: 'SSH_PRIVATE_KEY',
    category: 'secret',
    // PEM-encoded SSH private keys
    pattern:
      /-----BEGIN (?:RSA|OPENSSH|DSA|EC) PRIVATE KEY-----[\s\S]+?-----END (?:RSA|OPENSSH|DSA|EC) PRIVATE KEY-----/g,
    confidence: 0.99,
  },
  {
    type: 'PGP_PRIVATE_KEY',
    category: 'secret',
    // PGP/GPG private key blocks
    pattern: /-----BEGIN PGP PRIVATE KEY BLOCK-----[\s\S]+?-----END PGP PRIVATE KEY BLOCK-----/g,
    confidence: 0.99,
  },
  {
    type: 'BEARER_TOKEN',
    category: 'secret',
    // Match the token portion only (not the word "Bearer")
    // Uses a lookbehind for "Bearer " so the entity is the token itself
    pattern: /(?<=Bearer\s+)[A-Za-z0-9._\-+/=]{20,}/g,
    confidence: 0.85,
  },
  {
    type: 'ENV_SECRET',
    category: 'secret',
    // .env-style: VAR_NAME_KEY/SECRET/TOKEN/etc = value at line boundary
    // Captures the value portion; apply entropy threshold in validate
    pattern:
      /(?:^|(?<=\n))[A-Z][A-Z0-9_]*_(?:KEY|SECRET|TOKEN|PASSWORD|PASS|PWD|API_KEY)\s*=\s*([^\s"'][^\s]*|"[^"]*"|'[^']*')/gm,
    confidence: 0.75,
    validate: (value) => {
      // validate receives the entity text, which is the captured VALUE portion
      // (group 1 of the pattern — already extracted by the detector).
      // Strip surrounding quotes if present before measuring entropy.
      let v = value.trim();
      if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
        v = v.slice(1, -1);
      }
      return shannonEntropy(v) >= 3.5;
    },
  },
];
