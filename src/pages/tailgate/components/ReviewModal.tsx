import { useState } from 'react';

import { useDispatch } from 'react-redux';

import { AppDispatch } from '../../../store/store';
import { submitTailgateReview } from '../../../store/tailgate/api';
import { TailgateLog } from '../../../store/tailgate/types';
import { getEventDisplayType, getLogDate, getLogStatus, getLogTime } from '../utils';

interface ReviewModalProps {
  log: TailgateLog;
  onClose: () => void;
  onSave: (isViolation: boolean) => void;
}

const inputCls =
  'w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-[13px] text-gray-700 outline-none transition focus:border-[#21295A] focus:bg-white focus:ring-2 focus:ring-[#21295A]/10';
const labelCls = 'mb-1 block text-[11px] font-semibold uppercase tracking-wider text-gray-400';

const SUBSCRIPTIONS = ['Standard', 'Premium', 'Family', 'Offpeak'];

const ReviewModal = ({ log, onClose, onSave }: ReviewModalProps) => {
  const dispatch = useDispatch<AppDispatch>();
  const currentStatus = getLogStatus(log);
  const isPending = currentStatus === 'pending';
  const evType = getEventDisplayType(log.eventType);

  const initMemberType = (): 'Member' | 'Non-Member' | '' => {
    const mt = log.review?.memberType;
    if (mt === 'member') return 'Member';
    if (mt === 'non-member') return 'Non-Member';
    return '';
  };

  const [isViolation, setIsViolation] = useState(
    currentStatus === 'violation' || (isPending && evType === 'Tailgate')
  );
  const [notes, setNotes] = useState(log.review?.comment || '');
  const [memberName, setMemberName] = useState(log.review?.memberName || log.actor?.name || '');
  const [memberType, setMemberType] = useState<'Member' | 'Non-Member' | ''>(initMemberType());
  const [memberId, setMemberId] = useState(log.review?.memberId || log.actor?.id || '');
  const [subscription, setSubscription] = useState(log.review?.subscription || '');
  const initActualEventType = (): 'Entry' | 'Exit' | '' => {
    const saved = log.review?.actualEventType?.toLowerCase();
    if (saved === 'entry') return 'Entry';
    if (saved === 'exit') return 'Exit';
    return evType !== 'Tailgate' ? evType : '';
  };
  const [actualEventType, setActualEventType] = useState<'Entry' | 'Exit' | ''>(initActualEventType());
  const [validationError, setValidationError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isMember = memberType === 'Member';

  const handleSave = async () => {
    setValidationError('');
    setIsSubmitting(true);
    const result = await dispatch(
      submitTailgateReview({
        id: log.id,
        comment: notes.trim(),
        memberName: memberName.trim() || null,
        memberType: memberType ? memberType.toLowerCase() : null,
        memberId: isMember ? memberId.trim() || null : null,
        subscription: isMember ? subscription || null : null,
        isViolation,
        actualEventType: !isViolation ? (actualEventType ? actualEventType.toUpperCase() : null) : null,
      })
    );
    setIsSubmitting(false);
    if (submitTailgateReview.rejected.match(result)) {
      setValidationError((result.payload as string) || 'Failed to submit review.');
      return;
    }
    onSave(isViolation);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      role="presentation"
      onClick={onClose}
      onKeyDown={onClose}
    >
      <div
        className="w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl"
        role="presentation"
        style={{ maxHeight: '90vh', overflowY: 'auto' }}
        onClick={e => e.stopPropagation()}
        onKeyDown={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
          <div>
            <p className="text-[14px] font-bold text-[#21295A]">
              {isPending
                ? 'Review Unidentified Entry'
                : `Edit Review${log.review?.memberName ? ` – ${log.review.memberName}` : ''}`}
            </p>
            <p className="text-[11px] text-gray-400">
              {getLogDate(log)} · {getLogTime(log)} · {log.door?.name}
            </p>
          </div>
          <button
            className="flex h-7 w-7 items-center justify-center rounded-lg bg-gray-100 text-gray-500 hover:bg-gray-200"
            type="button"
            onClick={onClose}
          >
            ✕
          </button>
        </div>

        <div className="space-y-4 p-5">
          {/* Video / Snapshot */}
          {log.videoUrl ? (
            <video controls className="w-full rounded-xl" preload="metadata" src={log.videoUrl}>
              <track kind="captions" label="Captions" srcLang="en" />
            </video>
          ) : log.snapshotUrl ? (
            <img alt="Event snapshot" className="w-full rounded-xl object-cover" src={log.snapshotUrl} />
          ) : (
            <div className="flex h-36 items-center justify-center rounded-xl bg-[#1a2340]">
              <div className="flex flex-col items-center gap-1.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-full border-2 border-white/30 bg-white/10">
                  <svg className="h-4 w-4 text-white/60" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                </div>
                <p className="text-[11px] text-white/50">No video available</p>
              </div>
            </div>
          )}

          {/* Metadata */}
          <div className="grid grid-cols-2 gap-3 rounded-xl border border-gray-100 bg-gray-50 px-4 py-3">
            {[
              ['Date', getLogDate(log)],
              ['Time', getLogTime(log)],
              ['Event Type', evType],
              ['Lane Door', log.door?.name ?? '—'],
            ].map(([l, v]) => (
              <div key={l}>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">{l}</p>
                <p className="text-[13px] font-semibold text-[#21295A]">{v}</p>
              </div>
            ))}
          </div>

          {/* Admin Review section */}
          <div>
            <div className="mb-3 flex items-center gap-2">
              <svg className="h-3.5 w-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.8}
                />
              </svg>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">Admin Review</p>
            </div>

            <div className="space-y-3">
              {/* Name + Type row */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls} htmlFor="rv-name">
                    Person Name
                  </label>
                  <input
                    className={inputCls}
                    id="rv-name"
                    placeholder="Enter full name…"
                    type="text"
                    value={memberName}
                    onChange={e => setMemberName(e.target.value)}
                  />
                </div>
                <div>
                  <label className={labelCls} htmlFor="rv-type">
                    Person Type
                  </label>
                  <select
                    className={inputCls}
                    id="rv-type"
                    value={memberType}
                    onChange={e => setMemberType(e.target.value as 'Member' | 'Non-Member' | '')}
                  >
                    <option value="">Select type…</option>
                    <option value="Member">Member</option>
                    <option value="Non-Member">Non-Member</option>
                  </select>
                </div>
              </div>

              {/* Conditional: Member ID + Subscription */}
              {isMember && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={labelCls} htmlFor="rv-memberid">
                      Member ID
                    </label>
                    <input
                      className={inputCls}
                      id="rv-memberid"
                      placeholder="e.g. USR-0042"
                      type="text"
                      value={memberId}
                      onChange={e => setMemberId(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className={labelCls} htmlFor="rv-sub">
                      Subscription
                    </label>
                    <select
                      className={inputCls}
                      id="rv-sub"
                      value={subscription}
                      onChange={e => setSubscription(e.target.value)}
                    >
                      <option value="">Select…</option>
                      {SUBSCRIPTIONS.map(s => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              {/* Admin Notes */}
              <div>
                <label className={labelCls} htmlFor="rv-notes">
                  Admin Notes
                </label>
                <input
                  className={inputCls}
                  id="rv-notes"
                  placeholder="Optional notes…"
                  type="text"
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                />
              </div>

              {/* Violation toggle */}
              <div
                className="flex items-center justify-between rounded-xl px-4 py-3 transition-colors"
                style={{ background: isViolation ? '#fee2e2' : '#fff1f2' }}
              >
                <div className="flex items-start gap-3">
                  <svg
                    className="mt-0.5 h-4 w-4 flex-shrink-0 text-red-500"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                    />
                    <line x1="12" x2="12" y1="9" y2="13" />
                    <line x1="12" x2="12.01" y1="17" y2="17" />
                  </svg>
                  <div>
                    <p className="text-[13px] font-semibold text-red-700">Mark as Tailgate Violation</p>
                    <p className="text-[11px] text-red-500">
                      This will count against the member&apos;s violation record
                    </p>
                  </div>
                </div>
                <button
                  className={`relative h-6 w-11 flex-shrink-0 overflow-hidden rounded-full transition-colors focus:outline-none ${isViolation ? 'bg-red-500' : 'bg-gray-300'}`}
                  type="button"
                  onClick={() => setIsViolation(v => !v)}
                >
                  <span
                    className={`absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${isViolation ? 'translate-x-[22px]' : 'translate-x-0'}`}
                  />
                </button>
              </div>

              {/* Actual event type — shown only when violation toggle is OFF */}
              {!isViolation && (
                <div>
                  <label className={labelCls} htmlFor="rv-actual-type">
                    Actual Event Type
                  </label>
                  <select
                    className={inputCls}
                    id="rv-actual-type"
                    value={actualEventType}
                    onChange={e => setActualEventType(e.target.value as 'Entry' | 'Exit' | '')}
                  >
                    <option value="">Select type…</option>
                    <option value="Entry">Entry</option>
                    <option value="Exit">Exit</option>
                  </select>
                </div>
              )}
            </div>
          </div>

          {/* Validation error */}
          {validationError && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-[12px] font-semibold text-red-600">{validationError}</p>
          )}

          {/* Footer */}
          <div className="flex justify-end gap-2 pt-1">
            <button
              className="rounded-lg border border-gray-200 px-4 py-2 text-[12px] font-semibold text-gray-600 transition hover:bg-gray-50"
              type="button"
              onClick={onClose}
            >
              Cancel
            </button>
            <button
              className={`rounded-lg px-4 py-2 text-[12px] font-semibold text-white transition disabled:opacity-50 ${isViolation ? 'bg-red-600 hover:bg-red-700' : 'bg-[#21295A] hover:bg-[#1a2147]'
                }`}
              disabled={isSubmitting}
              type="button"
              onClick={handleSave}
            >
              {isSubmitting ? 'Saving…' : isPending ? 'Save Review' : 'Update Review'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReviewModal;
