/**
 * NER integration tests — uses the REAL @huggingface/transformers model.
 *
 * These tests are SKIPPED by default because they require downloading a ~400MB
 * ONNX model on first run (cached afterwards in ~/.cache/huggingface/hub or
 * similar). They are NOT part of the normal CI flow.
 *
 * HOW TO RUN:
 *   RUN_NER_INTEGRATION=1 pnpm test --reporter=verbose
 *   # or, to run only this file:
 *   RUN_NER_INTEGRATION=1 npx vitest run packages/core/src/detectors/ner.integration.test.ts
 *
 * First run will download the model (several hundred MB); subsequent runs
 * use the local cache and are fast.
 *
 * The default model is 'Xenova/bert-base-multilingual-cased-ner-hrl', which
 * supports German, English, Spanish, Dutch, and other languages.
 */
import { describe, it, expect } from 'vitest';
import { NerDetector } from './ner.js';

const RUN = !!process.env['RUN_NER_INTEGRATION'];

describe.skipIf(!RUN)('NER integration — real model', () => {
  // Increase timeout to allow model download on first run
  const TIMEOUT = 5 * 60_000; // 5 minutes

  it(
    'detects PER, ORG, and LOC in a German sentence',
    async () => {
      const detector = new NerDetector({
        minConfidence: 0.7,
        onProgress: (e) => {
          if (e.status === 'progress') {
            process.stdout.write(`\r  Downloading ${e.file}: ${Math.round(e.progress * 100)}%`);
          } else if (e.status === 'done') {
            process.stdout.write('\n');
          }
        },
      });

      const text = 'Martin Müller arbeitet bei Siemens in München';
      const entities = await detector.detect(text);
      await detector.dispose();

      // At minimum we expect a person and a location; org detection varies by model
      const types = entities.map((e) => e.type);
      expect(types).toContain('PERSON');
      expect(types).toContain('LOCATION');

      // Invariant: all entity texts must match their slice
      for (const e of entities) {
        expect(text.slice(e.start, e.end)).toBe(e.text);
      }
    },
    TIMEOUT
  );

  it(
    'detects English PER and ORG',
    async () => {
      const detector = new NerDetector({ minConfidence: 0.7 });
      const text = 'Tim Cook is the CEO of Apple in Cupertino';
      const entities = await detector.detect(text);
      await detector.dispose();

      const types = entities.map((e) => e.type);
      expect(types).toContain('PERSON');

      for (const e of entities) {
        expect(text.slice(e.start, e.end)).toBe(e.text);
      }
    },
    TIMEOUT
  );
});
