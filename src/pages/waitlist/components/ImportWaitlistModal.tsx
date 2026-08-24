import { useState } from 'react';

import * as XLSX from 'xlsx';

import { LoaderSpinner } from '../../../components/Loader';
import { WaitlistImportRow } from '../../../store/waitlist/types';
import { WAITLIST_TYPE_OPTIONS } from '../constants';

type RowStatus = 'valid' | 'duplicate' | 'invalid';

interface PreviewRow {
  name: string;
  email: string;
  phone?: string;
  countryCode?: string;
  registerdVia?: string;
  timestamp?: string;
  status: RowStatus;
  reason?: string;
}

interface ImportWaitlistModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (subscriptionSrc: string, entries: WaitlistImportRow[]) => void;
  isImporting: boolean;
}

const HEADER_ALIASES: Record<string, keyof WaitlistImportRow> = {
  name: 'name',
  fullname: 'name',
  email: 'email',
  emailaddress: 'email',
  phone: 'phone',
  phonenumber: 'phone',
  mobile: 'phone',
  mobilenumber: 'phone',
  countrycode: 'countryCode',
  timestamp: 'timestamp',
  date: 'timestamp',
  registerdvia: 'registerdVia',
  registeredvia: 'registerdVia',
  via: 'registerdVia',
  source: 'registerdVia',
};

const normalizeHeader = (header: string): string => header.toLowerCase().replace(/[^a-z0-9]/g, '');

const normalizeRawRow = (raw: Record<string, unknown>): Partial<WaitlistImportRow> => {
  const normalized: Partial<WaitlistImportRow> = {};
  Object.entries(raw).forEach(([key, value]) => {
    const canonicalKey = HEADER_ALIASES[normalizeHeader(key)];
    if (canonicalKey && value !== undefined && value !== null && String(value).trim() !== '') {
      (normalized as Record<string, string>)[canonicalKey] = String(value).trim();
    }
  });
  return normalized;
};

const buildPreviewRows = (rawRows: Record<string, unknown>[]): PreviewRow[] => {
  const seenEmails = new Set<string>();

  return rawRows.map(raw => {
    const row = normalizeRawRow(raw);
    const name = row.name || '';
    const email = row.email || '';
    const emailKey = email.toLowerCase();

    let status: RowStatus = 'valid';
    let reason: string | undefined;

    if (!name || !email) {
      status = 'invalid';
      reason = !name && !email ? 'Missing name and email' : !name ? 'Missing name' : 'Missing email';
    } else if (seenEmails.has(emailKey)) {
      status = 'duplicate';
      reason = 'Duplicate email in file';
    }

    if (status === 'valid') {
      seenEmails.add(emailKey);
    }

    return {
      name,
      email,
      phone: row.phone,
      countryCode: row.countryCode,
      registerdVia: row.registerdVia,
      timestamp: row.timestamp,
      status,
      reason,
    };
  });
};

const STATUS_BADGE: Record<RowStatus, string> = {
  valid: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
  duplicate: 'bg-amber-50 text-amber-700 border border-amber-200',
  invalid: 'bg-red-50 text-red-700 border border-red-200',
};

const ImportWaitlistModal = ({ isOpen, onClose, onImport, isImporting }: ImportWaitlistModalProps) => {
  const [subscriptionSrc, setSubscriptionSrc] = useState('');
  const [rows, setRows] = useState<PreviewRow[]>([]);
  const [fileName, setFileName] = useState('');
  const [parseError, setParseError] = useState('');

  if (!isOpen) return null;

  const resetState = () => {
    setSubscriptionSrc('');
    setRows([]);
    setFileName('');
    setParseError('');
  };

  const handleClose = () => {
    resetState();
    onClose();
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    setParseError('');
    setFileName(file.name);

    try {
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: 'array' });
      const [sheetName] = workbook.SheetNames;
      const worksheet = workbook.Sheets[sheetName];
      const rawRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(worksheet, { defval: '' });
      setRows(buildPreviewRows(rawRows));
    } catch (error) {
      console.error('Failed to parse waitlist import file:', error);
      setParseError('Could not read this file. Please upload a valid .xlsx, .xls, or .csv file.');
      setRows([]);
    }
  };

  const validRows = rows.filter(row => row.status === 'valid');

  const handleImport = () => {
    if (!subscriptionSrc || validRows.length === 0) return;
    onImport(
      subscriptionSrc,
      validRows.map(row => ({
        name: row.name,
        email: row.email,
        phone: row.phone,
        countryCode: row.countryCode,
        registerdVia: row.registerdVia,
        timestamp: row.timestamp,
      }))
    );
  };

  return (
    <div className="fixed inset-0 z-[600] flex items-center justify-center bg-black bg-opacity-50 p-4">
      <div className="flex max-h-[85vh] w-full max-w-3xl flex-col rounded-2xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-gray-100 p-6 pb-4">
          <h3 className="text-lg font-semibold text-gray-900">Import Waitlist from Excel</h3>
          <button
            aria-label="Close"
            className="rounded-full p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
            onClick={handleClose}
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path d="M6 18L18 6M6 6l12 12" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} />
            </svg>
          </button>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto p-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-600" htmlFor="import-waitlist-type">
                Waitlist Type*
              </label>
              <select
                className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700 focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-200"
                id="import-waitlist-type"
                value={subscriptionSrc}
                onChange={e => setSubscriptionSrc(e.target.value)}
              >
                <option value="">Select a type</option>
                {WAITLIST_TYPE_OPTIONS.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <p className="mt-1 text-xs text-gray-400">Applied to every row in this import.</p>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-600" htmlFor="import-waitlist-file">
                Excel / CSV file*
              </label>
              <input
                accept=".xlsx,.xls,.csv"
                className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700 file:mr-3 file:rounded-md file:border-0 file:bg-indigo-50 file:px-3 file:py-1 file:text-sm file:font-medium file:text-indigo-700"
                id="import-waitlist-file"
                type="file"
                onChange={handleFileChange}
              />
              {fileName && <p className="mt-1 truncate text-xs text-gray-400">{fileName}</p>}
            </div>
          </div>

          {parseError && <p className="text-sm text-red-600">{parseError}</p>}

          {rows.length > 0 && (
            <div>
              <div className="mb-2 flex items-center gap-4 text-xs text-gray-500">
                <span className="font-medium text-emerald-700">{validRows.length} valid</span>
                <span className="font-medium text-amber-700">
                  {rows.filter(row => row.status === 'duplicate').length} duplicate
                </span>
                <span className="font-medium text-red-700">
                  {rows.filter(row => row.status === 'invalid').length} invalid
                </span>
              </div>
              <div className="max-h-64 overflow-auto rounded-lg border border-gray-100">
                <table className="w-full min-w-full text-left text-sm">
                  <thead className="sticky top-0 bg-gray-50">
                    <tr className="text-xs font-semibold uppercase text-gray-500">
                      <th className="whitespace-nowrap px-3 py-2">Name</th>
                      <th className="whitespace-nowrap px-3 py-2">Email</th>
                      <th className="whitespace-nowrap px-3 py-2">Phone</th>
                      <th className="whitespace-nowrap px-3 py-2">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row, index) => (
                      // eslint-disable-next-line react/no-array-index-key
                      <tr key={index} className="border-t border-gray-50">
                        <td className="whitespace-nowrap px-3 py-2 text-gray-700">{row.name || '—'}</td>
                        <td className="whitespace-nowrap px-3 py-2 text-gray-700">{row.email || '—'}</td>
                        <td className="whitespace-nowrap px-3 py-2 text-gray-700">{row.phone || '—'}</td>
                        <td className="whitespace-nowrap px-3 py-2">
                          <span
                            className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_BADGE[row.status]}`}
                            title={row.reason}
                          >
                            {row.status.charAt(0).toUpperCase() + row.status.slice(1)}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-3 border-t border-gray-100 p-6 pt-4">
          <button
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
            disabled={isImporting}
            onClick={handleClose}
          >
            Cancel
          </button>
          <button
            className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
            disabled={isImporting || !subscriptionSrc || validRows.length === 0}
            onClick={handleImport}
          >
            {isImporting && <LoaderSpinner className="text-white" size="xs" />}
            Import {validRows.length > 0 ? `${validRows.length} row${validRows.length === 1 ? '' : 's'}` : ''}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ImportWaitlistModal;
