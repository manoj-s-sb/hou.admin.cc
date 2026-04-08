import { useEffect, useState } from 'react';

import { toast } from 'react-hot-toast';
import { useDispatch, useSelector } from 'react-redux';

import SectionTitle from '../../components/SectionTitle';
import DataTable from '../../components/Table/DataTable';
import { ColumnDef } from '../../components/Table/types';
import { createWork, getWorkList, updateWork } from '../../store/maintenance/api';
import { CreateWorkRequest, UpdateWorkRequest, Work, WorkStep } from '../../store/maintenance/types';
import { AppDispatch, RootState } from '../../store/store';

interface StepsModalProps {
  item: Work;
  onClose: () => void;
}

const StepsModal = ({ item, onClose }: StepsModalProps) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
    <div className="relative flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
      {/* Header */}
      <div className="flex items-start justify-between border-b border-gray-100 px-6 py-4">
        <div>
          <p className="text-base font-bold text-gray-900">{item.title}</p>
          <p className="mt-0.5 text-xs text-gray-400">{item.steps?.length || 0} steps</p>
        </div>
        <button
          className="ml-4 rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700"
          type="button"
          onClick={onClose}
        >
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path d="M6 18L18 6M6 6l12 12" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} />
          </svg>
        </button>
      </div>

      {/* Timeline */}
      <div className="overflow-y-auto px-6 py-6">
        {item.steps && item.steps.length > 0 ? (
          <div className="flex flex-col">
            {item.steps.map((step: WorkStep, index: number) => (
              <div key={step.stepId} className="relative flex gap-4">
                {/* Number + line */}
                <div className="flex flex-col items-center">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#21295A] text-xs font-bold text-white">
                    {step.order}
                  </div>
                  {index < item.steps.length - 1 && (
                    <div className="w-px flex-1 bg-gray-200" style={{ minHeight: '28px' }} />
                  )}
                </div>

                {/* Step content */}
                <div className="pb-6">
                  <p className="text-sm font-medium text-gray-800">{step.title}</p>
                  {step.imageUrl && (
                    <img
                      alt={`Step ${step.order}`}
                      className="mt-2 rounded-lg object-cover"
                      src={step.imageUrl}
                      style={{ maxHeight: 140 }}
                    />
                  )}
                  {step.videoUrl && (
                    <a
                      className="mt-2 flex items-center gap-1 text-xs text-indigo-600 hover:underline"
                      href={step.videoUrl}
                      rel="noreferrer"
                      target="_blank"
                    >
                      <svg className="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M8 5v14l11-7z" />
                      </svg>
                      Watch video
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-center text-sm text-gray-500">No steps available.</p>
        )}
      </div>
    </div>
  </div>
);

interface MarkDoneModalProps {
  item: Work;
  updatedBy: string;
  facilityCode: string;
  onClose: () => void;
  onSuccess: () => void;
  dispatch: any;
}

const MarkDoneModal = ({ item, updatedBy, facilityCode, onClose, onSuccess, dispatch }: MarkDoneModalProps) => {
  const [actionNotes, setActionNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSubmit = () => {
    if (!actionNotes.trim()) {
      toast.error('Please describe the action taken.');
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
        updatedBy,
        actionTaken: actionNotes.trim(),
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
            laneId: item.laneId || 0,
            notes: actionNotes.trim(),
            ...(item.frequency ? { frequency: item.frequency } : {}),
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
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-green-100">
              <svg className="h-4 w-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} />
              </svg>
            </div>
            <p className="text-base font-bold text-gray-900">Mark as Done</p>
          </div>
          <button className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700" type="button" onClick={onClose}>
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path d="M6 18L18 6M6 6l12 12" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} />
            </svg>
          </button>
        </div>

        {/* Task details */}
        <div className="px-6 pt-4">
          <div className="rounded-xl border border-gray-100 bg-gray-50 p-4">
            <p className="text-sm font-semibold text-gray-900">{item.title}</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {item.category && (
                <span className="rounded-full bg-yellow-100 px-2.5 py-0.5 text-xs font-medium text-yellow-700 capitalize">{item.category}</span>
              )}
              {item.frequency && (
                <span className="rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-700 capitalize">{item.frequency}</span>
              )}
              {item.laneId && (
                <span className="rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-medium text-blue-600">Lane {item.laneId}</span>
              )}
              {item.priority && (
                <span className="rounded-full bg-red-50 px-2.5 py-0.5 text-xs font-medium text-red-600 capitalize">{item.priority} priority</span>
              )}
            </div>
            {item.notes && <p className="mt-2 text-xs text-gray-500">{item.notes}</p>}
          </div>
        </div>

        {/* Action notes */}
        <div className="px-6 py-4">
          <label className="mb-1.5 block text-xs font-medium text-gray-600" htmlFor="action-notes">
            What action was taken? <span className="text-red-500">*</span>
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

        {/* Footer */}
        <div className="flex justify-end gap-2 border-t border-gray-100 px-6 py-4">
          <button className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50" disabled={saving} type="button" onClick={onClose}>
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

interface FlagIssueModalProps {
  item: Work;
  facilityCode: string;
  updatedBy: string;
  onClose: () => void;
  onSuccess: () => void;
  dispatch: any;
}

type RaisedBy = 'centre_staff' | 'noc' | 'admin';
type AssignedTo = 'centre_staff' | 'noc' | 'others';
type IssuePriority = 'high' | 'medium' | 'low';

const toggleCls = (active: boolean) =>
  `rounded-lg border px-4 py-2 text-sm font-medium transition-colors ${active ? 'border-transparent bg-[#21295A] text-white' : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'}`;

const FlagIssueModal = ({ item, facilityCode, updatedBy, onClose, onSuccess, dispatch }: FlagIssueModalProps) => {
  const [issueTitle, setIssueTitle] = useState('');
  const [description, setDescription] = useState('');
  const [raisedBy, setRaisedBy] = useState<RaisedBy>('centre_staff');
  const [raisedByName, setRaisedByName] = useState('');
  const [assignedTo, setAssignedTo] = useState<AssignedTo>('centre_staff');
  const [priority, setPriority] = useState<IssuePriority>('medium');
  const [saving, setSaving] = useState(false);

  const categoryLabel = item.category
    ? `Maintenance – ${item.category.charAt(0).toUpperCase() + item.category.slice(1)}`
    : 'Maintenance';

  const handleSubmit = () => {
    if (!issueTitle.trim()) {
      toast.error('Issue title is required.');
      return;
    }
    setSaving(true);
    const lastCompletedAt = new Date().toISOString().replace(/\.(\d{3})Z$/, '.$1000+00:00');

    const issuePayload = {
      facilityCode,
      type: 'issue' as const,
      title: issueTitle.trim(),
      category: item.category || '',
      priority,
      laneId: item.laneId || 0,
      notes: description.trim(),
      raisedBy,
      assignedTo,
      ...(raisedByName.trim() ? { raisedByName: raisedByName.trim() } : {}),
    };

    // 1. Update task status to 'issue' with all mark-done fields
    dispatch(
      updateWork({
        itemId: item.itemId,
        status: 'issue',
        lastCompletedAt,
        updatedBy,
        actionTaken: description.trim(),
      })
    )
      .unwrap()
      // 2. Create the issue record
      .then(() => dispatch(createWork(issuePayload)).unwrap())
      // 3. Create the log record
      .then(() =>
        dispatch(
          createWork({ ...issuePayload, type: 'log', status: 'issue' })
        ).unwrap()
      )
      .then(() => {
        toast.success('Issue raised, task updated and log created!');
        onSuccess();
        onClose();
      })
      .catch((err: any) => toast.error(err || 'Failed to raise issue.'))
      .finally(() => setSaving(false));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-gray-100 px-6 py-4">
          <div>
            <p className="text-base font-bold text-gray-900">Flag Issue</p>
            <p className="mt-0.5 text-sm text-gray-400">
              {item.title}{item.laneId ? ` · Lane ${item.laneId}` : ''}
            </p>
          </div>
          <button className="ml-4 rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700" type="button" onClick={onClose}>
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path d="M6 18L18 6M6 6l12 12" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto px-6 py-5">
          {/* Category */}
          <div className="mb-5 flex items-center gap-3">
            <span className="text-sm text-gray-500">Category:</span>
            <span className="rounded-full bg-amber-600 px-3 py-1 text-xs font-semibold text-white">{categoryLabel}</span>
          </div>

          {/* Issue title */}
          <div className="mb-4">
            <label className="mb-1.5 block text-sm font-semibold text-gray-800" htmlFor="issue-title">
              Issue title <span className="text-red-500">*</span>
            </label>
            <input
              className={inputCls}
              id="issue-title"
              placeholder="Describe the issue..."
              type="text"
              value={issueTitle}
              onChange={e => setIssueTitle(e.target.value)}
            />
          </div>

          {/* Description */}
          <div className="mb-5">
            <label className="mb-1.5 block text-sm font-semibold text-gray-800" htmlFor="issue-description">Description</label>
            <textarea
              className={inputCls}
              id="issue-description"
              placeholder="Additional details..."
              rows={4}
              value={description}
              onChange={e => setDescription(e.target.value)}
            />
          </div>

          {/* Raised by */}
          <div className="mb-5">
            <p className="mb-2 text-sm font-semibold text-gray-800">Raised by</p>
            <div className="flex gap-2">
              {(['centre_staff', 'noc', 'admin'] as RaisedBy[]).map(opt => (
                <button key={opt} className={toggleCls(raisedBy === opt)} type="button" onClick={() => setRaisedBy(opt)}>
                  {opt === 'centre_staff' ? 'Centre Staff' : opt === 'noc' ? 'NOC' : 'Admin'}
                </button>
              ))}
            </div>
            <input
              className={`${inputCls} mt-3`}
              id="raised-by-name"
              placeholder="Name (optional)..."
              type="text"
              value={raisedByName}
              onChange={e => setRaisedByName(e.target.value)}
            />
          </div>

          {/* Assign to team */}
          <div className="mb-5">
            <p className="mb-2 text-sm font-semibold text-gray-800">Assign to team</p>
            <div className="flex gap-2">
              {(['centre_staff', 'noc', 'others'] as AssignedTo[]).map(opt => (
                <button key={opt} className={toggleCls(assignedTo === opt)} type="button" onClick={() => setAssignedTo(opt)}>
                  {opt === 'centre_staff' ? 'Centre Staff' : opt === 'noc' ? 'NOC' : 'Others'}
                </button>
              ))}
            </div>
          </div>

          {/* Priority */}
          <div className="mb-5">
            <p className="mb-2 text-sm font-semibold text-gray-800">Priority</p>
            <div className="flex gap-2">
              {([
                { key: 'high', dot: 'bg-red-500', label: 'High' },
                { key: 'medium', dot: 'bg-orange-400', label: 'Medium' },
                { key: 'low', dot: 'bg-green-500', label: 'Low' },
              ] as { key: IssuePriority; dot: string; label: string }[]).map(opt => (
                <button
                  key={opt.key}
                  className={`flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium transition-colors ${priority === opt.key ? 'border-transparent bg-[#21295A] text-white' : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'}`}
                  type="button"
                  onClick={() => setPriority(opt.key)}
                >
                  <span className={`h-2.5 w-2.5 rounded-full ${opt.dot}`} />
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Attachments */}
          <div>
            <p className="mb-2 text-sm font-semibold text-gray-800">Attachments</p>
            <label
              className="flex w-fit cursor-pointer items-center gap-2 rounded-lg border border-dashed border-gray-300 px-4 py-2 text-sm text-gray-500 hover:border-gray-400 hover:text-gray-700"
              htmlFor="issue-file"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} />
              </svg>
              Attach file
            </label>
            <input className="hidden" id="issue-file" multiple={true} type="file" />
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 border-t border-gray-100 px-6 py-4">
          <button className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50" disabled={saving} type="button" onClick={onClose}>
            Cancel
          </button>
          <button
            className="rounded-lg bg-red-600 px-5 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50"
            disabled={saving}
            type="button"
            onClick={handleSubmit}
          >
            {saving ? 'Raising...' : 'Raise Issue'}
          </button>
        </div>
      </div>
    </div>
  );
};

interface ScheduleModalProps {
  item: Work;
  onClose: () => void;
  onSuccess: () => void;
  dispatch: any;
}

const ScheduleModal = ({ item, onClose, onSuccess, dispatch }: ScheduleModalProps) => {
  const [scheduledDate, setScheduledDate] = useState(item.scheduledDate || '');
  const [saving, setSaving] = useState(false);

  const handleSubmit = () => {
    if (!scheduledDate) {
      toast.error('Please select a date.');
      return;
    }
    setSaving(true);
    dispatch(updateWork({ itemId: item.itemId, scheduledDate } as UpdateWorkRequest))
      .unwrap()
      .then(() => {
        toast.success('Task scheduled successfully!');
        onSuccess();
        onClose();
      })
      .catch((err: any) => {
        toast.error(err || 'Failed to schedule task.');
      })
      .finally(() => setSaving(false));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <p className="text-base font-bold text-gray-900">Schedule Task</p>
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

        {/* Body */}
        <div className="px-6 py-5">
          {/* Task summary */}
          <div className="mb-5 rounded-xl border border-gray-100 bg-gray-50 p-4">
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
              {item.laneId && (
                <span className="rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-medium text-blue-600">
                  Lane {item.laneId}
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

          {/* Currently scheduled banner */}
          {item.scheduledDate && (
            <div className="mb-4 flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 px-3 py-2">
              <svg className="h-4 w-4 shrink-0 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                />
              </svg>
              <p className="text-xs text-green-700">
                Currently scheduled for{' '}
                <span className="font-semibold">
                  {new Date(item.scheduledDate).toLocaleDateString('en-US', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                  })}
                </span>
              </p>
            </div>
          )}

          {/* Date picker */}
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

        {/* Footer */}
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
            className="flex items-center gap-1.5 rounded-lg bg-[#21295A] px-5 py-2 text-sm font-semibold text-white hover:bg-[#1a2149] disabled:opacity-50"
            disabled={saving}
            type="button"
            onClick={handleSubmit}
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
              />
            </svg>
            {saving ? 'Scheduling...' : 'Confirm Schedule'}
          </button>
        </div>
      </div>
    </div>
  );
};

type Tab = 'task' | 'issue' | 'log' | 'schedule';
type TaskFrequency = 'weekly' | 'bi-weekly' | 'monthly';

const inputCls =
  'w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700 focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-200';

interface AddTaskModalProps {
  onClose: () => void;
  onSuccess: () => void;
  dispatch: any;
}

const emptyStep = (order: number) => ({
  stepId: `step_${String(order).padStart(3, '0')}`,
  order,
  title: '',
  imageUrl: '',
  videoUrl: '',
});

type AddTaskForm = Omit<CreateWorkRequest, 'facilityCode' | 'type' | 'steps'> & {
  steps: { stepId: string; order: number; title: string; imageUrl: string; videoUrl: string }[];
};

const ALL_LANES = [1, 2, 3, 4, 5, 6, 7];

const AddTaskModal = ({ onClose, onSuccess, dispatch }: AddTaskModalProps) => {
  const [form, setForm] = useState<AddTaskForm>({
    title: '',
    category: '',
    frequency: 'weekly',
    priority: 'medium',
    laneId: 1,
    notes: '',
    steps: [emptyStep(1)],
  });
  const [selectedLanes, setSelectedLanes] = useState<number[]>([]);
  const [saving, setSaving] = useState(false);

  const setField = (key: string, value: any) => setForm(prev => ({ ...prev, [key]: value }));

  const toggleLane = (lane: number) =>
    setSelectedLanes(prev =>
      prev.includes(lane) ? prev.filter(l => l !== lane) : [...prev, lane]
    );

  const toggleAll = () =>
    setSelectedLanes(prev => (prev.length === ALL_LANES.length ? [] : [...ALL_LANES]));

  const addStep = () => setForm(prev => ({ ...prev, steps: [...prev.steps, emptyStep(prev.steps.length + 1)] }));

  const removeStep = (index: number) =>
    setForm(prev => ({
      ...prev,
      steps: prev.steps
        .filter((_, i) => i !== index)
        .map((s, i) => ({ ...s, order: i + 1, stepId: `step_${String(i + 1).padStart(3, '0')}` })),
    }));

  const updateStep = (index: number, key: string, value: string) =>
    setForm(prev => ({
      ...prev,
      steps: prev.steps.map((s, i) => (i === index ? { ...s, [key]: value } : s)),
    }));

  const handleSubmit = async () => {
    if (!form.title.trim() || !form.category || !form.frequency) {
      toast.error('Title, category and frequency are required.');
      return;
    }
    if (selectedLanes.length === 0) {
      toast.error('Please select at least one lane.');
      return;
    }
    setSaving(true);
    const steps = form.steps.map(s => ({
      ...s,
      imageUrl: s.imageUrl || null,
      videoUrl: s.videoUrl || null,
    }));
    Promise.all(
      selectedLanes.map(laneId =>
        dispatch(
          createWork({ facilityCode: 'HOU01', type: 'task', ...form, laneId, steps } as CreateWorkRequest)
        ).unwrap()
      )
    )
      .then(() => {
        toast.success(
          selectedLanes.length > 1
            ? `${selectedLanes.length} tasks created (one per lane)!`
            : 'Task created successfully!'
        );
        onSuccess();
        onClose();
      })
      .catch((err: any) => {
        console.error(err);
        toast.error(err || 'Failed to create task.');
      })
      .finally(() => setSaving(false));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <p className="text-base font-bold text-gray-900">Add Task</p>
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

        {/* Body */}
        <div className="overflow-y-auto px-6 py-5">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="mb-1 block text-xs font-medium text-gray-600" htmlFor="task-title">
                Title <span className="text-red-500">*</span>
              </label>
              <input
                className={inputCls}
                id="task-title"
                placeholder="Enter task title"
                type="text"
                value={form.title}
                onChange={e => setField('title', e.target.value)}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600" htmlFor="task-category">
                Category <span className="text-red-500">*</span>
              </label>
              <select
                className={inputCls}
                id="task-category"
                value={form.category}
                onChange={e => setField('category', e.target.value)}
              >
                <option value="">Select category</option>
                <option value="machine">Machine</option>
                <option value="facility">Facility</option>
                <option value="equipment">Equipment</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600" htmlFor="task-frequency">
                Frequency <span className="text-red-500">*</span>
              </label>
              <select
                className={inputCls}
                id="task-frequency"
                value={form.frequency}
                onChange={e => setField('frequency', e.target.value)}
              >
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="bi-weekly">Bi-Weekly</option>
                <option value="monthly">Monthly</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600" htmlFor="task-priority">
                Priority
              </label>
              <select
                className={inputCls}
                id="task-priority"
                value={form.priority}
                onChange={e => setField('priority', e.target.value)}
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>
            <div className="sm:col-span-2">
              <p className="mb-2 text-xs font-medium text-gray-600">
                Lanes <span className="text-red-500">*</span>
                {selectedLanes.length > 0 && (
                  <span className="ml-2 font-normal text-gray-400">
                    ({selectedLanes.length === ALL_LANES.length ? 'All lanes' : `${selectedLanes.length} selected`} — {selectedLanes.length} task{selectedLanes.length > 1 ? 's' : ''} will be created)
                  </span>
                )}
              </p>
              <div className="flex flex-wrap gap-2">
                <button
                  className={`rounded-full px-3 py-1 text-xs font-semibold transition-all ${selectedLanes.length === ALL_LANES.length ? 'bg-[#21295A] text-white' : 'border border-gray-200 text-gray-500 hover:border-gray-400 hover:text-gray-700'}`}
                  type="button"
                  onClick={toggleAll}
                >
                  All
                </button>
                {ALL_LANES.map(lane => (
                  <button
                    key={lane}
                    className={`rounded-full px-3 py-1 text-xs font-semibold transition-all ${selectedLanes.includes(lane) ? 'bg-[#21295A] text-white' : 'border border-gray-200 text-gray-500 hover:border-gray-400 hover:text-gray-700'}`}
                    type="button"
                    onClick={() => toggleLane(lane)}
                  >
                    Lane {lane}
                  </button>
                ))}
              </div>
            </div>
            <div className="sm:col-span-2">
              <label className="mb-1 block text-xs font-medium text-gray-600" htmlFor="task-notes">
                Notes
              </label>
              <textarea
                className={inputCls}
                id="task-notes"
                placeholder="Add notes..."
                rows={2}
                value={form.notes}
                onChange={e => setField('notes', e.target.value)}
              />
            </div>
          </div>

          {/* Steps */}
          <div className="mt-5">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-sm font-semibold text-gray-800">Steps</p>
              <button
                className="flex items-center gap-1 rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-1 text-xs font-medium text-indigo-600 hover:bg-indigo-100"
                type="button"
                onClick={addStep}
              >
                + Add Step
              </button>
            </div>
            <div className="flex flex-col gap-4">
              {form.steps.map((step, index) => (
                <div key={step.stepId} className="relative rounded-xl border border-gray-100 bg-gray-50 p-4">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#21295A] text-xs font-bold text-white">
                      {step.order}
                    </span>
                    {form.steps.length > 1 && (
                      <button
                        className="text-xs text-red-400 hover:text-red-600"
                        type="button"
                        onClick={() => removeStep(index)}
                      >
                        Remove
                      </button>
                    )}
                  </div>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div className="sm:col-span-2">
                      <label className="mb-1 block text-xs font-medium text-gray-600" htmlFor={`step-title-${index}`}>
                        Step Title
                      </label>
                      <input
                        className={inputCls}
                        id={`step-title-${index}`}
                        placeholder="Step description"
                        type="text"
                        value={step.title}
                        onChange={e => updateStep(index, 'title', e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-medium text-gray-600" htmlFor={`step-image-${index}`}>
                        Image URL
                      </label>
                      <input
                        className={inputCls}
                        id={`step-image-${index}`}
                        placeholder="https://..."
                        type="text"
                        value={step.imageUrl || ''}
                        onChange={e => updateStep(index, 'imageUrl', e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-medium text-gray-600" htmlFor={`step-video-${index}`}>
                        Video URL
                      </label>
                      <input
                        className={inputCls}
                        id={`step-video-${index}`}
                        placeholder="https://..."
                        type="text"
                        value={step.videoUrl || ''}
                        onChange={e => updateStep(index, 'videoUrl', e.target.value)}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
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
            className="rounded-lg bg-[#21295A] px-5 py-2 text-sm font-semibold text-white hover:bg-[#1a2149] disabled:opacity-50"
            disabled={saving}
            type="button"
            onClick={handleSubmit}
          >
            {saving ? 'Saving...' : 'Create Task'}
          </button>
        </div>
      </div>
    </div>
  );
};

const tabs: { key: Tab; label: string }[] = [
  { key: 'issue', label: 'Issue' },
  { key: 'log', label: 'Log' },
  { key: 'schedule', label: 'Schedule' },
];

const taskFrequencies: { key: TaskFrequency; label: string }[] = [
  { key: 'weekly', label: 'Weekly' },
  { key: 'bi-weekly', label: 'Bi-Weekly' },
  { key: 'monthly', label: 'Monthly' },
];

const FACILITY_CODE = 'HOU01';

const Maintenance = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { workList, isLoading } = useSelector((state: RootState) => state.maintenance);
  const currentUserId = useSelector((state: RootState) => state.auth.loginResponse?.data?.user?.userId ?? '');

  const toDateStr = (d: Date) => d.toISOString().split('T')[0];

  const today = toDateStr(new Date());
  const sevenDaysLater = toDateStr(new Date(Date.now() + 6 * 24 * 60 * 60 * 1000));

  const [activeTab, setActiveTab] = useState<Tab>('task');
  const [taskFrequency, setTaskFrequency] = useState<TaskFrequency>('weekly');
  const [selectedLane, setSelectedLane] = useState<number>(1);
  const [selectedScheduleDate, setSelectedScheduleDate] = useState<string>(today);
  const [allScheduleItems, setAllScheduleItems] = useState<Work[]>([]);
  const [selectedItem, setSelectedItem] = useState<Work | null>(null);
  const [schedulingItem, setSchedulingItem] = useState<Work | null>(null);
  const [markDoneItem, setMarkDoneItem] = useState<Work | null>(null);
  const [flagIssueItem, setFlagIssueItem] = useState<Work | null>(null);
  const [showAddTask, setShowAddTask] = useState(false);

  const fetchList = (
    type: Tab,
    frequency: TaskFrequency,
    page = 1,
    limit = workList.limit || 20,
    lane = selectedLane,
    scheduleDate = selectedScheduleDate
  ) => {
    if (type === 'schedule') {
      if (scheduleDate === 'overdue') {
        const yesterday = toDateStr(new Date(Date.now() - 24 * 60 * 60 * 1000));
        dispatch(
          getWorkList({
            facilityCode: FACILITY_CODE,
            page,
            limit,
            type: 'task',
            toDate: yesterday,
          })
        );
      } else {
        dispatch(
          getWorkList({
            facilityCode: FACILITY_CODE,
            page,
            limit,
            type: 'task',
            fromDate: scheduleDate,
            toDate: scheduleDate,
          })
        );
      }
    } else {
      dispatch(
        getWorkList({
          facilityCode: FACILITY_CODE,
          page,
          limit,
          type,
          ...(type === 'task' && { frequency, laneId: lane }),
        })
      );
    }
  };

  // Non-schedule tabs + overdue: re-fetch on filter change
  useEffect(() => {
    if (activeTab !== 'schedule') {
      fetchList(activeTab, taskFrequency, 1, workList.limit || 20, selectedLane);
    } else if (selectedScheduleDate === 'overdue') {
      const yesterday = toDateStr(new Date(Date.now() - 24 * 60 * 60 * 1000));
      dispatch(getWorkList({ facilityCode: FACILITY_CODE, page: 1, limit: 100, type: 'task', toDate: yesterday }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, taskFrequency, selectedLane, selectedScheduleDate]);

  // Schedule tab: fetch full 7-day range once when tab activates, filter client-side
  useEffect(() => {
    if (activeTab === 'schedule') {
      dispatch(
        getWorkList({
          facilityCode: FACILITY_CODE,
          page: 1,
          limit: 100,
          type: 'task',
          fromDate: today,
          toDate: sevenDaysLater,
        })
      ).then((result: any) => {
        const data = result.payload?.data;
        setAllScheduleItems(Array.isArray(data) ? data : data?.items || []);
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  // Count per day from the pre-fetched 7-day data (for badge counts in strip)
  const scheduleCountByDate = allScheduleItems.reduce<Record<string, number>>((acc, item) => {
    if (item.scheduledDate) acc[item.scheduledDate] = (acc[item.scheduledDate] || 0) + 1;
    return acc;
  }, {});

  // Items to show in schedule cards: filtered locally, or overdue from workList
  const scheduleDisplayItems =
    selectedScheduleDate === 'overdue'
      ? workList.items || []
      : allScheduleItems.filter(item => item.scheduledDate === selectedScheduleDate);

  // Re-fetch the full 7-day range and update allScheduleItems
  const refreshSchedule = () => {
    if (selectedScheduleDate === 'overdue') {
      const yesterday = toDateStr(new Date(Date.now() - 24 * 60 * 60 * 1000));
      dispatch(getWorkList({ facilityCode: FACILITY_CODE, page: 1, limit: 100, type: 'task', toDate: yesterday }));
    } else {
      dispatch(
        getWorkList({ facilityCode: FACILITY_CODE, page: 1, limit: 100, type: 'task', fromDate: today, toDate: sevenDaysLater })
      ).then((result: any) => {
        const data = result.payload?.data;
        setAllScheduleItems(Array.isArray(data) ? data : (data?.items || []));
      });
    }
  };

  const snoColumn: ColumnDef = {
    field: 'sno',
    headerName: 'S.No',
    width: 70,
    sortable: false,
    renderCell: (params: any) => {
      const currentPage = workList.page || 1;
      const limit = workList.limit || 20;
      return (currentPage - 1) * limit + (params.index || 0) + 1;
    },
  };

  const statusRenderCell = (params: any) => {
    const s = params.row?.status || '';
    const map: Record<string, string> = {
      pending: 'bg-yellow-100 text-yellow-700',
      completed: 'bg-green-100 text-green-700',
      inprogress: 'bg-blue-100 text-blue-700',
      open: 'bg-red-100 text-red-700',
      closed: 'bg-gray-100 text-gray-600',
      cancelled: 'bg-red-100 text-red-700',
    };
    const cls = map[s] || 'bg-gray-100 text-gray-600';
    return <span className={`rounded-full px-3 py-1 text-xs font-semibold capitalize ${cls}`}>{s}</span>;
  };

  const priorityRenderCell = (params: any) => {
    const p = params.row?.priority || '';
    const map: Record<string, string> = {
      high: 'bg-red-100 text-red-700',
      medium: 'bg-yellow-100 text-yellow-700',
      low: 'bg-green-100 text-green-700',
    };
    const cls = map[p] || 'bg-gray-100 text-gray-600';
    return <span className={`rounded-full px-3 py-1 text-xs font-semibold capitalize ${cls}`}>{p || '-'}</span>;
  };

  const taskColumns: ColumnDef[] = [
    snoColumn,
    { field: 'title', headerName: 'Title', flex: 2, sortable: true, valueGetter: params => params.row?.title || '-' },
    {
      field: 'category',
      headerName: 'Category',
      flex: 1,
      sortable: true,
      valueGetter: params => params.row?.category || '-',
    },
    {
      field: 'frequency',
      headerName: 'Frequency',
      flex: 1,
      sortable: true,
      valueGetter: params => params.row?.frequency || '-',
    },
    {
      field: 'laneId',
      headerName: 'Lane',
      width: 80,
      sortable: true,
      valueGetter: params => params.row?.laneId ?? '-',
    },
    {
      field: 'steps',
      headerName: 'Steps',
      width: 80,
      sortable: false,
      valueGetter: params => params.row?.steps?.length ?? 0,
    },
    { field: 'priority', headerName: 'Priority', flex: 1, sortable: true, renderCell: priorityRenderCell },
    { field: 'status', headerName: 'Status', flex: 1, sortable: true, renderCell: statusRenderCell },
  ];

  const issueColumns: ColumnDef[] = [
    snoColumn,
    { field: 'title', headerName: 'Title', flex: 2, sortable: true, valueGetter: params => params.row?.title || '-' },
    {
      field: 'category',
      headerName: 'Category',
      flex: 1,
      sortable: true,
      valueGetter: params => params.row?.category || '-',
    },
    {
      field: 'laneId',
      headerName: 'Lane',
      width: 80,
      sortable: true,
      valueGetter: params => params.row?.laneId ?? '-',
    },
    { field: 'priority', headerName: 'Priority', flex: 1, sortable: true, renderCell: priorityRenderCell },
    { field: 'status', headerName: 'Status', flex: 1, sortable: true, renderCell: statusRenderCell },
    { field: 'notes', headerName: 'Notes', flex: 2, sortable: false, valueGetter: params => params.row?.notes || '-' },
  ];

  const logColumns: ColumnDef[] = [
    {
      field: 'title',
      headerName: 'Task',
      flex: 2,
      sortable: true,
      renderCell: (params: any) => (
        <span className="font-semibold text-gray-900">{params.row?.title || '-'}</span>
      ),
    },
    {
      field: 'laneId',
      headerName: 'Lane',
      flex: 1,
      sortable: true,
      valueGetter: params => (params.row?.laneId ? `Lane ${params.row.laneId}` : '-'),
    },
    {
      field: 'frequency',
      headerName: 'Frequency',
      flex: 1,
      sortable: true,
      valueGetter: params => {
        const f = params.row?.frequency;
        return f ? f.charAt(0).toUpperCase() + f.slice(1) : '-';
      },
    },
    {
      field: 'status',
      headerName: 'Action',
      flex: 1,
      sortable: false,
      renderCell: (params: any) => {
        const s = params.value || params.row?.status;
        if (s === 'completed' || s === 'done') {
          return (
            <span className="flex items-center gap-1 font-semibold text-green-600">
              <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} />
              </svg>
              Done
            </span>
          );
        }
        if (s === 'issue') {
          return (
            <span className="flex items-center gap-1 font-semibold text-red-500">
              <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path d="M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-3 6 3 6H11.5l-1-1H5v4m0-4h14" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} />
              </svg>
              Issue
            </span>
          );
        }
        return <span className="capitalize text-gray-500">{s || '-'}</span>;
      },
    },
    {
      field: 'createdBy',
      headerName: 'Created By',
      flex: 1,
      sortable: true,
      valueGetter: params => params.row?.createdBy || '-',
    },
    {
      field: 'createdAt',
      headerName: 'Date & Time',
      flex: 1.5,
      sortable: true,
      valueGetter: params => {
        if (!params.row?.createdAt) return '-';
        return new Date(params.row.createdAt).toLocaleString('en-US', {
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
          month: 'short',
        });
      },
    },
  ];

  const scheduleColumns: ColumnDef[] = [
    snoColumn,
    { field: 'title', headerName: 'Title', flex: 2, sortable: true, valueGetter: params => params.row?.title || '-' },
    {
      field: 'category',
      headerName: 'Category',
      flex: 1,
      sortable: true,
      valueGetter: params => params.row?.category || '-',
    },
    {
      field: 'frequency',
      headerName: 'Frequency',
      flex: 1,
      sortable: true,
      valueGetter: params => params.row?.frequency || '-',
    },
    {
      field: 'scheduledDate',
      headerName: 'Scheduled Date',
      flex: 1.2,
      sortable: true,
      valueGetter: params => params.row?.scheduledDate || '-',
    },
    {
      field: 'laneId',
      headerName: 'Lane',
      width: 80,
      sortable: true,
      valueGetter: params => params.row?.laneId ?? '-',
    },
    { field: 'status', headerName: 'Status', flex: 1, sortable: true, renderCell: statusRenderCell },
  ];

  const columnsMap: Record<Tab, ColumnDef[]> = {
    task: taskColumns,
    issue: issueColumns,
    log: logColumns,
    schedule: scheduleColumns,
  };

  const columns = columnsMap[activeTab];

  return (
    <>
      <div className="w-full max-w-full">
        <SectionTitle
          actionButtonLabel="Add Task"
          description="Manage facility maintenance tasks and schedules."
          inputPlaceholder=""
          search={false}
          title="Maintenance"
          value=""
          onActionButtonClick={() => setShowAddTask(true)}
        />

        <div className="rounded-2xl border border-gray-100 bg-white shadow-sm">
          {/* Tabs + Frequency toggle */}
          <div className="border-b border-gray-200 px-6">
            <div className="flex items-center justify-between">
              <div className="flex gap-6">
                {tabs.map(tab => (
                  <button
                    key={tab.key}
                    className={`relative pb-3 pt-4 text-sm transition-colors ${
                      activeTab === tab.key
                        ? 'font-bold text-[#21295A]'
                        : 'font-medium text-gray-400 hover:text-gray-600'
                    }`}
                    type="button"
                    onClick={() => setActiveTab(tab.key)}
                  >
                    {tab.label}
                    {activeTab === tab.key && (
                      <span className="absolute bottom-0 left-0 h-0.5 w-full rounded-full bg-[#21295A]" />
                    )}
                  </button>
                ))}
              </div>

              <div className="flex items-center rounded-xl border border-gray-200 bg-gray-50 p-1">
                {taskFrequencies.map(f => (
                  <button
                    key={f.key}
                    className={`rounded-lg px-4 py-1.5 text-sm font-medium transition-all duration-200 ${
                      taskFrequency === f.key
                        ? 'bg-white text-[#21295A] shadow-sm'
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
                    type="button"
                    onClick={() => {
                      setTaskFrequency(f.key);
                      setActiveTab('task');
                    }}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* 7-day strip — schedule tab only */}
          {activeTab === 'schedule' && (
            <div className="overflow-x-auto border-b border-gray-200 px-6">
              <div className="flex">
                {Array.from({ length: 7 }, (_, i) => {
                  const d = new Date(Date.now() + i * 24 * 60 * 60 * 1000);
                  const dateStr = toDateStr(d);
                  const isSelected = selectedScheduleDate === dateStr;
                  const dayLabel =
                    i === 0 ? 'Today' : i === 1 ? 'Tomorrow' : d.toLocaleDateString('en-US', { weekday: 'short' });
                  return (
                    <button
                      key={dateStr}
                      className="relative flex shrink-0 flex-col items-center px-6 pb-3 pt-3 text-center transition-colors"
                      type="button"
                      onClick={() => setSelectedScheduleDate(dateStr)}
                    >
                      <span
                        className={`text-sm font-bold ${isSelected ? 'text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
                      >
                        {dayLabel}
                      </span>
                      <span className="text-xs text-gray-400">
                        {d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </span>
                      {scheduleCountByDate[dateStr] > 0 ? (
                        <span className="mt-1 flex h-5 w-5 items-center justify-center rounded-full bg-[#21295A] text-[10px] font-bold text-white">
                          {scheduleCountByDate[dateStr] > 9 ? '9+' : scheduleCountByDate[dateStr]}
                        </span>
                      ) : (
                        <span className="mt-1 h-5" />
                      )}
                      {isSelected && <span className="absolute bottom-0 left-0 h-0.5 w-full bg-[#21295A]" />}
                    </button>
                  );
                })}
                {/* Overdue tab */}
                {(() => {
                  const isSelected = selectedScheduleDate === 'overdue';
                  return (
                    <button
                      className="relative flex shrink-0 flex-col items-center px-6 pb-3 pt-3 text-center transition-colors"
                      type="button"
                      onClick={() => setSelectedScheduleDate('overdue')}
                    >
                      <span
                        className={`text-sm font-bold ${isSelected ? 'text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
                      >
                        Overdue
                      </span>
                      <span className="text-xs text-gray-400">Past due</span>
                      {isSelected && workList.total > 0 && (
                        <span className="mt-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
                          {workList.total > 9 ? '9+' : workList.total}
                        </span>
                      )}
                      {!isSelected && <span className="mt-1 h-5" />}
                      {isSelected && <span className="absolute bottom-0 left-0 h-0.5 w-full bg-[#21295A]" />}
                    </button>
                  );
                })()}
              </div>
            </div>
          )}

          {/* Content */}
          <div className="p-4">
            {/* Lane filter — task tab only */}
            {activeTab === 'task' && (
              <div className="mb-4 flex flex-wrap gap-2">
                {Array.from({ length: 7 }, (_, i) => i + 1).map(lane => (
                  <button
                    key={lane}
                    className={`rounded-lg px-4 py-1.5 text-sm font-medium transition-all ${
                      selectedLane === lane
                        ? 'bg-[#21295A] text-white shadow-sm'
                        : 'border border-gray-200 bg-white text-gray-500 hover:border-gray-300 hover:text-gray-700'
                    }`}
                    type="button"
                    onClick={() => setSelectedLane(lane)}
                  >
                    Lane {lane}
                  </button>
                ))}
              </div>
            )}

            {activeTab === 'task' ? (
              isLoading ? (
                <div className="flex items-center justify-center py-16 text-gray-400">Loading...</div>
              ) : (workList.items || []).length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <svg className="mb-3 h-12 w-12 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                    />
                    <path
                      d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                    />
                  </svg>
                  <p className="text-sm font-medium text-gray-500">No tasks found</p>
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  {(workList.items || []).map(item => (
                    <div
                      key={item.itemId}
                      className="flex items-start justify-between rounded-xl border border-blue-100 bg-white px-5 py-4 shadow-sm"
                    >
                      <div className="flex flex-col gap-2">
                        <p className="text-sm font-bold text-gray-900">{item.title}</p>
                        <div className="flex items-center gap-2">
                          {item.category && (
                            <span className="flex items-center gap-1 rounded-full bg-yellow-100 px-2.5 py-0.5 text-xs font-medium text-yellow-700">
                              <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path
                                  d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                />
                                <path
                                  d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                />
                              </svg>
                              {item.category.charAt(0).toUpperCase() + item.category.slice(1)}
                            </span>
                          )}
                          {item.frequency && (
                            <span className="rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-700">
                              {item.frequency.charAt(0).toUpperCase() + item.frequency.slice(1)}
                            </span>
                          )}
                          {item.laneId && (
                            <span className="rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-medium text-blue-600">
                              Lane {item.laneId}
                            </span>
                          )}
                        </div>
                        {item.notes && <p className="text-xs text-gray-500">{item.notes}</p>}
                        {(item.lastCompletedAt || item.nextDueDate) && (
                          <div className="flex flex-wrap gap-3">
                            {item.lastCompletedAt && (
                              <span className="flex items-center gap-1 text-xs text-gray-400">
                                <svg
                                  className="h-3 w-3 text-green-500"
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  <path
                                    d="M5 13l4 4L19 7"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2.5}
                                  />
                                </svg>
                                Last done:{' '}
                                <span className="font-medium text-gray-600">
                                  {new Date(item.lastCompletedAt).toLocaleString('en-US', {
                                    day: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit',
                                    month: 'short',
                                    year: 'numeric',
                                  })}
                                </span>
                              </span>
                            )}
                            {item.nextDueDate && (
                              <span className="flex items-center gap-1 text-xs text-gray-400">
                                <svg
                                  className="h-3 w-3 text-indigo-500"
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  <path
                                    d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                  />
                                </svg>
                                Next due:{' '}
                                <span className="font-medium text-gray-600">
                                  {new Date(item.nextDueDate).toLocaleDateString('en-US', {
                                    day: 'numeric',
                                    month: 'short',
                                    year: 'numeric',
                                  })}
                                </span>
                              </span>
                            )}
                          </div>
                        )}
                        {item.actionTaken && (
                          <div className="flex items-start gap-1.5 rounded-lg bg-gray-50 px-3 py-2">
                            <svg className="mt-0.5 h-3.5 w-3.5 shrink-0 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} />
                            </svg>
                            <p className="text-xs text-gray-600">
                              <span className="font-medium">Action taken:</span> {item.actionTaken}
                            </p>
                          </div>
                        )}
                        {item.steps && item.steps.length > 0 && (
                          <button
                            className="flex items-center gap-1 text-xs font-medium text-indigo-600 hover:underline"
                            type="button"
                            onClick={() => setSelectedItem(item)}
                          >
                            <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path
                                d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                              />
                            </svg>
                            View steps &amp; video
                          </button>
                        )}
                      </div>
                      <button
                        className={`ml-4 flex shrink-0 flex-col items-center gap-0.5 rounded-lg px-4 py-2 text-xs font-semibold transition-colors ${
                          item.scheduledDate
                            ? 'border border-green-200 bg-green-50 text-green-700 hover:bg-green-100'
                            : 'bg-[#21295A] text-white hover:bg-[#1a2149]'
                        }`}
                        type="button"
                        onClick={() => setSchedulingItem(item)}
                      >
                        <span className="flex items-center gap-1.5">
                          <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path
                              d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                            />
                          </svg>
                          {item.scheduledDate ? 'Scheduled' : 'Schedule'}
                        </span>
                        {item.scheduledDate && (
                          <span className="text-[10px] font-normal text-green-600">
                            {new Date(item.scheduledDate).toLocaleDateString('en-US', {
                              day: 'numeric',
                              month: 'short',
                            })}
                          </span>
                        )}
                      </button>
                    </div>
                  ))}
                </div>
              )
            ) : activeTab === 'schedule' ? (
              isLoading ? (
                <div className="flex items-center justify-center py-16 text-gray-400">Loading...</div>
              ) : scheduleDisplayItems.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <svg className="mb-3 h-12 w-12 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                    />
                  </svg>
                  <p className="text-sm font-medium text-gray-500">No scheduled tasks found</p>
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  {scheduleDisplayItems.map(item => (
                    <div
                      key={item.itemId}
                      className="flex items-start justify-between rounded-xl border border-blue-100 bg-white px-5 py-4 shadow-sm"
                    >
                      {/* Left */}
                      <div className="flex flex-col gap-2">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-bold text-gray-900">{item.title}</p>
                          {item.laneId && (
                            <span className="rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-medium text-blue-600">
                              Lane {item.laneId}
                            </span>
                          )}
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          {item.category && (
                            <span className="flex items-center gap-1 rounded-full bg-yellow-100 px-2.5 py-0.5 text-xs font-medium text-yellow-700">
                              <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path
                                  d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                />
                                <path
                                  d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                />
                              </svg>
                              {item.category.charAt(0).toUpperCase() + item.category.slice(1)}
                            </span>
                          )}
                          {item.frequency && (
                            <span className="rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-700">
                              {item.frequency.charAt(0).toUpperCase() + item.frequency.slice(1)}
                            </span>
                          )}
                          {item.scheduledDate && (
                            <span className="flex items-center gap-1 rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs font-medium text-indigo-600">
                              <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path
                                  d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                />
                              </svg>
                              From{' '}
                              {new Date(item.scheduledDate).toLocaleDateString('en-US', {
                                month: 'short',
                                day: 'numeric',
                              })}
                            </span>
                          )}
                        </div>
                        {item.notes && <p className="text-xs text-gray-500">{item.notes}</p>}
                        {item.steps && item.steps.length > 0 && (
                          <button
                            className="flex items-center gap-1 text-xs font-medium text-indigo-600 hover:underline"
                            type="button"
                            onClick={() => setSelectedItem(item)}
                          >
                            <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path
                                d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                              />
                            </svg>
                            View steps &amp; video
                          </button>
                        )}
                      </div>

                      {/* Right actions */}
                      <div className="ml-6 flex shrink-0 flex-col gap-2">
                        <button
                          className="flex items-center gap-1.5 rounded-lg bg-green-500 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-green-600"
                          type="button"
                          onClick={() => setMarkDoneItem(item)}
                        >
                          <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} />
                          </svg>
                          Mark Done
                        </button>
                        <button
                          className="flex items-center gap-1.5 rounded-lg bg-red-500 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-red-600"
                          type="button"
                          onClick={() => setFlagIssueItem(item)}
                        >
                          <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path
                              d="M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-3 6 3 6H11.5l-1-1H5v4m0-4h14"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                            />
                          </svg>
                          Flag Issue
                        </button>
                        <button
                          className="flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-4 py-2 text-xs font-medium text-gray-500 transition-colors hover:bg-gray-50"
                          type="button"
                          onClick={() => toast('Attach feature coming soon.')}
                        >
                          <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path
                              d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                            />
                          </svg>
                          Attach
                        </button>
                        <button
                          className={`flex items-center gap-1.5 rounded-lg border px-4 py-2 text-xs font-semibold transition-colors ${
                            item.scheduledDate
                              ? 'border-green-400 bg-white text-green-600 hover:bg-green-50'
                              : 'border-gray-300 bg-white text-gray-500 hover:bg-gray-50'
                          }`}
                          type="button"
                          onClick={() => setSchedulingItem(item)}
                        >
                          <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path
                              d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                            />
                          </svg>
                          {item.scheduledDate ? 'Scheduled' : 'Schedule'}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )
            ) : (
              <DataTable
                columns={columns.map(col => ({
                  id: col.field,
                  label: col.headerName,
                  width: col.width,
                  minWidth: col.minWidth,
                  sortable: col.sortable !== false,
                  renderCell: col.renderCell
                    ? (value: any, row: any, index: number) => col.renderCell?.({ value, row, index })
                    : col.valueGetter
                      ? (value: any, row: any, index: number) => col.valueGetter?.({ value, row, index }) || ''
                      : undefined,
                }))}
                data={workList.items || []}
                emptyState={{ subtitle: 'No records available', title: 'No records found' }}
                getRowId={(row: any) => row.itemId}
                loading={isLoading}
                page={(workList.page || 1) - 1}
                rowsPerPage={workList.limit || 20}
                serverSide={true}
                totalRows={workList.total || 0}
                onPageChange={(page: number) => fetchList(activeTab, taskFrequency, page + 1, workList.limit || 20)}
                onRowsPerPageChange={(limit: number) => fetchList(activeTab, taskFrequency, 1, limit)}
              />
            )}
          </div>
        </div>
      </div>

      {selectedItem !== null && selectedItem !== undefined && (
        <StepsModal item={selectedItem as Work} onClose={() => setSelectedItem(null)} />
      )}

      {flagIssueItem !== null && flagIssueItem !== undefined && (
        <FlagIssueModal
          dispatch={dispatch}
          facilityCode={FACILITY_CODE}
          item={flagIssueItem as Work}
          updatedBy={currentUserId}
          onClose={() => setFlagIssueItem(null)}
          onSuccess={() => activeTab === 'schedule' ? refreshSchedule() : fetchList(activeTab, taskFrequency, workList.page || 1)}
        />
      )}

      {markDoneItem !== null && markDoneItem !== undefined && (
        <MarkDoneModal
          dispatch={dispatch}
          facilityCode={FACILITY_CODE}
          item={markDoneItem as Work}
          updatedBy={currentUserId}
          onClose={() => setMarkDoneItem(null)}
          onSuccess={() => activeTab === 'schedule' ? refreshSchedule() : fetchList(activeTab, taskFrequency, workList.page || 1)}
        />
      )}

      {showAddTask && (
        <AddTaskModal
          dispatch={dispatch}
          onClose={() => setShowAddTask(false)}
          onSuccess={() => fetchList(activeTab, taskFrequency, 1)}
        />
      )}

      {schedulingItem !== null && schedulingItem !== undefined && (
        <ScheduleModal
          dispatch={dispatch}
          item={schedulingItem as Work}
          onClose={() => setSchedulingItem(null)}
          onSuccess={() => activeTab === 'schedule' ? refreshSchedule() : fetchList(activeTab, taskFrequency, workList.page || 1)}
        />
      )}
    </>
  );
};

export default Maintenance;
