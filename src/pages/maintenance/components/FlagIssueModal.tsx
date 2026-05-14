import { useRef, useState } from 'react';

import { toast } from 'react-hot-toast';

import {
  createWork,
  deleteWorkMedia,
  getWorkUploadUrl,
  updateWork,
  uploadFileToBlob,
} from '../../../store/maintenance/api';
import { Work } from '../../../store/maintenance/types';
import { AssignedTo, IssuePriority, RaisedBy, getLocalUser, inputCls, toggleCls } from '../constants';

interface FlagIssueModalProps {
  item: Work;
  facilityCode: string;
  updatedBy: string;
  onClose: () => void;
  onSuccess: () => void;
  dispatch: any;
}

const FlagIssueModal = ({ item, facilityCode, updatedBy, onClose, onSuccess, dispatch }: FlagIssueModalProps) => {
  const [issueTitle, setIssueTitle] = useState('');
  const [description, setDescription] = useState('');
  const [raisedBy, setRaisedBy] = useState<RaisedBy>('centre_staff');
  const [raisedByName, setRaisedByName] = useState('');
  const [assignedTo, setAssignedTo] = useState<AssignedTo>('centre_staff');
  const [priority, setPriority] = useState<IssuePriority>('medium');
  const [attachments, setAttachments] = useState<{ blobName: string; file: File }[]>([]);
  const [attaching, setAttaching] = useState(false);
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleAttach = async (files: FileList) => {
    if (!files.length) return;
    setAttaching(true);
    try {
      const items = await Promise.all(
        Array.from(files).map(async file => {
          const { uploadUrl, blobName } = await getWorkUploadUrl(getLocalUser().facilityCode, file.name);
          await uploadFileToBlob(uploadUrl, file);
          return { blobName, file };
        })
      );
      setAttachments(prev => [...prev, ...items]);
    } catch {
      toast.error('Failed to upload attachment.');
    } finally {
      setAttaching(false);
    }
  };

  const handleRemoveAttachment = (blobName: string) => {
    void deleteWorkMedia(blobName);
    setAttachments(prev => prev.filter(a => a.blobName !== blobName));
  };

  const handlePreview = (file: File) => {
    const url = URL.createObjectURL(file);
    window.open(url, '_blank');
  };

  const categoryLabel = item.category
    ? `Maintenance – ${item.category.charAt(0).toUpperCase() + item.category.slice(1)}`
    : 'Maintenance';

  const handleSubmit = () => {
    if (!issueTitle.trim()) {
      toast.error('Issue title is required.');
      return;
    }
    setSaving(true);
    const lastCompletedAt = new Date().toISOString().replace(/\.(\d{3})Z$/, '.$1000+00:00');
    const { userId: createdBy, name: createdByName } = getLocalUser();

    const issuePayload = {
      facilityCode,
      type: 'issue' as const,
      taskId: item.itemId,
      title: issueTitle.trim(),
      category: item.category || '',
      priority,
      laneNo: item.laneNo || 0,
      notes: description.trim(),
      raisedBy,
      assignedTo,
      ...(item.frequency ? { frequency: item.frequency } : {}),
      ...(raisedByName.trim() ? { raisedByName: raisedByName.trim() } : {}),
      ...(createdBy ? { createdBy } : {}),
      ...(createdByName ? { createdByName } : {}),
      ...(attachments.length > 0 ? { attachments: attachments.map(a => a.blobName) } : {}),
    };
    const updatedByName = createdByName;
    dispatch(
      updateWork({
        itemId: item.itemId,
        status: 'issue',
        lastCompletedAt,
        ...(updatedBy ? { updatedBy } : {}),
        ...(updatedByName ? { updatedByName } : {}),
        actionTaken: description.trim(),
      })
    )
      .unwrap()
      .then(() => dispatch(createWork(issuePayload)).unwrap())
      .then(() => dispatch(createWork({ ...issuePayload, type: 'log', status: 'issue' })).unwrap())
      .then(() => {
        toast.success('Issue raised, task updated and log created!');
        onSuccess();
        onClose();
      })
      .catch((err: any) => toast.error(err || 'Failed to raise issue.'))
      .finally(() => setSaving(false));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="flex items-start justify-between border-b border-gray-100 px-6 py-4">
          <div>
            <p className="text-base font-bold text-gray-900">Flag Issue</p>
            <p className="mt-0.5 text-sm text-gray-400">
              {item.title}
              {item.laneNo ? ` · Lane ${item.laneNo}` : ''}
            </p>
          </div>
          <button
            className="ml-4 rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
            type="button"
            onClick={onClose}
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path d="M6 18L18 6M6 6l12 12" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} />
            </svg>
          </button>
        </div>

        <div className="overflow-y-auto px-6 py-5">
          <div className="mb-5 flex items-center gap-3">
            <span className="text-sm text-gray-500">Category:</span>
            <span className="rounded-full bg-amber-600 px-3 py-1 text-xs font-semibold text-white">
              {categoryLabel}
            </span>
          </div>

          <div className="mb-4">
            <label className="mb-1.5 block text-sm font-semibold text-gray-800" htmlFor="issue-title">
              Issue title <span className="text-red-500">*</span>
            </label>
            <input
              className={inputCls}
              id="issue-title"
              placeholder="Describe the issue..."
              type="text"
              value={issueTitle}
              onChange={e => setIssueTitle(e.target.value)}
            />
          </div>

          <div className="mb-5">
            <label className="mb-1.5 block text-sm font-semibold text-gray-800" htmlFor="issue-description">
              Description
            </label>
            <textarea
              className={inputCls}
              id="issue-description"
              placeholder="Additional details..."
              rows={4}
              value={description}
              onChange={e => setDescription(e.target.value)}
            />
          </div>

          <div className="mb-5">
            <p className="mb-2 text-sm font-semibold text-gray-800">Raised by</p>
            <div className="flex gap-2">
              {(['centre_staff', 'noc', 'admin'] as RaisedBy[]).map(opt => (
                <button
                  key={opt}
                  className={toggleCls(raisedBy === opt)}
                  type="button"
                  onClick={() => setRaisedBy(opt)}
                >
                  {opt === 'centre_staff' ? 'Centre Staff' : opt === 'noc' ? 'NOC' : 'Admin'}
                </button>
              ))}
            </div>
            <input
              className={`${inputCls} mt-3`}
              id="raised-by-name"
              placeholder="Name (optional)..."
              type="text"
              value={raisedByName}
              onChange={e => setRaisedByName(e.target.value)}
            />
          </div>

          <div className="mb-5">
            <p className="mb-2 text-sm font-semibold text-gray-800">Assign to team</p>
            <div className="flex gap-2">
              {(['centre_staff', 'noc', 'others'] as AssignedTo[]).map(opt => (
                <button
                  key={opt}
                  className={toggleCls(assignedTo === opt)}
                  type="button"
                  onClick={() => setAssignedTo(opt)}
                >
                  {opt === 'centre_staff' ? 'Centre Staff' : opt === 'noc' ? 'NOC' : 'Others'}
                </button>
              ))}
            </div>
          </div>

          <div className="mb-5">
            <p className="mb-2 text-sm font-semibold text-gray-800">Priority</p>
            <div className="flex gap-2">
              {(
                [
                  { key: 'high', dot: 'bg-red-500', label: 'High' },
                  { key: 'medium', dot: 'bg-orange-400', label: 'Medium' },
                  { key: 'low', dot: 'bg-green-500', label: 'Low' },
                ] as { key: IssuePriority; dot: string; label: string }[]
              ).map(opt => (
                <button
                  key={opt.key}
                  className={`flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium transition-colors ${priority === opt.key ? 'border-transparent bg-[#21295A] text-white' : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'}`}
                  type="button"
                  onClick={() => setPriority(opt.key)}
                >
                  <span className={`h-2.5 w-2.5 rounded-full ${opt.dot}`} />
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="mb-2 text-sm font-semibold text-gray-800">Attachments</p>
            <input
              ref={fileInputRef}
              multiple
              className="hidden"
              type="file"
              onChange={e => {
                if (e.target.files) handleAttach(e.target.files);
                e.target.value = '';
              }}
            />
            {attachments.length > 0 && (
              <div className="mb-2 flex flex-col gap-1.5">
                {attachments.map(({ blobName, file }) => (
                  <div
                    key={blobName}
                    className="flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2"
                  >
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
                    <span className="flex-1 truncate text-xs text-gray-600">{file.name}</span>
                    <button
                      className="text-xs text-blue-500 hover:text-blue-700"
                      type="button"
                      onClick={() => handlePreview(file)}
                    >
                      Preview
                    </button>
                    <button
                      className="text-xs text-red-400 hover:text-red-600"
                      type="button"
                      onClick={() => handleRemoveAttachment(blobName)}
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            )}
            <button
              className="flex items-center gap-2 rounded-lg border border-dashed border-gray-300 px-4 py-2 text-sm text-gray-500 hover:border-gray-400 hover:text-gray-700 disabled:opacity-50"
              disabled={attaching}
              type="button"
              onClick={() => fileInputRef.current?.click()}
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                />
              </svg>
              {attaching ? 'Uploading...' : 'Attach file'}
            </button>
          </div>
        </div>

        <div className="flex justify-end gap-2 border-t border-gray-100 px-6 py-4">
          <button
            className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50"
            disabled={saving || attaching}
            type="button"
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            className="rounded-lg bg-red-600 px-5 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50"
            disabled={saving || attaching}
            type="button"
            onClick={handleSubmit}
          >
            {saving ? 'Raising...' : attaching ? 'Uploading...' : 'Raise Issue'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default FlagIssueModal;
