/**
 * RegexDetector - runs all regex rules against a text and returns a sorted
 * list of Entity matches. Overlap deduplication is handled by the pipeline
 * (Task 5); this module just collects and sorts.
 */
import type { Detector, Entity } from '../types.js';
import { contactRules, type RegexRule } from './patterns/contact.js';
import { financialRules } from './patterns/financial.js';
import { secretRules } from './patterns/secrets.js';
import { dachRules } from './patterns/dach.js';

/**
 * Rules where the actual entity text lives in a capture group rather than the
 * full match. These rules need special handling to extract the right offset.
 */
const CAPTURE_GROUP_RULES = new Set<string>(['AWS_SECRET_KEY', 'GCP_KEY', 'AZURE_KEY']);

/** Window (chars) around a match in which to look for context words. */
const CONTEXT_WINDOW = 60;

/**
 * Check whether any of the rule's context words appears within ±CONTEXT_WINDOW
 * chars of the given match position. Case-insensitive.
 */
function hasContextNear(text: string, contextWords: string[], start: number, end: number): boolean {
  const windowStart = Math.max(0, start - CONTEXT_WINDOW);
  const windowEnd = Math.min(text.length, end + CONTEXT_WINDOW);
  const window = text.slice(windowStart, windowEnd).toLowerCase();
  for (const word of contextWords) {
    if (window.includes(word.toLowerCase())) return true;
  }
  return false;
}

export class RegexDetector implements Detector {
  readonly name = 'regex';

  private readonly rules: RegexRule[];

  constructor(
    rules: RegexRule[] = [...contactRules, ...financialRules, ...secretRules, ...dachRules]
  ) {
    this.rules = rules;
  }

  detect(text: string): Entity[] {
    const entities: Entity[] = [];

    for (const rule of this.rules) {
      // Reset lastIndex so re-use of the pattern across calls is safe.
      rule.pattern.lastIndex = 0;

      let match: RegExpExecArray | null;
      while ((match = rule.pattern.exec(text)) !== null) {
        let start = match.index;
        let entityText: string;

        if (CAPTURE_GROUP_RULES.has(rule.type) && match[1] !== undefined) {
          const groupOffsetInMatch = match[0].indexOf(match[1]);
          const captureStart = match.index + groupOffsetInMatch;
          start = captureStart;
          entityText = match[1];
        } else if (rule.type === 'ENV_SECRET' && match[1] !== undefined) {
          const rawValue = match[1];
          const groupOffsetInMatch = match[0].indexOf(rawValue);
          start = match.index + groupOffsetInMatch;
          entityText = rawValue;
        } else {
          entityText = match[0];
        }

        const end = start + entityText.length;

        // Secondary validation (Luhn, IBAN mod-97, entropy, etc.)
        if (rule.validate && !rule.validate(entityText)) {
          continue;
        }

        // Sanity check: text slice must equal what we matched
        if (text.slice(start, end) !== entityText) {
          continue;
        }

        // Context check: boost confidence if context word nearby, OR drop
        // entirely when `requiresContext` is set and no context word was found.
        let confidence = rule.confidence;
        if (rule.context && rule.context.length > 0) {
          const ctxFound = hasContextNear(text, rule.context, start, end);
          if (ctxFound) {
            confidence = Math.min(0.99, confidence + 0.3);
          } else if (rule.requiresContext) {
            continue;
          }
        }

        entities.push({
          start,
          end,
          type: rule.type,
          category: rule.category,
          text: entityText,
          confidence,
          source: 'regex',
        });
      }

      // Reset lastIndex after each rule to avoid cross-iteration issues
      rule.pattern.lastIndex = 0;
    }

    // Sort by start offset; stable sort guaranteed in ES2019+
    entities.sort((a, b) => a.start - b.start || b.end - a.end);

    return entities;
  }
}
