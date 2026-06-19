/**
 * Password-based encryption for exported mappings.
 *
 * A plain mapping export holds every original value in clear text — it's the
 * key that un-masks placeholders. For users who must move a mapping across
 * machines (or just store it at rest), this wraps the same serialized mapping
 * in an authenticated AES-256-GCM envelope, with the key derived from a
 * passphrase via PBKDF2-SHA-256.
 *
 * Everything runs through the platform WebCrypto (`crypto.subtle`) — no
 * dependencies, no network, works in the browser and in Node ≥ 20.
 */

import { deserializeMapping, serializeMapping, type Mapping } from './masker.js';

const ENC_FORMAT = 'redactly-mapping-encrypted' as const;
const PBKDF2_ITERATIONS = 250_000;
const SALT_BYTES = 16;
const IV_BYTES = 12;

interface EncryptedEnvelope {
  format: typeof ENC_FORMAT;
  version: 1;
  kdf: 'PBKDF2';
  hash: 'SHA-256';
  iterations: number;
  /** base64 */
  salt: string;
  /** base64 */
  iv: string;
  /** base64 — AES-GCM ciphertext of the serialized mapping (incl. auth tag). */
  ciphertext: string;
}

function getSubtle(): SubtleCrypto {
  const subtle = globalThis.crypto?.subtle;
  if (!subtle) {
    throw new Error('WebCrypto ist in dieser Umgebung nicht verfügbar');
  }
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

/** UTF-8 encode into an ArrayBuffer-backed view (WebCrypto wants BufferSource). */
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

/** Encrypt a mapping with a passphrase, returning a JSON envelope string. */
export async function encryptMapping(mapping: Mapping, password: string): Promise<string> {
  if (!password) throw new Error('Passwort erforderlich');
  const subtle = getSubtle();
  const plaintext = encodeUtf8(serializeMapping(mapping));
  const salt = globalThis.crypto.getRandomValues(new Uint8Array(SALT_BYTES));
  const iv = globalThis.crypto.getRandomValues(new Uint8Array(IV_BYTES));
  const key = await deriveKey(password, salt, PBKDF2_ITERATIONS);
  const ct = await subtle.encrypt({ name: 'AES-GCM', iv }, key, plaintext);
  const envelope: EncryptedEnvelope = {
    format: ENC_FORMAT,
    version: 1,
    kdf: 'PBKDF2',
    hash: 'SHA-256',
    iterations: PBKDF2_ITERATIONS,
    salt: toBase64(salt),
    iv: toBase64(iv),
    ciphertext: toBase64(new Uint8Array(ct)),
  };
  return JSON.stringify(envelope, null, 2);
}

/** True if `json` looks like an encrypted Redactly mapping envelope. */
export function isEncryptedMapping(json: string): boolean {
  try {
    const obj = JSON.parse(json) as Partial<EncryptedEnvelope> | null;
    return !!obj && obj.format === ENC_FORMAT;
  } catch {
    return false;
  }
}

/** Decrypt a JSON envelope back into a Mapping. Throws on wrong password. */
export async function decryptMapping(json: string, password: string): Promise<Mapping> {
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch {
    throw new Error('Datei ist kein gültiges JSON');
  }
  const obj = parsed as Partial<EncryptedEnvelope> | null;
  if (
    !obj ||
    obj.format !== ENC_FORMAT ||
    typeof obj.salt !== 'string' ||
    typeof obj.iv !== 'string' ||
    typeof obj.ciphertext !== 'string'
  ) {
    throw new Error('Keine verschlüsselte Redactly-Mapping-Datei');
  }
  const iterations = typeof obj.iterations === 'number' ? obj.iterations : PBKDF2_ITERATIONS;
  const salt = fromBase64(obj.salt);
  const iv = fromBase64(obj.iv);
  const ciphertext = fromBase64(obj.ciphertext);
  const key = await deriveKey(password, salt, iterations);

  let plainBuf: ArrayBuffer;
  try {
    plainBuf = await getSubtle().decrypt({ name: 'AES-GCM', iv }, key, ciphertext);
  } catch {
    // GCM auth failure is indistinguishable from a wrong passphrase by design.
    throw new Error('Falsches Passwort oder beschädigte Datei');
  }
  return deserializeMapping(new TextDecoder().decode(plainBuf));
}
