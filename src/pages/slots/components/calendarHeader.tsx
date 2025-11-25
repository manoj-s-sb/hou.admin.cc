const CalendarHeader = () => {
  return (
    <div>
      <div className="relative flex w-full flex-row items-center justify-between gap-2 rounded-[10px] bg-[#fff] px-5 py-5">
        <div className="flex flex-row items-center gap-2">
          <span className="rounded-[10px] border border-[#E2E8F0] p-2">
            <img src={'../../assets/svg/arrow_right.svg'} alt="arrow right" className="h-6 w-6" />
          </span>
          <span className="rounded-[10px] border border-[#E2E8F0] px-5 py-2 text-[14px] font-medium text-[#1E293B]">
            Today
          </span>
          <span className="rounded-[10px] border border-[#E2E8F0] p-2">
            <img src={'../../assets/svg/arrow_right.svg'} alt="arrow right" className="h-6 w-6" />
          </span>
        </div>
        <div className="absolute left-1/2 -translate-x-1/2 text-center text-[16px] font-medium text-[#21295A]">
          Oct 11, 2025
        </div>
        <div className="flex flex-row items-center gap-2">
          <span className="rounded-[10px] border border-[#E2E8F0] px-4 py-2.5 text-[15px] font-medium text-[#1E293B]">
            11
          </span>
          <span className="rounded-[10px] border border-[#E2E8F0] px-4 py-2.5 text-[15px] font-medium text-[#1E293B]">
            12
          </span>
          <span className="rounded-[10px] border border-[#E2E8F0] px-4 py-2.5 text-[15px] font-medium text-[#1E293B]">
            13
          </span>
        </div>
      </div>
    </div>
  );
};

export default CalendarHeader;
