import React, { useState } from 'react';

import BookingsTab from './BookingsTab';
import FacilitiesTab from './FacilitiesTab';
import MembersTab from './MembersTab';
import PlansTab from './PlansTab';

import type { CentreWithKPI } from '../types';

type OpsTab = 'members' | 'bookings' | 'induction' | 'tours' | 'tailgate' | 'maintenance' | 'plans' | 'facilities';

const TABS: { key: OpsTab; label: string }[] = [
  { key: 'members', label: 'Members' },
  { key: 'bookings', label: 'Slot Bookings' },
  { key: 'induction', label: 'Induction' },
  { key: 'tours', label: 'Tour Details' },
  { key: 'tailgate', label: 'Tailgate Logs' },
  { key: 'maintenance', label: 'Maintenance Logs' },
  { key: 'plans', label: 'Plans' },
  { key: 'facilities', label: 'Facilities' },
];

const PLACEHOLDERS: Record<string, { title: string; desc: string; endpoint: string }> = {
  induction: {
    title: 'Induction Management',
    desc: 'Schedule and track security training for this centre.',
    endpoint: 'GET /api/admin/centres/:id/induction',
  },
  tours: {
    title: 'Tour Details',
    desc: 'Manage tour bookings and scheduling for this centre.',
    endpoint: 'GET /api/admin/centres/:id/tours',
  },
  tailgate: {
    title: 'Tailgate Logs',
    desc: 'Video logs, unidentified entries and violation tracking.',
    endpoint: 'GET /api/admin/centres/:id/tailgate',
  },
  maintenance: {
    title: 'Maintenance Logs',
    desc: 'Lane and equipment maintenance tracking for this centre.',
    endpoint: 'GET /api/admin/centres/:id/maintenance',
  },
};

const Placeholder: React.FC<{ tab: string }> = ({ tab }) => {
  const p = PLACEHOLDERS[tab];
  if (!p) return null;
  return (
    <div className="cmx-placeholder">
      <div className="ph-title">{p.title}</div>
      <div style={{ marginTop: 6 }}>{p.desc}</div>
      <div className="ph-ep">{p.endpoint}</div>
    </div>
  );
};

interface Props {
  centre: CentreWithKPI;
  onBack: () => void;
}

const OpsView: React.FC<Props> = ({ centre, onBack }) => {
  const [tab, setTab] = useState<OpsTab>('members');

  return (
    <div className="cmx">
      {/* Ops nav row: back button + live centre badge (in lieu of touching the global sidebar) */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 18, flexWrap: 'wrap' }}>
        <button className="cmx-btn cmx-btn-outline" type="button" onClick={onBack}>
          <svg fill="none" height={13} stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" width={13}>
            <polyline points="15 18 9 12 15 6" />
          </svg>
          Back to Centres
        </button>
        <div className="cmx-ops-badge">
          <span className="live-dot" />
          <span style={{ fontSize: 12.5, fontWeight: 600 }}>
            {centre.name}, {centre.country}
          </span>
        </div>
      </div>

      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          marginBottom: 20,
          gap: 16,
          flexWrap: 'wrap',
        }}
      >
        <div>
          <div className="cmx-page-title">
            {centre.flag} {centre.name} — Operations
          </div>
          <div className="cmx-page-desc" style={{ marginBottom: 0 }}>
            Managing {centre.city}
            {centre.state ? `, ${centre.state}` : ''}
          </div>
        </div>
      </div>

      {/* 4-stat strip */}
      <div className="cmx-stat-grid">
        <div className="cmx-stat-card" style={{ ['--accent' as string]: '#21295A' }}>
          <div className="cmx-s-label">Total Members</div>
          <div className="cmx-s-val">{centre.kpi.totalMembers.toLocaleString()}</div>
        </div>
        <div className="cmx-stat-card" style={{ ['--accent' as string]: '#008482' }}>
          <div className="cmx-s-label">Active Members</div>
          <div className="cmx-s-val">{centre.kpi.activeMembers.toLocaleString()}</div>
        </div>
        <div className="cmx-stat-card" style={{ ['--accent' as string]: '#d97706' }}>
          <div className="cmx-s-label">Utilisation</div>
          <div className="cmx-s-val">{centre.kpi.utilisationPct}%</div>
        </div>
        <div className="cmx-stat-card" style={{ ['--accent' as string]: '#d42b2b' }}>
          <div className="cmx-s-label">No-show Rate</div>
          <div className="cmx-s-val">{centre.kpi.noShowPct}%</div>
        </div>
      </div>

      {/* Tab bar */}
      <div className="cmx-ops-nav-tabs">
        {TABS.map(t => (
          <button
            key={t.key}
            className={`cmx-ops-tab ${tab === t.key ? 'active' : ''}`}
            type="button"
            onClick={() => setTab(t.key)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {tab === 'members' && <MembersTab centre={centre} />}
      {tab === 'bookings' && <BookingsTab centre={centre} />}
      {tab === 'plans' && <PlansTab centre={centre} />}
      {tab === 'facilities' && <FacilitiesTab centre={centre} />}
      {(tab === 'induction' || tab === 'tours' || tab === 'tailgate' || tab === 'maintenance') && (
        <Placeholder tab={tab} />
      )}
    </div>
  );
};

export default OpsView;
