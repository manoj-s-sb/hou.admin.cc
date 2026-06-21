import React, { useEffect, useState } from 'react';

import { centreColour, countryFlag } from '../constants';

import type { CentreApiStatus, FacilitySummary } from '../../../store/centres/types';

const STATUS_PILL: Record<CentreApiStatus, { label: string; tone: string }> = {
  active: { label: 'Active', tone: 'green' },
  draft: { label: 'Draft', tone: 'amber' },
  suspended: { label: 'Suspended', tone: 'red' },
};

const PILL_TONE: Record<string, string> = {
  green: 'bg-cmx-green-bg text-cmx-green',
  red: 'bg-red-100 text-red-600',
  blue: 'bg-cmx-blue-light text-cmx-blue',
  amber: 'bg-cmx-amber-bg text-cmx-amber',
  gray: 'bg-gray-100 text-sub',
  navy: 'bg-navy text-white',
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
      className="relative animate-cmx-fade-up cursor-pointer overflow-hidden rounded-xl border border-cmx-border bg-white p-[18px] shadow-cmx transition-all before:absolute before:inset-x-0 before:top-0 before:h-[3px] before:bg-[var(--cc-color,#21295a)] before:content-[''] hover:-translate-y-0.5 hover:border-gray-300 hover:shadow-cmx-md"
      style={{ ['--cc-color' as string]: centreColour(centre.code), cursor: 'pointer' }}
      onClick={() => onOpen(centre)}
    >
      <div className="mb-3 flex items-start justify-between">
        <div>
          <div className="text-sm font-bold text-navy">
            {countryFlag(centre.countryCode)} {centre.name}
          </div>
          <div className="mt-0.5 text-xs text-sub">{location}</div>
          <div className="mt-[5px] flex items-center gap-1.5">
            <span className="text-[13px] font-semibold tabular-nums text-navy">{localTime}</span>
            <span className="rounded border border-cmx-border bg-gray-100 px-[5px] py-px text-[10px] font-medium text-sub">
              {getTzAbbr(centre.timezone)}
            </span>
          </div>
        </div>
        <span
          className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold ${PILL_TONE[status.tone] ?? ''}`}
        >
          {status.label}
        </span>
      </div>

      {/* KPI rollup — reference layout. Values fill in once the backend adds
          `kpi` to each list row; until then they read "—". */}
      <div className="mb-3.5 grid grid-cols-2 gap-2">
        <div className="flex flex-col gap-0.5">
          <span className="text-base font-bold text-navy">{fmtNum(kpi?.totalMembers)}</span>
          <span className="text-[10.5px] text-sub">Total Members</span>
        </div>
        <div className="flex flex-col gap-0.5">
          <span className="text-base font-bold text-navy">{fmtNum(kpi?.bookings30d)}</span>
          <span className="text-[10.5px] text-sub">Bookings (30d)</span>
        </div>
        <div className="flex flex-col gap-0.5">
          <span className="text-base font-bold text-navy">{fmtPct(kpi?.utilisationPct)}</span>
          <span className="text-[10.5px] text-sub">Utilisation</span>
        </div>
        <div className="flex flex-col gap-0.5">
          <span className="text-base font-bold text-navy">{fmtPct(kpi?.noShowPct)}</span>
          <span className="text-[10.5px] text-sub">No-show Rate</span>
        </div>
      </div>

      <div className="mb-3.5 grid grid-cols-2 gap-2">
        <span className="flex items-center gap-1.5 rounded-[7px] border border-red-200 bg-red-50 px-2.5 py-[7px] text-xs font-semibold text-red-700">
          <svg fill="none" height={14} stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" width={14}>
            <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
            <circle cx="9" cy="7" r="4" />
          </svg>
          <span className="font-bold">{kpi?.tailgates ?? 0}</span> Tailgates
        </span>
        <span className="flex items-center gap-1.5 rounded-[7px] border border-amber-200 bg-amber-50 px-2.5 py-[7px] text-xs font-semibold text-amber-800">
          <svg fill="none" height={14} stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" width={14}>
            <path d="M9 11l3 3L22 4" />
            <path d="M21 12v7a2 2 0 01-2 2V5a2 2 0 012-2h11" />
          </svg>
          <span className="font-bold">{kpi?.openTasks ?? 0}</span> Open Tasks
        </span>
      </div>

      <div className="flex items-center justify-between border-t border-cmx-border pt-3">
        <div className="text-xs text-sub">
          Premium: <b className="font-bold text-navy">{fmtNum(plans.premium)}</b> · Standard:{' '}
          <b className="font-bold text-navy">{fmtNum(plans.standard)}</b> · Family:{' '}
          <b className="font-bold text-navy">{fmtNum(plans.family)}</b>
        </div>
        <button
          className="inline-flex cursor-pointer items-center gap-[5px] border-none bg-transparent text-xs font-semibold text-cmx-blue"
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
