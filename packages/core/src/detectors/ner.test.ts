/**
 * Tests for NerDetector.
 *
 * All tests use a mock pipeline factory — no real model is loaded.
 * The mock returns deterministic hand-crafted outputs for controlled inputs.
 *
 * Integration tests that run the real model are in ner.integration.test.ts.
 */
import { describe, it, expect, vi } from 'vitest';
import { NerDetector } from './ner.js';
import type { NerOptions, NerProgressEvent } from './ner.js';

// ---------------------------------------------------------------------------
// Mock pipeline factory helpers
// ---------------------------------------------------------------------------

/** Shape of a raw entity as returned by the HF pipeline. */
interface MockRawEntity {
  entity_group?: string;
  entity?: string;
  word: string;
  start: number;
  end: number;
  score: number;
}

/** Build a mock pipeline factory that always returns the given raw entities. */
function makeMockFactory(rawEntities: MockRawEntity[]) {
  const mockPipe = vi.fn().mockResolvedValue(rawEntities);
  mockPipe.dispose = vi.fn().mockResolvedValue(undefined);

  const factory = vi.fn().mockResolvedValue(mockPipe);
  return { factory, mockPipe };
}

/** Build a NerDetector with the given raw entities and options. */
function buildDetector(
  rawEntities: MockRawEntity[],
  opts?: Omit<NerOptions, '_pipelineFactory'>
): {
  detector: NerDetector;
  factory: ReturnType<typeof vi.fn>;
  mockPipe: ReturnType<typeof vi.fn>;
} {
  const { factory, mockPipe } = makeMockFactory(rawEntities);
  const detector = new NerDetector({ ...opts, _pipelineFactory: factory });
  return { detector, factory, mockPipe };
}

// ---------------------------------------------------------------------------
// Lazy loading / idempotency
// ---------------------------------------------------------------------------

describe('lazy loading', () => {
  it('does NOT call the factory during construction', () => {
    const { factory } = buildDetector([]);
    expect(factory).not.toHaveBeenCalled();
  });

  it('calls the factory on first detect()', async () => {
    const { detector, factory } = buildDetector([]);
    await detector.detect('hello');
    expect(factory).toHaveBeenCalledTimes(1);
  });

  it('ready() is idempotent — factory called only once', async () => {
    const { detector, factory } = buildDetector([]);
    await detector.ready();
    await detector.ready();
    await detector.ready();
    expect(factory).toHaveBeenCalledTimes(1);
  });

  it('calling detect() twice only loads the factory once', async () => {
    const { detector, factory } = buildDetector([]);
    await detector.detect('hello');
    await detector.detect('world');
    expect(factory).toHaveBeenCalledTimes(1);
  });

  it('detect() triggers load when ready() has not been called', async () => {
    const { detector, factory } = buildDetector([]);
    // Never called ready(); detect() must trigger lazy load
    const entities = await detector.detect('test');
    expect(factory).toHaveBeenCalledTimes(1);
    expect(entities).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// Entity mapping
// ---------------------------------------------------------------------------

describe('entity mapping — PER → PERSON / person', () => {
  it('maps PER to type PERSON and category person', async () => {
    const { detector } = buildDetector([
      { entity_group: 'PER', word: 'Martin Müller', start: 7, end: 20, score: 0.99 },
    ]);
    // Source text must contain the word at the given offsets
    const text = 'Hallo, Martin Müller war hier';
    const entities = await detector.detect(text);
    expect(entities).toHaveLength(1);
    const e = entities[0]!;
    expect(e.type).toBe('PERSON');
    expect(e.category).toBe('person');
    expect(e.source).toBe('ner');
    expect(e.confidence).toBe(0.99);
    expect(e.start).toBe(7);
    expect(e.end).toBe(20);
    expect(e.text).toBe('Martin Müller');
  });

  it('entity.text equals text.slice(start, end)', async () => {
    const text = 'Hallo, Martin Müller war hier';
    const { detector } = buildDetector([
      { entity_group: 'PER', word: 'Martin Müller', start: 7, end: 20, score: 0.99 },
    ]);
    const [e] = await detector.detect(text);
    expect(e).toBeDefined();
    expect(text.slice(e!.start, e!.end)).toBe(e!.text);
  });
});

describe('entity mapping — ORG → ORG / organization', () => {
  it('maps ORG to type ORG and category organization', async () => {
    const text = 'bei Siemens AG arbeitet';
    const { detector } = buildDetector([
      { entity_group: 'ORG', word: 'Siemens AG', start: 4, end: 14, score: 0.95 },
    ]);
    const [e] = await detector.detect(text);
    expect(e).toBeDefined();
    expect(e!.type).toBe('ORG');
    expect(e!.category).toBe('organization');
    expect(e!.text).toBe('Siemens AG');
    expect(text.slice(e!.start, e!.end)).toBe(e!.text);
  });
});

describe('entity mapping — LOC → LOCATION / address', () => {
  it('maps LOC to type LOCATION and category address', async () => {
    const text = 'in München wohnt';
    const { detector } = buildDetector([
      { entity_group: 'LOC', word: 'München', start: 3, end: 10, score: 0.97 },
    ]);
    const [e] = await detector.detect(text);
    expect(e).toBeDefined();
    expect(e!.type).toBe('LOCATION');
    expect(e!.category).toBe('address');
    expect(e!.text).toBe('München');
    expect(text.slice(e!.start, e!.end)).toBe(e!.text);
  });
});

describe('entity mapping — MISC is dropped', () => {
  it('drops MISC entities entirely', async () => {
    const text = 'das MISC-Wort';
    const { detector } = buildDetector([
      { entity_group: 'MISC', word: 'MISC-Wort', start: 4, end: 13, score: 0.99 },
    ]);
    const entities = await detector.detect(text);
    expect(entities).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// minConfidence filtering
// ---------------------------------------------------------------------------

describe('minConfidence filtering', () => {
  it('emits entity at exactly minConfidence', async () => {
    const text = 'Hello Bob here';
    const { detector } = buildDetector(
      [{ entity_group: 'PER', word: 'Bob', start: 6, end: 9, score: 0.85 }],
      { minConfidence: 0.85 }
    );
    const entities = await detector.detect(text);
    expect(entities).toHaveLength(1);
  });

  it('drops entity just below minConfidence', async () => {
    const text = 'Hello Bob here';
    const { detector } = buildDetector(
      [{ entity_group: 'PER', word: 'Bob', start: 6, end: 9, score: 0.84 }],
      { minConfidence: 0.85 }
    );
    const entities = await detector.detect(text);
    expect(entities).toHaveLength(0);
  });

  it('respects custom minConfidence = 0.5', async () => {
    const text = 'Hello Bob here';
    const { detector } = buildDetector(
      [
        { entity_group: 'PER', word: 'Bob', start: 6, end: 9, score: 0.51 },
        { entity_group: 'PER', word: 'Bob', start: 6, end: 9, score: 0.49 },
      ],
      { minConfidence: 0.5 }
    );
    // Only the 0.51 entity passes
    const entities = await detector.detect(text);
    expect(entities).toHaveLength(1);
    expect(entities[0]!.confidence).toBe(0.51);
  });
});

// ---------------------------------------------------------------------------
// Whitespace-padded range trimming
// ---------------------------------------------------------------------------

describe('whitespace-padded range trimming', () => {
  it('trims leading space from word and adjusts start offset', async () => {
    // The mock returns word: ' Bob' (leading space), start: 5, end: 9.
    // 'say   Bob here': s(0)a(1)y(2) (3) (4) (5)B(6)o(7)b(8) (9)...
    // text[5:9] === ' Bob', so after trim: word='Bob', start=6, end=9.
    const text = 'say   Bob here';
    const { detector } = buildDetector([
      { entity_group: 'PER', word: ' Bob', start: 5, end: 9, score: 0.9 },
    ]);
    const [e] = await detector.detect(text);
    expect(e).toBeDefined();
    expect(e!.text).toBe('Bob');
    expect(e!.start).toBe(6);
    expect(e!.end).toBe(9);
    expect(text.slice(e!.start, e!.end)).toBe('Bob');
  });

  it('trims trailing space from word and adjusts end offset', async () => {
    const text = 'Hi Alice  there';
    // word: 'Alice ' (trailing space), start: 3, end: 9
    const { detector } = buildDetector([
      { entity_group: 'PER', word: 'Alice ', start: 3, end: 9, score: 0.9 },
    ]);
    const [e] = await detector.detect(text);
    expect(e).toBeDefined();
    expect(e!.text).toBe('Alice');
    expect(e!.start).toBe(3);
    expect(e!.end).toBe(8);
    expect(text.slice(e!.start, e!.end)).toBe('Alice');
  });
});

// ---------------------------------------------------------------------------
// Sanity check: broken offsets are dropped, not thrown
// ---------------------------------------------------------------------------

describe('sanity check: broken offsets dropped silently', () => {
  it('drops entity when text.slice(start, end) does not match word after trimming', async () => {
    // The word 'Alice' at offsets 0..5 in text 'Hello World'
    // text.slice(0, 5) === 'Hello' !== 'Alice' → must be dropped
    const text = 'Hello World';
    const { detector } = buildDetector([
      { entity_group: 'PER', word: 'Alice', start: 0, end: 5, score: 0.99 },
    ]);
    const entities = await detector.detect(text);
    // Entity is silently dropped because the slice doesn't match
    expect(entities).toHaveLength(0);
  });

  it('keeps entity when offsets are correct', async () => {
    const text = 'Hello Alice World';
    const { detector } = buildDetector([
      { entity_group: 'PER', word: 'Alice', start: 6, end: 11, score: 0.99 },
    ]);
    const [e] = await detector.detect(text);
    expect(e).toBeDefined();
    expect(e!.text).toBe('Alice');
  });
});

// ---------------------------------------------------------------------------
// dispose()
// ---------------------------------------------------------------------------

describe('dispose()', () => {
  it('calls dispose on the underlying pipeline', async () => {
    const { detector, mockPipe } = buildDetector([]);
    await detector.ready();
    await detector.dispose();
    expect(mockPipe.dispose).toHaveBeenCalledTimes(1);
  });

  it('dispose() runs without error before ready()', async () => {
    const { detector } = buildDetector([]);
    // Never called ready() — dispose should be a no-op
    await expect(detector.dispose()).resolves.toBeUndefined();
  });

  it('dispose() runs without error after dispose()', async () => {
    const { detector } = buildDetector([]);
    await detector.ready();
    await detector.dispose();
    // Second dispose — pipeline is null, should not throw
    await expect(detector.dispose()).resolves.toBeUndefined();
  });

  it('dispose() mid-flight: detect() returns [] instead of throwing', async () => {
    // Build a factory whose pipeline call never resolves during this test so we
    // can interleave dispose() between ready() and the pipe() call.  We achieve
    // the race by making the pipeline callable block until we release it.
    let releasePipe!: () => void;
    const pipeBlocked = new Promise<void>((resolve) => {
      releasePipe = resolve;
    });

    const mockPipe = vi.fn().mockImplementation(() => pipeBlocked.then(() => []));
    mockPipe.dispose = vi.fn().mockResolvedValue(undefined);
    const factory = vi.fn().mockResolvedValue(mockPipe);

    const detector = new NerDetector({ _pipelineFactory: factory });

    // Start detect() but do NOT await yet — it will block inside pipe(text)
    const detectPromise = detector.detect('hello');

    // Yield to let detect() get past ready() and into pipe(text)
    await Promise.resolve();

    // Call dispose() — this nulls this.pipeline
    await detector.dispose();

    // Unblock the in-flight pipe call so detect() can finish
    releasePipe();

    // detect() must resolve to [] without throwing
    await expect(detectPromise).resolves.toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// Progress callback
// ---------------------------------------------------------------------------

describe('progress callback', () => {
  it('forwards progress events from the factory', async () => {
    const progressEvents: NerProgressEvent[] = [];
    const onProgress = (e: NerProgressEvent) => progressEvents.push(e);

    // Create a factory that fires a progress event before resolving
    const mockPipe = vi.fn().mockResolvedValue([]);
    mockPipe.dispose = vi.fn().mockResolvedValue(undefined);

    const factory = vi
      .fn()
      .mockImplementation(
        async (
          _model: string,
          _opts: Record<string, unknown>,
          callback?: (e: NerProgressEvent) => void
        ) => {
          // Simulate a progress event fired by the factory
          callback?.({
            status: 'download',
            file: 'model.onnx',
            loaded: 0,
            total: 100,
            progress: 0,
          });
          callback?.({
            status: 'progress',
            file: 'model.onnx',
            loaded: 50,
            total: 100,
            progress: 0.5,
          });
          callback?.({ status: 'done' });
          return mockPipe;
        }
      );

    const detector = new NerDetector({ onProgress, _pipelineFactory: factory });
    await detector.ready();

    expect(progressEvents).toHaveLength(3);
    expect(progressEvents[0]).toEqual({
      status: 'download',
      file: 'model.onnx',
      loaded: 0,
      total: 100,
      progress: 0,
    });
    expect(progressEvents[1]).toMatchObject({ status: 'progress', progress: 0.5 });
    expect(progressEvents[2]).toEqual({ status: 'done' });
  });
});

// ---------------------------------------------------------------------------
// Multiple entity types in one call
// ---------------------------------------------------------------------------

describe('multiple entity types in single detect() call', () => {
  it('returns PER, ORG, and LOC entities sorted by start offset', async () => {
    const text = 'Martin Müller arbeitet bei Siemens in München';
    //             01234567890123456789012345678901234567890123456
    //             0         1         2         3         4
    // 'Martin Müller' = 0..13 (13 chars because Ü is 1 char)
    // 'Siemens' = 27..34
    // 'München' = 38..45
    const { detector } = buildDetector([
      { entity_group: 'PER', word: 'Martin Müller', start: 0, end: 13, score: 0.99 },
      { entity_group: 'ORG', word: 'Siemens', start: 27, end: 34, score: 0.95 },
      { entity_group: 'LOC', word: 'München', start: 38, end: 45, score: 0.97 },
    ]);
    const entities = await detector.detect(text);
    expect(entities).toHaveLength(3);
    expect(entities[0]!.type).toBe('PERSON');
    expect(entities[1]!.type).toBe('ORG');
    expect(entities[2]!.type).toBe('LOCATION');
    // Verify all offsets
    for (const e of entities) {
      expect(text.slice(e.start, e.end)).toBe(e.text);
    }
  });
});

// ---------------------------------------------------------------------------
// B-/I- prefix stripping
// ---------------------------------------------------------------------------

describe('B-/I- prefix stripping', () => {
  it('handles B-PER prefix (non-aggregated output)', async () => {
    const text = 'Hallo Anna hier';
    const { detector } = buildDetector([
      { entity: 'B-PER', word: 'Anna', start: 6, end: 10, score: 0.92 },
    ]);
    const [e] = await detector.detect(text);
    expect(e).toBeDefined();
    expect(e!.type).toBe('PERSON');
  });

  it('handles I-ORG prefix', async () => {
    const text = 'bei BMW AG';
    const { detector } = buildDetector([
      { entity: 'I-ORG', word: 'BMW', start: 4, end: 7, score: 0.91 },
    ]);
    const [e] = await detector.detect(text);
    expect(e).toBeDefined();
    expect(e!.type).toBe('ORG');
    expect(e!.category).toBe('organization');
  });
});
