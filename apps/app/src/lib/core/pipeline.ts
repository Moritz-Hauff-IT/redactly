import { Pipeline } from '@de-pii/core/pipeline';
import { RegexDetector } from '@de-pii/core/regex';
import type { Entity } from '@de-pii/core/types';

const pipeline = new Pipeline({
  detectors: [new RegexDetector()],
});

/**
 * Analyze text for PII entities.
 * Uses only the RegexDetector singleton for now; NER is added in task 9.
 */
export async function analyze(text: string): Promise<Entity[]> {
  const result = await pipeline.analyze(text);
  return result.entities;
}
