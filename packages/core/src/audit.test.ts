import { describe, it, expect } from 'vitest';
import { buildAuditReport, formatAuditReport } from './audit.js';
import type { Entity } from './types.js';

function ent(p: Partial<Entity> & Pick<Entity, 'type' | 'category' | 'source'>): Entity {
  return { start: 0, end: 1, text: 'SECRET-VALUE', confidence: 0.9, ...p };
}

describe('buildAuditReport', () => {
  it('counts by category, type and source', () => {
    const r = buildAuditReport([
      ent({ type: 'PERSON', category: 'person', source: 'ner' }),
      ent({ type: 'PERSON', category: 'person', source: 'regex' }),
      ent({ type: 'EMAIL', category: 'contact', source: 'regex' }),
    ]);
    expect(r.total).toBe(3);
    expect(r.byCategory).toEqual({ person: 2, contact: 1 });
    expect(r.byType).toEqual({ PERSON: 2, EMAIL: 1 });
    expect(r.bySource).toEqual({ ner: 1, regex: 2 });
  });

  it('handles an empty list', () => {
    const r = buildAuditReport([]);
    expect(r.total).toBe(0);
    expect(r.byCategory).toEqual({});
  });
});

describe('formatAuditReport', () => {
  it('never includes original values', () => {
    const entities = [
      ent({ type: 'EMAIL', category: 'contact', source: 'regex', text: 'bob@secret.test' }),
    ];
    const text = formatAuditReport(buildAuditReport(entities));
    expect(text).not.toContain('bob@secret.test');
    expect(text).toContain('Erkannte PII gesamt: 1');
    expect(text).toContain('EMAIL: 1');
  });
});
