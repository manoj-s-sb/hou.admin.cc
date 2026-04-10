import { Work } from '../../../store/maintenance/types';

interface IssueCardProps {
  item: Work;
  index: number;
  onViewIssue?: (item: Work, index: number) => void;
}

const priorityDot: Record<string, string> = {
  high: 'bg-red-500',
  medium: 'bg-orange-400',
  low: 'bg-green-500',
};

const statusBadge: Record<string, string> = {
  open: 'bg-orange-100 text-orange-700',
  assigned: 'bg-orange-100 text-orange-700',
  issue: 'bg-orange-100 text-orange-700',
  inprogress: 'bg-blue-100 text-blue-700',
  resolved: 'bg-green-100 text-green-700',
  closed: 'bg-gray-100 text-gray-600',
  completed: 'bg-green-100 text-green-700',
};

const IssueCard = ({ item, index, onViewIssue }: IssueCardProps) => {
  const issueNum = `ISS-${String(index + 1).padStart(3, '0')}`;
  const statusCls = statusBadge[item.status?.toLowerCase() || ''] || 'bg-gray-100 text-gray-600';
  const dotCls = priorityDot[item.priority?.toLowerCase() || ''] || 'bg-gray-400';

  const categoryLabel = item.category
    ? `Maintenance – ${item.category.charAt(0).toUpperCase() + item.category.slice(1)}`
    : 'Maintenance';

  const formattedDate = item.createdAt
    ? new Date(item.createdAt).toLocaleString('en-US', {
        month: 'short',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      })
    : '';

  const raisedByLabel = item.raisedByName || item.createdBy || '';

  const assignedToLabel = item.assignedTo
    ? item.assignedTo === 'centre_staff'
      ? 'Centre Staff'
      : item.assignedTo === 'noc'
        ? 'NOC'
        : item.assignedTo
    : '';

  return (
    <div
      className="flex cursor-pointer overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm transition-shadow hover:shadow-md"
      role="button"
      tabIndex={0}
      onClick={() => onViewIssue?.(item, index)}
      onKeyDown={e => e.key === 'Enter' && onViewIssue?.(item, index)}
    >
      {/* Left accent */}
      <div className="w-1 shrink-0 bg-orange-500" />

      <div className="flex-1 px-5 py-4">
        {/* Top row: issue number, status, priority */}
        <div className="mb-2 flex items-center gap-3">
          <span className="font-mono text-xs text-gray-400">{issueNum}</span>
          {item.status && (
            <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ${statusCls}`}>
              {item.status}
            </span>
          )}
          {item.priority && (
            <span className="flex items-center gap-1.5 text-xs text-gray-500">
              <span className={`h-2 w-2 rounded-full ${dotCls}`} />
              {item.priority.charAt(0).toUpperCase() + item.priority.slice(1)}
            </span>
          )}
        </div>

        {/* Title */}
        <p className="mb-1 text-sm font-bold text-gray-900">{item.title}</p>

        {/* Lane · category */}
        <p className="mb-2.5 text-xs text-gray-500">
          {item.laneNo ? `Lane ${item.laneNo}` : ''}
          {item.laneNo && item.category ? ' · ' : ''}
          {item.category}
        </p>

        {/* Bottom row: raised by + date + tags */}
        <div className="flex flex-wrap items-center gap-2">
          {(raisedByLabel || formattedDate) && (
            <span className="text-xs text-gray-400">
              {raisedByLabel ? `Raised by ${raisedByLabel}` : ''}
              {raisedByLabel && formattedDate ? ` · ${formattedDate}` : formattedDate}
            </span>
          )}
          <span className="rounded-full bg-orange-500 px-3 py-0.5 text-xs font-semibold text-white">
            {categoryLabel}
          </span>
          {assignedToLabel && (
            <span className="rounded-full bg-orange-500 px-3 py-0.5 text-xs font-semibold text-white">
              {assignedToLabel}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

export default IssueCard;
