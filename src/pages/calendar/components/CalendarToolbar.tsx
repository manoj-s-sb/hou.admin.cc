import { format } from 'date-fns';
import { Navigate, ToolbarProps, View, Views } from 'react-big-calendar';

const VIEW_OPTIONS: { key: View; label: string }[] = [
  { key: Views.MONTH, label: 'Month' },
  { key: Views.WEEK, label: 'Week' },
  { key: Views.DAY, label: 'Day' },
];

/** "Sep 2026" / "Sep 8 – 14, 2026" / "Sep 8, 2026" depending on the active view. */
const formatLabel = (date: Date, view: View): string => {
  if (view === Views.DAY) return format(date, 'MMM d, yyyy');
  return format(date, 'MMM yyyy');
};

/**
 * Compact pill-style month navigator (‹ 📅 › + label) replacing react-big-calendar's
 * default toolbar, per the approved reference mockup — no "Today" button by design.
 */
function CalendarToolbar<TEvent extends object = object, TResource extends object = object>({
  date,
  view,
  onNavigate,
  onView,
}: ToolbarProps<TEvent, TResource>) {
  return (
    <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1 rounded-full border border-gray-200 bg-white px-2 py-1.5 shadow-sm">
          <button
            aria-label="Previous"
            className="rounded-full p-1 text-blue-600 transition hover:bg-blue-50"
            type="button"
            onClick={() => onNavigate(Navigate.PREVIOUS)}
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} />
            </svg>
          </button>
          <svg aria-hidden className="h-4 w-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <rect height="16" rx="1.5" strokeWidth={1.6} width="16" x="4" y="5" />
            <path d="M4 10h16M8 3v3M16 3v3" strokeLinecap="round" strokeWidth={1.6} />
          </svg>
          <button
            aria-label="Next"
            className="rounded-full p-1 text-blue-600 transition hover:bg-blue-50"
            type="button"
            onClick={() => onNavigate(Navigate.NEXT)}
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path d="M9 18l6-6-6-6" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} />
            </svg>
          </button>
        </div>
        <span className="text-[17px] font-semibold text-[#21295A]">{formatLabel(date, view)}</span>
      </div>

      <div className="flex items-center gap-1 rounded-lg bg-gray-100 p-1">
        {VIEW_OPTIONS.map(opt => (
          <button
            key={opt.key}
            className={`rounded-md px-3 py-1.5 text-[13px] font-semibold transition ${
              view === opt.key ? 'bg-white text-[#21295A] shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
            type="button"
            onClick={() => onView(opt.key)}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
}

export default CalendarToolbar;
