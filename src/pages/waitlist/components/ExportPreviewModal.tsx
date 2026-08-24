interface ExportPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  headers: string[];
  rows: (string | number)[][];
  fileName: string;
}

const MAX_PREVIEW_ROWS = 50;

function buildCsv(headers: string[], rows: (string | number)[][]): string {
  const escapeCell = (value: string | number) => {
    const stringValue = String(value ?? '');
    if (/[",\n]/.test(stringValue)) {
      return `"${stringValue.replace(/"/g, '""')}"`;
    }
    return stringValue;
  };

  const lines = [headers.map(escapeCell).join(','), ...rows.map(row => row.map(escapeCell).join(','))];
  const BOM = String.fromCharCode(0xfeff);
  return BOM + lines.join('\n');
}

const ExportPreviewModal = ({ isOpen, onClose, title, headers, rows, fileName }: ExportPreviewModalProps) => {
  if (!isOpen) return null;

  const previewRows = rows.slice(0, MAX_PREVIEW_ROWS);

  const handleDownload = () => {
    const csv = buildCsv(headers, rows);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-[600] flex items-center justify-center bg-black bg-opacity-50 p-4">
      <div className="flex max-h-[85vh] w-full max-w-3xl flex-col rounded-2xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-gray-100 p-6 pb-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
            <p className="mt-1 text-sm text-gray-500">
              Showing {previewRows.length} of {rows.length} row{rows.length === 1 ? '' : 's'}
            </p>
          </div>
          <button
            aria-label="Close"
            className="rounded-full p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
            onClick={onClose}
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path d="M6 18L18 6M6 6l12 12" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-auto px-6">
          <table className="w-full min-w-full text-left text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-xs font-semibold uppercase text-gray-500">
                {headers.map(header => (
                  <th key={header} className="whitespace-nowrap py-2 pr-4">
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {previewRows.length === 0 ? (
                <tr>
                  <td className="py-6 text-center text-gray-400" colSpan={headers.length}>
                    Nothing to export.
                  </td>
                </tr>
              ) : (
                previewRows.map((row, index) => (
                  // eslint-disable-next-line react/no-array-index-key
                  <tr key={index} className="border-b border-gray-50 text-gray-700">
                    {row.map((cell, cellIndex) => (
                      // eslint-disable-next-line react/no-array-index-key
                      <td key={cellIndex} className="whitespace-nowrap py-2 pr-4">
                        {cell}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="flex justify-end gap-3 border-t border-gray-100 p-6 pt-4">
          <button
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
            disabled={rows.length === 0}
            onClick={handleDownload}
          >
            Download CSV
          </button>
        </div>
      </div>
    </div>
  );
};

export default ExportPreviewModal;
