/**
 * Network request classification for the self-audit indicator.
 *
 * Redactly never sends your text anywhere — but it does legitimately fetch
 * model weights and assets from CDNs (HuggingFace, jsDelivr, …) when you opt
 * into NER/WebLLM. The audit indicator distinguishes those allowed downloads
 * from anything else, and flags any cross-origin write as a potential data
 * upload (which should always stay at zero). Pure + unit-tested.
 */

/** Hosts the app legitimately downloads models/assets from. */
const MODEL_HOST_SUFFIXES = [
  'huggingface.co',
  'xethub.hf.co',
  'githubusercontent.com',
  'amazonaws.com',
  'jsdelivr.net',
  'unpkg.com',
];

const READ_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

export type RequestKind = 'same-origin' | 'model' | 'other';

export interface RequestInfo {
  host: string;
  kind: RequestKind;
  /** A cross-origin non-read request — the shape a data exfil would take. */
  isUpload: boolean;
}

function hostOf(url: string, origin?: string): { host: string; sameOrigin: boolean } {
  // Relative URL → same origin.
  if (/^[./]/.test(url) || !/^[a-z]+:\/\//i.test(url)) {
    return { host: origin ? safeHost(origin) : '', sameOrigin: true };
  }
  const host = safeHost(url);
  const sameOrigin = origin !== undefined && host === safeHost(origin);
  return { host, sameOrigin };
}

function safeHost(url: string): string {
  try {
    return new URL(url).host;
  } catch {
    return '';
  }
}

/** Classify a single request by URL + method (relative to `origin` if given). */
export function classifyRequest(url: string, method: string, origin?: string): RequestInfo {
  const m = method.toUpperCase();
  const { host, sameOrigin } = hostOf(url, origin);
  if (sameOrigin) {
    return { host, kind: 'same-origin', isUpload: false };
  }
  const isModel = MODEL_HOST_SUFFIXES.some((s) => host === s || host.endsWith(`.${s}`));
  return {
    host,
    kind: isModel ? 'model' : 'other',
    isUpload: !READ_METHODS.has(m),
  };
}
