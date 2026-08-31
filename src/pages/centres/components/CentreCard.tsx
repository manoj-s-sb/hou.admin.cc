import React, { useEffect, useState } from 'react';

import { centreColour, countryFlag } from '../constants';

import type { CentreApiStatus, FacilitySummary } from '../../../store/centres/types';

const STATUS_META: Record<CentreApiStatus, { label: string; pill: string; dot: string }> = {
  active: { label: 'Active', pill: 'bg-cmx-green-bg text-cmx-green', dot: 'bg-cmx-green' },
  draft: { label: 'Draft', pill: 'bg-cmx-amber-bg text-cmx-amber', dot: 'bg-cmx-amber' },
  staging: { label: 'Staging', pill: 'bg-cmx-blue-light text-cmx-blue', dot: 'bg-cmx-blue' },
  suspended: { label: 'Suspended', pill: 'bg-red-100 text-red-600', dot: 'bg-red-500' },
};

// Plan accents reuse the centre palette tones so the chips stay on-brand.
const PLAN_META: { key: string; label: string; dot: string }[] = [
  { key: 'premium', label: 'Premium', dot: 'bg-[#7c3aed]' },
  { key: 'standard', label: 'Standard', dot: 'bg-cmx-blue' },
  { key: 'family', label: 'Family', dot: 'bg-cmx-green' },
  { key: 'offpeak', label: 'Off Peak', dot: 'bg-cmx-amber' },
];

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

interface StatProps {
  value?: number | null;
  label: string;
  suffix?: string;
  hero?: boolean;
  /** Shown as a title-attribute tooltip when the value is empty, e.g. why it's unconfigured. */
  emptyHint?: string;
}

/** One KPI cell. Missing values render as an intentional muted dash, not "0". */
const Stat: React.FC<StatProps> = ({ value, label, suffix = '', hero = false, emptyHint }) => {
  const display = value === undefined || value === null ? '—' : `${value.toLocaleString()}${suffix}`;
  const isEmpty = display === '—';
  return (
    <div className="flex flex-col gap-0.5" title={isEmpty ? emptyHint : undefined}>
      <span
        className={`tabular-nums leading-none ${hero ? 'text-[22px] font-extrabold' : 'text-lg font-bold'} ${
          isEmpty ? 'text-muted' : 'text-navy'
        }`}
      >
        {display}
      </span>
      <span className="text-[10.5px] font-medium uppercase tracking-[0.03em] text-sub">{label}</span>
    </div>
  );
};

interface Props {
  centre: FacilitySummary;
  onOpen: (centre: FacilitySummary) => void;
  /** Open the wizard in edit mode (Review step) to edit the centre and change its status. */
  onEdit?: (centre: FacilitySummary) => void;
}

const CentreCard: React.FC<Props> = ({ centre, onOpen, onEdit }) => {
  const [localTime, setLocalTime] = useState(() => getLocalTime(centre.timezone));

  // Live local clock — tick every second like the reference design.
  useEffect(() => {
    const t = setInterval(() => setLocalTime(getLocalTime(centre.timezone)), 1000);
    return () => clearInterval(t);
  }, [centre.timezone]);

  const status = STATUS_META[centre.status] ?? STATUS_META.draft;
  const accent = centreColour(centre.code);
  const { kpi } = centre;
  const location =
    [centre.stateCode, centre.countryCode]
      .filter(Boolean)
      .map(s => s.toUpperCase())
      .join(', ') ||
    centre.cityCode ||
    '—';
  const plans = kpi?.activePlans ?? {};
  const hasPlans = PLAN_META.some(p => (plans[p.key] ?? 0) > 0);
  const tz = getTzAbbr(centre.timezone);
  const tailgates = kpi?.tailgates ?? 0;
  const openTasks = kpi?.openTasks ?? 0;

  return (
    // eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions
    <div
      className="group relative flex animate-cmx-fade-up cursor-pointer flex-col overflow-hidden rounded-xl border border-cmx-border bg-white p-[18px] shadow-cmx transition-all before:absolute before:inset-x-0 before:top-0 before:h-[3px] before:bg-[var(--cc-color,#21295a)] before:content-[''] hover:-translate-y-0.5 hover:border-gray-300 hover:shadow-cmx-md"
      style={{ ['--cc-color' as string]: accent }}
      onClick={() => onOpen(centre)}
    >
      {/* ── Header: identity + status ── */}
      <div className="mb-3 flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="shrink-0 text-base leading-none">{countryFlag(centre.countryCode)}</span>
            <span className="truncate text-[15px] font-bold leading-tight text-navy">{centre.name}</span>
          </div>
          <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1">
            <span
              className="rounded border border-cmx-border bg-cmx-body px-1.5 py-px font-mono text-[10.5px] font-semibold tracking-wide text-sub"
              style={{ borderLeft: `2px solid ${accent}` }}
            >
              {centre.code}
            </span>
            <span className="inline-flex items-center gap-1 text-xs text-sub">
              <svg className="h-3 w-3 shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" />
                <circle cx="12" cy="10" r="3" />
              </svg>
              <span className="truncate">{location}</span>
            </span>
          </div>
        </div>
        <span
          className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-semibold ${status.pill}`}
        >
          <span className={`h-1.5 w-1.5 rounded-full ${status.dot}`} />
          {status.label}
        </span>
      </div>

      {/* ── Live local clock ── */}
      <div className="mb-3.5 flex items-center gap-1.5 text-sub">
        <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
          <circle cx="12" cy="12" r="9" />
          <path d="M12 7v5l3 2" />
        </svg>
        <span className="text-[13px] font-semibold tabular-nums text-navy">{localTime}</span>
        {tz && (
          <span className="rounded border border-cmx-border bg-gray-100 px-[5px] py-px text-[10px] font-medium text-sub">
            {tz}
          </span>
        )}
      </div>

      {/* ── KPI rollup (mapped from the API `stats` block) ── */}
      <div className="grid grid-cols-2 gap-x-3 gap-y-3.5 rounded-[10px] border border-cmx-border bg-cmx-body/60 p-3">
        <Stat hero label="Active Members" value={kpi?.activeMembers} />
        <Stat label="Bookings · 30d" value={kpi?.bookings30d} />
        <Stat
          emptyHint={
            kpi?.utilisationStatus === 'insufficient_config'
              ? 'Capacity or operating hours not configured for this centre'
              : undefined
          }
          label="Utilisation"
          suffix="%"
          value={kpi?.utilisationPct}
        />
        <Stat label="No-show Rate" suffix="%" value={kpi?.noShowPct} />
      </div>

      {/* ── Tailgates + Open Tasks — red / amber pills when non-zero, muted otherwise ── */}
      <div className="mt-3.5 flex gap-2">
        <span
          className={`flex flex-1 items-center gap-1.5 rounded-lg border px-2.5 py-1.5 ${
            tailgates > 0 ? 'border-red-200 bg-red-50' : 'border-cmx-border bg-cmx-body'
          }`}
        >
          <svg
            className={`h-3.5 w-3.5 flex-shrink-0 ${tailgates > 0 ? 'text-red-600' : 'text-muted'}`}
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            viewBox="0 0 24 24"
          >
            <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <path d="M23 21v-2a4 4 0 00-3-3.87" />
            <path d="M16 3.13a4 4 0 010 7.75" />
          </svg>
          <b className={`text-[13px] font-bold ${tailgates > 0 ? 'text-red-600' : 'text-sub'}`}>{tailgates}</b>
          <span className="text-[11px] text-sub">Tailgates</span>
        </span>
        <span
          className={`flex flex-1 items-center gap-1.5 rounded-lg border px-2.5 py-1.5 ${
            openTasks > 0 ? 'border-amber-200 bg-amber-50' : 'border-cmx-border bg-cmx-body'
          }`}
        >
          <svg
            className={`h-3.5 w-3.5 flex-shrink-0 ${openTasks > 0 ? 'text-amber-600' : 'text-muted'}`}
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            viewBox="0 0 24 24"
          >
            <path d="M9 11l3 3L22 4" />
            <path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" />
          </svg>
          <b className={`text-[13px] font-bold ${openTasks > 0 ? 'text-amber-600' : 'text-sub'}`}>{openTasks}</b>
          <span className="text-[11px] text-sub">Open Tasks</span>
        </span>
      </div>

      {/* ── Plan split — clear dot-chips, or a quiet hint when empty ── */}
      <div className="mt-3.5 min-h-[24px]">
        {hasPlans ? (
          <div className="flex flex-wrap items-center gap-1.5">
            {PLAN_META.map(p => (
              <span
                key={p.key}
                className="inline-flex items-center gap-1.5 rounded-full border border-cmx-border bg-white px-2 py-0.5 text-[11px] font-medium text-sub"
              >
                <span className={`h-1.5 w-1.5 rounded-full ${p.dot}`} />
                {p.label}
                <b className="font-bold text-navy">{(plans[p.key] ?? 0).toLocaleString()}</b>
              </span>
            ))}
          </div>
        ) : (
          <span className="text-[11.5px] italic text-muted">No active memberships yet</span>
        )}
      </div>

      {/* ── Footer: open affordance ── */}
      <div className="mt-3.5 flex items-center justify-between border-t border-cmx-border pt-3">
        <span className="text-[11px] font-medium text-muted">Updated {centre.updatedAt?.slice(0, 10) || '—'}</span>
        <div className="flex items-center gap-2.5">
          {/* Every centre is editable. Drafts get an amber "Edit & Activate" call-to-action
              to finish setup; active/suspended centres get a neutral "Edit" (the wizard then
              offers Active ↔ Suspend on save). */}
          {onEdit && (
            <button
              className={`inline-flex cursor-pointer items-center gap-1 rounded-md border px-2 py-1 text-[11px] font-semibold transition-colors ${
                centre.status === 'draft'
                  ? 'border-cmx-amber bg-cmx-amber-bg text-cmx-amber hover:bg-cmx-amber hover:text-white'
                  : 'border-cmx-border bg-white text-sub hover:border-gray-300 hover:text-navy'
              }`}
              type="button"
              onClick={e => {
                e.stopPropagation();
                onEdit(centre);
              }}
            >
              <svg className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                <path d="M18.5 2.5a2.12 2.12 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
              </svg>
              {centre.status === 'draft' ? 'Edit & Activate' : 'Edit'}
            </button>
          )}
          <button
            className="inline-flex cursor-pointer items-center gap-1 border-none bg-transparent text-xs font-semibold text-cmx-blue transition-transform group-hover:translate-x-0.5"
            type="button"
            onClick={e => {
              e.stopPropagation();
              onOpen(centre);
            }}
          >
            Open
            <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
};

export default CentreCard;
