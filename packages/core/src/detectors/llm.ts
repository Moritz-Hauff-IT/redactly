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
    id: 'Llama-3.2-1B-Instruct-q4f16_1-MLC',
    label: 'Llama 3.2 1B',
    sizeMB: 700,
    vramMB: 1500,
    description:
      'Schnell und kompakt. Für ältere oder schwächere Geräte. Findet die meisten kontextuellen PII, aber kann Edge-Cases übersehen.',
    recommendedFor: 'fast',
  },
  {
    id: 'Llama-3.2-3B-Instruct-q4f16_1-MLC',
    label: 'Llama 3.2 3B',
    sizeMB: 1700,
    vramMB: 3500,
    description:
      'Empfohlene Standardwahl. Guter Trade-off zwischen Genauigkeit und Geschwindigkeit. Läuft auf den meisten modernen Laptops mit 8+ GB RAM.',
    recommendedFor: 'balanced',
  },
  {
    id: 'Phi-3.5-mini-instruct-q4f16_1-MLC',
    label: 'Phi-3.5 Mini',
    sizeMB: 2200,
    vramMB: 4000,
    description:
      'Microsofts kleines Modell, besonders stark bei strukturierten Aufgaben wie Entitäts-Extraktion. Etwas langsamer, aber präziser bei seltenen PII-Mustern.',
    recommendedFor: 'best',
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
  return `Du bist ein PII-Detektor. Extrahiere AUSSCHLIESSLICH personenbezogene Daten und Geheimnisse aus dem folgenden Text.

WICHTIGE REGELN:
- Markiere NUR echte PII. Geldbeträge ("1.450 €"), Quartale ("Q2/2026"), Rechnungsnummern ohne Personenbezug, Datumsangaben ohne Personenbezug → NICHT markieren.
- Jeder "text"-Wert muss ein WÖRTLICHES Substring aus dem Originaltext sein (Zeichen für Zeichen kopiert).
- Confidence nur ≥0.7 wenn du sicher bist.
- Personennamen IMMER als komplette Spans (Vorname + Nachname zusammen, nicht getrennt).

Typen:
- PERSON: Echte Personennamen
- ORG: Firmen-, Behörden-, Organisationsnamen (z.B. "Müller GmbH")
- LOCATION: Postadressen, Städte, Länder
- EMAIL: Email-Adressen
- PHONE: Telefonnummern
- FINANCIAL: IBAN, Kreditkarten, Kontonummern (KEINE Geldbeträge!)
- SECRET: API-Keys, Tokens, Passwörter (KEINE Quartale, Datumsangaben, Versionsnummern!)

Antworte AUSSCHLIESSLICH mit gültigem JSON, ohne Erklärung, ohne Markdown:
{"entities":[{"text":"<exact substring>","type":"<PERSON|ORG|LOCATION|EMAIL|PHONE|FINANCIAL|SECRET>","confidence":0.0-1.0}]}

Text:
"""
${text}
"""`;
}

// ---------------------------------------------------------------------------
// JSON parsing
// ---------------------------------------------------------------------------

interface RawLlmEntity {
  text: string;
  type: string;
  confidence: number;
}

interface LlmResponse {
  entities: RawLlmEntity[];
}

function parseJsonResponse(raw: string): RawLlmEntity[] {
  // Try to extract JSON from the response — model may wrap it in markdown
  const jsonMatch = raw.match(/\{[\s\S]*\}/);
  if (!jsonMatch) return [];

  try {
    const parsed = JSON.parse(jsonMatch[0]) as unknown;
    if (
      parsed !== null &&
      typeof parsed === 'object' &&
      'entities' in parsed &&
      Array.isArray((parsed as LlmResponse).entities)
    ) {
      return ((parsed as LlmResponse).entities as unknown[]).filter(
        (e): e is RawLlmEntity =>
          e !== null &&
          typeof e === 'object' &&
          typeof (e as RawLlmEntity).text === 'string' &&
          typeof (e as RawLlmEntity).type === 'string' &&
          typeof (e as RawLlmEntity).confidence === 'number'
      );
    }
  } catch {
    // Invalid JSON — return empty
  }
  return [];
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

  async detect(text: string): Promise<Entity[]> {
    if (this.debug) {
      // eslint-disable-next-line no-console
      console.log('[WebLlmDetector] detect() called', {
        modelId: this.modelId,
        textLength: text.length,
        engineReady: this.engine !== null,
      });
    }

    // Lazy load if not yet initialized
    await this.ready();

    // Capture engine reference — protect against concurrent dispose()
    const eng = this.engine;
    if (eng === null) {
      if (this.debug) console.log('[WebLlmDetector] engine null after ready() — disposed?');
      return [];
    }

    const prompt = buildPrompt(text);

    // Note: previously this called the WebLLM JSON-schema mode via
    // `response_format: { type: 'json_object' }`, but that triggers
    // `BindingError: Cannot pass non-string to std::string` in MLC's
    // GrammarCompiler for some model builds. Prompt-driven JSON is
    // reliable across all supported models and we parse defensively below.
    let rawContent: string;
    try {
      const response = await eng.chat.completions.create({
        messages: [
          {
            role: 'system',
            content:
              'Du bist ein präziser PII-Detektor. Antworte ausschließlich mit gültigem JSON gemäß dem vorgegebenen Format, ohne Code-Fences und ohne Erklärtext.',
          },
          { role: 'user', content: prompt },
        ],
      });
      rawContent = response.choices[0]?.message?.content ?? '';
    } catch {
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

      let foundAtLeastOne = false;
      let searchFrom = 0;
      while (searchFrom < text.length) {
        const idx = text.indexOf(needle, searchFrom);
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
        droppedByMissingText.push(raw);
      }
    }

    // Sort by start offset
    entities.sort((a, b) => a.start - b.start || b.end - a.end);

    if (this.debug) {
      // eslint-disable-next-line no-console
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
