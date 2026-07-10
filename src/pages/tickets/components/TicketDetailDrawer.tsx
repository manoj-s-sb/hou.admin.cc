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
  STATUS_META,
  STATUS_TRANSITIONS,
  TICKET_ROLES,
} from '../constants';

import type { Ticket, TicketActivity, TicketRole, TicketStatus } from '../../../store/tickets/types';

interface Props {
  ticketId: string;
  onClose: () => void;
  onChanged: () => void;
}

const transitionLabel = (current: TicketStatus, target: TicketStatus): string => {
  if (target === 'noc') return current === 'verify' ? '→ Re-assign to NOC' : '→ Assign to NOC';
  if (target === 'verify') return '→ Send to Staff for Verification';
  if (target === 'closed') return 'Close Issue';
  return STATUS_META[target].label;
};

// Outlined, colour-coded action buttons (matches the reference design).
const transitionBtnClass = (target: TicketStatus): string => {
  if (target === 'closed') return 'border-emerald-300 bg-emerald-50 text-emerald-700 hover:bg-emerald-100';
  if (target === 'verify') return 'border-yellow-300 bg-yellow-50 text-yellow-700 hover:bg-yellow-100';
  return 'border-orange-300 bg-orange-50 text-orange-600 hover:bg-orange-100';
};

// Attachment SAS URLs carry a `?...` query; test the path's extension so only
// real images open in the in-page lightbox (other files get an "Open file" link).
const isImageUrl = (url: string): boolean => /\.(png|jpe?g|webp|gif|bmp|svg)$/i.test(url.split('?')[0]);

const laneLabel = (lanes: number[] | null): string => {
  if (!lanes || lanes.length === 0) return 'N/A';
  if (lanes.length === 7) return 'All Lanes';
  return lanes.length === 1 ? `Lane ${lanes[0]}` : `Lanes ${[...lanes].sort((a, b) => a - b).join(', ')}`;
};

// Translate raw role IDs in assignment activities into friendly labels and
// append the actor's name, e.g. "Assigned to Centre Staff by Uday Reddy" —
// mirrors the maintenance issue timeline. Other actions already carry a
// human-readable backend label ("Raised by …", "Closed", …).
const resolveActivityLabel = (act: TicketActivity): string => {
  if ((act.action === 'assigned' || act.action === 'reassigned') && (act.toId || act.toName)) {
    const verb = act.action === 'reassigned' ? 'Reassigned' : 'Assigned';
    const target = act.toName || ROLE_LABELS[act.toId as TicketRole] || act.toId || '';
    const by = act.byName ? ` by ${act.byName}` : '';
    return `${verb} to ${target}${by}`;
  }
  return act.label || (ACTION_LABELS[act.action] ?? act.action);
};

// Icon for each timeline node, keyed on the activity action — mirrors the
// maintenance issue timeline (check / person / reassign arrows / clock / cross).
const stepIcon = (action: string): React.ReactNode => {
  const path = (d: string) => (
    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path d={d} strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} />
    </svg>
  );
  if (action === 'closed') return path('M6 18L18 6M6 6l12 12');
  if (action === 'reassigned') return path('M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4');
  if (action === 'assigned') return path('M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z');
  if (action === 'inprogress' || action === 'acknowledged') return path('M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z');
  return path('M5 13l4 4L19 7'); // raised / verify / reopened
};

// Chat-style comment: avatar + name + time above a rounded message bubble, so
// the message text is easy to read (matches the maintenance issue design).
const CommentBubble: React.FC<{ act: TicketActivity }> = ({ act }) => (
  <div className="flex items-start gap-2.5">
    <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-[#21295A] text-[10px] font-bold text-white">
      {act.byName ? act.byName.charAt(0).toUpperCase() : '?'}
    </div>
    <div className="flex min-w-0 flex-col gap-0.5">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[12px] font-semibold text-gray-700">{act.byName || 'Unknown'}</span>
        <span className="text-[10px] text-gray-400">{formatDateTimeChicago(act.at)}</span>
      </div>
      <div className="w-fit max-w-full rounded-2xl rounded-tl-sm border border-gray-200 bg-white px-3.5 py-2 text-[13px] leading-relaxed text-gray-700 shadow-sm">
        <p className="whitespace-pre-wrap break-words">{act.label}</p>
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
      </div>
    </div>
  </div>
);

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
  const [reassignName, setReassignName] = useState('');
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
    // Closing is terminal — require a comment (recorded with the closure) so the
    // reason is always captured, mirroring the maintenance issue flow.
    if (newStatus === 'closed' && !comment.trim()) {
      toast.error('Add a comment before closing.');
      return;
    }
    try {
      await dispatch(
        updateTicketStatus({
          ticketId,
          newStatus,
          ...(newStatus === 'closed' ? { comment: comment.trim() } : {}),
        })
      ).unwrap();
      if (newStatus === 'closed') setComment('');
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
    if (reassignRole === 'others' && !reassignName.trim()) {
      toast.error('Enter the assignee name');
      return;
    }
    try {
      await dispatch(
        reassignTicket({
          ticketId,
          assignedTo: reassignRole,
          assignedToName: reassignRole === 'others' && reassignName.trim() ? reassignName.trim() : undefined,
        })
      ).unwrap();
      afterMutation(
        `Reassigned to ${reassignRole === 'others' && reassignName.trim() ? reassignName.trim() : ROLE_LABELS[reassignRole]}`
      );
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

  // Timeline nodes derived from the activity history (comments excluded). Falls
  // back to a single "Raised" node for a ticket that has no activities yet.
  const timelineEvents = ticket ? ticket.activities.filter(a => a.action !== 'comment') : [];
  const timelineSteps =
    timelineEvents.length > 0
      ? timelineEvents.map(a => ({
          label: resolveActivityLabel(a),
          by: `${a.byName ? `${a.byName} · ` : ''}${formatDateTimeChicago(a.at)}`,
          action: a.action as string,
        }))
      : ticket
        ? [
            {
              label: `Raised by ${ticket.raisedByName || '—'}`,
              by: `${ticket.raisedByName ? `${ticket.raisedByName} · ` : ''}${formatDateTimeChicago(ticket.createdAt)}`,
              action: 'raised',
            },
          ]
        : [];

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
                  {ticket.facilityName ? ` · ${ticket.facilityName}` : ''}
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
              {/* Timeline — the actual activity history (comments excluded), each
                  event a node with its resolved label and the actor + time. */}
              <div className="flex items-start gap-0 overflow-x-auto pb-1">
                {timelineSteps.map((step, i) => (
                  <div key={i} className="flex min-w-[132px] flex-1 flex-col items-center">
                    <div className="flex w-full items-center">
                      <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full border-2 border-[#21295A] bg-[#21295A] text-white">
                        {stepIcon(step.action)}
                      </div>
                      {i < timelineSteps.length - 1 && <div className="h-0.5 flex-1 bg-[#21295A]/20" />}
                    </div>
                    <div className="mt-2 w-full pr-2">
                      <p className="text-[11px] font-semibold leading-tight text-gray-800">{step.label}</p>
                      <p className="mt-0.5 text-[10px] text-gray-400">{step.by}</p>
                    </div>
                  </div>
                ))}
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
                    {ticket.attachments.map((a, i) =>
                      isImageUrl(a.blobName) ? (
                        <button
                          key={i}
                          aria-label={`Open attachment ${i + 1}`}
                          className="block h-16 w-16 overflow-hidden rounded-lg border border-gray-200 bg-gray-50"
                          type="button"
                          onClick={() => setPreview(a.blobName)}
                        >
                          <img alt={`attachment ${i + 1}`} className="h-full w-full object-cover" src={a.blobName} />
                        </button>
                      ) : (
                        <a
                          key={i}
                          className="flex h-16 w-16 flex-col items-center justify-center gap-1 rounded-lg border border-gray-200 bg-gray-50 text-gray-500 hover:bg-gray-100"
                          href={a.blobName}
                          rel="noreferrer"
                          target="_blank"
                        >
                          <svg
                            className="h-5 w-5"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth={1.8}
                            viewBox="0 0 24 24"
                          >
                            <path
                              d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6zM14 2v6h6"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          </svg>
                          <span className="text-[9px] font-semibold">Open file</span>
                        </a>
                      )
                    )}
                  </div>
                </div>
              )}

              {/* Activity timeline — audit events only (status changes, assignment) */}
              <div>
                <div className="mb-2 text-[10.5px] font-semibold uppercase tracking-wider text-gray-400">Activity</div>
                <div className="flex max-h-60 flex-col gap-2.5 overflow-y-auto pr-1">
                  {ticket.activities
                    .filter(a => a.action !== 'comment')
                    .map((act, i) => (
                      <div key={i} className="flex items-start gap-2.5">
                        <span className="mt-1.5 h-2 w-2 flex-shrink-0 rounded-full bg-[#21295A]" />
                        <div className="min-w-0 text-[12px] text-gray-600">
                          <span className="font-semibold text-[#21295A]">{resolveActivityLabel(act)}</span>
                          <div className="text-[10.5px] text-gray-400">
                            {act.byName || 'System'} · {formatDateTimeChicago(act.at)}
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              </div>

              {/* Comments — actual person messages, shown as chat bubbles */}
              <div>
                <div className="mb-2 text-[10.5px] font-semibold uppercase tracking-wider text-gray-400">Comments</div>
                {ticket.activities.filter(a => a.action === 'comment').length === 0 ? (
                  <p className="text-[12px] italic text-gray-400">No comments yet.</p>
                ) : (
                  <div className="flex max-h-72 flex-col gap-3 overflow-y-auto pr-1">
                    {ticket.activities
                      .filter(a => a.action === 'comment')
                      .map((act, i) => (
                        <CommentBubble key={i} act={act} />
                      ))}
                  </div>
                )}
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
                    {transitions
                      .filter(target => target !== 'closed')
                      .map(target => (
                        <button
                          key={target}
                          className={`rounded-lg border px-3 py-2 text-[12px] font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 ${transitionBtnClass(target)}`}
                          disabled={saving}
                          type="button"
                          onClick={() => handleStatus(target)}
                        >
                          {transitionLabel(ticket.status, target)}
                        </button>
                      ))}
                  </div>

                  <div className="flex flex-wrap items-center gap-2 border-t border-gray-50 pt-3">
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
                    {reassignRole === 'others' && (
                      <input
                        className="rounded-lg border border-gray-200 bg-gray-50 px-2 py-1.5 text-[12px] outline-none focus:border-[#21295A]"
                        placeholder="Assignee name"
                        type="text"
                        value={reassignName}
                        onChange={e => setReassignName(e.target.value)}
                      />
                    )}
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

            {/* Footer — Close Issue action (mirrors the maintenance modal): the
                button lives here, and fills navy on hover once a comment exists. */}
            {isClosed ? (
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
            ) : (
              <div className="flex items-center justify-between border-t border-gray-100 px-6 py-3.5">
                <p className="text-[11.5px] text-gray-400">Add a comment above to close this issue.</p>
                <button
                  className={`rounded-lg border px-5 py-2 text-[13px] font-semibold transition-colors ${
                    comment.trim()
                      ? 'border-[#21295A] text-[#21295A] hover:bg-[#21295A] hover:text-white'
                      : 'cursor-not-allowed border-gray-200 text-gray-300'
                  }`}
                  disabled={!comment.trim() || saving}
                  type="button"
                  onClick={() => handleStatus('closed')}
                >
                  Close Issue
                </button>
              </div>
            )}
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
