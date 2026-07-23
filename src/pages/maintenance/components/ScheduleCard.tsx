import React, { useState } from 'react';

import { toast } from 'react-hot-toast';
import { useDispatch } from 'react-redux';

import { completeTask, uploadMaintenanceFile } from '../../../store/maintenance/api';
import { AppDispatch } from '../../../store/store';
import { freqBadgeCls, freqLabel, priorityMeta, taskTypeMeta } from '../constants';

import type { TaskSchedule } from '../../../store/maintenance/types';

interface Props {
  schedule: TaskSchedule;
  canManage: boolean;
  facilityCode: string;
  onChanged: () => void;
  onFlag: (s: TaskSchedule) => void;
  onViewSteps: (s: TaskSchedule) => void;
  onReschedule?: (s: TaskSchedule) => void;
  onUnschedule?: (s: TaskSchedule) => void;
}

const fmtShort = (d: string | null): string =>
  d ? new Date(`${d}T00:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '—';

const isImage = (url: string) => /\.(png|jpe?g|webp|gif)$/i.test(url.split('?')[0]);

const ScheduleCard: React.FC<Props> = ({
  schedule,
  canManage,
  facilityCode,
  onChanged,
  onFlag,
  onViewSteps,
  onReschedule,
  onUnschedule,
}) => {
  const dispatch = useDispatch<AppDispatch>();
  const t = schedule.template;
  const type = taskTypeMeta(t.taskType);
  const prio = priorityMeta(t.priority);
  const isDone = schedule.status === 'done';
  const isOverdue = schedule.status === 'overdue';

  const [comment, setComment] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [saving, setSaving] = useState(false);
  const [preview, setPreview] = useState<string | null>(null); // in-page image lightbox

  const handleMarkDone = async () => {
    setSaving(true);
    try {
      let attachments: string[] = [];
      if (files.length) attachments = await Promise.all(files.map(f => uploadMaintenanceFile(facilityCode, f)));
      await dispatch(
        completeTask({
          id: schedule.id,
          facilityCode,
          actionTaken: comment.trim() || undefined,
          attachments: attachments.length ? attachments : undefined,
        })
      ).unwrap();
      toast.success('Task completed');
      setComment('');
      setFiles([]);
      onChanged();
    } catch (e) {
      toast.error(typeof e === 'string' ? e : 'Could not complete the task');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className={`flex gap-4 rounded-xl border p-4 ${
        isDone
          ? 'border-teal-200 bg-teal-50/50'
          : isOverdue
            ? 'border-red-200 bg-red-50/40'
            : 'border-gray-200 bg-white'
      }`}
    >
      {/* Left — details */}
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[14px] font-bold text-[#21295A]">{t.title}</span>
          {schedule.laneNo ? (
            <span className="rounded bg-[#f0f4ff] px-1.5 py-0.5 text-[10px] font-semibold text-[#4338ca]">
              Lane {schedule.laneNo}
            </span>
          ) : (
            <span className="rounded bg-gray-100 px-1.5 py-0.5 text-[10px] font-semibold text-gray-500">
              Facility-wide
            </span>
          )}
        </div>

        {t.description && <p className="mt-1 text-[12px] text-gray-600">{t.description}</p>}

        <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[11px]">
          <span className={`rounded px-1.5 py-0.5 font-semibold ${type.badge}`}>
            {type.icon} {type.label}
          </span>
          <span className={`rounded px-1.5 py-0.5 font-semibold ${freqBadgeCls(t.freqN, t.freqUnit)}`}>
            {freqLabel(t.freqN, t.freqUnit)}
          </span>
          <span className={`rounded px-1.5 py-0.5 font-semibold ${prio.pill}`}>{prio.label}</span>
        </div>

        <div className="mt-2 flex flex-wrap items-center gap-2">
          <button
            className="text-[11.5px] font-semibold text-indigo-600 hover:text-indigo-700"
            type="button"
            onClick={() => onViewSteps(schedule)}
          >
            📋 View steps{t.videoUrl ? ' & video' : ''}
          </button>
          {isOverdue && (
            <span className="rounded-full border border-red-200 bg-red-50 px-2 py-0.5 text-[10.5px] font-semibold text-red-600">
              🔴 Overdue
            </span>
          )}
          {isDone && (
            <span className="rounded-full border border-teal-200 bg-teal-50 px-2 py-0.5 text-[10.5px] font-semibold text-teal-700">
              ✓ Done{schedule.lastCompletedAt ? ` · ${fmtShort(schedule.lastCompletedAt.split('T')[0])}` : ''}
            </span>
          )}
        </div>

        {isDone && schedule.actionTaken && (
          <p className="mt-2 rounded-lg bg-white/70 px-3 py-2 text-[12px] text-gray-600">✓ {schedule.actionTaken}</p>
        )}

        {/* Inline comment (before completing) */}
        {!isDone && (
          <>
            <textarea
              className="mt-2 w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-[12.5px] text-gray-700 outline-none focus:border-[#21295A] focus:bg-white"
              placeholder="Add a comment (optional)…"
              rows={2}
              value={comment}
              onChange={e => setComment(e.target.value)}
            />
            {(comment.trim() || files.length > 0) && (
              <p className="mt-1 text-[11px] text-gray-400">
                Your comment{files.length ? ' & attachment' : ''} is saved when you tap{' '}
                <span className="font-semibold text-teal-700">Mark Done</span>.
              </p>
            )}
          </>
        )}

        {/* Attachments — existing + newly picked */}
        {(schedule.attachments.length > 0 || files.length > 0) && (
          <div className="mt-2 flex flex-wrap gap-2">
            {schedule.attachments.map((a, i) =>
              isImage(a.blobName) ? (
                <button
                  key={`e${i}`}
                  aria-label="Open attachment"
                  className="block h-12 w-12 overflow-hidden rounded-lg border border-gray-100"
                  type="button"
                  onClick={() => setPreview(a.blobName)}
                >
                  <img alt="attachment" className="h-full w-full object-cover" src={a.blobName} />
                </button>
              ) : (
                <a
                  key={`e${i}`}
                  className="flex h-12 items-center rounded-lg border border-gray-200 bg-gray-50 px-2 text-[10px] font-semibold text-gray-500 hover:bg-gray-100"
                  href={a.blobName}
                  rel="noreferrer"
                  target="_blank"
                >
                  🎬 File
                </a>
              )
            )}
            {files.map((f, i) => (
              <span
                key={`n${i}`}
                className="flex h-12 items-center gap-1 rounded-lg border border-dashed border-gray-300 bg-gray-50 px-2 text-[10px] font-semibold text-gray-500"
              >
                📎 {f.name.length > 12 ? `${f.name.slice(0, 12)}…` : f.name}
                <button
                  className="text-red-400 hover:text-red-600"
                  type="button"
                  onClick={() => setFiles(files.filter((_, j) => j !== i))}
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Right — actions (outline style, matching the reference) */}
      <div className="flex w-32 flex-shrink-0 flex-col gap-2">
        {!isDone && (
          <button
            className="flex items-center justify-center gap-1.5 rounded-lg border border-teal-300 bg-teal-50 px-3 py-2 text-[12px] font-semibold text-teal-700 transition hover:bg-teal-600 hover:text-white disabled:opacity-50"
            disabled={saving}
            type="button"
            onClick={handleMarkDone}
          >
            {saving ? 'Saving…' : '✓ Mark Done'}
          </button>
        )}
        <button
          className="flex items-center justify-center gap-1.5 rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-[12px] font-semibold text-red-600 transition hover:bg-red-600 hover:text-white"
          type="button"
          onClick={() => onFlag(schedule)}
        >
          ⚑ Flag Issue
        </button>
        {!isDone && (
          <label className="flex cursor-pointer items-center justify-center gap-1.5 rounded-lg border border-gray-200 px-3 py-2 text-[12px] font-semibold text-gray-500 transition hover:bg-gray-50">
            📎 Attach
            <input
              multiple
              accept="image/*,video/*"
              className="hidden"
              type="file"
              onChange={e => {
                setFiles(prev => [...prev, ...Array.from(e.target.files ?? [])]);
                e.target.value = '';
              }}
            />
          </label>
        )}
        {canManage && onReschedule ? (
          // Clickable on every card — pending tasks reschedule their own date;
          // done/recurred tasks reschedule their next occurrence date.
          <button
            className="flex items-center justify-center gap-1.5 rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-2 text-[12px] font-semibold text-emerald-700 transition hover:bg-emerald-600 hover:text-white"
            title={isDone ? 'Change the next scheduled date' : 'Reschedule — change the date'}
            type="button"
            onClick={() => onReschedule(schedule)}
          >
            📅 {fmtShort(isDone ? schedule.nextDueDate || schedule.scheduledDate : schedule.scheduledDate)}
          </button>
        ) : (
          <span className="flex items-center justify-center gap-1.5 rounded-lg border border-emerald-200 px-3 py-2 text-[12px] font-semibold text-emerald-600">
            📅 {fmtShort(schedule.nextDueDate || schedule.scheduledDate)}
          </span>
        )}
        {canManage && onUnschedule && (
          <button
            className="flex items-center justify-center rounded-lg border border-gray-200 px-3 py-1.5 text-[11px] font-semibold text-gray-400 transition hover:border-gray-300 hover:bg-gray-50 hover:text-gray-600"
            type="button"
            onClick={() => onUnschedule(schedule)}
          >
            Remove
          </button>
        )}
      </div>

      {/* In-page image preview — click anywhere to close (stays on this page). */}
      {preview && (
        // eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions
        <div
          className="fixed inset-0 z-[700] flex items-center justify-center bg-black/80 p-6"
          onClick={() => setPreview(null)}
        >
          <img alt="attachment preview" className="max-h-full max-w-full rounded-lg object-contain" src={preview} />
        </div>
      )}
    </div>
  );
};

export default ScheduleCard;
