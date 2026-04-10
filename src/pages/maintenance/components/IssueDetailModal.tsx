import { useEffect, useRef, useState } from 'react';

import { toast } from 'react-hot-toast';
import { useSelector } from 'react-redux';

import { deleteWorkMedia, getWorkUploadUrl, updateWork, uploadFileToBlob } from '../../../store/maintenance/api';
import { Work, WorkActivity } from '../../../store/maintenance/types';
import { RootState } from '../../../store/store';
import { FACILITY_CODE, getLocalUser } from '../constants';

interface IssueDetailModalProps {
  item: Work;
  index: number;
  onClose: () => void;
  onSuccess: (prevStatus?: string, newStatus?: string) => void;
  dispatch: any;
  updatedBy: string;
}

type TeamOption = 'centre_staff' | 'noc' | 'others';

const teamLabel = (t: string) =>
  t === 'centre_staff' ? 'Centre Staff' : t === 'noc' ? 'NOC' : t === 'admin' ? 'Admin' : 'Others';

const teamColor: Record<string, string> = {
  centre_staff: 'bg-teal-500 text-white hover:bg-teal-600',
  noc: 'bg-orange-500 text-white hover:bg-orange-600',
  others: 'bg-purple-600 text-white hover:bg-purple-700',
};

const statusBadgeCls: Record<string, string> = {
  open: 'bg-orange-500 text-white',
  assigned: 'bg-orange-500 text-white',
  issue: 'bg-orange-500 text-white',
  inprogress: 'bg-blue-500 text-white',
  resolved: 'bg-green-500 text-white',
  closed: 'bg-gray-400 text-white',
};

const ALL_TEAMS: TeamOption[] = ['centre_staff', 'noc', 'others'];

const CommentBubble = ({
  act,
  formatDate,
}: {
  act: { text: string; at: string; byName: string | null; attachmentUrl: string | null };
  formatDate: (d: string) => string;
}) => {
  const [showAtt, setShowAtt] = useState(false);
  const url = act.attachmentUrl || '';
  const ext = url.split('?')[0].split('.').pop()?.toLowerCase() || '';
  const isVideo = ['mp4', 'mov', 'avi', 'webm', 'mkv'].includes(ext);

  return (
    <div className="flex items-start gap-2.5">
      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#21295A] text-[10px] font-bold text-white">
        {act.byName ? act.byName.charAt(0).toUpperCase() : '?'}
      </div>
      <div className="flex flex-col gap-0.5">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-gray-700">{act.byName || 'Unknown'}</span>
          <span className="text-[10px] text-gray-400">{formatDate(act.at)}</span>
        </div>
        <div className="rounded-2xl rounded-tl-none border border-gray-200 bg-white px-4 py-2 text-sm text-gray-700 shadow-sm">
          {act.text}
        </div>
        {act.attachmentUrl && (
          <div className="mt-1">
            <button
              className="flex items-center gap-1.5 text-xs font-medium text-indigo-600 hover:text-indigo-700"
              type="button"
              onClick={() => setShowAtt(prev => !prev)}
            >
              <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                />
              </svg>
              {showAtt ? 'Hide attachment' : 'View attachment'}
            </button>
            {showAtt && (
              <div className="mt-2">
                {isVideo ? (
                  <video controls className="max-w-xs rounded-xl bg-black" src={url}>
                    <track kind="captions" />
                  </video>
                ) : (
                  <a href={url} rel="noreferrer" target="_blank">
                    <img
                      alt="Comment attachment"
                      className="max-w-xs rounded-xl border border-gray-100 object-cover hover:opacity-90"
                      src={url}
                    />
                  </a>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

const IssueDetailModal = ({ item, index, onClose, onSuccess, dispatch, updatedBy }: IssueDetailModalProps) => {
  const [currentItem, setCurrentItem] = useState<Work>(item);
  const [comment, setComment] = useState('');
  const [commentAttachment, setCommentAttachment] = useState<string | null>(null);
  const [attaching, setAttaching] = useState(false);
  const [showAttachments, setShowAttachments] = useState(false);
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Sync with fresh data whenever the issue list refreshes after an action
  const workList = useSelector((state: RootState) => state.maintenance.workList);
  useEffect(() => {
    if (!workList?.items?.length) return;
    const fresh = workList.items.find((i: Work) => i.itemId === item.itemId);
    if (fresh) setCurrentItem(fresh);
  }, [workList, item.itemId]);

  const issueNum = `ISS-${String(index + 1).padStart(3, '0')}`;
  const statusCls = statusBadgeCls[currentItem.status?.toLowerCase() || ''] || 'bg-gray-400 text-white';
  const categoryLabel = currentItem.category
    ? `Maintenance – ${currentItem.category.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}`
    : 'Maintenance';

  const assignedTo = (currentItem.assignedTo || '') as TeamOption;
  const reassignTargets = ALL_TEAMS.filter(t => t !== assignedTo);

  const formatDate = (d: string) =>
    new Date(d).toLocaleString('en-US', { month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit' });

  const acts = currentItem.activities || [];
  const raisedAct = acts.find(a => a.action === 'raised');
  const resolvedRaisedBy = raisedAct?.byName || currentItem.raisedByName || currentItem.createdBy || 'Unknown';

  // Translate raw team IDs in activity labels to friendly names
  const resolveActivityLabel = (a: WorkActivity) => {
    if ((a.action === 'assigned' || a.action === 'reassigned') && a.toId) {
      const verb = a.action === 'reassigned' ? 'Reassigned' : 'Assigned';
      const team = a.toName || teamLabel(a.toId);
      const by = a.byName ? ` by ${a.byName}` : '';
      return `${verb} to ${team}${by}`;
    }
    return a.label;
  };

  // Steps come directly from the activities array — comments excluded from timeline
  const timelineActs = acts.filter(a => a.action !== 'comment');
  const steps =
    timelineActs.length > 0
      ? timelineActs.map(a => ({
          label: resolveActivityLabel(a),
          by: `${a.byName ? `${a.byName} · ` : ''}${formatDate(a.at)}`,
          done: true,
          action: a.action,
        }))
      : [
          {
            label: `Raised by ${resolvedRaisedBy}`,
            by: `${resolvedRaisedBy} · ${formatDate(currentItem.createdAt)}`,
            done: true,
            action: 'raised',
          },
        ];

  const stepIcon = (action: string) => {
    if (action === 'inprogress')
      return (
        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2.5}
          />
        </svg>
      );
    if (action === 'closed')
      return (
        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path d="M6 18L18 6M6 6l12 12" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} />
        </svg>
      );
    if (action === 'reassigned')
      return (
        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2.5}
          />
        </svg>
      );
    if (action === 'assigned')
      return (
        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2.5}
          />
        </svg>
      );
    return (
      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} />
      </svg>
    );
  };

  // Activity log — always derived from activities array
  const activityEntries: {
    text: string;
    at: string;
    action: string;
    byName: string | null;
    attachmentUrl: string | null;
  }[] =
    acts.length > 0
      ? acts.map((a: WorkActivity) => ({
          text: resolveActivityLabel(a),
          at: a.at,
          action: a.action,
          byName: a.byName,
          attachmentUrl: a.attachmentUrl || null,
        }))
      : [
          {
            text: `Issue raised by ${resolvedRaisedBy}`,
            at: currentItem.createdAt,
            action: 'raised',
            byName: resolvedRaisedBy,
            attachmentUrl: null,
          },
        ];

  const callUpdate = (payload: object, patch: Partial<Work>, onDone?: () => void) => {
    setSaving(true);
    const { name: updatedByName } = getLocalUser();
    const prevStatus = currentItem.status ?? undefined;
    const newStatus = (payload as Record<string, unknown>).status as string | undefined;
    dispatch(
      updateWork({
        itemId: currentItem.itemId,
        ...(updatedBy ? { updatedBy } : {}),
        ...(updatedByName ? { updatedByName } : {}),
        ...payload,
      })
    )
      .unwrap()
      .then((res: any) => {
        const serverData = res?.data;
        // patch always wins — server data fills in activity list etc. but cannot revert known changes
        setCurrentItem(prev => ({
          ...prev,
          ...(serverData?.itemId ? serverData : {}),
          ...patch,
        }));
        onSuccess(prevStatus, newStatus);
        onDone?.();
      })
      .catch((err: any) => toast.error(err || 'Failed.'))
      .finally(() => setSaving(false));
  };

  const handleMarkInProgress = () => {
    callUpdate({ status: 'inprogress' }, { status: 'inprogress' }, () => toast.success('Issue marked as in progress.'));
  };

  const handleReassign = (team: TeamOption) => {
    callUpdate({ assignedTo: team }, { assignedTo: team }, () => toast.success(`Reassigned to ${teamLabel(team)}.`));
  };

  const handleAttachFile = async (file: File) => {
    setAttaching(true);
    try {
      const { uploadUrl, blobName } = await getWorkUploadUrl(FACILITY_CODE, file.name);
      await uploadFileToBlob(uploadUrl, file);
      setCommentAttachment(blobName);
    } catch {
      toast.error('Failed to upload attachment.');
    } finally {
      setAttaching(false);
    }
  };

  const handleRemoveCommentAttachment = () => {
    if (commentAttachment) void deleteWorkMedia(commentAttachment);
    setCommentAttachment(null);
  };

  const handleSendComment = () => {
    if (!comment.trim()) return;
    callUpdate({ comment: comment.trim(), ...(commentAttachment ? { commentAttachment } : {}) }, {}, () => {
      toast.success('Comment sent.');
      setComment('');
      setCommentAttachment(null);
    });
  };

  const handleCloseIssue = () => {
    if (!comment.trim()) {
      toast.error('Add a comment before closing.');
      return;
    }
    callUpdate(
      { status: 'closed', comment: comment.trim(), ...(commentAttachment ? { commentAttachment } : {}) },
      { status: 'closed' },
      () => {
        toast.success('Issue closed.');
        onClose();
      }
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        {/* ── Header ── */}
        <div className="border-b border-gray-100 px-6 py-5">
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="font-mono text-sm text-gray-400">{issueNum}</span>
              <span className="h-2 w-2 rounded-full bg-green-500" />
              <span className={`rounded-full px-3 py-0.5 text-xs font-semibold capitalize ${statusCls}`}>
                {currentItem.status}
              </span>
            </div>
            <button className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100" type="button" onClick={onClose}>
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path d="M6 18L18 6M6 6l12 12" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} />
              </svg>
            </button>
          </div>
          <p className="text-xl font-bold text-gray-900">{currentItem.title}</p>
          <div className="mt-1.5 flex flex-wrap items-center gap-2 text-sm text-gray-500">
            {currentItem.laneNo && <span>Lane {currentItem.laneNo}</span>}
            {currentItem.laneNo && currentItem.category && <span>·</span>}
            {currentItem.category && (
              <span>{currentItem.category.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}</span>
            )}
            {resolvedRaisedBy !== 'Unknown' && (
              <>
                <span>·</span>
                <span>Raised by {resolvedRaisedBy}</span>
              </>
            )}
            <span>·</span>
            <span>{formatDate(currentItem.createdAt)}</span>
            <span className="rounded-full bg-orange-500 px-3 py-0.5 text-xs font-semibold text-white">
              {categoryLabel}
            </span>
          </div>
        </div>

        <div className="overflow-y-auto">
          {/* ── Timeline ── */}
          <div className="border-b border-gray-100 px-6 py-5">
            <div className="flex items-start gap-0 overflow-x-auto">
              {steps.map((step, i) => (
                <div key={i} className="flex min-w-[140px] flex-1 flex-col items-center">
                  <div className="flex w-full items-center">
                    {/* Circle */}
                    <div
                      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 text-sm font-bold ${
                        step.done
                          ? 'border-[#21295A] bg-[#21295A] text-white'
                          : 'border-[#21295A] bg-white text-[#21295A]'
                      }`}
                    >
                      {step.done ? stepIcon(step.action) : i + 1}
                    </div>
                    {/* Connector line */}
                    {i < steps.length - 1 && <div className="h-0.5 flex-1 bg-[#21295A]/20" />}
                  </div>
                  <div className="mt-2 w-full pr-2">
                    <p className="text-xs font-semibold text-gray-800">{step.label}</p>
                    <p className="text-[10px] text-gray-400">{step.by}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ── Notes ── */}
          {currentItem.notes && (
            <div className="border-b border-gray-100 px-6 py-4">
              <div className="whitespace-pre-wrap break-all rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-700">
                {currentItem.notes}
              </div>
            </div>
          )}

          {/* ── Attachments ── */}
          {currentItem.attachments && currentItem.attachments.length > 0 && (
            <div className="border-b border-gray-100 px-6 py-4">
              <button
                className="flex items-center gap-2 text-xs font-semibold text-indigo-600 hover:text-indigo-700"
                type="button"
                onClick={() => setShowAttachments(prev => !prev)}
              >
                <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                  />
                </svg>
                {showAttachments ? 'Hide' : 'View'} Attachments ({currentItem.attachments.length})
              </button>
              {showAttachments && (
                <div className="mt-3 flex flex-wrap gap-3">
                  {currentItem.attachments.map((att, i) => {
                    const url = att.blobName;
                    const ext = url.split('?')[0].split('.').pop()?.toLowerCase() || '';
                    const isVideo = ['mp4', 'mov', 'avi', 'webm', 'mkv'].includes(ext);
                    return isVideo ? (
                      <video
                        key={i}
                        controls
                        className="rounded-lg bg-black"
                        src={url}
                        style={{ maxHeight: 140, maxWidth: '100%' }}
                      >
                        <track kind="captions" />
                      </video>
                    ) : (
                      <a key={i} href={url} rel="noreferrer" target="_blank">
                        <img
                          alt={`Attachment ${i + 1}`}
                          className="rounded-lg border border-gray-100 object-cover hover:opacity-90"
                          src={url}
                          style={{ height: 100, width: 100 }}
                        />
                      </a>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ── Activity ── */}
          <div className="border-b border-gray-100 px-6 py-4">
            <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-400">Activity</p>
            <div className="flex max-h-64 flex-col gap-3 overflow-y-auto pr-1">
              {activityEntries.map((act, i) =>
                act.action === 'comment' ? (
                  /* Chat bubble — left aligned with avatar */
                  <CommentBubble key={i} act={act} formatDate={formatDate} />
                ) : (
                  /* Centered pill for system events */
                  <div key={i} className="flex items-center justify-center">
                    <div className="rounded-full border border-gray-200 bg-white px-4 py-1.5 text-xs text-gray-500">
                      {act.text}
                      <span className="ml-2 text-gray-400">· {formatDate(act.at)}</span>
                    </div>
                  </div>
                )
              )}
            </div>
          </div>

          {/* ── Comment box — hidden when closed ── */}
          {currentItem.status !== 'closed' && (
            <div className="border-b border-gray-100 px-6 py-4">
              <div className="rounded-xl border border-gray-200 bg-gray-50">
                <textarea
                  className="w-full resize-none rounded-t-xl bg-transparent px-4 pt-3 text-sm text-gray-700 placeholder-gray-400 focus:outline-none"
                  placeholder="Add a comment... (required to close)"
                  rows={3}
                  value={comment}
                  onChange={e => setComment(e.target.value)}
                />
                <div className="border-t border-gray-200 px-4 py-2">
                  {commentAttachment && (
                    <div className="mb-2 flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-3 py-1.5">
                      <svg
                        className="h-3.5 w-3.5 shrink-0 text-gray-400"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                        />
                      </svg>
                      <span className="flex-1 truncate text-xs text-gray-600">
                        {commentAttachment.split('/').pop()}
                      </span>
                      <button
                        className="text-xs text-red-400 hover:text-red-600"
                        type="button"
                        onClick={handleRemoveCommentAttachment}
                      >
                        Remove
                      </button>
                    </div>
                  )}
                  <div className="flex items-center justify-between">
                    <button
                      className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-600 disabled:opacity-40"
                      disabled={attaching || !!commentAttachment}
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path
                          d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                        />
                      </svg>
                      {attaching ? 'Uploading...' : 'Attach file'}
                    </button>
                    <input
                      ref={fileInputRef}
                      className="hidden"
                      type="file"
                      onChange={e => {
                        if (e.target.files?.[0]) handleAttachFile(e.target.files[0]);
                        e.target.value = '';
                      }}
                    />
                    <button
                      className="rounded-lg bg-[#21295A] px-4 py-1.5 text-xs font-semibold text-white hover:bg-[#1a2149] disabled:opacity-40"
                      disabled={!comment.trim() || saving || attaching}
                      type="button"
                      onClick={handleSendComment}
                    >
                      {saving ? 'Sending...' : 'Send'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── Assign / action footer ── */}
          <div className="px-6 py-4">
            <div className="rounded-xl border border-blue-100 bg-blue-50 p-4">
              <p className="mb-3 text-sm font-bold text-gray-800">
                Assigned to: <span className="text-blue-600">{assignedTo ? teamLabel(assignedTo) : '—'}</span>
              </p>
              <div className="flex flex-wrap items-center gap-3">
                {currentItem.status !== 'inprogress' &&
                  currentItem.status !== 'resolved' &&
                  currentItem.status !== 'closed' && (
                    <button
                      className="rounded-lg bg-[#21295A] px-5 py-2 text-sm font-semibold text-white hover:bg-[#1a2149] disabled:opacity-50"
                      disabled={saving || attaching}
                      type="button"
                      onClick={handleMarkInProgress}
                    >
                      Mark In Progress
                    </button>
                  )}
                {currentItem.status !== 'closed' && reassignTargets.length > 0 && (
                  <>
                    <span className="text-sm text-gray-500">or reassign to:</span>
                    {reassignTargets.map(team => (
                      <button
                        key={team}
                        className={`rounded-lg px-5 py-2 text-sm font-semibold transition-colors disabled:opacity-50 ${teamColor[team]}`}
                        disabled={saving || attaching}
                        type="button"
                        onClick={() => handleReassign(team)}
                      >
                        {teamLabel(team)}
                      </button>
                    ))}
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ── Close footer — hidden once closed ── */}
        {currentItem.status !== 'closed' && (
          <div className="flex items-center justify-between border-t border-gray-100 px-6 py-3">
            <p className="text-xs text-gray-400">Add a comment above to close this issue.</p>
            <button
              className={`rounded-lg border px-5 py-2 text-sm font-semibold transition-colors ${
                comment.trim()
                  ? 'border-[#21295A] text-[#21295A] hover:bg-[#21295A] hover:text-white'
                  : 'cursor-not-allowed border-gray-200 text-gray-300'
              }`}
              disabled={!comment.trim() || saving || attaching}
              type="button"
              onClick={handleCloseIssue}
            >
              Close Issue
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default IssueDetailModal;
