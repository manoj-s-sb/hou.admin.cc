import { useRef, useState } from 'react';

import { toast } from 'react-hot-toast';

import { createWork, deleteWorkMedia, getWorkUploadUrl, uploadFileToBlob } from '../../../store/maintenance/api';
import { CreateWorkRequest } from '../../../store/maintenance/types';
import { ALL_LANES, getLocalUser, inputCls } from '../constants';

type AddTaskForm = Omit<CreateWorkRequest, 'facilityCode' | 'type' | 'steps'> & {
  steps: { stepId: string; order: number; title: string; imageUrl: string }[];
};

const emptyStep = (order: number) => ({
  stepId: `step_${String(order).padStart(3, '0')}`,
  order,
  title: '',
  imageUrl: '',
});

interface AddTaskModalProps {
  onClose: () => void;
  onSuccess: () => void;
  dispatch: any;
}

const AddTaskModal = ({ onClose, onSuccess, dispatch }: AddTaskModalProps) => {
  const [form, setForm] = useState<AddTaskForm>({
    title: '',
    category: '',
    frequency: 'weekly',
    priority: 'medium',
    laneNo: 1,
    notes: '',
    videoUrl: '',
    steps: [emptyStep(1)],
  });
  const [selectedLanes, setSelectedLanes] = useState<number[]>([]);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState<Record<string, boolean>>({});
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const stepImageFiles = useRef<Record<number, File>>({});
  const [videoFile, setVideoFile] = useState<File | null>(null);

  const setField = (key: string, value: any) => setForm(prev => ({ ...prev, [key]: value }));

  const toggleLane = (lane: number) =>
    setSelectedLanes(prev => (prev.includes(lane) ? prev.filter(l => l !== lane) : [...prev, lane]));

  const toggleAll = () => setSelectedLanes(prev => (prev.length === ALL_LANES.length ? [] : [...ALL_LANES]));

  const addStep = () => setForm(prev => ({ ...prev, steps: [...prev.steps, emptyStep(prev.steps.length + 1)] }));

  const removeStep = (index: number) =>
    setForm(prev => ({
      ...prev,
      steps: prev.steps
        .filter((_, i) => i !== index)
        .map((s, i) => ({ ...s, order: i + 1, stepId: `step_${String(i + 1).padStart(3, '0')}` })),
    }));

  const updateStep = (index: number, key: string, value: string) =>
    setForm(prev => ({
      ...prev,
      steps: prev.steps.map((s, i) => (i === index ? { ...s, [key]: value } : s)),
    }));

  const handleFileUpload = async (index: number, file: File) => {
    const uploadKey = `${index}_imageUrl`;
    setUploading(prev => ({ ...prev, [uploadKey]: true }));
    try {
      const { uploadUrl, blobName } = await getWorkUploadUrl(getLocalUser().facilityCode, file.name);
      await uploadFileToBlob(uploadUrl, file);
      stepImageFiles.current[index] = file;
      updateStep(index, 'imageUrl', blobName);
      toast.success('Image uploaded.');
    } catch {
      toast.error('Upload failed. Try again.');
    } finally {
      setUploading(prev => ({ ...prev, [uploadKey]: false }));
    }
  };

  const handleVideoUpload = async (file: File) => {
    setUploading(prev => ({ ...prev, task_video: true }));
    try {
      const { uploadUrl, blobName } = await getWorkUploadUrl(getLocalUser().facilityCode, file.name);
      await uploadFileToBlob(uploadUrl, file);
      setVideoFile(file);
      setField('videoUrl', blobName);
      toast.success('Video uploaded.');
    } catch {
      toast.error('Upload failed. Try again.');
    } finally {
      setUploading(prev => ({ ...prev, task_video: false }));
    }
  };

  const handlePreview = (file: File) => {
    const url = URL.createObjectURL(file);
    window.open(url, '_blank');
  };

  const handleSubmit = () => {
    if (!form.title.trim() || !form.category || !form.frequency) {
      toast.error('Title, category and frequency are required.');
      return;
    }
    if (selectedLanes.length === 0) {
      toast.error('Please select at least one lane.');
      return;
    }
    setSaving(true);
    const { userId: createdBy, name: createdByName } = getLocalUser();
    const steps = form.steps.map(s => ({
      stepId: s.stepId,
      order: s.order,
      title: s.title,
      imageUrl: s.imageUrl || null,
      videoUrl: null,
    }));
    Promise.all(
      selectedLanes.map(laneNo =>
        dispatch(
          createWork({
            facilityCode: getLocalUser().facilityCode,
            type: 'task',
            ...form,
            laneNo,
            steps,
            ...(createdBy ? { createdBy } : {}),
            ...(createdByName ? { createdByName } : {}),
          } as CreateWorkRequest)
        ).unwrap()
      )
    )
      .then(() => {
        toast.success(
          selectedLanes.length > 1
            ? `${selectedLanes.length} tasks created (one per lane)!`
            : 'Task created successfully!'
        );
        onSuccess();
        onClose();
      })
      .catch((err: any) => toast.error(err || 'Failed to create task.'))
      .finally(() => setSaving(false));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <p className="text-base font-bold text-gray-900">Add Task</p>
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

        <div className="overflow-y-auto px-6 py-5">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="mb-1 block text-xs font-medium text-gray-600" htmlFor="task-title">
                Title <span className="text-red-500">*</span>
              </label>
              <input
                className={inputCls}
                id="task-title"
                placeholder="Enter task title"
                type="text"
                value={form.title}
                onChange={e => setField('title', e.target.value)}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600" htmlFor="task-category">
                Category <span className="text-red-500">*</span>
              </label>
              <select
                className={inputCls}
                id="task-category"
                value={form.category}
                onChange={e => setField('category', e.target.value)}
              >
                <option value="">Select category</option>
                <option value="mech">Mechanical</option>
                <option value="elec">Electrical</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600" htmlFor="task-frequency">
                Frequency <span className="text-red-500">*</span>
              </label>
              <select
                className={inputCls}
                id="task-frequency"
                value={form.frequency}
                onChange={e => setField('frequency', e.target.value)}
              >
                <option value="daily">Daily</option>
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="bi-weekly">Bi-Weekly</option>
                <option value="monthly">Monthly</option>
                <option value="quarterly">Quarterly</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600" htmlFor="task-priority">
                Priority
              </label>
              <select
                className={inputCls}
                id="task-priority"
                value={form.priority}
                onChange={e => setField('priority', e.target.value)}
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>
            <div className="sm:col-span-2">
              <p className="mb-2 text-xs font-medium text-gray-600">
                Lanes <span className="text-red-500">*</span>
                {selectedLanes.length > 0 && (
                  <span className="ml-2 font-normal text-gray-400">
                    ({selectedLanes.length === ALL_LANES.length ? 'All lanes' : `${selectedLanes.length} selected`} —{' '}
                    {selectedLanes.length} task{selectedLanes.length > 1 ? 's' : ''} will be created)
                  </span>
                )}
              </p>
              <div className="flex flex-wrap gap-2">
                <button
                  className={`rounded-full px-3 py-1 text-xs font-semibold transition-all ${selectedLanes.length === ALL_LANES.length ? 'bg-[#21295A] text-white' : 'border border-gray-200 text-gray-500 hover:border-gray-400 hover:text-gray-700'}`}
                  type="button"
                  onClick={toggleAll}
                >
                  All
                </button>
                {ALL_LANES.map(lane => (
                  <button
                    key={lane}
                    className={`rounded-full px-3 py-1 text-xs font-semibold transition-all ${selectedLanes.includes(lane) ? 'bg-[#21295A] text-white' : 'border border-gray-200 text-gray-500 hover:border-gray-400 hover:text-gray-700'}`}
                    type="button"
                    onClick={() => toggleLane(lane)}
                  >
                    Lane {lane}
                  </button>
                ))}
              </div>
            </div>
            <div className="sm:col-span-2">
              <label className="mb-1 block text-xs font-medium text-gray-600" htmlFor="task-notes">
                Notes
              </label>
              <textarea
                className={inputCls}
                id="task-notes"
                placeholder="Add notes..."
                rows={2}
                value={form.notes}
                onChange={e => setField('notes', e.target.value)}
              />
            </div>
          </div>

          <div className="mt-5">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-sm font-semibold text-gray-800">Steps</p>
              <button
                className="flex items-center gap-1 rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-1 text-xs font-medium text-indigo-600 hover:bg-indigo-100"
                type="button"
                onClick={addStep}
              >
                + Add Step
              </button>
            </div>
            <div className="flex flex-col gap-4">
              {form.steps.map((step, index) => (
                <div key={step.stepId} className="relative rounded-xl border border-gray-100 bg-gray-50 p-4">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#21295A] text-xs font-bold text-white">
                      {step.order}
                    </span>
                    {form.steps.length > 1 && (
                      <button
                        className="text-xs text-red-400 hover:text-red-600"
                        type="button"
                        onClick={() => removeStep(index)}
                      >
                        Remove
                      </button>
                    )}
                  </div>
                  <div className="grid grid-cols-1 gap-3">
                    <div>
                      <label className="mb-1 block text-xs font-medium text-gray-600" htmlFor={`step-title-${index}`}>
                        Step Title
                      </label>
                      <input
                        className={inputCls}
                        id={`step-title-${index}`}
                        placeholder="Step description"
                        type="text"
                        value={step.title}
                        onChange={e => updateStep(index, 'title', e.target.value)}
                      />
                    </div>
                    <div>
                      <p className="mb-1 text-xs font-medium text-gray-600">Image</p>
                      <input
                        ref={el => {
                          fileInputRefs.current[`${index}_imageUrl`] = el;
                        }}
                        accept="image/*"
                        className="hidden"
                        type="file"
                        onChange={e => {
                          const file = e.target.files?.[0];
                          if (file) handleFileUpload(index, file);
                          e.target.value = '';
                        }}
                      />
                      {step.imageUrl ? (
                        <div className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2">
                          <span className="flex-1 truncate text-xs text-gray-600">
                            {step.imageUrl.split('/').pop()}
                          </span>
                          {stepImageFiles.current[index] && (
                            <button
                              className="text-xs text-blue-500 hover:text-blue-700"
                              type="button"
                              onClick={() => handlePreview(stepImageFiles.current[index])}
                            >
                              Preview
                            </button>
                          )}
                          <button
                            className="text-xs text-red-400 hover:text-red-600"
                            type="button"
                            onClick={() => {
                              void deleteWorkMedia(step.imageUrl);
                              updateStep(index, 'imageUrl', '');
                            }}
                          >
                            Remove
                          </button>
                        </div>
                      ) : (
                        <button
                          className="flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-gray-300 py-2 text-xs text-gray-500 hover:border-indigo-400 hover:text-indigo-500 disabled:opacity-50"
                          disabled={uploading[`${index}_imageUrl`]}
                          type="button"
                          onClick={() => fileInputRefs.current[`${index}_imageUrl`]?.click()}
                        >
                          {uploading[`${index}_imageUrl`] ? 'Uploading...' : 'Upload Image'}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Task-level video */}
          <div className="mt-5">
            <p className="mb-2 text-sm font-semibold text-gray-800">Task Video</p>
            <input
              ref={el => {
                fileInputRefs.current.task_video = el;
              }}
              accept="video/*"
              className="hidden"
              type="file"
              onChange={e => {
                const file = e.target.files?.[0];
                if (file) handleVideoUpload(file);
                e.target.value = '';
              }}
            />
            {form.videoUrl ? (
              <div className="flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2">
                <svg className="h-4 w-4 shrink-0 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                  />
                  <path
                    d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                  />
                </svg>
                <span className="flex-1 truncate text-xs text-gray-600">{form.videoUrl.split('/').pop()}</span>
                {videoFile && (
                  <button
                    className="text-xs text-blue-500 hover:text-blue-700"
                    type="button"
                    onClick={() => handlePreview(videoFile)}
                  >
                    Preview
                  </button>
                )}
                <button
                  className="text-xs text-red-400 hover:text-red-600"
                  type="button"
                  onClick={() => {
                    if (form.videoUrl) void deleteWorkMedia(form.videoUrl);
                    setField('videoUrl', '');
                    setVideoFile(null);
                  }}
                >
                  Remove
                </button>
              </div>
            ) : (
              <button
                className="flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-gray-300 py-3 text-sm text-gray-500 hover:border-indigo-400 hover:text-indigo-500 disabled:opacity-50"
                disabled={uploading.task_video}
                type="button"
                onClick={() => fileInputRefs.current.task_video?.click()}
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                  />
                  <path
                    d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                  />
                </svg>
                {uploading.task_video ? 'Uploading...' : 'Upload Task Video'}
              </button>
            )}
          </div>
        </div>

        <div className="flex justify-end gap-2 border-t border-gray-100 px-6 py-4">
          <button
            className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50"
            disabled={saving}
            type="button"
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            className="rounded-lg bg-[#21295A] px-5 py-2 text-sm font-semibold text-white hover:bg-[#1a2149] disabled:opacity-50"
            disabled={saving || Object.values(uploading).some(Boolean)}
            type="button"
            onClick={handleSubmit}
          >
            {saving ? 'Saving...' : Object.values(uploading).some(Boolean) ? 'Uploading...' : 'Create Task'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AddTaskModal;
