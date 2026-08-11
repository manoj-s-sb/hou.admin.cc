import React, { useState } from 'react';

import { toast } from 'react-hot-toast';
import { useDispatch } from 'react-redux';

import { flagIssue } from '../../../store/maintenance/api';
import { AppDispatch } from '../../../store/store';
import { reassignTicket, uploadTicketFile } from '../../../store/tickets/api';
import StaffAssigneeSelect from '../../tickets/components/StaffAssigneeSelect';
import { ROLE_LABELS, TICKET_ROLES } from '../../tickets/constants';
import { ALL_LANES, PRIORITIES, inputCls, labelCls } from '../constants';

import type { TaskSchedule, TemplatePriority } from '../../../store/maintenance/types';
import type { TicketRole } from '../../../store/tickets/types';

interface Props {
  schedule: TaskSchedule;
  facilityCode: string;
  onClose: () => void;
  onFlagged: () => void;
}

const FlagIssueModal: React.FC<Props> = ({ schedule, facilityCode, onClose, onFlagged }) => {
  const dispatch = useDispatch<AppDispatch>();
  const laneSuffix = schedule.laneNo ? ` — Lane ${schedule.laneNo}` : '';
  const [title, setTitle] = useState(`${schedule.template.title}${laneSuffix}`);
  const [notes, setNotes] = useState('');
  const [priority, setPriority] = useState<TemplatePriority>('medium');
  // A maintenance ticket is always lane-scoped. Prefill from the schedule when it
  // has a lane; require a choice for facility-wide schedules (laneNo === null).
  const [lane, setLane] = useState<string>(schedule.laneNo ? String(schedule.laneNo) : '');
  const [assignedTo, setAssignedTo] = useState<TicketRole>('noc');
  const [assigneeId, setAssigneeId] = useState('');
  const [assigneeName, setAssigneeName] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [saving, setSaving] = useState(false);
  const [tried, setTried] = useState(false);

  const handleSubmit = async () => {
    setTried(true);
    if (!title.trim() || !notes.trim()) {
      toast.error('Title and description are required');
      return;
    }
    if (!lane) {
      toast.error('Select the lane this issue is on');
      return;
    }
    if (assignedTo === 'others' && !assigneeId) {
      toast.error('Select an assignee');
      return;
    }
    setSaving(true);
    try {
      let attachments: string[] = [];
      // Flagging an issue creates a ticket, so its attachments must go to the tickets blob
      // account (uploadTicketFile) — uploadMaintenanceFile would land them in the wrong
      // account and the ticket's read URL would 404, showing an unpreviable "File" tile.
      if (files.length) attachments = await Promise.all(files.map(f => uploadTicketFile(facilityCode, f)));
      const res = await dispatch(
        flagIssue({
          scheduleId: schedule.id,
          facilityCode,
          title: title.trim(),
          notes: notes.trim(),
          priority,
          laneNo: parseInt(lane, 10),
          attachments: attachments.length ? attachments : undefined,
        })
      ).unwrap();
      // Flag Issue's own endpoint links the ticket to this schedule, but doesn't take an
      // assignee — set that separately via the same reassign call the ticket detail view uses.
      // Kept in its own try/catch: the ticket already exists at this point, so a failure here
      // shouldn't be reported as "could not flag the issue".
      if (res.ticket?.id) {
        try {
          await dispatch(
            reassignTicket({
              ticketId: res.ticket.id,
              assignedTo,
              assignedToId: assignedTo === 'others' && assigneeId ? assigneeId : undefined,
              assignedToName: assignedTo === 'others' ? assigneeName.trim() : undefined,
            })
          ).unwrap();
        } catch {
          toast.error('Ticket raised, but assignment failed — assign it from the Tickets page.');
        }
      }
      toast.success(`Ticket raised${res.ticket?.ticketNo ? ` — ${res.ticket.ticketNo}` : ''}`);
      onFlagged();
    } catch (e) {
      toast.error(typeof e === 'string' ? e : 'Could not flag the issue');
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
      <div className="flex max-h-[90vh] w-full max-w-[500px] flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="flex items-start justify-between border-b border-gray-100 px-6 py-4">
          <div className="min-w-0">
            <h2 className="text-[16px] font-bold text-[#21295A]">Flag Issue</h2>
            <p className="mt-0.5 truncate text-[12px] text-gray-400">
              {schedule.template.title}
              {laneSuffix}
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

        <div className="flex-1 space-y-4 overflow-y-auto px-6 py-5">
          <div>
            <span className={labelCls}>Issue Title *</span>
            <input
              className={`${inputCls}${tried && !title.trim() ? 'border-red-400 ring-1 ring-red-300' : ''}`}
              value={title}
              onChange={e => setTitle(e.target.value)}
            />
          </div>
          <div>
            <span className={labelCls}>Description *</span>
            <textarea
              className={`${inputCls}${tried && !notes.trim() ? 'border-red-400 ring-1 ring-red-300' : ''}`}
              placeholder="Describe the issue…"
              rows={3}
              value={notes}
              onChange={e => setNotes(e.target.value)}
            />
          </div>
          <div>
            <span className={labelCls}>Lane *</span>
            <select
              className={`${inputCls}${tried && !lane ? 'border-red-400 ring-1 ring-red-300' : ''}`}
              value={lane}
              onChange={e => setLane(e.target.value)}
            >
              <option value="">Select a lane…</option>
              {ALL_LANES.map(n => (
                <option key={n} value={n}>
                  Lane {n}
                </option>
              ))}
            </select>
          </div>
          <div>
            <span className={labelCls}>Priority</span>
            <div className="grid grid-cols-3 gap-2">
              {PRIORITIES.map(p => {
                const active = priority === p.value;
                return (
                  <button
                    key={p.value}
                    className={`flex items-center justify-center gap-2 rounded-lg border px-3 py-2 text-[13px] font-semibold transition ${
                      active ? p.pill : 'border-gray-200 bg-white text-gray-500 hover:bg-gray-50'
                    }`}
                    type="button"
                    onClick={() => setPriority(p.value)}
                  >
                    <span className={`h-2 w-2 rounded-full ${p.dot}`} />
                    {p.label}
                  </button>
                );
              })}
            </div>
          </div>
          <div>
            <span className={labelCls}>Assign To *</span>
            <select className={inputCls} value={assignedTo} onChange={e => setAssignedTo(e.target.value as TicketRole)}>
              {TICKET_ROLES.map(r => (
                <option key={r} value={r}>
                  {ROLE_LABELS[r]}
                </option>
              ))}
            </select>
          </div>
          {assignedTo === 'others' && (
            <div>
              <span className={labelCls}>Assignee *</span>
              <StaffAssigneeSelect
                className={`${inputCls}${tried && !assigneeId ? 'border-red-400 ring-1 ring-red-300' : ''}`}
                facilityCode={facilityCode}
                value={assigneeId}
                onChange={(id, name) => {
                  setAssigneeId(id);
                  setAssigneeName(name);
                }}
              />
            </div>
          )}
          <div>
            <span className={labelCls}>Attachments</span>
            <input
              multiple
              accept="image/*,video/*"
              className="block w-full text-[12px] text-gray-500 file:mr-3 file:rounded-lg file:border-0 file:bg-gray-100 file:px-3 file:py-1.5 file:text-[12px] file:font-semibold file:text-gray-700"
              type="file"
              onChange={e => {
                setFiles(prev => [...prev, ...Array.from(e.target.files ?? [])]);
                // Reset so the input fires again next time, instead of just extending this selection.
                e.target.value = '';
              }}
            />
            {files.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-2">
                {files.map((f, i) => (
                  <span
                    key={`${f.name}-${i}`}
                    className="flex items-center gap-1.5 rounded-lg border border-dashed border-gray-300 bg-gray-50 px-2 py-1 text-[11px] font-medium text-gray-600"
                  >
                    📎 {f.name.length > 20 ? `${f.name.slice(0, 20)}…` : f.name}
                    <button
                      className="text-red-400 hover:text-red-600"
                      type="button"
                      onClick={() => setFiles(prev => prev.filter((_, j) => j !== i))}
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>
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
            className="rounded-lg bg-red-600 px-5 py-2 text-[12px] font-semibold text-white shadow-sm transition hover:bg-red-700 disabled:opacity-50"
            disabled={saving}
            type="button"
            onClick={handleSubmit}
          >
            {saving ? 'Submitting…' : '⚠ Submit Issue'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default FlagIssueModal;
