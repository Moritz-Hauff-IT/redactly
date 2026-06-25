/**
 * Generic password-based encryption box for arbitrary strings.
 *
 * A small WebCrypto AES-256-GCM envelope (key derived via PBKDF2-SHA-256),
 * used for opt-in encrypted session persistence. Same primitives as the
 * mapping export, kept separate so each has its own stable wire format.
 * Runs entirely on the platform `crypto.subtle` — no deps, no network.
 */

const BOX_FORMAT = 'redactly-box' as const;
const PBKDF2_ITERATIONS = 250_000;
const SALT_BYTES = 16;
const IV_BYTES = 12;

interface BoxEnvelope {
  format: typeof BOX_FORMAT;
  version: 1;
  iterations: number;
  salt: string;
  iv: string;
  ciphertext: string;
}

function getSubtle(): SubtleCrypto {
  const subtle = globalThis.crypto?.subtle;
  if (!subtle) throw new Error('WebCrypto ist in dieser Umgebung nicht verfügbar');
  return subtle;
}

function toBase64(bytes: Uint8Array): string {
  let bin = '';
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i] as number);
  return btoa(bin);
}

function fromBase64(b64: string): Uint8Array<ArrayBuffer> {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

function encodeUtf8(s: string): Uint8Array<ArrayBuffer> {
  const enc = new TextEncoder().encode(s);
  const out = new Uint8Array(enc.length);
  out.set(enc);
  return out;
}

async function deriveKey(
  password: string,
  salt: Uint8Array<ArrayBuffer>,
  iterations: number
): Promise<CryptoKey> {
  const subtle = getSubtle();
  const baseKey = await subtle.importKey('raw', encodeUtf8(password), 'PBKDF2', false, [
    'deriveKey',
  ]);
  return subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations, hash: 'SHA-256' },
    baseKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

/** Encrypt a string with a passphrase, returning a JSON envelope. */
export async function sealBox(plaintext: string, password: string): Promise<string> {
  if (!password) throw new Error('Passwort erforderlich');
  const subtle = getSubtle();
  const salt = globalThis.crypto.getRandomValues(new Uint8Array(SALT_BYTES));
  const iv = globalThis.crypto.getRandomValues(new Uint8Array(IV_BYTES));
  const key = await deriveKey(password, salt, PBKDF2_ITERATIONS);
  const ct = await subtle.encrypt({ name: 'AES-GCM', iv }, key, encodeUtf8(plaintext));
  const envelope: BoxEnvelope = {
    format: BOX_FORMAT,
    version: 1,
    iterations: PBKDF2_ITERATIONS,
    salt: toBase64(salt),
    iv: toBase64(iv),
    ciphertext: toBase64(new Uint8Array(ct)),
  };
  return JSON.stringify(envelope);
}

/** Decrypt a JSON envelope back into the original string. Throws on bad pw. */
export async function openBox(json: string, password: string): Promise<string> {
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch {
    throw new Error('Beschädigte Sitzungsdaten');
  }
  const obj = parsed as Partial<BoxEnvelope> | null;
  if (
    !obj ||
    obj.format !== BOX_FORMAT ||
    typeof obj.salt !== 'string' ||
    typeof obj.iv !== 'string' ||
    typeof obj.ciphertext !== 'string'
  ) {
    throw new Error('Keine gültige verschlüsselte Sitzung');
  }
  const iterations = typeof obj.iterations === 'number' ? obj.iterations : PBKDF2_ITERATIONS;
  const key = await deriveKey(password, fromBase64(obj.salt), iterations);
  let plainBuf: ArrayBuffer;
  try {
    plainBuf = await getSubtle().decrypt(
      { name: 'AES-GCM', iv: fromBase64(obj.iv) },
      key,
      fromBase64(obj.ciphertext)
    );
  } catch {
    throw new Error('Falsches Passwort oder beschädigte Daten');
  }
  return new TextDecoder().decode(plainBuf);
}
