import { CalendarHeader as CalendarHeaderType } from '../types';

const CalendarHeader = ({
  selectedDate,
  setSelectedDate,
  monthAbbreviation,
  nextSevenDates,
  monthName,
}: CalendarHeaderType) => {
  return (
    <div>
      <div className="relative flex w-full flex-row items-center justify-between gap-2 rounded-[10px] border border-[#E2E8F0] bg-[#fff] px-5 py-5">
        <div className="flex flex-row items-center gap-2">
          <span className="rounded-[10px] border border-[#E2E8F0] p-2">
            <img alt="arrow right" className="h-6 w-6" src={'../../assets/svg/arrow_left.svg'} />
          </span>
          <span className="rounded-[10px] border border-[#E2E8F0] px-5 py-2 text-[14px] font-medium text-[#1E293B]">
            Today
          </span>
          <span className="rounded-[10px] border border-[#E2E8F0] p-2">
            <img alt="arrow right" className="h-6 w-6" src={'../../assets/svg/arrow_right.svg'} />
          </span>
        </div>
        <div className="absolute left-1/2 -translate-x-1/2 text-center text-[18px] font-[400] text-[#21295A]">
          {selectedDate?.day}, {monthName} 2025
        </div>
        <div className="flex flex-col gap-2">
          <span className="text-[14px] font-medium text-[#7A7F9C]">{monthAbbreviation}</span>
          <div className="flex flex-row items-center gap-2">
            {nextSevenDates.map((date, index) => (
              <span
                key={index}
                className={`cursor-pointer rounded-[10px] border border-[#E2E8F0] px-4 py-2.5 text-[15px] font-medium text-[#1E293B] ${selectedDate?.day === date.day ? 'bg-[#21295A] text-white' : ''}`}
                role="button"
                tabIndex={0}
                onClick={() => setSelectedDate({ day: date.day, month: date.month })}
                onKeyDown={e => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    setSelectedDate({ day: date.day, month: date.month });
                  }
                }}
              >
                {date.day}
              </span>
            ))}{' '}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CalendarHeader;
