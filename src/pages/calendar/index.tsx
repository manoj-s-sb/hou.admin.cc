import { useCallback, useEffect, useMemo, useState } from 'react';

/* eslint-disable import/no-duplicates -- date-fns v2's type declarations resolve
   'date-fns' and 'date-fns/locale' to the same typings.d.ts file, which trips the
   resolver's duplicate-import check even though these are two distinct runtime modules. */
import { endOfMonth, format, getDay, parse, startOfMonth, startOfWeek } from 'date-fns';
import { enUS } from 'date-fns/locale';
/* eslint-enable import/no-duplicates */
import { Calendar, DateCellWrapperProps, dateFnsLocalizer, View, Views } from 'react-big-calendar';
import { useDispatch, useSelector } from 'react-redux';
import 'react-big-calendar/lib/css/react-big-calendar.css';

import { Loader } from '../../components/Loader';
import { getFacilityCode } from '../../constants/user';
import { fetchCalendarEvents } from '../../store/calendar/api';
import { CalendarEvent } from '../../store/calendar/types';
import { AppDispatch, RootState } from '../../store/store';

import CalendarLegend from './components/CalendarLegend';
import CalendarToolbar from './components/CalendarToolbar';
import EventDetailModal from './components/EventDetailModal';

const locales = { 'en-US': enUS };
const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek: () => startOfWeek(new Date(), { weekStartsOn: 0 }),
  getDay,
  locales,
});

/** react-big-calendar's own event shape; `resource` carries our normalized CalendarEvent. */
interface RBCEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  resource: CalendarEvent;
}

const toDateKey = (date: Date) => format(date, 'yyyy-MM-dd');

/** Day-level count badge for Gym/Podcast bookings, shown top-right of a month-view
 * date cell — on top of the per-booking colour pills already rendered as events, not
 * instead of them (see "yes, both colour pills and count number"). Built per-render
 * via a factory (not a module-level component) so it can close over the current
 * day -> count map without threading extra props through react-big-calendar's own
 * `components` contract, which only passes {range, value, children}. */
const makeGymPodcastDateCellWrapper = (countsByDay: Record<string, number>) => {
  const GymPodcastDateCellWrapper = ({ value, children }: DateCellWrapperProps) => {
    const count = countsByDay[toDateKey(value)] ?? 0;
    return (
      <div className="relative h-full w-full">
        {children}
        {count > 0 && (
          <span
            aria-label={`${count} gym/podcast booking${count === 1 ? '' : 's'}`}
            className="pointer-events-none absolute right-1 top-1 z-10 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-[#db2777] px-1 text-[10px] font-bold text-white"
          >
            {count}
          </span>
        )}
      </div>
    );
  };
  return GymPodcastDateCellWrapper;
};

/** onRangeChange reports either an array of visible days (week/day/agenda) or a {start,end} object (month). */
const getRangeBounds = (range: Date[] | { start: Date; end: Date }): { start: Date; end: Date } =>
  Array.isArray(range) ? { start: range[0], end: range[range.length - 1] } : range;

const CalendarPage = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { events, isLoading } = useSelector((state: RootState) => state.calendar);
  const facilityCode = getFacilityCode();

  const [view, setView] = useState<View>(Views.MONTH);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);

  const loadRange = useCallback(
    (start: Date, end: Date) => {
      dispatch(fetchCalendarEvents({ startDate: toDateKey(start), endDate: toDateKey(end), facilityCode }));
    },
    [dispatch, facilityCode]
  );

  // Initial load: current month. Re-runs if the in-scope centre changes (super admin
  // switching centres), matching the facilityCode dependency pattern used by Tours/Coach Schedule.
  useEffect(() => {
    loadRange(startOfMonth(new Date()), endOfMonth(new Date()));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [facilityCode]);

  const handleRangeChange = useCallback(
    (range: Date[] | { start: Date; end: Date }) => {
      const { start, end } = getRangeBounds(range);
      loadRange(start, end);
    },
    [loadRange]
  );

  const calendarEvents: RBCEvent[] = useMemo(
    () =>
      events.map(e => ({
        id: e.id,
        title: e.title,
        start: new Date(e.start),
        end: new Date(e.end),
        resource: e,
      })),
    [events]
  );

  // Color-codes each event pill from the config-driven color map (never a hardcoded
  // per-event color) — see store/calendar/eventTypeConfig.ts.
  const eventPropGetter = useCallback(
    (event: RBCEvent) => ({
      style: {
        backgroundColor: event.resource.color,
        borderColor: event.resource.color,
      },
    }),
    []
  );

  // Per-day Gym/Podcast/Meeting Room booking count, for the month-view date-cell badge.
  const gymPodcastCountsByDay = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const e of events) {
      if (e.type !== 'gym_booking' && e.type !== 'podcast_booking' && e.type !== 'meeting_booking') continue;
      const key = toDateKey(new Date(e.start));
      counts[key] = (counts[key] ?? 0) + 1;
    }
    return counts;
  }, [events]);

  const calendarComponents = useMemo(
    () => ({ toolbar: CalendarToolbar, dateCellWrapper: makeGymPodcastDateCellWrapper(gymPodcastCountsByDay) }),
    [gymPodcastCountsByDay]
  );

  return (
    <div className="w-full">
      {/* ── Page Header ─────────────────────────────────────── */}
      <div className="mb-5 border-b border-gray-100 pb-4">
        <h1 className="text-[18px] font-bold tracking-tight text-[#21295A]">Calendar</h1>
        <p className="mt-1 text-[12px] font-medium text-gray-400">
          Unified view of slot bookings, inductions, tours, coach bookings, and gym/podcast/meeting room bookings
        </p>
      </div>

      {/* ── Legend ──────────────────────────────────────────── */}
      <div className="mb-4">
        <CalendarLegend />
        {!facilityCode && (
          <p className="mt-2 text-[11px] text-gray-400">
            Select a centre to also see coach bookings on this calendar — coach availability is per-centre.
          </p>
        )}
      </div>

      {/* ── Calendar ────────────────────────────────────────── */}
      <div className="relative overflow-hidden rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
        {isLoading && <Loader variant="overlay" />}
        <Calendar<RBCEvent>
          popup
          components={calendarComponents}
          endAccessor="end"
          eventPropGetter={eventPropGetter}
          events={calendarEvents}
          localizer={localizer}
          startAccessor="start"
          style={{ height: 720 }}
          view={view}
          views={[Views.MONTH, Views.WEEK, Views.DAY]}
          onRangeChange={handleRangeChange}
          onSelectEvent={event => setSelectedEvent(event.resource)}
          onView={setView}
        />
      </div>

      <EventDetailModal event={selectedEvent} onClose={() => setSelectedEvent(null)} />
    </div>
  );
};

export default CalendarPage;
