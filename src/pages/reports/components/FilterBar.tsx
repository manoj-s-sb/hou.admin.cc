import React, { useEffect, useState } from 'react';

import { scopeType } from '../../../rbac';
import { ReportPeriod, ReportsRequest, ReportView } from '../../../store/reports/types';

export interface CentreOption {
  code: string;
  name: string;
}

interface FilterBarProps {
  applied: ReportsRequest;
  centres: CentreOption[];
  onApply: (next: ReportsRequest) => void;
  onReset: () => void;
}

const inputCls =
  'w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-[13px] text-gray-700 outline-none transition focus:border-[#21295A] focus:bg-white focus:ring-2 focus:ring-[#21295A]/10';
const labelCls = 'mb-1 block text-[11px] font-semibold uppercase tracking-wider text-gray-400';

// Exported so the page header can name the active period next to its figures —
// the Centre Management card's own stats use a fixed last-30-days window
// regardless of this selection, so the two are only directly comparable when
// "Last 30 days" is selected here.
export const PERIODS: { value: ReportPeriod; label: string }[] = [
  { value: 'all', label: 'Full summary' },
  { value: '30d', label: 'Last 30 days' },
  { value: '90d', label: 'Last 90 days' },
  { value: '6m', label: '6 months' },
  { value: '1y', label: 'This year' },
  { value: 'custom', label: 'Custom range' },
];

const FilterBar: React.FC<FilterBarProps> = ({ applied, centres, onApply, onReset }) => {
  const [draft, setDraft] = useState<ReportsRequest>(applied);

  // Keep the draft in sync when the applied filters change externally (e.g. Reset).
  useEffect(() => {
    setDraft(applied);
  }, [applied]);

  const set = (patch: Partial<ReportsRequest>) => setDraft(prev => ({ ...prev, ...patch }));

  const isCentre = draft.view === 'centre';
  const isCustom = draft.period === 'custom';
  // RP-7: block a reversed custom range (end before start) before it ever reaches
  // the backend — the HTML5 min/max on the two date inputs below already stop most
  // of this via the native picker, but typing a date directly can still bypass it.
  const invalidRange = Boolean(isCustom && draft.startDate && draft.endDate && draft.startDate > draft.endDate);
  // Fix A: a Custom range with either date still empty must not be submittable —
  // the backend 500s on an incomplete range instead of failing cleanly, so this
  // has to be caught here rather than relying on the API's own error response.
  const incompleteRange = Boolean(isCustom && (!draft.startDate || !draft.endDate));

  // Facility-scoped users get exactly one centre (the list is server-scoped) — lock the
  // picker to it and auto-apply, so they can't switch to network / another centre.
  const lockedFacility = scopeType() === 'facility' && centres.length === 1 ? centres[0].code : null;

  useEffect(() => {
    if (lockedFacility && (applied.view !== 'centre' || applied.centreId !== lockedFacility)) {
      onApply({ ...applied, view: 'centre', centreId: lockedFacility });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lockedFacility, applied.view, applied.centreId]);

  const apply = () => onApply(draft);

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">Filters</span>
        <button className="text-xs font-semibold text-[#21295A] hover:underline" type="button" onClick={onReset}>
          Reset
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {/* View toggle */}
        <div>
          <span className={labelCls}>View</span>
          <div className="flex gap-0.5 rounded-lg bg-gray-100 p-[3px]">
            {(['network', 'centre'] as ReportView[]).map(v => (
              <button
                key={v}
                className={`flex-1 rounded-md px-2 py-1.5 text-[12px] font-semibold transition disabled:cursor-not-allowed disabled:opacity-60 ${
                  draft.view === v ? 'bg-[#21295A] text-white' : 'text-gray-500 hover:text-gray-700'
                }`}
                disabled={Boolean(lockedFacility)}
                type="button"
                onClick={() => set({ view: v, centreId: v === 'network' ? undefined : draft.centreId })}
              >
                {v === 'network' ? 'All Centres' : 'Single Centre'}
              </button>
            ))}
          </div>
        </div>

        {/* RP-1: network totals default to Active centres only; let the admin opt into
            Draft/Staging/Suspended (e.g. QA/test centres) when they need to see them. */}
        {!isCentre && (
          <div className="flex items-end">
            <label className="flex items-center gap-2 text-[12px] font-medium text-gray-600">
              <input
                checked={Boolean(draft.includeNonActive)}
                className="h-4 w-4 rounded border-gray-300 text-[#21295A] focus:ring-[#21295A]/30"
                type="checkbox"
                onChange={e => set({ includeNonActive: e.target.checked })}
              />
              Include non-active centres
            </label>
          </div>
        )}

        {/* Centre (only when single centre) */}
        {isCentre && (
          <div>
            <span className={labelCls}>Centre</span>
            <select
              className={`${inputCls} disabled:cursor-not-allowed disabled:opacity-70`}
              disabled={Boolean(lockedFacility)}
              value={draft.centreId || ''}
              onChange={e => set({ centreId: e.target.value })}
            >
              <option value="">Select a centre</option>
              {centres.map(c => (
                <option key={c.code} value={c.code}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Period */}
        <div>
          <span className={labelCls}>Period</span>
          <select
            className={inputCls}
            value={draft.period}
            onChange={e => set({ period: e.target.value as ReportPeriod })}
          >
            {PERIODS.map(p => (
              <option key={p.value} value={p.value}>
                {p.label}
              </option>
            ))}
          </select>
        </div>

        {/* Custom range */}
        {isCustom && (
          <>
            <div>
              <span className={labelCls}>From</span>
              <input
                className={inputCls}
                max={draft.endDate || undefined}
                type="date"
                value={draft.startDate || ''}
                onChange={e => set({ startDate: e.target.value })}
              />
            </div>
            <div>
              <span className={labelCls}>To</span>
              <input
                className={inputCls}
                min={draft.startDate || undefined}
                type="date"
                value={draft.endDate || ''}
                onChange={e => set({ endDate: e.target.value })}
              />
              {invalidRange && (
                <p className="mt-1 text-[11px] font-medium text-red-500">End date must be after start date</p>
              )}
            </div>
          </>
        )}

        {/* Apply */}
        <div className="flex items-end">
          <button
            className="w-full rounded-lg bg-[#21295A] px-4 py-2 text-[13px] font-semibold text-white shadow-sm transition hover:bg-[#2c3670] disabled:cursor-not-allowed disabled:opacity-50"
            disabled={(isCentre && !draft.centreId) || invalidRange || incompleteRange}
            type="button"
            onClick={apply}
          >
            Apply
          </button>
        </div>
      </div>
    </div>
  );
};

export default FilterBar;
