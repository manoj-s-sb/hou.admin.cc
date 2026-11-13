import React, { useCallback, useEffect, useRef, useState } from 'react';

import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';

import { buildRoute } from '../../constants/routes';
import { useCentreNav } from '../../contexts/CentreNavContext';
import { ACCESS_SCOPES, canRead, isGlobalScope, isSuperAdmin } from '../../rbac';
import { getCentres, getCentreDetails } from '../../store/centres/api';
import { AppDispatch, RootState } from '../../store/store';
import { facilityScope } from '../../utils/facilityScope';

import { LIVE_CENTRE_MODULES } from './centreModules';
import CentreCard from './components/CentreCard';
import DeleteCentreModal from './components/DeleteCentreModal';
import { STATUS_FILTERS, PAGE_LIMIT } from './constants';
import NewCentreWizard from './newCentre/NewCentreWizard';

import type { CentreApiStatus, FacilitySummary } from '../../store/centres/types';

/** Page numbers with ellipses, mirroring the DataTable pager used on Members. */
function pageNumbers(current: number, totalPages: number): (number | '...')[] {
  if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i);
  if (current <= 3) return [0, 1, 2, 3, '...', totalPages - 2, totalPages - 1];
  if (current >= totalPages - 4) return [0, 1, '...', totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1];
  return [0, '...', current - 1, current, current + 1, '...', totalPages - 1];
}

/** The module to land on when opening a centre from the list. Which one
 * doesn't matter for a Draft/Staging centre — CentreModuleRoute shows its own
 * neutral "not active yet" note for every module on those, regardless of
 * slug — so this only ever needs to pick the first module the user can read. */
const firstModuleFor = (): { slug: string } | undefined => LIVE_CENTRE_MODULES.find(m => !m.scope || canRead(m.scope));

const CentreManagement: React.FC = () => {
  const [statusFilter, setStatusFilter] = useState<'' | CentreApiStatus>('');
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [skip, setSkip] = useState(0);
  const [wizardOpen, setWizardOpen] = useState(false);
  // Code of the draft centre being edited/activated directly from its card.
  const [editCode, setEditCode] = useState<string | null>(null);
  // The Draft centre currently in the delete-confirmation flow, if any.
  const [deleteTarget, setDeleteTarget] = useState<FacilitySummary | null>(null);
  const { closeCentre } = useCentreNav();
  const navigate = useNavigate();

  // One shared clock for every card's "local time" — a single 1s interval here
  // instead of one per CentreCard (which was N timers + N re-renders per second).
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  // The list page shows the global sidebar with no centre open — clear any prior selection.
  useEffect(() => {
    closeCentre();
  }, [closeCentre]);

  // Debounce the search box (~400ms) and reset to page 1 on new query.
  useEffect(() => {
    const t = setTimeout(() => {
      setSearch(searchInput);
      setSkip(0);
    }, 400);
    return () => clearTimeout(t);
  }, [searchInput]);

  const dispatch = useDispatch<AppDispatch>();
  const { facilities, total, isLoading, details, detailsLoading } = useSelector((state: RootState) => state.centres);
  // Centre mutations (create / edit / activate / suspend / delete) are super-admin
  // only — the backend 403s everyone else, so hide the controls (§4). Reads are open
  // to anyone with centremanagement:read (route gated in centreModules).
  const canManageCentres = isSuperAdmin();

  // Fetch the full bundle for the draft being edited; the wizard opens once it lands.
  const startEdit = useCallback(
    (code: string) => {
      setEditCode(code);
      dispatch(getCentreDetails(code));
    },
    [dispatch]
  );

  const refetch = useCallback(() => {
    dispatch(
      getCentres({
        status: statusFilter || undefined,
        search: search || undefined,
        skip,
        limit: PAGE_LIMIT,
      })
    );
  }, [dispatch, statusFilter, search, skip]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  // A facility-scoped user with NO centremanagement access (e.g. a plain coach/staff —
  // single assigned centre, the backend already filters this list to their scope) has
  // no other way to reach a centre: skip straight into its operations dashboard instead
  // of a one-card list they can't otherwise act on. A user who CAN read centremanagement
  // reaches this page deliberately (it's their tool for browsing/managing centres) and
  // must always land here, never be auto-redirected away — regardless of centre count.
  // Also only fires on the unfiltered, first-page view, and at most once per visit.
  const autoOpenedRef = useRef(false);
  useEffect(() => {
    if (autoOpenedRef.current) return;
    if (isLoading || isGlobalScope() || canRead(ACCESS_SCOPES.centreManagement)) return;
    if (statusFilter || search || skip !== 0) return;
    if (total !== 1 || facilities.length !== 1) return;
    autoOpenedRef.current = true;
    const [centre] = facilities;
    facilityScope.set(centre.code);
    const first = firstModuleFor();
    navigate(buildRoute.centreModule(centre.code, first?.slug ?? 'members'), { replace: true });
  }, [isLoading, total, facilities, statusFilter, search, skip, navigate]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_LIMIT));
  const currentPage = Math.floor(skip / PAGE_LIMIT);

  const goToPage = (p: number) => {
    if (p < 0 || p >= totalPages) return;
    setSkip(p * PAGE_LIMIT);
  };

  // ── New Centre wizard as a full in-content page (keeps sidebar + topbar) ──
  if (wizardOpen) {
    return (
      <NewCentreWizard
        onClose={() => setWizardOpen(false)}
        onSaved={() => {
          setWizardOpen(false);
          setSkip(0);
          refetch();
        }}
      />
    );
  }

  // ── Edit & Activate a draft directly from its card ──
  if (editCode) {
    // Wait for the matching bundle to arrive before rendering the pre-filled wizard.
    const bundleReady = details && (details.facility?.code ?? '').toUpperCase() === editCode.toUpperCase();
    if (!bundleReady) {
      return (
        <div className="rounded-xl border border-cmx-border bg-white px-6 py-14 text-center text-sub">
          <div className="text-sm font-bold text-navy">{detailsLoading ? 'Loading centre…' : 'Preparing editor…'}</div>
        </div>
      );
    }
    return (
      <NewCentreWizard
        initialBundle={details}
        onClose={() => setEditCode(null)}
        onSaved={() => {
          setEditCode(null);
          setSkip(0);
          refetch();
        }}
      />
    );
  }

  return (
    <div className="font-sans text-sm text-cmx-text">
      <div className="mb-1 text-xl font-bold text-navy">Centre Management</div>
      <div className="mb-[22px] text-[13px] text-sub">
        Select a centre to open its operations dashboard, or manage network-wide configuration.
      </div>

      {/* Filter bar: status segmented control + search */}
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#e0e0e0] bg-white px-6 py-[18px]">
        <div className="flex flex-wrap items-center gap-4">
          <span className="text-[16px] font-semibold text-[#6e6e6e]">STATUS:</span>
          <div className="flex items-center rounded-xl border border-[#b7a897] bg-[#eae5d8] p-1">
            {STATUS_FILTERS.map(f => (
              <button
                key={f.key || 'all'}
                className={`cursor-pointer select-none whitespace-nowrap rounded-xl px-6 py-2.5 text-[16px] transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-[#336dc2] focus-visible:ring-offset-1 ${
                  statusFilter === f.key
                    ? 'border border-[#cbcbcb] bg-white text-[#202020] drop-shadow-[6px_0px_3.25px_rgba(183,168,151,0.31)]'
                    : 'border border-transparent text-[#6e6e6e]'
                }`}
                type="button"
                onClick={() => {
                  setStatusFilter(f.key);
                  setSkip(0);
                }}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>
        <div className="flex h-11 w-[340px] items-center gap-2.5 rounded-xl border border-[#e0e0e0] px-3.5">
          <svg
            className="h-[18px] w-[18px] shrink-0 text-[#6e6e6e]"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
            />
          </svg>
          <input
            className="w-full border-none bg-transparent text-[16px] text-[#202020] outline-none placeholder:text-[#6e6e6e]"
            placeholder="Search name, code or city…"
            type="text"
            value={searchInput}
            onChange={e => setSearchInput(e.target.value)}
          />
        </div>
      </div>

      <div className="flex items-center justify-between" style={{ marginBottom: 16 }}>
        <div className="flex items-center gap-2 text-sm font-bold text-navy">
          <span className="h-[7px] w-[7px] rounded-full bg-cmx-blue" />
          All Centres
          {!isLoading && <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--sub)' }}> · {total}</span>}
        </div>
        {canManageCentres && (
          <button
            className="cmx-btn cmx-btn-navy !rounded-xl !px-5 !py-2.5 !text-[16px] !font-semibold"
            type="button"
            onClick={() => setWizardOpen(true)}
          >
            New Centre
          </button>
        )}
      </div>

      {isLoading ? (
        <div className="rounded-xl border border-cmx-border bg-white px-6 py-14 text-center text-sub">
          <div className="text-sm font-bold text-navy">Loading centres…</div>
        </div>
      ) : facilities.length === 0 && (statusFilter || search) ? (
        // A search/status filter matching nothing used to render a bare grid
        // with only "+ Add New Centre" — indistinguishable from "there are no
        // centres at all" and no quick way back to the unfiltered list.
        <div className="rounded-xl border border-cmx-border bg-white px-6 py-14 text-center text-sub">
          <div className="mb-1 text-sm font-bold text-navy">No centres match</div>
          <div className="mb-4 text-[13px]">Try a different search or status filter.</div>
          <button
            className="cmx-btn cmx-btn-outline"
            type="button"
            onClick={() => {
              setStatusFilter('');
              setSearchInput('');
              setSearch('');
              setSkip(0);
            }}
          >
            Clear filters
          </button>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 min-[720px]:grid-cols-2 min-[1100px]:grid-cols-3">
            {facilities.map(c => (
              <CentreCard
                key={c.id || c.code}
                centre={c}
                now={now}
                onDelete={canManageCentres ? summary => setDeleteTarget(summary) : undefined}
                onEdit={canManageCentres ? summary => startEdit(summary.code) : undefined}
                onOpen={summary => {
                  facilityScope.set(summary.code);
                  // Land on the first module this user has read access to. A
                  // Draft/Staging centre shows its own neutral "not active yet"
                  // note on whichever module this resolves to (CentreModuleRoute
                  // gates on status, not on which slug was requested).
                  const first = firstModuleFor();
                  navigate(buildRoute.centreModule(summary.code, first?.slug ?? 'members'));
                }}
              />
            ))}
          </div>

          {/* Pagination (skip + limit) */}
          {totalPages > 1 && (
            <div className="mt-4 flex items-center justify-between">
              <span className="text-xs text-gray-400">
                {skip + 1}–{Math.min(skip + PAGE_LIMIT, total)} of {total}
              </span>
              <div className="flex items-center gap-1">
                <button
                  className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-600 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
                  disabled={currentPage === 0}
                  type="button"
                  onClick={() => goToPage(currentPage - 1)}
                >
                  ← Previous
                </button>
                <div className="flex items-center gap-1 px-1">
                  {pageNumbers(currentPage, totalPages).map((p, i) =>
                    p === '...' ? (
                      <span key={`e-${i}`} className="px-1 text-xs text-gray-400">
                        …
                      </span>
                    ) : (
                      <button
                        key={p}
                        className={`flex h-7 w-7 items-center justify-center rounded-lg text-xs font-medium transition-colors ${
                          p === currentPage ? 'bg-gray-900 text-white' : 'text-gray-600 hover:bg-gray-100'
                        }`}
                        type="button"
                        onClick={() => goToPage(p as number)}
                      >
                        {(p as number) + 1}
                      </button>
                    )
                  )}
                </div>
                <button
                  className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-600 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
                  disabled={currentPage >= totalPages - 1}
                  type="button"
                  onClick={() => goToPage(currentPage + 1)}
                >
                  Next →
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {deleteTarget && (
        <DeleteCentreModal
          centre={deleteTarget}
          onClose={() => setDeleteTarget(null)}
          onDeleted={() => {
            setSkip(0);
            refetch();
          }}
        />
      )}
    </div>
  );
};

export default CentreManagement;
