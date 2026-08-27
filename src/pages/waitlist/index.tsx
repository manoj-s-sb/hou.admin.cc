import { useCallback, useEffect, useMemo, useState } from 'react';

import { toast } from 'react-hot-toast';
import { useDispatch, useSelector } from 'react-redux';
import * as XLSX from 'xlsx';

import DataTable from '../../components/Table/DataTable';
import { ColumnDef, TableColumn } from '../../components/Table/types';
import { getFacilityCode } from '../../constants/user';
import {
  addLeadNote,
  addWaitlistNote,
  createLead,
  deleteLead,
  deleteLeadNote,
  deleteWaitlistNote,
  getCentreLeads,
  getCentreWaitlist,
  updateLeadStatus,
  updateWaitlistStatus,
} from '../../store/centres/api';
import { AdminNote, ContactStatus, LeadEntry, StatusHistoryEntry, WaitlistEntry } from '../../store/centres/types';
import { AppDispatch, RootState } from '../../store/store';
import { formatDate } from '../../utils/dateUtils';

import ImportWaitlistModal from './components/ImportWaitlistModal';
import MemberDetailDrawer, { DetailField, STATUS_META } from './components/MemberDetailDrawer';

const PAGE_SIZE = 20;

const AVATAR_COLORS = ['#21295A', '#008482', '#d97706', '#7c3aed', '#0891b2', '#d42b2b'];

const initials = (text: string): string =>
  text
    .split(/[\s@._-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(p => Array.from(p)[0]?.toUpperCase() ?? '')
    .join('') || '—';

const avatarColor = (seed: string): string => {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) hash = (hash + seed.charCodeAt(i)) % AVATAR_COLORS.length;
  return AVATAR_COLORS[hash];
};

// "checkout_session_creation_attempted" → "Checkout Session Creation Attempted"
const titleCase = (raw: string): string =>
  raw
    .replace(/[_-]+/g, ' ')
    .trim()
    .replace(/\b\w/g, c => c.toUpperCase());

// "3 Nov 2024" — falls back to a muted dash when the date is missing/invalid.
const readableDate = (value?: string): string =>
  value ? formatDate(value, { day: 'numeric', month: 'short', year: 'numeric' }, 'en-GB') : '—';

// Older docs predate the `status` field — treat a missing status as 'not_contacted'.
const StatusBadge: React.FC<{ status?: ContactStatus }> = ({ status }) => {
  const meta = STATUS_META[status || 'not_contacted'];
  return (
    <span className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold ${meta.className}`}>{meta.label}</span>
  );
};

// Prefixes the country code (e.g. "+1"), when the signup/import captured one.
const waitlistPhoneOf = (e: WaitlistEntry): string => {
  if (!e.phoneNo) return '—';
  const cc = (e.countryCode || '').trim();
  if (!cc) return e.phoneNo;
  return `${cc.startsWith('+') ? cc : `+${cc}`} ${e.phoneNo}`;
};

// Funnel-derived leads carry the plan under `subscription_code`; manually-added
// leads (the "+ Add Lead" form) carry it under `planInterest` instead.
const leadPlanOf = (e: LeadEntry): string => (e.details?.subscription_code || e.details?.planInterest || '').toString();

// Manually-added leads have a `name`; funnel-derived leads don't, so fall back to email.
const leadDisplayNameOf = (e: LeadEntry): string => e.details?.name || e.details?.email || 'Unknown';

// PLAN filter is client-side (the waitlist endpoint takes no plan param).
const PLAN_FILTERS: { label: string; value: string }[] = [
  { label: 'All plans', value: 'all' },
  { label: 'Premium', value: 'premium' },
  { label: 'Standard', value: 'standard' },
  { label: 'Off Peak', value: 'offpeak' },
  { label: 'Family', value: 'family' },
  { label: 'Night Owl', value: 'nightowl' },
];

// Known/legacy raw subscriptionSrc spellings → one canonical filter bucket +
// label each (collapses alternate spellings of the same real-world type, e.g.
// every 'launchwaitlist' entry is actually a pre-launch signup — confirmed
// against real data). Marketing keeps launching new campaigns/events with new
// raw source values (see e.g. a "qrcampaign" doc's `source` field) that can't
// be hardcoded ahead of time, so any raw value NOT listed here becomes its own
// bucket automatically (see typeKeyOf/typeMetaFor below) — new types just show
// up, title-cased, no code change needed. See [[project-waitlist-registrationsource]].
const LEGACY_TYPE_BUCKET: Record<string, string> = {
  foundation: 'foundation',
  launchwaitlist: 'prelaunch',
  prelaunch: 'prelaunch',
  prelaunchwaitlist: 'prelaunch',
  postlaunch: 'postlaunch',
  postlaunchwaitlist: 'postlaunch',
  event: 'event',
  eventwaitlist: 'event',
};

const TYPE_BUCKET_META: Record<string, { label: string; className: string }> = {
  foundation: { label: 'Foundation', className: 'bg-amber-100 text-amber-700' },
  prelaunch: { label: 'Pre Launch', className: 'bg-blue-100 text-blue-700' },
  postlaunch: { label: 'Post Launch', className: 'bg-gray-100 text-gray-600' },
  event: { label: 'Event', className: 'bg-violet-100 text-violet-700' },
};

// Legacy QR-campaign codes whose raw registrationSource value doesn't read as a
// name on its own (e.g. "nycaug28" doesn't obviously mean "Aug 28"). Any NEWER
// registrationSource (e.g. one typed into "Import from Excel" → Event Name) is
// handled generically below — "Event - {name}" derived straight from the value,
// no per-campaign code change needed. Only add here if a future QR code's raw
// value needs a friendlier override than its own text.
const CAMPAIGN_TYPE_OVERRIDES: Record<string, { label: string; className: string }> = {
  nycaug28: { label: 'Event - Aug 28', className: 'bg-violet-100 text-violet-700' },
};

// Filter bucket for an entry's raw subscriptionSrc — a known legacy spelling's
// bucket, or (for anything new) the raw value itself, so it filters correctly
// even before anyone's added a label for it. A registrationSource (a specific
// named event/campaign occurrence) always takes priority over the generic
// subscriptionSrc-derived bucket — see typeMetaFor for how it's displayed.
const typeKeyOf = (entry: WaitlistEntry): string => {
  const regSrc = (entry.registrationSource || '').trim();
  if (regSrc) {
    const key = regSrc.toLowerCase();
    return CAMPAIGN_TYPE_OVERRIDES[key] ? key : `event:${regSrc}`;
  }
  const src = (entry.subscriptionSrc || '').toLowerCase();
  if (!src) return 'other';
  return LEGACY_TYPE_BUCKET[src] ?? src;
};

// Display label + badge colour for a bucket key. An "event:{name}" bucket (see
// typeKeyOf) renders as "Event - {name}" directly from the admin-entered name —
// no code change needed per campaign. Any other unknown bucket falls back to a
// title-cased label with a neutral badge.
const typeMetaFor = (bucket: string): { label: string; className: string } => {
  if (CAMPAIGN_TYPE_OVERRIDES[bucket]) return CAMPAIGN_TYPE_OVERRIDES[bucket];
  if (bucket.startsWith('event:')) {
    return { label: `Event - ${bucket.slice('event:'.length)}`, className: 'bg-violet-100 text-violet-700' };
  }
  return TYPE_BUCKET_META[bucket] || { label: titleCase(bucket), className: 'bg-gray-100 text-gray-600' };
};

const mapColumns = (cols: ColumnDef[]): TableColumn[] =>
  cols.map(col => ({
    id: col.field,
    label: col.headerName,
    minWidth: col.minWidth,
    width: col.width,
    sortable: col.sortable !== false,
    renderCell: col.renderCell
      ? (value, row, index) => col.renderCell?.({ value, row, index })
      : col.valueGetter
        ? (value, row, index) => col.valueGetter?.({ value, row, index }) || ''
        : undefined,
  }));

const Chip: React.FC<{ active: boolean; onClick: () => void; children: React.ReactNode }> = ({
  active,
  onClick,
  children,
}) => (
  <button
    className={`inline-flex cursor-pointer select-none items-center gap-1 whitespace-nowrap rounded-full border px-2.5 py-1 text-xs font-medium transition-all ${
      active
        ? 'border-[#9096be] bg-[#ecedf4] text-[#21295a]'
        : 'border-gray-200 bg-white text-gray-500 hover:bg-gray-50'
    }`}
    type="button"
    onClick={onClick}
  >
    {children}
  </button>
);

const ErrorState: React.FC<{ message: string; onRetry: () => void }> = ({ message, onRetry }) => (
  <div className="rounded-xl border border-red-100 bg-red-50 px-6 py-12 text-center">
    <p className="text-[13px] font-semibold text-red-600">{message}</p>
    <button
      className="mt-3 rounded-lg bg-[#21295A] px-4 py-2 text-[12px] font-semibold text-white transition hover:bg-[#2d3570]"
      type="button"
      onClick={onRetry}
    >
      Retry
    </button>
  </div>
);

// ── Export preview / download (real .xlsx, via the same SheetJS build used for import) ──
const downloadXlsx = (filename: string, sheetName: string, headers: string[], rows: string[][]) => {
  const worksheet = XLSX.utils.aoa_to_sheet([headers, ...rows]);
  const workbook = XLSX.utils.book_new();
  // Excel sheet names are capped at 31 chars.
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName.slice(0, 31));
  XLSX.writeFile(workbook, filename);
};

interface ExportData {
  title: string;
  filename: string;
  headers: string[];
  rows: string[][];
}

const ExportPreviewModal: React.FC<{ data: ExportData; onClose: () => void }> = ({ data, onClose }) => {
  const preview = data.rows.slice(0, 50);
  const truncated = data.rows.length > preview.length;
  return (
    <div
      aria-modal="true"
      className="fixed inset-0 z-[600] flex items-center justify-center bg-black/40 p-4"
      role="dialog"
    >
      <div className="flex max-h-[88vh] w-full max-w-[760px] flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="flex items-start justify-between border-b border-gray-100 px-6 py-4">
          <div>
            <h2 className="text-[16px] font-bold text-[#21295A]">Export Preview — {data.title}</h2>
            <p className="mt-0.5 text-[12px] text-gray-400">
              {data.rows.length} row{data.rows.length === 1 ? '' : 's'} (current page). Review below, then download.
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

        <div className="flex-1 overflow-auto px-6 py-4">
          {data.rows.length === 0 ? (
            <p className="py-10 text-center text-[13px] text-gray-400">Nothing to export.</p>
          ) : (
            <table className="w-full border-collapse text-left text-[12px]">
              <thead>
                <tr className="border-b border-gray-200">
                  {data.headers.map(h => (
                    <th key={h} className="whitespace-nowrap px-2 py-1.5 font-semibold text-gray-500">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {preview.map((r, i) => (
                  <tr key={i} className="border-b border-gray-50">
                    {r.map((cell, j) => (
                      <td key={j} className="whitespace-nowrap px-2 py-1.5 text-gray-700">
                        {cell || '—'}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          {truncated && (
            <p className="mt-3 text-[11px] text-gray-400">
              Showing first {preview.length} of {data.rows.length} rows — all rows are included in the download.
            </p>
          )}
        </div>

        <div className="flex justify-end gap-2 border-t border-gray-100 px-6 py-4">
          <button
            className="rounded-lg border border-gray-200 px-4 py-2 text-[12px] font-semibold text-gray-600 transition hover:bg-gray-50"
            type="button"
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            className="flex items-center gap-1.5 rounded-lg bg-[#21295A] px-4 py-2 text-[12px] font-semibold text-white shadow-sm transition hover:bg-[#2d3570] disabled:opacity-50"
            disabled={data.rows.length === 0}
            type="button"
            onClick={() => downloadXlsx(data.filename, data.title, data.headers, data.rows)}
          >
            <svg fill="none" height={13} stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24" width={13}>
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" x2="12" y1="15" y2="3" />
            </svg>
            Download Excel
          </button>
        </div>
      </div>
    </div>
  );
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

const AddLeadModal: React.FC<{ facilityCode: string; onClose: () => void; onAdded: () => void }> = ({
  facilityCode,
  onClose,
  onAdded,
}) => {
  const dispatch = useDispatch<AppDispatch>();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [plan, setPlan] = useState('all');
  const [saving, setSaving] = useState(false);
  const [tried, setTried] = useState(false);
  // Email is optional, but the backend rejects a lead with neither email nor phone.
  const emailFormatValid = !email.trim() || EMAIL_RE.test(email.trim());
  const nameValid = Boolean(name.trim());
  const contactValid = Boolean(email.trim()) || Boolean(phone.trim());

  const handleSubmit = async () => {
    setTried(true);
    if (!emailFormatValid || !nameValid || !contactValid) return;
    setSaving(true);
    try {
      await dispatch(
        createLead({
          facilityCode,
          name: name.trim(),
          email: email.trim() || undefined,
          phone: phone.trim() || undefined,
          subscriptionCode: plan === 'all' ? undefined : plan,
        })
      ).unwrap();
      toast.success('Enquiry added');
      onAdded();
      onClose();
    } catch (e) {
      toast.error(typeof e === 'string' ? e : 'Could not add the enquiry');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      aria-modal="true"
      className="fixed inset-0 z-[600] flex items-center justify-center bg-black/40 p-4"
      role="dialog"
    >
      <div className="flex max-h-[88vh] w-full max-w-[440px] flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="flex items-start justify-between border-b border-gray-100 px-6 py-4">
          <div>
            <h2 className="text-[16px] font-bold text-[#21295A]">Add Enquiry</h2>
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
            <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-gray-400">Name *</span>
            <input
              className={`w-full rounded-lg border bg-gray-50 px-3 py-2 text-[13px] text-gray-700 outline-none transition focus:bg-white ${
                tried && !nameValid ? 'border-red-400 ring-1 ring-red-300' : 'border-gray-200 focus:border-[#21295A]'
              }`}
              placeholder="e.g. Jordan Smith"
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
            />
            {tried && !nameValid && <p className="mt-1 text-[11px] text-red-500">Name is required.</p>}
          </div>
          <div>
            <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-gray-400">Email</span>
            <input
              className={`w-full rounded-lg border bg-gray-50 px-3 py-2 text-[13px] text-gray-700 outline-none transition focus:bg-white ${
                tried && !emailFormatValid
                  ? 'border-red-400 ring-1 ring-red-300'
                  : 'border-gray-200 focus:border-[#21295A]'
              }`}
              placeholder="jordan@example.com"
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
            />
            {tried && !emailFormatValid && (
              <p className="mt-1 text-[11px] text-red-500">Enter a valid email address.</p>
            )}
          </div>
          <div>
            <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-gray-400">Phone</span>
            <input
              className={`w-full rounded-lg border bg-gray-50 px-3 py-2 text-[13px] text-gray-700 outline-none transition focus:bg-white ${
                tried && !contactValid ? 'border-red-400 ring-1 ring-red-300' : 'border-gray-200 focus:border-[#21295A]'
              }`}
              placeholder="+1 555 000 0000"
              type="tel"
              value={phone}
              onChange={e => setPhone(e.target.value)}
            />
            {tried && !contactValid && (
              <p className="mt-1 text-[11px] text-red-500">Provide at least an email or a phone number.</p>
            )}
          </div>
          <div>
            <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-gray-400">
              Plan interest
            </span>
            <select
              className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-[13px] text-gray-700 outline-none transition focus:border-[#21295A] focus:bg-white"
              value={plan}
              onChange={e => setPlan(e.target.value)}
            >
              {PLAN_FILTERS.map(f => (
                <option key={f.value} value={f.value}>
                  {f.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex justify-end gap-2 border-t border-gray-100 px-6 py-4">
          <button
            className="rounded-lg border border-gray-200 px-4 py-2 text-[12px] font-semibold text-gray-600 transition hover:bg-gray-50 disabled:opacity-50"
            disabled={saving}
            type="button"
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            className="rounded-lg bg-[#21295A] px-5 py-2 text-[12px] font-semibold text-white shadow-sm transition hover:bg-[#2d3570] disabled:opacity-50"
            disabled={saving}
            type="button"
            onClick={handleSubmit}
          >
            {saving ? 'Adding…' : 'Add Enquiry'}
          </button>
        </div>
      </div>
    </div>
  );
};

const WaitlistLeads = () => {
  const dispatch = useDispatch<AppDispatch>();
  const facilityCode = getFacilityCode();
  const { waitlist, waitlistLoading, waitlistError, leads, leadsLoading, leadsError } = useSelector(
    (state: RootState) => state.centres
  );

  const [tab, setTab] = useState<'waitlist' | 'leads'>('waitlist');
  const [typeFilter, setTypeFilter] = useState('all');
  const [waitlistSearch, setWaitlistSearch] = useState('');
  // The Waitlist tab always loads the FULL dataset (see fetchAllWaitlist) — both
  // to let the Type filter search everything, not just one page, and to build
  // its filter chips/labels dynamically from whatever types actually exist.
  // Pagination over that full set is therefore client-side, tracked here so the
  // "Position" column can still show a correct absolute number on later pages.
  const [waitlistUiPage, setWaitlistUiPage] = useState(0);
  const [waitlistUiRowsPerPage, setWaitlistUiRowsPerPage] = useState(PAGE_SIZE);
  // The Enquires (Leads) tab also loads the FULL dataset (see fetchAllLeads) so
  // the search box below can match against every entry, not just one page —
  // same reasoning and pagination approach as the Waitlist tab above.
  const [leadsSearch, setLeadsSearch] = useState('');
  const [leadsUiPage, setLeadsUiPage] = useState(0);
  const [leadsUiRowsPerPage, setLeadsUiRowsPerPage] = useState(PAGE_SIZE);
  const [showExport, setShowExport] = useState(false);
  const [showAddLead, setShowAddLead] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [viewEntry, setViewEntry] = useState<{
    type: 'waitlist' | 'lead';
    id: string;
    title: string;
    name: string;
    email?: string;
    status: ContactStatus;
    statusHistory: StatusHistoryEntry[];
    fields: DetailField[];
    notes: AdminNote[];
    /** Only manually-added leads ("+ Add Enquiry") are deletable — funnel-derived ones aren't. */
    isManualLead: boolean;
  } | null>(null);

  const openWaitlistEntry = (entry: WaitlistEntry, index: number) => {
    const typeLabel = entry.subscriptionSrc ? typeMetaFor(typeKeyOf(entry)).label : '—';
    const pos = entry.position ?? waitlistUiPage * waitlistUiRowsPerPage + index + 1;
    setViewEntry({
      type: 'waitlist',
      id: entry.id || '',
      title: 'Waitlist Member',
      name: entry.name || entry.email || 'Unknown',
      email: entry.email,
      status: entry.status || 'not_contacted',
      statusHistory: entry.statusHistory || [],
      fields: [
        { label: 'Waitlist Type', value: typeLabel },
        { label: 'Email', value: entry.email || '—' },
        { label: 'Phone', value: waitlistPhoneOf(entry) },
        { label: 'Date Added', value: readableDate(entry.createdAt) },
        { label: 'Position', value: `#${pos}` },
      ],
      notes: entry.notes || [],
      isManualLead: false,
    });
  };

  const openLeadEntry = (entry: LeadEntry) => {
    const plan = leadPlanOf(entry);
    const cycle = entry.details?.billing_cycle ?? '';
    setViewEntry({
      type: 'lead',
      id: entry.id || '',
      title: 'Enquiry',
      name: leadDisplayNameOf(entry),
      // Only show a separate email line when the name isn't already the email
      // (funnel-derived leads have no name, so name already IS the email).
      email: entry.details?.name ? entry.details?.email : undefined,
      status: entry.status || 'not_contacted',
      statusHistory: entry.statusHistory || [],
      fields: [
        { label: 'Action', value: entry.action ? titleCase(entry.action) : '—' },
        { label: 'Requested Plan', value: plan ? titleCase(plan) : '—' },
        { label: 'Phone', value: entry.details?.phoneNo || '—' },
        { label: 'Billing Cycle', value: cycle ? titleCase(cycle) : '—' },
        { label: 'Date', value: readableDate(entry.timestamp || entry.createdAt) },
      ],
      notes: entry.notes || [],
      isManualLead: entry.action === 'manual_lead_created',
    });
  };

  const handleAddNote = async (text: string) => {
    if (!viewEntry || !facilityCode) return;
    if (viewEntry.type === 'waitlist') {
      const updated = await dispatch(addWaitlistNote({ facilityCode, waitlistId: viewEntry.id, text })).unwrap();
      setViewEntry(prev => (prev ? { ...prev, notes: updated.notes || [] } : prev));
    } else {
      const updated = await dispatch(addLeadNote({ facilityCode, leadId: viewEntry.id, text })).unwrap();
      setViewEntry(prev => (prev ? { ...prev, notes: updated.notes || [] } : prev));
    }
    toast.success('Note saved');
  };

  const handleDeleteNote = async (noteId: string) => {
    if (!viewEntry || !facilityCode) return;
    if (viewEntry.type === 'waitlist') {
      const updated = await dispatch(deleteWaitlistNote({ facilityCode, waitlistId: viewEntry.id, noteId })).unwrap();
      setViewEntry(prev => (prev ? { ...prev, notes: updated.notes || [] } : prev));
    } else {
      const updated = await dispatch(deleteLeadNote({ facilityCode, leadId: viewEntry.id, noteId })).unwrap();
      setViewEntry(prev => (prev ? { ...prev, notes: updated.notes || [] } : prev));
    }
  };

  const handleDeleteEntry = async () => {
    if (!viewEntry || !facilityCode || viewEntry.type !== 'lead') return;
    await dispatch(deleteLead({ facilityCode, leadId: viewEntry.id })).unwrap();
    toast.success('Enquiry deleted');
    setViewEntry(null);
  };

  const handleStatusChange = async (status: ContactStatus) => {
    if (!viewEntry || !facilityCode) return;
    if (viewEntry.type === 'waitlist') {
      const updated = await dispatch(updateWaitlistStatus({ facilityCode, waitlistId: viewEntry.id, status })).unwrap();
      setViewEntry(prev =>
        prev
          ? { ...prev, status: updated.status || status, statusHistory: updated.statusHistory || prev.statusHistory }
          : prev
      );
    } else {
      const updated = await dispatch(updateLeadStatus({ facilityCode, leadId: viewEntry.id, status })).unwrap();
      setViewEntry(prev =>
        prev
          ? { ...prev, status: updated.status || status, statusHistory: updated.statusHistory || prev.statusHistory }
          : prev
      );
    }
    toast.success('Status updated');
  };

  // Fetches EVERY waitlist row (bypasses pagination) — the Waitlist tab always
  // loads the full set, both so the Type filter searches everything (not just
  // one page) and so its chips can be built from the real distinct types below.
  const fetchAllWaitlist = useCallback(() => {
    if (!facilityCode) return;
    dispatch(getCentreWaitlist({ facilityCode, page: 1, limit: PAGE_SIZE, all: true }));
  }, [dispatch, facilityCode]);

  // Fetches EVERY lead row (bypasses pagination) — the Enquires tab always
  // loads the full set, so the search box below can match every entry, not
  // just the current page (mirrors fetchAllWaitlist above).
  const fetchAllLeads = useCallback(() => {
    if (!facilityCode) return;
    dispatch(getCentreLeads({ facilityCode, page: 1, limit: PAGE_SIZE, all: true }));
  }, [dispatch, facilityCode]);

  // Initial load + tab switch: always fetch the active tab fresh, filters already reset.
  useEffect(() => {
    if (tab === 'waitlist') fetchAllWaitlist();
    else fetchAllLeads();
  }, [tab, fetchAllWaitlist, fetchAllLeads]);

  const switchTab = (next: 'waitlist' | 'leads') => {
    if (next === tab) return;
    setTypeFilter('all');
    setWaitlistSearch('');
    setLeadsSearch('');
    setTab(next);
  };

  const onTypeChange = (value: string) => {
    setTypeFilter(value);
    setWaitlistUiPage(0);
  };

  // Every distinct type actually present in the loaded waitlist, built fresh
  // each time it changes — so a brand new campaign source shows up as its own
  // chip automatically (see typeKeyOf/typeMetaFor above), with no code change.
  const typeFilterOptions = useMemo(() => {
    const seen = new Map<string, string>();
    waitlist.forEach(e => {
      if (!e.subscriptionSrc) return;
      const bucket = typeKeyOf(e);
      if (!seen.has(bucket)) seen.set(bucket, typeMetaFor(bucket).label);
    });
    const dynamic = Array.from(seen, ([value, label]) => ({ value, label })).sort((a, b) =>
      a.label.localeCompare(b.label)
    );
    return [{ label: 'All types', value: 'all' }, ...dynamic];
  }, [waitlist]);

  // Applied client-side over the full loaded dataset (see fetchAllWaitlist) —
  // Type chip first, then a partial match on name, email, phone or contact status.
  const waitlistRows = useMemo(() => {
    let rows = typeFilter === 'all' ? waitlist : waitlist.filter(e => typeKeyOf(e) === typeFilter);
    const q = waitlistSearch.trim().toLowerCase();
    if (q) {
      rows = rows.filter(e => {
        const name = (e.name || '').toLowerCase();
        const email = (e.email || '').toLowerCase();
        const phone = (e.phoneNo || '').toLowerCase();
        const statusLabel = STATUS_META[e.status || 'not_contacted'].label.toLowerCase();
        return name.includes(q) || email.includes(q) || phone.includes(q) || statusLabel.includes(q);
      });
    }
    return rows;
  }, [waitlist, typeFilter, waitlistSearch]);

  // Reset to page 1 whenever the filtered set changes size, so switching
  // filters (or a fresh import) never leaves the table on an out-of-range page.
  useEffect(() => {
    setWaitlistUiPage(0);
  }, [waitlistRows.length]);

  // Applied client-side over the full loaded dataset (see fetchAllLeads) —
  // matches a partial name, email, phone number or contact status, same idiom as waitlistRows.
  const leadsRows = useMemo(() => {
    const q = leadsSearch.trim().toLowerCase();
    if (!q) return leads;
    return leads.filter(l => {
      const name = leadDisplayNameOf(l).toLowerCase();
      const email = (l.details?.email || '').toLowerCase();
      const phone = (l.details?.phoneNo || '').toLowerCase();
      const statusLabel = STATUS_META[l.status || 'not_contacted'].label.toLowerCase();
      return name.includes(q) || email.includes(q) || phone.includes(q) || statusLabel.includes(q);
    });
  }, [leads, leadsSearch]);

  // Reset to page 1 whenever the filtered set changes size, so a new search
  // (or a fresh add) never leaves the table on an out-of-range page.
  useEffect(() => {
    setLeadsUiPage(0);
  }, [leadsRows.length]);

  // Export payload for the active tab — the full filtered set (see waitlistRows).
  const exportData: ExportData = useMemo(() => {
    if (tab === 'waitlist') {
      return {
        title: 'Waitlist',
        filename: `waitlist-${facilityCode || 'centre'}.xlsx`,
        headers: ['Name', 'Email', 'Phone', 'Waitlist Type', 'Status', 'Date Added', 'Position'],
        rows: waitlistRows.map((e, i) => {
          const typeLabel = e.subscriptionSrc ? typeMetaFor(typeKeyOf(e)).label : '';
          const pos = e.position ?? i + 1;
          return [
            e.name || '',
            e.email || '',
            e.phoneNo ? waitlistPhoneOf(e) : '',
            typeLabel,
            STATUS_META[e.status || 'not_contacted'].label,
            readableDate(e.createdAt),
            `#${pos}`,
          ];
        }),
      };
    }
    return {
      title: 'Enquires',
      filename: `enquires-${facilityCode || 'centre'}.xlsx`,
      headers: ['Name', 'Email', 'Phone', 'Action', 'Plan', 'Billing', 'Status', 'Date'],
      rows: leadsRows.map(l => {
        const plan = leadPlanOf(l);
        const cycle = l.details?.billing_cycle ?? '';
        return [
          l.details?.name || '',
          l.details?.email || '',
          l.details?.phoneNo || '',
          l.action ? titleCase(l.action) : '',
          plan ? titleCase(plan) : '',
          cycle ? titleCase(cycle) : '',
          STATUS_META[l.status || 'not_contacted'].label,
          readableDate(l.timestamp || l.createdAt),
        ];
      }),
    };
  }, [tab, waitlistRows, leadsRows, facilityCode]);

  const waitlistColumns: ColumnDef[] = [
    {
      field: 'member',
      headerName: 'Member',
      flex: 1.5,
      minWidth: 220,
      sortable: false,
      renderCell: ({ row }) => {
        const name = (row as WaitlistEntry).name || (row as WaitlistEntry).email || 'Unknown';
        return (
          <div className="flex items-center gap-3">
            <span
              className="inline-flex h-[30px] w-[30px] flex-shrink-0 items-center justify-center rounded-full text-[11px] font-bold text-white"
              style={{ background: avatarColor(name) }}
            >
              {initials(name)}
            </span>
            <div>
              <p className="text-[13px] font-semibold text-[#21295A]">{name}</p>
              <p className="text-[11px] text-gray-400">{(row as WaitlistEntry).email || ''}</p>
            </div>
          </div>
        );
      },
    },
    {
      field: 'phoneNo',
      headerName: 'Phone',
      flex: 1,
      minWidth: 120,
      sortable: false,
      renderCell: ({ row }) => (
        <span className="text-[13px] text-gray-700">{waitlistPhoneOf(row as WaitlistEntry)}</span>
      ),
    },
    {
      field: 'createdAt',
      headerName: 'Date Added',
      flex: 1,
      minWidth: 120,
      sortable: false,
      renderCell: ({ row }) => (
        <span className="text-[13px] text-gray-500">{readableDate((row as WaitlistEntry).createdAt)}</span>
      ),
    },
    {
      field: 'subscriptionSrc',
      headerName: 'Waitlist Type',
      flex: 1,
      minWidth: 130,
      sortable: false,
      renderCell: ({ row }) => {
        const entry = row as WaitlistEntry;
        if (!entry.subscriptionSrc) return <span className="text-[13px] text-gray-400">—</span>;
        const meta = typeMetaFor(typeKeyOf(entry));
        return (
          <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${meta.className}`}>{meta.label}</span>
        );
      },
    },
    {
      field: 'status',
      headerName: 'Status',
      flex: 1,
      minWidth: 130,
      sortable: false,
      renderCell: ({ row }) => <StatusBadge status={(row as WaitlistEntry).status} />,
    },
    {
      field: 'position',
      headerName: 'Position',
      flex: 0.7,
      minWidth: 90,
      sortable: false,
      renderCell: ({ row, index }) => {
        const entry = row as WaitlistEntry;
        const pos = entry.position ?? waitlistUiPage * waitlistUiRowsPerPage + index + 1;
        return <span className="text-[13px] font-bold text-[#21295A]">#{pos}</span>;
      },
    },
    {
      field: 'actions',
      headerName: '',
      flex: 0.6,
      minWidth: 80,
      sortable: false,
      renderCell: ({ row, index }) => (
        <button
          className="rounded-lg border border-[#21295A]/20 bg-[#21295A]/5 px-3 py-1.5 text-[12px] font-semibold text-[#21295A] transition-all hover:bg-[#21295A] hover:text-white"
          type="button"
          onClick={() => openWaitlistEntry(row as WaitlistEntry, index)}
        >
          View
        </button>
      ),
    },
  ];

  const leadsColumns: ColumnDef[] = [
    {
      field: 'member',
      headerName: 'Member',
      flex: 1.4,
      minWidth: 220,
      sortable: false,
      renderCell: ({ row }) => {
        const entry = row as LeadEntry;
        const name = leadDisplayNameOf(entry);
        const email = entry.details?.email;
        return (
          <div className="flex items-center gap-3">
            <span
              className="inline-flex h-[30px] w-[30px] flex-shrink-0 items-center justify-center rounded-full text-[11px] font-bold text-white"
              style={{ background: avatarColor(name) }}
            >
              {initials(name)}
            </span>
            <div>
              <p className="text-[13px] font-semibold text-[#21295A]">{name}</p>
              {email && email !== name && <p className="text-[11px] text-gray-400">{email}</p>}
            </div>
          </div>
        );
      },
    },
    {
      field: 'action',
      headerName: 'Action',
      flex: 1.3,
      minWidth: 200,
      sortable: false,
      renderCell: ({ row }) => {
        const { action } = row as LeadEntry;
        return <span className="text-[13px] text-gray-700">{action ? titleCase(action) : '—'}</span>;
      },
    },
    {
      field: 'plan',
      headerName: 'Plan',
      flex: 0.9,
      minWidth: 120,
      sortable: false,
      renderCell: ({ row }) => {
        const plan = leadPlanOf(row as LeadEntry);
        return <span className="text-[13px] text-gray-700">{plan ? titleCase(plan) : '—'}</span>;
      },
    },
    {
      field: 'billing',
      headerName: 'Billing',
      flex: 0.9,
      minWidth: 120,
      sortable: false,
      renderCell: ({ row }) => {
        const cycle = (row as LeadEntry).details?.billing_cycle;
        return (
          <span className="rounded-md bg-gray-100 px-2 py-0.5 text-[12px] font-medium text-gray-600">
            {cycle ? titleCase(cycle) : '—'}
          </span>
        );
      },
    },
    {
      field: 'date',
      headerName: 'Date',
      flex: 1,
      minWidth: 120,
      sortable: false,
      renderCell: ({ row }) => {
        const lead = row as LeadEntry;
        return <span className="text-[13px] text-gray-500">{readableDate(lead.timestamp || lead.createdAt)}</span>;
      },
    },
    {
      field: 'status',
      headerName: 'Status',
      flex: 1,
      minWidth: 130,
      sortable: false,
      renderCell: ({ row }) => <StatusBadge status={(row as LeadEntry).status} />,
    },
    {
      field: 'actions',
      headerName: '',
      flex: 0.6,
      minWidth: 80,
      sortable: false,
      renderCell: ({ row }) => (
        <button
          className="rounded-lg border border-[#21295A]/20 bg-[#21295A]/5 px-3 py-1.5 text-[12px] font-semibold text-[#21295A] transition-all hover:bg-[#21295A] hover:text-white"
          type="button"
          onClick={() => openLeadEntry(row as LeadEntry)}
        >
          View
        </button>
      ),
    },
  ];

  return (
    <div className="w-full">
      {/* ── Page Header ─────────────────────────────────────── */}
      <div className="mb-5 flex items-start justify-between gap-3 border-b border-gray-100 pb-4">
        <div>
          <h1 className="text-[18px] font-bold tracking-tight text-[#21295A]">Waitlist / Enquires</h1>
          <p className="mt-1 text-[12px] font-medium text-gray-400">
            Members waiting for a spot · Enquires who toured but haven&apos;t joined
          </p>
        </div>
        <div className="flex items-center gap-2">
          {tab === 'leads' && (
            <button
              className="flex items-center gap-1.5 rounded-lg border border-[#21295A]/20 bg-white px-4 py-2 text-[12px] font-semibold text-[#21295A] shadow-sm transition hover:bg-[#21295A]/5"
              type="button"
              onClick={() => setShowAddLead(true)}
            >
              <svg fill="none" height={13} stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24" width={13}>
                <line x1="12" x2="12" y1="5" y2="19" />
                <line x1="5" x2="19" y1="12" y2="12" />
              </svg>
              Add Enquiry
            </button>
          )}
          {tab === 'waitlist' && (
            <button
              className="flex items-center gap-1.5 rounded-lg border border-[#21295A]/20 bg-white px-4 py-2 text-[12px] font-semibold text-[#21295A] shadow-sm transition hover:bg-[#21295A]/5"
              type="button"
              onClick={() => setShowImport(true)}
            >
              <svg fill="none" height={13} stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24" width={13}>
                <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
                <polyline points="17 8 12 3 7 8" />
                <line x1="12" x2="12" y1="3" y2="15" />
              </svg>
              Import from Excel
            </button>
          )}
          <button
            className="flex items-center gap-1.5 rounded-lg bg-[#21295A] px-4 py-2 text-[12px] font-semibold text-white shadow-sm transition hover:bg-[#2d3570]"
            type="button"
            onClick={() => setShowExport(true)}
          >
            <svg fill="none" height={13} stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24" width={13}>
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" x2="12" y1="15" y2="3" />
            </svg>
            Export
          </button>
        </div>
      </div>

      {/* ── Tab switch ──────────────────────────────────────── */}
      <div className="mb-4 flex w-fit gap-0.5 rounded-[10px] bg-gray-100 p-[3px]">
        {(['waitlist', 'leads'] as const).map(t => (
          <button
            key={t}
            className={`rounded-lg px-[18px] py-1.5 text-[13px] transition-all ${
              tab === t
                ? 'bg-[#21295A] font-semibold text-white'
                : 'bg-transparent font-medium text-gray-500 hover:text-gray-700'
            }`}
            type="button"
            onClick={() => switchTab(t)}
          >
            {t === 'waitlist' ? 'Waitlist' : 'Enquires'}
          </button>
        ))}
      </div>

      {tab === 'waitlist' ? (
        <>
          {/* ── Filter Bar ──────────────────────────────────── */}
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-gray-100 bg-white px-4 py-3 shadow-sm">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">Type</span>
              {typeFilterOptions.map(f => (
                <Chip key={f.value} active={typeFilter === f.value} onClick={() => onTypeChange(f.value)}>
                  {f.label}
                </Chip>
              ))}
            </div>
            <input
              className="w-full max-w-xs rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-[13px] text-gray-700 outline-none transition focus:border-[#21295A] focus:bg-white"
              placeholder="Search by name, phone, email or status…"
              type="text"
              value={waitlistSearch}
              onChange={e => setWaitlistSearch(e.target.value)}
            />
          </div>

          <div className="mb-2 flex justify-end">
            <span className="text-[11px] text-gray-400">
              {waitlistRows.length} of {waitlist.length} entries
            </span>
          </div>

          {waitlistError ? (
            <ErrorState message={waitlistError} onRetry={fetchAllWaitlist} />
          ) : (
            <div className="overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm">
              <DataTable
                columns={mapColumns(waitlistColumns)}
                data={waitlistRows}
                emptyState={{
                  subtitle: 'Try adjusting your filters',
                  title: 'No waitlist entries for this centre',
                }}
                getRowId={row => row.id || `${row.email ?? ''}-${row.position ?? ''}`}
                loading={waitlistLoading}
                page={waitlistUiPage}
                rowsPerPage={waitlistUiRowsPerPage}
                onPageChange={setWaitlistUiPage}
                onRowsPerPageChange={rowsPerPage => {
                  setWaitlistUiRowsPerPage(rowsPerPage);
                  setWaitlistUiPage(0);
                }}
              />
            </div>
          )}
        </>
      ) : (
        <>
          {/* ── Filter Bar ──────────────────────────────────── */}
          <div className="mb-4 flex flex-wrap items-center gap-3 rounded-xl border border-gray-100 bg-white px-4 py-3 shadow-sm">
            <input
              className="w-full max-w-xs rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-[13px] text-gray-700 outline-none transition focus:border-[#21295A] focus:bg-white"
              placeholder="Search by name, phone, email or status…"
              type="text"
              value={leadsSearch}
              onChange={e => setLeadsSearch(e.target.value)}
            />
          </div>

          <div className="mb-2 flex justify-end">
            <span className="text-[11px] text-gray-400">
              {leadsRows.length} of {leads.length} entries
            </span>
          </div>

          {leadsError ? (
            <ErrorState message={leadsError} onRetry={fetchAllLeads} />
          ) : (
            <div className="overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm">
              <DataTable
                columns={mapColumns(leadsColumns)}
                data={leadsRows}
                emptyState={{
                  subtitle: leadsSearch
                    ? 'Try a different name, phone or email'
                    : 'Enquires appear here once prospects tour the centre',
                  title: leadsSearch ? 'No matching enquires' : 'No enquires for this centre',
                }}
                getRowId={row => row.id || row.details?.email || `${row.action ?? ''}-${row.timestamp ?? ''}`}
                loading={leadsLoading}
                page={leadsUiPage}
                rowsPerPage={leadsUiRowsPerPage}
                onPageChange={setLeadsUiPage}
                onRowsPerPageChange={rowsPerPage => {
                  setLeadsUiRowsPerPage(rowsPerPage);
                  setLeadsUiPage(0);
                }}
              />
            </div>
          )}
        </>
      )}

      {showExport && <ExportPreviewModal data={exportData} onClose={() => setShowExport(false)} />}
      {showAddLead && facilityCode && (
        <AddLeadModal facilityCode={facilityCode} onAdded={fetchAllLeads} onClose={() => setShowAddLead(false)} />
      )}
      {showImport && facilityCode && (
        <ImportWaitlistModal
          facilityCode={facilityCode}
          onClose={() => setShowImport(false)}
          onImported={fetchAllWaitlist}
        />
      )}
      {viewEntry && (
        <MemberDetailDrawer
          email={viewEntry.email}
          fields={viewEntry.fields}
          name={viewEntry.name}
          notes={viewEntry.notes}
          status={viewEntry.status}
          statusHistory={viewEntry.statusHistory}
          title={viewEntry.title}
          onAddNote={handleAddNote}
          onClose={() => setViewEntry(null)}
          onDeleteEntry={viewEntry.isManualLead ? handleDeleteEntry : undefined}
          onDeleteNote={handleDeleteNote}
          onStatusChange={handleStatusChange}
        />
      )}
    </div>
  );
};

export default WaitlistLeads;
