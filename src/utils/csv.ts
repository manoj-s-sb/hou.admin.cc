// Minimal client-side CSV export — builds a Blob and triggers a download.
// No external dependency (matches the "no new libraries" rule).

/* eslint-disable @typescript-eslint/no-explicit-any -- rows are heterogeneous report data */
type Row = Record<string, any>;

const escapeCell = (value: any): string => {
  if (value === null || value === undefined) return '';
  const str = String(value);
  // Quote when the value contains a comma, quote, or newline.
  if (/[",\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
};

/**
 * Convert an array of objects to CSV text. `columns` fixes header order/labels;
 * when omitted, keys of the first row are used.
 */
export const toCsv = (rows: Row[], columns?: Array<{ key: string; label: string }>): string => {
  if (!rows.length) return '';
  const cols = columns ?? Object.keys(rows[0]).map(k => ({ key: k, label: k }));
  const header = cols.map(c => escapeCell(c.label)).join(',');
  const body = rows.map(row => cols.map(c => escapeCell(row[c.key])).join(',')).join('\n');
  return `${header}\n${body}`;
};

/** Trigger a browser download of `content` as a file. */
export const downloadFile = (content: string, fileName: string, mimeType = 'text/csv;charset=utf-8;'): void => {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', fileName);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

/** Build CSV from rows and download it in one call. */
export const exportCsv = (rows: Row[], fileName: string, columns?: Array<{ key: string; label: string }>): void => {
  downloadFile(toCsv(rows, columns), fileName);
};
