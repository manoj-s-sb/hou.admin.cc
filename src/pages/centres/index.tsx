import React, { useCallback, useEffect, useState } from 'react';

import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';

import { buildRoute } from '../../constants/routes';
import { useCentreNav } from '../../contexts/CentreNavContext';
import { isSuperAdmin } from '../../rbac';
import { getCentres, getCentreDetails } from '../../store/centres/api';
import { AppDispatch, RootState } from '../../store/store';
import { facilityScope } from '../../utils/facilityScope';

import CentreCard from './components/CentreCard';
import { STATUS_FILTERS, PAGE_LIMIT } from './constants';
import NewCentreWizard from './newCentre/NewCentreWizard';

import type { CentreApiStatus } from '../../store/centres/types';

/** Page numbers with ellipses, mirroring the DataTable pager used on Members. */
function pageNumbers(current: number, totalPages: number): (number | '...')[] {
  if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i);
  if (current <= 3) return [0, 1, 2, 3, '...', totalPages - 2, totalPages - 1];
  if (current >= totalPages - 4) return [0, 1, '...', totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1];
  return [0, '...', current - 1, current, current + 1, '...', totalPages - 1];
}

const CentreManagement: React.FC = () => {
  const [statusFilter, setStatusFilter] = useState<'' | CentreApiStatus>('');
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [skip, setSkip] = useState(0);
  const [wizardOpen, setWizardOpen] = useState(false);
  // Code of the draft centre being edited/activated directly from its card.
  const [editCode, setEditCode] = useState<string | null>(null);
  const { closeCentre } = useCentreNav();
  const navigate = useNavigate();

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

      {/* Filter bar: status chips + search */}
      <div
        className="mb-5 flex flex-wrap items-end gap-3 rounded-[10px] border border-cmx-border bg-white px-[18px] py-3.5 shadow-cmx"
        style={{ justifyContent: 'space-between', alignItems: 'center' }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <span className="cmx-eyebrow" style={{ margin: 0 }}>
            Status:
          </span>
          {STATUS_FILTERS.map(f => (
            <button
              key={f.key || 'all'}
              className={`inline-flex cursor-pointer select-none items-center gap-1 whitespace-nowrap rounded-full border bg-white px-2.5 py-1 text-xs font-medium transition-all ${
                statusFilter === f.key ? 'border-[#9096be] bg-[#ecedf4] text-[#21295a]' : 'border-cmx-border text-sub'
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
        <input
          placeholder="Search name, code or city…"
          style={{
            border: '1px solid var(--border)',
            borderRadius: 7,
            padding: '7px 12px',
            fontSize: 13,
            minWidth: 240,
          }}
          type="text"
          value={searchInput}
          onChange={e => setSearchInput(e.target.value)}
        />
      </div>

      <div className="flex items-center justify-between" style={{ marginBottom: 16 }}>
        <div className="flex items-center gap-2 text-sm font-bold text-navy">
          <span className="h-[7px] w-[7px] rounded-full bg-cmx-blue" />
          All Centres
          {!isLoading && <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--sub)' }}> · {total}</span>}
        </div>
        {canManageCentres && (
          <button className="cmx-btn cmx-btn-navy" type="button" onClick={() => setWizardOpen(true)}>
            <svg fill="none" height={13} stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24" width={13}>
              <line x1="12" x2="12" y1="5" y2="19" />
              <line x1="5" x2="19" y1="12" y2="12" />
            </svg>
            New Centre
          </button>
        )}
      </div>

      {isLoading ? (
        <div className="rounded-xl border border-cmx-border bg-white px-6 py-14 text-center text-sub">
          <div className="text-sm font-bold text-navy">Loading centres…</div>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 min-[720px]:grid-cols-2 min-[1100px]:grid-cols-3">
            {facilities.map(c => (
              <CentreCard
                key={c.id || c.code}
                centre={c}
                onEdit={canManageCentres ? summary => startEdit(summary.code) : undefined}
                onOpen={summary => {
                  // Scope the API + remember the selection, then route to the centre's
                  // Members page (the path now carries the facility code).
                  facilityScope.set(summary.code);
                  navigate(buildRoute.centreModule(summary.code, 'members'));
                }}
              />
            ))}

            {/* Add New Centre dashed card — super-admin only */}
            {canManageCentres && (
              <button
                aria-label="Add new centre"
                className="flex min-h-[180px] cursor-pointer flex-col items-center justify-center gap-2.5 rounded-xl border-2 border-dashed border-cmx-border bg-white p-[18px] transition-all hover:border-cmx-blue hover:bg-cmx-blue-light"
                type="button"
                onClick={() => setWizardOpen(true)}
              >
                <svg
                  className="h-7 w-7 text-muted"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={1.5}
                  viewBox="0 0 24 24"
                >
                  <line x1="12" x2="12" y1="5" y2="19" />
                  <line x1="5" x2="19" y1="12" y2="12" />
                </svg>
                <span className="text-[13px] font-semibold text-sub">Add New Centre</span>
              </button>
            )}
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
    </div>
  );
};

export default CentreManagement;
