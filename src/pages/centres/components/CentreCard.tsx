import React, { useEffect, useState } from 'react';

import type { CentreStatus, CentreWithKPI } from '../types';

const STATUS_PILL: Record<CentreStatus, { label: string; tone: string }> = {
  active: { label: 'Active', tone: 'green' },
  draft: { label: 'Draft', tone: 'amber' },
  staging: { label: 'Staging', tone: 'amber' },
  suspended: { label: 'Suspended', tone: 'red' },
};

const getTzAbbr = (tz: string): string => {
  try {
    const s = new Date().toLocaleTimeString('en-US', { timeZone: tz, timeZoneName: 'short' });
    return s.split(' ').pop() ?? '';
  } catch {
    return '';
  }
};

const getLocalTime = (tz: string): string => {
  try {
    return new Date().toLocaleTimeString('en-US', { timeZone: tz, hour: 'numeric', minute: '2-digit', hour12: true });
  } catch {
    return '';
  }
};

interface Props {
  centre: CentreWithKPI;
  onOpen: (centre: CentreWithKPI) => void;
}

const CentreCard: React.FC<Props> = ({ centre, onOpen }) => {
  const [localTime, setLocalTime] = useState(() => getLocalTime(centre.timezone));

  // Live local clock — tick every second like the reference design.
  useEffect(() => {
    const t = setInterval(() => setLocalTime(getLocalTime(centre.timezone)), 1000);
    return () => clearInterval(t);
  }, [centre.timezone]);

  const status = STATUS_PILL[centre.status];
  const { kpi } = centre;
  const totalPlanMembers = kpi.planBreakdown.reduce((sum, p) => sum + p.members, 0) || 1;

  return (
    <div
      className="cmx-centre-card cmx-fade-up"
      role="button"
      style={{ ['--cc-color' as string]: centre.colour }}
      tabIndex={0}
      onClick={() => onOpen(centre)}
      onKeyDown={e => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onOpen(centre);
        }
      }}
    >
      <div className="cmx-cc-header">
        <div>
          <div className="cmx-cc-name">
            {centre.flag} {centre.name}
          </div>
          <div className="cmx-cc-location">
            {centre.city}
            {centre.state ? `, ${centre.state}` : ''}
          </div>
          <div className="cmx-cc-time-row">
            <span className="cmx-cc-time">{localTime}</span>
            <span className="cmx-cc-tz-badge">{centre.timezoneLabel || getTzAbbr(centre.timezone)}</span>
          </div>
        </div>
        <span className={`cmx-pill ${status.tone}`}>{status.label}</span>
      </div>

      <div className="cmx-cc-stats">
        <div className="cmx-cc-stat">
          <div className="cmx-cc-stat-val">{kpi.totalMembers.toLocaleString()}</div>
          <div className="cmx-cc-stat-lbl">Total Members</div>
        </div>
        <div className="cmx-cc-stat">
          <div className="cmx-cc-stat-val">{kpi.bookings30d.toLocaleString()}</div>
          <div className="cmx-cc-stat-lbl">Bookings (30d)</div>
        </div>
        <div className="cmx-cc-stat">
          <div className="cmx-cc-stat-val">{kpi.utilisationPct}%</div>
          <div className="cmx-cc-stat-lbl">Utilisation</div>
        </div>
        <div className="cmx-cc-stat">
          <div className="cmx-cc-stat-val">{kpi.noShowPct}%</div>
          <div className="cmx-cc-stat-lbl">No-show Rate</div>
        </div>
      </div>

      {/* Plan breakdown mini-bar */}
      <div className="cmx-cc-planbar" title={kpi.planBreakdown.map(p => `${p.label}: ${p.members}`).join(' · ')}>
        {kpi.planBreakdown.map(p => (
          <span key={p.planId} style={{ width: `${(p.members / totalPlanMembers) * 100}%`, background: p.colour }} />
        ))}
      </div>

      <div className="cmx-cc-footer">
        <div style={{ fontSize: 12, color: 'var(--sub)' }}>
          {kpi.planBreakdown
            .slice(0, 3)
            .map(p => `${p.label}: ${p.members}`)
            .join(' · ')}
        </div>
        <button
          className="cmx-cc-open-btn"
          type="button"
          onClick={e => {
            e.stopPropagation();
            onOpen(centre);
          }}
        >
          Open Centre
          <svg fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </button>
      </div>
    </div>
  );
};

export default CentreCard;
