import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';

import SectionTitle from '../../components/SectionTitle';
import { getSlots } from '../../store/slots/api';
import { AppDispatch, RootState } from '../../store/store';
import CalendarBody from './components/calendatBody';
import CalendarHeader from './components/calendarHeader';

const SlotBookings: React.FC = () => {
  const { slots } = useSelector((state: RootState) => state.slots);
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

  const getMonthAbbreviation = (dates: Array<{ day: number; month: number; fullDate: Date }>) => {
    const monthCounts: { [key: number]: number } = {};
    // Count dates per month
    dates.forEach(date => {
      monthCounts[date.month] = (monthCounts[date.month] || 0) + 1;
    });
    // Find the month with the most dates
    let maxCount = 0;
    let dominantMonth = dates[0].month; // Default to first date's month
    Object.keys(monthCounts).forEach(month => {
      const count = monthCounts[parseInt(month)];
      if (count > maxCount) {
        maxCount = count;
        dominantMonth = parseInt(month);
      }
    });
    return monthNames[dominantMonth];
  };
  const nextSevenDates = getNextSevenDates();
  const monthAbbreviation = getMonthAbbreviation(nextSevenDates);
  const [selectedDate, setSelectedDate] = useState({
    day: nextSevenDates[0].day,
    month: nextSevenDates[0].month,
  });

  const selectedDateObject = nextSevenDates.find(date => date.day === selectedDate.day && date.month === selectedDate.month);
  const formattedDate = (() => {
    const dateToFormat = selectedDateObject?.fullDate ?? new Date();
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
    <div className="w-full max-w-full">
      <SectionTitle
        description="Manage your slot bookings."
        inputPlaceholder=""
        search={false}
        title="Slot Bookings"
        value=""
      />
      <div className="flex flex-col gap-4">
        <CalendarHeader
          monthAbbreviation={monthAbbreviation}
          nextSevenDates={nextSevenDates}
          selectedDate={selectedDate}
          setSelectedDate={setSelectedDate}
          monthName={monthNames[selectedDate?.month]}
        />
        <div>
          <CalendarBody lanes={slots?.lanes||[]} timeSlots={slots?.timeSlots||[]} />
        </div>
      </div>
    </div>
  );
};

export default SlotBookings;
