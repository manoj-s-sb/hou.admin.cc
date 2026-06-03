import React, { useState } from 'react';

import './centres.css';

import CentreCard from './components/CentreCard';
import NewCentreWizard from './components/NewCentreWizard';
import OpsView from './components/OpsView';
import { useCentres } from './useCentres';

import type { CentreWithKPI } from './types';

const CentreManagement: React.FC = () => {
  const { centres, summary, isLoading, usingMockData, refetch } = useCentres();
  const [selected, setSelected] = useState<CentreWithKPI | null>(null);
  const [wizardOpen, setWizardOpen] = useState(false);

  // ── Ops view ──
  if (selected) {
    return <OpsView centre={selected} onBack={() => setSelected(null)} />;
  }

  return (
    <div className="cmx">
      <div className="cmx-page-title">Centre Management</div>
      <div className="cmx-page-desc">
        Select a centre to open its operations dashboard, or manage network-wide configuration.
      </div>

      {/* Network summary stat bar */}
      <div className="cmx-stat-grid">
        <div className="cmx-stat-card cmx-fade-up" style={{ ['--accent' as string]: '#21295A' }}>
          <div className="cmx-s-label">Total Centres</div>
          <div className="cmx-s-val">{summary.totalCentres}</div>
          <div className="cmx-s-badge" style={{ background: 'var(--blue-light)', color: 'var(--blue)' }}>
            {centres.filter(c => c.status === 'active').length} active
          </div>
        </div>
        <div className="cmx-stat-card cmx-fade-up" style={{ ['--accent' as string]: '#008482' }}>
          <div className="cmx-s-label">Total Members</div>
          <div className="cmx-s-val">{summary.totalMembers.toLocaleString()}</div>
          <div className="cmx-s-sub up">across the network</div>
        </div>
        <div className="cmx-stat-card cmx-fade-up" style={{ ['--accent' as string]: '#d97706' }}>
          <div className="cmx-s-label">Avg Utilisation</div>
          <div className="cmx-s-val">{summary.avgUtilisation}%</div>
          <div className="cmx-s-sub" style={{ color: 'var(--sub)' }}>
            capacity used
          </div>
        </div>
        <div className="cmx-stat-card cmx-fade-up" style={{ ['--accent' as string]: '#d42b2b' }}>
          <div className="cmx-s-label">Avg No-show</div>
          <div className="cmx-s-val">{summary.avgNoShow}%</div>
          <div className="cmx-s-sub down">last 30 days</div>
        </div>
      </div>

      <div className="cmx-section-head" style={{ marginBottom: 16 }}>
        <div className="cmx-section-title">
          <span className="dot" />
          All Centres
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
        <div className="cmx-centre-cards">
          {centres.map(c => (
            <CentreCard key={c.id} centre={c} onOpen={setSelected} />
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
      )}

      {wizardOpen && (
        <NewCentreWizard
          onClose={() => setWizardOpen(false)}
          onSaved={() => {
            setWizardOpen(false);
            refetch();
          }}
        />
      )}
    </div>
  );
};

export default CentreManagement;
