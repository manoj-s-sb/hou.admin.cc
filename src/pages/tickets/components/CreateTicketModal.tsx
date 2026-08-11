import React, { useState } from 'react';

import { toast } from 'react-hot-toast';
import { useDispatch } from 'react-redux';

import { AppDispatch } from '../../../store/store';
import { createTicket, uploadTicketFile } from '../../../store/tickets/api';
import {
  ALL_LANES,
  CATEGORY_META,
  EQUIPMENT_LIST,
  PRIORITY_META,
  ROLE_LABELS,
  TICKET_CATEGORIES,
  TICKET_PRIORITIES,
  TICKET_ROLES,
} from '../constants';

import EmailTagInput from './EmailTagInput';
import StaffAssigneeSelect, { SelectedStaff } from './StaffAssigneeSelect';

import type {
  CreateTicketRequest,
  Ticket,
  TicketCategory,
  TicketPriority,
  TicketRole,
} from '../../../store/tickets/types';

interface CentreOption {
  code: string;
  name: string;
}

interface Props {
  /** Locked centre when opened from a centre context; empty for the global view. */
  facilityCode?: string;
  centres: CentreOption[];
  onClose: () => void;
  onCreated: () => void;
}

const fieldClass =
  'w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-[13px] text-gray-700 outline-none transition focus:border-[#21295A] focus:bg-white focus:ring-2 focus:ring-[#21295A]/10';
const labelClass = 'mb-1 block text-[11px] font-semibold uppercase tracking-wider text-gray-400';

const Chip: React.FC<{ active: boolean; onClick: () => void; children: React.ReactNode }> = ({
  active,
  onClick,
  children,
}) => (
  <button
    className={`cursor-pointer rounded-full border px-2.5 py-1 text-xs font-medium transition-all ${
      active
        ? 'border-[#9096be] bg-[#ecedf4] text-[#21295a]'
        : 'border-gray-200 bg-white text-gray-500 hover:bg-gray-50'
    }`}
    type="button"
    onClick={onClick}
  >
    {children}
  </button>
);

// Surfaces the backend's assignment-notification outcome as brief, non-intrusive
// toasts. `assigneeNotified: false` is a warning (no email on file), not a failure.
const notifyEmailOutcome = (ticket: Ticket) => {
  const { emailNotifications } = ticket;
  if (!emailNotifications) return;
  if (emailNotifications.assigneeNotified) {
    toast.success('Email notification sent to assignee');
  } else {
    toast('Assignee could not be notified (no email on file)', { icon: '⚠️' });
  }
  if (emailNotifications.ccNotified && emailNotifications.ccNotified.length > 0) {
    toast.success(`CC notification sent to: ${emailNotifications.ccNotified.join(', ')}`);
  }
};

const CreateTicketModal: React.FC<Props> = ({ facilityCode, centres, onClose, onCreated }) => {
  const dispatch = useDispatch<AppDispatch>();
  const lockedCentre = Boolean(facilityCode);

  const [centre, setCentre] = useState(facilityCode ?? '');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<TicketCategory>('maintenance');
  const [customerEmail, setCustomerEmail] = useState('');
  const [task, setTask] = useState('');
  const [priority, setPriority] = useState<TicketPriority>('medium');
  const [assignedTo, setAssignedTo] = useState<TicketRole>('noc');
  const [assignees, setAssignees] = useState<SelectedStaff[]>([]);
  const [additionalRecipients, setAdditionalRecipients] = useState<string[]>([]);
  const [lanes, setLanes] = useState<number[]>([]);
  const [equipment, setEquipment] = useState<string[]>([]);
  const [files, setFiles] = useState<File[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [triedSubmit, setTriedSubmit] = useState(false);

  // Field-level validation surfaced inline — required inputs like Centre (dropdown)
  // and Lanes (chips) are easy to miss, so we show the reason on the field itself
  // rather than relying only on a transient toast.
  const isCustomerSupport = category === 'customer_support';
  const emailInvalid = Boolean(customerEmail.trim()) && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customerEmail.trim());
  const errors = {
    centre: !centre ? 'Select a centre' : '',
    title: !title.trim() ? 'Title is required' : '',
    description: !description.trim() ? 'Description is required' : '',
    assigneeName: assignedTo === 'others' && assignees.length === 0 ? 'Select at least one assignee' : '',
    customerEmail: isCustomerSupport
      ? !customerEmail.trim()
        ? 'Customer email is required'
        : emailInvalid
          ? 'Enter a valid email'
          : ''
      : '',
  };
  const hasErrors = Object.values(errors).some(Boolean);
  const errClass = (msg: string) => (triedSubmit && msg ? ' border-red-400 ring-1 ring-red-300' : '');

  const toggle = <T,>(list: T[], value: T, set: (v: T[]) => void) =>
    set(list.includes(value) ? list.filter(v => v !== value) : [...list, value]);

  const handleSubmit = async () => {
    setTriedSubmit(true);
    if (hasErrors) {
      toast.error('Please complete the required fields highlighted below');
      return;
    }

    setSubmitting(true);

    // Upload attachments first (browser → blob via SAS). Surface this failure
    // distinctly: a blocked/failed upload (e.g. storage CORS not configured) must
    // not masquerade as a ticket-creation error.
    let blobNames: string[] = [];
    if (files.length) {
      try {
        blobNames = await Promise.all(files.map(f => uploadTicketFile(centre, f)));
      } catch {
        setSubmitting(false);
        toast.error(
          'Attachment upload failed — the tickets storage needs CORS enabled for this site. Remove the file to create without it, or fix storage CORS and retry.'
        );
        return;
      }
    }

    try {
      // The backend only has one official assignee (assignedToId/assignedToName) — the
      // first person picked becomes that; anyone picked after that has no formal
      // "assignee" slot yet, so they're CC'd via additionalRecipients so they're still
      // notified. See StaffAssigneeSelect's doc comment.
      const [primaryAssignee, ...extraAssignees] = assignees;
      const recipients = [...additionalRecipients, ...extraAssignees.map(a => a.email)];
      const payload: CreateTicketRequest = {
        facilityCode: centre,
        title: title.trim(),
        description: description.trim(),
        category,
        customerEmail: isCustomerSupport && customerEmail.trim() ? customerEmail.trim() : undefined,
        task: task.trim() || null,
        priority,
        assignedTo,
        assignedToId: assignedTo === 'others' && primaryAssignee ? primaryAssignee.staffId : undefined,
        assignedToName: assignedTo === 'others' && primaryAssignee ? primaryAssignee.name : undefined,
        laneNo: lanes.length ? lanes : null,
        equipment: equipment.length ? equipment : null,
        attachments: blobNames.length ? blobNames : undefined,
        additionalRecipients: recipients.length ? recipients : undefined,
      };
      const created = await dispatch(createTicket(payload)).unwrap();
      toast.success('Ticket created');
      notifyEmailOutcome(created);
      onCreated();
    } catch (e) {
      toast.error(typeof e === 'string' ? e : 'Could not create the ticket');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      aria-modal="true"
      className="fixed inset-0 z-[600] flex items-center justify-center bg-black/40 p-4"
      role="dialog"
    >
      <div className="flex max-h-[90vh] w-full max-w-[640px] flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="flex items-start justify-between border-b border-gray-100 px-6 py-4">
          <div>
            <h2 className="text-[16px] font-bold text-[#21295A]">+ Create Ticket</h2>
            <p className="mt-0.5 text-[12px] text-gray-400">Raise a ticket or incident — assigned to NOC or Staff</p>
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
          {triedSubmit && hasErrors && (
            <div className="rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-[12px] font-semibold text-red-600">
              Please complete the required fields highlighted below.
            </div>
          )}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <span className={labelClass}>Centre *</span>
              <select
                className={`${fieldClass}${errClass(errors.centre)}`}
                disabled={lockedCentre}
                value={centre}
                onChange={e => setCentre(e.target.value)}
              >
                <option value="">Select centre…</option>
                {lockedCentre && !centres.some(c => c.code === centre) && <option value={centre}>{centre}</option>}
                {centres.map(c => (
                  <option key={c.code} value={c.code}>
                    {c.name} ({c.code})
                  </option>
                ))}
              </select>
              {triedSubmit && errors.centre && <p className="mt-1 text-[11px] text-red-500">{errors.centre}</p>}
            </div>
            <div>
              <span className={labelClass}>Category *</span>
              <select
                className={fieldClass}
                value={category}
                onChange={e => setCategory(e.target.value as TicketCategory)}
              >
                {TICKET_CATEGORIES.map(c => (
                  <option key={c} value={c}>
                    {CATEGORY_META[c].label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Customer email — only relevant for Customer Support tickets */}
          {isCustomerSupport && (
            <div>
              <span className={labelClass}>Customer Email *</span>
              <input
                className={`${fieldClass}${errClass(errors.customerEmail)}`}
                placeholder="customer@example.com"
                type="email"
                value={customerEmail}
                onChange={e => setCustomerEmail(e.target.value)}
              />
              {triedSubmit && errors.customerEmail && (
                <p className="mt-1 text-[11px] text-red-500">{errors.customerEmail}</p>
              )}
            </div>
          )}

          <div>
            <span className={labelClass}>Title *</span>
            <input
              className={`${fieldClass}${errClass(errors.title)}`}
              placeholder="e.g. Bowling machine overheating — Lane 3"
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
            />
            {triedSubmit && errors.title && <p className="mt-1 text-[11px] text-red-500">{errors.title}</p>}
          </div>

          <div>
            <span className={labelClass}>Description *</span>
            <textarea
              className={`${fieldClass}${errClass(errors.description)}`}
              placeholder="Describe the issue…"
              rows={3}
              value={description}
              onChange={e => setDescription(e.target.value)}
            />
            {triedSubmit && errors.description && <p className="mt-1 text-[11px] text-red-500">{errors.description}</p>}
          </div>

          <div>
            <span className={labelClass}>Priority *</span>
            <div className="grid grid-cols-3 gap-2">
              {TICKET_PRIORITIES.map(p => {
                const active = priority === p;
                const meta = PRIORITY_META[p];
                return (
                  <button
                    key={p}
                    className={`flex items-center justify-center gap-2 rounded-lg border px-3 py-2 text-[13px] font-semibold transition ${
                      active
                        ? 'border-[#9096be] bg-[#ecedf4] text-[#21295A]'
                        : 'border-gray-200 bg-white text-gray-500 hover:bg-gray-50'
                    }`}
                    type="button"
                    onClick={() => setPriority(p)}
                  >
                    <span className={`h-2 w-2 rounded-full ${meta.dot}`} />
                    {meta.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <span className={labelClass}>Assign To *</span>
              <select
                className={fieldClass}
                value={assignedTo}
                onChange={e => setAssignedTo(e.target.value as TicketRole)}
              >
                {TICKET_ROLES.map(r => (
                  <option key={r} value={r}>
                    {ROLE_LABELS[r]}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <span className={labelClass}>Task</span>
              <input
                className={fieldClass}
                placeholder="e.g. Cooling Fans"
                type="text"
                value={task}
                onChange={e => setTask(e.target.value)}
              />
            </div>
          </div>

          {assignedTo === 'others' && (
            <div>
              <span className={labelClass}>Assignee(s) *</span>
              <StaffAssigneeSelect
                className={`${fieldClass}${errClass(errors.assigneeName)}`}
                facilityCode={centre || undefined}
                value={assignees}
                onChange={setAssignees}
              />
              {assignees.length > 1 && (
                <p className="mt-1 text-[11px] text-gray-400">
                  Only the first (★) is the formal assignee — the rest are CC&apos;d on notifications.
                </p>
              )}
              {triedSubmit && errors.assigneeName && (
                <p className="mt-1 text-[11px] text-red-500">{errors.assigneeName}</p>
              )}
            </div>
          )}

          <EmailTagInput emails={additionalRecipients} onChange={setAdditionalRecipients} />

          <div>
            <span className={labelClass}>Lanes</span>
            <div className="flex flex-wrap gap-1.5">
              {ALL_LANES.map(n => (
                <Chip key={n} active={lanes.includes(n)} onClick={() => toggle(lanes, n, setLanes)}>
                  {n}
                </Chip>
              ))}
              <Chip
                active={lanes.length === ALL_LANES.length}
                onClick={() => setLanes(lanes.length === ALL_LANES.length ? [] : [...ALL_LANES])}
              >
                All
              </Chip>
            </div>
          </div>
          <div>
            <span className={labelClass}>Equipment</span>
            <div className="flex flex-wrap gap-1.5">
              {EQUIPMENT_LIST.map(item => (
                <Chip
                  key={item}
                  active={equipment.includes(item)}
                  onClick={() => toggle(equipment, item, setEquipment)}
                >
                  {item}
                </Chip>
              ))}
            </div>
          </div>

          <div>
            <span className={labelClass}>Attachments</span>
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
            disabled={submitting}
            type="button"
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            className="rounded-lg bg-[#21295A] px-5 py-2 text-[12px] font-semibold text-white shadow-sm transition hover:bg-[#2d3570] disabled:opacity-50"
            disabled={submitting}
            type="button"
            onClick={handleSubmit}
          >
            {submitting ? 'Creating…' : 'Create Ticket'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CreateTicketModal;
