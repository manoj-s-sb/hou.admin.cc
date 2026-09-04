import { useRef, useState } from 'react';

import { toast } from 'react-hot-toast';
import { useDispatch } from 'react-redux';
import * as XLSX from 'xlsx';

import { bulkImportWaitlist } from '../../../store/centres/api';
import { WaitlistImportRow } from '../../../store/centres/types';
import { AppDispatch } from '../../../store/store';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

// Sheets in the wild spell these headers in slightly different ways ("P
// lowercase-alnum before matching so header formatting doesn't matter.
const normaliseHeader = (h: string): string => h.toLowerCase().replace(/[^a-z0-9]/g, '');

const HEADER_FIELD_MAP: Record<string, keyof RawRow> = {
  name: 'name',
  email: 'email',
  phone: 'phone',
  phonenumber: 'phone',
  mobile: 'phone',
  countrycode: 'countryCode',
  timestamp: 'timestamp',
  registeredvia: 'registerdVia',
  registervia: 'registerdVia',
  registerdvia: 'registerdVia',
};

interface RawRow {
  name: string;
  email: string;
  phone: string;
  countryCode: string;
  timestamp: string;
  registerdVia: string;
}

type RowStatus = 'valid' | 'duplicate' | 'invalid';

interface PreviewRow extends RawRow {
  status: RowStatus;
  reason?: string;
}

// Raw subscriptionSrc values the Waitlist tab already recognises
// (WAITLIST_TYPE_META in ../index.tsx) — kept in sync so an imported row's
// badge renders correctly the moment the list refetches.
const IMPORT_TYPE_OPTIONS: { label: string; value: string }[] = [
  { label: 'Foundation', value: 'foundation' },
  { label: 'Pre Launch', value: 'launchwaitlist' },
  { label: 'Post Launch', value: 'postlaunch' },
  { label: 'Event', value: 'event' },
];

const PREVIEW_LIMIT = 50;

const emptyRawRow = (): RawRow => ({
  name: '',
  email: '',
  phone: '',
  countryCode: '',
  timestamp: '',
  registerdVia: '',
});

const parseWorkbook = (buffer: ArrayBuffer): RawRow[] => {
  const workbook = XLSX.read(buffer, { type: 'array' });
  const [sheetName] = workbook.SheetNames;
  if (!sheetName) return [];
  const sheet = workbook.Sheets[sheetName];
  const raw = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '' });

  return raw.map(rawRow => {
    const mapped = emptyRawRow();
    Object.entries(rawRow).forEach(([header, value]) => {
      const field = HEADER_FIELD_MAP[normaliseHeader(header)];
      if (field) mapped[field] = (value ?? '').toString().trim();
    });
    return mapped;
  });
};

const classifyRows = (rows: RawRow[]): PreviewRow[] => {
  const seenEmails = new Set<string>();
  return rows.map(row => {
    const email = row.email.toLowerCase();
    if (!row.name) return { ...row, status: 'invalid', reason: 'Missing name' };
    if (!row.email || !EMAIL_RE.test(row.email)) return { ...row, status: 'invalid', reason: 'Invalid email' };
    if (seenEmails.has(email)) return { ...row, status: 'duplicate', reason: 'Duplicate email in file' };
    seenEmails.add(email);
    return { ...row, status: 'valid' };
  });
};

const STATUS_META: Record<RowStatus, { label: string; className: string }> = {
  valid: { label: 'Valid', className: 'bg-emerald-100 text-emerald-700' },
  duplicate: { label: 'Duplicate', className: 'bg-amber-100 text-amber-700' },
  invalid: { label: 'Invalid', className: 'bg-red-100 text-red-700' },
};

interface ImportWaitlistModalProps {
  facilityCode: string;
  onClose: () => void;
  onImported: () => void;
}

const ImportWaitlistModal: React.FC<ImportWaitlistModalProps> = ({ facilityCode, onClose, onImported }) => {
  const dispatch = useDispatch<AppDispatch>();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [fileName, setFileName] = useState('');
  const [rows, setRows] = useState<PreviewRow[]>([]);
  const [subscriptionSrc, setSubscriptionSrc] = useState('');
  const [eventName, setEventName] = useState('');
  const [parseError, setParseError] = useState('');
  const [importing, setImporting] = useState(false);

  const isEventType = subscriptionSrc === 'event';
  const eventNameValid = !isEventType || eventName.trim().length > 0;
  const validRows = rows.filter(r => r.status === 'valid');
  const duplicateCount = rows.filter(r => r.status === 'duplicate').length;
  const invalidCount = rows.filter(r => r.status === 'invalid').length;
  const preview = rows.slice(0, PREVIEW_LIMIT);
  const truncated = rows.length > preview.length;

  const handleFile = async (file: File) => {
    setParseError('');
    setFileName(file.name);
    try {
      const buffer = await file.arrayBuffer();
      const parsed = parseWorkbook(buffer).filter(r => r.name || r.email || r.phone);
      if (parsed.length === 0) {
        setRows([]);
        setParseError("Couldn't find any rows — check the file has Name/Email columns.");
        return;
      }
      setRows(classifyRows(parsed));
    } catch {
      setRows([]);
      setParseError('Could not read this file. Please upload a valid .xlsx, .xls or .csv file.');
    }
  };

  const handleImport = async () => {
    if (!subscriptionSrc || !eventNameValid || validRows.length === 0) return;
    setImporting(true);
    try {
      const entries: WaitlistImportRow[] = validRows.map(r => ({
        name: r.name,
        email: r.email,
        phone: r.phone || undefined,
        countryCode: r.countryCode || undefined,
        registerdVia: r.registerdVia || undefined,
        timestamp: r.timestamp || undefined,
      }));
      const result = await dispatch(
        bulkImportWaitlist({
          facilityCode,
          subscriptionSrc,
          eventName: isEventType ? eventName.trim() : undefined,
          entries,
        })
      ).unwrap();
      const skippedTotal = result.skippedCount + duplicateCount + invalidCount;
      toast.success(
        `Imported ${result.createdCount} entr${result.createdCount === 1 ? 'y' : 'ies'}${
          skippedTotal ? `, skipped ${skippedTotal}` : ''
        }`
      );
      onImported();
      onClose();
    } catch (e) {
      toast.error(typeof e === 'string' ? e : 'Could not import the waitlist file');
    } finally {
      setImporting(false);
    }
  };

  return (
    <div
      aria-modal="true"
      className="fixed inset-0 z-[600] flex items-center justify-center bg-black/40 p-4"
      role="dialog"
    >
      <div className="flex max-h-[88vh] w-full max-w-[820px] flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="flex items-start justify-between border-b border-gray-100 px-6 py-4">
          <div>
            <h2 className="text-[16px] font-bold text-[#21295A]">Import from Excel</h2>
            <p className="mt-0.5 text-[12px] text-gray-400">
              Upload a sheet with Name, Email, Phone Number, Country Code, Timestamp, Registered Via.
            </p>
          </div>
          <button
            aria-label="Close"
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50"
            type="button"
            onClick={onClose}
          >
            ×
          </button>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto px-6 py-5">
          <div>
            <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-gray-400">
              Waitlist Type *
            </span>
            <select
              className="w-full max-w-[260px] rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-[13px] text-gray-700 outline-none transition focus:border-[#21295A] focus:bg-white"
              value={subscriptionSrc}
              onChange={e => setSubscriptionSrc(e.target.value)}
            >
              <option value="">Select a type…</option>
              {IMPORT_TYPE_OPTIONS.map(o => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
            <p className="mt-1 text-[11px] text-gray-400">Applied to every row in this import.</p>
          </div>

          {isEventType && (
            <div>
              <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                Event Name *
              </span>
              <input
                className="w-full max-w-[260px] rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-[13px] text-gray-700 outline-none transition focus:border-[#21295A] focus:bg-white"
                placeholder="e.g. Aug 28 Launch"
                type="text"
                value={eventName}
                onChange={e => setEventName(e.target.value)}
              />
              <p className="mt-1 text-[11px] text-gray-400">
                Shown as a badge on these rows, e.g. Event - `{eventName.trim() || 'Aug 28 Launch'}`.
              </p>
            </div>
          )}

          <div>
            <input
              ref={inputRef}
              accept=".xlsx,.xls,.csv"
              className="hidden"
              type="file"
              onChange={e => {
                const file = e.target.files?.[0];
                if (file) handleFile(file);
                e.target.value = '';
              }}
            />
            <button
              className="flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-4 py-2 text-[12px] font-semibold text-gray-700 shadow-sm transition hover:border-[#21295A]/30 hover:text-[#21295A]"
              type="button"
              onClick={() => inputRef.current?.click()}
            >
              <svg fill="none" height={13} stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24" width={13}>
                <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
                <polyline points="17 8 12 3 7 8" />
                <line x1="12" x2="12" y1="3" y2="15" />
              </svg>
              {fileName ? 'Replace file' : 'Choose file'}
            </button>
            {fileName && <span className="ml-3 text-[12px] text-gray-500">{fileName}</span>}
            {parseError && <p className="mt-2 text-[11px] font-medium text-red-500">{parseError}</p>}
          </div>

          {rows.length > 0 && (
            <div>
              <div className="mb-2 flex flex-wrap items-center gap-3 text-[11px]">
                <span className="font-semibold text-emerald-700">{validRows.length} valid</span>
                {duplicateCount > 0 && <span className="font-semibold text-amber-700">{duplicateCount} duplicate</span>}
                {invalidCount > 0 && <span className="font-semibold text-red-600">{invalidCount} invalid</span>}
                <span className="text-gray-400">· {rows.length} rows total</span>
              </div>
              <div className="max-h-[320px] overflow-auto rounded-lg border border-gray-100">
                <table className="w-full border-collapse text-left text-[12px]">
                  <thead className="sticky top-0 bg-gray-50">
                    <tr className="border-b border-gray-200">
                      {['Name', 'Email', 'Phone', 'Country Code', 'Registered Via', 'Timestamp', 'Status'].map(h => (
                        <th key={h} className="whitespace-nowrap px-2 py-1.5 font-semibold text-gray-500">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {preview.map((r, i) => {
                      const meta = STATUS_META[r.status];
                      return (
                        <tr key={i} className="border-b border-gray-50">
                          <td className="whitespace-nowrap px-2 py-1.5 text-gray-700">{r.name || '—'}</td>
                          <td className="whitespace-nowrap px-2 py-1.5 text-gray-700">{r.email || '—'}</td>
                          <td className="whitespace-nowrap px-2 py-1.5 text-gray-700">{r.phone || '—'}</td>
                          <td className="whitespace-nowrap px-2 py-1.5 text-gray-700">{r.countryCode || '—'}</td>
                          <td className="whitespace-nowrap px-2 py-1.5 text-gray-700">{r.registerdVia || '—'}</td>
                          <td className="whitespace-nowrap px-2 py-1.5 text-gray-700">{r.timestamp || '—'}</td>
                          <td className="whitespace-nowrap px-2 py-1.5">
                            <span
                              className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${meta.className}`}
                              title={r.reason}
                            >
                              {meta.label}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              {truncated && (
                <p className="mt-2 text-[11px] text-gray-400">
                  Showing first {preview.length} of {rows.length} rows — all valid rows are included in the import.
                </p>
              )}
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 border-t border-gray-100 px-6 py-4">
          <button
            className="rounded-lg border border-gray-200 px-4 py-2 text-[12px] font-semibold text-gray-600 transition hover:bg-gray-50 disabled:opacity-50"
            disabled={importing}
            type="button"
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            className="rounded-lg bg-[#21295A] px-5 py-2 text-[12px] font-semibold text-white shadow-sm transition hover:bg-[#2d3570] disabled:opacity-50"
            disabled={importing || !subscriptionSrc || !eventNameValid || validRows.length === 0}
            type="button"
            onClick={handleImport}
          >
            {importing ? 'Importing…' : `Import ${validRows.length} ${validRows.length === 1 ? 'entry' : 'entries'}`}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ImportWaitlistModal;
