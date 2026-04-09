import { useState } from 'react';

import { toast } from 'react-hot-toast';

import { updateWork } from '../../../store/maintenance/api';
import { Work, WorkActivity } from '../../../store/maintenance/types';
import { getLocalUser } from '../constants';

interface IssueDetailModalProps {
  item: Work;
  index: number;
  onClose: () => void;
  onSuccess: () => void;
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

const IssueDetailModal = ({ item, index, onClose, onSuccess, dispatch, updatedBy }: IssueDetailModalProps) => {
  const [currentItem, setCurrentItem] = useState<Work>(item);
  const [comment, setComment] = useState('');
  const [saving, setSaving] = useState(false);

  const issueNum = `ISS-${String(index + 1).padStart(3, '0')}`;
  const statusCls = statusBadgeCls[currentItem.status?.toLowerCase() || ''] || 'bg-gray-400 text-white';
  const categoryLabel = currentItem.category
    ? `Maintenance – ${currentItem.category.charAt(0).toUpperCase() + currentItem.category.slice(1)}`
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

  // Steps come directly from the activities array — each activity is one step
  const steps = acts.length > 0
    ? acts.map(a => ({
        label: resolveActivityLabel(a),
        by: `${a.byName ? `${a.byName} · ` : ''}${formatDate(a.at)}`,
        done: true,
      }))
    : [{ label: `Raised by ${resolvedRaisedBy}`, by: `${resolvedRaisedBy} · ${formatDate(currentItem.createdAt)}`, done: true }];

  // Activity log — always derived from activities array
  const activityEntries: { text: string; at: string }[] =
    acts.length > 0
      ? acts.map((a: WorkActivity) => ({ text: resolveActivityLabel(a), at: a.at }))
      : [{ text: `Issue raised by ${resolvedRaisedBy}`, at: currentItem.createdAt }];

  const callUpdate = (payload: object, onDone?: () => void) => {
    setSaving(true);
    const { name: updatedByName } = getLocalUser();
    dispatch(updateWork({
      itemId: currentItem.itemId,
      ...(updatedBy ? { updatedBy } : {}),
      ...(updatedByName ? { updatedByName } : {}),
      ...payload,
    }))
      .unwrap()
      .then((res: any) => {
        const updated = res?.data;
        if (updated?.itemId) setCurrentItem(updated);
        onSuccess();
        onDone?.();
      })
      .catch((err: any) => toast.error(err || 'Failed.'))
      .finally(() => setSaving(false));
  };

  const handleMarkInProgress = () => {
    callUpdate({ status: 'inprogress' }, () => toast.success('Issue marked as in progress.'));
  };

  const handleReassign = (team: TeamOption) => {
    callUpdate({ assignedTo: team }, () => toast.success(`Reassigned to ${teamLabel(team)}.`));
  };

  const handleSendComment = () => {
    if (!comment.trim()) return;
    callUpdate({ notes: comment.trim() }, () => {
      toast.success('Comment sent.');
      setComment('');
    });
  };

  const handleCloseIssue = () => {
    if (!comment.trim()) {
      toast.error('Add a comment before closing.');
      return;
    }
    callUpdate({ status: 'closed', notes: comment.trim() }, () => {
      toast.success('Issue closed.');
      onClose();
    });
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
            {currentItem.category && <span>{currentItem.category}</span>}
            {resolvedRaisedBy !== 'Unknown' && <><span>·</span><span>Raised by {resolvedRaisedBy}</span></>}
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
                    <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 font-bold text-sm ${
                      step.done
                        ? i === 0 ? 'border-gray-400 bg-gray-400 text-white'
                          : i === 1 ? 'border-red-500 bg-red-500 text-white'
                          : i === 2 ? 'border-purple-600 bg-purple-600 text-white'
                          : 'border-blue-500 bg-blue-500 text-white'
                        : 'border-blue-500 bg-white text-blue-600'
                    }`}>
                      {step.done ? (
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} />
                        </svg>
                      ) : (
                        i + 1
                      )}
                    </div>
                    {/* Connector line */}
                    {i < steps.length - 1 && (
                      <div className="h-0.5 flex-1 bg-green-400" />
                    )}
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
              <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-700">
                {currentItem.notes}
              </div>
            </div>
          )}

          {/* ── Activity ── */}
          <div className="border-b border-gray-100 px-6 py-4">
            <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-400">Activity</p>
            <div className="flex flex-col gap-2">
              {activityEntries.map((act, i) => (
                <div key={i} className="rounded-full border border-gray-200 bg-white px-4 py-2 text-xs text-gray-600">
                  {act.text}
                  <span className="ml-2 text-gray-400">· {formatDate(act.at)}</span>
                </div>
              ))}
            </div>
          </div>

          {/* ── Comment box — hidden when closed ── */}
          {currentItem.status !== 'closed' && <div className="border-b border-gray-100 px-6 py-4">
            <div className="rounded-xl border border-gray-200 bg-gray-50">
              <textarea
                className="w-full resize-none rounded-t-xl bg-transparent px-4 pt-3 text-sm text-gray-700 placeholder-gray-400 focus:outline-none"
                placeholder="Add a comment... (required to close)"
                rows={3}
                value={comment}
                onChange={e => setComment(e.target.value)}
              />
              <div className="flex items-center justify-between border-t border-gray-200 px-4 py-2">
                <label className="flex cursor-pointer items-center gap-1.5 text-xs text-gray-400 hover:text-gray-600" htmlFor="issue-comment-file">
                  <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} />
                  </svg>
                  Attach file
                </label>
                <input className="hidden" id="issue-comment-file" multiple={true} type="file" />
                <button
                  className="rounded-lg bg-[#21295A] px-4 py-1.5 text-xs font-semibold text-white hover:bg-[#1a2149] disabled:opacity-40"
                  disabled={!comment.trim() || saving}
                  type="button"
                  onClick={handleSendComment}
                >
                  Send
                </button>
              </div>
            </div>
          </div>}

          {/* ── Assign / action footer ── */}
          <div className="bg-blue-50/60 px-6 py-4">
            <div className="flex flex-wrap items-center gap-3">
              <p className="text-sm font-semibold text-gray-800">
                Assigned to:{' '}
                <span className="text-teal-600">{assignedTo ? teamLabel(assignedTo) : '—'}</span>
              </p>
              {currentItem.status !== 'inprogress' && currentItem.status !== 'resolved' && currentItem.status !== 'closed' && (
                <button
                  className="rounded-lg bg-[#21295A] px-4 py-2 text-xs font-semibold text-white hover:bg-[#1a2149] disabled:opacity-50"
                  disabled={saving}
                  type="button"
                  onClick={handleMarkInProgress}
                >
                  Mark In Progress
                </button>
              )}
              {currentItem.status !== 'closed' && reassignTargets.length > 0 && (
                <>
                  <span className="text-xs text-gray-400">or reassign to:</span>
                  {reassignTargets.map(team => (
                    <button
                      key={team}
                      className={`rounded-lg px-4 py-2 text-xs font-semibold transition-colors disabled:opacity-50 ${teamColor[team]}`}
                      disabled={saving}
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
              disabled={!comment.trim() || saving}
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
