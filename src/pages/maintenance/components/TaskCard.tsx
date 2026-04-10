import { Work } from '../../../store/maintenance/types';

interface TaskCardProps {
  item: Work;
  onSchedule: (item: Work) => void;
  onStepsView: (item: Work) => void;
}

const TaskCard = ({ item, onSchedule, onStepsView }: TaskCardProps) => (
  <div className="flex items-start justify-between rounded-xl border border-blue-100 bg-white px-5 py-4 shadow-sm">
    <div className="flex flex-col gap-2">
      <p className="text-sm font-bold text-gray-900">{item.title}</p>

      <div className="flex items-center gap-2">
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
        {item.laneNo && (
          <span className="rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-medium text-blue-600">
            Lane {item.laneNo}
          </span>
        )}
      </div>

      {item.notes && <p className="break-all text-xs text-gray-500">{item.notes}</p>}

      {(item.lastCompletedAt || item.nextDueDate) && (
        <div className="flex flex-wrap gap-3">
          {item.lastCompletedAt && (
            <span className="flex items-center gap-1 text-xs text-gray-400">
              <svg className="h-3 w-3 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} />
              </svg>
              Last done:{' '}
              <span className="font-medium text-gray-600">
                {new Date(item.lastCompletedAt).toLocaleString('en-US', {
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                  month: 'short',
                  year: 'numeric',
                })}
              </span>
            </span>
          )}
          {item.nextDueDate && (
            <span className="flex items-center gap-1 text-xs text-gray-400">
              <svg className="h-3 w-3 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                />
              </svg>
              Next due:{' '}
              <span className="font-medium text-gray-600">
                {new Date(item.nextDueDate).toLocaleDateString('en-US', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                })}
              </span>
            </span>
          )}
        </div>
      )}

      {item.actionTaken && (
        <div className="flex items-start gap-1.5 rounded-lg bg-gray-50 px-3 py-2">
          <svg
            className="mt-0.5 h-3.5 w-3.5 shrink-0 text-green-500"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} />
          </svg>
          <p className="break-all text-xs text-gray-600">
            <span className="font-medium">Action taken:</span> {item.actionTaken}
          </p>
        </div>
      )}

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

    <button
      className={`ml-4 flex shrink-0 flex-col items-center gap-0.5 rounded-lg px-4 py-2 text-xs font-semibold transition-colors ${
        item.scheduledDate
          ? 'border border-green-200 bg-green-50 text-green-700 hover:bg-green-100'
          : 'bg-[#21295A] text-white hover:bg-[#1a2149]'
      }`}
      type="button"
      onClick={() => onSchedule(item)}
    >
      <span className="flex items-center gap-1.5">
        <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
          />
        </svg>
        {item.scheduledDate ? 'Scheduled' : 'Schedule'}
      </span>
      {item.scheduledDate && (
        <span className="text-[10px] font-normal text-green-600">
          {new Date(item.scheduledDate).toLocaleDateString('en-US', { day: 'numeric', month: 'short' })}
        </span>
      )}
    </button>
  </div>
);

export default TaskCard;
