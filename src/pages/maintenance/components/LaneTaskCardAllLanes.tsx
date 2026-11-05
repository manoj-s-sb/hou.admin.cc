import React from 'react';

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

const laneBadgeCls = (schedule: TaskSchedule): string => {
  if (schedule.status === 'done') return 'border-teal-200 bg-teal-50 text-teal-700';
  if (schedule.status === 'overdue') return 'border-red-200 bg-red-50 text-red-600';
  return 'border-emerald-200 bg-emerald-50 text-emerald-700';
};

const laneBadgeIcon = (schedule: TaskSchedule): string =>
  schedule.status === 'done' ? '✓' : schedule.status === 'overdue' ? '🔴' : '✅';

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
  const sorted = [...schedules].sort((a, b) => (a.laneNo ?? -1) - (b.laneNo ?? -1));

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
          {sorted.length === 0 ? (
            <span className="rounded-lg border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10.5px] font-semibold text-amber-700">
              📅 Not scheduled
            </span>
          ) : (
            sorted.map(s => (
              <span
                key={s.id}
                className={`rounded-lg border px-2 py-0.5 text-[10.5px] font-semibold ${laneBadgeCls(s)}`}
              >
                {laneBadgeIcon(s)} {laneLabel(s.laneNo)} · {fmtShort(s.scheduledDate)}
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
