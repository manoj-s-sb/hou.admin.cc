import { useState } from 'react';

import { toast } from 'react-hot-toast';

import { updateWork } from '../../../store/maintenance/api';
import { UpdateWorkRequest, Work } from '../../../store/maintenance/types';
import { getLocalUser } from '../constants';

interface ScheduleModalProps {
  item: Work;
  updatedBy?: string;
  onClose: () => void;
  onSuccess: () => void;
  dispatch: any;
}

const ScheduleModal = ({ item, updatedBy, onClose, onSuccess, dispatch }: ScheduleModalProps) => {
  const [scheduledDate, setScheduledDate] = useState(item.scheduledDate || '');
  const [saving, setSaving] = useState(false);

  const handleSubmit = () => {
    if (!scheduledDate) {
      toast.error('Please select a date.');
      return;
    }
    setSaving(true);
    const { name: updatedByName } = getLocalUser();
    dispatch(updateWork({
      itemId: item.itemId,
      scheduledDate,
      ...(updatedBy ? { updatedBy } : {}),
      ...(updatedByName ? { updatedByName } : {}),
    } as UpdateWorkRequest))
      .unwrap()
      .then(() => {
        toast.success('Task scheduled successfully!');
        onSuccess();
        onClose();
      })
      .catch((err: any) => toast.error(err || 'Failed to schedule task.'))
      .finally(() => setSaving(false));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <p className="text-base font-bold text-gray-900">Schedule Task</p>
          <button className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700" type="button" onClick={onClose}>
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path d="M6 18L18 6M6 6l12 12" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} />
            </svg>
          </button>
        </div>

        <div className="px-6 py-5">
          <div className="mb-5 rounded-xl border border-gray-100 bg-gray-50 p-4">
            <p className="text-sm font-semibold text-gray-900">{item.title}</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {item.category && (
                <span className="rounded-full bg-yellow-100 px-2.5 py-0.5 text-xs font-medium capitalize text-yellow-700">{item.category}</span>
              )}
              {item.frequency && (
                <span className="rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium capitalize text-green-700">{item.frequency}</span>
              )}
              {item.laneNo && (
                <span className="rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-medium text-blue-600">Lane {item.laneNo}</span>
              )}
              {item.priority && (
                <span className="rounded-full bg-red-50 px-2.5 py-0.5 text-xs font-medium capitalize text-red-600">{item.priority} priority</span>
              )}
            </div>
            {item.notes && <p className="mt-2 text-xs text-gray-500">{item.notes}</p>}
          </div>

          {item.scheduledDate && (
            <div className="mb-4 flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 px-3 py-2">
              <svg className="h-4 w-4 shrink-0 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} />
              </svg>
              <p className="text-xs text-green-700">
                Currently scheduled for{' '}
                <span className="font-semibold">
                  {new Date(item.scheduledDate).toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' })}
                </span>
              </p>
            </div>
          )}

          <div>
            <label className="mb-1.5 block text-xs font-medium text-gray-600" htmlFor="schedule-date">
              {item.scheduledDate ? 'Change Scheduled Date' : 'Scheduled Date'} <span className="text-red-500">*</span>
            </label>
            <input
              className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700 focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-200"
              id="schedule-date"
              min={new Date().toISOString().split('T')[0]}
              type="date"
              value={scheduledDate}
              onChange={e => setScheduledDate(e.target.value)}
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 border-t border-gray-100 px-6 py-4">
          <button className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50" disabled={saving} type="button" onClick={onClose}>
            Cancel
          </button>
          <button
            className="flex items-center gap-1.5 rounded-lg bg-[#21295A] px-5 py-2 text-sm font-semibold text-white hover:bg-[#1a2149] disabled:opacity-50"
            disabled={saving}
            type="button"
            onClick={handleSubmit}
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} />
            </svg>
            {saving ? 'Scheduling...' : 'Confirm Schedule'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ScheduleModal;
