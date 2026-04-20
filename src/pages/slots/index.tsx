import { useEffect, useMemo, useState } from 'react';

import { useDispatch, useSelector } from 'react-redux';

import LoaderComponent from '../../components/Loader';
import { getSlots } from '../../store/slots/api';
import { AppDispatch, RootState } from '../../store/store';
import { getLocalUser } from '../maintenance/constants';

import CalendarBody from './components/calendarBody';
import CalendarHeader from './components/calendarHeader';

const TIMEZONE = 'America/Chicago';
const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const getNextSevenDates = () => {
  const dates = [];
  const now = new Date();
  for (let i = 0; i < 7; i++) {
    const targetDate = new Date(now.getTime() + i * 24 * 60 * 60 * 1000);
    const dateFormatter = new Intl.DateTimeFormat('en-US', {
      timeZone: TIMEZONE,
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
    });
    const dateParts = dateFormatter.formatToParts(targetDate);
    const year = parseInt(dateParts.find(p => p.type === 'year')?.value || '0');
    const month = parseInt(dateParts.find(p => p.type === 'month')?.value || '0') - 1;
    const day = parseInt(dateParts.find(p => p.type === 'day')?.value || '0');
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    dates.push({ day, month, fullDate: new Date(`${dateStr}T00:00:00`) });
  }
  return dates;
};

const statCards = [
  {
    key: 'totalBooked' as const,
    label: 'Total Booked',
    iconPath: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z',
  },
  {
    key: 'completed' as const,
    label: 'Completed',
    iconPath: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z',
  },
  {
    key: 'bookedWithCoach' as const,
    label: 'With Coach',
    iconPath: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z',
  },
  {
    key: 'bookedWithGuest' as const,
    label: 'With Guest',
    iconPath:
      'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z',
  },
];

const SlotBookings: React.FC = () => {
  const { slots, isLoading } = useSelector((state: RootState) => state.slots);
  const dispatch = useDispatch<AppDispatch>();
  const facilityCode = getLocalUser().facilityCode || 'HOU01';

  const nextSevenDates = useMemo(() => getNextSevenDates(), []);
  const [selectedDate, setSelectedDate] = useState<{ day: number; month: number; fullDate?: Date }>({
    day: nextSevenDates[0].day,
    month: nextSevenDates[0].month,
    fullDate: nextSevenDates[0].fullDate,
  });

  const formattedDate = useMemo(() => {
    let year: number;
    if (selectedDate.fullDate) {
      year = selectedDate.fullDate.getFullYear();
    } else {
      const found = nextSevenDates.find(d => d.day === selectedDate.day && d.month === selectedDate.month);
      year = found?.fullDate?.getFullYear() ?? new Date().getFullYear();
    }
    const month = String(selectedDate.month + 1).padStart(2, '0');
    const day = String(selectedDate.day).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }, [selectedDate, nextSevenDates]);

  useEffect(() => {
    dispatch(getSlots({ date: formattedDate, facilityCode }));
  }, [dispatch, formattedDate, facilityCode]);

  const slotStats = useMemo(() => {
    const lanes = slots?.lanes || [];
    let totalBooked = 0,
      completed = 0,
      bookedWithCoach = 0,
      bookedWithGuest = 0;
    lanes.forEach(lane => {
      lane.slots?.forEach(slot => {
        if (slot.isBooked && slot.booking) {
          totalBooked++;
          if (slot.booking.bookingStatus === 'completed' || slot.booking.bookingStatus === 'played') completed++;
          if (slot.booking.coach?.name) bookedWithCoach++;
          if (slot.booking.guests && slot.booking.guests.length > 0) bookedWithGuest++;
        }
      });
    });
    return { totalBooked, completed, bookedWithCoach, bookedWithGuest };
  }, [slots]);

  const selectedDayName = selectedDate.fullDate
    ? selectedDate.fullDate.toLocaleDateString('en-US', { weekday: 'long' })
    : '';
  const selectedMonthName = monthNames[selectedDate.month];

  return (
    <div className="w-full">
      {/* ── Page Header ─────────────────────────────────────── */}
      <div className="mb-5 border-b border-gray-100 pb-4">
        <h1 className="text-[18px] font-bold tracking-tight text-[#21295A]">Slot Bookings</h1>
        <p className="mt-1 text-[12px] font-medium text-gray-400">
          {selectedDayName}, {selectedMonthName} {selectedDate.day} · {facilityCode}
        </p>
      </div>

      {/* ── Stats Row ───────────────────────────────────────── */}
      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {statCards.map(card => (
          <div
            key={card.key}
            className="flex items-center gap-2.5 rounded-xl border border-gray-100 bg-white px-3 py-3 shadow-sm"
          >
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-gray-100">
              <svg className="h-[15px] w-[15px] text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path d={card.iconPath} strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} />
              </svg>
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">{card.label}</p>
              <p className="text-[20px] font-bold leading-tight text-[#21295A]">
                {slotStats[card.key].toLocaleString()}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* ── Calendar Section ────────────────────────────────── */}
      <div className="overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm">
        {/* Date picker strip */}
        <div className="border-b border-gray-100 bg-gray-50/50 px-4 py-3">
          <CalendarHeader
            monthName={selectedMonthName}
            nextSevenDates={nextSevenDates}
            selectedDate={selectedDate}
            setSelectedDate={setSelectedDate}
          />
        </div>

        {/* Calendar grid */}
        <div className="relative p-4">
          {isLoading && (
            <LoaderComponent message="Loading slots..." size="lg" spinnerClassName="text-[#21295A]" variant="overlay" />
          )}
          <CalendarBody
            date={formattedDate}
            facilityCode={facilityCode}
            lanes={slots?.lanes || []}
            timeSlots={slots?.timeSlots || []}
          />
        </div>
      </div>
    </div>
  );
};

export default SlotBookings;
