// @de-pii/core — Detection & masking engine (framework-agnostic)

// Shared types
export type { Entity, EntityCategory, EntityType, Detector } from './types.js';

// Regex detector
export { RegexDetector } from './detectors/regex.js';

// NER detector (lazy model load, browser + Node compatible)
export { NerDetector } from './detectors/ner.js';
export type { NerOptions, NerProgressEvent } from './detectors/ner.js';

// WebLLM model catalog — safe to re-export (tree-shakeable constants and types only).
// Do NOT re-export WebLlmDetector here — import it via '@de-pii/core/llm' sub-path only.
export { SUPPORTED_WEBLLM_MODELS } from './detectors/llm.js';
export type { WebLlmModelInfo, WebLlmOptions, WebLlmProgressEvent } from './detectors/llm.js';

// Validators (useful for consumers wanting to validate independently)
export { luhn, ibanMod97, shannonEntropy } from './detectors/validators.js';

// Masker
export { mask, createMapping } from './masker.js';
export type { Mapping, MaskOptions, MaskResult } from './masker.js';

// Restorer
export { restore } from './restorer.js';
export type { RestoreOptions, RestoreResult } from './restorer.js';

// Pipeline orchestrator
export { Pipeline } from './pipeline.js';
export type { PipelineOptions, PipelineResult } from './pipeline.js';

// File parsers
export type { ParseResult, SupportedFormat } from './parsers/index.js';
export {
  parseTxtBlob,
  parseMdBlob,
  parseEmlBlob,
  parsePdfBlob,
  parseDocxBlob,
  detectFormat,
  parseFile,
  UnsupportedFormatError,
} from './parsers/index.js';
