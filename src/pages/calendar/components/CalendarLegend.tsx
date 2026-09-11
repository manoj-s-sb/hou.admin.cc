import { EVENT_TYPE_CONFIG, EVENT_TYPE_ORDER } from '../../../store/calendar/eventTypeConfig';

/** Small color-key strip showing what each event color represents. */
const CalendarLegend = () => (
  <div className="flex flex-wrap items-center gap-4 rounded-xl border border-gray-100 bg-white px-4 py-3 shadow-sm">
    {EVENT_TYPE_ORDER.map(type => (
      <div key={type} className="flex items-center gap-2">
        <span
          aria-hidden
          className="inline-block h-3 w-3 rounded-full"
          style={{ backgroundColor: EVENT_TYPE_CONFIG[type].color }}
        />
        <span className="text-[12px] font-medium text-gray-600">{EVENT_TYPE_CONFIG[type].label}</span>
      </div>
    ))}
  </div>
);

export default CalendarLegend;
