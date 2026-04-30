import { useState, useMemo, useEffect, useRef } from 'react';

import { CalendarHeader as CalendarHeaderType } from '../types';

const TIMEZONE = 'America/Chicago';

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
  const month = parseInt(dateParts.find(p => p.type === 'month')?.value || '0') - 1;
  const day = parseInt(dateParts.find(p => p.type === 'day')?.value || '0');

  const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  return new Date(`${dateStr}T00:00:00`);
};

const CalendarHeader = ({ selectedDate, setSelectedDate, nextSevenDates, monthName }: CalendarHeaderType) => {
  const [dateOffset, setDateOffset] = useState(0);
  const [isMobile, setIsMobile] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 520);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

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
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTo({
        left: scrollContainerRef.current.scrollLeft - 60,
        behavior: 'smooth',
      });
    }
    if (isPrevDisabled) return;

    const previousDate = displayedDates[currentDateIndex - 1];
    if (previousDate) {
      setSelectedDate({ day: previousDate.day, month: previousDate.month, fullDate: previousDate.fullDate });
    }
  };

  const handleNavigateNext = () => {
    setDateOffset(prev => prev + 1);
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTo({
        left: scrollContainerRef.current.scrollLeft + 60,
        behavior: 'smooth',
      });
    }
    if (isNextDisabled) return;

    const nextDate = displayedDates[currentDateIndex + 1];
    if (nextDate) {
      setSelectedDate({ day: nextDate.day, month: nextDate.month, fullDate: nextDate.fullDate });
    }
  };

  const handleSelectToday = () => {
    if (!today || isTodaySelected) return;
    setDateOffset(0);
    setSelectedDate({ day: today.day, month: today.month, fullDate: today.fullDate });
  };

  return (
    <div className="flex flex-col gap-2 desktop:flex-row desktop:items-center desktop:justify-between">
      {/* Left: current date label */}
      <div className="flex items-center gap-3">
        <div>
          <p className="text-[15px] font-bold text-[#21295A]">
            {monthName} {selectedDate?.fullDate ? selectedDate.fullDate.getFullYear() : new Date().getFullYear()}
          </p>
          <p className="text-[12px] text-gray-400">
            {selectedDate?.day} {monthName}
          </p>
        </div>
        {!isTodaySelected && (
          <button
            className="rounded-lg border border-[#21295A]/20 bg-[#21295A]/5 px-3 py-1.5 text-[11px] font-semibold text-[#21295A] transition hover:bg-[#21295A] hover:text-white"
            type="button"
            onClick={handleSelectToday}
          >
            Today
          </button>
        )}
      </div>

      {/* Right: date navigation */}
      <div className="flex items-end gap-2">
        {/* Prev button — self-end aligns with the date number row */}
        <button
          className="mb-0 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-500 transition hover:border-[#21295A] hover:bg-[#21295A] hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
          disabled={isPrevDisabled}
          type="button"
          onClick={handleNavigatePrevious}
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path d="M15 19l-7-7 7-7" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} />
          </svg>
        </button>

        {/* Date pills */}
        <div ref={scrollContainerRef} className="scrollbar-hide flex items-end gap-1.5 overflow-x-auto desktop:gap-2">
          {displayedDates.map((date, index) => {
            const isSelected = selectedDate?.day === date.day && selectedDate?.month === date.month;
            const weekdayLabel = date.fullDate
              ? date.fullDate.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase()
              : '';
            return (
              <div key={index} className="flex shrink-0 flex-col items-center gap-1">
                <span className="text-[9px] font-semibold tracking-wider text-gray-400 desktop:text-[10px]">
                  {weekdayLabel}
                </span>
                <span
                  className={`cursor-pointer rounded-lg px-3 py-1.5 text-[13px] font-semibold transition-all desktop:px-3.5 desktop:py-2 desktop:text-[14px] ${
                    isSelected
                      ? 'bg-[#21295A] text-white shadow-sm'
                      : 'border border-gray-200 bg-white text-gray-700 hover:border-[#21295A]/30 hover:bg-[#21295A]/5 hover:text-[#21295A]'
                  }`}
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

        {/* Next button */}
        <button
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-500 transition hover:border-[#21295A] hover:bg-[#21295A] hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
          disabled={isNextDisabled}
          type="button"
          onClick={handleNavigateNext}
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path d="M9 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} />
          </svg>
        </button>
      </div>
    </div>
  );
};

export default CalendarHeader;
