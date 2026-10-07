import React, { useCallback, useEffect, useMemo, useState } from 'react';

import { useDispatch, useSelector } from 'react-redux';
import { useParams } from 'react-router-dom';

import { getLocalUser } from '../../constants/user';
import { canEditModule } from '../../rbac';
import { MODULES } from '../../rbac/constants';
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
  SELECTABLE_STATUSES,
  STATUS_META,
  TICKET_CATEGORIES,
  TICKET_PRIORITIES,
} from './constants';

import type { ListTicketsRequest, TicketCategory, TicketPriority, TicketStatus } from '../../store/tickets/types';

type Tab = 'all' | 'mine';

const Tickets: React.FC = () => {
  // Centre context provides :facilityCode; the global /tickets route does not.
  const { facilityCode: routeFacility } = useParams<{ facilityCode?: string }>();
  const isCentreScoped = Boolean(routeFacility);
  const dispatch = useDispatch<AppDispatch>();
  const { items, total, page, limit, listLoading, listError, counts } = useSelector((s: RootState) => s.tickets);
  const currentUserId = getLocalUser().userId;
  // Write access for tickets: centre view is governed by the maintenance module
  // (its read scope), the global view by the ticketsincidents module. When false,
  // all mutating controls (create/status/comment/reassign) render read-only.
  const canEdit = canEditModule(isCentreScoped ? MODULES.MAINTENANCE : MODULES.TICKETS);

  const [tab, setTab] = useState<Tab>('all');
  const [status, setStatus] = useState<'' | TicketStatus>('');
  // "Total" in the status dropdown — every non-closed ticket (open/with-NOC/
  // in-progress/needs-verification), same definition as the Total chip. Distinct
  // from the dropdown's own "All Statuses" (status === ''), which also includes
  // Closed. Sent as the existing (till now unused) `view: 'active'` param.
  const [activeOnly, setActiveOnly] = useState(false);
  const [overdueOnly, setOverdueOnly] = useState(false);
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
      status: status || undefined,
      view: activeOnly ? 'active' : undefined,
      overdueOnly: overdueOnly || undefined,
      category: category || undefined,
      priority: priority || undefined,
      search: search || undefined,
      page: currentPage,
      limit: PAGE_LIMIT,
    };
    dispatch(getTickets(params));
  }, [dispatch, facilityCode, tab, status, activeOnly, overdueOnly, category, priority, search, currentPage]);

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
    setActiveOnly(false);
    resetToFirstPage();
  };

  // One status filter drives everything — the three summary chips below AND
  // the dropdown (In Progress / Closed) are just different ways to set the
  // exact same `status` value. There used to be a separate "Active" bucket
  // (meaning "not closed", overlapping with In Progress) alongside a narrower
  // "Open" dropdown option of the same name — two different things sharing
  // one word was confusing, so now there's exactly one "Open" (a specific
  // status, same as In Progress/Closed), not a broader catch-all.
  const selectStatus = (next: TicketStatus) => {
    setStatus(prev => (prev === next ? '' : next));
    setActiveOnly(false);
    resetToFirstPage();
  };

  // Overdue composes with (doesn't replace) the status filter above — a ticket
  // overdue on its SLA can be in any non-closed status, so this is its own
  // independent toggle, not another option in the same status chip group.
  const toggleOverdue = () => {
    setOverdueOnly(prev => !prev);
    resetToFirstPage();
  };

  const mineCount = counts?.mine ?? 0;
  // All currently-active tickets (every non-closed status — open, with-NOC,
  // in-progress, needs-verification) so a legacy noc/verify ticket is never
  // missing from this number even though it has no chip of its own above.
  const totalActiveCount = Math.max(0, (counts?.total ?? 0) - (counts?.closed ?? 0));
  const overdueCount = counts?.overdue ?? 0;

  // Summary chips — all rendered in one uniform format (dot · label · count).
  // Each count matches exactly what its filter shows; "With NOC"/"Needs
  // Verification" stay available via the status dropdown... no wait, they're
  // not selectable there either (see SELECTABLE_STATUSES) — those two statuses
  // currently have no manual filter at all, by existing design.
  const summaryChips: {
    key: string;
    label: string;
    dot: string;
    count: number;
    selected: boolean;
    onClick: () => void;
  }[] = [
    {
      key: 'open',
      label: 'Open',
      dot: 'bg-[#21295A]',
      count: counts?.open ?? 0,
      selected: status === 'open',
      onClick: () => selectStatus('open'),
    },
    {
      key: 'inprogress',
      label: 'In Progress',
      dot: 'bg-amber-500',
      count: counts?.inprogress ?? 0,
      selected: status === 'inprogress',
      onClick: () => selectStatus('inprogress'),
    },
    {
      key: 'closed',
      label: 'Closed',
      dot: 'bg-emerald-500',
      count: counts?.closed ?? 0,
      selected: status === 'closed',
      onClick: () => selectStatus('closed'),
    },
  ];

  const selectFieldClass =
    'rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-[13px] text-gray-700 outline-none focus:border-[#21295A]';

  const hasFilters = useMemo(
    () =>
      Boolean(
        status || activeOnly || overdueOnly || category || priority || search || (!isCentreScoped && centreFilter)
      ),
    [status, activeOnly, overdueOnly, category, priority, search, centreFilter, isCentreScoped]
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
        {canEdit && (
          <button
            className="flex items-center gap-1.5 rounded-lg bg-[#21295A] px-4 py-2 text-[12px] font-semibold text-white shadow-sm transition hover:bg-[#2d3570]"
            type="button"
            onClick={() => setShowCreate(true)}
          >
            Create Ticket
          </button>
        )}
      </div>

      {/* Summary bar — every item in one uniform chip format (dot · label · count).
          Total is informational only (all non-closed tickets, across every status,
          not just the three chips below) — it never acts as a filter itself, the
          Open/In Progress/Closed chips still do that. Overdue is its own toggle: an
          overdue ticket can be in any non-closed status, so it composes with
          whichever status chip (if any) is selected rather than replacing it. */}
      <div className="mb-4 flex flex-wrap items-center gap-1.5 rounded-xl border border-gray-100 bg-white px-4 py-3 shadow-sm">
        <div className="flex items-center gap-2 rounded-lg px-3 py-1.5 text-[13px] font-medium text-gray-600">
          <span className="h-2 w-2 rounded-full bg-gray-400" />
          Total
          <span className="font-bold text-[#21295A]">{totalActiveCount}</span>
        </div>
        {summaryChips.map(c => (
          <button
            key={c.key}
            className={`flex items-center gap-2 rounded-lg px-3 py-1.5 text-[13px] font-medium transition ${
              c.selected ? 'bg-[#ecedf4] text-[#21295A]' : 'text-gray-600 hover:bg-gray-50'
            }`}
            type="button"
            onClick={c.onClick}
          >
            <span className={`h-2 w-2 rounded-full ${c.dot}`} />
            {c.label}
            <span className="font-bold text-[#21295A]">{c.count}</span>
          </button>
        ))}
        <button
          className={`flex items-center gap-2 rounded-lg px-3 py-1.5 text-[13px] font-medium transition ${
            overdueOnly ? 'bg-red-50 text-red-700' : 'text-gray-600 hover:bg-gray-50'
          }`}
          type="button"
          onClick={toggleOverdue}
        >
          <span className="h-2 w-2 rounded-full bg-red-500" />
          Overdue
          <span className={`font-bold ${overdueOnly ? 'text-red-700' : 'text-[#21295A]'}`}>{overdueCount}</span>
        </button>
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
            // A native <select> can only represent one of these three independent
            // filter dimensions at a time (status / activeOnly / overdueOnly) — the
            // summary chips above let you combine them, this dropdown is a
            // single-choice shortcut onto the same underlying state.
            value={overdueOnly ? 'overdue' : activeOnly ? 'total' : status}
            onChange={e => {
              const v = e.target.value;
              if (v === 'total') {
                setActiveOnly(true);
                setOverdueOnly(false);
                setStatus('');
              } else if (v === 'overdue') {
                setOverdueOnly(true);
                setActiveOnly(false);
                setStatus('');
              } else {
                setActiveOnly(false);
                setOverdueOnly(false);
                setStatus(v as '' | TicketStatus);
              }
              resetToFirstPage();
            }}
          >
            <option value="">All Statuses</option>
            {/* Every non-closed ticket (open/with-NOC/in-progress/needs-verification)
                — same definition as the Total chip, distinct from "All Statuses"
                which also includes Closed. */}
            <option value="total">Total</option>
            {/* Filter dropdown also offers 'open' (unlike SELECTABLE_STATUSES, which
                is just the manual status-change choices in the ticket detail view —
                you can't manually set a ticket back to 'open', but you can filter by it). */}
            {(['open', ...SELECTABLE_STATUSES] as TicketStatus[]).map(s => (
              <option key={s} value={s}>
                {STATUS_META[s].label}
              </option>
            ))}
            <option value="overdue">Overdue</option>
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
            placeholder="Search ticket #, title, or description…"
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
        <TicketDetailDrawer
          canEdit={canEdit}
          ticketId={selectedId}
          onChanged={refresh}
          onClose={() => setSelectedId(null)}
        />
      )}
    </div>
  );
};

export default Tickets;
