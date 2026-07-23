import React, { useMemo } from 'react';

import { freqLabel } from '../constants';

import type { TaskSchedule } from '../../../store/maintenance/types';

interface Props {
  schedules: TaskSchedule[];
  onBack: () => void;
}

const fmtDateTime = (iso: string | null): string =>
  iso
    ? new Date(iso).toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : '—';

const THIRTY_DAYS = 30 * 24 * 60 * 60 * 1000;

/**
 * Inline activity-log panel (last 30 days) — completed tasks, most recent first.
 * Derived from the centre's schedules; swap the source when the backend exposes a
 * dedicated log endpoint.
 */
const LogsView: React.FC<Props> = ({ schedules, onBack }) => {
  const rows = useMemo(() => {
    const cutoff = Date.now() - THIRTY_DAYS;
    return schedules
      .filter(s => s.status === 'done' && s.lastCompletedAt && new Date(s.lastCompletedAt).getTime() >= cutoff)
      .sort((a, b) => (b.lastCompletedAt || '').localeCompare(a.lastCompletedAt || ''));
  }, [schedules]);

  return (
    <div>
      <div className="mb-3 flex items-start justify-between">
        <div>
          <h2 className="text-[16px] font-bold text-[#21295A]">Activity Log</h2>
          <p className="mt-0.5 text-[12px] text-gray-400">Last 30 days · all lanes · all tasks</p>
        </div>
        <button
          className="flex items-center gap-1 text-[12px] font-semibold text-gray-500 hover:text-[#21295A]"
          type="button"
          onClick={onBack}
        >
          ← Back
        </button>
      </div>

      <div className="overflow-x-auto rounded-xl border border-gray-100 bg-white">
        <table className="w-full min-w-[720px] border-collapse text-left">
          <thead>
            <tr className="border-b border-gray-100 text-[10.5px] font-semibold uppercase tracking-wider text-gray-400">
              <th className="px-4 py-3">Task</th>
              <th className="px-4 py-3">Lane</th>
              <th className="px-4 py-3">Frequency</th>
              <th className="px-4 py-3">Action</th>
              <th className="px-4 py-3">By</th>
              <th className="px-4 py-3">Date &amp; Time</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td className="px-4 py-10 text-center text-[13px] text-gray-400" colSpan={6}>
                  No activity in the last 30 days.
                </td>
              </tr>
            ) : (
              rows.map(s => (
                <tr key={s.id} className="border-b border-gray-50 text-[12.5px] text-gray-600 last:border-0">
                  <td className="px-4 py-3 font-semibold text-[#21295A]">{s.template.title}</td>
                  <td className="px-4 py-3">{s.laneNo ? `Lane ${s.laneNo}` : 'Facility-wide'}</td>
                  <td className="px-4 py-3">{freqLabel(s.template.freqN, s.template.freqUnit)}</td>
                  <td className="px-4 py-3">
                    <span className="font-semibold text-emerald-600">✓ Done</span>
                  </td>
                  <td className="px-4 py-3">{s.updatedByName || '—'}</td>
                  <td className="px-4 py-3 text-gray-500">{fmtDateTime(s.lastCompletedAt)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default LogsView;
