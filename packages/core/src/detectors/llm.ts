/**
 * WebLlmDetector — wraps @mlc-ai/web-llm for in-browser LLM-powered PII detection.
 *
 * Design decisions:
 * - Lazy load: the engine is only initialized on first detect() or ready() call.
 * - The engine factory is injectable so tests can mock without real model.
 * - WebGPU required: check via WebLlmDetector.isSupported() before enabling.
 * - Persistence: WebLLM automatically stores model weights in IndexedDB via Cache API.
 */
import type { Detector, Entity, EntityType, EntityCategory } from '../types.js';

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export interface WebLlmModelInfo {
  /** MLC model id, e.g. 'Llama-3.2-3B-Instruct-q4f16_1-MLC' */
  id: string;
  /** Display name: 'Llama 3.2 3B (q4f16)' */
  label: string;
  /** Approximate download size in MB */
  sizeMB: number;
  /** Approximate VRAM required in MB */
  vramMB: number;
  /** User-facing description in German */
  description: string;
  /** Tier recommendation */
  recommendedFor: 'fast' | 'balanced' | 'best';
}

export const SUPPORTED_WEBLLM_MODELS: WebLlmModelInfo[] = [
  {
    id: 'Llama-3.2-3B-Instruct-q4f16_1-MLC',
    label: 'Llama 3.2 3B — empfohlen',
    sizeMB: 1700,
    vramMB: 3500,
    description:
      'Standardwahl. Guter Trade-off zwischen Genauigkeit und Geschwindigkeit. Läuft auf modernen Laptops mit 8+ GB RAM, typische Antwort 15-45 Sek.',
    recommendedFor: 'balanced',
  },
  {
    id: 'Phi-3.5-mini-instruct-q4f16_1-MLC',
    label: 'Phi-3.5 Mini',
    sizeMB: 2200,
    vramMB: 4000,
    description:
      'Microsofts Modell, besonders stark bei strukturierten Aufgaben wie Entitäts-Extraktion. Langsamer als Llama 3B, aber präziser bei seltenen PII-Mustern.',
    recommendedFor: 'best',
  },
  {
    id: 'Llama-3.2-1B-Instruct-q4f16_1-MLC',
    label: 'Llama 3.2 1B — nur für schwache Geräte',
    sizeMB: 700,
    vramMB: 1500,
    description:
      'Schnell und kompakt, aber Recall fällt auf 60-70%. Nur empfohlen wenn 8+ GB RAM nicht verfügbar sind oder die Geschwindigkeit kritisch ist.',
    recommendedFor: 'fast',
  },
];

export interface WebLlmOptions {
  /** One of SUPPORTED_WEBLLM_MODELS[].id */
  modelId: string;
  /** Minimum confidence to emit an entity. Default 0.6. */
  minConfidence?: number;
  /** Called during model initialization with progress information. */
  onProgress?: (event: WebLlmProgressEvent) => void;
  /**
   * Called per chunk during detect() so the UI can show
   * "LLM Chunk 3/5" progress. Fires with (current, total) on each chunk
   * START. Caller is responsible for clearing the UI after detect()
   * resolves — the detector doesn't fire a synthetic "done" event.
   */
  onChunkProgress?: (current: number, total: number) => void;
  /**
   * Run the LLM N times per chunk and take the union of detected entities.
   * Trades latency for recall — small models are stochastic, a second pass
   * often catches what the first missed. Default 1 (single pass).
   */
  selfConsistencyPasses?: number;
  /**
   * Per-request timeout in ms. Default 180_000 (3 min) — sized for small
   * in-browser models on consumer WebGPU. Raise it for slow devices, lower
   * it when fronting a fast LLM server.
   */
  requestTimeoutMs?: number;
  /**
   * Max characters per LLM call. Default 1500 — small in-browser models lose
   * track past ~2 KB context. A server-hosted model handles much larger
   * windows (e.g. 6000) with fewer round-trips.
   */
  chunkSize?: number;
  /** Overlap between chunks so boundary entities are seen in at least one
   * window. Default 200. Clamped to chunkSize - 1. */
  chunkOverlap?: number;
  /** Response token budget per call. Default 800. */
  maxTokens?: number;
  /**
   * Called when one or more chunks failed (engine unreachable, timeout, …).
   * detect() still resolves with the entities from the successful chunks —
   * this callback is the UI's chance to warn that coverage is partial.
   */
  onError?: (info: { failedChunks: number; totalChunks: number; message: string }) => void;
  /** Verbose console logging during detect — surfaces raw response, parse
   * results, and per-rule drops. Off by default. */
  debug?: boolean;
  /**
   * @internal — injectable engine factory for testing.
   * Do not rely on this in production code.
   */
  _engineFactory?: EngineFactory;
}

export type WebLlmProgressEvent =
  | { status: 'init'; message: string }
  | {
      status: 'download';
      progress: number;
      loaded: number;
      total: number;
      file?: string;
      message: string;
    }
  | { status: 'ready' }
  | { status: 'error'; error: string };

// ---------------------------------------------------------------------------
// Internal types
// ---------------------------------------------------------------------------

/** Minimal interface for the MLC engine we need. */
interface MLCEngine {
  chat: {
    completions: {
      create(params: {
        messages: Array<{ role: string; content: string }>;
        response_format?: { type: string };
        max_tokens?: number;
        temperature?: number;
        stop?: string | string[];
      }): Promise<{
        choices: Array<{
          message: {
            content: string | null;
          };
        }>;
      }>;
    };
  };
  unload(): Promise<void>;
}

type InitProgressCallback = (report: {
  progress: number;
  timeElapsed: number;
  text: string;
}) => void;

type EngineFactory = (
  modelId: string,
  opts: { initProgressCallback: InitProgressCallback }
) => Promise<MLCEngine>;

// ---------------------------------------------------------------------------
// Label → EntityType / EntityCategory mapping
// ---------------------------------------------------------------------------

type LabelMapping = { type: EntityType; category: EntityCategory };

/**
 * Accepts both the canonical prompt types AND the label variants small
 * models drift into (BANK for ORG, KENNZEICHEN for PLATE, SVNR for SSN, …).
 * Tolerant mapping costs nothing and rescues otherwise-valid detections.
 */
function mapLlmLabel(label: string): LabelMapping | null {
  switch (label.toUpperCase()) {
    case 'PERSON':
    case 'NAME':
    case 'GIVENNAME':
    case 'SURNAME':
      return { type: 'PERSON', category: 'person' };
    case 'ORG':
    case 'ORGANIZATION':
    case 'COMPANY':
    case 'BANK':
      return { type: 'ORG', category: 'organization' };
    case 'LOCATION':
    case 'ADDRESS':
    case 'STREET':
    case 'CITY':
    case 'ZIP':
    case 'POSTCODE':
      return { type: 'LOCATION', category: 'address' };
    case 'GEO':
    case 'COORDINATES':
    case 'COORDINATE':
    case 'GPS':
    case 'LATLON':
    case 'WHAT3WORDS':
    case 'PLUSCODE':
      return { type: 'GEO', category: 'address' };
    case 'EMAIL':
      return { type: 'EMAIL', category: 'contact' };
    case 'PHONE':
      return { type: 'PHONE', category: 'contact' };
    case 'IP':
      return { type: 'IP', category: 'contact' };
    case 'DATE':
    case 'DOB':
    case 'BIRTHDATE':
      return { type: 'DATE', category: 'identity' };
    case 'PASSPORT':
      return { type: 'CH_PASSPORT', category: 'identity' };
    case 'ID':
    case 'IDCARD':
    case 'PERSONALAUSWEIS':
      return { type: 'DE_PERSONALAUSWEIS', category: 'identity' };
    case 'SSN':
    case 'SOCIAL':
    case 'SOCIALNUMBER':
    case 'SVNR':
      return { type: 'SOCIAL_SECURITY', category: 'identity' };
    case 'VIN':
      return { type: 'VIN', category: 'identity' };
    case 'MAC':
      return { type: 'MAC', category: 'identity' };
    case 'SERIAL':
      return { type: 'SERIAL', category: 'identity' };
    case 'PLATE':
    case 'LICENSE_PLATE':
    case 'KENNZEICHEN':
      return { type: 'LICENSE_PLATE', category: 'identity' };
    case 'CUSTOMERID':
    case 'ORDERID':
    case 'BOOKING':
    case 'REF':
    case 'REFERENCE':
      return { type: 'INTERNAL_REF', category: 'identity' };
    case 'EMPLOYEE':
    case 'EMPLOYEE_ID':
    case 'EMPLOYEEID':
    case 'PERSONALNUMMER':
    case 'PERSONALNR':
    case 'STAFF_ID':
      return { type: 'EMPLOYEE_ID', category: 'identity' };
    case 'VAT':
    case 'VAT_ID':
    case 'VATID':
    case 'UST':
    case 'UST_IDNR':
    case 'UID':
      return { type: 'VAT_ID', category: 'financial' };
    case 'IBAN':
    case 'FINANCIAL':
    case 'ACCOUNT':
      return { type: 'IBAN', category: 'financial' };
    case 'BIC':
      return { type: 'BIC', category: 'financial' };
    case 'CREDIT_CARD':
    case 'CARD':
    case 'CREDITCARD':
      return { type: 'CREDIT_CARD', category: 'financial' };
    case 'TAX':
    case 'TAX_ID':
    case 'TAXNUM':
      return { type: 'TAX_ID_DE', category: 'financial' };
    case 'SECRET':
      return { type: 'GENERIC_SECRET', category: 'secret' };
    case 'OTHER':
    case 'OTHER_PII':
    case 'MISC':
    case 'SONSTIGES':
      return { type: 'OTHER_PII', category: 'other' };
    default:
      return null;
  }
}

/**
 * Words that, on their own, never constitute PII: greeting/closing vocab,
 * field labels, role accounts, function words (DE + EN). Small models love
 * returning "Mit freundlichen Grüßen" or "Kundennummer" as entities — when
 * every word of a candidate is in this set, it's dropped.
 */
const TRIVIAL_WORDS = new Set([
  'der',
  'die',
  'das',
  'den',
  'dem',
  'des',
  'ein',
  'eine',
  'einer',
  'einem',
  'einen',
  'und',
  'oder',
  'bei',
  'mit',
  'für',
  'von',
  'vom',
  'zu',
  'zur',
  'zum',
  'auf',
  'an',
  'in',
  'im',
  'am',
  'als',
  'wie',
  'auch',
  'nur',
  'noch',
  'sehr',
  'bitte',
  'danke',
  'ja',
  'nein',
  'ist',
  'sind',
  'war',
  'wird',
  'wurde',
  'werden',
  'haben',
  'hat',
  'hier',
  'dort',
  'dann',
  'wenn',
  'weil',
  'dass',
  'ob',
  'aber',
  'sie',
  'ihr',
  'ihre',
  'ihrer',
  'unser',
  'unsere',
  'mein',
  'meine',
  'name',
  'vorname',
  'nachname',
  'firma',
  'adresse',
  'anschrift',
  'rechnungsadresse',
  'lieferadresse',
  'kontakt',
  'kontaktdaten',
  'telefon',
  'tel',
  'mobil',
  'fax',
  'email',
  'mail',
  'iban',
  'bic',
  'bank',
  'konto',
  'kontoinhaber',
  'kundennummer',
  'kundennr',
  'mitgliedsnummer',
  'betreff',
  'datum',
  'geburtsdatum',
  'nummer',
  'nr',
  'referenz',
  'vorgang',
  'buchung',
  'bestellung',
  'rückfragen',
  'überweisen',
  'überweisung',
  'vertrag',
  'gruß',
  'gruss',
  'grüße',
  'grüsse',
  'grüßen',
  'grüssen',
  'freundlich',
  'freundliche',
  'freundlichen',
  'freundlichem',
  'herzlich',
  'herzliche',
  'herzlichen',
  'beste',
  'besten',
  'liebe',
  'lieber',
  'liebem',
  'lieben',
  'viele',
  'vielen',
  'geehrte',
  'geehrter',
  'geehrten',
  'damen',
  'herren',
  'herr',
  'frau',
  'hallo',
  'guten',
  'tag',
  'morgen',
  'abend',
  'team',
  'hochachtungsvoll',
  'mfg',
  'lg',
  'vg',
  'verbleibe',
  'support',
  'pannenhilfe',
  'catering',
  'service',
  'hotline',
  'kundenservice',
  'kundendienst',
  'vertrieb',
  'empfang',
  'rezeption',
  'buchhaltung',
  'sekretariat',
  'info',
  'redaktion',
  'marketing',
  'personal',
  'einkauf',
  'lager',
  'technik',
  'verwaltung',
  'zentrale',
  'abteilung',
  'büro',
  'filiale',
  'helpdesk',
  'helpline',
  'reisebuero',
  'reisebüro',
  'schadenteam',
  'fuhrpark',
  'sales',
  'billing',
  'admin',
  'help',
  'desk',
  'staff',
  'the',
  'a',
  'an',
  'and',
  'or',
  'to',
  'for',
  'of',
  'with',
  'at',
  'on',
  'please',
  'thank',
  'thanks',
  'you',
  'yes',
  'no',
  'is',
  'are',
  'was',
  'will',
  'first',
  'last',
  'company',
  'address',
  'contact',
  'phone',
  'account',
  'number',
  'customer',
  'member',
  'subject',
  'date',
  'regards',
  'best',
  'kind',
  'warm',
  'warmest',
  'sincerely',
  'yours',
  'faithfully',
  'dear',
  'hello',
  'hi',
  'cheers',
  'transfer',
  'reference',
  'wishes',
  'take',
  'care',
  'greetings',
]);

/** True when the candidate contains no digits/@ and every word is trivial. */
function isTrivialNonEntity(candidate: string): boolean {
  const trimmed = candidate.trim();
  if (!trimmed) return true;
  // Digits or @ signal a real value (phone, ref, email) — keep those.
  if (/[\d@]/.test(trimmed)) return false;
  const words = trimmed
    .toLowerCase()
    .split(/[^a-zäöüß]+/i)
    .filter(Boolean);
  if (words.length === 0) return false;
  return words.every((w) => TRIVIAL_WORDS.has(w));
}

/**
 * Detects chunks that are predominantly one unbroken token run (base64
 * blobs, minified bundles, data URIs). The LLM can't find prose PII in
 * those and burns its whole token budget trying — skip them. Regex + NER
 * still scan the full text, so keys/IBANs inside blobs are not lost.
 */
export function isLikelyBinaryChunk(chunk: string): boolean {
  if (chunk.length < 500) return false;
  let longestRun = 0;
  let run = 0;
  for (let i = 0; i < chunk.length; i++) {
    const c = chunk.charCodeAt(i);
    if (c === 32 || c === 9 || c === 10 || c === 13) {
      run = 0;
    } else {
      run++;
      if (run > longestRun) longestRun = run;
    }
  }
  return longestRun >= 500;
}

// ---------------------------------------------------------------------------
// Default engine factory (uses real @mlc-ai/web-llm)
// ---------------------------------------------------------------------------

async function defaultEngineFactory(
  modelId: string,
  opts: { initProgressCallback: InitProgressCallback }
): Promise<MLCEngine> {
  // Dynamic import keeps this side-effect-free at module load time
  const webllm = await import('@mlc-ai/web-llm');
  const engine = await webllm.CreateMLCEngine(modelId, {
    initProgressCallback: opts.initProgressCallback,
  });
  return engine as unknown as MLCEngine;
}

// ---------------------------------------------------------------------------
// Prompt construction
// ---------------------------------------------------------------------------

function buildPrompt(text: string, priorEntities?: readonly Entity[]): string {
  // If faster detectors already found some entities, mention them so the
  // LLM focuses on what's MISSING rather than re-finding the same names.
  // Trimmed to a max of 20 to keep the prompt short; we dedup by text so
  // we don't list the same name three times because regex matched it
  // three places in the document.
  let hintSection = '';
  if (priorEntities && priorEntities.length > 0) {
    const seen = new Set<string>();
    const unique: string[] = [];
    for (const e of priorEntities) {
      const key = `${e.type}:${e.text}`;
      if (seen.has(key)) continue;
      seen.add(key);
      unique.push(`${e.text} (${e.type})`);
      if (unique.length >= 20) break;
    }
    hintSection = `\nBereits gefunden (von schnelleren Detektoren) — diese müssen nicht erneut gemeldet werden, suche stattdessen NACH WEITEREN Treffern die hier fehlen, besonders in Signaturen, freien Mentions und nach Grußformeln:\n${unique.map((s) => `- ${s}`).join('\n')}\n`;
  }
  return _buildPromptBody(text, hintSection);
}

function _buildPromptBody(text: string, hintSection: string): string {
  // Schema-only prompt. A previous few-shot version backfired catastrophically:
  // small models hallucinated entities directly out of the example (e.g.
  // "Berliner Str. 5, 10115 Berlin" appearing as a detected entity even
  // though it was only in the prompt). The hallucinations still cost output
  // tokens and were later dropped by the source-text filter — pure waste.
  //
  // Strong "WÖRTLICH aus dem Text" instruction + clear textual fence (XML-style
  // <text> tags) helps small models distinguish instructions from input data.
  return `Du bist ein PII-Extraktor für deutsche UND englische Texte. Antworte AUSSCHLIESSLICH mit gültigem JSON ohne Markdown, ohne Erklärungen.

Aufgabe: Finde ALLE KONKRETEN personenbezogenen WERTE (PII) im Text — sei VOLLSTÄNDIG. Dies dient dem Datenschutz und jeder Treffer wird danach von einem Menschen geprüft: eine ÜBERSEHENE PII ist schlimmer als ein Treffer zu viel. Im Zweifel also MARKIEREN. Markiere dabei nur echte Werte (Namen, Nummern, Adressen, …), NICHT die umgebenden Wörter, Feldbezeichnungen oder Satzteile (siehe Regel 5–6).

Zu erfassende Typen (type-Wert in Großbuchstaben):
- PERSON: Personennamen (Vor-, Nach-, Vollname; auch einzeln stehende); auch Benutzernamen/Logins/@handles und Social-Media-Profile
- ORG: Firmen, Banken, Institutionen, Vereine (z. B. "UniCredit Bank Austria")
- LOCATION: Adressen, Straßen + Hausnr., Orte, PLZ, Plätze, Kreuzungen
- GEO: Geokoordinaten (z. B. "48.137, 11.576" oder "N 48° 08.123 E 11° 34.567"), what3words, Plus Codes — metergenaue Standorte
- EMAIL, PHONE, IP
- DATE: Geburtsdaten, OP-/Termin-/Buchungsdaten (z. B. "14.03.1987", "born on 12/12/1990")
- IBAN, BIC, CREDIT_CARD (auch CVV und Endung/letzte 4 Ziffern), TAX (Steuer-ID), VAT (USt-IdNr.)
- PASSPORT (Reisepass-/Kinderreisepass-Nr.), ID (Personalausweis), SSN (Sozialversicherungsnr.)
- VIN (Fahrgestellnummer), MAC (MAC-Adresse), SERIAL (Geräte-/Seriennummer), PLATE (KFZ-Kennzeichen)
- EMPLOYEE: Personalnummer, Mitarbeiter-ID
- REF: Kunden-, Mitglieds-, Bestell-, Auftrags-, Antrags-, Vorgangs-, Buchungsnummern, Versicherungs-/Patienten-/Aktennummern (z. B. "KD-774201", "MT-CH-2098")
- SECRET: API-Keys, Tokens, Passwörter, Session-IDs (NUR lange, zusammenhängende Schlüssel/Zeichenketten ohne Leerzeichen — NIEMALS Namen, Adressen oder Telefonnummern als SECRET markieren)
- OTHER: sonstige eindeutig personenbezogene/sensible Daten, die in KEINEN Typ oben passen — z. B. Gesundheits-/Diagnoseangaben, Religion, Gewerkschaft, ethnische Herkunft, sexuelle Orientierung, biometrische Merkmale. Nur konkret Personenbezogenes, kein Allerwelts-Text.

Regeln:
1. Jeder "text"-Wert MUSS Zeichen für Zeichen aus dem Input zwischen den <text>-Tags stammen. Nichts erfinden.
2. Personennamen: vollständige Namen als EIN Span, einzelne Vor-/Nachnamen auch. Nach Grußformeln ("Viele Grüße", "Mit freundlichen Grüßen", "Best regards", "Kind regards", "Cheers") folgt fast immer ein Name — IMMER als PERSON markieren. Die Grußformel selbst gehört NICHT zum Span. Falsch: {"text":"Viele Grüße Lorenz",...}. Richtig: {"text":"Lorenz",...}.
3. In E-Mail-Headern (From, To, Cc, An, Von) sind die Namen vor "<email@…>" IMMER PERSON.
4. Bei mehrteiligen Werten (Straße + Hausnummer, Vor- + Nachname, Präfix + Nummer wie "PAY-CH-998812") den GESAMTEN Wert als einen Span markieren, nicht nur einen Teil.
5. KEINE PII (nicht markieren): reine Geldbeträge, Quartale, Prozentwerte, Mengenangaben, Software-Versionsnummern, allgemeine Wörter.
6. NIEMALS Feldbezeichnungen, Anweisungen oder Satzfragmente markieren — nur den Wert dahinter. Beispiele für FALSCHE Treffer (nicht markieren): "Bitte überweisen auf", "Kontakt bei Rückfragen", "Kontakt", "Kontaktdaten", "Rechnungsadresse", "Name", "Telefon", "IBAN", "Kundennummer", "Sehr geehrte Damen und Herren", "Mit freundlichen Grüßen", "Viele Grüße", "Best regards". Markiere stattdessen NUR den konkreten Wert (z. B. die IBAN selbst, den Namen selbst).

Wichtig zur "text"-Form:
- Email NIEMALS in spitze Klammern: "name@firma.de" (gut), NICHT "<name@firma.de>".
- Email exakt wie im Input (gleiche Groß-/Kleinschreibung).
- Namen ohne führendes "@" oder "<".
- "Name <email>" sind ZWEI Treffer (Name + Email), beide ohne Klammern.

Schema: {"entities":[{"text":"<wörtlicher Substring>","type":"<TYP>"}, ...]}
${hintSection}
<text>
${text}
</text>

JSON:`;
}

// ---------------------------------------------------------------------------
// JSON parsing
// ---------------------------------------------------------------------------

interface RawLlmEntity {
  text: string;
  type: string;
  confidence: number;
}

/**
 * Coerce a value from various possible field names into a RawLlmEntity.
 * Small LLMs use inconsistent field naming — accept common variants.
 */
function coerceEntity(o: unknown): RawLlmEntity | null {
  if (o === null || typeof o !== 'object') return null;
  const obj = o as Record<string, unknown>;

  // Text variants seen from various model outputs
  const text =
    (typeof obj['text'] === 'string' && obj['text']) ||
    (typeof obj['value'] === 'string' && obj['value']) ||
    (typeof obj['entity'] === 'string' && obj['entity']) ||
    (typeof obj['match'] === 'string' && obj['match']) ||
    (typeof obj['span'] === 'string' && obj['span']) ||
    (typeof obj['word'] === 'string' && obj['word']) ||
    (typeof obj['name'] === 'string' && obj['name']);
  if (typeof text !== 'string' || text.length === 0) return null;

  // Type/label variants
  const typeRaw =
    (typeof obj['type'] === 'string' && obj['type']) ||
    (typeof obj['category'] === 'string' && obj['category']) ||
    (typeof obj['label'] === 'string' && obj['label']) ||
    (typeof obj['kind'] === 'string' && obj['kind']) ||
    (typeof obj['class'] === 'string' && obj['class']);
  if (typeof typeRaw !== 'string') return null;

  // Confidence variants — default to 0.8 if missing (better than dropping)
  let confidence = 0.8;
  for (const key of ['confidence', 'score', 'probability', 'prob']) {
    const v = obj[key];
    if (typeof v === 'number' && v >= 0 && v <= 1) {
      confidence = v;
      break;
    }
    // Models sometimes emit confidence as a string ("0.95") or %
    if (typeof v === 'string') {
      const n = parseFloat(v.replace('%', ''));
      if (!isNaN(n)) {
        confidence = n > 1 ? n / 100 : n;
        break;
      }
    }
  }

  return { text, type: typeRaw.toUpperCase(), confidence };
}

/**
 * Recursively walk a JSON value collecting every entity-shaped object.
 * Handles nested structures, mis-named root keys, and arrays-of-arrays.
 */
function collectEntities(node: unknown, out: RawLlmEntity[]): void {
  if (Array.isArray(node)) {
    for (const child of node) collectEntities(child, out);
    return;
  }
  if (node !== null && typeof node === 'object') {
    const ent = coerceEntity(node);
    if (ent !== null) out.push(ent);
    // Also recurse into object values — handles wrappers like
    // {entities: [...]} OR {result: {pii: [...]}} OR nested entity collections.
    for (const v of Object.values(node as Record<string, unknown>)) {
      collectEntities(v, out);
    }
  }
}

/**
 * Direct regex scan for entity-shaped JSON objects, independent of the
 * outer wrapper. Catches malformed responses that JSON.parse silently
 * truncates — most notably the small-model pattern of emitting multiple
 * `"entities"` keys in one object, where JSON.parse keeps only the last
 * and drops the rest. We sweep the raw response for any
 * `{"text": "...", "type": "..."}` shape directly, regardless of nesting
 * or duplicate keys, so no entity is lost just because the surrounding
 * structure was malformed.
 */
function fallbackScanEntities(raw: string): RawLlmEntity[] {
  const results: RawLlmEntity[] = [];
  // text-first form
  for (const m of raw.matchAll(
    /\{\s*"text"\s*:\s*"((?:[^"\\]|\\.)*)"\s*,\s*"type"\s*:\s*"([A-Z_]+)"\s*\}/g
  )) {
    const text = (m[1] ?? '').replace(/\\"/g, '"').replace(/\\\\/g, '\\').replace(/\\n/g, '\n');
    results.push({ text, type: (m[2] ?? '').toUpperCase(), confidence: 0.8 });
  }
  // type-first form (some models swap the key order)
  for (const m of raw.matchAll(
    /\{\s*"type"\s*:\s*"([A-Z_]+)"\s*,\s*"text"\s*:\s*"((?:[^"\\]|\\.)*)"\s*\}/g
  )) {
    const text = (m[2] ?? '').replace(/\\"/g, '"').replace(/\\\\/g, '\\').replace(/\\n/g, '\n');
    results.push({ text, type: (m[1] ?? '').toUpperCase(), confidence: 0.8 });
  }
  return results;
}

function parseJsonResponse(raw: string): RawLlmEntity[] {
  // Strip markdown code fences if present
  const cleaned = raw.replace(/```(?:json)?\s*/g, '').replace(/```\s*$/g, '');

  const collected: RawLlmEntity[] = [];

  // Find the outermost JSON object. Models sometimes emit prose before/after.
  const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    try {
      const parsed: unknown = JSON.parse(jsonMatch[0]);
      // Recursive collection accepts {entities: [...]}, {result: {pii: [...]}},
      // bare arrays, or single objects. Each found entity has been coerced from
      // common field-name variants (text/value/entity/word, type/category/label, etc).
      collectEntities(parsed, collected);
    } catch {
      // Fall through to regex fallback below.
    }
  }

  // Always sweep with regex too — catches entities that JSON.parse silently
  // dropped due to duplicate keys (small models emit {"entities":[…]} then a
  // second {"entities":[…]} that overrides the first). Dedupe handles any
  // overlap with JSON.parse-collected entities.
  collected.push(...fallbackScanEntities(cleaned));

  // Dedupe by (text, type) to handle nested-duplication patterns where a
  // model puts the same entity in both outer and inner arrays.
  const seen = new Set<string>();
  return collected.filter((e) => {
    const key = `${e.text}__${e.type}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

// ---------------------------------------------------------------------------
// Greeting-prefix stripping
// ---------------------------------------------------------------------------

/**
 * Small LLMs frequently return a name-after-greeting span as a single PERSON
 * entity ("Viele Grüße\nLorenz" instead of just "Lorenz"). That string isn't
 * a verbatim source substring (source usually has \n\n, model emits \n), so
 * the indexOf check drops it as a hallucination. This helper extracts just
 * the name portion if the candidate starts with a known closing greeting.
 *
 * Returns the trailing name (with surrounding whitespace removed) or null
 * if no greeting prefix was found.
 */
function stripGreetingPrefix(s: string): string | null {
  // Order matters — longer matches first so "Mit freundlichen Grüßen" is
  // tried before "Grüßen" alone. Case-insensitive, allow ß/ss variants.
  const greetings = [
    'mit freundlichen grü(?:ß|ss)en',
    'mit besten grü(?:ß|ss)en',
    'freundliche grü(?:ß|ss)e',
    'beste grü(?:ß|ss)e',
    'herzliche grü(?:ß|ss)e',
    'liebe grü(?:ß|ss)e',
    'viele grü(?:ß|ss)e',
    'kind regards',
    'best regards',
    'warm regards',
    'sincerely yours',
    'sincerely',
    'cheers',
    'regards',
    'hochachtungsvoll',
    'mfg',
    'lg',
    'vg',
    'gru(?:ß|ss)',
  ];
  const pattern = new RegExp(`^(?:${greetings.join('|')})[\\s,.:!-]*`, 'i');
  const m = s.match(pattern);
  if (m === null) return null;
  const remainder = s.slice(m[0].length).trim();
  return remainder.length === 0 ? null : remainder;
}

// ---------------------------------------------------------------------------
// Email-aware chunking
// ---------------------------------------------------------------------------

/**
 * Recognised quoted-message and signature boundary markers. These get
 * priority over generic paragraph/sentence splits because cutting a chunk
 * in the middle of a quoted email or a signature would strand a name
 * away from the surrounding context the LLM relies on.
 */
const EMAIL_HARD_BOUNDARIES: RegExp[] = [
  /\n-{2,}\s*Original(?:[- ])(?:Message|Nachricht)\s*-{2,}\n/i,
  /\n-{2,}\s*Forwarded(?:[- ])(?:Message|Email)\s*-{2,}\n/i,
  /\n(?:Weitergeleitet|Weitergeleitete\s+Nachricht):\s*\n/i,
  /\n(?:From|Von):\s+[^\n]{0,200}\n(?:Sent|Gesendet):\s+[^\n]+\n/, // Outlook quote header
];

/** Soft boundaries we prefer when no hard boundary fits. */
function findSoftBoundary(window: string, halfPoint: number): number {
  // Prefer paragraph break, then sentence end, then any line break
  const candidates = [
    window.lastIndexOf('\n\n'),
    window.lastIndexOf('. '),
    window.lastIndexOf('\n'),
  ];
  for (const c of candidates) {
    if (c > halfPoint) return c;
  }
  return -1;
}

export function chunkText(text: string, maxSize: number, overlap: number): string[] {
  if (text.length <= maxSize) return [text];

  const chunks: string[] = [];
  let start = 0;
  while (start < text.length) {
    const remaining = text.length - start;
    if (remaining <= maxSize) {
      chunks.push(text.slice(start));
      break;
    }
    const windowEnd = start + maxSize;
    const window = text.slice(start, windowEnd);

    // 1. Try a hard email boundary inside the window — split there.
    let cut = -1;
    for (const re of EMAIL_HARD_BOUNDARIES) {
      // Use matchAll with a forcibly-global clone so we iterate all matches
      // without the infinite-loop pitfall of exec() on a non-global regex.
      // matchAll requires the global flag, so we re-build the regex with it.
      const globalRe = new RegExp(re.source, re.flags.includes('g') ? re.flags : re.flags + 'g');
      let lastIdx = -1;
      for (const m of window.matchAll(globalRe)) {
        if (m.index !== undefined && m.index > maxSize / 2) lastIdx = m.index;
      }
      if (lastIdx > cut) cut = lastIdx;
    }

    // 2. Fall back to a soft boundary
    if (cut < 0) cut = findSoftBoundary(window, maxSize / 2);

    // 3. Last resort: hard cut at maxSize
    const end = cut > 0 ? start + cut + 1 : windowEnd;
    chunks.push(text.slice(start, end));
    start = Math.max(end - overlap, end - Math.floor(maxSize * 0.4));
  }
  return chunks;
}

// ---------------------------------------------------------------------------
// WebLlmDetector
// ---------------------------------------------------------------------------

const DEFAULT_MIN_CONFIDENCE = 0.6;

export class WebLlmDetector implements Detector {
  readonly name = 'webllm';

  private readonly modelId: string;
  private readonly minConfidence: number;
  private readonly onProgress: ((event: WebLlmProgressEvent) => void) | undefined;
  private readonly onChunkProgress: ((current: number, total: number) => void) | undefined;
  private readonly selfConsistencyPasses: number;
  private readonly requestTimeoutMs: number;
  private readonly chunkSize: number;
  private readonly chunkOverlap: number;
  private readonly maxTokens: number;
  private readonly onError:
    | ((info: { failedChunks: number; totalChunks: number; message: string }) => void)
    | undefined;
  private readonly debug: boolean;
  private readonly engineFactory: EngineFactory;

  private engine: MLCEngine | null = null;
  private loadPromise: Promise<void> | null = null;

  constructor(options: WebLlmOptions) {
    this.modelId = options.modelId;
    this.minConfidence = options.minConfidence ?? DEFAULT_MIN_CONFIDENCE;
    this.onProgress = options.onProgress;
    this.onChunkProgress = options.onChunkProgress;
    this.selfConsistencyPasses = Math.max(1, options.selfConsistencyPasses ?? 1);
    this.requestTimeoutMs = Math.max(1_000, options.requestTimeoutMs ?? 180_000);
    this.chunkSize = Math.max(500, options.chunkSize ?? 1500);
    this.chunkOverlap = Math.max(0, Math.min(options.chunkOverlap ?? 200, this.chunkSize - 1));
    this.maxTokens = Math.max(64, options.maxTokens ?? 800);
    this.onError = options.onError;
    this.debug = options.debug ?? false;
    this.engineFactory = options._engineFactory ?? defaultEngineFactory;
  }

  /**
   * Returns true when WebGPU is available in the current environment.
   * Use this before showing the WebLLM UI or attempting to load a model.
   */
  static isSupported(): boolean {
    return typeof navigator !== 'undefined' && 'gpu' in navigator;
  }

  /**
   * Triggers lazy load. Resolves once the engine is ready.
   * Calling multiple times is safe — returns the same promise.
   */
  ready(): Promise<void> {
    if (this.loadPromise !== null) {
      return this.loadPromise;
    }

    this.onProgress?.({ status: 'init', message: 'Initializing WebLLM engine…' });

    this.loadPromise = this.engineFactory(this.modelId, {
      initProgressCallback: (report) => {
        // Map the MLC progress report to our event type
        const progress = report.progress ?? 0;
        this.onProgress?.({
          status: 'download',
          progress,
          loaded: Math.round(progress * 100),
          total: 100,
          message: report.text ?? `Loading… ${Math.round(progress * 100)}%`,
        });
      },
    })
      .then((eng) => {
        this.engine = eng;
        this.onProgress?.({ status: 'ready' });
      })
      .catch((err: unknown) => {
        const msg = err instanceof Error ? err.message : String(err);
        this.onProgress?.({ status: 'error', error: msg });
        // Reset so ready() can be retried
        this.loadPromise = null;
        throw err;
      });

    return this.loadPromise;
  }

  async detect(text: string, hints?: import('../types.js').DetectorHints): Promise<Entity[]> {
    console.log('[WebLlmDetector] ENTRY', {
      debug: this.debug,
      engineReady: this.engine !== null,
      textLength: text.length,
      priorEntities: hints?.priorEntities?.length ?? 0,
    });

    try {
      await this.ready();
    } catch (err) {
      // Engine failed to initialize (no WebGPU, download error, server
      // unreachable). Degrade gracefully: regex + NER results still stand,
      // the UI gets a chance to warn via onError.
      const msg = err instanceof Error ? err.message : String(err);
      console.error('[WebLlmDetector] not ready — engine init failed', err);
      this.onError?.({ failedChunks: 1, totalChunks: 1, message: msg });
      return [];
    }
    const eng = this.engine;
    if (eng === null) {
      console.log('[WebLlmDetector] engine null after ready() — disposed?');
      return [];
    }

    // For short texts, run a single call. For longer texts, split into
    // overlapping chunks — small LLMs degrade past ~2 KB context.
    const chunks =
      text.length <= this.chunkSize ? [text] : chunkText(text, this.chunkSize, this.chunkOverlap);
    if (chunks.length > 1) {
      console.log(
        `[WebLlmDetector] long text (${text.length} chars) — ${chunks.length} chunks of ${this.chunkSize} (overlap ${this.chunkOverlap})`
      );
    }

    const allEntities: Entity[] = [];
    let failedChunks = 0;
    let lastError = '';
    let i = 0;
    let skippedBinary = 0;
    // Emit an initial 0/total so the UI flips to 'LLM analysing' immediately
    // instead of waiting for the first chunk to finish.
    this.onChunkProgress?.(0, chunks.length);
    for (const chunk of chunks) {
      i++;
      if (isLikelyBinaryChunk(chunk)) {
        skippedBinary++;
        this.onChunkProgress?.(i, chunks.length);
        continue;
      }
      console.log(`[WebLlmDetector] chunk ${i}/${chunks.length} (${chunk.length} chars)`);
      this.onChunkProgress?.(i, chunks.length);
      // Pass full source for indexOf — entities anchor to original text positions
      // regardless of which chunk they were found in.
      try {
        const chunkEntities = await this.detectChunk(eng, chunk, text, hints?.priorEntities);
        allEntities.push(...chunkEntities);
      } catch (err) {
        // One failed chunk must not lose the results of the others.
        failedChunks++;
        lastError = err instanceof Error ? err.message : String(err);
        console.error(`[WebLlmDetector] chunk ${i}/${chunks.length} failed`, err);
      }
    }
    if (skippedBinary > 0) {
      console.log(
        `[WebLlmDetector] skipped ${skippedBinary}/${chunks.length} binary/base64 chunks (no prose PII; regex+NER still scanned them)`
      );
    }
    if (failedChunks > 0) {
      this.onError?.({ failedChunks, totalChunks: chunks.length, message: lastError });
    }

    // Dedupe by (start, end) — overlapping chunks may report the same entity twice
    const seen = new Set<string>();
    const deduped = allEntities.filter((e) => {
      const key = `${e.start}-${e.end}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
    deduped.sort((a, b) => a.start - b.start || b.end - a.end);
    return deduped;
  }

  /**
   * Run the LLM on a single chunk. Validates each returned entity against
   * `fullText` (not the chunk) so positions are anchored to the original
   * source. Entities whose `text` does not appear in `fullText` are dropped
   * as hallucinations.
   */
  private async detectChunk(
    eng: MLCEngine,
    chunk: string,
    fullText: string,
    priorEntities?: readonly Entity[]
  ): Promise<Entity[]> {
    const prompt = buildPrompt(chunk, priorEntities);

    // Note: previously this called the WebLLM JSON-schema mode via
    // `response_format: { type: 'json_object' }`, but that triggers
    // `BindingError: Cannot pass non-string to std::string` in MLC's
    // GrammarCompiler for some model builds. Prompt-driven JSON is
    // reliable across all supported models and we parse defensively below.
    // Self-consistency: run the LLM N times and union the results. Default 1.
    // For N > 1 we vary temperature slightly so the model can land on
    // different completions; deterministic re-runs would be wasted work.
    const allRaw: RawLlmEntity[] = [];
    let lastContent = '';
    let anyPassSucceeded = false;
    let lastPassError: unknown;
    for (let pass = 0; pass < this.selfConsistencyPasses; pass++) {
      let rawContent: string;
      let timeoutHandle: ReturnType<typeof setTimeout> | undefined;
      try {
        const passLabel =
          this.selfConsistencyPasses > 1 ? ` (pass ${pass + 1}/${this.selfConsistencyPasses})` : '';
        console.log(`[WebLlmDetector] calling eng.chat.completions.create()${passLabel}`);
        const t0 = performance.now();
        // Timeout sized via requestTimeoutMs — Llama-1B on consumer WebGPU
        // produces ~30-60 tokens/sec; allow headroom for slow devices and
        // first-call shader compilation. max_tokens caps runaway-JSON risk.
        const createPromise = eng.chat.completions.create({
          messages: [
            {
              role: 'system',
              content:
                'Du bist ein präziser PII-Detektor. Antworte ausschließlich mit gültigem JSON gemäß dem vorgegebenen Format, ohne Code-Fences und ohne Erklärtext.',
            },
            { role: 'user', content: prompt },
          ],
          max_tokens: this.maxTokens,
          // Stagger temperature across passes: 0.1, 0.3, 0.5, ... so each
          // pass explores a slightly different distribution. First pass
          // stays at the deterministic baseline.
          temperature: 0.1 + pass * 0.2,
        });
        const timeoutPromise = new Promise<never>((_, reject) => {
          timeoutHandle = setTimeout(
            () => reject(new Error(`WebLLM create() timed out after ${this.requestTimeoutMs}ms`)),
            this.requestTimeoutMs
          );
        });
        const response = await Promise.race([createPromise, timeoutPromise]);
        const elapsed = Math.round(performance.now() - t0);
        console.log(`[WebLlmDetector] create() resolved in ${elapsed}ms`);
        rawContent = response.choices[0]?.message?.content ?? '';
        lastContent = rawContent;
        anyPassSucceeded = true;
      } catch (err) {
        lastPassError = err;
        console.error('[WebLlmDetector] create() failed', err);
        continue; // Allow other passes to proceed even if one fails
      } finally {
        clearTimeout(timeoutHandle);
      }
      allRaw.push(...parseJsonResponse(rawContent));
    }

    // Every pass failed — surface it so detect() can count this chunk as
    // failed and notify via onError instead of silently emitting nothing.
    if (!anyPassSucceeded) {
      throw lastPassError instanceof Error
        ? lastPassError
        : new Error(String(lastPassError ?? 'LLM call failed'));
    }

    // Union across passes — dedupe by (text, type) so the same entity from
    // two passes counts once. parseJsonResponse already deduped within a
    // single pass.
    const seenAcross = new Set<string>();
    const rawEntities = allRaw.filter((e) => {
      const key = `${e.text}__${e.type}`;
      if (seenAcross.has(key)) return false;
      seenAcross.add(key);
      return true;
    });

    const rawContent = lastContent; // for debug logging below
    const entities: Entity[] = [];
    const droppedByLabel: RawLlmEntity[] = [];
    const droppedByConfidence: RawLlmEntity[] = [];
    const droppedByMissingText: RawLlmEntity[] = [];

    for (const raw of rawEntities) {
      const mapping = mapLlmLabel(raw.type);
      if (mapping === null) {
        droppedByLabel.push(raw);
        continue;
      }
      // SECRET must look like an actual key/token — small models love
      // mislabeling names or addresses as SECRET, which then leaks them
      // under a too-coarse placeholder. Demand a single unbroken token of
      // key-ish characters.
      if (
        mapping.type === 'GENERIC_SECRET' &&
        !/^[A-Za-z0-9_\-.+/=:]{12,}$/.test(raw.text.trim())
      ) {
        droppedByLabel.push(raw);
        continue;
      }
      if (raw.confidence < this.minConfidence) {
        droppedByConfidence.push(raw);
        continue;
      }
      // Stopword-only candidates ("Mit freundlichen Grüßen", "Kundennummer")
      // are field labels / boilerplate, not values.
      if (isTrivialNonEntity(raw.text)) {
        droppedByLabel.push(raw);
        continue;
      }
      // No legitimate PII value is longer than ~8 words — longer spans are
      // sentence fragments the model failed to trim.
      if (raw.text.trim().split(/\s+/).length > 8) {
        droppedByLabel.push(raw);
        continue;
      }

      // Find all occurrences of the text in the input
      const rawNeedle = raw.text;
      if (!rawNeedle || rawNeedle.length === 0) {
        droppedByMissingText.push(raw);
        continue;
      }

      // Small models wrap emails / names in angle brackets even when the
      // source doesn't ("<Timo.Penzkofer@x.de>" vs "Timo.Penzkofer@x.de")
      // — strip surrounding angle brackets and whitespace before lookup.
      // Also strip a stray leading '@' that some models add ("@<email>").
      const baseNeedle = rawNeedle.replace(/^[\s<@]+|[\s>]+$/g, '');
      if (baseNeedle.length === 0) {
        droppedByMissingText.push(raw);
        continue;
      }

      // Generate lookup candidates, tried in order. The first match wins.
      // Each candidate is a transformation that recovers an entity the LLM
      // returned in a slightly wrong form:
      //   1. exact match (handles 95% of cases)
      //   2. greeting-prefix stripped — model often returns
      //      "Viele Grüße\nLorenz" as one PERSON span; we want just "Lorenz"
      //   3. internal-whitespace normalised — model collapses \n\n into \n
      const candidates: string[] = [baseNeedle];
      const stripped = stripGreetingPrefix(baseNeedle);
      if (stripped !== null && stripped !== baseNeedle) candidates.push(stripped);

      // Validate against FULL text (not just the chunk) — anchors entity to
      // the original source-text position and rejects any hallucinated text
      // that doesn't appear verbatim in the original. Case-insensitive
      // search rescues emails the model lowercased (real source might be
      // "Timo.Penzkofer@…" but model emits "timo.penzkofer@…"). We anchor
      // to the original-case substring so the placeholder replaces the
      // exact source text.
      const fullLower = fullText.toLowerCase();
      let needle = baseNeedle;
      let needleLower = needle.toLowerCase();
      let foundAtLeastOne = false;
      // Try each candidate; first one with at least one occurrence wins.
      for (const cand of candidates) {
        const candLower = cand.toLowerCase();
        if (fullLower.indexOf(candLower) === -1) continue;
        needle = cand;
        needleLower = candLower;
        break;
      }
      let searchFrom = 0;
      while (searchFrom < fullText.length) {
        const idx = fullLower.indexOf(needleLower, searchFrom);
        if (idx === -1) break;
        foundAtLeastOne = true;

        // Use original-case slice from fullText so highlighting/replacement
        // matches the actual source bytes, not the LLM-normalised version.
        const actualText = fullText.slice(idx, idx + needle.length);

        entities.push({
          start: idx,
          end: idx + needle.length,
          type: mapping.type,
          category: mapping.category,
          text: actualText,
          confidence: raw.confidence,
          source: 'llm',
        });

        searchFrom = idx + 1;
      }
      if (!foundAtLeastOne) {
        // HALLUCINATION caught — model invented text that doesn't appear in
        // the source. Always log this so users see the safety net working.
        console.warn(
          `[WebLlmDetector] HALLUCINATION dropped: "${rawNeedle}" (type=${raw.type}) — not present in source text`
        );
        droppedByMissingText.push(raw);
      }
    }

    // Sort by start offset
    entities.sort((a, b) => a.start - b.start || b.end - a.end);

    if (this.debug) {
      console.log('[WebLlmDetector]', {
        modelId: this.modelId,
        rawResponseLength: rawContent.length,
        rawResponse: rawContent,
        parsedEntities: rawEntities.length,
        emitted: entities.length,
        droppedByLabel: droppedByLabel.length,
        droppedByConfidence: droppedByConfidence.length,
        droppedByMissingText: droppedByMissingText.length,
        parsedDetail: rawEntities,
        emittedDetail: entities,
        droppedByMissingTextDetail: droppedByMissingText,
      });
    }

    return entities;
  }

  /** Free underlying model weights from memory. */
  async dispose(): Promise<void> {
    if (this.engine !== null) {
      await this.engine.unload();
      this.engine = null;
    }
    // Reset so a new ready() call would reload if needed
    this.loadPromise = null;
  }
}
