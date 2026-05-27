// @de-pii/core — Detection & masking engine (framework-agnostic)

// Shared types
export type { Entity, EntityCategory, EntityType, Detector } from './types.js';

// Regex detector
export { RegexDetector } from './detectors/regex.js';

// Validators (useful for consumers wanting to validate independently)
export { luhn, ibanMod97, shannonEntropy } from './detectors/validators.js';
