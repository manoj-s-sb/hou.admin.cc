import React, { useMemo } from 'react';

import { freqBadgeCls, freqLabel, taskTypeMeta } from '../constants';

import type { TaskSchedule, TaskTemplate } from '../../../store/maintenance/types';

interface Props {
  template: TaskTemplate;
  // Every schedule for this template, across ALL lanes (and facility-wide,
  // laneNo === null) -- unlike LaneTaskCard, which only ever sees one lane
  // at a time.
  schedules: TaskSchedule[];
  canManage: boolean;
  onSchedule: (t: TaskTemplate) => void;
  onViewSteps: (t: TaskTemplate) => void;
}

const fmtShort = (d: string | null): string =>
  d ? new Date(`${d}T00:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '—';

const laneLabel = (laneNo: number | null): string => (laneNo === null ? 'Facility-wide' : `Lane ${laneNo}`);

/** Worst status across a lane's occurrences — overdue beats pending beats done —
 * so a lane with even one overdue occurrence reads as overdue at a glance. */
const worstStatus = (schedules: TaskSchedule[]): 'overdue' | 'pending' | 'done' => {
  if (schedules.some(s => s.status === 'overdue')) return 'overdue';
  if (schedules.some(s => s.status !== 'done')) return 'pending';
  return 'done';
};

const laneBadgeCls = (status: 'overdue' | 'pending' | 'done'): string => {
  if (status === 'done') return 'border-teal-200 bg-teal-50 text-teal-700';
  if (status === 'overdue') return 'border-red-200 bg-red-50 text-red-600';
  return 'border-emerald-200 bg-emerald-50 text-emerald-700';
};

const laneBadgeIcon = (status: 'overdue' | 'pending' | 'done'): string =>
  status === 'done' ? '✓' : status === 'overdue' ? '🔴' : '✅';

/** The next date worth surfacing on a lane's collapsed badge: the nearest
 * not-yet-done occurrence (overdue or upcoming), or — if every occurrence on
 * this lane is already done — the most recent of those. */
const headlineDate = (schedules: TaskSchedule[]): string | null => {
  const open = schedules.filter(s => s.status !== 'done');
  const pool = open.length > 0 ? open : schedules;
  const sorted = [...pool].sort((a, b) => (a.scheduledDate ?? '').localeCompare(b.scheduledDate ?? ''));
  return (open.length > 0 ? sorted[0] : sorted[sorted.length - 1])?.scheduledDate ?? null;
};

/**
 * The "All Lanes" row in the centre Task Library: one row per task
 * (never duplicated per lane), with a small badge for every lane (or
 * facility-wide) it's currently scheduled on and that lane's own status --
 * so an admin can see the full cross-lane picture for a task without
 * switching tabs. "Schedule" stays available regardless of how many lanes
 * already have it, since there's always another lane it could also go on.
 */
const LaneTaskCardAllLanes: React.FC<Props> = ({ template, schedules, canManage, onSchedule, onViewSteps }) => {
  const type = taskTypeMeta(template.taskType, template.taskTypeCustom);
  const equipmentText = template.equipmentCustom || template.equipment || 'General';

  // One badge per LANE, not per occurrence — a Daily task scheduled a year out
  // previously rendered a separate chip for every single date (100+ chips for
  // one lane), flooding the card. Group by lane first; each badge then reads
  // as "status · lane · N scheduled · next/last date" with the full date list
  // available on hover via `title`.
  const laneGroups = useMemo(() => {
    const byLane = new Map<number | null, TaskSchedule[]>();
    for (const s of schedules) {
      const list = byLane.get(s.laneNo) ?? [];
      list.push(s);
      byLane.set(s.laneNo, list);
    }
    return [...byLane.entries()]
      .sort(([a], [b]) => (a ?? -1) - (b ?? -1))
      .map(([laneNo, group]) => ({ laneNo, schedules: group, status: worstStatus(group) }));
  }, [schedules]);

  return (
    <div className="flex gap-4 rounded-xl border border-gray-200 bg-white p-4">
      {/* Left — details */}
      <div className="min-w-0 flex-1">
        <div className="text-[14px] font-bold text-[#21295A]">{template.title}</div>
        {template.description && <p className="mt-0.5 text-[12px] text-gray-500">{template.description}</p>}

        <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[11px]">
          <span className="rounded bg-[#f0f4ff] px-1.5 py-0.5 font-semibold text-[#4338ca]">{equipmentText}</span>
          <span className={`rounded px-1.5 py-0.5 font-semibold ${type.badge}`}>
            {type.icon} {type.label}
          </span>
          <span className={`rounded px-1.5 py-0.5 font-semibold ${freqBadgeCls(template.freqN, template.freqUnit)}`}>
            {freqLabel(template.freqN, template.freqUnit)}
          </span>
        </div>

        <div className="mt-2 flex flex-wrap items-center gap-2">
          <button
            className="text-[11.5px] font-semibold text-indigo-600 hover:text-indigo-700"
            type="button"
            onClick={() => onViewSteps(template)}
          >
            📋 View steps{template.videoUrl ? ' & video' : ''}
          </button>
          {laneGroups.length === 0 ? (
            <span className="rounded-lg border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10.5px] font-semibold text-amber-700">
              📅 Not scheduled
            </span>
          ) : (
            laneGroups.map(g => (
              <span
                key={g.laneNo ?? 'facility-wide'}
                className={`rounded-lg border px-2 py-0.5 text-[10.5px] font-semibold ${laneBadgeCls(g.status)}`}
                title={g.schedules
                  .map(s => fmtShort(s.scheduledDate))
                  .sort()
                  .join(', ')}
              >
                {laneBadgeIcon(g.status)} {laneLabel(g.laneNo)} · {g.schedules.length} scheduled
                {g.schedules.length > 1
                  ? ` · next ${fmtShort(headlineDate(g.schedules))}`
                  : ` · ${fmtShort(headlineDate(g.schedules))}`}
              </span>
            ))
          )}
        </div>
      </div>

      {/* Right — always offer Schedule here: there's always another lane (or
          facility-wide) this task could also be added to. */}
      <div className="flex w-32 flex-shrink-0 flex-col justify-center gap-2">
        {canManage && (
          <button
            className="flex items-center justify-center gap-1.5 rounded-lg bg-[#21295A] px-3 py-2 text-[12px] font-semibold text-white transition hover:bg-[#2d3570]"
            type="button"
            onClick={() => onSchedule(template)}
          >
            📅 Schedule
          </button>
        )}
      </div>
    </div>
  );
};

export default LaneTaskCardAllLanes;
