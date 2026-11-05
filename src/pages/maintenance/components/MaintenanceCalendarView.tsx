/* eslint-disable import/no-duplicates -- date-fns v2's type declarations resolve
   'date-fns' and 'date-fns/locale' to the same typings.d.ts file, which trips the
   resolver's duplicate-import check even though these are two distinct runtime modules. */
import { useMemo, useState } from 'react';

import { format, getDay, parse, startOfWeek } from 'date-fns';
import { enUS } from 'date-fns/locale';
/* eslint-enable import/no-duplicates */
import { Calendar, dateFnsLocalizer, View, Views } from 'react-big-calendar';
import 'react-big-calendar/lib/css/react-big-calendar.css';

import CalendarToolbar from '../../calendar/components/CalendarToolbar';

import type { ScheduleStatus, TaskSchedule } from '../../../store/maintenance/types';

/**
 * Same react-big-calendar + toolbar this app's unified Calendar page uses (see
 * src/pages/calendar/index.tsx) — reused here for visual consistency. Unlike that
 * page, there's no fetch-by-range: "My Schedule" already bulk-loads every schedule
 * for this centre (see loadSchedules in maintenance/index.tsx), so this component
 * is purely a client-side re-bucketing of already-loaded data by scheduledDate —
 * no new API calls, no backend changes.
 */
const locales = { 'en-US': enUS };
const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek: () => startOfWeek(new Date(), { weekStartsOn: 0 }),
  getDay,
  locales,
});

interface RBCEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  resource: TaskSchedule;
}

const STATUS_META: Record<ScheduleStatus, { label: string; color: string }> = {
  pending: { label: 'Pending', color: '#d97706' },
  done: { label: 'Done', color: '#16a34a' },
  overdue: { label: 'Overdue', color: '#dc2626' },
};

interface Props {
  schedules: TaskSchedule[];
  onSelectSchedule: (schedule: TaskSchedule) => void;
}

const MaintenanceCalendarView: React.FC<Props> = ({ schedules, onSelectSchedule }) => {
  const [view, setView] = useState<View>(Views.MONTH);

  const events: RBCEvent[] = useMemo(
    () =>
      schedules
        .filter(s => Boolean(s.scheduledDate))
        .map(s => {
          const start = new Date(`${s.scheduledDate}T00:00:00`);
          return { id: s.id, title: s.template.title, start, end: start, resource: s };
        }),
    [schedules]
  );

  const eventPropGetter = (event: RBCEvent) => {
    const { color } = STATUS_META[event.resource.status];
    return { style: { backgroundColor: color, borderColor: color } };
  };

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-4 text-[12px] font-medium text-gray-600">
        {(Object.keys(STATUS_META) as ScheduleStatus[]).map(status => (
          <span key={status} className="flex items-center gap-1.5">
            <span
              aria-hidden
              className="inline-block h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: STATUS_META[status].color }}
            />
            {STATUS_META[status].label}
          </span>
        ))}
      </div>
      <div className="relative overflow-hidden rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
        <Calendar<RBCEvent>
          popup
          components={{ toolbar: CalendarToolbar }}
          endAccessor="end"
          eventPropGetter={eventPropGetter}
          events={events}
          localizer={localizer}
          startAccessor="start"
          style={{ height: 650 }}
          view={view}
          views={[Views.MONTH, Views.WEEK, Views.DAY]}
          onSelectEvent={event => onSelectSchedule(event.resource)}
          onView={setView}
        />
      </div>
    </div>
  );
};

export default MaintenanceCalendarView;
