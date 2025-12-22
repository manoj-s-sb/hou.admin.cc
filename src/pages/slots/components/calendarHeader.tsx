import { useState, useMemo } from 'react';

import { CalendarHeader as CalendarHeaderType } from '../types';

const CalendarHeader = ({ selectedDate, setSelectedDate, nextSevenDates, monthName }: CalendarHeaderType) => {
  const [dateOffset, setDateOffset] = useState(0);

  // Generate dates based on offset
  const displayedDates = useMemo(() => {
    const dates = [];
    const today = new Date();
    const startDate = new Date(today);
    startDate.setDate(today.getDate() + dateOffset);

    for (let i = 0; i < 7; i++) {
      const date = new Date(startDate);
      date.setDate(startDate.getDate() + i);
      dates.push({
        day: date.getDate(),
        month: date.getMonth(),
        fullDate: date,
      });
    }
    return dates;
  }, [dateOffset]);

  const today = nextSevenDates?.[0];
  const isTodaySelected = Boolean(today && selectedDate?.day === today.day && selectedDate?.month === today.month);
  const currentDateIndex = displayedDates.findIndex(
    date => date.day === selectedDate?.day && date.month === selectedDate?.month
  );
  const isPrevDisabled = currentDateIndex <= 0;
  const isNextDisabled = currentDateIndex === -1 || currentDateIndex >= displayedDates.length - 1;

  const handleNavigatePrevious = () => {
    setDateOffset(prev => prev - 7);
  };

  const handleNavigateNext = () => {
    setDateOffset(prev => prev + 7);
  };

  const handleSelectToday = () => {
    if (!today || isTodaySelected) {
      return;
    }

    setDateOffset(0);
    setSelectedDate({ day: today.day, month: today.month, fullDate: today.fullDate });
  };

  const handleSelectPrevious = () => {
    if (isPrevDisabled) {
      return;
    }

    const previousDate = displayedDates[currentDateIndex - 1];
    if (previousDate) {
      setSelectedDate({ day: previousDate.day, month: previousDate.month, fullDate: previousDate.fullDate });
    }
  };

  const handleSelectNext = () => {
    if (isNextDisabled) {
      return;
    }

    const nextDate = displayedDates[currentDateIndex + 1];
    if (nextDate) {
      setSelectedDate({ day: nextDate.day, month: nextDate.month, fullDate: nextDate.fullDate });
    }
  };

  return (
    <div>
      <div className="relative flex w-full flex-col gap-3 rounded-[10px] border border-[#E2E8F0] bg-[#fff] px-3 py-3.5 sm:flex-row sm:items-center sm:justify-between sm:gap-2 sm:px-5 sm:py-5 md:gap-4">
        {/* Mobile: Date display at top */}
        <div className="block text-center text-[15px] font-[400] text-[#21295A] sm:absolute sm:left-1/2 sm:-translate-x-1/2 sm:text-[18px] md:text-[18px]">
          {selectedDate?.day}, {monthName} 2025
        </div>

        {/* Mobile: Navigation controls */}
        <div className="flex flex-row items-center justify-center gap-2 sm:justify-start md:gap-2">
          <span
            className={`rounded-[8px] border border-[#E2E8F0] p-2 sm:rounded-[10px] sm:p-2 ${isPrevDisabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer hover:bg-[#F8FAFC]'}`}
            role="button"
            tabIndex={0}
            onClick={handleSelectPrevious}
            onKeyDown={e => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                handleSelectPrevious();
              }
            }}
          >
            <img alt="arrow left" className="h-5 w-5 sm:h-6 sm:w-6" src={'../../assets/svg/arrow_left.svg'} />
          </span>
          <button
            className={`rounded-[8px] border border-[#E2E8F0] px-4 py-2 text-[13px] font-medium sm:rounded-[10px] sm:px-5 sm:py-2 sm:text-[14px] md:text-[14px] ${
              isTodaySelected
                ? 'cursor-not-allowed bg-[#F8FAFC] text-[#94A3B8]'
                : 'cursor-pointer text-[#1E293B] hover:bg-[#F8FAFC]'
            }`}
            disabled={isTodaySelected}
            type="button"
            onClick={handleSelectToday}
          >
            Today
          </button>
          <span
            className={`rounded-[8px] border border-[#E2E8F0] p-2 sm:rounded-[10px] sm:p-2 ${isNextDisabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer hover:bg-[#F8FAFC]'}`}
            role="button"
            tabIndex={0}
            onClick={handleSelectNext}
            onKeyDown={e => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                handleSelectNext();
              }
            }}
          >
            <img alt="arrow right" className="h-5 w-5 sm:h-6 sm:w-6" src={'../../assets/svg/arrow_right.svg'} />
          </span>
        </div>

        {/* Week navigation with dates */}
        <div className="flex flex-row items-center justify-center gap-1.5 sm:gap-2 md:gap-2">
          <span
            className="flex-shrink-0 cursor-pointer rounded-[8px] border border-[#E2E8F0] p-2 hover:bg-[#F8FAFC] sm:relative sm:top-[13px] sm:rounded-[10px] sm:p-2.5"
            role="button"
            tabIndex={0}
            onClick={handleNavigatePrevious}
            onKeyDown={e => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                handleNavigatePrevious();
              }
            }}
          >
            <img alt="arrow left" className="h-4 w-4 sm:h-5 sm:w-5" src={'/assets/right-admin.svg'} />
          </span>
          <div className="scrollbar-hide flex flex-row items-end gap-1.5 overflow-x-auto sm:gap-4 md:gap-4">
            {displayedDates.map((date, index) => {
              const isSelected = selectedDate?.day === date.day && selectedDate?.month === date.month;
              const weekdayLabel = date.fullDate
                ? date.fullDate.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase()
                : '';
              return (
                <div key={index} className="flex flex-shrink-0 flex-col items-center gap-1 text-center sm:gap-2">
                  <span className="text-[10px] font-medium text-[#7A7F9C] sm:text-[12px]">{weekdayLabel}</span>
                  <span
                    className={`cursor-pointer rounded-[8px] border border-[#E2E8F0] px-3 py-2 text-[13px] font-medium text-[#1E293B] sm:rounded-[10px] sm:px-4 sm:py-2.5 sm:text-[15px] md:text-[15px] ${isSelected ? 'bg-[#21295A] text-white' : ''}`}
                    role="button"
                    tabIndex={0}
                    onClick={() => setSelectedDate({ day: date.day, month: date.month, fullDate: date.fullDate })}
                    onKeyDown={e => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        setSelectedDate({ day: date.day, month: date.month, fullDate: date.fullDate });
                      }
                    }}
                  >
                    {date.day}
                  </span>
                </div>
              );
            })}
          </div>
          <span
            className="flex-shrink-0 cursor-pointer rounded-[8px] border border-[#E2E8F0] p-2 hover:bg-[#F8FAFC] sm:relative sm:top-[13px] sm:rounded-[10px] sm:p-2.5"
            role="button"
            tabIndex={0}
            onClick={handleNavigateNext}
            onKeyDown={e => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                handleNavigateNext();
              }
            }}
          >
            <img alt="arrow right" className="h-4 w-4 sm:h-5 sm:w-5" src={'/assets/left-admin.svg'} />
          </span>
        </div>
      </div>
    </div>
  );
};

export default CalendarHeader;
