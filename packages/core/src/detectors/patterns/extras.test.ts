/**
 * Tests for the extended recognizer set (extras.ts).
 * Synthetic test data only — no real PII.
 */
import { describe, expect, it } from 'vitest';
import { RegexDetector } from '../regex.js';
import { extraRules } from './extras.js';
import type { EntityType } from '../../types.js';

const det = new RegexDetector(extraRules);

function findType(text: string, type: EntityType) {
  return det.detect(text).filter((e) => e.type === type);
}

describe('DATE', () => {
  it('detects dd.mm.yyyy', () => {
    expect(findType('geboren am 14.03.1987 in', 'DATE').length).toBeGreaterThan(0);
  });
  it('detects ISO yyyy-mm-dd', () => {
    expect(findType('Termin: 2024-11-05', 'DATE')).toHaveLength(1);
  });
  it('detects German prose date', () => {
    expect(findType('am 14. März 1987 geboren', 'DATE').length).toBeGreaterThan(0);
  });
  it('does NOT flag section numbering as partial date', () => {
    expect(findType('siehe Abschnitt 3.2. für Details', 'DATE')).toHaveLength(0);
  });
});

describe('business references', () => {
  it('detects KD- customer number', () => {
    expect(findType('Ihre Kundennummer KD-774201 wurde', 'EMPLOYEE_ID').length).toBeGreaterThan(0);
  });
  it('detects PAY- payment reference with country code', () => {
    const matches = findType('Zahlung PAY-CH-998812 erhalten', 'INTERNAL_REF');
    expect(matches.some((m) => m.text === 'PAY-CH-998812')).toBe(true);
  });
  it('detects country-coded reference MT-CH-2098', () => {
    const matches = findType('Mitglied MT-CH-2098 gekündigt', 'INTERNAL_REF');
    expect(matches.some((m) => m.text === 'MT-CH-2098')).toBe(true);
  });
  it('detects UPS tracking number', () => {
    expect(findType('Sendung 1Z999AA10123456784 unterwegs', 'INTERNAL_REF').length).toBeGreaterThan(
      0
    );
  });
  it('detects Amazon order number', () => {
    expect(findType('Bestellung 123-1234567-1234567', 'INTERNAL_REF').length).toBeGreaterThan(0);
  });
  it('detects PZN', () => {
    expect(findType('Medikament PZN-12345678 abgeholt', 'INTERNAL_REF').length).toBeGreaterThan(0);
  });
  it('detects Handelsregister number', () => {
    expect(findType('eingetragen unter HRB 123456 beim', 'INTERNAL_REF').length).toBeGreaterThan(0);
  });
  it('detects RF creditor reference', () => {
    expect(findType('Referenz RF18 5390 0754 7034', 'INTERNAL_REF').length).toBeGreaterThan(0);
  });
  it('generic multi-segment ref requires ≥4 digits', () => {
    expect(findType('Code AB-CD ist kein Treffer', 'INTERNAL_REF')).toHaveLength(0);
    expect(findType('Vorgang AZ-2024-X1 läuft', 'INTERNAL_REF').length).toBeGreaterThan(0);
  });
  it('order number requires context', () => {
    expect(findType('Zufallszahl 4829130 hier', 'INTERNAL_REF')).toHaveLength(0);
    expect(findType('Bestellnummer 4829130 versandt', 'INTERNAL_REF').length).toBeGreaterThan(0);
  });
});

describe('device & vehicle identifiers', () => {
  it('detects MAC address', () => {
    expect(findType('MAC 00:1B:44:11:3A:B7 im Netz', 'MAC')).toHaveLength(1);
  });
  it('detects VIN with context', () => {
    expect(
      findType('Fahrgestellnummer WVWZZZ1JZXW000010 des Wagens', 'VIN').length
    ).toBeGreaterThan(0);
  });
  it('boosts VIN confidence with vehicle context (fires without, at base confidence)', () => {
    const [withCtx] = findType('Fahrgestellnummer WVWZZZ1JZXW000010 des Wagens', 'VIN');
    const [without] = findType('Hash WVWZZZ1JZXW000010 berechnet', 'VIN');
    expect(withCtx!.confidence).toBeGreaterThan(without!.confidence);
  });
  it('detects UUID as DEVICE_ID', () => {
    expect(
      findType('Session 550e8400-e29b-41d4-a716-446655440000 aktiv', 'DEVICE_ID')
    ).toHaveLength(1);
  });
  it('detects IMEI only with context', () => {
    expect(findType('IMEI 49-015420-323751-8 registriert', 'DEVICE_ID').length).toBeGreaterThan(0);
    expect(findType('Nummer 49-015420-323751-8 notiert', 'DEVICE_ID')).toHaveLength(0);
  });
});

describe('social security / insurance numbers', () => {
  it('detects DE Sozialversicherungsnummer with context', () => {
    expect(findType('SV-Nr 12 290374 K 005 gemeldet', 'SOCIAL_SECURITY').length).toBeGreaterThan(0);
  });
  it('detects CH KVG insurance number without context', () => {
    expect(findType('Karte 80756.1234.5678.90 gültig', 'SOCIAL_SECURITY')).toHaveLength(1);
  });
  it('detects KVNR only with context', () => {
    expect(findType('KVNR A123456789 der Kasse', 'SOCIAL_SECURITY').length).toBeGreaterThan(0);
    expect(findType('Token A123456789 erzeugt', 'SOCIAL_SECURITY')).toHaveLength(0);
  });
});

describe('credit-card fragments (context-gated)', () => {
  it('detects card ending with context', () => {
    expect(findType('Karte mit Endung 4242 belastet', 'CREDIT_CARD').length).toBeGreaterThan(0);
  });
  it('does NOT flag bare 4-digit numbers', () => {
    expect(findType('Raum 4242 reserviert', 'CREDIT_CARD')).toHaveLength(0);
  });
  it('detects CVV with context', () => {
    expect(findType('CVV: 123 eingeben', 'CREDIT_CARD').length).toBeGreaterThan(0);
  });
});

describe('GEO coordinates', () => {
  it('detects decimal pair', () => {
    expect(findType('Standort 48.1374, 11.5755 gespeichert', 'GEO')).toHaveLength(1);
  });
  it('detects labeled coordinate', () => {
    expect(findType('lat=48.137456 erfasst', 'GEO').length).toBeGreaterThan(0);
  });
  it('detects what3words', () => {
    expect(findType('Treffpunkt ///stuhl.lampe.tisch im Park', 'GEO')).toHaveLength(1);
  });
  it('detects plus code', () => {
    expect(findType('Plus Code 8FWH4HQ8+6X teilen', 'GEO').length).toBeGreaterThan(0);
  });
});

describe('addresses', () => {
  it('detects standalone street suffix with house number', () => {
    expect(findType('wohnt in Lange Straße 5 seit', 'LOCATION').length).toBeGreaterThan(0);
  });
  it('detects Swiss PLZ + Ort + canton', () => {
    expect(findType('nach 8810 Horgen ZH gezogen', 'LOCATION').length).toBeGreaterThan(0);
  });
  it('detects Postfach', () => {
    expect(findType('Postfach 12 34 56 verwenden', 'LOCATION').length).toBeGreaterThan(0);
  });
  it('detects Chinese address', () => {
    expect(findType('地址：北京市朝阳区建国路88号', 'LOCATION').length).toBeGreaterThan(0);
  });
  it('detects Russian address', () => {
    expect(findType('Адрес: улица Ленина, дом 5', 'LOCATION').length).toBeGreaterThan(0);
  });
});

describe('TAX_ID variants', () => {
  it('detects Steuernummer slash format with context', () => {
    expect(
      findType('Steuernummer 12/345/67890 beim Finanzamt', 'TAX_ID_DE').length
    ).toBeGreaterThan(0);
  });
  it('does NOT flag slash numbers without tax context', () => {
    expect(findType('Quote 12/345/67890 gemessen', 'TAX_ID_DE')).toHaveLength(0);
  });
});

describe('persons', () => {
  it('detects Familie + name', () => {
    const matches = findType('Familie Müller reist an', 'PERSON');
    expect(matches.some((m) => m.text === 'Familie Müller')).toBe(true);
  });
  it('detects labeled guest name', () => {
    const matches = findType('Name des Gastes: Anna Berger', 'PERSON');
    expect(matches.some((m) => m.text === 'Anna Berger')).toBe(true);
  });
  it('detects surname after Herr mid-sentence', () => {
    const matches = findType('wie Herr Weber gestern sagte', 'PERSON');
    expect(matches.some((m) => m.text === 'Weber')).toBe(true);
  });
  it('does NOT capture "Doktor" after Herr', () => {
    expect(findType('wie Herr Doktor gestern sagte', 'PERSON')).toHaveLength(0);
  });
  it('detects name before passport keyword', () => {
    const matches = findType('Anna Berger, Reisepass C01X00T47', 'PERSON');
    expect(matches.some((m) => m.text === 'Anna Berger')).toBe(true);
  });
});

describe('organizations without legal suffix', () => {
  it('detects business-noun suffix orgs', () => {
    const matches = findType('bei Nordwind Logistik angestellt', 'ORG');
    expect(matches.some((m) => m.text === 'Nordwind Logistik')).toBe(true);
  });
});

describe('passport MRZ', () => {
  it('detects MRZ filler lines', () => {
    expect(findType('P<CHEMUSTER<<HANS<<<<<<<<<<<<<<', 'CH_PASSPORT').length).toBeGreaterThan(0);
  });
});

describe('De-Mail', () => {
  it('detects de-mail address', () => {
    expect(findType('an max.muster@provider.de-mail.de senden', 'EMAIL').length).toBeGreaterThan(0);
  });
});
