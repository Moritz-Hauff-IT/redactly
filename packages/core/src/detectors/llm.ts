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

function mapLlmLabel(label: string): LabelMapping | null {
  switch (label.toUpperCase()) {
    case 'PERSON':
      return { type: 'PERSON', category: 'person' };
    case 'ORG':
      return { type: 'ORG', category: 'organization' };
    case 'LOCATION':
      return { type: 'LOCATION', category: 'address' };
    case 'ADDRESS':
      return { type: 'LOCATION', category: 'address' };
    case 'EMAIL':
      return { type: 'EMAIL', category: 'contact' };
    case 'PHONE':
      return { type: 'PHONE', category: 'contact' };
    case 'FINANCIAL':
      return { type: 'IBAN', category: 'financial' };
    case 'SECRET':
      return { type: 'GENERIC_SECRET', category: 'secret' };
    default:
      return null;
  }
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

function buildPrompt(text: string): string {
  // Schema-only prompt. A previous few-shot version backfired catastrophically:
  // small models hallucinated entities directly out of the example (e.g.
  // "Berliner Str. 5, 10115 Berlin" appearing as a detected entity even
  // though it was only in the prompt). The hallucinations still cost output
  // tokens and were later dropped by the source-text filter — pure waste.
  //
  // Strong "WÖRTLICH aus dem Text" instruction + clear textual fence (XML-style
  // <text> tags) helps small models distinguish instructions from input data.
  return `Du bist ein PII-Extraktor. Antworte AUSSCHLIESSLICH mit gültigem JSON ohne Markdown, ohne Erklärungen.

Regeln:
1. Jeder "text"-Wert MUSS Zeichen für Zeichen aus dem Input zwischen den <text>-Tags stammen. Nichts erfinden. Wenn du unsicher bist, lieber WEGLASSEN.
2. Personennamen als komplettes Span (Vorname + Nachname zusammen, nicht getrennt).
3. type ist einer von: PERSON, ORG, LOCATION, EMAIL, PHONE, IBAN, SECRET.
4. Geldbeträge, Quartale, Datumsangaben und Versionsnummern sind KEINE PII — nicht markieren.

Schema: {"entities":[{"text":"<wörtlicher Substring>","type":"<TYP>"}]}

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

function parseJsonResponse(raw: string): RawLlmEntity[] {
  // Strip markdown code fences if present
  const cleaned = raw.replace(/```(?:json)?\s*/g, '').replace(/```\s*$/g, '');

  // Find the outermost JSON object. Models sometimes emit prose before/after.
  const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
  if (!jsonMatch) return [];

  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonMatch[0]);
  } catch {
    return [];
  }

  // Recursive collection accepts {entities: [...]}, {result: {pii: [...]}},
  // bare arrays, or single objects. Each found entity has been coerced from
  // common field-name variants (text/value/entity/word, type/category/label, etc).
  const collected: RawLlmEntity[] = [];
  collectEntities(parsed, collected);

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
// WebLlmDetector
// ---------------------------------------------------------------------------

const DEFAULT_MIN_CONFIDENCE = 0.6;

export class WebLlmDetector implements Detector {
  readonly name = 'webllm';

  private readonly modelId: string;
  private readonly minConfidence: number;
  private readonly onProgress: ((event: WebLlmProgressEvent) => void) | undefined;
  private readonly debug: boolean;
  private readonly engineFactory: EngineFactory;

  private engine: MLCEngine | null = null;
  private loadPromise: Promise<void> | null = null;

  constructor(options: WebLlmOptions) {
    this.modelId = options.modelId;
    this.minConfidence = options.minConfidence ?? DEFAULT_MIN_CONFIDENCE;
    this.onProgress = options.onProgress;
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

  /** Max characters per LLM call. Small models lose track past ~2 KB context. */
  private static readonly CHUNK_SIZE = 1500;
  /** Overlap between chunks so entities at boundaries are caught in at least one. */
  private static readonly CHUNK_OVERLAP = 200;

  async detect(text: string): Promise<Entity[]> {
    console.log('[WebLlmDetector] ENTRY', {
      debug: this.debug,
      engineReady: this.engine !== null,
      textLength: text.length,
    });

    await this.ready();
    const eng = this.engine;
    if (eng === null) {
      console.log('[WebLlmDetector] engine null after ready() — disposed?');
      return [];
    }

    // For short texts, run a single call. For longer texts, split into
    // overlapping chunks — small LLMs degrade past ~2 KB context.
    if (text.length <= WebLlmDetector.CHUNK_SIZE) {
      return this.detectChunk(eng, text, text);
    }

    console.log(
      `[WebLlmDetector] long text (${text.length} chars) — chunking into windows of ${WebLlmDetector.CHUNK_SIZE} chars (overlap ${WebLlmDetector.CHUNK_OVERLAP})`
    );
    const chunks: string[] = [];
    let start = 0;
    while (start < text.length) {
      // Try to end at a natural boundary (paragraph or sentence)
      let end = Math.min(start + WebLlmDetector.CHUNK_SIZE, text.length);
      if (end < text.length) {
        const tail = text.slice(start, end);
        const lastBoundary = Math.max(tail.lastIndexOf('\n\n'), tail.lastIndexOf('. '));
        if (lastBoundary > WebLlmDetector.CHUNK_SIZE / 2) {
          end = start + lastBoundary + 1;
        }
      }
      chunks.push(text.slice(start, end));
      if (end >= text.length) break;
      start = end - WebLlmDetector.CHUNK_OVERLAP;
    }

    const allEntities: Entity[] = [];
    let i = 0;
    for (const chunk of chunks) {
      i++;
      console.log(`[WebLlmDetector] chunk ${i}/${chunks.length} (${chunk.length} chars)`);
      // Pass full source for indexOf — entities anchor to original text positions
      // regardless of which chunk they were found in.
      const chunkEntities = await this.detectChunk(eng, chunk, text);
      allEntities.push(...chunkEntities);
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
  private async detectChunk(eng: MLCEngine, chunk: string, fullText: string): Promise<Entity[]> {
    const prompt = buildPrompt(chunk);

    // Note: previously this called the WebLLM JSON-schema mode via
    // `response_format: { type: 'json_object' }`, but that triggers
    // `BindingError: Cannot pass non-string to std::string` in MLC's
    // GrammarCompiler for some model builds. Prompt-driven JSON is
    // reliable across all supported models and we parse defensively below.
    let rawContent: string;
    try {
      console.log('[WebLlmDetector] calling eng.chat.completions.create()');
      const t0 = performance.now();
      // 180-second timeout — Llama-1B on consumer WebGPU produces ~30-60
      // tokens/sec; allow headroom for slow devices and first-call shader
      // compilation. max_tokens caps the runaway-JSON risk.
      const createPromise = eng.chat.completions.create({
        messages: [
          {
            role: 'system',
            content:
              'Du bist ein präziser PII-Detektor. Antworte ausschließlich mit gültigem JSON gemäß dem vorgegebenen Format, ohne Code-Fences und ohne Erklärtext.',
          },
          { role: 'user', content: prompt },
        ],
        max_tokens: 800,
        temperature: 0.1,
      });
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('WebLLM create() timed out after 180s')), 180_000)
      );
      const response = await Promise.race([createPromise, timeoutPromise]);
      const elapsed = Math.round(performance.now() - t0);
      console.log(`[WebLlmDetector] create() resolved in ${elapsed}ms`);
      rawContent = response.choices[0]?.message?.content ?? '';
    } catch (err) {
      console.error('[WebLlmDetector] create() failed', err);
      return [];
    }

    const rawEntities = parseJsonResponse(rawContent);
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
      if (raw.confidence < this.minConfidence) {
        droppedByConfidence.push(raw);
        continue;
      }

      // Find all occurrences of the text in the input
      const needle = raw.text;
      if (!needle || needle.length === 0) {
        droppedByMissingText.push(raw);
        continue;
      }

      // Validate against FULL text (not just the chunk) — anchors entity to
      // the original source-text position and rejects any hallucinated text
      // that doesn't appear verbatim in the original.
      let foundAtLeastOne = false;
      let searchFrom = 0;
      while (searchFrom < fullText.length) {
        const idx = fullText.indexOf(needle, searchFrom);
        if (idx === -1) break;
        foundAtLeastOne = true;

        entities.push({
          start: idx,
          end: idx + needle.length,
          type: mapping.type,
          category: mapping.category,
          text: needle,
          confidence: raw.confidence,
          source: 'llm',
        });

        searchFrom = idx + 1;
      }
      if (!foundAtLeastOne) {
        // HALLUCINATION caught — model invented text that doesn't appear in
        // the source. Always log this so users see the safety net working.
        console.warn(
          `[WebLlmDetector] HALLUCINATION dropped: "${needle}" (type=${raw.type}) — not present in source text`
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
