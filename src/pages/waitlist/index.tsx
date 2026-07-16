import { useCallback, useEffect, useMemo, useState } from 'react';

import { toast } from 'react-hot-toast';
import { useDispatch, useSelector } from 'react-redux';

import DataTable from '../../components/Table/DataTable';
import { ColumnDef, TableColumn } from '../../components/Table/types';
import { getFacilityCode } from '../../constants/user';
import { getCentreLeads, getCentreWaitlist } from '../../store/centres/api';
import { LeadEntry, WaitlistEntry } from '../../store/centres/types';
import { AppDispatch, RootState } from '../../store/store';
import { formatDate } from '../../utils/dateUtils';

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

const normalizePlan = (s: string): string => s.toLowerCase().replace(/[\s_-]+/g, '');
const planOf = (e: WaitlistEntry): string => (e.plan || e.details?.subscription_code || '').toString();

// PLAN filter is client-side (the waitlist endpoint takes no plan param).
const PLAN_FILTERS: { label: string; value: string }[] = [
  { label: 'All plans', value: 'all' },
  { label: 'Premium', value: 'premium' },
  { label: 'Standard', value: 'standard' },
  { label: 'Off Peak', value: 'offpeak' },
  { label: 'Family', value: 'family' },
  { label: 'Night Owl', value: 'nightowl' },
];

const WAITLIST_TYPE_META: Record<string, { label: string; className: string }> = {
  foundation: { label: 'Foundation', className: 'bg-amber-100 text-amber-700' },
  launchwaitlist: { label: 'Post Launch', className: 'bg-gray-100 text-gray-600' },
};

const comingSoon = () => toast('Coming soon');

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

// ── Export preview / download (CSV) ──────────────────────────
const csvEscape = (v: string): string => {
  const s = (v ?? '').toString();
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

const downloadCsv = (filename: string, headers: string[], rows: string[][]) => {
  const rowsCsv = [headers, ...rows].map(r => r.map(csvEscape).join(',')).join('\n');
  // Leading BOM so Excel opens the UTF-8 file correctly.
  const bom = String.fromCharCode(0xfeff);
  const blob = new Blob([bom + rowsCsv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
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
            onClick={() => downloadCsv(data.filename, data.headers, data.rows)}
          >
            <svg fill="none" height={13} stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24" width={13}>
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" x2="12" y1="15" y2="3" />
            </svg>
            Download CSV
          </button>
        </div>
      </div>
    </div>
  );
};

const WaitlistLeads = () => {
  const dispatch = useDispatch<AppDispatch>();
  const facilityCode = getFacilityCode();
  const {
    waitlist,
    waitlistLoading,
    waitlistError,
    waitlistTotal,
    waitlistPage,
    waitlistLimit,
    leads,
    leadsLoading,
    leadsError,
    leadsTotal,
    leadsPage,
    leadsLimit,
  } = useSelector((state: RootState) => state.centres);

  const [tab, setTab] = useState<'waitlist' | 'leads'>('waitlist');
  const [planFilter, setPlanFilter] = useState('all');
  const [showExport, setShowExport] = useState(false);

  const fetchWaitlist = useCallback(
    (page: number, limit: number, src?: string) => {
      if (!facilityCode) return;
      dispatch(getCentreWaitlist({ facilityCode, subscriptionSrc: src, page, limit }));
    },
    [dispatch, facilityCode]
  );

  const fetchLeads = useCallback(
    (page: number, limit: number) => {
      if (!facilityCode) return;
      dispatch(getCentreLeads({ facilityCode, page, limit }));
    },
    [dispatch, facilityCode]
  );

  // Initial load + tab switch: always fetch the active tab fresh, filters already reset.
  useEffect(() => {
    if (tab === 'waitlist') fetchWaitlist(1, PAGE_SIZE, undefined);
    else fetchLeads(1, PAGE_SIZE);
  }, [tab, fetchWaitlist, fetchLeads]);

  const switchTab = (next: 'waitlist' | 'leads') => {
    if (next === tab) return;
    setPlanFilter('all');
    setTab(next);
  };

  const onPlanChange = (value: string) => {
    setPlanFilter(value);
    fetchWaitlist(1, waitlistLimit || PAGE_SIZE);
  };

  // Plan filter is applied client-side on the loaded page.
  const waitlistRows = useMemo(() => {
    if (planFilter === 'all') return waitlist;
    return waitlist.filter(e => normalizePlan(planOf(e)) === planFilter);
  }, [waitlist, planFilter]);

  // Export payload for the active tab (the currently loaded page of rows).
  const exportData: ExportData = useMemo(() => {
    if (tab === 'waitlist') {
      const base = ((waitlistPage || 1) - 1) * (waitlistLimit || PAGE_SIZE);
      return {
        title: 'Waitlist',
        filename: `waitlist-${facilityCode || 'centre'}.csv`,
        headers: ['Name', 'Email', 'Waitlist Type', 'Plan', 'Date Added', 'Position'],
        rows: waitlistRows.map((e, i) => {
          const src = (e.subscriptionSrc || '').toLowerCase();
          const typeLabel = WAITLIST_TYPE_META[src]?.label || (src ? titleCase(src) : '');
          const plan = planOf(e);
          const pos = e.position ?? base + i + 1;
          return [
            e.name || '',
            e.email || '',
            typeLabel,
            plan ? titleCase(plan) : '',
            readableDate(e.createdAt),
            `#${pos}`,
          ];
        }),
      };
    }
    return {
      title: 'Leads',
      filename: `leads-${facilityCode || 'centre'}.csv`,
      headers: ['Email', 'Action', 'Plan', 'Billing', 'Date'],
      rows: leads.map(l => {
        const code = l.details?.subscription_code ?? '';
        const cycle = l.details?.billing_cycle ?? '';
        return [
          l.details?.email || '',
          l.action ? titleCase(l.action) : '',
          code ? titleCase(code) : '',
          cycle ? titleCase(cycle) : '',
          readableDate(l.timestamp || l.createdAt),
        ];
      }),
    };
  }, [tab, waitlistRows, leads, waitlistPage, waitlistLimit, facilityCode]);

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
      field: 'subscriptionSrc',
      headerName: 'Waitlist Type',
      flex: 1,
      minWidth: 130,
      sortable: false,
      renderCell: ({ row }) => {
        const src = ((row as WaitlistEntry).subscriptionSrc || '').toLowerCase();
        const meta = WAITLIST_TYPE_META[src] || {
          label: src ? titleCase(src) : '—',
          className: 'bg-gray-100 text-gray-600',
        };
        return (
          <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${meta.className}`}>{meta.label}</span>
        );
      },
    },
    {
      field: 'plan',
      headerName: 'Plan',
      flex: 1,
      minWidth: 120,
      sortable: false,
      renderCell: ({ row }) => {
        const plan = planOf(row as WaitlistEntry);
        return <span className="text-[13px] text-gray-700">{plan ? titleCase(plan) : '—'}</span>;
      },
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
      field: 'position',
      headerName: 'Position',
      flex: 0.7,
      minWidth: 90,
      sortable: false,
      renderCell: ({ row, index }) => {
        const entry = row as WaitlistEntry;
        const pos = entry.position ?? ((waitlistPage || 1) - 1) * (waitlistLimit || PAGE_SIZE) + index + 1;
        return <span className="text-[13px] font-bold text-[#21295A]">#{pos}</span>;
      },
    },
    {
      field: 'actions',
      headerName: '',
      flex: 0.6,
      minWidth: 80,
      sortable: false,
      renderCell: () => (
        <button
          className="rounded-lg border border-[#21295A]/20 bg-[#21295A]/5 px-3 py-1.5 text-[12px] font-semibold text-[#21295A] transition-all hover:bg-[#21295A] hover:text-white"
          type="button"
          onClick={comingSoon}
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
        const email = (row as LeadEntry).details?.email || 'Unknown';
        return (
          <div className="flex items-center gap-3">
            <span
              className="inline-flex h-[30px] w-[30px] flex-shrink-0 items-center justify-center rounded-full text-[11px] font-bold text-white"
              style={{ background: avatarColor(email) }}
            >
              {initials(email)}
            </span>
            <p className="text-[13px] font-semibold text-[#21295A]">{email}</p>
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
        const code = (row as LeadEntry).details?.subscription_code;
        return <span className="text-[13px] text-gray-700">{code ? titleCase(code) : '—'}</span>;
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
      field: 'actions',
      headerName: '',
      flex: 0.6,
      minWidth: 80,
      sortable: false,
      renderCell: () => (
        <button
          className="rounded-lg border border-[#21295A]/20 bg-[#21295A]/5 px-3 py-1.5 text-[12px] font-semibold text-[#21295A] transition-all hover:bg-[#21295A] hover:text-white"
          type="button"
          onClick={comingSoon}
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
          <h1 className="text-[18px] font-bold tracking-tight text-[#21295A]">Waitlist / Leads</h1>
          <p className="mt-1 text-[12px] font-medium text-gray-400">
            Members waiting for a spot · Leads who toured but haven&apos;t joined
          </p>
        </div>
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
            {t === 'waitlist' ? 'Waitlist' : 'Leads'}
          </button>
        ))}
      </div>

      {tab === 'waitlist' ? (
        <>
          {/* ── Filter Bar ──────────────────────────────────── */}
          <div className="mb-4 flex flex-wrap items-center gap-3 rounded-xl border border-gray-100 bg-white px-4 py-3 shadow-sm">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">Plan</span>
              {PLAN_FILTERS.map(f => (
                <Chip key={f.value} active={planFilter === f.value} onClick={() => onPlanChange(f.value)}>
                  {f.label}
                </Chip>
              ))}
            </div>
          </div>

          <div className="mb-2 flex justify-end">
            <span className="text-[11px] text-gray-400">
              {waitlistRows.length} of {waitlistTotal} entries
            </span>
          </div>

          {waitlistError ? (
            <ErrorState
              message={waitlistError}
              onRetry={() => fetchWaitlist(1, waitlistLimit || PAGE_SIZE)}
            />
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
                page={(waitlistPage || 1) - 1}
                rowsPerPage={waitlistLimit || PAGE_SIZE}
                serverSide={true}
                totalRows={waitlistTotal}
                onPageChange={(page: number) => {
                  const limit = waitlistLimit || PAGE_SIZE;
                  const newPage = page + 1;
                  if (newPage !== (waitlistPage || 1)) fetchWaitlist(newPage, limit);
                }}
                onRowsPerPageChange={(rowsPerPage: number) => fetchWaitlist(1, rowsPerPage)}
              />
            </div>
          )}
        </>
      ) : (
        <>
          <div className="mb-2 flex justify-end">
            <span className="text-[11px] text-gray-400">
              {leads.length} of {leadsTotal} entries
            </span>
          </div>

          {leadsError ? (
            <ErrorState message={leadsError} onRetry={() => fetchLeads(1, leadsLimit || PAGE_SIZE)} />
          ) : (
            <div className="overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm">
              <DataTable
                columns={mapColumns(leadsColumns)}
                data={leads}
                emptyState={{
                  subtitle: 'Leads appear here once prospects tour the centre',
                  title: 'No leads for this centre',
                }}
                getRowId={row => row.id || row.details?.email || `${row.action ?? ''}-${row.timestamp ?? ''}`}
                loading={leadsLoading}
                page={(leadsPage || 1) - 1}
                rowsPerPage={leadsLimit || PAGE_SIZE}
                serverSide={true}
                totalRows={leadsTotal}
                onPageChange={(page: number) => {
                  const limit = leadsLimit || PAGE_SIZE;
                  const newPage = page + 1;
                  if (newPage !== (leadsPage || 1)) fetchLeads(newPage, limit);
                }}
                onRowsPerPageChange={(rowsPerPage: number) => fetchLeads(1, rowsPerPage)}
              />
            </div>
          )}
        </>
      )}

      {showExport && <ExportPreviewModal data={exportData} onClose={() => setShowExport(false)} />}
    </div>
  );
};

export default WaitlistLeads;
