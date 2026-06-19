import React, { useEffect, useState } from 'react';

import { centreColour, countryFlag } from '../constants';

import type { CentreApiStatus, FacilitySummary } from '../apiTypes';

const STATUS_PILL: Record<CentreApiStatus, { label: string; tone: string }> = {
  active: { label: 'Active', tone: 'green' },
  draft: { label: 'Draft', tone: 'amber' },
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

/** "—" until the backend supplies the rollup. */
const fmtNum = (n?: number): string => (n === undefined || n === null ? '—' : n.toLocaleString());
const fmtPct = (n?: number): string => (n === undefined || n === null ? '—' : `${n}%`);

interface Props {
  centre: FacilitySummary;
  onOpen: (centre: FacilitySummary) => void;
}

const CentreCard: React.FC<Props> = ({ centre, onOpen }) => {
  const [localTime, setLocalTime] = useState(() => getLocalTime(centre.timezone));

  // Live local clock — tick every second like the reference design.
  useEffect(() => {
    const t = setInterval(() => setLocalTime(getLocalTime(centre.timezone)), 1000);
    return () => clearInterval(t);
  }, [centre.timezone]);

  const status = STATUS_PILL[centre.status] ?? { label: centre.status, tone: 'amber' };
  const { kpi } = centre;
  const location = [centre.stateCode, centre.countryCode].filter(Boolean).join(', ') || centre.cityCode || '—';
  const plans = kpi?.plans ?? {};

  return (
    // eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions
    <div
      className="cmx-centre-card cmx-fade-up"
      style={{ ['--cc-color' as string]: centreColour(centre.code), cursor: 'pointer' }}
      onClick={() => onOpen(centre)}
    >
      <div className="cmx-cc-header">
        <div>
          <div className="cmx-cc-name">
            {countryFlag(centre.countryCode)} {centre.name}
          </div>
          <div className="cmx-cc-location">{location}</div>
          <div className="cmx-cc-time-row">
            <span className="cmx-cc-time">{localTime}</span>
            <span className="cmx-cc-tz-badge">{getTzAbbr(centre.timezone)}</span>
          </div>
        </div>
        <span className={`cmx-pill ${status.tone}`}>{status.label}</span>
      </div>

      {/* KPI rollup — reference layout. Values fill in once the backend adds
          `kpi` to each list row; until then they read "—". */}
      <div className="cmx-cc-stats">
        <div className="cmx-cc-stat">
          <span className="cmx-cc-stat-val">{fmtNum(kpi?.totalMembers)}</span>
          <span className="cmx-cc-stat-lbl">Total Members</span>
        </div>
        <div className="cmx-cc-stat">
          <span className="cmx-cc-stat-val">{fmtNum(kpi?.bookings30d)}</span>
          <span className="cmx-cc-stat-lbl">Bookings (30d)</span>
        </div>
        <div className="cmx-cc-stat">
          <span className="cmx-cc-stat-val">{fmtPct(kpi?.utilisationPct)}</span>
          <span className="cmx-cc-stat-lbl">Utilisation</span>
        </div>
        <div className="cmx-cc-stat">
          <span className="cmx-cc-stat-val">{fmtPct(kpi?.noShowPct)}</span>
          <span className="cmx-cc-stat-lbl">No-show Rate</span>
        </div>
      </div>

      <div className="cmx-cc-chips">
        <span className="cmx-cc-chip tail">
          <svg fill="none" height={14} stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" width={14}>
            <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
            <circle cx="9" cy="7" r="4" />
          </svg>
          <span className="n">{kpi?.tailgates ?? 0}</span> Tailgates
        </span>
        <span className="cmx-cc-chip task">
          <svg fill="none" height={14} stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" width={14}>
            <path d="M9 11l3 3L22 4" />
            <path d="M21 12v7a2 2 0 01-2 2V5a2 2 0 012-2h11" />
          </svg>
          <span className="n">{kpi?.openTasks ?? 0}</span> Open Tasks
        </span>
      </div>

      <div className="cmx-cc-footer">
        <div className="cmx-cc-plans">
          Premium: <b>{fmtNum(plans.premium)}</b> · Standard: <b>{fmtNum(plans.standard)}</b> · Family:{' '}
          <b>{fmtNum(plans.family)}</b>
        </div>
        <button
          className="cmx-cc-open-btn"
          type="button"
          onClick={e => {
            e.stopPropagation();
            onOpen(centre);
          }}
        >
          Open
          <svg fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </button>
      </div>
    </div>
  );
};

export default CentreCard;
