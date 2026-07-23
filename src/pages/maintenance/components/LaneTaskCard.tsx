import React from 'react';

import { freqBadgeCls, freqLabel, taskTypeMeta } from '../constants';

import type { TaskSchedule, TaskTemplate } from '../../../store/maintenance/types';

interface Props {
  template: TaskTemplate;
  schedule: TaskSchedule | null; // this template's schedule at the selected lane (if any)
  canManage: boolean;
  onSchedule: (t: TaskTemplate) => void;
  onViewSteps: (t: TaskTemplate) => void;
}

const fmtShort = (d: string | null): string =>
  d ? new Date(`${d}T00:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '—';

/**
 * A task row in the centre Task Library, scoped to the selected lane. The library
 * is browse-and-schedule only: the sole action is "Schedule". Once a task is
 * scheduled, marking it done, flagging, attachments and rescheduling all happen
 * in "My Schedule".
 */
const LaneTaskCard: React.FC<Props> = ({ template, schedule, canManage, onSchedule, onViewSteps }) => {
  const type = taskTypeMeta(template.taskType);
  const equipmentText = template.equipmentCustom || template.equipment || 'General';
  const scheduled = Boolean(schedule);
  const isDone = schedule?.status === 'done';
  const isOverdue = schedule?.status === 'overdue';

  const rowTint = isDone
    ? 'border-teal-200 bg-teal-50/40'
    : isOverdue
      ? 'border-red-200 bg-red-50/40'
      : scheduled
        ? 'border-emerald-200 bg-emerald-50/30'
        : 'border-gray-200 bg-white';

  return (
    <div className={`flex gap-4 rounded-xl border p-4 ${rowTint}`}>
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
          {!scheduled ? (
            <span className="rounded-lg border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10.5px] font-semibold text-amber-700">
              📅 Not scheduled
            </span>
          ) : isDone ? (
            <span className="rounded-lg border border-teal-200 bg-teal-50 px-2 py-0.5 text-[10.5px] font-semibold text-teal-700">
              ✓ Done · manage in My Schedule
            </span>
          ) : isOverdue ? (
            <span className="rounded-lg border border-red-200 bg-red-50 px-2 py-0.5 text-[10.5px] font-semibold text-red-600">
              🔴 Overdue · {fmtShort(schedule?.scheduledDate ?? null)}
            </span>
          ) : (
            <span className="rounded-lg border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10.5px] font-semibold text-emerald-700">
              ✅ Scheduled · {fmtShort(schedule?.scheduledDate ?? null)}
            </span>
          )}
        </div>
      </div>

      {/* Right — the library's only action is Schedule (management moves to My Schedule). */}
      <div className="flex w-32 flex-shrink-0 flex-col justify-center gap-2">
        {scheduled ? (
          <span className="flex items-center justify-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-[12px] font-semibold text-emerald-700">
            ✓ Scheduled
          </span>
        ) : (
          canManage && (
            <button
              className="flex items-center justify-center gap-1.5 rounded-lg bg-[#21295A] px-3 py-2 text-[12px] font-semibold text-white transition hover:bg-[#2d3570]"
              type="button"
              onClick={() => onSchedule(template)}
            >
              📅 Schedule
            </button>
          )
        )}
      </div>
    </div>
  );
};

export default LaneTaskCard;
