import React, { useEffect, useState } from 'react';

import { toast } from 'react-hot-toast';
import { useDispatch, useSelector } from 'react-redux';

import { AppDispatch, RootState } from '../../../store/store';
import {
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
  PRIORITY_SLA,
  ROLE_LABELS,
  SELECTABLE_STATUSES,
  STATUS_META,
  TICKET_ROLES,
} from '../constants';

import EmailTagInput from './EmailTagInput';
import StaffAssigneeSelect from './StaffAssigneeSelect';

import type { Ticket, TicketActivity, TicketRole, TicketStatus } from '../../../store/tickets/types';

const compactFieldClass =
  'rounded-lg border border-gray-200 bg-gray-50 px-2 py-1.5 text-[12px] outline-none focus:border-[#21295A]';
const compactLabelClass = 'mb-1 block text-[10.5px] font-semibold uppercase tracking-wider text-gray-400';

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

interface Props {
  ticketId: string;
  onClose: () => void;
  onChanged: () => void;
  /** When false, the drawer is read-only — no status change, comment, attach, or reassign. */
  canEdit?: boolean;
}

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

// On read the backend swaps `blobName` for a SAS URL; guard both assumptions here so a
// raw blobName / expired SAS degrades to a neutral tile instead of a broken image.
const isVideoSrc = (src: string): boolean => /\.(mp4|webm|ogg|mov|m4v)(\?|$)/i.test(src);
const isHttpUrl = (src: string): boolean => /^https?:\/\//i.test(src);

const FileGlyph: React.FC = () => (
  <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={1.75} viewBox="0 0 24 24">
    <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
    <polyline points="14 2 14 8 20 8" />
  </svg>
);

/** Attachment thumbnail — image or video, with a graceful fallback when the source isn't
 *  a usable URL (raw blobName) or fails to load. Purely presentational; no flow impact. */
const AttachmentThumb: React.FC<{ src: string; index: number; onOpen: () => void }> = ({ src, index, onOpen }) => {
  const [failed, setFailed] = useState(false);
  const video = isVideoSrc(src);
  const previewable = isHttpUrl(src) && !failed;

  if (!previewable) {
    return (
      <div
        className="flex h-16 w-16 flex-col items-center justify-center gap-0.5 rounded-lg border border-gray-200 bg-gray-50 text-gray-400"
        title="Preview unavailable"
      >
        <FileGlyph />
        <span className="text-[9px] font-medium">{video ? 'Video' : 'File'}</span>
      </div>
    );
  }

  return (
    <button
      aria-label={`Open attachment ${index + 1}`}
      className="relative block h-16 w-16 overflow-hidden rounded-lg border border-gray-200 bg-gray-50"
      type="button"
      onClick={onOpen}
    >
      {video ? (
        // eslint-disable-next-line jsx-a11y/media-has-caption
        <video
          muted
          playsInline
          className="h-full w-full object-cover"
          preload="metadata"
          src={src}
          onError={() => setFailed(true)}
        />
      ) : (
        <img
          alt={`attachment ${index + 1}`}
          className="h-full w-full object-cover"
          src={src}
          onError={() => setFailed(true)}
        />
      )}
      {video && (
        <span className="absolute inset-0 flex items-center justify-center bg-black/20 text-white">
          <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M8 5v14l11-7z" />
          </svg>
        </span>
      )}
    </button>
  );
};

const TicketDetailDrawer: React.FC<Props> = ({ ticketId, onClose, onChanged, canEdit = true }) => {
  const dispatch = useDispatch<AppDispatch>();
  const { current, detailLoading, saving } = useSelector((state: RootState) => state.tickets);
  const [comment, setComment] = useState('');
  const [reassignRole, setReassignRole] = useState<TicketRole>('noc');
  const [reassignId, setReassignId] = useState('');
  const [reassignName, setReassignName] = useState('');
  const [reassignRecipients, setReassignRecipients] = useState<string[]>([]);
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
    // A comment is optional on close — if one has been typed it is recorded with
    // the closure, otherwise the ticket simply closes.
    try {
      await dispatch(
        updateTicketStatus({
          ticketId,
          newStatus,
          ...(newStatus === 'closed' && comment.trim() ? { comment: comment.trim() } : {}),
        })
      ).unwrap();
      if (newStatus === 'closed') setComment('');
      afterMutation(`Ticket moved to ${STATUS_META[newStatus].label}`);
    } catch (e) {
      toast.error(typeof e === 'string' ? e : 'Could not update status');
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
    if (reassignRole === 'others' && !reassignId) {
      toast.error('Select an assignee');
      return;
    }
    try {
      const updated = await dispatch(
        reassignTicket({
          ticketId,
          assignedTo: reassignRole,
          assignedToId: reassignRole === 'others' && reassignId ? reassignId : undefined,
          assignedToName: reassignRole === 'others' && reassignName.trim() ? reassignName.trim() : undefined,
          additionalRecipients: reassignRecipients.length ? reassignRecipients : undefined,
        })
      ).unwrap();
      afterMutation(
        `Reassigned to ${reassignRole === 'others' && reassignName.trim() ? reassignName.trim() : ROLE_LABELS[reassignRole]}`
      );
      notifyEmailOutcome(updated);
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

  // Status selector options: the simplified Open → In Progress → Closed set,
  // plus the ticket's current status if it is a legacy value (noc/verify) so the
  // dropdown always reflects reality.
  const statusOptions: TicketStatus[] = ticket
    ? SELECTABLE_STATUSES.includes(ticket.status)
      ? SELECTABLE_STATUSES
      : [ticket.status, ...SELECTABLE_STATUSES]
    : SELECTABLE_STATUSES;

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
              {/* Activity timeline — the actual activity history (comments
                  excluded), each event a node with its resolved label and the
                  actor + time. */}
              <div>
                <div className="mb-2 text-[10.5px] font-semibold uppercase tracking-wider text-gray-400">Activity</div>
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
              </div>

              {/* Meta grid */}
              <div className="grid grid-cols-2 gap-3 rounded-xl border border-gray-100 bg-gray-50 p-3">
                <Row label="Status">
                  {/* Inline status selector — Open → In Progress → Closed.
                      Read-only users see the status as a static pill instead. */}
                  {canEdit ? (
                    <select
                      className={`rounded-lg border border-gray-200 bg-white px-2.5 py-1 text-[12px] font-semibold outline-none focus:border-[#21295A] disabled:cursor-not-allowed disabled:opacity-60 ${STATUS_META[ticket.status].pill}`}
                      disabled={saving}
                      value={ticket.status}
                      onChange={e => handleStatus(e.target.value as TicketStatus)}
                    >
                      {statusOptions.map(s => (
                        <option key={s} value={s}>
                          {STATUS_META[s].label}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${STATUS_META[ticket.status].pill}`}
                    >
                      {STATUS_META[ticket.status].label}
                    </span>
                  )}
                </Row>
                <Row label="Assigned To">
                  {ticket.assignedToName ||
                    (ticket.assignedTo
                      ? (ROLE_LABELS[ticket.assignedTo as TicketRole] ?? ticket.assignedTo)
                      : 'Unassigned')}
                </Row>
                {ticket.additionalRecipients && ticket.additionalRecipients.length > 0 && (
                  <div className="col-span-2">
                    <div className="text-[10.5px] font-semibold uppercase tracking-wider text-gray-400">
                      Additional Recipients
                    </div>
                    <div className="mt-0.5 text-[12px] font-medium text-gray-600">
                      {ticket.additionalRecipients.join(', ')}
                    </div>
                  </div>
                )}
                <Row label="Priority SLA">
                  <span className="inline-flex items-center gap-1.5">
                    <span className={`h-1.5 w-1.5 rounded-full ${PRIORITY_META[ticket.priority].dot}`} />
                    <span className={`font-semibold ${PRIORITY_META[ticket.priority].text}`}>
                      {PRIORITY_META[ticket.priority].label}
                    </span>
                    <span className="text-gray-400">·</span>
                    <span className="text-gray-500">Resolve within {PRIORITY_SLA[ticket.priority].label}</span>
                  </span>
                </Row>
                {ticket.customerEmail && (
                  <Row label="Customer Email">
                    <a className="text-[#21295A] underline" href={`mailto:${ticket.customerEmail}`}>
                      {ticket.customerEmail}
                    </a>
                  </Row>
                )}
                {ticket.task && <Row label="Task">{ticket.task}</Row>}
                {ticket.equipment && ticket.equipment.length > 0 && (
                  <Row label="Equipment">{ticket.equipment.join(', ')}</Row>
                )}
              </div>

              {/* Description — highlighted so the incident detail stands out */}
              <div>
                <div className="mb-1.5 text-[10.5px] font-semibold uppercase tracking-wider text-gray-400">
                  Description
                </div>
                <div className="rounded-xl border border-[#21295A]/15 bg-[#f5f6fb] px-4 py-3">
                  <p className="whitespace-pre-wrap text-[13px] leading-relaxed text-gray-800">
                    {ticket.description || 'No description provided.'}
                  </p>
                  {ticket.task && (
                    <div className="mt-2 flex flex-wrap items-center gap-1.5 border-t border-[#21295A]/10 pt-2 text-[12px]">
                      <span className="font-semibold text-gray-500">Sub-type:</span>
                      <span className="rounded-md bg-white px-2 py-0.5 font-medium text-[#21295A] shadow-sm">
                        {ticket.task}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Attachments */}
              {ticket.attachments.length > 0 && (
                <div>
                  <div className="mb-1.5 text-[10.5px] font-semibold uppercase tracking-wider text-gray-400">
                    Attachments
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {ticket.attachments.map((a, i) => (
                      <AttachmentThumb key={i} index={i} src={a.blobName} onOpen={() => setPreview(a.blobName)} />
                    ))}
                  </div>
                </div>
              )}

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
              ) : !canEdit ? (
                <div className="rounded-lg bg-gray-50 px-3 py-2 text-center text-[12px] font-medium text-gray-500">
                  You have view-only access to tickets.
                </div>
              ) : (
                <div className="space-y-3">
                  <div>
                    <div className="mb-1.5 text-[10.5px] font-semibold uppercase tracking-wider text-gray-400">
                      Add note / comment
                    </div>
                    <textarea
                      className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-[13px] outline-none focus:border-[#21295A] focus:bg-white"
                      placeholder="Add an incident note or comment…"
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

                  <div className="flex flex-wrap items-center gap-2 border-t border-gray-50 pt-3">
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
                      <StaffAssigneeSelect
                        className="rounded-lg border border-gray-200 bg-gray-50 px-2 py-1.5 text-[12px] outline-none focus:border-[#21295A]"
                        facilityCode={ticket?.facilityCode}
                        value={reassignId}
                        onChange={(id, name) => {
                          setReassignId(id);
                          setReassignName(name);
                        }}
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

                  <EmailTagInput
                    emails={reassignRecipients}
                    fieldClass={compactFieldClass}
                    label="CC emails (optional)"
                    labelClass={compactLabelClass}
                    onChange={setReassignRecipients}
                  />
                </div>
              )}
            </div>

            {/* Footer — metadata only. Status changes (including Close) happen via
                the Status selector above, so no action button lives here. */}
            <div className="flex items-center justify-between border-t border-gray-100 px-6 py-3.5">
              <span className="text-[11.5px] text-gray-400">
                Raised by {ticket.raisedByName || '—'} · {formatDateTimeChicago(ticket.createdAt)}
              </span>
              {isClosed && ticket.closedByName && (
                <span className="text-[11.5px] font-semibold text-emerald-600">Closed by {ticket.closedByName}</span>
              )}
            </div>
          </>
        )}
      </div>

      {/* In-page media preview — opens over the drawer, click the backdrop to close. */}
      {preview && (
        // eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions
        <div
          className="fixed inset-0 z-[700] flex items-center justify-center bg-black/80 p-6"
          onClick={() => setPreview(null)}
        >
          {isVideoSrc(preview) ? (
            // eslint-disable-next-line jsx-a11y/media-has-caption
            <video
              autoPlay
              controls
              className="max-h-full max-w-full rounded-lg"
              src={preview}
              onClick={e => e.stopPropagation()}
            />
          ) : (
            <img alt="attachment preview" className="max-h-full max-w-full rounded-lg object-contain" src={preview} />
          )}
        </div>
      )}
    </div>
  );
};

export default TicketDetailDrawer;
