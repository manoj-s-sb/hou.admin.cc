import { useState, useMemo, useEffect, useRef } from 'react';

import { CalendarHeader as CalendarHeaderType } from '../types';

const CalendarHeader = ({ selectedDate, setSelectedDate, nextSevenDates, monthName }: CalendarHeaderType) => {
  const [dateOffset, setDateOffset] = useState(0);
  const [isMobile, setIsMobile] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Track window width for responsive behavior
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 520);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Generate dates based on offset and screen size
  const displayedDates = useMemo(() => {
    const dates = [];
    const today = new Date();
    const startDate = new Date(today);
    startDate.setDate(today.getDate() + dateOffset);

    const daysToShow = isMobile ? 5 : 7;
    for (let i = 0; i < daysToShow; i++) {
      const date = new Date(startDate);
      date.setDate(startDate.getDate() + i);
      dates.push({
        day: date.getDate(),
        month: date.getMonth(),
        fullDate: date,
      });
    }
    return dates;
  }, [dateOffset, isMobile]);

  const today = nextSevenDates?.[0];
  const isTodaySelected = Boolean(today && selectedDate?.day === today.day && selectedDate?.month === today.month);
  const currentDateIndex = displayedDates.findIndex(
    date => date.day === selectedDate?.day && date.month === selectedDate?.month
  );
  const isPrevDisabled = currentDateIndex <= 0;
  const isNextDisabled = currentDateIndex === -1 || currentDateIndex >= displayedDates.length - 1;

  const handleNavigatePrevious = () => {
    setDateOffset(prev => prev - 1);
    // Smooth scroll to the left
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTo({
        left: scrollContainerRef.current.scrollLeft - 60,
        behavior: 'smooth',
      });
    }
  };

  const handleNavigateNext = () => {
    setDateOffset(prev => prev + 1);
    // Smooth scroll to the right
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTo({
        left: scrollContainerRef.current.scrollLeft + 60,
        behavior: 'smooth',
      });
    }
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
      <div className="relative flex w-[100%] flex-col gap-3 rounded-[10px] border border-[#E2E8F0] bg-[#fff] px-3 py-3.5 desktop:flex-row desktop:items-center desktop:justify-between desktop:gap-2 desktop:px-5 desktop:py-5">
        {/* Mobile: Date display at top */}
        <div className="block text-center text-[15px] font-[400] text-[#21295A] desktop:absolute desktop:left-1/2 desktop:-translate-x-1/2 desktop:text-[18px]">
          {selectedDate?.day}, {monthName} 2025
        </div>

        {/* Mobile: Navigation controls */}
        <div className="flex flex-row items-center justify-center gap-2 desktop:justify-start desktop:gap-2">
          <span
            className={`rounded-[8px] border border-[#E2E8F0] p-2 desktop:rounded-[10px] desktop:p-2 ${isPrevDisabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer hover:bg-[#F8FAFC]'}`}
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
            <img alt="arrow left" className="h-5 w-5 desktop:h-6 desktop:w-6" src={'../../assets/svg/arrow_left.svg'} />
          </span>
          <button
            className={`rounded-[8px] border border-[#E2E8F0] px-4 py-2 text-[13px] font-medium desktop:rounded-[10px] desktop:px-5 desktop:py-2 desktop:text-[14px] ${
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
            className={`rounded-[8px] border border-[#E2E8F0] p-2 desktop:rounded-[10px] desktop:p-2 ${isNextDisabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer hover:bg-[#F8FAFC]'}`}
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
            <img
              alt="arrow right"
              className="h-5 w-5 desktop:h-6 desktop:w-6"
              src={'../../assets/svg/arrow_right.svg'}
            />
          </span>
        </div>

        {/* Week navigation with dates */}
        <div className="flex flex-row items-center justify-center gap-1.5 desktop:gap-2">
          <span
            className="relative top-[10px] flex-shrink-0 cursor-pointer rounded-[8px] border border-[#E2E8F0] p-2.5 hover:bg-[#F8FAFC] desktop:relative desktop:top-[13px] desktop:rounded-[10px] desktop:p-2.5"
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
            <img alt="arrow left" className="h-4 w-4 desktop:h-5 desktop:w-5" src={'/assets/right-admin.svg'} />
          </span>
          <div
            ref={scrollContainerRef}
            className="scrollbar-hide flex flex-row items-end gap-1.5 overflow-x-auto desktop:gap-4"
          >
            {displayedDates.map((date, index) => {
              const isSelected = selectedDate?.day === date.day && selectedDate?.month === date.month;
              const weekdayLabel = date.fullDate
                ? date.fullDate.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase()
                : '';
              return (
                <div key={index} className="flex flex-shrink-0 flex-col items-center gap-1 text-center desktop:gap-2">
                  <span className="text-[10px] font-medium text-[#7A7F9C] desktop:text-[12px]">{weekdayLabel}</span>
                  <span
                    className={`cursor-pointer rounded-[8px] border border-[#E2E8F0] px-3 py-2 text-[13px] font-medium text-[#1E293B] desktop:rounded-[10px] desktop:px-4 desktop:py-2.5 desktop:text-[15px] ${isSelected ? 'bg-[#21295A] text-white' : ''}`}
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
            className="relative top-[10px] flex-shrink-0 cursor-pointer rounded-[8px] border border-[#E2E8F0] p-2.5 hover:bg-[#F8FAFC] desktop:relative desktop:top-[13px] desktop:rounded-[10px] desktop:p-2.5"
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
            <img alt="arrow right" className="h-4 w-4 desktop:h-5 desktop:w-5" src={'/assets/left-admin.svg'} />
          </span>
        </div>
      </div>
    </div>
  );
};

export default CalendarHeader;
