import React, { useMemo, useState } from 'react';

import { CapacityData } from '../../../store/reports/types';
import CapacityRing from '../components/CapacityRing';
import ChartCard from '../components/ChartCard';
import ProgressList from '../components/ProgressList';
import StatCard from '../components/StatCard';

const ALL_TYPES = 'all';

const CapacityTab: React.FC<{ data: CapacityData }> = ({ data }) => {
  const { stats } = data;

  // Waitlist "Type" filter — built dynamically from whatever subscriptionSrc
  // labels are actually present in the data (same pattern already used by the
  // Waitlist page's own Type filter), so a new signup source shows up here
  // automatically with no code change. When a specific type is picked, one
  // row per centre is shown for that type; on "All Types" (default), rows are
  // aggregated per centre across every type — either way a centre name never
  // repeats. `max` is recomputed as the sum of the currently-displayed rows
  // (not the raw network-wide total), so bar lengths stay meaningful within
  // whatever's currently shown instead of being diluted by filtered-out data.
  const waitlistTypes = useMemo(
    () => Array.from(new Set(data.waitlist.map(w => w.sublabel).filter((s): s is string => Boolean(s)))).sort(),
    [data.waitlist]
  );
  const [waitlistType, setWaitlistType] = useState<string>(ALL_TYPES);

  const waitlistRows = useMemo(() => {
    const source =
      waitlistType === ALL_TYPES
        ? (() => {
            const byLabel = new Map<string, { label: string; count: number; color: string }>();
            for (const w of data.waitlist) {
              const existing = byLabel.get(w.label);
              if (existing) existing.count += w.count;
              else byLabel.set(w.label, { label: w.label, count: w.count, color: w.color });
            }
            return Array.from(byLabel.values());
          })()
        : data.waitlist.filter(w => w.sublabel === waitlistType);

    const total = source.reduce((sum, r) => sum + r.count, 0);
    return source.map(r => ({ ...r, max: total })).sort((a, b) => b.count - a.count);
  }, [data.waitlist, waitlistType]);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          accent="from-indigo-500 to-blue-500"
          subtitle="in period"
          title="Total Slots"
          value={stats.totalSlots}
        />
        <StatCard
          accent="from-emerald-500 to-teal-500"
          subtitle="booked"
          title="Filled Slots"
          value={stats.filledSlots}
        />
        <StatCard
          accent="from-amber-500 to-orange-500"
          subtitle="slots not booked"
          title="Unallocated Buffer"
          value={Math.max(0, stats.totalSlots - stats.filledSlots)}
        />
        <StatCard
          accent="from-violet-500 to-purple-500"
          subtitle="across plans"
          title="Waitlist Total"
          value={stats.waitlistTotal}
        />
      </div>

      <ChartCard subtitle="Fill % with plan breakdown per centre" title="Centre Capacity">
        {data.centreCapacity.length === 0 ? (
          <p className="py-8 text-center text-sm font-medium text-gray-400">No centres match these filters</p>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {data.centreCapacity.map(c => {
              // Display-only clamp — the source pct can exceed 100% when the backend's
              // capacity figure for a centre is wrong (tracked separately); never show
              // a "fill" percentage above what's physically possible.
              const displayPct = Math.min(100, Math.max(0, c.pct));
              const pill =
                displayPct > 85
                  ? 'bg-red-100 text-red-600'
                  : displayPct > 65
                    ? 'bg-amber-100 text-amber-600'
                    : 'bg-emerald-100 text-emerald-600';
              return (
                <div key={c.centreId} className="rounded-xl border border-gray-200 p-4 shadow-sm">
                  <div className="mb-3 flex items-center justify-between gap-2">
                    <p className="text-[13px] font-bold text-[#21295A]">{c.centreName}</p>
                    <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${pill}`}>
                      {Math.round(displayPct)}%
                    </span>
                  </div>
                  <div className="flex items-center gap-3.5">
                    <CapacityRing
                      centerLabel={`/ ${c.totalCapacity}`}
                      centerValue={c.members}
                      color={c.color}
                      pct={displayPct}
                      size={60}
                      strokeWidth={7}
                    />
                    <div className="flex flex-1 flex-col gap-1.5">
                      {(() => {
                        // No per-plan capacity exists in the data (only a single overall
                        // capacity per centre), so bars show each plan's share of this
                        // centre's members — the fullest plan fills the bar.
                        const peak = Math.max(1, ...c.plans.map(p => p.used));
                        return c.plans.map(p => {
                          const w = Math.round((p.used / peak) * 100);
                          return (
                            <div key={p.planName} className="flex items-center gap-1.5 text-[11px]">
                              <span className="w-14 flex-shrink-0 truncate text-gray-500">{p.planName}</span>
                              <span className="h-[5px] flex-1 overflow-hidden rounded-sm bg-gray-100">
                                <span
                                  className="block h-full rounded-sm"
                                  style={{ width: `${w}%`, background: p.color }}
                                />
                              </span>
                              <span className="min-w-[28px] text-right font-semibold text-[#21295A]">{p.used}</span>
                            </div>
                          );
                        });
                      })()}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </ChartCard>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <ChartCard subtitle="Members vs capacity across network" title="Plan Fill Rates">
          <ProgressList
            items={data.planFillRates.map(p => ({
              label: p.planName,
              value: p.filled,
              max: p.max,
              color: p.color,
            }))}
          />
        </ChartCard>
        <ChartCard
          action={
            waitlistTypes.length > 0 && (
              <select
                aria-label="Filter waitlist by type"
                className="rounded-lg border border-gray-200 bg-gray-50 px-2.5 py-1.5 text-[12px] font-semibold text-gray-700 outline-none transition focus:border-[#21295A] focus:bg-white"
                value={waitlistType}
                onChange={e => setWaitlistType(e.target.value)}
              >
                <option value={ALL_TYPES}>All Types</option>
                {waitlistTypes.map(t => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            )
          }
          subtitle="Prospective members waiting, by centre"
          title="Waitlist"
        >
          {waitlistRows.length === 0 ? (
            <p className="py-8 text-center text-sm font-medium text-gray-400">No one is on the waitlist right now.</p>
          ) : (
            <ProgressList
              items={waitlistRows.map(w => ({
                label: w.label,
                value: w.count,
                valueLabel: String(w.count),
                max: w.max,
                color: w.color,
              }))}
            />
          )}
        </ChartCard>
      </div>
    </div>
  );
};

export default CapacityTab;
