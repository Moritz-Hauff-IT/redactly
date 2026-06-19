import type { TableColumn } from '@redactly/core/structural';

/**
 * Transient, per-upload column-masking selection.
 *
 * When a CSV/TSV/Excel file is uploaded we detect its columns and let the user
 * pick the ones that always hold PII. The chosen columns' cell values become
 * always-mask terms for the current input only — this is NOT persisted to
 * settings (column selection is dynamic, tied to the file in front of you).
 *
 * Masking is value-based: we hand the pipeline the exact cell values, which it
 * injects as manual entities wherever they occur in the extracted text. That
 * works uniformly for CSV (grid intact in text) and XLSX (text flattened from
 * shared strings), and lines up with how the XLSX writer patches cells.
 */
function createTableMaskStore() {
  let columns = $state<TableColumn[]>([]);
  let selected = $state<Set<string>>(new Set());
  let filename = $state<string | null>(null);

  return {
    get columns() {
      return columns;
    },
    get selected() {
      return selected;
    },
    get filename() {
      return filename;
    },
    /** True once a tabular upload has detected at least one column. */
    get hasColumns() {
      return columns.length > 0;
    },
    /** Number of columns currently marked for masking. */
    get selectedCount() {
      return selected.size;
    },
    /** Unique, non-empty cell values across all selected columns. */
    get maskValues(): string[] {
      if (selected.size === 0) return [];
      const out = new Set<string>();
      for (const col of columns) {
        if (!selected.has(col.ref)) continue;
        for (const v of col.values) {
          const t = v.trim();
          if (t) out.add(t);
        }
      }
      return [...out];
    },

    /** Load freshly-detected columns for a file (resets any prior selection). */
    setColumns(cols: TableColumn[], file: string | null): void {
      columns = cols;
      filename = file;
      selected = new Set();
    },
    toggle(ref: string): void {
      const next = new Set(selected);
      if (next.has(ref)) next.delete(ref);
      else next.add(ref);
      selected = next;
    },
    setSelected(refs: string[]): void {
      selected = new Set(refs);
    },
    /** Forget everything (input cleared / replaced by non-tabular text). */
    clear(): void {
      columns = [];
      selected = new Set();
      filename = null;
    },
  };
}

export const tableMaskStore = createTableMaskStore();
