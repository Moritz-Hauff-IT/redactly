/**
 * NerDetector — wraps @huggingface/transformers token-classification pipeline.
 *
 * Design decisions:
 * - Lazy load: the model is only initialized on first detect() or ready() call,
 *   not in the constructor. This avoids blocking module import.
 * - The pipeline factory is injectable so tests can mock without real model.
 * - Browser/Node compatible: the import of @huggingface/transformers is safe in
 *   both environments; onnxruntime-node is an optional Node backend that the
 *   package handles internally. We default to 'wasm' for max browser compat.
 */
import type { Detector, Entity, EntityType, EntityCategory } from '../types.js';

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export interface NerOptions {
  /** HuggingFace model ID. Default 'Xenova/bert-base-multilingual-cased-ner-hrl' (DE+EN+others). */
  model?: string;
  /** Aggregation strategy for sub-word tokens. Default 'simple'. */
  aggregationStrategy?: 'none' | 'simple' | 'first' | 'average' | 'max';
  /** Minimum confidence to emit an entity. Default 0.85. */
  minConfidence?: number;
  /** Called during model download with progress information. */
  onProgress?: (event: NerProgressEvent) => void;
  /** Override the device. Default 'wasm' for max compatibility. */
  device?: 'wasm' | 'webgpu' | 'cpu';
  /**
   * @internal — injectable pipeline factory for testing.
   * Do not rely on this in production code.
   */
  _pipelineFactory?: PipelineFactory;
}

export type NerProgressEvent =
  | { status: 'download'; file: string; loaded: number; total: number; progress: number }
  | { status: 'progress'; file: string; loaded: number; total: number; progress: number }
  | { status: 'ready'; file: string }
  | { status: 'done' };

// ---------------------------------------------------------------------------
// Internal types
// ---------------------------------------------------------------------------

/** Matches the shape returned by HF token-classification pipeline with aggregation. */
interface RawEntity {
  entity_group?: string;
  entity?: string;
  word: string;
  start: number;
  end: number;
  score: number;
}

/** Minimal interface for the HF pipeline instance we need. */
interface HFPipeline {
  (text: string): Promise<RawEntity[]>;
  dispose?: () => Promise<void>;
}

type PipelineFactory = (
  model: string,
  opts: Record<string, unknown>,
  progressCallback?: (event: NerProgressEvent) => void
) => Promise<HFPipeline>;

// ---------------------------------------------------------------------------
// Label → EntityType / EntityCategory mapping
// ---------------------------------------------------------------------------

type LabelMapping = { type: EntityType; category: EntityCategory } | null;

/** Strip B-/I- prefixes from entity labels. */
function normalizeLabel(label: string): string {
  return label.replace(/^[BI]-/, '');
}

function mapLabel(label: string): LabelMapping {
  const normalized = normalizeLabel(label).toUpperCase();
  switch (normalized) {
    case 'PER':
    case 'PERSON':
      return { type: 'PERSON', category: 'person' };
    case 'ORG':
      return { type: 'ORG', category: 'organization' };
    case 'LOC':
    case 'LOCATION':
      return { type: 'LOCATION', category: 'address' };
    case 'MISC':
    default:
      // MISC is too noisy; unknown labels are also dropped
      return null;
  }
}

// ---------------------------------------------------------------------------
// Default pipeline factory (uses real @huggingface/transformers)
// ---------------------------------------------------------------------------

async function defaultPipelineFactory(
  model: string,
  opts: Record<string, unknown>,
  progressCallback?: (event: NerProgressEvent) => void
): Promise<HFPipeline> {
  // Dynamic import keeps this side-effect-free at module load time
  const { pipeline } = await import('@huggingface/transformers');

  // The progress_callback type in HF transformers expects their internal type,
  // but we cast via unknown to avoid coupling to their internal types.
  const pipe = await pipeline('token-classification', model, {
    ...opts,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    progress_callback: progressCallback as any,
  });

  // Wrap the returned pipeline to match our HFPipeline interface
  // (the HF pipeline returns a TokenClassificationPipeline, which is callable).
  const callable = async (text: string): Promise<RawEntity[]> => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await (pipe as any)(text, {
      aggregation_strategy: opts['aggregation_strategy'],
    });
    // HF may return a nested array for batched input; we always pass a string
    return Array.isArray(result) ? (result as RawEntity[]) : [];
  };

  callable.dispose = async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const pipeAny = pipe as any;
    if (typeof pipeAny['dispose'] === 'function') {
      await pipeAny['dispose']();
    }
  };

  return callable;
}

// ---------------------------------------------------------------------------
// NerDetector
// ---------------------------------------------------------------------------

const DEFAULT_MODEL = 'Xenova/bert-base-multilingual-cased-ner-hrl';
const DEFAULT_AGGREGATION = 'simple';
const DEFAULT_MIN_CONFIDENCE = 0.85;
const DEFAULT_DEVICE = 'wasm';

export class NerDetector implements Detector {
  readonly name = 'ner';

  private readonly model: string;
  private readonly aggregationStrategy: string;
  private readonly minConfidence: number;
  private readonly onProgress: ((event: NerProgressEvent) => void) | undefined;
  private readonly device: string;
  private readonly pipelineFactory: PipelineFactory;

  private pipeline: HFPipeline | null = null;
  private loadPromise: Promise<void> | null = null;

  constructor(options: NerOptions = {}) {
    this.model = options.model ?? DEFAULT_MODEL;
    this.aggregationStrategy = options.aggregationStrategy ?? DEFAULT_AGGREGATION;
    this.minConfidence = options.minConfidence ?? DEFAULT_MIN_CONFIDENCE;
    this.onProgress = options.onProgress;
    this.device = options.device ?? DEFAULT_DEVICE;
    this.pipelineFactory = options._pipelineFactory ?? defaultPipelineFactory;
  }

  /**
   * Triggers lazy load. Resolves once the pipeline is ready.
   * Calling multiple times is safe — returns the same promise.
   */
  ready(): Promise<void> {
    if (this.loadPromise !== null) {
      return this.loadPromise;
    }

    this.loadPromise = this.pipelineFactory(
      this.model,
      {
        device: this.device,
        aggregation_strategy: this.aggregationStrategy,
      },
      this.onProgress
    ).then((pipe) => {
      this.pipeline = pipe;
    });

    return this.loadPromise;
  }

  async detect(text: string): Promise<Entity[]> {
    // Lazy load if not yet initialized
    await this.ready();

    // After ready() resolves, pipeline is guaranteed to be set
    const pipe = this.pipeline!;

    const rawEntities = await pipe(text);
    const entities: Entity[] = [];

    for (const raw of rawEntities) {
      // HF NER label may be in entity_group (aggregated) or entity (non-aggregated)
      const label = raw.entity_group ?? raw.entity ?? '';
      const mapping = mapLabel(label);

      // Drop MISC and unknown labels
      if (mapping === null) continue;

      // Drop below-threshold entities
      if (raw.score < this.minConfidence) continue;

      let start = raw.start;
      let end = raw.end;
      let entityText = raw.word;

      // Trim whitespace that the tokenizer may have included in word/offsets
      const trimmed = entityText.trim();
      if (trimmed !== entityText) {
        const leadingSpaces = entityText.length - entityText.trimStart().length;
        start = start + leadingSpaces;
        end = start + trimmed.length;
        entityText = trimmed;
      }

      // Sanity check: the text slice must equal our entity text.
      // If it doesn't (e.g. model offsets are off), drop silently rather than
      // emitting a broken entity. This protects the text.slice(start, end) === entity.text
      // invariant that the rest of the pipeline depends on.
      if (text.slice(start, end) !== entityText) {
        continue;
      }

      entities.push({
        start,
        end,
        type: mapping.type,
        category: mapping.category,
        text: entityText,
        confidence: raw.score,
        source: 'ner',
      });
    }

    // Sort by start offset
    entities.sort((a, b) => a.start - b.start || b.end - a.end);

    return entities;
  }

  /** Free underlying model weights from memory. */
  async dispose(): Promise<void> {
    if (this.pipeline !== null) {
      await this.pipeline.dispose?.();
      this.pipeline = null;
    }
    // Reset so a new ready() call would reload if needed
    this.loadPromise = null;
  }
}
