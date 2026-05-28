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
  /** Minimum confidence to emit an entity. Default 0.5. The multilingual BERT
   * model commonly scores valid German person names in the 0.5-0.8 range; higher
   * thresholds drop legitimate entities silently. */
  minConfidence?: number;
  /** Verbose console logging during detect — surfaces raw entity counts and
   * any silently dropped entities. Off by default. */
  debug?: boolean;
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

  // Wrap the returned pipeline to match our HFPipeline interface.
  // We default aggregation_strategy to 'simple' for German person-name merging.
  const callable = async (text: string): Promise<RawEntity[]> => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await (pipe as any)(text, {
      aggregation_strategy: 'simple',
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
const DEFAULT_MIN_CONFIDENCE = 0.5;
const DEFAULT_DEVICE = 'wasm';

export class NerDetector implements Detector {
  readonly name = 'ner';

  private readonly model: string;
  private readonly aggregationStrategy: string;
  private readonly minConfidence: number;
  private readonly onProgress: ((event: NerProgressEvent) => void) | undefined;
  private readonly device: string;
  private readonly debug: boolean;
  private readonly pipelineFactory: PipelineFactory;

  private pipeline: HFPipeline | null = null;
  private loadPromise: Promise<void> | null = null;

  constructor(options: NerOptions = {}) {
    this.model = options.model ?? DEFAULT_MODEL;
    this.aggregationStrategy = options.aggregationStrategy ?? DEFAULT_AGGREGATION;
    this.minConfidence = options.minConfidence ?? DEFAULT_MIN_CONFIDENCE;
    this.onProgress = options.onProgress;
    this.device = options.device ?? DEFAULT_DEVICE;
    this.debug = options.debug ?? false;
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

    // aggregation_strategy is NOT passed at construction time — some versions
    // of @huggingface/transformers reject it there. It's set per-call instead.
    this.loadPromise = this.pipelineFactory(
      this.model,
      {
        device: this.device,
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

    // Capture pipeline reference before any further await so a concurrent
    // dispose() cannot null it between the ready() check and the pipe call.
    const pipe = this.pipeline;
    if (pipe === null) return []; // disposed mid-flight

    const rawEntities = await pipe(text);
    const entities: Entity[] = [];
    const droppedByConfidence: RawEntity[] = [];
    const droppedByLabel: RawEntity[] = [];
    const droppedBySlice: Array<{ raw: RawEntity; expected: string; got: string }> = [];

    for (const raw of rawEntities) {
      // HF NER label may be in entity_group (aggregated) or entity (non-aggregated)
      const label = raw.entity_group ?? raw.entity ?? '';
      const mapping = mapLabel(label);

      // Drop MISC and unknown labels
      if (mapping === null) {
        droppedByLabel.push(raw);
        continue;
      }

      // Drop below-threshold entities
      if (raw.score < this.minConfidence) {
        droppedByConfidence.push(raw);
        continue;
      }

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

      // Slice/offset reconciliation. Three reasons offsets can diverge from
      // the tokenizer's decoded `word`:
      //   1. Unicode normalization (NFC vs NFD)
      //   2. Sub-word artifacts (## prefixes stripped by aggregator)
      //   3. UTF-8 byte offsets vs UTF-16 code-unit offsets (BERT issue,
      //      shifts everything after a multibyte char like ü/ö/ä/ß)
      // Strategy: trust the WORD over the offsets — search for it in the
      // source text and emit one entity per occurrence (like the LLM path).
      const sliced = text.slice(start, end);
      if (sliced === entityText || sliced.normalize('NFC') === entityText.normalize('NFC')) {
        // Offsets are correct — use them as-is
        entities.push({
          start,
          end,
          type: mapping.type,
          category: mapping.category,
          text: sliced,
          confidence: raw.score,
          source: 'ner',
        });
      } else {
        // Offsets are off (typical BERT UTF-8/UTF-16 issue with German text).
        // Fall back to finding the word ourselves. Skip very short/ambiguous
        // words (1–2 chars) to avoid spurious matches.
        if (entityText.length < 3) {
          droppedBySlice.push({ raw, expected: entityText, got: sliced });
          continue;
        }
        let foundAny = false;
        let searchFrom = 0;
        while (searchFrom < text.length) {
          const idx = text.indexOf(entityText, searchFrom);
          if (idx === -1) break;
          // Word-boundary check: don't match inside a larger word (e.g. don't
          // match 'Buch' inside 'Buchhaltung'). A boundary is the string edge
          // OR a non-letter/digit character. Unicode-aware for German chars.
          const before = idx > 0 ? (text[idx - 1] ?? '') : '';
          const after =
            idx + entityText.length < text.length ? (text[idx + entityText.length] ?? '') : '';
          const isLetterOrDigit = (c: string): boolean => /[\p{L}\p{N}]/u.test(c);
          if (
            (before !== '' && isLetterOrDigit(before)) ||
            (after !== '' && isLetterOrDigit(after))
          ) {
            searchFrom = idx + entityText.length;
            continue;
          }
          foundAny = true;
          entities.push({
            start: idx,
            end: idx + entityText.length,
            type: mapping.type,
            category: mapping.category,
            text: entityText,
            confidence: raw.score,
            source: 'ner',
          });
          searchFrom = idx + entityText.length;
        }
        if (!foundAny) {
          droppedBySlice.push({ raw, expected: entityText, got: sliced });
        }
      }
    }

    if (this.debug) {
      // eslint-disable-next-line no-console
      console.log('[NerDetector]', {
        rawCount: rawEntities.length,
        emitted: entities.length,
        droppedByLabel: droppedByLabel.length,
        droppedByConfidence: droppedByConfidence.length,
        droppedBySlice: droppedBySlice.length,
        raw: rawEntities,
        emittedDetail: entities,
        droppedByConfidenceDetail: droppedByConfidence,
        droppedBySliceDetail: droppedBySlice,
      });
    }

    // Sort by start offset
    entities.sort((a, b) => a.start - b.start || b.end - a.end);

    // Merge adjacent same-type entities separated only by whitespace.
    // BERT-multilingual often splits a name like "Sabine Hofmann" into two
    // PERSON spans because of subword tokenization. We coalesce them so the
    // user gets one [PERSON_1] instead of [PERSON_1] [PERSON_2].
    const merged: Entity[] = [];
    for (const ent of entities) {
      const last = merged[merged.length - 1];
      if (
        last !== undefined &&
        last.type === ent.type &&
        last.category === ent.category &&
        ent.start > last.end &&
        ent.start - last.end <= 2 &&
        /^\s+$/.test(text.slice(last.end, ent.start))
      ) {
        const newEnd = ent.end;
        merged[merged.length - 1] = {
          ...last,
          end: newEnd,
          text: text.slice(last.start, newEnd),
          confidence: Math.max(last.confidence, ent.confidence),
        };
      } else {
        merged.push(ent);
      }
    }

    return merged;
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
