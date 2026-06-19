import { extractDelimitedColumns, type TableColumn } from '@redactly/core/structural';
import { extractXlsxColumns } from '@redactly/core/parsers';
import type { SupportedFormat } from '@redactly/core/parsers';

/**
 * Detect the columns of a freshly-uploaded tabular file for the column picker.
 * CSV/TSV are read from the extracted text (grid intact); XLSX is parsed from
 * the original bytes (the flat text extractor drops the grid). Returns `null`
 * for anything that isn't a recognizable table.
 */
export async function detectColumns(
  format: SupportedFormat | null,
  text: string,
  rawBytes: Uint8Array | null
): Promise<TableColumn[] | null> {
  if (format === 'csv' || format === 'tsv') {
    return extractDelimitedColumns(text);
  }
  if (format === 'xlsx' && rawBytes) {
    try {
      const cols = await extractXlsxColumns(rawBytes);
      return cols.length > 0 ? cols : null;
    } catch {
      return null;
    }
  }
  return null;
}
