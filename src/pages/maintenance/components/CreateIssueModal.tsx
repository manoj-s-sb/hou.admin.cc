import { useRef, useState } from 'react';

import { toast } from 'react-hot-toast';
import { useDispatch } from 'react-redux';

import { createWork, deleteWorkMedia, getWorkUploadUrl, uploadFileToBlob } from '../../../store/maintenance/api';
import { AppDispatch } from '../../../store/store';
import { ALL_LANES, AssignedTo, IssuePriority, RaisedBy, getLocalUser, inputCls, toggleCls } from '../constants';

type IssueCategory = 'customer_support' | 'feature_request' | 'others';

const categoryOptions: { key: IssueCategory; label: string }[] = [
  { key: 'customer_support', label: 'Customer Support' },
  { key: 'feature_request', label: 'Feature Request' },
  { key: 'others', label: 'Others' },
];

interface CreateIssueModalProps {
  facilityCode: string;
  updatedBy: string;
  onClose: () => void;
  onSuccess: () => void;
}

const CreateIssueModal = ({ facilityCode, updatedBy, onClose, onSuccess }: CreateIssueModalProps) => {
  const dispatch = useDispatch<AppDispatch>();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<IssueCategory>('customer_support');
  const [selectedLanes, setSelectedLanes] = useState<number[]>([]);
  const [raisedBy, setRaisedBy] = useState<RaisedBy>('centre_staff');
  const [raisedByName, setRaisedByName] = useState('');
  const [assignedTo, setAssignedTo] = useState<AssignedTo>('centre_staff');
  const [priority, setPriority] = useState<IssuePriority>('medium');
  const [attachments, setAttachments] = useState<{ blobName: string; file: File }[]>([]);
  const [attaching, setAttaching] = useState(false);
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const toggleLane = (lane: number) =>
    setSelectedLanes(prev => (prev.includes(lane) ? prev.filter(l => l !== lane) : [...prev, lane]));

  const selectAllLanes = () => setSelectedLanes([...ALL_LANES]);

  const handleAttach = async (files: FileList) => {
    if (!files.length) return;
    setAttaching(true);
    try {
      const items = await Promise.all(
        Array.from(files).map(async file => {
          const { uploadUrl, blobName } = await getWorkUploadUrl(facilityCode, file.name);
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

  const handleSubmit = () => {
    if (!title.trim()) {
      toast.error('Issue title is required.');
      return;
    }
    setSaving(true);
    const { userId: createdBy, name: createdByName } = getLocalUser();
    const lanes = selectedLanes.length > 0 ? selectedLanes : [0];

    Promise.all(
      lanes.map(laneNo =>
        dispatch(
          createWork({
            facilityCode,
            type: 'issue',
            title: title.trim(),
            category,
            priority,
            laneNo,
            notes: description.trim(),
            raisedBy,
            assignedTo,
            ...(raisedByName.trim() ? { raisedByName: raisedByName.trim() } : {}),
            ...(updatedBy ? { updatedBy } : {}),
            ...(createdBy ? { createdBy } : {}),
            ...(createdByName ? { createdByName } : {}),
            ...(attachments.length > 0 ? { attachments: attachments.map(a => a.blobName) } : {}),
          })
        ).unwrap()
      )
    )
      .then(() => {
        toast.success(lanes.length > 1 ? `${lanes.length} issues created!` : 'Issue created successfully!');
        onSuccess();
        onClose();
      })
      .catch(err => toast.error(err || 'Failed to create issue.'))
      .finally(() => setSaving(false));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <p className="text-lg font-bold text-gray-900">Create Issue</p>
          <button
            className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
            type="button"
            onClick={onClose}
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path d="M6 18L18 6M6 6l12 12" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} />
            </svg>
          </button>
        </div>

        <div className="space-y-5 overflow-y-auto px-6 py-5">
          {/* Issue title */}
          <div>
            <label className="mb-1.5 block text-sm font-semibold text-gray-800" htmlFor="ci-title">
              Issue title <span className="text-red-500">*</span>
            </label>
            <input
              className={inputCls}
              id="ci-title"
              placeholder="Describe the issue..."
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
            />
          </div>

          {/* Description */}
          <div>
            <label className="mb-1.5 block text-sm font-semibold text-gray-800" htmlFor="ci-description">
              Description
            </label>
            <textarea
              className={inputCls}
              id="ci-description"
              placeholder=""
              rows={4}
              value={description}
              onChange={e => setDescription(e.target.value)}
            />
          </div>

          {/* Category */}
          <div>
            <p className="mb-2 text-sm font-semibold text-gray-800">Category</p>
            <div className="flex flex-wrap gap-2">
              {categoryOptions.map(opt => (
                <button
                  key={opt.key}
                  className={`rounded-lg border px-4 py-2 text-sm font-medium transition-colors ${
                    category === opt.key
                      ? 'border-transparent bg-[#21295A] text-white'
                      : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
                  }`}
                  type="button"
                  onClick={() => setCategory(opt.key)}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Raised by */}
          <div>
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
              placeholder="Name (optional)..."
              type="text"
              value={raisedByName}
              onChange={e => setRaisedByName(e.target.value)}
            />
          </div>

          {/* Assign to team */}
          <div>
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

          {/* Lanes affected */}
          <div>
            <div className="mb-2 flex items-center justify-between">
              <p className="text-sm font-semibold text-gray-800">Lanes affected</p>
              <button
                className="text-sm font-medium text-blue-600 hover:underline"
                type="button"
                onClick={selectAllLanes}
              >
                All lanes
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {ALL_LANES.map(lane => (
                <button
                  key={lane}
                  className={`rounded-lg border px-4 py-2 text-sm font-medium transition-colors ${
                    selectedLanes.includes(lane)
                      ? 'border-transparent bg-[#21295A] text-white'
                      : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
                  }`}
                  type="button"
                  onClick={() => toggleLane(lane)}
                >
                  Lane {lane}
                </button>
              ))}
            </div>
          </div>

          {/* Priority */}
          <div>
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
                  className={`flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium transition-colors ${
                    priority === opt.key
                      ? 'border-transparent bg-[#21295A] text-white'
                      : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
                  }`}
                  type="button"
                  onClick={() => setPriority(opt.key)}
                >
                  <span className={`h-2.5 w-2.5 rounded-full ${opt.dot}`} />
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Attachments */}
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
              className="flex items-center gap-2 rounded-lg border border-gray-200 px-4 py-2 text-sm text-gray-500 hover:border-gray-400 hover:text-gray-700 disabled:opacity-50"
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

        {/* Footer */}
        <div className="flex justify-end gap-3 border-t border-gray-100 px-6 py-4">
          <button
            className="rounded-lg border border-gray-200 px-5 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50"
            disabled={saving || attaching}
            type="button"
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            className="rounded-lg bg-[#21295A] px-5 py-2 text-sm font-semibold text-white hover:bg-[#1a2149] disabled:opacity-50"
            disabled={saving || attaching}
            type="button"
            onClick={handleSubmit}
          >
            {saving ? 'Creating...' : attaching ? 'Uploading...' : 'Create Issue'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CreateIssueModal;
