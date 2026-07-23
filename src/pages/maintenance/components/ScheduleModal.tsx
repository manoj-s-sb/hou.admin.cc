import React, { useState } from 'react';

import { toast } from 'react-hot-toast';
import { useDispatch } from 'react-redux';

import { scheduleTask, unscheduleTask } from '../../../store/maintenance/api';
import { AppDispatch } from '../../../store/store';
import {
  ALL_LANES,
  freqBadgeCls,
  freqLabel,
  inputCls,
  labelCls,
  nextOccurrence,
  priorityMeta,
  taskTypeMeta,
} from '../constants';

import type { TaskSchedule, TaskTemplate, TemplateEnrich } from '../../../store/maintenance/types';

interface Props {
  // Full library template (schedule flow) or the enriched template embedded on a
  // schedule (reschedule flow) — the modal only reads their shared fields.
  template: TaskTemplate | TemplateEnrich;
  facilityCode: string;
  defaultLane?: number | null;
  /** When set, the modal reschedules this existing schedule (change its date/lane). */
  existing?: TaskSchedule | null;
  onClose: () => void;
  onScheduled: () => void;
}

const todayStr = () => new Date().toISOString().split('T')[0];

const ScheduleModal: React.FC<Props> = ({ template, facilityCode, defaultLane, existing, onClose, onScheduled }) => {
  const dispatch = useDispatch<AppDispatch>();
  const isReschedule = Boolean(existing);
  const [lane, setLane] = useState<string>(
    existing ? (existing.laneNo ? String(existing.laneNo) : '') : defaultLane ? String(defaultLane) : ''
  ); // '' = facility-wide
  const type = taskTypeMeta(template.taskType);
  const prio = priorityMeta(template.priority);
  // For a done/recurred task, default to its next occurrence date (not the past
  // completed date); otherwise use the current scheduled date.
  const [scheduledDate, setScheduledDate] = useState<string>(
    existing
      ? existing.status === 'done'
        ? existing.nextDueDate || existing.scheduledDate
        : existing.scheduledDate
      : todayStr()
  );
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!scheduledDate) {
      toast.error('Pick a date');
      return;
    }
    setSaving(true);
    try {
      // Reschedule = drop the old schedule then re-create it on the new date/lane
      // (the backend rejects a duplicate schedule, so the old one must go first).
      if (existing) await dispatch(unscheduleTask({ id: existing.id, facilityCode })).unwrap();
      await dispatch(
        scheduleTask({
          templateId: template.id,
          facilityCode,
          laneNo: lane ? parseInt(lane, 10) : null,
          scheduledDate,
        })
      ).unwrap();
      toast.success(isReschedule ? 'Task rescheduled' : 'Task scheduled');
      onScheduled();
    } catch (e) {
      toast.error(typeof e === 'string' ? e : `Could not ${isReschedule ? 'reschedule' : 'schedule'} the task`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      aria-modal="true"
      className="fixed inset-0 z-[640] flex items-center justify-center bg-black/40 p-4"
      role="dialog"
    >
      <div className="w-full max-w-[460px] overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="flex items-start justify-between border-b border-gray-100 px-6 py-4">
          <div>
            <h2 className="text-[16px] font-bold text-[#21295A]">
              {isReschedule ? 'Reschedule Task' : 'Schedule Task'}
            </h2>
            <p className="mt-0.5 text-[12px] text-gray-400">
              {isReschedule
                ? 'Change the date (or lane) for this scheduled task'
                : 'Assign this task from the library to this centre'}
            </p>
          </div>
          <button
            aria-label="Close"
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50"
            type="button"
            onClick={onClose}
          >
            ×
          </button>
        </div>

        <div className="space-y-4 px-6 py-5">
          <div className="rounded-xl border border-gray-100 bg-gray-50 p-3.5">
            <div className="text-[14px] font-bold text-[#21295A]">{template.title}</div>
            <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-[11px]">
              <span className={`rounded px-1.5 py-0.5 font-semibold ${type.badge}`}>
                {type.icon} {type.label}
              </span>
              <span
                className={`rounded px-1.5 py-0.5 font-semibold ${freqBadgeCls(template.freqN, template.freqUnit)}`}
              >
                {freqLabel(template.freqN, template.freqUnit)}
              </span>
              <span className={`rounded px-1.5 py-0.5 font-semibold ${prio.pill}`}>{prio.label} Priority</span>
            </div>
            {template.description && <p className="mt-1.5 text-[12px] text-gray-600">{template.description}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <span className={labelCls}>Lane</span>
              <select className={inputCls} value={lane} onChange={e => setLane(e.target.value)}>
                <option value="">Facility-wide</option>
                {ALL_LANES.map(n => (
                  <option key={n} value={n}>
                    Lane {n}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <span className={labelCls}>Scheduled date</span>
              <input
                className={inputCls}
                type="date"
                value={scheduledDate}
                onChange={e => setScheduledDate(e.target.value)}
              />
            </div>
          </div>

          {/* Next occurrence preview — recurs by the task frequency. The backend
              rolls the schedule forward to this date once it is marked done. */}
          {scheduledDate && (
            <div className="flex items-center gap-2 rounded-lg border border-emerald-100 bg-emerald-50/60 px-3 py-2 text-[12px] text-emerald-700">
              <span>🔁</span>
              <span>
                Recurs <span className="font-semibold">{freqLabel(template.freqN, template.freqUnit)}</span> — next on{' '}
                <span className="font-semibold">
                  {new Date(
                    `${nextOccurrence(scheduledDate, template.freqN, template.freqUnit)}T00:00:00`
                  ).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                </span>
              </span>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 border-t border-gray-100 px-6 py-4">
          <button
            className="rounded-lg border border-gray-200 px-4 py-2 text-[12px] font-semibold text-gray-600 transition hover:bg-gray-50 disabled:opacity-50"
            disabled={saving}
            type="button"
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            className="rounded-lg bg-[#21295A] px-5 py-2 text-[12px] font-semibold text-white shadow-sm transition hover:bg-[#2d3570] disabled:opacity-50"
            disabled={saving}
            type="button"
            onClick={handleSave}
          >
            {saving ? 'Saving…' : isReschedule ? '📅 Confirm Reschedule' : '📅 Confirm Schedule'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ScheduleModal;
