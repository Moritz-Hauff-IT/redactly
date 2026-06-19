import { describe, expect, it } from 'vitest';
import { createMapping, type Mapping } from './masker.js';
import { decryptMapping, encryptMapping, isEncryptedMapping } from './mappingCrypto.js';

function sampleMapping(): Mapping {
  const m = createMapping();
  m.forward.set('[PERSON_1]', 'Anna Müller');
  m.reverse.set('Anna Müller', '[PERSON_1]');
  m.forward.set('[EMAIL_1]', 'anna@example.com');
  m.reverse.set('anna@example.com', '[EMAIL_1]');
  return m;
}

describe('mappingCrypto', () => {
  it('round-trips a mapping through encrypt → decrypt', async () => {
    const m = sampleMapping();
    const envelope = await encryptMapping(m, 'correct horse battery staple');
    const back = await decryptMapping(envelope, 'correct horse battery staple');
    expect([...back.forward.entries()]).toEqual([...m.forward.entries()]);
  });

  it('produces a recognizable encrypted envelope, not clear text', async () => {
    const envelope = await encryptMapping(sampleMapping(), 'pw');
    expect(isEncryptedMapping(envelope)).toBe(true);
    // No original value leaks into the envelope.
    expect(envelope).not.toContain('Anna');
    expect(envelope).not.toContain('example.com');
  });

  it('uses a fresh salt + IV each time (different ciphertext)', async () => {
    const m = sampleMapping();
    const a = await encryptMapping(m, 'pw');
    const b = await encryptMapping(m, 'pw');
    expect(a).not.toEqual(b);
  });

  it('rejects a wrong password', async () => {
    const envelope = await encryptMapping(sampleMapping(), 'right');
    await expect(decryptMapping(envelope, 'wrong')).rejects.toThrow(/Passwort|beschädigt/);
  });

  it('refuses an empty password on encrypt', async () => {
    await expect(encryptMapping(sampleMapping(), '')).rejects.toThrow(/Passwort/);
  });

  it('isEncryptedMapping is false for a plain mapping / garbage', () => {
    expect(isEncryptedMapping('{"format":"redactly-mapping","entries":[]}')).toBe(false);
    expect(isEncryptedMapping('not json')).toBe(false);
  });
});
