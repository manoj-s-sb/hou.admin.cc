import React, { useState } from 'react';

import { toast } from 'react-hot-toast';
import { useDispatch } from 'react-redux';

import { createTemplate, updateTemplate, uploadMaintenanceFile } from '../../../store/maintenance/api';
import { AppDispatch } from '../../../store/store';
import {
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

interface StepRow {
  title: string;
  keepImageUrl: string | null; // existing image (display only; preserved server-side on save)
  newBlobName: string | null; // freshly uploaded blobName to send
  previewUrl: string | null; // local preview for a fresh upload
  uploading: boolean;
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
  const [category, setCategory] = useState(isPresetCat ? template?.category ?? 'machine' : 'other');
  const [categoryCustom, setCategoryCustom] = useState(isPresetCat ? '' : template?.category ?? '');
  const [equipment, setEquipment] = useState(initialEquip);
  const [equipmentCustom, setEquipmentCustom] = useState(template?.equipmentCustom ?? '');
  const [taskType, setTaskType] = useState<TaskType>(template?.taskType ?? 'mech');
  const [freqN, setFreqN] = useState<number>(template?.freqN ?? 1);
  const [freqUnit, setFreqUnit] = useState<FreqUnit>(template?.freqUnit ?? 'week');
  const [stepRows, setStepRows] = useState<StepRow[]>(
    (template?.steps ?? []).map(s => ({
      title: s.title,
      keepImageUrl: s.imageUrl,
      newBlobName: null,
      previewUrl: null,
      uploading: false,
    }))
  );
  const [priority, setPriority] = useState<TemplatePriority>(template?.priority ?? 'medium');
  const [status, setStatus] = useState(template?.status ?? 'active');
  const [videoUrl, setVideoUrl] = useState<string | null>(template?.videoUrl ?? null);
  const [videoName, setVideoName] = useState('');
  const [uploadingVideo, setUploadingVideo] = useState(false);
  const [saving, setSaving] = useState(false);
  const [tried, setTried] = useState(false);

  const isCustomEquip = equipment === EQUIPMENT_CUSTOM_SENTINEL;
  const isCustomCat = category === 'other';
  const errors = {
    title: !title.trim() ? 'Title is required' : '',
    categoryCustom: isCustomCat && !categoryCustom.trim() ? 'Enter the category' : '',
    equipmentCustom: isCustomEquip && !equipmentCustom.trim() ? 'Enter the equipment name' : '',
  };
  const hasErrors = Object.values(errors).some(Boolean);

  const handleVideo = async (file: File | null) => {
    if (!file) return;
    setUploadingVideo(true);
    try {
      const blobName = await uploadMaintenanceFile('GLOBAL', file);
      setVideoUrl(blobName);
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
    setStepRows(rows => [...rows, { title: '', keepImageUrl: null, newBlobName: null, previewUrl: null, uploading: false }]);
  const removeStep = (i: number) => setStepRows(rows => rows.filter((_, j) => j !== i));
  const uploadStepImage = async (i: number, file: File | null) => {
    if (!file) return;
    patchStep(i, { uploading: true, previewUrl: URL.createObjectURL(file) });
    try {
      const blobName = await uploadMaintenanceFile('GLOBAL', file);
      patchStep(i, { newBlobName: blobName, uploading: false });
    } catch {
      toast.error('Could not upload the image');
      patchStep(i, { uploading: false, previewUrl: null });
    }
  };

  const anyUploading = uploadingVideo || stepRows.some(s => s.uploading);

  const handleSave = async () => {
    setTried(true);
    if (hasErrors || anyUploading) return;
    setSaving(true);
    // Only send imageUrl for steps with a fresh upload; on update the backend keeps
    // an existing step's image (matched by order) when imageUrl is omitted.
    const stepPayload = stepRows
      .filter(s => s.title.trim())
      .map(s => ({ title: s.title.trim(), ...(s.newBlobName ? { imageUrl: s.newBlobName } : {}) }));
    const base: CreateTemplatePayload = {
      title: title.trim(),
      description: description.trim(),
      category: isCustomCat ? categoryCustom.trim() : category,
      equipment: isCustomEquip ? EQUIPMENT_CUSTOM_SENTINEL : equipment,
      equipmentCustom: isCustomEquip ? equipmentCustom.trim() : null,
      taskType,
      freqN: Math.max(1, freqN || 1),
      freqUnit,
      steps: stepPayload,
      priority,
      videoUrl,
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
    <div aria-modal="true" className="fixed inset-0 z-[640] flex items-center justify-center bg-black/40 p-4" role="dialog">
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
            <span className={labelCls}>Task Title *</span>
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
              <span className={labelCls}>Custom Category *</span>
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

          {isCustomEquip && (
            <div>
              <span className={labelCls}>Custom Equipment *</span>
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
                onChange={e => setFreqN(parseInt(e.target.value, 10) || 1)}
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
                {freqLabel(Math.max(1, freqN || 1), freqUnit)}
              </span>
            </div>
            <p className="mt-1 text-[11px] text-gray-400">
              Every 1 Week = Weekly · 2 Weeks = Bi-Weekly · 3 Months = Quarterly · 6 Months = Half-Yearly
            </p>
          </div>

          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <span className="text-[13px] font-bold text-[#21295A]">Steps</span>
              <button
                className="rounded-lg border border-indigo-200 bg-indigo-50 px-2.5 py-1 text-[11.5px] font-semibold text-indigo-600 transition hover:bg-indigo-100"
                type="button"
                onClick={addStep}
              >
                + Add Step
              </button>
            </div>
            {stepRows.length === 0 ? (
              <p className="rounded-lg border border-dashed border-gray-200 px-3 py-4 text-center text-[12px] text-gray-400">
                No steps yet — add a step-by-step guide for staff.
              </p>
            ) : (
              <div className="space-y-3">
                {stepRows.map((s, i) => {
                  const preview = s.previewUrl || s.keepImageUrl;
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
                      <span className={`${labelCls} mt-2`}>Image</span>
                      {preview ? (
                        <div className="flex items-center gap-3">
                          <img alt={`Step ${i + 1}`} className="h-16 w-16 rounded-lg border border-gray-200 object-cover" src={preview} />
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
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div>
            <span className={labelCls}>Task Video</span>
            <div className="flex items-center gap-3">
              <label className="flex cursor-pointer items-center gap-1.5 rounded-lg border border-dashed border-gray-300 bg-gray-50 px-3 py-1.5 text-[11.5px] font-semibold text-gray-500 hover:bg-gray-100">
                🎬 {uploadingVideo ? 'Uploading…' : 'Upload video'}
                <input
                  accept="video/*"
                  className="hidden"
                  disabled={uploadingVideo}
                  type="file"
                  onChange={e => handleVideo(e.target.files?.[0] ?? null)}
                />
              </label>
              {videoUrl && (
                <span className="flex items-center gap-2 text-[11.5px] text-gray-500">
                  ✓ {videoName || 'Video attached'}
                  <button className="text-red-400 hover:text-red-600" type="button" onClick={() => setVideoUrl(null)}>
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
