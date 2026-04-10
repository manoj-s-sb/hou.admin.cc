import { useState } from 'react';

import { toast } from 'react-hot-toast';

import { createWork, updateWork } from '../../../store/maintenance/api';
import { Work } from '../../../store/maintenance/types';
import { ActionType, actionTypes, getLocalUser, toggleCls } from '../constants';

interface MarkDoneModalProps {
  item: Work;
  updatedBy: string;
  facilityCode: string;
  onClose: () => void;
  onSuccess: () => void;
  dispatch: any;
}

const MarkDoneModal = ({ item, updatedBy, facilityCode, onClose, onSuccess, dispatch }: MarkDoneModalProps) => {
  const [actionType, setActionType] = useState<ActionType>('no_action');
  const [actionNotes, setActionNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const { userId: createdBy, name: createdByName } = getLocalUser();
  const updatedByName = createdByName;

  const handleSubmit = () => {
    if (!actionNotes.trim()) {
      toast.error('Please describe the action taken.');
      return;
    }
    if (!actionType) {
      toast.error('Please select an action type.');
      return;
    }
    setSaving(true);
    const now = new Date();
    const lastCompletedAt = now.toISOString().replace(/\.(\d{3})Z$/, '.$1000+00:00');
    const next = new Date(now);
    if (item.frequency === 'daily') next.setDate(next.getDate() + 1);
    else if (item.frequency === 'weekly') next.setDate(next.getDate() + 7);
    else if (item.frequency === 'bi-weekly') next.setDate(next.getDate() + 14);
    else if (item.frequency === 'monthly') next.setMonth(next.getMonth() + 1);
    const [nextDueDate] = next.toISOString().split('T');

    dispatch(
      updateWork({
        itemId: item.itemId,
        status: 'completed',
        lastCompletedAt,
        ...(updatedBy ? { updatedBy } : {}),
        ...(updatedByName ? { updatedByName } : {}),
        actionTaken: `[${actionType}] ${actionNotes.trim()}`,
        ...(item.frequency ? { nextDueDate, scheduledDate: nextDueDate } : {}),
      })
    )
      .unwrap()
      .then(() =>
        dispatch(
          createWork({
            facilityCode,
            type: 'log',
            status: 'completed',
            title: item.title,
            category: item.category || '',
            priority: item.priority || 'medium',
            laneNo: item.laneNo || 0,
            notes: actionNotes.trim(),
            ...(item.frequency ? { frequency: item.frequency } : {}),
            ...(updatedBy ? { raisedBy: updatedBy, raisedByName: updatedByName } : {}),
            ...(createdBy ? { createdBy } : {}),
            ...(createdByName ? { createdByName } : {}),
          })
        ).unwrap()
      )
      .then(() => {
        toast.success('Task marked as done and log created!');
        onSuccess();
        onClose();
      })
      .catch((err: any) => toast.error(err || 'Failed to update.'))
      .finally(() => setSaving(false));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-green-100">
              <svg className="h-4 w-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} />
              </svg>
            </div>
            <p className="text-base font-bold text-gray-900">Mark as Done</p>
          </div>
          <button
            className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
            type="button"
            onClick={onClose}
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path d="M6 18L18 6M6 6l12 12" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} />
            </svg>
          </button>
        </div>

        <div className="px-6 pt-4">
          <div className="rounded-xl border border-gray-100 bg-gray-50 p-4">
            <p className="text-sm font-semibold text-gray-900">{item.title}</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {item.category && (
                <span className="rounded-full bg-yellow-100 px-2.5 py-0.5 text-xs font-medium capitalize text-yellow-700">
                  {item.category}
                </span>
              )}
              {item.frequency && (
                <span className="rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium capitalize text-green-700">
                  {item.frequency}
                </span>
              )}
              {item.laneNo && (
                <span className="rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-medium text-blue-600">
                  Lane {item.laneNo}
                </span>
              )}
              {item.priority && (
                <span className="rounded-full bg-red-50 px-2.5 py-0.5 text-xs font-medium capitalize text-red-600">
                  {item.priority} priority
                </span>
              )}
            </div>
            {item.notes && <p className="mt-2 text-xs text-gray-500">{item.notes}</p>}
          </div>
        </div>

        <div className="px-6 py-4">
          <div className="mb-4">
            <p className="mb-2 text-xs font-medium text-gray-600">
              Action type <span className="text-red-500">*</span>
            </p>
            <div className="flex flex-wrap gap-2">
              {actionTypes.map(opt => (
                <button
                  key={opt.key}
                  className={toggleCls(actionType === opt.key)}
                  type="button"
                  onClick={() => setActionType(opt.key)}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
          <label className="mb-1.5 block text-xs font-medium text-gray-600" htmlFor="action-notes">
            Notes <span className="text-red-500">*</span>
          </label>
          <textarea
            className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700 focus:border-green-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-green-200"
            id="action-notes"
            placeholder="Describe what was done, any observations, parts replaced, etc."
            rows={4}
            value={actionNotes}
            onChange={e => setActionNotes(e.target.value)}
          />
        </div>

        <div className="flex justify-end gap-2 border-t border-gray-100 px-6 py-4">
          <button
            className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50"
            disabled={saving}
            type="button"
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            className="flex items-center gap-1.5 rounded-lg bg-green-500 px-5 py-2 text-sm font-semibold text-white hover:bg-green-600 disabled:opacity-50"
            disabled={saving}
            type="button"
            onClick={handleSubmit}
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} />
            </svg>
            {saving ? 'Saving...' : 'Confirm Done'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default MarkDoneModal;
