import React, { useState, useCallback, useMemo } from 'react';
import { Calendar, dateFnsLocalizer, View, SlotInfo } from 'react-big-calendar';
import { format, parse, startOfWeek, getDay, setHours, setMinutes, addDays } from 'date-fns';
import { enUS } from 'date-fns/locale';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import { Plus, X } from 'lucide-react';
import SectionTitle from '../../components/SectionTitle';

// Setup the localizer for react-big-calendar
const locales = {
  'en-US': enUS,
};

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek,
  getDay,
  locales,
});

// Event interface
interface CalendarEvent {
  id: number;
  title: string;
  start: Date;
  end: Date;
  resource?: string;
  description?: string;
  attendees?: number;
  color?: string;
}

const SlotBookings: React.FC = () => {
  const [view, setView] = useState<View>('week');
  const [date, setDate] = useState(new Date());
  const [showEventModal, setShowEventModal] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<SlotInfo | null>(null);
  const [newEventTitle, setNewEventTitle] = useState('');
  const [newEventDescription, setNewEventDescription] = useState('');
  const [newEventAttendees, setNewEventAttendees] = useState('');

  // Lane booking system: 5 Batting Lanes + 2 Hybrid Lanes
  // 10 future bookings across different dates, each slot is 45 minutes
  const [events, setEvents] = useState<CalendarEvent[]>([
    // TODAY - Batting Lane 1
    {
      id: 1,
      title: 'Batting Lane 1 - Booking',
      start: setMinutes(setHours(new Date(), 10), 0),
      end: setMinutes(setHours(new Date(), 10), 45),
      description: 'Batting practice session',
      attendees: 4,
      color: '#3b82f6', // Blue for batting
    },
    // TODAY - Hybrid Lane 6 (Bowling)
    {
      id: 2,
      title: 'Hybrid Lane 6 - Bowling Session',
      start: setMinutes(setHours(new Date(), 14), 0),
      end: setMinutes(setHours(new Date(), 14), 45),
      description: 'Bowling practice session',
      attendees: 4,
      color: '#8b5cf6', // Purple for hybrid
    },

    // TOMORROW - Batting Lane 2
    {
      id: 3,
      title: 'Batting Lane 2 - Booking',
      start: setMinutes(setHours(addDays(new Date(), 1), 11), 0),
      end: setMinutes(setHours(addDays(new Date(), 1), 11), 45),
      description: 'Batting practice session',
      attendees: 3,
      color: '#3b82f6', // Blue for batting
    },
    // TOMORROW - Batting Lane 3
    {
      id: 4,
      title: 'Batting Lane 3 - Booking',
      start: setMinutes(setHours(addDays(new Date(), 1), 15), 0),
      end: setMinutes(setHours(addDays(new Date(), 1), 15), 45),
      description: 'Batting practice session',
      attendees: 5,
      color: '#3b82f6', // Blue for batting
    },

    // DAY AFTER TOMORROW - Batting Lane 4
    {
      id: 5,
      title: 'Batting Lane 4 - Booking',
      start: setMinutes(setHours(addDays(new Date(), 2), 9), 30),
      end: setMinutes(setHours(addDays(new Date(), 2), 10), 15),
      description: 'Batting practice session',
      attendees: 2,
      color: '#3b82f6', // Blue for batting
    },
    // DAY AFTER TOMORROW - Hybrid Lane 7 (Bowling)
    {
      id: 6,
      title: 'Hybrid Lane 7 - Bowling Session',
      start: setMinutes(setHours(addDays(new Date(), 2), 12), 0),
      end: setMinutes(setHours(addDays(new Date(), 2), 12), 45),
      description: 'Bowling practice session',
      attendees: 5,
      color: '#8b5cf6', // Purple for hybrid
    },

    // 3 DAYS FROM NOW - Batting Lane 5
    {
      id: 7,
      title: 'Batting Lane 5 - Booking',
      start: setMinutes(setHours(addDays(new Date(), 3), 13), 0),
      end: setMinutes(setHours(addDays(new Date(), 3), 13), 45),
      description: 'Batting practice session',
      attendees: 6,
      color: '#3b82f6', // Blue for batting
    },
    // 3 DAYS FROM NOW - Hybrid Lane 6 (Batting)
    {
      id: 8,
      title: 'Hybrid Lane 6 - Batting Session',
      start: setMinutes(setHours(addDays(new Date(), 3), 16), 0),
      end: setMinutes(setHours(addDays(new Date(), 3), 16), 45),
      description: 'Batting practice on hybrid lane',
      attendees: 3,
      color: '#8b5cf6', // Purple for hybrid
    },

    // 4 DAYS FROM NOW - Batting Lane 1 (Evening)
    {
      id: 9,
      title: 'Batting Lane 1 - Evening Booking',
      start: setMinutes(setHours(addDays(new Date(), 4), 17), 0),
      end: setMinutes(setHours(addDays(new Date(), 4), 17), 45),
      description: 'Evening batting session',
      attendees: 3,
      color: '#3b82f6', // Blue for batting
    },

    // 5 DAYS FROM NOW - Hybrid Lane 7 (Batting)
    {
      id: 10,
      title: 'Hybrid Lane 7 - Batting Session',
      start: setMinutes(setHours(addDays(new Date(), 5), 10), 30),
      end: setMinutes(setHours(addDays(new Date(), 5), 11), 15),
      description: 'Batting practice on hybrid lane',
      attendees: 4,
      color: '#8b5cf6', // Purple for hybrid
    },
  ]);

  // Handle selecting a time slot
  const handleSelectSlot = useCallback((slotInfo: SlotInfo) => {
    setSelectedSlot(slotInfo);
    setShowEventModal(true);
  }, []);

  // Handle selecting an event
  const handleSelectEvent = useCallback((event: CalendarEvent) => {
    alert(`Event: ${event.title}\nDescription: ${event.description}\nAttendees: ${event.attendees}`);
  }, []);

  // Add new event
  const handleAddEvent = () => {
    if (newEventTitle && selectedSlot) {
      const newEvent: CalendarEvent = {
        id: events.length + 1,
        title: newEventTitle,
        start: selectedSlot.start,
        end: selectedSlot.end,
        description: newEventDescription,
        attendees: parseInt(newEventAttendees) || 0,
        color: `#${Math.floor(Math.random() * 16777215).toString(16)}`,
      };
      setEvents([...events, newEvent]);
      setShowEventModal(false);
      setNewEventTitle('');
      setNewEventDescription('');
      setNewEventAttendees('');
    }
  };

  // Custom event style
  const eventStyleGetter = (event: CalendarEvent) => {
    const style = {
      backgroundColor: event.color || '#3b82f6',
      borderRadius: '6px',
      opacity: 0.9,
      color: 'white',
      border: 'none',
      display: 'block',
      fontSize: '13px',
      fontWeight: '500',
      padding: '4px 8px',
    };
    return { style };
  };

  // Calendar formats
  const formats = useMemo(
    () => ({
      timeGutterFormat: (date: Date) => format(date, 'h:mm a'),
      eventTimeRangeFormat: ({ start, end }: { start: Date; end: Date }) =>
        `${format(start, 'h:mm a')} - ${format(end, 'h:mm a')}`,
      agendaTimeRangeFormat: ({ start, end }: { start: Date; end: Date }) =>
        `${format(start, 'h:mm a')} - ${format(end, 'h:mm a')}`,
      dayHeaderFormat: (date: Date) => format(date, 'EEE, MMM d'),
    }),
    []
  );

  return (
    <div className="mx-auto">
      {/* Calendar Section */}
      <SectionTitle
        title="Slot Bookings"
        description="Manage your slot bookings."
        inputPlaceholder=""
        value=""
        search={false}
      />

      <div className="calendar-container" style={{ height: '700px', marginTop: '30px' }}>
        <Calendar
          localizer={localizer}
          events={events}
          startAccessor="start"
          endAccessor="end"
          view={view}
          onView={setView}
          date={date}
          onNavigate={setDate}
          onSelectSlot={handleSelectSlot}
          onSelectEvent={handleSelectEvent}
          selectable
          eventPropGetter={eventStyleGetter}
          formats={formats}
          min={setMinutes(setHours(new Date(), 9), 0)} // 9 AM
          max={setMinutes(setHours(new Date(), 18), 0)} // 6 PM
          step={45} // 45-minute slots
          timeslots={1} // One slot per step
          defaultView="week"
          views={['month', 'week', 'day', 'agenda']}
          style={{ height: '100%' }}
          className="modern-calendar"
        />
      </div>

      {/* Event Modal */}
      {showEventModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="flex items-center gap-2 text-2xl font-bold text-slate-800">
                <Plus className="h-6 w-6 text-blue-600" />
                Add New Event
              </h3>
              <button
                onClick={() => setShowEventModal(false)}
                className="text-gray-500 transition-colors hover:text-gray-700"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Event Title *</label>
                <input
                  type="text"
                  value={newEventTitle}
                  onChange={e => setNewEventTitle(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-4 py-2 outline-none focus:border-transparent focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter event title"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Description</label>
                <textarea
                  value={newEventDescription}
                  onChange={e => setNewEventDescription(e.target.value)}
                  className="w-full resize-none rounded-lg border border-gray-300 px-4 py-2 outline-none focus:border-transparent focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter event description"
                  rows={3}
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Number of Attendees</label>
                <input
                  type="number"
                  value={newEventAttendees}
                  onChange={e => setNewEventAttendees(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-4 py-2 outline-none focus:border-transparent focus:ring-2 focus:ring-blue-500"
                  placeholder="0"
                />
              </div>

              {selectedSlot ? (
                <div className="rounded-lg bg-blue-50 p-3">
                  <p className="text-sm text-gray-700">
                    <strong>Time:</strong> {format(selectedSlot.start, 'h:mm a')} - {format(selectedSlot.end, 'h:mm a')}
                  </p>
                  <p className="mt-1 text-sm text-gray-700">
                    <strong>Date:</strong> {format(selectedSlot.start, 'EEEE, MMMM d, yyyy')}
                  </p>
                </div>
              ) : null}

              <div className="mt-6 flex gap-3">
                <button
                  onClick={handleAddEvent}
                  disabled={!newEventTitle}
                  className="flex-1 rounded-lg bg-blue-600 px-4 py-2 font-medium text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-gray-300"
                >
                  Add Event
                </button>
                <button
                  onClick={() => setShowEventModal(false)}
                  className="flex-1 rounded-lg bg-gray-200 px-4 py-2 font-medium text-gray-700 transition-colors hover:bg-gray-300"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .modern-calendar {
          border: none;
          font-family: inherit;
        }

        .rbc-calendar {
          border-radius: 8px;
          overflow: hidden;
        }

        .rbc-header {
          padding: 16px 8px;
          font-weight: 600;
          font-size: 14px;
          color: #1e293b;
          background: #f8fafc;
          border-bottom: 2px solid #e2e8f0;
        }

        .rbc-time-view {
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          overflow: hidden;
        }

        .rbc-time-header {
          border-bottom: 2px solid #e2e8f0;
        }

        .rbc-time-content {
          border-top: none;
        }

        .rbc-time-slot {
          border-top: 1px solid #f1f5f9;
        }

        .rbc-timeslot-group {
          min-height: 80px;
          border-left: 1px solid #e2e8f0;
        }

        .rbc-day-slot .rbc-time-slot {
          border-top: 1px solid #f1f5f9;
        }

        .rbc-current-time-indicator {
          background-color: #ef4444;
          height: 2px;
        }

        .rbc-today {
          background-color: #eff6ff;
        }

        .rbc-event {
          border: none !important;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
          transition: all 0.2s;
        }

        .rbc-event:hover {
          box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
          transform: translateY(-1px);
          cursor: pointer;
        }

        .rbc-event-label {
          font-size: 11px;
          font-weight: 600;
        }

        .rbc-event-content {
          padding: 2px 4px;
        }

        .rbc-toolbar {
          padding: 16px;
          background: #f8fafc;
          border-radius: 8px;
          margin-bottom: 16px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-wrap: wrap;
          gap: 12px;
        }

        .rbc-toolbar button {
          padding: 8px 16px;
          border: 1px solid #cbd5e1;
          background: white;
          color: #475569;
          border-radius: 6px;
          font-weight: 500;
          font-size: 14px;
          transition: all 0.2s;
          cursor: pointer;
        }

        .rbc-toolbar button:hover {
          background: #f1f5f9;
          border-color: #94a3b8;
        }

        .rbc-toolbar button.rbc-active {
          background: #3b82f6;
          color: white;
          border-color: #3b82f6;
        }

        .rbc-toolbar button.rbc-active:hover {
          background: #2563eb;
          border-color: #2563eb;
        }

        .rbc-toolbar-label {
          font-size: 18px;
          font-weight: 700;
          color: #1e293b;
        }

        .rbc-month-view {
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          overflow: hidden;
        }

        .rbc-month-row {
          border-top: 1px solid #e2e8f0;
          min-height: 100px;
        }

        .rbc-date-cell {
          padding: 8px;
        }

        .rbc-off-range {
          color: #cbd5e1;
        }

        .rbc-off-range-bg {
          background: #fafafa;
        }

        .rbc-show-more {
          color: #3b82f6;
          font-weight: 600;
          font-size: 12px;
          padding: 4px;
          background: #eff6ff;
          border-radius: 4px;
          margin: 2px;
        }

        .rbc-agenda-view {
          border: 1px solid #e2e8f0;
          border-radius: 8px;
        }

        .rbc-agenda-table {
          border: none;
        }

        .rbc-agenda-date-cell,
        .rbc-agenda-time-cell {
          padding: 12px;
          font-weight: 600;
          color: #475569;
        }

        .rbc-agenda-event-cell {
          padding: 12px;
        }

        .rbc-time-gutter {
          background: #fafafa;
          font-weight: 500;
          color: #64748b;
        }

        .rbc-allday-cell {
          background: #f8fafc;
        }
      `}</style>
    </div>
  );
};

export default SlotBookings;
