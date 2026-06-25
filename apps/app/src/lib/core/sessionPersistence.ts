/**
 * Opt-in encrypted session persistence.
 *
 * By default Redactly persists nothing — a refresh loses your work. This lets
 * the user explicitly save the current session (input text, detected entities,
 * mapping) encrypted with a passphrase into IndexedDB, and restore it after a
 * reload. Encryption is the WebCrypto AES-GCM box from core; the passphrase is
 * never stored. A single slot is kept; saving again overwrites it.
 */

import { sealBox, openBox } from '@redactly/core/cryptoBox';
import { createMapping } from '@redactly/core/masker';
import type { Entity } from '@redactly/core/types';
import { inputStore } from '../stores/inputStore.svelte.js';
import { detectionStore } from '../stores/detectionStore.svelte.js';
import { mappingStore } from '../stores/mappingStore.svelte.js';

const DB_NAME = 'redactly-session';
const STORE = 'kv';
const KEY = 'session';

interface SessionPayload {
  input: string;
  entities: Entity[];
  enabled: string[];
  mapping: [string, string][];
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error('IndexedDB öffnen fehlgeschlagen'));
  });
}

function idbRequest<T>(
  mode: IDBTransactionMode,
  fn: (s: IDBObjectStore) => IDBRequest
): Promise<T> {
  return openDb().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const tx = db.transaction(STORE, mode);
        const req = fn(tx.objectStore(STORE));
        req.onsuccess = () => resolve(req.result as T);
        req.onerror = () => reject(req.error ?? new Error('IndexedDB-Fehler'));
        tx.oncomplete = () => db.close();
      })
  );
}

const idbGet = () => idbRequest<string | undefined>('readonly', (s) => s.get(KEY));
const idbSet = (v: string) => idbRequest<IDBValidKey>('readwrite', (s) => s.put(v, KEY));
const idbDel = () => idbRequest<undefined>('readwrite', (s) => s.delete(KEY));

function stripId(e: Entity & { id?: string }): Entity {
  const { id: _omit, ...rest } = e;
  return rest;
}

/** Encrypt and store the current workspace state. */
export async function saveSession(password: string): Promise<void> {
  const payload: SessionPayload = {
    input: inputStore.text,
    entities: detectionStore.entities.map(stripId),
    enabled: [...detectionStore.enabledIds],
    mapping: mappingStore.current ? [...mappingStore.current.forward] : [],
  };
  await idbSet(await sealBox(JSON.stringify(payload), password));
}

/** True if an encrypted session is stored. */
export async function hasSavedSession(): Promise<boolean> {
  try {
    return (await idbGet()) != null;
  } catch {
    return false;
  }
}

/** Decrypt and apply the stored session to the workspace stores. */
export async function restoreSession(password: string): Promise<void> {
  const blob = await idbGet();
  if (!blob) throw new Error('Keine gespeicherte Sitzung');
  const payload = JSON.parse(await openBox(blob, password)) as SessionPayload;

  inputStore.set({ text: payload.input, filename: null, format: 'txt', bytes: 0, rawBytes: null });
  detectionStore.restore(payload.entities ?? [], payload.enabled ?? []);
  if (payload.mapping?.length) {
    const m = createMapping();
    for (const [placeholder, original] of payload.mapping) {
      m.forward.set(placeholder, original);
      if (!m.reverse.has(original)) m.reverse.set(original, placeholder);
    }
    mappingStore.set(m);
  }
}

/** Delete the stored session. */
export async function clearSession(): Promise<void> {
  try {
    await idbDel();
  } catch {
    // best-effort
  }
}
