/**
 * Audit report — a PII-free summary of what was detected/masked, suitable for
 * compliance documentation. Counts only; it never contains original values.
 */
import type { Entity } from './types.js';

export interface AuditReport {
  total: number;
  byCategory: Record<string, number>;
  byType: Record<string, number>;
  bySource: Record<string, number>;
}

export function buildAuditReport(entities: Entity[]): AuditReport {
  const report: AuditReport = { total: entities.length, byCategory: {}, byType: {}, bySource: {} };
  for (const e of entities) {
    report.byCategory[e.category] = (report.byCategory[e.category] ?? 0) + 1;
    report.byType[e.type] = (report.byType[e.type] ?? 0) + 1;
    report.bySource[e.source] = (report.bySource[e.source] ?? 0) + 1;
  }
  return report;
}

function section(title: string, counts: Record<string, number>): string[] {
  const lines = [title];
  const entries = Object.entries(counts).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  if (entries.length === 0) lines.push('  —');
  for (const [k, v] of entries) lines.push(`  ${k}: ${v}`);
  return lines;
}

/** Render the report as plain text. Contains NO original values. */
export function formatAuditReport(
  report: AuditReport,
  opts: { title?: string; timestamp?: string; footer?: string } = {}
): string {
  const lines: string[] = [];
  lines.push(opts.title ?? 'Redactly — Audit-Report');
  if (opts.timestamp) lines.push(opts.timestamp);
  lines.push('');
  lines.push(`Erkannte PII gesamt: ${report.total}`);
  lines.push('');
  lines.push(...section('Nach Kategorie:', report.byCategory));
  lines.push('');
  lines.push(...section('Nach Typ:', report.byType));
  lines.push('');
  lines.push(...section('Nach Quelle:', report.bySource));
  lines.push('');
  lines.push(opts.footer ?? 'Hinweis: Dieser Bericht enthält keine Originalwerte.');
  return lines.join('\n');
}
