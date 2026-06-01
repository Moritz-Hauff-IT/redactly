/**
 * Targeted cleanup of cached ML model weights.
 *
 * The browser-wide "Clear site data" button (the workaround we currently
 * recommend on Quota-exceeded) wipes everything for the origin, including
 * localStorage — so user settings (NER on/off, language, WebLLM toggles)
 * reset to defaults too. That surprised users.
 *
 * This module clears ONLY the heavy ML caches:
 *   - WebLLM IndexedDB DBs (model_cache / webllm-cache / etc.)
 *   - Cache API entries that look like model assets (HuggingFace + MLC URLs,
 *     ONNX/WASM files, tesseract traineddata, …).
 *
 * localStorage is left untouched. Service Workers, IndexedDB DBs unrelated
 * to ML, and the SvelteKit chunk cache are also left alone.
 */

interface CleanupResult {
  /** IndexedDB databases dropped. */
  databases: string[];
  /** Cache API entries dropped (origin-relative). */
  cacheEntries: number;
  /** Bytes recovered, as reported by storage.estimate() before/after. */
  bytesRecovered: number | null;
}

// IndexedDB DB names we delete. Compiled from the MLC / transformers.js /
// onnxruntime conventions we've seen in the wild; harmless to attempt-delete
// a DB that doesn't exist.
const MODEL_DB_PATTERNS = [
  /^webllm/i,
  /model[-_]?cache/i,
  /transformers/i,
  /onnxruntime/i,
  /huggingface/i,
  /mlc/i,
];

// Cache-API request URL patterns we consider "model assets". Anything else
// (the SvelteKit immutable bundle, fonts, …) stays cached so a reload after
// cleanup doesn't redownload the whole app.
const MODEL_URL_PATTERNS = [
  /huggingface\.co/i,
  /cdn-lfs(?:-us-1)?\.huggingface\.co/i,
  /cas-bridge\.xethub\.hf\.co/i,
  /\.onnx(?:\.gz)?$/i,
  /\.wasm$/i,
  /\.traineddata(?:\.gz)?$/i,
  /\.safetensors$/i,
  /\.bin$/i,
  /raw\.githubusercontent\.com/i,
];

function looksLikeModelDb(name: string): boolean {
  return MODEL_DB_PATTERNS.some((re) => re.test(name));
}

function looksLikeModelUrl(url: string): boolean {
  return MODEL_URL_PATTERNS.some((re) => re.test(url));
}

async function deleteDb(name: string): Promise<boolean> {
  return new Promise((resolve) => {
    const req = indexedDB.deleteDatabase(name);
    req.onsuccess = () => resolve(true);
    req.onerror = () => resolve(false);
    req.onblocked = () => {
      // Another tab still has the DB open. Resolve false so caller knows
      // — they'll see a smaller bytesRecovered and can re-run.
      resolve(false);
    };
  });
}

async function estimateBytes(): Promise<number | null> {
  if (!navigator.storage?.estimate) return null;
  try {
    const { usage } = await navigator.storage.estimate();
    return usage ?? null;
  } catch {
    return null;
  }
}

/**
 * Drop every cached ML model from the browser. Returns a summary of what
 * was actually freed. Safe to call when nothing is cached — returns zeros.
 */
export async function clearModelCaches(): Promise<CleanupResult> {
  const result: CleanupResult = {
    databases: [],
    cacheEntries: 0,
    bytesRecovered: null,
  };

  const before = await estimateBytes();

  // ── IndexedDB ────────────────────────────────────────────────────────────
  if (typeof indexedDB !== 'undefined' && indexedDB.databases) {
    try {
      const all = await indexedDB.databases();
      for (const info of all) {
        if (!info.name) continue;
        if (!looksLikeModelDb(info.name)) continue;
        const ok = await deleteDb(info.name);
        if (ok) result.databases.push(info.name);
      }
    } catch (err) {
      console.warn('[modelCacheCleanup] IndexedDB enumeration failed', err);
    }
  }

  // ── Cache API ────────────────────────────────────────────────────────────
  if (typeof caches !== 'undefined') {
    try {
      const cacheNames = await caches.keys();
      for (const name of cacheNames) {
        const cache = await caches.open(name);
        const requests = await cache.keys();
        for (const req of requests) {
          if (looksLikeModelUrl(req.url)) {
            const ok = await cache.delete(req);
            if (ok) result.cacheEntries++;
          }
        }
      }
    } catch (err) {
      console.warn('[modelCacheCleanup] Cache API cleanup failed', err);
    }
  }

  const after = await estimateBytes();
  if (before !== null && after !== null) {
    result.bytesRecovered = Math.max(0, before - after);
  }

  return result;
}
