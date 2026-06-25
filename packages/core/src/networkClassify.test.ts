import { describe, expect, it } from 'vitest';
import { classifyRequest } from './networkClassify.js';

const ORIGIN = 'https://redactly.app';

describe('classifyRequest', () => {
  it('treats relative and same-origin URLs as same-origin (no upload)', () => {
    expect(classifyRequest('/assets/app.js', 'GET', ORIGIN)).toMatchObject({
      kind: 'same-origin',
      isUpload: false,
    });
    expect(classifyRequest(`${ORIGIN}/x`, 'POST', ORIGIN).kind).toBe('same-origin');
  });

  it('recognises model/asset CDNs as allowed downloads', () => {
    expect(classifyRequest('https://huggingface.co/model.bin', 'GET', ORIGIN).kind).toBe('model');
    expect(classifyRequest('https://cdn-lfs.huggingface.co/x', 'GET', ORIGIN).kind).toBe('model');
    expect(classifyRequest('https://cdn.jsdelivr.net/npm/x', 'GET', ORIGIN).kind).toBe('model');
  });

  it('flags a cross-origin write as a potential upload', () => {
    const r = classifyRequest('https://evil.example.com/collect', 'POST', ORIGIN);
    expect(r.kind).toBe('other');
    expect(r.isUpload).toBe(true);
  });

  it('a cross-origin GET to an unknown host is "other" but not an upload', () => {
    const r = classifyRequest('https://unknown.example.com/x', 'GET', ORIGIN);
    expect(r.kind).toBe('other');
    expect(r.isUpload).toBe(false);
  });
});
