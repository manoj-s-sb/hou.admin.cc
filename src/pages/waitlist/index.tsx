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

// TYPE filter → subscriptionSrc query param ("All" sends nothing).
const TYPE_FILTERS: { label: string; value: string; src?: string }[] = [
  { label: 'All', value: 'all' },
  { label: 'Foundation', value: 'foundation', src: 'foundation' },
  { label: 'Post Launch', value: 'launchWaitlist', src: 'launchWaitlist' },
];

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
  const [typeFilter, setTypeFilter] = useState('all');
  const [planFilter, setPlanFilter] = useState('all');

  const currentSrc = TYPE_FILTERS.find(t => t.value === typeFilter)?.src;

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
    setTypeFilter('all');
    setPlanFilter('all');
    setTab(next);
  };

  const onTypeChange = (value: string, src?: string) => {
    setTypeFilter(value);
    fetchWaitlist(1, waitlistLimit || PAGE_SIZE, src);
  };

  const onPlanChange = (value: string) => {
    setPlanFilter(value);
    fetchWaitlist(1, waitlistLimit || PAGE_SIZE, currentSrc);
  };

  // Plan filter is applied client-side on the loaded page.
  const waitlistRows = useMemo(() => {
    if (planFilter === 'all') return waitlist;
    return waitlist.filter(e => normalizePlan(planOf(e)) === planFilter);
  }, [waitlist, planFilter]);

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
          onClick={comingSoon}
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
            <div className="flex flex-1 flex-wrap items-center gap-2">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">Type</span>
              {TYPE_FILTERS.map(f => (
                <Chip key={f.value} active={typeFilter === f.value} onClick={() => onTypeChange(f.value, f.src)}>
                  {f.label}
                </Chip>
              ))}
            </div>
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
              onRetry={() => fetchWaitlist(1, waitlistLimit || PAGE_SIZE, currentSrc)}
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
                  if (newPage !== (waitlistPage || 1)) fetchWaitlist(newPage, limit, currentSrc);
                }}
                onRowsPerPageChange={(rowsPerPage: number) => fetchWaitlist(1, rowsPerPage, currentSrc)}
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
    </div>
  );
};

export default WaitlistLeads;
