import { useEffect, useMemo, useState } from 'react';

import { useDispatch, useSelector } from 'react-redux';

import SectionTitle from '../../components/SectionTitle';
import { getSlots } from '../../store/slots/api';
import { AppDispatch, RootState } from '../../store/store';

import CalendarBody from './components/calendarBody';
import CalendarHeader from './components/calendarHeader';

const SlotBookings: React.FC = () => {
  const { slots, isLoading } = useSelector((state: RootState) => state.slots);
  const dispatch = useDispatch<AppDispatch>();
  const TIMEZONE = 'America/Chicago';

  const getNextSevenDates = () => {
    const dates = [];
    const now = new Date();

    // Create dates for the next 7 days in Chicago timezone
    for (let i = 0; i < 7; i++) {
      // Calculate the date for day i (add i days from now)
      const targetDate = new Date(now.getTime() + i * 24 * 60 * 60 * 1000);

      // Get date components in Chicago timezone
      const dateFormatter = new Intl.DateTimeFormat('en-US', {
        timeZone: TIMEZONE,
        year: 'numeric',
        month: 'numeric',
        day: 'numeric',
      });

      const dateParts = dateFormatter.formatToParts(targetDate);
      const year = parseInt(dateParts.find(p => p.type === 'year')?.value || '0');
      const month = parseInt(dateParts.find(p => p.type === 'month')?.value || '0') - 1; // 0-indexed
      const day = parseInt(dateParts.find(p => p.type === 'day')?.value || '0');

      // Create a Date object for this date
      // We'll create it as a date string and parse it
      // The date will represent this calendar date
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const fullDate = new Date(`${dateStr}T00:00:00`);

      dates.push({
        day,
        month,
        fullDate,
      });
    }
    return dates;
  };

  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const nextSevenDates = useMemo(() => getNextSevenDates(), []);
  const [selectedDate, setSelectedDate] = useState<{ day: number; month: number; fullDate?: Date }>({
    day: nextSevenDates[0].day,
    month: nextSevenDates[0].month,
    fullDate: nextSevenDates[0].fullDate,
  });

  const formattedDate = useMemo(() => {
    // Get the year directly from fullDate object (not formatted in timezone to avoid year shifts)
    // Use day and month directly from selectedDate since those represent the calendar date selected
    let year: number;

    if (selectedDate.fullDate) {
      // Get year directly from the Date object
      year = selectedDate.fullDate.getFullYear();
    } else {
      // Fallback: try to find in nextSevenDates
      const selectedDateObject = nextSevenDates.find(
        date => date.day === selectedDate.day && date.month === selectedDate.month
      );
      if (selectedDateObject?.fullDate) {
        year = selectedDateObject.fullDate.getFullYear();
      } else {
        // Last resort: use current year
        year = new Date().getFullYear();
      }
    }

    // Use day and month directly from selectedDate (month is 0-indexed, so add 1)
    const month = String(selectedDate.month + 1).padStart(2, '0');
    const day = String(selectedDate.day).padStart(2, '0');

    // Format as YYYY-MM-DD
    return `${year}-${month}-${day}`;
  }, [selectedDate, nextSevenDates]);

  useEffect(() => {
    dispatch(
      getSlots({
        date: formattedDate,
        facilityCode: 'HOU01',
      })
    );
  }, [dispatch, formattedDate]);

  // Calculate slot statistics
  const slotStats = useMemo(() => {
    const lanes = slots?.lanes || [];
    let totalBooked = 0;
    let completed = 0;
    let bookedWithCoach = 0;
    let bookedWithGuest = 0;

    lanes.forEach(lane => {
      lane.slots?.forEach(slot => {
        if (slot.isBooked && slot.booking) {
          totalBooked++;

          // Check if completed (assuming bookingStatus 'completed' or similar)
          if (slot.booking.bookingStatus === 'completed' || slot.booking.bookingStatus === 'played') {
            completed++;
          }

          // Check if booked with coach
          if (slot.booking.coach?.name) {
            bookedWithCoach++;
          }

          // Check if booked with guest
          if (slot.booking.guests && slot.booking.guests.length > 0) {
            bookedWithGuest++;
          }
        }
      });
    });

    return {
      totalBooked,
      completed,
      bookedWithCoach,
      bookedWithGuest,
    };
  }, [slots]);

  return (
    <div className="w-full">
      <SectionTitle
        description="Manage slot bookings."
        inputPlaceholder=""
        search={false}
        title="Slot Bookings"
        value=""
      />

      <div className="flex flex-col gap-3 sm:gap-4">
        <CalendarHeader
          monthName={monthNames[selectedDate?.month]}
          nextSevenDates={nextSevenDates}
          selectedDate={selectedDate}
          setSelectedDate={setSelectedDate}
        />

        {/* Statistics Cards */}
        <div className="mb-1 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {/* Total Slots Booked */}
          <div className="rounded-xl border border-gray-200 bg-white p-3">
            <h3 className="mb-0.5 text-xs font-medium text-gray-600">Total Slots Booked</h3>
            <p className="text-xl font-bold text-gray-900">{slotStats.totalBooked.toLocaleString()}</p>
          </div>

          {/* Completed Slots */}
          <div className="rounded-xl border border-gray-200 bg-white p-3">
            <h3 className="mb-0.5 text-xs font-medium text-gray-600">Completed Slots</h3>
            <p className="text-xl font-bold text-gray-900">{slotStats.completed.toLocaleString()}</p>
          </div>

          {/* Booked with Coach */}
          <div className="rounded-xl border border-gray-200 bg-white p-3">
            <h3 className="mb-0.5 text-xs font-medium text-gray-600">Booked with Coach</h3>
            <p className="text-xl font-bold text-gray-900">{slotStats.bookedWithCoach.toLocaleString()}</p>
          </div>

          {/* Booked with Guest */}
          <div className="rounded-xl border border-gray-200 bg-white p-3">
            <h3 className="mb-0.5 text-xs font-medium text-gray-600">Booked with Guest</h3>
            <p className="text-xl font-bold text-gray-900">{slotStats.bookedWithGuest.toLocaleString()}</p>
          </div>
        </div>
        <div className="relative w-full">
          {isLoading && (
            <div className="absolute inset-0 z-50 flex items-center justify-center rounded-[10px] bg-white/90 backdrop-blur-sm">
              <div className="flex flex-col items-center justify-center gap-3">
                <div className="h-10 w-10 animate-spin rounded-full border-4 border-gray-200 border-t-[#21295A] sm:h-12 sm:w-12"></div>
                <p className="text-xs font-medium text-[#21295A] sm:text-sm">Loading slots...</p>
              </div>
            </div>
          )}
          <CalendarBody
            date={formattedDate}
            facilityCode="HOU01"
            lanes={slots?.lanes || []}
            timeSlots={slots?.timeSlots || []}
          />
        </div>
      </div>
    </div>
  );
};

export default SlotBookings;
