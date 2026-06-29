import React, { useCallback, useEffect, useMemo, useState } from 'react';

import { useDispatch, useSelector } from 'react-redux';
import { useParams } from 'react-router-dom';

import { getLocalUser } from '../../constants/user';
import { getCentres } from '../../store/centres/api';
import { AppDispatch, RootState } from '../../store/store';
import { getTicketCounts, getTickets } from '../../store/tickets/api';

import CreateTicketModal from './components/CreateTicketModal';
import TicketCard from './components/TicketCard';
import TicketDetailDrawer from './components/TicketDetailDrawer';
import {
  CATEGORY_META,
  PAGE_LIMIT,
  PRIORITY_META,
  STATUS_META,
  TICKET_CATEGORIES,
  TICKET_PRIORITIES,
  TICKET_STATUSES,
} from './constants';

import type { ListTicketsRequest, TicketCategory, TicketPriority, TicketStatus } from '../../store/tickets/types';

type Tab = 'all' | 'mine';
type View = '' | 'active' | 'closed';

// Active sub-state breakdown. "In Progress" folds the verify count in (verify is a
// sub-stage of being worked; the status dropdown still exposes it explicitly).
const BREAKDOWN: { key: TicketStatus; label: string; dot: string }[] = [
  { key: 'open', label: 'Open', dot: 'bg-gray-400' },
  { key: 'noc', label: 'With NOC', dot: 'bg-blue-500' },
  { key: 'inprogress', label: 'In Progress', dot: 'bg-amber-500' },
];

const Tickets: React.FC = () => {
  // Centre context provides :facilityCode; the global /tickets route does not.
  const { facilityCode: routeFacility } = useParams<{ facilityCode?: string }>();
  const isCentreScoped = Boolean(routeFacility);
  const dispatch = useDispatch<AppDispatch>();
  const { items, total, page, limit, listLoading, listError, counts } = useSelector((s: RootState) => s.tickets);
  const currentUserId = getLocalUser().userId;

  const [tab, setTab] = useState<Tab>('all');
  const [view, setView] = useState<View>('');
  const [status, setStatus] = useState<'' | TicketStatus>('');
  const [category, setCategory] = useState<'' | TicketCategory>('');
  const [priority, setPriority] = useState<'' | TicketPriority>('');
  const [centreFilter, setCentreFilter] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [showCreate, setShowCreate] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [centres, setCentres] = useState<{ code: string; name: string }[]>([]);

  // Centre catalogue (global view only) — powers the filter + create-modal picker.
  useEffect(() => {
    if (isCentreScoped) return;
    dispatch(getCentres({ skip: 0, limit: 200 }))
      .unwrap()
      .then(res => setCentres((res.facilities ?? []).map(f => ({ code: f.code, name: f.name }))))
      .catch(() => setCentres([]));
  }, [dispatch, isCentreScoped]);

  // Debounce search.
  useEffect(() => {
    const t = setTimeout(() => {
      setSearch(searchInput);
      setCurrentPage(1);
    }, 400);
    return () => clearTimeout(t);
  }, [searchInput]);

  const facilityCode = isCentreScoped ? routeFacility : centreFilter || undefined;

  const loadCounts = useCallback(() => {
    dispatch(getTicketCounts({ facilityCode }));
  }, [dispatch, facilityCode]);

  const loadList = useCallback(() => {
    const params: ListTicketsRequest = {
      facilityCode,
      mine: tab === 'mine' ? true : undefined,
      view: view || undefined,
      status: status || undefined,
      category: category || undefined,
      priority: priority || undefined,
      search: search || undefined,
      page: currentPage,
      limit: PAGE_LIMIT,
    };
    dispatch(getTickets(params));
  }, [dispatch, facilityCode, tab, view, status, category, priority, search, currentPage]);

  useEffect(() => {
    loadList();
  }, [loadList]);

  useEffect(() => {
    loadCounts();
  }, [loadCounts]);

  const refresh = () => {
    loadList();
    loadCounts();
  };

  const totalPages = Math.max(1, Math.ceil(total / limit));

  const resetToFirstPage = () => setCurrentPage(1);

  const onTab = (next: Tab) => {
    setTab(next);
    setStatus('');
    setView('');
    resetToFirstPage();
  };

  // Coarse Active/Closed filter (mutually exclusive with a specific status).
  const selectView = (next: 'active' | 'closed') => {
    setView(prev => (prev === next ? '' : next));
    setStatus('');
    resetToFirstPage();
  };

  // Specific status filter (clears the coarse Active/Closed view).
  const selectStatus = (next: TicketStatus) => {
    setStatus(prev => (prev === next ? '' : next));
    setView('');
    resetToFirstPage();
  };

  const mineCount = counts?.mine ?? 0;
  const activeCount = counts ? counts.total - counts.closed : 0;
  const closedCount = counts?.closed ?? 0;
  const inProgressCount = counts ? counts.inprogress + counts.verify : 0;
  const overdueCount = counts?.overdue ?? 0;

  const selectFieldClass =
    'rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-[13px] text-gray-700 outline-none focus:border-[#21295A]';

  const hasFilters = useMemo(
    () => Boolean(view || status || category || priority || search || (!isCentreScoped && centreFilter)),
    [view, status, category, priority, search, centreFilter, isCentreScoped]
  );

  return (
    <div className="w-full">
      {/* Header */}
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-[20px] font-bold tracking-tight text-[#21295A]">Tickets / Incidents</h1>
          <p className="mt-1 text-[12px] font-medium text-gray-500">
            {isCentreScoped
              ? 'Open and closed tickets for this centre.'
              : 'Tickets raised by staff and NOC across all centres. You can also view tickets assigned to you.'}
          </p>
        </div>
        <button
          className="flex items-center gap-1.5 rounded-lg bg-[#21295A] px-4 py-2 text-[12px] font-semibold text-white shadow-sm transition hover:bg-[#2d3570]"
          type="button"
          onClick={() => setShowCreate(true)}
        >
          <span className="text-[14px] leading-none">+</span> Create Ticket
        </button>
      </div>

      {/* Summary: Active vs Closed split + Overdue, with a clickable status breakdown */}
      <div className="mb-4 flex flex-wrap items-stretch gap-3">
        <button
          className={`flex min-w-[120px] flex-col rounded-xl border px-4 py-2.5 text-left transition ${
            view === 'active' ? 'border-[#9096be] bg-[#ecedf4]' : 'border-gray-100 bg-white hover:bg-gray-50'
          }`}
          type="button"
          onClick={() => selectView('active')}
        >
          <span className="text-[22px] font-bold leading-none text-[#21295A]">{activeCount}</span>
          <span className="mt-1 text-[11px] font-semibold uppercase tracking-wide text-gray-500">Active</span>
        </button>

        <button
          className={`flex min-w-[120px] flex-col rounded-xl border px-4 py-2.5 text-left transition ${
            view === 'closed' ? 'border-[#9096be] bg-[#ecedf4]' : 'border-gray-100 bg-white hover:bg-gray-50'
          }`}
          type="button"
          onClick={() => selectView('closed')}
        >
          <span className="text-[22px] font-bold leading-none text-[#21295A]">{closedCount}</span>
          <span className="mt-1 text-[11px] font-semibold uppercase tracking-wide text-gray-500">Closed</span>
        </button>

        {/* Overdue — display-only "what's on fire" signal (red when > 0) */}
        <div
          className={`flex min-w-[120px] flex-col rounded-xl border px-4 py-2.5 ${
            overdueCount > 0 ? 'border-red-200 bg-red-50' : 'border-gray-100 bg-white'
          }`}
        >
          <span
            className={`text-[22px] font-bold leading-none ${overdueCount > 0 ? 'text-red-600' : 'text-[#21295A]'}`}
          >
            {overdueCount}
          </span>
          <span
            className={`mt-1 text-[11px] font-semibold uppercase tracking-wide ${
              overdueCount > 0 ? 'text-red-500' : 'text-gray-500'
            }`}
          >
            ⚠ Overdue
          </span>
        </div>

        {/* Active sub-state breakdown — quick status filters */}
        <div className="flex flex-1 flex-wrap items-center gap-3 rounded-xl border border-gray-100 bg-white px-4 py-2.5">
          {BREAKDOWN.map(b => {
            const value = b.key === 'inprogress' ? inProgressCount : (counts?.[b.key] ?? 0);
            const active = status === b.key;
            return (
              <button
                key={b.key}
                className={`flex items-center gap-1.5 rounded-lg px-2 py-1 text-[12px] font-medium transition ${
                  active ? 'bg-[#ecedf4] text-[#21295A]' : 'text-gray-600 hover:bg-gray-50'
                }`}
                type="button"
                onClick={() => selectStatus(b.key)}
              >
                <span className={`h-2 w-2 rounded-full ${b.dot}`} />
                {b.label}
                <b className="font-bold text-[#21295A]">{value}</b>
              </button>
            );
          })}
        </div>
      </div>

      {/* Tabs + filters */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-0.5 rounded-[10px] bg-gray-100 p-[3px]">
          <button
            className={`rounded-lg px-[18px] py-1.5 text-[13px] transition-all ${
              tab === 'all' ? 'bg-[#21295A] font-semibold text-white' : 'bg-transparent font-medium text-gray-500'
            }`}
            type="button"
            onClick={() => onTab('all')}
          >
            All Tickets
          </button>
          <button
            className={`flex items-center gap-1.5 rounded-lg px-[18px] py-1.5 text-[13px] transition-all ${
              tab === 'mine' ? 'bg-[#21295A] font-semibold text-white' : 'bg-transparent font-medium text-gray-500'
            }`}
            type="button"
            onClick={() => onTab('mine')}
          >
            Assigned to Me
            <span className="rounded-lg bg-red-100 px-1.5 py-0.5 text-[10px] font-bold text-red-600">{mineCount}</span>
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {!isCentreScoped && (
            <select
              className={selectFieldClass}
              value={centreFilter}
              onChange={e => {
                setCentreFilter(e.target.value);
                resetToFirstPage();
              }}
            >
              <option value="">All Centres</option>
              {centres.map(c => (
                <option key={c.code} value={c.code}>
                  {c.name} ({c.code})
                </option>
              ))}
            </select>
          )}
          <select
            className={selectFieldClass}
            value={status}
            onChange={e => {
              setStatus(e.target.value as '' | TicketStatus);
              setView('');
              resetToFirstPage();
            }}
          >
            <option value="">All Statuses</option>
            {TICKET_STATUSES.map(s => (
              <option key={s} value={s}>
                {STATUS_META[s].label}
              </option>
            ))}
          </select>
          <select
            className={selectFieldClass}
            value={category}
            onChange={e => {
              setCategory(e.target.value as '' | TicketCategory);
              resetToFirstPage();
            }}
          >
            <option value="">All Categories</option>
            {TICKET_CATEGORIES.map(c => (
              <option key={c} value={c}>
                {CATEGORY_META[c].label}
              </option>
            ))}
          </select>
          <select
            className={selectFieldClass}
            value={priority}
            onChange={e => {
              setPriority(e.target.value as '' | TicketPriority);
              resetToFirstPage();
            }}
          >
            <option value="">All Priorities</option>
            {TICKET_PRIORITIES.map(p => (
              <option key={p} value={p}>
                {PRIORITY_META[p].label}
              </option>
            ))}
          </select>
          <input
            className={`${selectFieldClass} min-w-[180px]`}
            placeholder="Search title or description…"
            type="text"
            value={searchInput}
            onChange={e => setSearchInput(e.target.value)}
          />
        </div>
      </div>

      {/* List */}
      {listError ? (
        <div className="rounded-xl border border-red-100 bg-red-50 px-6 py-12 text-center text-[13px] font-semibold text-red-600">
          {listError}
        </div>
      ) : listLoading ? (
        <div className="rounded-xl border border-gray-100 bg-white px-6 py-14 text-center text-[13px] font-semibold text-gray-500 shadow-sm">
          Loading tickets…
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-xl border border-gray-100 bg-white px-6 py-14 text-center shadow-sm">
          <div className="text-[28px]">✅</div>
          <p className="mt-2 text-[13px] font-semibold text-gray-600">
            {hasFilters || tab === 'mine' ? 'No tickets match these filters.' : 'No tickets yet.'}
          </p>
          <p className="mt-1 text-[12px] text-gray-400">All clear — nothing open right now.</p>
        </div>
      ) : (
        <>
          {items.map(t => (
            <TicketCard key={t.id} currentUserId={currentUserId} ticket={t} onOpen={() => setSelectedId(t.id)} />
          ))}

          {totalPages > 1 && (
            <div className="mt-4 flex items-center justify-between">
              <span className="text-xs text-gray-400">
                {(page - 1) * limit + 1}–{Math.min(page * limit, total)} of {total}
              </span>
              <div className="flex items-center gap-1">
                <button
                  className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-600 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
                  disabled={page <= 1}
                  type="button"
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                >
                  ← Previous
                </button>
                <span className="px-2 text-xs text-gray-500">
                  Page {page} of {totalPages}
                </span>
                <button
                  className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-600 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
                  disabled={page >= totalPages}
                  type="button"
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                >
                  Next →
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {showCreate && (
        <CreateTicketModal
          centres={centres}
          facilityCode={isCentreScoped ? routeFacility : undefined}
          onClose={() => setShowCreate(false)}
          onCreated={() => {
            setShowCreate(false);
            resetToFirstPage();
            refresh();
          }}
        />
      )}

      {selectedId && (
        <TicketDetailDrawer ticketId={selectedId} onChanged={refresh} onClose={() => setSelectedId(null)} />
      )}
    </div>
  );
};

export default Tickets;
