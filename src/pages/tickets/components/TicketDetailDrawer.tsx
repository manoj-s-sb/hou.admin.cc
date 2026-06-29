import React, { useEffect, useState } from 'react';

import { toast } from 'react-hot-toast';
import { useDispatch, useSelector } from 'react-redux';

import { AppDispatch, RootState } from '../../../store/store';
import {
  acknowledgeTicket,
  addTicketAttachment,
  addTicketComment,
  getTicket,
  reassignTicket,
  updateTicketStatus,
  uploadTicketFile,
} from '../../../store/tickets/api';
import { clearCurrentTicket } from '../../../store/tickets/reducers';
import { formatDateTimeChicago } from '../../../utils/dateUtils';
import {
  ACTION_LABELS,
  CATEGORY_META,
  PRIORITY_META,
  ROLE_LABELS,
  STATUS_FLOW,
  STATUS_META,
  STATUS_TRANSITIONS,
  TICKET_ROLES,
} from '../constants';

import type { Ticket, TicketRole, TicketStatus } from '../../../store/tickets/types';

interface Props {
  ticketId: string;
  onClose: () => void;
  onChanged: () => void;
}

const transitionLabel = (current: TicketStatus, target: TicketStatus): string => {
  if (target === 'noc') return current === 'verify' ? '→ Re-assign to NOC' : '→ Assign to NOC';
  if (target === 'verify') return '→ Send to Staff for Verification';
  if (target === 'closed') return '✓ Close Ticket';
  return STATUS_META[target].label;
};

// Outlined, colour-coded action buttons (matches the reference design).
const transitionBtnClass = (target: TicketStatus): string => {
  if (target === 'closed') return 'border-emerald-300 bg-emerald-50 text-emerald-700 hover:bg-emerald-100';
  if (target === 'verify') return 'border-yellow-300 bg-yellow-50 text-yellow-700 hover:bg-yellow-100';
  return 'border-orange-300 bg-orange-50 text-orange-600 hover:bg-orange-100';
};

const laneLabel = (lanes: number[] | null): string => {
  if (!lanes || lanes.length === 0) return 'N/A';
  if (lanes.length === 7) return 'All Lanes';
  return lanes.length === 1 ? `Lane ${lanes[0]}` : `Lanes ${[...lanes].sort((a, b) => a - b).join(', ')}`;
};

const Row: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div>
    <div className="text-[10.5px] font-semibold uppercase tracking-wider text-gray-400">{label}</div>
    <div className="mt-0.5 text-[13px] font-medium text-[#21295A]">{children}</div>
  </div>
);

const TicketDetailDrawer: React.FC<Props> = ({ ticketId, onClose, onChanged }) => {
  const dispatch = useDispatch<AppDispatch>();
  const { current, detailLoading, saving } = useSelector((state: RootState) => state.tickets);
  const [comment, setComment] = useState('');
  const [reassignRole, setReassignRole] = useState<TicketRole>('noc');
  // In-page image preview (lightbox) — clicking an attachment shows it here
  // instead of navigating away to a new browser tab.
  const [preview, setPreview] = useState<string | null>(null);

  useEffect(() => {
    dispatch(getTicket(ticketId));
    return () => {
      dispatch(clearCurrentTicket());
    };
  }, [dispatch, ticketId]);

  const ticket: Ticket | null = current && current.id === ticketId ? current : null;

  const afterMutation = (msg: string) => {
    toast.success(msg);
    onChanged();
  };

  const handleStatus = async (newStatus: TicketStatus) => {
    if (newStatus === 'closed' && !window.confirm('Close this ticket? This is a terminal state.')) return;
    try {
      await dispatch(updateTicketStatus({ ticketId, newStatus })).unwrap();
      afterMutation(`Ticket moved to ${STATUS_META[newStatus].label}`);
    } catch (e) {
      toast.error(typeof e === 'string' ? e : 'Could not update status');
    }
  };

  const handleAcknowledge = async () => {
    try {
      await dispatch(acknowledgeTicket({ ticketId })).unwrap();
      afterMutation('Ticket acknowledged — now In Progress');
    } catch (e) {
      toast.error(typeof e === 'string' ? e : 'Could not acknowledge');
    }
  };

  const handleComment = async () => {
    if (!comment.trim()) return;
    try {
      await dispatch(addTicketComment({ ticketId, text: comment.trim() })).unwrap();
      setComment('');
      afterMutation('Comment added');
    } catch (e) {
      toast.error(typeof e === 'string' ? e : 'Could not add comment');
    }
  };

  const handleReassign = async () => {
    try {
      await dispatch(reassignTicket({ ticketId, assignedTo: reassignRole })).unwrap();
      afterMutation(`Reassigned to ${ROLE_LABELS[reassignRole]}`);
    } catch (e) {
      toast.error(typeof e === 'string' ? e : 'Could not reassign');
    }
  };

  const handleAttachment = async (file: File | null) => {
    if (!file || !ticket) return;
    try {
      const blobName = await uploadTicketFile(ticket.facilityCode, file);
      await dispatch(addTicketAttachment({ ticketId, blobName })).unwrap();
      afterMutation('Attachment added');
    } catch (e) {
      toast.error(typeof e === 'string' ? e : 'Could not attach the file');
    }
  };

  const isClosed = ticket?.status === 'closed';
  const transitions = ticket ? STATUS_TRANSITIONS[ticket.status] : [];

  return (
    <div
      aria-modal="true"
      className="fixed inset-0 z-[600] flex items-center justify-center bg-black/40 p-4"
      role="dialog"
    >
      <div className="flex max-h-[92vh] w-full max-w-[720px] flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        {detailLoading || !ticket ? (
          <div className="flex h-64 items-center justify-center text-[13px] text-gray-500">
            {detailLoading ? 'Loading ticket…' : 'Ticket not found'}
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="flex items-start justify-between border-b border-gray-100 px-6 py-4">
              <div className="min-w-0">
                <div className="text-[11px] font-semibold text-gray-400">
                  {ticket.ticketNo} · {ticket.facilityCode}
                </div>
                <div className="mt-0.5 text-[16px] font-bold text-[#21295A]">{ticket.title}</div>
                <div className="mt-1 flex items-center gap-1.5 text-[12px] text-gray-500">
                  <span>{CATEGORY_META[ticket.category].label}</span>
                  <span>· {laneLabel(ticket.laneNo)}</span>
                  <span>·</span>
                  <span className={`h-1.5 w-1.5 rounded-full ${PRIORITY_META[ticket.priority].dot}`} />
                  <span className={`font-semibold ${PRIORITY_META[ticket.priority].text}`}>
                    {PRIORITY_META[ticket.priority].label}
                  </span>
                </div>
              </div>
              <button
                aria-label="Close"
                className="ml-2 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50"
                type="button"
                onClick={onClose}
              >
                ×
              </button>
            </div>

            <div className="flex-1 space-y-5 overflow-y-auto px-6 py-5">
              {/* Stepper */}
              <div className="flex items-center justify-between">
                {STATUS_FLOW.map((s, i) => {
                  const curIdx = STATUS_FLOW.indexOf(ticket.status);
                  const done = i < curIdx;
                  const active = i === curIdx;
                  return (
                    <React.Fragment key={s}>
                      <div className="flex flex-col items-center gap-1">
                        <span
                          className={`flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-bold ${
                            done
                              ? 'bg-emerald-500 text-white'
                              : active
                                ? 'bg-[#21295A] text-white'
                                : 'bg-gray-200 text-gray-500'
                          }`}
                        >
                          {done ? '✓' : i + 1}
                        </span>
                        <span className={`text-[9px] font-medium ${active ? 'text-[#21295A]' : 'text-gray-400'}`}>
                          {STATUS_META[s].label}
                        </span>
                      </div>
                      {i < STATUS_FLOW.length - 1 && (
                        <span className={`mx-1 h-px flex-1 ${i < curIdx ? 'bg-emerald-400' : 'bg-gray-200'}`} />
                      )}
                    </React.Fragment>
                  );
                })}
              </div>

              {/* Meta grid */}
              <div className="grid grid-cols-2 gap-3 rounded-xl border border-gray-100 bg-gray-50 p-3">
                <Row label="Status">
                  <span
                    className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${STATUS_META[ticket.status].pill}`}
                  >
                    {STATUS_META[ticket.status].label}
                  </span>
                </Row>
                <Row label="Assigned To">
                  {ticket.assignedToName ||
                    (ticket.assignedTo
                      ? (ROLE_LABELS[ticket.assignedTo as TicketRole] ?? ticket.assignedTo)
                      : 'Unassigned')}
                </Row>
                {ticket.task && <Row label="Task">{ticket.task}</Row>}
                {ticket.equipment && ticket.equipment.length > 0 && (
                  <Row label="Equipment">{ticket.equipment.join(', ')}</Row>
                )}
                {ticket.slaDeadline && <Row label="SLA Deadline">{formatDateTimeChicago(ticket.slaDeadline)}</Row>}
              </div>

              {/* Description */}
              <div>
                <div className="text-[10.5px] font-semibold uppercase tracking-wider text-gray-400">Description</div>
                <p className="mt-1 whitespace-pre-wrap text-[13px] text-gray-700">{ticket.description}</p>
              </div>

              {/* Attachments */}
              {ticket.attachments.length > 0 && (
                <div>
                  <div className="mb-1.5 text-[10.5px] font-semibold uppercase tracking-wider text-gray-400">
                    Attachments
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {ticket.attachments.map((a, i) => (
                      <button
                        key={i}
                        aria-label={`Open attachment ${i + 1}`}
                        className="block h-16 w-16 overflow-hidden rounded-lg border border-gray-200 bg-gray-50"
                        type="button"
                        onClick={() => setPreview(a.blobName)}
                      >
                        <img alt={`attachment ${i + 1}`} className="h-full w-full object-cover" src={a.blobName} />
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Comments / activity */}
              <div>
                <div className="mb-2 text-[10.5px] font-semibold uppercase tracking-wider text-gray-400">Comments</div>
                <div className="space-y-2">
                  {ticket.activities.map((act, i) =>
                    act.action === 'comment' ? (
                      <div key={i} className="rounded-xl bg-[#eef2ff] px-3.5 py-2.5">
                        <p className="text-[12.5px] text-gray-800">{act.label}</p>
                        {act.attachmentUrl && (
                          <a
                            className="mt-1 inline-block text-[11px] font-semibold text-[#21295A] underline"
                            href={act.attachmentUrl}
                            rel="noreferrer"
                            target="_blank"
                          >
                            View attachment
                          </a>
                        )}
                        <div className="mt-1 text-[10.5px] text-gray-500">
                          {act.byName || '—'} · {formatDateTimeChicago(act.at)}
                        </div>
                      </div>
                    ) : (
                      <div key={i} className="rounded-xl border border-gray-100 bg-gray-50 px-3.5 py-2.5">
                        <p className="text-[12.5px] italic text-gray-600">
                          {ACTION_LABELS[act.action] ?? act.action}
                          {act.label ? ` — ${act.label}` : ''}
                        </p>
                        <div className="mt-1 text-[10.5px] text-gray-400">
                          {act.byName || 'System'} · {formatDateTimeChicago(act.at)}
                        </div>
                      </div>
                    )
                  )}
                </div>
              </div>

              {/* Add comment + actions */}
              {isClosed ? (
                <div className="rounded-lg bg-emerald-50 px-3 py-2 text-center text-[12px] font-semibold text-emerald-700">
                  ✓ Ticket closed{ticket.closedByName ? ` by ${ticket.closedByName}` : ''}
                </div>
              ) : (
                <div className="space-y-3">
                  <div>
                    <div className="mb-1.5 text-[10.5px] font-semibold uppercase tracking-wider text-gray-400">
                      Add comment
                    </div>
                    <textarea
                      className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-[13px] outline-none focus:border-[#21295A] focus:bg-white"
                      placeholder="Type a comment…"
                      rows={2}
                      value={comment}
                      onChange={e => setComment(e.target.value)}
                    />
                    <div className="mt-2 flex items-center justify-between">
                      <label className="flex cursor-pointer items-center gap-1.5 rounded-lg border border-dashed border-gray-300 bg-gray-50 px-3 py-1.5 text-[11.5px] font-semibold text-gray-500 hover:bg-gray-100">
                        📎 Add attachment
                        <input
                          accept="image/*,video/*"
                          className="hidden"
                          type="file"
                          onChange={e => handleAttachment(e.target.files?.[0] ?? null)}
                        />
                      </label>
                      <button
                        className="rounded-lg bg-[#21295A] px-4 py-1.5 text-[12px] font-semibold text-white transition hover:bg-[#2d3570] disabled:opacity-50"
                        disabled={saving || !comment.trim()}
                        type="button"
                        onClick={handleComment}
                      >
                        Comment
                      </button>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {ticket.status === 'noc' && (
                      <button
                        className="rounded-lg border border-blue-300 bg-blue-50 px-3 py-2 text-[12px] font-semibold text-blue-700 transition hover:bg-blue-100 disabled:opacity-50"
                        disabled={saving}
                        type="button"
                        onClick={handleAcknowledge}
                      >
                        ✓ Acknowledge &amp; Start
                      </button>
                    )}
                    {transitions.map(target => (
                      <button
                        key={target}
                        className={`rounded-lg border px-3 py-2 text-[12px] font-semibold transition disabled:opacity-50 ${transitionBtnClass(target)}`}
                        disabled={saving}
                        type="button"
                        onClick={() => handleStatus(target)}
                      >
                        {transitionLabel(ticket.status, target)}
                      </button>
                    ))}
                  </div>

                  <div className="flex items-center gap-2 border-t border-gray-50 pt-3">
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">Reassign</span>
                    <select
                      className="rounded-lg border border-gray-200 bg-gray-50 px-2 py-1.5 text-[12px] outline-none focus:border-[#21295A]"
                      value={reassignRole}
                      onChange={e => setReassignRole(e.target.value as TicketRole)}
                    >
                      {TICKET_ROLES.map(r => (
                        <option key={r} value={r}>
                          {ROLE_LABELS[r]}
                        </option>
                      ))}
                    </select>
                    <button
                      className="rounded-lg border border-gray-200 px-3 py-1.5 text-[12px] font-semibold text-gray-600 transition hover:bg-gray-50 disabled:opacity-50"
                      disabled={saving}
                      type="button"
                      onClick={handleReassign}
                    >
                      Reassign
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between border-t border-gray-100 px-6 py-3.5">
              <span className="text-[11.5px] text-gray-400">
                Raised by {ticket.raisedByName || '—'} · {formatDateTimeChicago(ticket.createdAt)}
              </span>
              <button
                className="rounded-lg border border-gray-200 px-4 py-2 text-[12px] font-semibold text-gray-600 transition hover:bg-gray-50"
                type="button"
                onClick={onClose}
              >
                Close
              </button>
            </div>
          </>
        )}
      </div>

      {/* In-page image preview — opens over the drawer, click anywhere to close. */}
      {preview && (
        // eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions
        <div
          className="fixed inset-0 z-[700] flex items-center justify-center bg-black/80 p-6"
          onClick={() => setPreview(null)}
        >
          <img alt="attachment preview" className="max-h-full max-w-full rounded-lg object-contain" src={preview} />
        </div>
      )}
    </div>
  );
};

export default TicketDetailDrawer;
