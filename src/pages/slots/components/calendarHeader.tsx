import { useState, useMemo, useEffect, useRef } from 'react';

import { CalendarHeader as CalendarHeaderType } from '../types';

const TIMEZONE = 'America/Chicago';

// Helper function to get today's date in Chicago timezone
const getTodayInChicago = (): Date => {
  const now = new Date();
  const dateFormatter = new Intl.DateTimeFormat('en-US', {
    timeZone: TIMEZONE,
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
  });

  const dateParts = dateFormatter.formatToParts(now);
  const year = parseInt(dateParts.find(p => p.type === 'year')?.value || '0');
  const month = parseInt(dateParts.find(p => p.type === 'month')?.value || '0') - 1; // 0-indexed
  const day = parseInt(dateParts.find(p => p.type === 'day')?.value || '0');

  // Create a Date object for this date at midnight in local time
  const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  return new Date(`${dateStr}T00:00:00`);
};

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
    const today = getTodayInChicago();
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
    if (isPrevDisabled) {
      return;
    }

    const previousDate = displayedDates[currentDateIndex - 1];
    if (previousDate) {
      setSelectedDate({ day: previousDate.day, month: previousDate.month, fullDate: previousDate.fullDate });
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
    if (isNextDisabled) {
      return;
    }

    const nextDate = displayedDates[currentDateIndex + 1];
    if (nextDate) {
      setSelectedDate({ day: nextDate.day, month: nextDate.month, fullDate: nextDate.fullDate });
    }
  };

  const handleSelectToday = () => {
    if (!today || isTodaySelected) {
      return;
    }

    setDateOffset(0);
    setSelectedDate({ day: today.day, month: today.month, fullDate: today.fullDate });
  };

  return (
    <div>
      <div className="relative flex w-[100%] flex-col gap-2 rounded-[10px] border border-[#E2E8F0] bg-[#fff] px-3 py-2.5 desktop:flex-row desktop:items-center desktop:justify-between desktop:gap-2 desktop:px-4 desktop:py-3">
        {/* Mobile: Date display at top */}
        <div className="block text-center text-[14px] font-[400] text-[#21295A] desktop:text-[16px]">
          {selectedDate?.day}, {monthName}{' '}
          {selectedDate?.fullDate ? selectedDate.fullDate.getFullYear() : new Date().getFullYear()}
        </div>
        {/* Week navigation with dates */}
        <div className="flex flex-row items-center justify-center gap-1 desktop:gap-1.5">
          {!isTodaySelected && (
            <button
              className="mt-5 cursor-pointer rounded-[8px] border border-[#E2E8F0] px-3 py-1.5 text-[12px] font-medium text-[#1E293B] hover:bg-[#F8FAFC] desktop:rounded-[10px] desktop:px-4 desktop:py-1.5 desktop:text-[13px]"
              type="button"
              onClick={handleSelectToday}
            >
              Today
            </button>
          )}

          <span
            className="relative top-[8px] flex-shrink-0 cursor-pointer rounded-[8px] border border-[#E2E8F0] p-2 hover:bg-[#F8FAFC] desktop:relative desktop:top-[10px] desktop:rounded-[10px] desktop:p-2"
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
            className="scrollbar-hide flex flex-row items-end gap-1 overflow-x-auto desktop:gap-3"
          >
            {displayedDates.map((date, index) => {
              const isSelected = selectedDate?.day === date.day && selectedDate?.month === date.month;
              const weekdayLabel = date.fullDate
                ? date.fullDate.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase()
                : '';
              return (
                <div key={index} className="flex flex-shrink-0 flex-col items-center gap-0.5 text-center desktop:gap-1">
                  <span className="text-[9px] font-medium text-[#7A7F9C] desktop:text-[11px]">{weekdayLabel}</span>
                  <span
                    className={`cursor-pointer rounded-[8px] border border-[#E2E8F0] px-2.5 py-1.5 text-[12px] font-medium text-[#1E293B] desktop:rounded-[10px] desktop:px-3 desktop:py-2 desktop:text-[14px] ${isSelected ? 'bg-[#21295A] text-white' : ''}`}
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
            className="relative top-[8px] flex-shrink-0 cursor-pointer rounded-[8px] border border-[#E2E8F0] p-2 hover:bg-[#F8FAFC] desktop:relative desktop:top-[10px] desktop:rounded-[10px] desktop:p-2"
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
