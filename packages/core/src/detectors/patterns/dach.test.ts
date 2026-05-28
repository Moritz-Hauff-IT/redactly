import { describe, expect, it } from 'vitest';
import { RegexDetector } from '../regex.js';
import { dachRules } from './dach.js';
import type { EntityType } from '../../types.js';

const det = new RegexDetector(dachRules);

function findType(text: string, type: EntityType) {
  return det.detect(text).filter((e) => e.type === type);
}

describe('CH_AHV', () => {
  it('detects valid AHV number', () => {
    expect(findType('Versicherungsnummer 756.1234.5678.90', 'CH_AHV')).toHaveLength(1);
  });
  it('does not match without 756 prefix', () => {
    expect(findType('755.1234.5678.90', 'CH_AHV')).toHaveLength(0);
  });
});

describe('CH_UID', () => {
  it('detects CHE-XXX.XXX.XXX', () => {
    expect(findType('UID CHE-123.456.789', 'CH_UID')).toHaveLength(1);
  });
  it('detects CHE without separator', () => {
    expect(findType('CHE 123.456.789', 'CH_UID')).toHaveLength(1);
  });
});

describe('CH_PASSPORT — context required', () => {
  it('matches with context "Passnummer"', () => {
    expect(findType('Passnummer A1234567 ausgestellt', 'CH_PASSPORT')).toHaveLength(1);
  });
  it('does NOT match without context (avoid false positives)', () => {
    expect(findType('Random A1234567 floating', 'CH_PASSPORT')).toHaveLength(0);
  });
});

describe('TAX_ID_DE with spaces', () => {
  it('matches "12 345 678 901" with Steuer-ID context', () => {
    expect(findType('Steuer-ID 12 345 678 901', 'TAX_ID_DE')).toHaveLength(1);
  });
});

describe('LICENSE_PLATE', () => {
  it('matches CH canton plate', () => {
    expect(findType('Auto ZH 478921 abgestellt', 'LICENSE_PLATE')).toHaveLength(1);
  });
  it('matches DE plate with context', () => {
    expect(findType('KFZ-Kennzeichen M-BX 4711', 'LICENSE_PLATE')).toHaveLength(1);
  });
});

describe('EMPLOYEE_ID — context required', () => {
  it('matches with Mitarbeiter-Nr context (at least one match)', () => {
    // Two rules can overlap (dashed + plain digit) — pipeline dedups
    expect(findType('Mitarbeiter-Nr 1234-56789', 'EMPLOYEE_ID').length).toBeGreaterThan(0);
  });
  it('does NOT match without context', () => {
    expect(findType('Random 1234-56789 number', 'EMPLOYEE_ID')).toHaveLength(0);
  });
});

describe('INTERNAL_REF', () => {
  it('matches PREFIX-YEAR-NUMBER without context', () => {
    // strong + short patterns may both match same string
    const matches = findType('Auftrag VB-2024-0317 erledigt', 'INTERNAL_REF');
    expect(matches.length).toBeGreaterThan(0);
    expect(matches.some((m) => m.text === 'VB-2024-0317')).toBe(true);
  });
  it('matches hash-prefixed ticket id', () => {
    const matches = findType('Bitte #SOC-2024-44719 prüfen', 'INTERNAL_REF');
    expect(matches.length).toBeGreaterThan(0);
  });
});

describe('PERSON salutation pattern', () => {
  it('detects after "Hallo"', () => {
    const matches = findType('Hallo Martin Müller, anbei...', 'PERSON');
    expect(matches.length).toBeGreaterThan(0);
    expect(matches[0]?.text).toBe('Martin Müller');
  });
  it('detects after "Sehr geehrte Frau"', () => {
    const matches = findType('Sehr geehrte Frau Schmidt, ...', 'PERSON');
    expect(matches.length).toBeGreaterThan(0);
  });
  it('detects after "Liebe"', () => {
    const matches = findType('Liebe Sabine, ...', 'PERSON');
    expect(matches.length).toBeGreaterThan(0);
    expect(matches[0]?.text).toBe('Sabine');
  });
});

describe('context confidence boost', () => {
  it('boosts AHV confidence (no context needed) to 0.95', () => {
    const [e] = findType('756.1234.5678.90', 'CH_AHV');
    expect(e?.confidence).toBeCloseTo(0.95, 2);
  });
  it('with context, EMPLOYEE_ID confidence is boosted', () => {
    const [e] = findType('Personalnr 1234-56789', 'EMPLOYEE_ID');
    expect(e?.confidence).toBeGreaterThan(0.7);
  });
});
