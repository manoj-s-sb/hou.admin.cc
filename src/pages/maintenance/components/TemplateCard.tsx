import React from 'react';

import { freqBadgeCls, freqLabel, priorityMeta, taskTypeMeta } from '../constants';

import type { TaskTemplate } from '../../../store/maintenance/types';

interface Props {
  template: TaskTemplate;
  canManage: boolean;
  /** Present only in a centre context — lets staff schedule this template here. */
  onSchedule?: (t: TaskTemplate) => void;
  scheduledCount?: number;
  onViewSteps: (t: TaskTemplate) => void;
  onEdit?: (t: TaskTemplate) => void;
  onArchiveToggle?: (t: TaskTemplate) => void;
}

const TemplateCard: React.FC<Props> = ({
  template,
  canManage,
  onSchedule,
  scheduledCount = 0,
  onViewSteps,
  onEdit,
  onArchiveToggle,
}) => {
  const type = taskTypeMeta(template.taskType);
  const prio = priorityMeta(template.priority);
  const archived = template.status === 'archived';
  const equipmentText = template.equipmentCustom || template.equipment || 'General';

  return (
    <div
      className={`flex flex-col rounded-xl border bg-white p-4 shadow-sm transition-shadow hover:shadow-md ${
        archived ? 'border-gray-200 opacity-60' : 'border-gray-200'
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${type.badge}`}>
            {type.icon} {type.label}
          </span>
          {archived && (
            <span className="rounded bg-gray-100 px-1.5 py-0.5 text-[10px] font-semibold text-gray-500">Archived</span>
          )}
        </div>
        {canManage && (
          <div className="flex flex-shrink-0 items-center gap-1.5 text-[11px] font-semibold">
            {onEdit && (
              <button className="text-gray-500 hover:text-[#21295A]" type="button" onClick={() => onEdit(template)}>
                Edit
              </button>
            )}
            {onArchiveToggle && (
              <button
                className={archived ? 'text-emerald-600 hover:text-emerald-700' : 'text-red-400 hover:text-red-600'}
                type="button"
                onClick={() => onArchiveToggle(template)}
              >
                {archived ? 'Restore' : 'Archive'}
              </button>
            )}
          </div>
        )}
      </div>

      <div className="mt-2 text-[14px] font-bold text-[#21295A]">{template.title}</div>
      <div className="text-[12px] text-gray-500">{equipmentText}</div>
      {template.description && (
        <p className="mt-1.5 line-clamp-2 text-[12px] text-gray-600">{template.description}</p>
      )}

      <div className="mt-2.5 flex flex-wrap items-center gap-1.5 text-[11px]">
        <span className={`rounded px-1.5 py-0.5 font-semibold ${freqBadgeCls(template.freqN, template.freqUnit)}`}>
          {freqLabel(template.freqN, template.freqUnit)}
        </span>
        <span className={`rounded px-1.5 py-0.5 font-semibold ${prio.pill}`}>{prio.label}</span>
        <span className="text-gray-400">
          {template.steps.length} step{template.steps.length === 1 ? '' : 's'}
        </span>
      </div>

      <div className="mt-3 flex items-center justify-between border-t border-gray-50 pt-2.5">
        <button
          className="text-[11.5px] font-semibold text-indigo-600 hover:text-indigo-700"
          type="button"
          onClick={() => onViewSteps(template)}
        >
          📋 View steps{template.videoUrl ? ' & video' : ''}
        </button>
        {onSchedule ? (
          scheduledCount > 0 ? (
            <span className="rounded-lg bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700">
              ✓ Scheduled ({scheduledCount})
            </span>
          ) : canManage ? (
            <button
              className="rounded-lg bg-[#21295A] px-3 py-1.5 text-[11.5px] font-semibold text-white transition hover:bg-[#2d3570]"
              type="button"
              onClick={() => onSchedule(template)}
            >
              📅 Schedule
            </button>
          ) : null
        ) : (
          <span className="text-[10.5px] text-gray-400">{new Date(template.createdAt).toLocaleDateString('en-CA')}</span>
        )}
      </div>
    </div>
  );
};

export default TemplateCard;
