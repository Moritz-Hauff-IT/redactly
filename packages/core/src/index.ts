// @redactly/core — Detection & masking engine (framework-agnostic)

// Shared types
export type { Entity, EntityCategory, EntityType, Detector } from './types.js';

// Regex detector
export { RegexDetector } from './detectors/regex.js';

// NER detector (lazy model load, browser + Node compatible)
export { NerDetector } from './detectors/ner.js';
export type { NerOptions, NerProgressEvent } from './detectors/ner.js';

// WebLLM model catalog — safe to re-export (tree-shakeable constants and types only).
// Do NOT re-export WebLlmDetector here — import it via '@redactly/core/llm' sub-path only.
export { SUPPORTED_WEBLLM_MODELS } from './detectors/llm.js';
export type { WebLlmModelInfo, WebLlmOptions, WebLlmProgressEvent } from './detectors/llm.js';

// Validators (useful for consumers wanting to validate independently)
export { luhn, ibanMod97, shannonEntropy } from './detectors/validators.js';

// Masker
export { mask, createMapping, serializeMapping, deserializeMapping } from './masker.js';
export type { Mapping, MaskOptions, MaskResult } from './masker.js';

// Restorer
export { restore } from './restorer.js';
export type { RestoreOptions, RestoreResult } from './restorer.js';

// Redactor (irreversible — no mapping)
export { redact } from './redactor.js';
export type { RedactOptions, RedactResult } from './redactor.js';

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
  writeAsFormat,
  extractZip,
  packZip,
} from './parsers/index.js';
export type { WriteResult, ZipManifest, ZipEntry, ZipPackEntry } from './parsers/index.js';

// LLM file orchestrator
export { generateFilePlan, heuristicPlan } from './orchestrator.js';
export type {
  FileAction,
  FilePlanEntry,
  FilePlan,
  ManifestEntryForLlm,
  ChatEngine,
} from './orchestrator.js';
