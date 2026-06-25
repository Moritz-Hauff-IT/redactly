import { describe, expect, it } from 'vitest';
import { openBox, sealBox } from './cryptoBox.js';

describe('cryptoBox', () => {
  it('round-trips a string through seal → open', async () => {
    const payload = JSON.stringify({ input: 'Anna Schmidt', n: 42 });
    const box = await sealBox(payload, 'pw123');
    expect(await openBox(box, 'pw123')).toBe(payload);
  });

  it('produces an envelope that does not leak the plaintext', async () => {
    const box = await sealBox('top secret value', 'pw');
    expect(box).not.toContain('secret');
    expect(box).toContain('redactly-box');
  });

  it('uses a fresh salt + IV each time', async () => {
    const a = await sealBox('same', 'pw');
    const b = await sealBox('same', 'pw');
    expect(a).not.toEqual(b);
  });

  it('rejects a wrong password', async () => {
    const box = await sealBox('data', 'right');
    await expect(openBox(box, 'wrong')).rejects.toThrow(/Passwort|beschädigt/);
  });

  it('refuses an empty password', async () => {
    await expect(sealBox('x', '')).rejects.toThrow(/Passwort/);
  });
});
