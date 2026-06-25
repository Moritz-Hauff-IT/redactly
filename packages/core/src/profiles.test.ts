import { describe, expect, it } from 'vitest';
import {
  normalizeSettings,
  parseProfile,
  serializeProfile,
  type ProfileSettings,
} from './profiles.js';

const full: ProfileSettings = {
  categories: ['person', 'contact'],
  nerEnabled: true,
  webllmEnabled: false,
  webllmModelId: 'Llama-3.2-3B-Instruct-q4f16_1-MLC',
  webllmTextPii: true,
  alwaysMask: ['Projekt Zeus'],
  neverMask: ['Bern'],
  redactMode: true,
  minConfidence: 0.5,
  columnRules: ['email'],
  jsonKeyRules: ['ssn'],
  regexRules: ['KND-\\d+'],
  placeholderFormat: 'angle',
  fakeValues: true,
  customTypes: [{ label: 'Kundennummer', pattern: 'KND-\\d+' }],
};

describe('profiles', () => {
  it('round-trips a profile through serialize → parse', () => {
    const json = serializeProfile('Kunde A', full);
    const back = parseProfile(json);
    expect(back.name).toBe('Kunde A');
    expect(back.settings).toEqual(full);
  });

  it('clamps minConfidence into 0..0.95', () => {
    expect(normalizeSettings({ minConfidence: 5 }).minConfidence).toBe(0.95);
    expect(normalizeSettings({ minConfidence: -1 }).minConfidence).toBe(0);
    expect(normalizeSettings({ minConfidence: Number.NaN }).minConfidence).toBe(0);
  });

  it('drops non-string entries from list fields', () => {
    const s = normalizeSettings({ alwaysMask: ['ok', 5, null, 'fine'] });
    expect(s.alwaysMask).toEqual(['ok', 'fine']);
  });

  it('fills sensible defaults for a partial settings object', () => {
    const s = normalizeSettings({ categories: ['person'] });
    expect(s.nerEnabled).toBe(false);
    expect(s.webllmTextPii).toBe(true);
    expect(s.redactMode).toBe(false);
    expect(s.columnRules).toEqual([]);
    expect(s.placeholderFormat).toBe('brackets');
    expect(s.fakeValues).toBe(false);
    expect(s.customTypes).toEqual([]);
  });

  it('rejects an unknown placeholderFormat, keeping the bracket default', () => {
    expect(normalizeSettings({ placeholderFormat: 'weird' }).placeholderFormat).toBe('brackets');
  });

  it('rejects a file that is not a Redactly profile', () => {
    expect(() => parseProfile('{"format":"something-else"}')).toThrow(/Profil/);
    expect(() => parseProfile('not json')).toThrow(/JSON/);
  });

  it('falls back to a default name when none is given', () => {
    const json = JSON.stringify({ format: 'redactly-profile', version: 1, settings: {} });
    expect(parseProfile(json).name).toBe('Profil');
  });
});
