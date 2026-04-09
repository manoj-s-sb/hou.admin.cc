import { useRef, useState } from 'react';

import { toast } from 'react-hot-toast';

import { getWorkUploadUrl, updateWork, uploadFileToBlob } from '../../../store/maintenance/api';
import { Work } from '../../../store/maintenance/types';
import { FACILITY_CODE, getLocalUser } from '../constants';

interface ScheduleCardProps {
  item: Work;
  dispatch: any;
  updatedBy: string;
  onMarkDone: (item: Work) => void;
  onFlagIssue: (item: Work) => void;
  onSchedule: (item: Work) => void;
  onStepsView: (item: Work) => void;
  onUndo: (item: Work) => void;
  onSuccess: () => void;
}

const ScheduleCard = ({ item, dispatch, updatedBy, onMarkDone, onFlagIssue, onSchedule, onStepsView, onUndo, onSuccess }: ScheduleCardProps) => {
  const isIssue = item.status === 'issue';
  const [attaching, setAttaching] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleAttach = async (files: FileList) => {
    if (!files.length) return;
    setAttaching(true);
    try {
      const blobNames = await Promise.all(
        Array.from(files).map(async file => {
          const { uploadUrl, blobName } = await getWorkUploadUrl(FACILITY_CODE, file.name);
          await uploadFileToBlob(uploadUrl, file);
          return blobName;
        })
      );
      const { name: updatedByName } = getLocalUser();
      const existing = item.attachments || [];
      await dispatch(updateWork({
        itemId: item.itemId,
        attachments: [...existing, ...blobNames],
        ...(updatedBy ? { updatedBy } : {}),
        ...(updatedByName ? { updatedByName } : {}),
      })).unwrap();
      toast.success(`${blobNames.length} file${blobNames.length > 1 ? 's' : ''} attached.`);
      onSuccess();
    } catch {
      toast.error('Failed to attach files.');
    } finally {
      setAttaching(false);
    }
  };

  return (
    <div className={`flex items-start justify-between rounded-xl border bg-white px-5 py-4 shadow-sm ${isIssue ? 'border-red-100' : 'border-blue-100'}`}>
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <p className="text-sm font-bold text-gray-900">{item.title}</p>
          {item.laneNo && (
            <span className="rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-medium text-blue-600">Lane {item.laneNo}</span>
          )}
          {isIssue && (
            <span className="rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-semibold text-red-600">Issue Raised</span>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {item.category && (
            <span className="flex items-center gap-1 rounded-full bg-yellow-100 px-2.5 py-0.5 text-xs font-medium text-yellow-700">
              <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                />
                <path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} />
              </svg>
              {item.category.charAt(0).toUpperCase() + item.category.slice(1)}
            </span>
          )}
          {item.frequency && (
            <span className="rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-700">
              {item.frequency.charAt(0).toUpperCase() + item.frequency.slice(1)}
            </span>
          )}
          {item.scheduledDate && (
            <span className="flex items-center gap-1 rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs font-medium text-indigo-600">
              <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} />
              </svg>
              From {new Date(item.scheduledDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            </span>
          )}
        </div>

        {item.notes && <p className="text-xs text-gray-500">{item.notes}</p>}

        {item.steps && item.steps.length > 0 && (
          <button
            className="flex items-center gap-1 text-xs font-medium text-indigo-600 hover:underline"
            type="button"
            onClick={() => onStepsView(item)}
          >
            <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
              />
            </svg>
            View steps &amp; video
          </button>
        )}
      </div>

      <div className="ml-6 flex shrink-0 flex-col gap-2">
        <button
          disabled={isIssue}
          className={`flex items-center gap-1.5 rounded-lg px-4 py-2 text-xs font-semibold transition-colors ${
            isIssue
              ? 'cursor-not-allowed border border-gray-100 bg-gray-50 text-gray-300'
              : 'bg-green-500 text-white hover:bg-green-600'
          }`}
          type="button"
          onClick={() => !isIssue && onMarkDone(item)}
        >
          <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} />
          </svg>
          Mark Done
        </button>
        <button
          disabled={isIssue}
          className={`flex items-center gap-1.5 rounded-lg px-4 py-2 text-xs font-semibold transition-colors ${
            isIssue
              ? 'cursor-not-allowed border border-gray-100 bg-gray-50 text-gray-300'
              : 'bg-red-500 text-white hover:bg-red-600'
          }`}
          type="button"
          onClick={() => !isIssue && onFlagIssue(item)}
        >
          <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path d="M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-3 6 3 6H11.5l-1-1H5v4m0-4h14" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} />
          </svg>
          Flag Issue
        </button>
        <button
          disabled={isIssue || attaching}
          className={`flex items-center gap-1.5 rounded-lg border px-4 py-2 text-xs font-medium transition-colors ${
            isIssue || attaching
              ? 'cursor-not-allowed border-gray-100 bg-gray-50 text-gray-300'
              : 'border-gray-200 bg-white text-gray-500 hover:bg-gray-50'
          }`}
          type="button"
          onClick={() => !isIssue && !attaching && fileInputRef.current?.click()}
        >
          <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} />
          </svg>
          {attaching ? 'Uploading...' : 'Attach'}
        </button>
        <input
          ref={fileInputRef}
          className="hidden"
          multiple
          type="file"
          onChange={e => {
            if (e.target.files) handleAttach(e.target.files);
            e.target.value = '';
          }}
        />

        {/* Undo — only visible when status is issue */}
        {isIssue && (
          <button
            className="flex items-center gap-1.5 rounded-lg border border-orange-200 bg-orange-50 px-4 py-2 text-xs font-semibold text-orange-600 transition-colors hover:bg-orange-100"
            type="button"
            onClick={() => onUndo(item)}
          >
            <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} />
            </svg>
            Undo
          </button>
        )}

        <button
          className={`flex items-center gap-1.5 rounded-lg border px-4 py-2 text-xs font-semibold transition-colors ${
            item.scheduledDate
              ? 'border-green-400 bg-white text-green-600 hover:bg-green-50'
              : 'border-gray-300 bg-white text-gray-500 hover:bg-gray-50'
          }`}
          type="button"
          onClick={() => onSchedule(item)}
        >
          <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} />
          </svg>
          {item.scheduledDate ? 'Scheduled' : 'Schedule'}
        </button>
      </div>
    </div>
  );
};

export default ScheduleCard;
