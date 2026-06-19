import React, { useEffect, useState } from 'react';

import './centres.css';

import { useCentreNav } from '../../contexts/CentreNavContext';

import CentreCard from './components/CentreCard';
import CentreDetailView from './components/CentreDetailView';
import NewCentreWizard from './components/NewCentreWizard';
import { useCentres } from './useCentres';

import type { CentreApiStatus } from './apiTypes';

const STATUS_FILTERS: { key: '' | CentreApiStatus; label: string }[] = [
  { key: '', label: 'All' },
  { key: 'active', label: 'Active' },
  { key: 'draft', label: 'Draft' },
  { key: 'suspended', label: 'Suspended' },
];

const LIMIT = 20;

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
  const { activeCentre, openCentre, closeCentre } = useCentreNav();

  // Leaving Centre Management restores the global sidebar menu.
  useEffect(() => () => closeCentre(), [closeCentre]);

  // Debounce the search box (~400ms) and reset to page 1 on new query.
  useEffect(() => {
    const t = setTimeout(() => {
      setSearch(searchInput);
      setSkip(0);
    }, 400);
    return () => clearTimeout(t);
  }, [searchInput]);

  const { facilities, total, isLoading, usingMockData, refetch } = useCentres({
    status: statusFilter || undefined,
    search: search || undefined,
    skip,
    limit: LIMIT,
  });

  const totalPages = Math.max(1, Math.ceil(total / LIMIT));
  const currentPage = Math.floor(skip / LIMIT);

  const goToPage = (p: number) => {
    if (p < 0 || p >= totalPages) return;
    setSkip(p * LIMIT);
  };

  // ── Detail view (module nav lives in the global sidebar) ──
  if (activeCentre) {
    return <CentreDetailView code={activeCentre.code} />;
  }

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

  return (
    <div className="cmx">
      <div className="cmx-page-title">Centre Management</div>
      <div className="cmx-page-desc">
        Select a centre to open its operations dashboard, or manage network-wide configuration.
      </div>

      {/* Filter bar: status chips + search */}
      <div className="cmx-filter-bar" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <span className="cmx-eyebrow" style={{ margin: 0 }}>
            Status:
          </span>
          {STATUS_FILTERS.map(f => (
            <button
              key={f.key || 'all'}
              className={`cmx-country-chip ${statusFilter === f.key ? 'active' : ''}`}
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

      <div className="cmx-section-head" style={{ marginBottom: 16 }}>
        <div className="cmx-section-title">
          <span className="dot" />
          All Centres
          {!isLoading && <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--sub)' }}> · {total}</span>}
        </div>
        <button className="cmx-btn cmx-btn-navy" type="button" onClick={() => setWizardOpen(true)}>
          <svg fill="none" height={13} stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24" width={13}>
            <line x1="12" x2="12" y1="5" y2="19" />
            <line x1="5" x2="19" y1="12" y2="12" />
          </svg>
          New Centre
        </button>
      </div>

      {usingMockData && (
        <div
          style={{
            fontSize: 12,
            color: '#92400e',
            background: '#fffbeb',
            border: '1px solid #fde68a',
            borderRadius: 8,
            padding: '8px 12px',
            marginBottom: 14,
          }}
        >
          Showing seed data — the Centre Management API is not yet reachable.
        </div>
      )}

      {isLoading ? (
        <div className="cmx-placeholder">
          <div className="ph-title">Loading centres…</div>
        </div>
      ) : (
        <>
          <div className="cmx-centre-cards">
            {facilities.map(c => (
              <CentreCard
                key={c.id || c.code}
                centre={c}
                onOpen={summary =>
                  openCentre({
                    code: summary.code,
                    name: summary.name,
                    countryCode: summary.countryCode,
                    status: summary.status,
                  })
                }
              />
            ))}

            {/* Add New Centre dashed card */}
            <button
              aria-label="Add new centre"
              className="cmx-add-centre-card"
              type="button"
              onClick={() => setWizardOpen(true)}
            >
              <svg fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                <line x1="12" x2="12" y1="5" y2="19" />
                <line x1="5" x2="19" y1="12" y2="12" />
              </svg>
              <span>Add New Centre</span>
            </button>
          </div>

          {/* Pagination (skip + limit) */}
          {totalPages > 1 && (
            <div className="mt-4 flex items-center justify-between">
              <span className="text-xs text-gray-400">
                {skip + 1}–{Math.min(skip + LIMIT, total)} of {total}
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
