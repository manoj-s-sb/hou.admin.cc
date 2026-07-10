import React from 'react';

import { CapacityData } from '../../../store/reports/types';
import CapacityRing from '../components/CapacityRing';
import ChartCard from '../components/ChartCard';
import ProgressList from '../components/ProgressList';
import StatCard from '../components/StatCard';

const CapacityTab: React.FC<{ data: CapacityData }> = ({ data }) => {
  const { stats } = data;
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
        <StatCard accent="from-indigo-500 to-blue-500" subtitle="in period" title="Total Slots" value={stats.totalSlots} />
        <StatCard accent="from-emerald-500 to-teal-500" subtitle="booked" title="Filled Slots" value={stats.filledSlots} />
        <StatCard accent="from-amber-500 to-orange-500" subtitle="free capacity" title="Buffer" value={`${stats.bufferPct}%`} />
        <StatCard accent="from-violet-500 to-purple-500" subtitle="across plans" title="Waitlist Total" value={stats.waitlistTotal} />
      </div>

      <ChartCard subtitle="Fill % with plan breakdown per centre" title="Centre Capacity">
        {data.centreCapacity.length === 0 ? (
          <p className="py-8 text-center text-sm font-medium text-gray-400">No centres match these filters</p>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {data.centreCapacity.map(c => {
              const pill =
                c.pct > 85
                  ? 'bg-red-100 text-red-600'
                  : c.pct > 65
                    ? 'bg-amber-100 text-amber-600'
                    : 'bg-emerald-100 text-emerald-600';
              return (
                <div key={c.centreId} className="rounded-xl border border-gray-200 p-4 shadow-sm">
                  <div className="mb-3 flex items-center justify-between gap-2">
                    <p className="text-[13px] font-bold text-[#21295A]">{c.centreName}</p>
                    <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${pill}`}>{c.pct}%</span>
                  </div>
                  <div className="flex items-center gap-3.5">
                    <CapacityRing
                      centerLabel={`/ ${c.totalCapacity}`}
                      centerValue={c.members}
                      color={c.color}
                      pct={c.pct}
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
                              <span className="min-w-[28px] text-right font-semibold text-[#21295A]">
                                {p.used}
                              </span>
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
        <ChartCard subtitle="By plan and centre" title="Waitlist">
          {data.waitlist.length === 0 ? (
            <p className="py-8 text-center text-sm font-medium text-gray-400">
              No waitlist data is tracked for slots yet.
            </p>
          ) : (
            <ProgressList
              items={data.waitlist.map(w => ({
                label: w.label,
                value: w.count,
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
