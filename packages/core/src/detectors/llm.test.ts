/**
 * Tests for WebLlmDetector.
 *
 * All tests use a mock engine factory — no real model is loaded or WebGPU required.
 * The mock returns deterministic hand-crafted outputs for controlled inputs.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { WebLlmDetector, SUPPORTED_WEBLLM_MODELS } from './llm.js';
import type { WebLlmOptions, WebLlmProgressEvent } from './llm.js';

// ---------------------------------------------------------------------------
// Mock engine factory helpers
// ---------------------------------------------------------------------------

interface MockEngineOptions {
  /** JSON string the engine will return */
  response?: string;
  /** If true, throw on create() */
  failCreate?: boolean;
  /** If true, throw on unload() */
  failUnload?: boolean;
}

/** Build a mock MLC engine that returns a controlled response. */
function makeMockEngine(opts: MockEngineOptions = {}) {
  const mockUnload = vi.fn().mockResolvedValue(undefined);

  const mockCreate = vi.fn().mockImplementation(async () => {
    if (opts.failCreate) throw new Error('engine create failed');
    return {
      choices: [{ message: { content: opts.response ?? '{"entities":[]}' } }],
    };
  });

  const mockEngine = {
    chat: {
      completions: {
        create: mockCreate,
      },
    },
    unload: mockUnload,
  };

  return { mockEngine, mockCreate, mockUnload };
}

/** Build a mock engine factory. */
function makeMockFactory(opts: MockEngineOptions = {}) {
  const { mockEngine, mockCreate, mockUnload } = makeMockEngine(opts);
  const factory = vi.fn().mockResolvedValue(mockEngine);
  return { factory, mockCreate, mockUnload };
}

/** Build a WebLlmDetector with a mock factory and given options. */
function buildDetector(
  opts: MockEngineOptions = {},
  detectorOpts?: Partial<Omit<WebLlmOptions, '_engineFactory' | 'modelId'>>
): {
  detector: WebLlmDetector;
  factory: ReturnType<typeof vi.fn>;
  mockCreate: ReturnType<typeof vi.fn>;
  mockUnload: ReturnType<typeof vi.fn>;
} {
  const { factory, mockCreate, mockUnload } = makeMockFactory(opts);
  const detector = new WebLlmDetector({
    modelId: 'Llama-3.2-3B-Instruct-q4f16_1-MLC',
    _engineFactory: factory,
    ...detectorOpts,
  });
  return { detector, factory, mockCreate, mockUnload };
}

// ---------------------------------------------------------------------------
// SUPPORTED_WEBLLM_MODELS catalog
// ---------------------------------------------------------------------------

describe('SUPPORTED_WEBLLM_MODELS', () => {
  it('exports exactly 3 model entries', () => {
    expect(SUPPORTED_WEBLLM_MODELS).toHaveLength(3);
  });

  it('has a "fast" model', () => {
    expect(SUPPORTED_WEBLLM_MODELS.some((m) => m.recommendedFor === 'fast')).toBe(true);
  });

  it('has a "balanced" model', () => {
    expect(SUPPORTED_WEBLLM_MODELS.some((m) => m.recommendedFor === 'balanced')).toBe(true);
  });

  it('has a "best" model', () => {
    expect(SUPPORTED_WEBLLM_MODELS.some((m) => m.recommendedFor === 'best')).toBe(true);
  });

  it('all entries have required fields', () => {
    for (const m of SUPPORTED_WEBLLM_MODELS) {
      expect(typeof m.id).toBe('string');
      expect(typeof m.label).toBe('string');
      expect(typeof m.sizeMB).toBe('number');
      expect(typeof m.vramMB).toBe('number');
      expect(typeof m.description).toBe('string');
      expect(['fast', 'balanced', 'best']).toContain(m.recommendedFor);
    }
  });
});

// ---------------------------------------------------------------------------
// isSupported()
// ---------------------------------------------------------------------------

describe('isSupported()', () => {
  let originalNavigator: typeof globalThis.navigator;

  beforeEach(() => {
    originalNavigator = globalThis.navigator;
  });

  afterEach(() => {
    Object.defineProperty(globalThis, 'navigator', {
      value: originalNavigator,
      writable: true,
      configurable: true,
    });
  });

  it('returns true when navigator.gpu exists', () => {
    Object.defineProperty(globalThis, 'navigator', {
      value: { gpu: {} },
      writable: true,
      configurable: true,
    });
    expect(WebLlmDetector.isSupported()).toBe(true);
  });

  it('returns false when navigator has no gpu property', () => {
    Object.defineProperty(globalThis, 'navigator', {
      value: {},
      writable: true,
      configurable: true,
    });
    expect(WebLlmDetector.isSupported()).toBe(false);
  });

  it('returns false when navigator is undefined', () => {
    Object.defineProperty(globalThis, 'navigator', {
      value: undefined,
      writable: true,
      configurable: true,
    });
    expect(WebLlmDetector.isSupported()).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Lazy loading / idempotency
// ---------------------------------------------------------------------------

describe('lazy loading', () => {
  it('does NOT call the factory during construction', () => {
    const { factory } = buildDetector();
    expect(factory).not.toHaveBeenCalled();
  });

  it('calls the factory on first detect()', async () => {
    const { detector, factory } = buildDetector();
    await detector.detect('hello');
    expect(factory).toHaveBeenCalledTimes(1);
  });

  it('ready() is idempotent — factory called only once', async () => {
    const { detector, factory } = buildDetector();
    await detector.ready();
    await detector.ready();
    await detector.ready();
    expect(factory).toHaveBeenCalledTimes(1);
  });

  it('calling detect() twice only loads the factory once', async () => {
    const { detector, factory } = buildDetector();
    await detector.detect('hello');
    await detector.detect('world');
    expect(factory).toHaveBeenCalledTimes(1);
  });

  it('detect() triggers load when ready() has not been called', async () => {
    const { detector, factory } = buildDetector();
    const entities = await detector.detect('test');
    expect(factory).toHaveBeenCalledTimes(1);
    expect(entities).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// Entity parsing and mapping
// ---------------------------------------------------------------------------

describe('entity parsing and type mapping', () => {
  it('parses PERSON entity and maps correctly', async () => {
    const response = JSON.stringify({
      entities: [{ text: 'Martin Müller', type: 'PERSON', confidence: 0.9 }],
    });
    const { detector } = buildDetector({ response });
    const text = 'Hallo, Martin Müller war hier';
    const entities = await detector.detect(text);
    expect(entities).toHaveLength(1);
    const e = entities[0]!;
    expect(e.type).toBe('PERSON');
    expect(e.category).toBe('person');
    expect(e.source).toBe('llm');
    expect(e.text).toBe('Martin Müller');
    expect(e.start).toBe(7);
    expect(e.end).toBe(20);
    expect(text.slice(e.start, e.end)).toBe(e.text);
  });

  it('maps ORG to type ORG and category organization', async () => {
    const response = JSON.stringify({
      entities: [{ text: 'Siemens AG', type: 'ORG', confidence: 0.85 }],
    });
    const { detector } = buildDetector({ response });
    const text = 'bei Siemens AG arbeitet';
    const entities = await detector.detect(text);
    expect(entities).toHaveLength(1);
    expect(entities[0]!.type).toBe('ORG');
    expect(entities[0]!.category).toBe('organization');
  });

  it('maps LOCATION to type LOCATION and category address', async () => {
    const response = JSON.stringify({
      entities: [{ text: 'München', type: 'LOCATION', confidence: 0.8 }],
    });
    const { detector } = buildDetector({ response });
    const text = 'in München wohnt';
    const entities = await detector.detect(text);
    expect(entities).toHaveLength(1);
    expect(entities[0]!.type).toBe('LOCATION');
    expect(entities[0]!.category).toBe('address');
  });

  it('maps ADDRESS to LOCATION/address', async () => {
    const response = JSON.stringify({
      entities: [{ text: 'Hauptstraße 1', type: 'ADDRESS', confidence: 0.75 }],
    });
    const { detector } = buildDetector({ response });
    const text = 'wohnhaft in Hauptstraße 1';
    const entities = await detector.detect(text);
    expect(entities).toHaveLength(1);
    expect(entities[0]!.type).toBe('LOCATION');
    expect(entities[0]!.category).toBe('address');
  });

  it('maps EMAIL to EMAIL/contact', async () => {
    const response = JSON.stringify({
      entities: [{ text: 'test@example.com', type: 'EMAIL', confidence: 0.95 }],
    });
    const { detector } = buildDetector({ response });
    const text = 'schreib an test@example.com';
    const entities = await detector.detect(text);
    expect(entities[0]!.type).toBe('EMAIL');
    expect(entities[0]!.category).toBe('contact');
  });

  it('maps PHONE to PHONE/contact', async () => {
    const response = JSON.stringify({
      entities: [{ text: '+49 123 456789', type: 'PHONE', confidence: 0.9 }],
    });
    const { detector } = buildDetector({ response });
    const text = 'ruf mich an: +49 123 456789';
    const entities = await detector.detect(text);
    expect(entities[0]!.type).toBe('PHONE');
    expect(entities[0]!.category).toBe('contact');
  });

  it('maps FINANCIAL to IBAN/financial', async () => {
    const response = JSON.stringify({
      entities: [{ text: 'DE89 3704 0044 0532 0130 00', type: 'FINANCIAL', confidence: 0.88 }],
    });
    const { detector } = buildDetector({ response });
    const text = 'IBAN: DE89 3704 0044 0532 0130 00';
    const entities = await detector.detect(text);
    expect(entities[0]!.type).toBe('IBAN');
    expect(entities[0]!.category).toBe('financial');
  });

  it('maps SECRET to GENERIC_SECRET/secret', async () => {
    const response = JSON.stringify({
      entities: [{ text: 'sk-abc123', type: 'SECRET', confidence: 0.92 }],
    });
    const { detector } = buildDetector({ response });
    const text = 'api_key = sk-abc123';
    const entities = await detector.detect(text);
    expect(entities[0]!.type).toBe('GENERIC_SECRET');
    expect(entities[0]!.category).toBe('secret');
  });

  it('drops unknown type labels', async () => {
    const response = JSON.stringify({
      entities: [{ text: 'something', type: 'UNKNOWN_TYPE', confidence: 0.9 }],
    });
    const { detector } = buildDetector({ response });
    const entities = await detector.detect('something here');
    expect(entities).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// Confidence filtering
// ---------------------------------------------------------------------------

describe('minConfidence filtering', () => {
  it('emits entity at exactly minConfidence', async () => {
    const response = JSON.stringify({
      entities: [{ text: 'Alice', type: 'PERSON', confidence: 0.6 }],
    });
    const { detector } = buildDetector({ response }, { minConfidence: 0.6 });
    const entities = await detector.detect('Hello Alice here');
    expect(entities).toHaveLength(1);
  });

  it('drops entity just below minConfidence', async () => {
    const response = JSON.stringify({
      entities: [{ text: 'Alice', type: 'PERSON', confidence: 0.59 }],
    });
    const { detector } = buildDetector({ response }, { minConfidence: 0.6 });
    const entities = await detector.detect('Hello Alice here');
    expect(entities).toHaveLength(0);
  });

  it('uses default minConfidence of 0.6', async () => {
    const response = JSON.stringify({
      entities: [
        { text: 'Alice', type: 'PERSON', confidence: 0.61 },
        { text: 'Bob', type: 'PERSON', confidence: 0.59 },
      ],
    });
    const { detector } = buildDetector({ response });
    const entities = await detector.detect('Hello Alice and Bob');
    expect(entities).toHaveLength(1);
    expect(entities[0]!.text).toBe('Alice');
  });
});

// ---------------------------------------------------------------------------
// Text not found in input — dropped
// ---------------------------------------------------------------------------

describe('entity text not found in input is dropped', () => {
  it('drops entity when text substring is not in input', async () => {
    const response = JSON.stringify({
      entities: [{ text: 'NonExistent Person', type: 'PERSON', confidence: 0.9 }],
    });
    const { detector } = buildDetector({ response });
    const entities = await detector.detect('Completely different text');
    expect(entities).toHaveLength(0);
  });

  it('keeps entity when text is found', async () => {
    const response = JSON.stringify({
      entities: [{ text: 'Alice', type: 'PERSON', confidence: 0.9 }],
    });
    const { detector } = buildDetector({ response });
    const entities = await detector.detect('Hello Alice here');
    expect(entities).toHaveLength(1);
  });
});

// ---------------------------------------------------------------------------
// Multiple occurrences → multiple entities
// ---------------------------------------------------------------------------

describe('multiple occurrences emit one entity per occurrence', () => {
  it('same string occurring twice → two entities', async () => {
    const response = JSON.stringify({
      entities: [{ text: 'Alice', type: 'PERSON', confidence: 0.9 }],
    });
    const { detector } = buildDetector({ response });
    const text = 'Alice called. Then Alice called again.';
    const entities = await detector.detect(text);
    expect(entities).toHaveLength(2);
    expect(entities[0]!.start).toBe(0);
    expect(entities[1]!.start).toBe(text.indexOf('Alice', 1));
    // Both must have the correct slice
    for (const e of entities) {
      expect(text.slice(e.start, e.end)).toBe('Alice');
    }
  });

  it('three occurrences → three entities', async () => {
    const response = JSON.stringify({
      entities: [{ text: 'Bob', type: 'PERSON', confidence: 0.8 }],
    });
    const { detector } = buildDetector({ response });
    const text = 'Bob said Bob is great. Bob agrees.';
    const entities = await detector.detect(text);
    expect(entities).toHaveLength(3);
  });
});

// ---------------------------------------------------------------------------
// Malformed JSON from model
// ---------------------------------------------------------------------------

describe('malformed JSON response handling', () => {
  it('returns empty array when model returns non-JSON', async () => {
    const { detector } = buildDetector({ response: 'I found no PII in the text.' });
    const entities = await detector.detect('some text');
    expect(entities).toHaveLength(0);
  });

  it('returns empty array when model returns empty entities', async () => {
    const { detector } = buildDetector({ response: '{"entities":[]}' });
    const entities = await detector.detect('some text');
    expect(entities).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// dispose()
// ---------------------------------------------------------------------------

describe('dispose()', () => {
  it('calls unload on the underlying engine', async () => {
    const { detector, mockUnload } = buildDetector();
    await detector.ready();
    await detector.dispose();
    expect(mockUnload).toHaveBeenCalledTimes(1);
  });

  it('dispose() runs without error before ready()', async () => {
    const { detector } = buildDetector();
    await expect(detector.dispose()).resolves.toBeUndefined();
  });

  it('dispose() runs without error after dispose()', async () => {
    const { detector } = buildDetector();
    await detector.ready();
    await detector.dispose();
    await expect(detector.dispose()).resolves.toBeUndefined();
  });

  it('dispose() mid-flight: detect() returns [] instead of throwing', async () => {
    let releasePipe!: () => void;
    const pipeBlocked = new Promise<void>((resolve) => {
      releasePipe = resolve;
    });

    const mockUnload = vi.fn().mockResolvedValue(undefined);
    const mockCreate = vi
      .fn()
      .mockImplementation(() =>
        pipeBlocked.then(() => ({ choices: [{ message: { content: '{"entities":[]}' } }] }))
      );
    const mockEngine = {
      chat: { completions: { create: mockCreate } },
      unload: mockUnload,
    };
    const factory = vi.fn().mockResolvedValue(mockEngine);

    const detector = new WebLlmDetector({
      modelId: 'Llama-3.2-3B-Instruct-q4f16_1-MLC',
      _engineFactory: factory,
    });

    // Start detect() but do NOT await yet
    const detectPromise = detector.detect('hello');

    // Yield to let detect() get past ready() and into create()
    await Promise.resolve();

    // Dispose — this nulls this.engine
    await detector.dispose();

    // Unblock the in-flight create call
    releasePipe();

    // detect() must resolve to [] without throwing
    await expect(detectPromise).resolves.toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// Progress callback
// ---------------------------------------------------------------------------

describe('progress callback', () => {
  it('emits init event before engine creation', async () => {
    const events: WebLlmProgressEvent[] = [];
    const onProgress = (e: WebLlmProgressEvent) => events.push(e);

    let capturedCallback:
      | ((report: { progress: number; timeElapsed: number; text: string }) => void)
      | undefined;
    const mockEngine = {
      chat: {
        completions: {
          create: vi
            .fn()
            .mockResolvedValue({ choices: [{ message: { content: '{"entities":[]}' } }] }),
        },
      },
      unload: vi.fn().mockResolvedValue(undefined),
    };
    const factory = vi.fn().mockImplementation(
      async (
        _modelId: string,
        opts: {
          initProgressCallback: (r: {
            progress: number;
            timeElapsed: number;
            text: string;
          }) => void;
        }
      ) => {
        capturedCallback = opts.initProgressCallback;
        // Fire a progress event
        capturedCallback({ progress: 0.5, timeElapsed: 100, text: 'Downloading shard 1/2' });
        return mockEngine;
      }
    );

    const detector = new WebLlmDetector({
      modelId: 'Llama-3.2-3B-Instruct-q4f16_1-MLC',
      onProgress,
      _engineFactory: factory,
    });

    await detector.ready();

    // Should have received: init, download, ready
    expect(events.some((e) => e.status === 'init')).toBe(true);
    expect(events.some((e) => e.status === 'download')).toBe(true);
    expect(events.some((e) => e.status === 'ready')).toBe(true);
  });
});
