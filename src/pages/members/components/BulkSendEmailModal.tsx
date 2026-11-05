import { useState } from 'react';

import { useDispatch, useSelector } from 'react-redux';

import { LoaderSpinner } from '../../../components/Loader';
import { bulkSendMemberEmail, uploadMemberEmailAttachment } from '../../../store/members/api';
import { MemberEmailAttachment } from '../../../store/members/types';
import { AppDispatch, RootState } from '../../../store/store';

const MAX_SUBJECT_LENGTH = 200;
const MAX_BODY_LENGTH = 10000;
const MAX_ATTACHMENTS = 3;
const MAX_ATTACHMENT_BYTES = 5 * 1024 * 1024; // 5MB, matches the backend's limit

interface Recipient {
  userId: string;
  name: string;
  email: string;
}

interface Props {
  recipients: Recipient[];
  onClose: () => void;
  /** Called once the send completes (sent, failed, or partially) so the caller
   * can clear the row selection. Not called if the admin cancels. */
  onSent: () => void;
}

type Step = 'compose' | 'confirm' | 'result';

/**
 * Compose-and-send the same email to several selected members at once (row
 * selection on the Members grid). Mirrors SendEmailSection.tsx's compose
 * fields/attachment-upload flow, with an added confirm step (who's about to
 * get this) and a result step (per-recipient sent/failed/skipped breakdown) —
 * a bulk send has more blast radius than a one-off, so both matter more here.
 */
const BulkSendEmailModal: React.FC<Props> = ({ recipients, onClose, onSent }) => {
  const dispatch = useDispatch<AppDispatch>();
  const { memberEmailBulkSending, memberEmailBulkResult } = useSelector((state: RootState) => state.members);

  const [step, setStep] = useState<Step>('compose');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const addFiles = (picked: File[]) => {
    setLocalError(null);
    const room = MAX_ATTACHMENTS - files.length;
    if (room <= 0) {
      setLocalError(`You can attach at most ${MAX_ATTACHMENTS} files.`);
      return;
    }
    const oversized = picked.find(f => f.size > MAX_ATTACHMENT_BYTES);
    if (oversized) {
      setLocalError(`"${oversized.name}" exceeds the 5MB attachment limit.`);
      return;
    }
    setFiles(prev => [...prev, ...picked.slice(0, room)]);
  };

  const trimmedSubject = subject.trim();
  const trimmedBody = body.trim();
  const canProceedToConfirm = Boolean(trimmedSubject && trimmedBody) && !uploading;

  const handleConfirmSend = () => {
    if (!canProceedToConfirm || memberEmailBulkSending) return;

    setLocalError(null);
    setUploading(true);
    Promise.all(files.map(f => uploadMemberEmailAttachment(f)))
      .then((attachments: MemberEmailAttachment[]) => {
        setUploading(false);
        return dispatch(
          bulkSendMemberEmail({
            userIds: recipients.map(r => r.userId),
            subject: trimmedSubject,
            body: trimmedBody,
            attachments,
          })
        )
          .unwrap()
          .then(() => setStep('result'));
      })
      .catch(() => {
        setUploading(false);
        setLocalError('Failed to upload one or more attachments. Remove the file to send without it, or retry.');
      });
  };

  return (
    <div
      aria-modal="true"
      className="fixed inset-0 z-[600] flex items-center justify-center bg-black/40 p-4"
      role="dialog"
    >
      <div className="flex max-h-[90vh] w-full max-w-[560px] flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="flex items-start justify-between border-b border-gray-100 px-6 py-4">
          <div>
            <h2 className="text-[16px] font-bold text-[#21295A]">
              {step === 'compose' && `Email ${recipients.length} selected member${recipients.length === 1 ? '' : 's'}`}
              {step === 'confirm' && 'Confirm before sending'}
              {step === 'result' && 'Bulk email sent'}
            </h2>
            {step === 'compose' && (
              <p className="mt-0.5 text-[12px] text-gray-400">Same subject and message go to everyone selected.</p>
            )}
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

        <div className="flex-1 space-y-3 overflow-y-auto px-6 py-5">
          {step === 'compose' && (
            <>
              <input
                className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700 outline-none transition focus:border-blue-500 focus:bg-white"
                maxLength={MAX_SUBJECT_LENGTH}
                placeholder="Subject"
                type="text"
                value={subject}
                onChange={e => setSubject(e.target.value)}
              />
              <textarea
                className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700 outline-none transition focus:border-blue-500 focus:bg-white"
                maxLength={MAX_BODY_LENGTH}
                placeholder="Write a message…"
                rows={6}
                value={body}
                onChange={e => setBody(e.target.value)}
              />

              <div className="flex items-center gap-2">
                <label className="relative inline-flex cursor-pointer items-center gap-1.5 rounded-lg bg-gray-100 px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-200">
                  📎 Attach files
                  <input
                    multiple
                    className="absolute h-px w-px overflow-hidden opacity-0"
                    disabled={files.length >= MAX_ATTACHMENTS}
                    type="file"
                    onChange={e => {
                      const picked = Array.from(e.target.files ?? []);
                      addFiles(picked);
                      e.target.value = '';
                    }}
                  />
                </label>
                <span className="text-xs text-gray-400">Up to {MAX_ATTACHMENTS} files, 5MB each</span>
              </div>

              {files.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {files.map((f, i) => (
                    <span
                      key={`${f.name}-${i}`}
                      className="flex items-center gap-1.5 rounded-lg border border-dashed border-gray-300 bg-gray-50 px-2 py-1 text-[11px] font-medium text-gray-600"
                    >
                      📎 {f.name.length > 24 ? `${f.name.slice(0, 24)}…` : f.name}
                      <button
                        aria-label="Remove file"
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

              {localError && <p className="text-xs text-red-600">{localError}</p>}

              <p className="text-xs text-gray-400">
                {subject.length}/{MAX_SUBJECT_LENGTH} · {body.length}/{MAX_BODY_LENGTH}
              </p>
            </>
          )}

          {step === 'confirm' && (
            <>
              <p className="text-[13px] text-gray-600">
                You&apos;re about to send this email to{' '}
                <span className="font-semibold text-[#21295A]">{recipients.length}</span> member
                {recipients.length === 1 ? '' : 's'}:
              </p>
              <div className="max-h-40 space-y-1 overflow-y-auto rounded-lg border border-gray-100 bg-gray-50 p-2">
                {recipients.map(r => (
                  <div key={r.userId} className="flex items-center justify-between text-[12px]">
                    <span className="font-medium text-gray-700">{r.name || r.userId}</span>
                    <span className="text-gray-400">{r.email || 'no email on file'}</span>
                  </div>
                ))}
              </div>
              <div className="rounded-lg border border-gray-100 bg-white p-3">
                <p className="mb-1 text-[12px] font-semibold text-gray-900">{trimmedSubject}</p>
                <p className="whitespace-pre-wrap break-words text-[12px] text-gray-600">{trimmedBody}</p>
              </div>
              {localError && <p className="text-xs text-red-600">{localError}</p>}
            </>
          )}

          {step === 'result' && memberEmailBulkResult && (
            <>
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="rounded-lg border border-green-100 bg-green-50 py-3">
                  <p className="text-[20px] font-bold text-green-700">{memberEmailBulkResult.sentCount}</p>
                  <p className="text-[11px] font-medium text-green-700">Sent</p>
                </div>
                <div className="rounded-lg border border-red-100 bg-red-50 py-3">
                  <p className="text-[20px] font-bold text-red-700">{memberEmailBulkResult.failedCount}</p>
                  <p className="text-[11px] font-medium text-red-700">Failed</p>
                </div>
                <div className="rounded-lg border border-gray-200 bg-gray-50 py-3">
                  <p className="text-[20px] font-bold text-gray-600">{memberEmailBulkResult.skippedNoEmail}</p>
                  <p className="text-[11px] font-medium text-gray-600">No email on file</p>
                </div>
              </div>
              {memberEmailBulkResult.failedCount > 0 && (
                <p className="text-[12px] text-gray-500">
                  A failed send just means it couldn&apos;t be queued — nothing else was sent for that member. Try again
                  from their profile if needed.
                </p>
              )}
            </>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-gray-100 px-6 py-4">
          {step === 'compose' && (
            <>
              <button
                className="rounded-lg border border-gray-200 px-4 py-2 text-[13px] font-semibold text-gray-600 hover:bg-gray-50"
                type="button"
                onClick={onClose}
              >
                Cancel
              </button>
              <button
                className="rounded-lg bg-[#21295A] px-4 py-2 text-[13px] font-semibold text-white transition hover:bg-[#2d3570] disabled:cursor-not-allowed disabled:opacity-50"
                disabled={!canProceedToConfirm}
                type="button"
                onClick={() => setStep('confirm')}
              >
                Review recipients
              </button>
            </>
          )}
          {step === 'confirm' && (
            <>
              <button
                className="rounded-lg border border-gray-200 px-4 py-2 text-[13px] font-semibold text-gray-600 hover:bg-gray-50"
                disabled={memberEmailBulkSending || uploading}
                type="button"
                onClick={() => setStep('compose')}
              >
                Back
              </button>
              <button
                className="rounded-lg bg-[#21295A] px-4 py-2 text-[13px] font-semibold text-white transition hover:bg-[#2d3570] disabled:cursor-not-allowed disabled:opacity-50"
                disabled={memberEmailBulkSending || uploading}
                type="button"
                onClick={handleConfirmSend}
              >
                {uploading ? (
                  'Uploading…'
                ) : memberEmailBulkSending ? (
                  <LoaderSpinner className="text-white" size="xs" />
                ) : (
                  `Send to ${recipients.length}`
                )}
              </button>
            </>
          )}
          {step === 'result' && (
            <button
              className="rounded-lg bg-[#21295A] px-4 py-2 text-[13px] font-semibold text-white transition hover:bg-[#2d3570]"
              type="button"
              onClick={() => {
                onSent();
                onClose();
              }}
            >
              Done
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default BulkSendEmailModal;
