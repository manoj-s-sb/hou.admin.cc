import React, { useRef, useState } from 'react';

import { toast } from 'react-hot-toast';
import { useDispatch } from 'react-redux';

import { createTemplate, updateTemplate, uploadMaintenanceFile } from '../../../store/maintenance/api';
import { AppDispatch } from '../../../store/store';
import {
  ALL_LANES,
  CATEGORY_OPTIONS,
  EQUIPMENT_CUSTOM_SENTINEL,
  EQUIPMENT_OPTIONS,
  FREQ_UNITS,
  PRIORITIES,
  TASK_TYPES,
  freqLabel,
  inputCls,
  labelCls,
} from '../constants';

import type {
  CreateTemplatePayload,
  FreqUnit,
  TaskTemplate,
  TaskType,
  TemplatePriority,
  UpdateTemplatePayload,
} from '../../../store/maintenance/types';

interface Props {
  template?: TaskTemplate | null; // present → edit
  onClose: () => void;
  onSaved: () => void;
}

/** A field label, with the required-field "*" always styled red, separate from
 * the rest of the (bold/bright navy) label text. */
const FieldLabel: React.FC<{ children: React.ReactNode; required?: boolean }> = ({ children, required }) => (
  <span className={labelCls}>
    {children}
    {required && <span className="text-[15px] font-bold text-red-500"> *</span>}
  </span>
);

interface StepRow {
  title: string;
  keepImageUrl: string | null; // ORIGINAL image from the template, never mutated — only for the "was one set?" check and display
  newBlobName: string | null; // freshly uploaded image blobName to send
  imageRemoved: boolean; // admin clicked Remove on the image this session — sends an explicit clear
  previewUrl: string | null; // local preview for a fresh image upload
  uploading: boolean; // image upload in flight
  keepVideoUrl: string | null; // ORIGINAL video from the template, never mutated — only for the "was one set?" check and display
  newVideoBlobName: string | null; // freshly uploaded video blobName to send
  videoRemoved: boolean; // admin clicked Remove on the video this session — sends an explicit clear
  videoName: string; // uploaded video's original filename, for display only
  uploadingVideo: boolean; // video upload in flight
}

const TemplateModal: React.FC<Props> = ({ template, onClose, onSaved }) => {
  const dispatch = useDispatch<AppDispatch>();
  const editing = Boolean(template);
  // inputCls carries `w-full`, which in a flex row collapses siblings — use a
  // width-free control class for the inline frequency inputs.
  const freqCtrlCls =
    'rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-[13px] text-gray-700 outline-none transition focus:border-[#21295A] focus:bg-white';

  const initialEquip = template?.equipmentCustom ? EQUIPMENT_CUSTOM_SENTINEL : template?.equipment || 'General';

  const presetCats = ['machine', 'electrical', 'general'];
  const isPresetCat = !template || presetCats.includes(template.category);

  const [title, setTitle] = useState(template?.title ?? '');
  const [description, setDescription] = useState(template?.description ?? '');
  const [category, setCategory] = useState(isPresetCat ? (template?.category ?? 'machine') : 'other');
  const [categoryCustom, setCategoryCustom] = useState(isPresetCat ? '' : (template?.category ?? ''));
  const [equipment, setEquipment] = useState(initialEquip);
  const [equipmentCustom, setEquipmentCustom] = useState(template?.equipmentCustom ?? '');
  const [taskType, setTaskType] = useState<TaskType>(template?.taskType ?? 'mech');
  const [taskTypeCustom, setTaskTypeCustom] = useState(template?.taskTypeCustom ?? '');
  // Kept as a string, not a number, so the field can be transiently empty
  // while typing (e.g. backspacing a single digit) -- `setFreqN(parseInt(v,
  // 10) || 1)` on every keystroke used to snap straight back to "1" the
  // moment the field was cleared, making backspace look broken. Coerced to a
  // real number (min 1) only where actually needed: freqNValue below, and
  // again at save time.
  const [freqN, setFreqN] = useState<string>(String(template?.freqN ?? 1));
  const freqNValue = Math.max(1, parseInt(freqN, 10) || 1);
  const [freqUnit, setFreqUnit] = useState<FreqUnit>(template?.freqUnit ?? 'week');
  const [stepRows, setStepRows] = useState<StepRow[]>(
    (template?.steps ?? []).map(s => ({
      title: s.title,
      keepImageUrl: s.imageUrl,
      newBlobName: null,
      imageRemoved: false,
      previewUrl: null,
      uploading: false,
      keepVideoUrl: s.videoUrl,
      newVideoBlobName: null,
      videoRemoved: false,
      videoName: '',
      uploadingVideo: false,
    }))
  );
  const [priority, setPriority] = useState<TemplatePriority>(template?.priority ?? 'medium');
  // Optional convenience only, never enforced at scheduling time (see
  // ScheduleModal's own `defaultLane` prop). Three distinct states: '' = no
  // default (inherit whatever lane tab is open when scheduling), '0' =
  // explicitly Facility-wide, '1'..'7' = a specific lane. Checked against
  // both null and undefined explicitly (not a truthy check) so an existing
  // Facility-wide default (0) isn't mistaken for "no default" when editing.
  const [defaultLane, setDefaultLane] = useState<string>(
    template?.defaultLane !== null && template?.defaultLane !== undefined ? String(template.defaultLane) : ''
  );
  const [status, setStatus] = useState(template?.status ?? 'active');
  // `videoUrl` is only ever used to show the "✓ Video attached" indicator —
  // when editing, `template.videoUrl` is already a resolved, time-limited SAS
  // URL (not the bare blob name stored in the DB), so it must NEVER be sent
  // back to the server as-is. `newVideoBlobName` tracks a fresh upload made
  // in THIS session — only that gets sent on save (see handleSave below),
  // mirroring the per-step video's own newVideoBlobName/keepVideoUrl split,
  // which already avoided this exact trap.
  const [videoUrl, setVideoUrl] = useState<string | null>(template?.videoUrl ?? null);
  const [newVideoBlobName, setNewVideoBlobName] = useState<string | null>(null);
  // True once the admin clicks Remove on an existing video — distinct from
  // "never had one", so handleSave can send an explicit clear instead of
  // just omitting the field (which the backend reads as "untouched").
  const [videoRemoved, setVideoRemoved] = useState(false);
  const [videoName, setVideoName] = useState('');
  const [uploadingVideo, setUploadingVideo] = useState(false);
  const [saving, setSaving] = useState(false);
  const [tried, setTried] = useState(false);
  const videoInputRef = useRef<HTMLInputElement | null>(null);

  const isCustomEquip = equipment === EQUIPMENT_CUSTOM_SENTINEL;
  const isCustomCat = category === 'other';
  const isCustomType = taskType === 'other';
  const errors = {
    title: !title.trim() ? 'Title is required' : '',
    categoryCustom: isCustomCat && !categoryCustom.trim() ? 'Enter the category' : '',
    equipmentCustom: isCustomEquip && !equipmentCustom.trim() ? 'Enter the equipment name' : '',
    taskTypeCustom: isCustomType && !taskTypeCustom.trim() ? 'Enter the type name' : '',
  };
  const hasErrors = Object.values(errors).some(Boolean);

  const handleVideo = async (file: File | null) => {
    if (!file) return;
    setUploadingVideo(true);
    try {
      const blobName = await uploadMaintenanceFile('GLOBAL', file);
      setVideoUrl(blobName);
      setNewVideoBlobName(blobName);
      setVideoRemoved(false);
      setVideoName(file.name);
    } catch {
      toast.error('Could not upload the video');
    } finally {
      setUploadingVideo(false);
    }
  };

  const patchStep = (i: number, patch: Partial<StepRow>) =>
    setStepRows(rows => rows.map((r, j) => (j === i ? { ...r, ...patch } : r)));
  const addStep = () =>
    setStepRows(rows => [
      ...rows,
      {
        title: '',
        keepImageUrl: null,
        newBlobName: null,
        imageRemoved: false,
        previewUrl: null,
        uploading: false,
        keepVideoUrl: null,
        newVideoBlobName: null,
        videoRemoved: false,
        videoName: '',
        uploadingVideo: false,
      },
    ]);
  const removeStep = (i: number) => setStepRows(rows => rows.filter((_, j) => j !== i));
  // Clears the whole image/video state (any fresh upload AND the original
  // kept one) and marks it removed, so handleSave sends an explicit clear
  // rather than silently omitting the field (which the backend reads as
  // "untouched" and would just restore the old value).
  const removeStepImage = (i: number) => patchStep(i, { newBlobName: null, previewUrl: null, imageRemoved: true });
  const removeStepVideo = (i: number) => patchStep(i, { newVideoBlobName: null, videoName: '', videoRemoved: true });
  const uploadStepImage = async (i: number, file: File | null) => {
    if (!file) return;
    patchStep(i, { uploading: true, previewUrl: URL.createObjectURL(file), imageRemoved: false });
    try {
      const blobName = await uploadMaintenanceFile('GLOBAL', file);
      patchStep(i, { newBlobName: blobName, uploading: false });
    } catch {
      toast.error('Could not upload the image');
      patchStep(i, { uploading: false, previewUrl: null });
    }
  };
  const uploadStepVideo = async (i: number, file: File | null) => {
    if (!file) return;
    patchStep(i, { uploadingVideo: true, videoRemoved: false });
    try {
      const blobName = await uploadMaintenanceFile('GLOBAL', file);
      patchStep(i, { newVideoBlobName: blobName, videoName: file.name, uploadingVideo: false });
    } catch {
      toast.error('Could not upload the video');
      patchStep(i, { uploadingVideo: false });
    }
  };
  const anyUploading = uploadingVideo || stepRows.some(s => s.uploading || s.uploadingVideo);

  const handleSave = async () => {
    setTried(true);
    if (hasErrors || anyUploading) return;
    setSaving(true);
    // Send imageUrl/videoUrl on a fresh upload (new value), OR as an explicit
    // null when the admin clicked Remove (the backend only treats a key it
    // never saw at all as "untouched, keep the old one" — see
    // work_item_service.py's _imageProvided/_videoProvided). Omitted
    // entirely only when truly untouched, so the backend keeps whatever it
    // already has. Keep a row with a kept (non-removed) image/video even
    // with no title typed — a step can be "just a photo".
    const stepPayload = stepRows
      .filter(
        s =>
          s.title.trim() ||
          s.newBlobName ||
          s.imageRemoved ||
          (s.keepImageUrl && !s.imageRemoved) ||
          s.newVideoBlobName ||
          s.videoRemoved ||
          (s.keepVideoUrl && !s.videoRemoved)
      )
      .map(s => ({
        title: s.title.trim(),
        ...(s.newBlobName ? { imageUrl: s.newBlobName } : s.imageRemoved ? { imageUrl: null } : {}),
        ...(s.newVideoBlobName ? { videoUrl: s.newVideoBlobName } : s.videoRemoved ? { videoUrl: null } : {}),
      }));
    const base: CreateTemplatePayload = {
      title: title.trim(),
      description: description.trim(),
      category: isCustomCat ? categoryCustom.trim() : category,
      equipment: isCustomEquip ? EQUIPMENT_CUSTOM_SENTINEL : equipment,
      equipmentCustom: isCustomEquip ? equipmentCustom.trim() : null,
      taskType,
      taskTypeCustom: isCustomType ? taskTypeCustom.trim() : null,
      freqN: freqNValue,
      freqUnit,
      steps: stepPayload,
      priority,
      // Never resend `videoUrl` state as-is — when editing it starts out as
      // an already-resolved, time-limited SAS URL (not the bare blob name
      // the DB stores), and saving that back would overwrite the correct
      // value with a link that later expires. Send the new blob name on a
      // fresh upload, an explicit null when the admin clicked Remove, or
      // omit entirely when truly untouched so the backend keeps what it has
      // (model_fields_set — see work_item_service.py's update_template).
      ...(newVideoBlobName ? { videoUrl: newVideoBlobName } : videoRemoved ? { videoUrl: null } : {}),
      defaultLane: defaultLane !== '' ? parseInt(defaultLane, 10) : null,
    };
    try {
      if (editing && template) {
        const payload: UpdateTemplatePayload = { ...base, id: template.id, status };
        await dispatch(updateTemplate(payload)).unwrap();
        toast.success('Task updated');
      } else {
        await dispatch(createTemplate(base)).unwrap();
        toast.success('Task created');
      }
      onSaved();
    } catch (e) {
      toast.error(typeof e === 'string' ? e : 'Could not save the task');
    } finally {
      setSaving(false);
    }
  };

  const errRing = (msg: string) => (tried && msg ? ' border-red-400 ring-1 ring-red-300' : '');

  return (
    <div
      aria-modal="true"
      className="fixed inset-0 z-[640] flex items-center justify-center bg-black/40 p-4"
      role="dialog"
    >
      <div className="flex max-h-[90vh] w-full max-w-[600px] flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="flex items-start justify-between border-b border-gray-100 px-6 py-4">
          <div>
            <h2 className="text-[16px] font-bold text-[#21295A]">{editing ? 'Edit Task' : 'Add Task'}</h2>
            <p className="mt-0.5 text-[12px] text-gray-400">
              {editing ? 'Update this global maintenance task' : 'Define a new global maintenance task'}
            </p>
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

        <div className="flex-1 space-y-4 overflow-y-auto px-6 py-5">
          <div>
            <FieldLabel required>Task Title</FieldLabel>
            <input
              className={`${inputCls}${errRing(errors.title)}`}
              placeholder="e.g. Solenoid Spring Inspection"
              value={title}
              onChange={e => setTitle(e.target.value)}
            />
            {tried && errors.title && <p className="mt-1 text-[11px] text-red-500">{errors.title}</p>}
          </div>

          <div>
            <span className={labelCls}>Description</span>
            <textarea
              className={inputCls}
              placeholder="What needs to be checked or done…"
              rows={3}
              value={description}
              onChange={e => setDescription(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <span className={labelCls}>Category</span>
              <select className={inputCls} value={category} onChange={e => setCategory(e.target.value)}>
                {CATEGORY_OPTIONS.map(c => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <span className={labelCls}>Type</span>
              <select className={inputCls} value={taskType} onChange={e => setTaskType(e.target.value as TaskType)}>
                {TASK_TYPES.map(t => (
                  <option key={t.value} value={t.value}>
                    {t.icon} {t.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {isCustomCat && (
            <div>
              <FieldLabel required>Custom Category</FieldLabel>
              <input
                className={`${inputCls}${errRing(errors.categoryCustom)}`}
                placeholder="Enter category name"
                value={categoryCustom}
                onChange={e => setCategoryCustom(e.target.value)}
              />
              {tried && errors.categoryCustom && (
                <p className="mt-1 text-[11px] text-red-500">{errors.categoryCustom}</p>
              )}
            </div>
          )}

          {isCustomType && (
            <div>
              <FieldLabel required>Custom Type</FieldLabel>
              <input
                className={`${inputCls}${errRing(errors.taskTypeCustom)}`}
                placeholder="Enter type name"
                value={taskTypeCustom}
                onChange={e => setTaskTypeCustom(e.target.value)}
              />
              {tried && errors.taskTypeCustom && (
                <p className="mt-1 text-[11px] text-red-500">{errors.taskTypeCustom}</p>
              )}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <span className={labelCls}>Machine / Equipment</span>
              <select className={inputCls} value={equipment} onChange={e => setEquipment(e.target.value)}>
                {EQUIPMENT_OPTIONS.map(opt => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <span className={labelCls}>Priority</span>
              <select
                className={inputCls}
                value={priority}
                onChange={e => setPriority(e.target.value as TemplatePriority)}
              >
                {PRIORITIES.map(p => (
                  <option key={p.value} value={p.value}>
                    {p.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <span className={labelCls}>Default Lane (optional)</span>
            <select className={inputCls} value={defaultLane} onChange={e => setDefaultLane(e.target.value)}>
              <option value="">No default (choose the lane when scheduling)</option>
              <option value="0">All Lanes (Facility-wide)</option>
              {ALL_LANES.map(n => (
                <option key={n} value={n}>
                  Lane {n}
                </option>
              ))}
            </select>
            <p className="mt-1 text-[11px] text-gray-400">
              Just a suggestion — pre-fills the Lane field when this task is scheduled. It can always be changed there,
              and the task stays schedulable on any lane.
            </p>
          </div>

          {isCustomEquip && (
            <div>
              <FieldLabel required>Custom Equipment</FieldLabel>
              <input
                className={`${inputCls}${errRing(errors.equipmentCustom)}`}
                placeholder="Enter equipment name"
                value={equipmentCustom}
                onChange={e => setEquipmentCustom(e.target.value)}
              />
              {tried && errors.equipmentCustom && (
                <p className="mt-1 text-[11px] text-red-500">{errors.equipmentCustom}</p>
              )}
            </div>
          )}

          <div>
            <span className={labelCls}>Frequency</span>
            <div className="flex items-center gap-2">
              <span className="text-[13px] text-gray-500">Every</span>
              <input
                className={`${freqCtrlCls} w-20`}
                max={99}
                min={1}
                type="number"
                value={freqN}
                onBlur={() => setFreqN(String(freqNValue))}
                onChange={e => setFreqN(e.target.value.replace(/[^0-9]/g, ''))}
              />
              <select
                className={`${freqCtrlCls} min-w-0 flex-1`}
                value={freqUnit}
                onChange={e => setFreqUnit(e.target.value as FreqUnit)}
              >
                {FREQ_UNITS.map(u => (
                  <option key={u.value} value={u.value}>
                    {u.label}
                  </option>
                ))}
              </select>
              <span className="whitespace-nowrap rounded-full bg-[#ecedf4] px-3 py-1 text-[11px] font-semibold text-[#21295A]">
                {freqLabel(freqNValue, freqUnit)}
              </span>
            </div>
            <p className="mt-1 text-[11px] text-gray-400">
              Every 1 Week = Weekly · 2 Weeks = Bi-Weekly · 3 Months = Quarterly · 6 Months = Half-Yearly
            </p>
          </div>

          <div>
            <div className="mb-1.5">
              <span className="text-[13px] font-bold text-[#21295A]">Steps</span>
            </div>
            {stepRows.length === 0 ? (
              <p className="rounded-lg border border-dashed border-gray-200 px-3 py-4 text-center text-[12px] text-gray-400">
                No steps yet — add a step-by-step guide for staff.
              </p>
            ) : (
              <div className="space-y-3">
                {stepRows.map((s, i) => {
                  const preview = s.previewUrl || (!s.imageRemoved ? s.keepImageUrl : null);
                  const hasVideo = Boolean(s.newVideoBlobName || (s.keepVideoUrl && !s.videoRemoved));
                  return (
                    <div key={i} className="rounded-xl border border-gray-100 bg-gray-50 p-3">
                      <div className="mb-2 flex items-center justify-between">
                        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#21295A] text-[11px] font-bold text-white">
                          {i + 1}
                        </span>
                        <button
                          className="text-[11px] font-semibold text-red-400 hover:text-red-600"
                          type="button"
                          onClick={() => removeStep(i)}
                        >
                          Remove
                        </button>
                      </div>
                      <span className={labelCls}>Step Title</span>
                      <input
                        className={inputCls}
                        placeholder="Step description"
                        value={s.title}
                        onChange={e => patchStep(i, { title: e.target.value })}
                      />
                      <span className={`${labelCls} mt-2`}>Image (optional)</span>
                      {preview ? (
                        <div className="flex items-center gap-3">
                          <img
                            alt={`Step ${i + 1}`}
                            className="h-16 w-16 rounded-lg border border-gray-200 object-cover"
                            src={preview}
                          />
                          <label className="cursor-pointer text-[11.5px] font-semibold text-indigo-600 hover:text-indigo-700">
                            {s.uploading ? 'Uploading…' : 'Replace'}
                            <input
                              accept="image/*"
                              className="hidden"
                              disabled={s.uploading}
                              type="file"
                              onChange={e => uploadStepImage(i, e.target.files?.[0] ?? null)}
                            />
                          </label>
                          <button
                            className="text-[11.5px] font-semibold text-red-400 hover:text-red-600"
                            disabled={s.uploading}
                            type="button"
                            onClick={() => removeStepImage(i)}
                          >
                            Remove
                          </button>
                        </div>
                      ) : (
                        <label className="flex cursor-pointer items-center justify-center rounded-lg border border-dashed border-gray-300 bg-white px-3 py-2.5 text-[12px] font-semibold text-gray-500 hover:border-indigo-300 hover:text-indigo-600">
                          {s.uploading ? 'Uploading…' : 'Upload Image'}
                          <input
                            accept="image/*"
                            className="hidden"
                            disabled={s.uploading}
                            type="file"
                            onChange={e => uploadStepImage(i, e.target.files?.[0] ?? null)}
                          />
                        </label>
                      )}
                      <span className={`${labelCls} mt-2`}>Video (optional)</span>
                      {hasVideo ? (
                        <div className="flex items-center gap-3">
                          <span className="flex items-center gap-1.5 text-[11.5px] text-gray-500">
                            🎬 {s.videoName || 'Video attached'}
                          </span>
                          <label className="cursor-pointer text-[11.5px] font-semibold text-indigo-600 hover:text-indigo-700">
                            {s.uploadingVideo ? 'Uploading…' : 'Replace'}
                            <input
                              accept="video/*"
                              className="hidden"
                              disabled={s.uploadingVideo}
                              type="file"
                              onChange={e => uploadStepVideo(i, e.target.files?.[0] ?? null)}
                            />
                          </label>
                          <button
                            className="text-[11.5px] font-semibold text-red-400 hover:text-red-600"
                            disabled={s.uploadingVideo}
                            type="button"
                            onClick={() => removeStepVideo(i)}
                          >
                            Remove
                          </button>
                        </div>
                      ) : (
                        <label className="flex cursor-pointer items-center justify-center rounded-lg border border-dashed border-gray-300 bg-white px-3 py-2.5 text-[12px] font-semibold text-gray-500 hover:border-indigo-300 hover:text-indigo-600">
                          🎬 {s.uploadingVideo ? 'Uploading…' : 'Upload Video'}
                          <input
                            accept="video/*"
                            className="hidden"
                            disabled={s.uploadingVideo}
                            type="file"
                            onChange={e => uploadStepVideo(i, e.target.files?.[0] ?? null)}
                          />
                        </label>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
            {/* Add-step button lives below the list so new steps append downward. */}
            <button
              className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-indigo-200 bg-indigo-50 px-2.5 py-2 text-[12px] font-semibold text-indigo-600 transition hover:bg-indigo-100"
              type="button"
              onClick={addStep}
            >
              Add Step
            </button>
          </div>

          <div>
            <span className={labelCls}>Task Video</span>
            <div className="flex items-center gap-3">
              <label className="flex cursor-pointer items-center gap-1.5 rounded-lg border border-dashed border-gray-300 bg-gray-50 px-3 py-1.5 text-[11.5px] font-semibold text-gray-500 hover:bg-gray-100">
                🎬 {uploadingVideo ? 'Uploading…' : 'Upload video'}
                <input
                  ref={videoInputRef}
                  accept="video/*"
                  className="hidden"
                  disabled={uploadingVideo}
                  type="file"
                  onChange={e => {
                    const file = e.target.files?.[0] ?? null;
                    // Reset immediately so re-picking the same file (e.g. after Remove) still fires onChange.
                    e.target.value = '';
                    handleVideo(file);
                  }}
                />
              </label>
              {videoUrl && (
                <span className="flex items-center gap-2 text-[11.5px] text-gray-500">
                  ✓ {videoName || 'Video attached'}
                  <button
                    className="text-red-400 hover:text-red-600"
                    type="button"
                    onClick={() => {
                      setVideoUrl(null);
                      setNewVideoBlobName(null);
                      setVideoRemoved(true);
                      setVideoName('');
                      if (videoInputRef.current) videoInputRef.current.value = '';
                    }}
                  >
                    Remove
                  </button>
                </span>
              )}
            </div>
          </div>

          {editing && (
            <div>
              <span className={labelCls}>Status</span>
              <select
                className={inputCls}
                value={status}
                onChange={e => setStatus(e.target.value as 'active' | 'archived')}
              >
                <option value="active">Active — available at all centres</option>
                <option value="archived">Archived — hidden from centres</option>
              </select>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 border-t border-gray-100 px-6 py-4">
          <button
            className="rounded-lg border border-gray-200 px-4 py-2 text-[12px] font-semibold text-gray-600 transition hover:bg-gray-50 disabled:opacity-50"
            disabled={saving}
            type="button"
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            className="rounded-lg bg-[#21295A] px-5 py-2 text-[12px] font-semibold text-white shadow-sm transition hover:bg-[#2d3570] disabled:opacity-50"
            disabled={saving || anyUploading}
            type="button"
            onClick={handleSave}
          >
            {saving ? 'Saving…' : editing ? 'Save Task' : 'Create Task'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default TemplateModal;
