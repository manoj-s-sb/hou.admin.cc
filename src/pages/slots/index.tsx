import { useState } from 'react';

import SectionTitle from '../../components/SectionTitle';

import CalendarHeader from './components/calendarHeader';

const SlotBookings: React.FC = () => {
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
      </div>
    </div>
  );
};

export default SlotBookings;
