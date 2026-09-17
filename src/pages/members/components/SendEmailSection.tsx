import { useEffect, useState } from 'react';

import { Mail, Paperclip } from 'lucide-react';
import { useDispatch, useSelector } from 'react-redux';

import { LoaderSpinner } from '../../../components/Loader';
import { canEditModule } from '../../../rbac/permissions';
import { getMemberEmails, sendMemberEmail, uploadMemberEmailAttachment } from '../../../store/members/api';
import { MemberEmailAttachment } from '../../../store/members/types';
import { AppDispatch, RootState } from '../../../store/store';
import { formatDateTimeChicago } from '../../../utils/dateUtils';

const MAX_SUBJECT_LENGTH = 200;
const MAX_BODY_LENGTH = 10000;
const MAX_ATTACHMENTS = 3;
const MAX_ATTACHMENT_BYTES = 5 * 1024 * 1024; // 5MB, matches the backend's limit

interface Props {
  userId: string;
  memberEmail?: string;
}

/**
 * Send a one-off custom email to this member from their details page —
 * subject, body, optional attachments (up to 3, 5MB each). Kept as its own
 * component, mirroring AdminNotesSection: its own Redux slice
 * (state.members.memberEmails) so a send never refetches the whole member,
 * and its own local compose state. Only visible/enabled to callers with
 * write access on the members module — sending mail is a mutation, not a
 * read, same rule the backend RBAC guard enforces on the send endpoint.
 */
const SendEmailSection: React.FC<Props> = ({ userId, memberEmail }) => {
  const dispatch = useDispatch<AppDispatch>();
  const { memberEmails, memberEmailsLoading, memberEmailsError, memberEmailSending } = useSelector(
    (state: RootState) => state.members
  );

  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const canSend = canEditModule('members');
  const hasEmail = Boolean(memberEmail);

  useEffect(() => {
    if (userId) dispatch(getMemberEmails({ userId }));
  }, [dispatch, userId]);

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

  const handleSend = () => {
    const trimmedSubject = subject.trim();
    const trimmedBody = body.trim();
    if (!trimmedSubject || !trimmedBody || memberEmailSending || uploading) return;
    if (!window.confirm(`Send this email to ${memberEmail}?`)) return;

    setLocalError(null);
    setUploading(true);
    Promise.all(files.map(f => uploadMemberEmailAttachment(f)))
      .then((attachments: MemberEmailAttachment[]) => {
        setUploading(false);
        return dispatch(sendMemberEmail({ userId, subject: trimmedSubject, body: trimmedBody, attachments }))
          .unwrap()
          .then(() => {
            setSubject('');
            setBody('');
            setFiles([]);
          });
      })
      .catch(() => {
        setUploading(false);
        setLocalError('Failed to upload one or more attachments. Remove the file to send without it, or retry.');
      });
  };

  if (!canSend) return null;

  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
      <div className="border-b border-gray-200 bg-white px-4 py-2 sm:px-6 sm:py-3">
        <div className="flex items-center">
          <Mail className="mr-2 h-5 w-5 text-blue-600" />
          <h2 className="text-lg font-semibold text-gray-900">Send Email</h2>
        </div>
      </div>

      <div className="px-4 py-3 sm:px-6 sm:py-4">
        {!hasEmail ? (
          <p className="py-2 text-sm text-gray-400">This member has no email on file.</p>
        ) : (
          <div className="mb-4 space-y-2">
            <div className="flex items-center gap-1.5 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm">
              <span className="font-semibold text-gray-500">To:</span>
              <span className="text-gray-800">{memberEmail}</span>
            </div>
            <input
              className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700 outline-none transition focus:border-blue-500 focus:bg-white disabled:opacity-60"
              disabled={memberEmailSending || uploading}
              maxLength={MAX_SUBJECT_LENGTH}
              placeholder="Subject"
              type="text"
              value={subject}
              onChange={e => setSubject(e.target.value)}
            />
            <textarea
              className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700 outline-none transition focus:border-blue-500 focus:bg-white disabled:opacity-60"
              disabled={memberEmailSending || uploading}
              maxLength={MAX_BODY_LENGTH}
              placeholder="Write a message…"
              rows={4}
              value={body}
              onChange={e => setBody(e.target.value)}
            />

            <div className="flex items-center gap-2">
              <label className="relative inline-flex cursor-pointer items-center gap-1.5 rounded-lg bg-gray-100 px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-200">
                <Paperclip className="h-3.5 w-3.5" />
                Attach files
                <input
                  multiple
                  className="absolute h-px w-px overflow-hidden opacity-0"
                  disabled={memberEmailSending || uploading || files.length >= MAX_ATTACHMENTS}
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
                      className="text-red-400 hover:text-red-600"
                      disabled={memberEmailSending || uploading}
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

            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-400">
                {subject.length}/{MAX_SUBJECT_LENGTH} · {body.length}/{MAX_BODY_LENGTH}
              </span>
              <button
                className="rounded-lg bg-[#21295A] px-4 py-1.5 text-sm font-semibold text-white transition hover:bg-[#2d3570] disabled:cursor-not-allowed disabled:opacity-50"
                disabled={memberEmailSending || uploading || !subject.trim() || !body.trim()}
                type="button"
                onClick={handleSend}
              >
                {uploading ? (
                  'Uploading…'
                ) : memberEmailSending ? (
                  <LoaderSpinner className="text-white" size="xs" />
                ) : (
                  'Send Email'
                )}
              </button>
            </div>
          </div>
        )}

        {memberEmailsError && (
          <div className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">
            {memberEmailsError}
          </div>
        )}

        {/* Sent history */}
        {memberEmailsLoading ? (
          <div className="flex justify-center py-6">
            <LoaderSpinner className="text-blue-600" size="sm" />
          </div>
        ) : memberEmails.length === 0 ? (
          <p className="py-4 text-center text-sm text-gray-400">No emails sent yet</p>
        ) : (
          <div className="space-y-3">
            {memberEmails.map(email => (
              <div key={email.id} className="rounded-lg border border-gray-200 bg-gray-50 p-3">
                <div className="mb-1.5 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <span className="font-semibold text-gray-700">{email.sentByName}</span>
                    <span>{formatDateTimeChicago(email.sentAt)}</span>
                  </div>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                      email.status === 'sent' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                    }`}
                  >
                    {email.status === 'sent' ? 'Sent' : 'Failed'}
                  </span>
                </div>
                <p className="mb-1 text-sm font-semibold text-gray-900">{email.subject}</p>
                <p className="whitespace-pre-wrap break-words text-sm text-gray-700">{email.body}</p>
                {email.attachments.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {email.attachments.map(a => (
                      <span
                        key={a.blobName}
                        className="rounded border border-gray-200 bg-white px-2 py-0.5 text-[11px] text-gray-600"
                      >
                        📎 {a.fileName}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default SendEmailSection;
