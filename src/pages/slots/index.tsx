import { useEffect, useState } from 'react';

import { useDispatch, useSelector } from 'react-redux';

import SectionTitle from '../../components/SectionTitle';
import { getSlots } from '../../store/slots/api';
import { AppDispatch, RootState } from '../../store/store';

import CalendarHeader from './components/calendarHeader';
import CalendarBody from './components/calendatBody';

const SlotBookings: React.FC = () => {
  const { slots, isLoading } = useSelector((state: RootState) => state.slots);
  const dispatch = useDispatch<AppDispatch>();
  const getNextSevenDates = () => {
    const dates = [];
    const today = new Date();
    for (let i = 0; i < 7; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      dates.push({
        day: date.getDate(),
        month: date.getMonth(),
        fullDate: date,
      });
    }
    return dates;
  };

  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const nextSevenDates = getNextSevenDates();
  const [selectedDate, setSelectedDate] = useState<{ day: number; month: number; fullDate?: Date }>({
    day: nextSevenDates[0].day,
    month: nextSevenDates[0].month,
    fullDate: nextSevenDates[0].fullDate,
  });

  const formattedDate = (() => {
    // Use fullDate if available (from CalendarHeader), otherwise fall back to nextSevenDates lookup
    let dateToFormat: Date;

    if (selectedDate.fullDate) {
      dateToFormat = selectedDate.fullDate;
    } else {
      // Fallback: try to find in nextSevenDates
      const selectedDateObject = nextSevenDates.find(
        date => date.day === selectedDate.day && date.month === selectedDate.month
      );
      dateToFormat = selectedDateObject?.fullDate ?? new Date();
    }

    const year = dateToFormat.getFullYear();
    const month = `${dateToFormat.getMonth() + 1}`.padStart(2, '0');
    const day = `${dateToFormat.getDate()}`.padStart(2, '0');
    return `${year}-${month}-${day}`;
  })();

  useEffect(() => {
    dispatch(
      getSlots({
        date: formattedDate,
        facilityCode: 'HOU01',
      })
    );
  }, [dispatch, formattedDate]);
  return (
    <div className="w-full max-w-full px-1 sm:px-0">
      <SectionTitle
        description="Manage your slot bookings."
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
        <div className="relative">
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
