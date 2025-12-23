import { Fragment, useState, useMemo, useEffect } from 'react';

interface SlotAvailability {
  [key: string]: boolean | undefined; // key format: "dateIndex-slotIndex", undefined = not set, true = available, false = unavailable
}

interface SelectedSlot {
  dateIndex: number;
  slotIndex: number;
  date: string;
  timeSlot: string;
}

const CoachScheduleGrid: React.FC = () => {
  // Store availability state
  const [availability, setAvailability] = useState<SlotAvailability>({});
  const [dateOffset, setDateOffset] = useState(0);
  const [isMobile, setIsMobile] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<SelectedSlot | null>(null);
  const [showModal, setShowModal] = useState(false);

  // Track window width for responsive behavior
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Generate time slots with consistent 45-minute intervals
  const generateTimeSlots = (): string[] => {
    const slots: string[] = [];
    let startMinutes = 0 * 60; // Start at 00:00 (midnight)
    const endMinutes = 24 * 60; // End at 24:00 (end of day)
    const slotDuration = 45; // 45-minute slots

    while (startMinutes < endMinutes) {
      const endSlotMinutes = startMinutes + slotDuration;

      const startHour = Math.floor(startMinutes / 60);
      const startMin = startMinutes % 60;
      const endHour = Math.floor(endSlotMinutes / 60);
      const endMin = endSlotMinutes % 60;

      const startTime = `${startHour.toString().padStart(2, '0')}:${startMin.toString().padStart(2, '0')}`;
      const endTime = `${endHour.toString().padStart(2, '0')}:${endMin.toString().padStart(2, '0')}`;

      slots.push(`${startTime} - ${endTime}`);
      startMinutes += slotDuration;
    }

    return slots;
  };

  const timeSlots = generateTimeSlots();

  // Generate dates based on offset and screen size
  const displayedDates = useMemo(() => {
    const dates = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Reset time for accurate comparison
    const startDate = new Date(today);
    startDate.setDate(today.getDate() + dateOffset);

    const daysToShow = isMobile ? 3 : 7;
    for (let i = 0; i < daysToShow; i++) {
      const date = new Date(startDate);
      date.setDate(startDate.getDate() + i);
      const dateOnly = new Date(date);
      dateOnly.setHours(0, 0, 0, 0);
      const isToday = dateOnly.getTime() === today.getTime();

      dates.push({
        day: date.getDate(),
        month: date.getMonth(),
        year: date.getFullYear(),
        fullDate: date,
        weekday: date.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase(),
        isToday,
      });
    }
    return dates;
  }, [dateOffset, isMobile]);

  const handleNavigatePrevious = () => {
    setDateOffset(prev => prev - 1);
  };

  const handleNavigateNext = () => {
    setDateOffset(prev => prev + 1);
  };

  // Open modal for slot selection
  const handleSlotClick = (dateIndex: number, slotIndex: number, date: any, timeSlot: string) => {
    setSelectedSlot({
      dateIndex,
      slotIndex,
      date: date.fullDate.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      }),
      timeSlot,
    });
    setShowModal(true);
  };

  // Set slot availability
  const setSlotAvailability = (isAvailable: boolean) => {
    if (!selectedSlot) return;

    const key = `${selectedSlot.dateIndex}-${selectedSlot.slotIndex}`;
    setAvailability(prev => ({
      ...prev,
      [key]: isAvailable,
    }));
    setShowModal(false);
    setSelectedSlot(null);
  };

  // Get slot availability status
  const getSlotStatus = (dateIndex: number, slotIndex: number): 'available' | 'unavailable' | 'not-set' => {
    const key = `${dateIndex}-${slotIndex}`;
    const value = availability[key];

    if (value === undefined) return 'not-set';
    return value ? 'available' : 'unavailable';
  };

  // Close modal
  const closeModal = () => {
    setShowModal(false);
    setSelectedSlot(null);
  };

  // Grid template columns: first column for time, then one for each date
  const gridTemplateColumns = { gridTemplateColumns: `140px repeat(${displayedDates.length}, minmax(180px, 1fr))` };
  const gridTemplateColumnsMobile = {
    gridTemplateColumns: `100px repeat(${displayedDates.length}, minmax(140px, 1fr))`,
  };

  const composeClasses = (...classes: Array<string | false | null | undefined>) => classes.filter(Boolean).join(' ');

  return (
    <div className="flex flex-col gap-4">
      {/* Availability Modal */}
      {showModal && selectedSlot && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="w-[90%] max-w-md rounded-[12px] bg-white p-6 shadow-lg">
            <h3 className="mb-2 text-[18px] font-semibold text-[#21295A]">Set Availability</h3>
            <div className="mb-4 text-[14px] text-[#64748B]">
              <p className="mb-1">
                <strong>Date:</strong> {selectedSlot.date}
              </p>
              <p>
                <strong>Time:</strong> {selectedSlot.timeSlot}
              </p>
            </div>
            <div className="mb-6 flex flex-col gap-3">
              <button
                className="rounded-[10px] border-2 border-[#21295A] bg-[#21295A] px-6 py-3 text-[15px] font-medium text-white transition hover:bg-[#1a1f42]"
                type="button"
                onClick={() => setSlotAvailability(true)}
              >
                ✓ Mark as Available
              </button>
              <button
                className="rounded-[10px] border-2 border-[#E2E8F0] bg-white px-6 py-3 text-[15px] font-medium text-[#64748B] transition hover:bg-[#F1F5F9]"
                type="button"
                onClick={() => setSlotAvailability(false)}
              >
                ✕ Mark as Unavailable
              </button>
            </div>
            <button
              className="w-full rounded-[10px] border border-[#E2E8F0] bg-white px-6 py-2.5 text-[14px] font-medium text-[#64748B] transition hover:bg-[#F8FAFC]"
              type="button"
              onClick={closeModal}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Schedule Grid */}
      <div className="rounded-[10px] bg-white">
        <div className="relative max-h-[calc(55vh+65px)] overflow-x-auto overflow-y-auto desktop:max-h-[calc(65vh+70px)]">
          <div className="min-w-fit">
            {/* Mobile Layout */}
            <div className="desktop:hidden">
              {/* Header Row - Sticky Top with Navigation */}
              <div className="sticky top-0 z-30 bg-white">
                <div className="flex items-center justify-between border-b border-[#B3DADA] bg-white px-2 py-2">
                  <button
                    className="rounded-[8px] border border-[#E2E8F0] p-2 hover:bg-[#F8FAFC]"
                    type="button"
                    onClick={handleNavigatePrevious}
                  >
                    <img alt="arrow left" className="h-4 w-4" src={'/assets/svg/arrow_left.svg'} />
                  </button>
                  <span className="text-[12px] font-medium text-[#21295A]">Swipe to see more dates</span>
                  <button
                    className="rounded-[8px] border border-[#E2E8F0] p-2 hover:bg-[#F8FAFC]"
                    type="button"
                    onClick={handleNavigateNext}
                  >
                    <img alt="arrow right" className="h-4 w-4" src={'/assets/svg/arrow_right.svg'} />
                  </button>
                </div>
                <div className="grid bg-white" style={gridTemplateColumnsMobile}>
                  <div className="sticky left-0 z-40 flex min-h-[65px] min-w-[100px] items-center justify-center border border-[#B3DADA] bg-[#fff] px-2 py-3 text-[12px] font-semibold text-[#21295A] shadow-[2px_0_4px_rgba(0,0,0,0.05)]">
                    Time Slot
                  </div>
                   {displayedDates.map((date, dateIdx) => (
                     <div
                       key={dateIdx}
                       className={composeClasses(
                         'relative flex min-h-[65px] w-full min-w-[140px] flex-col items-center justify-center border border-l-0 border-[#B3DADA] px-2 py-3 text-center',
                         date.isToday ? 'bg-[#21295A]' : 'bg-[#fff]'
                       )}
                     >
                       <div className="flex flex-col items-center justify-center gap-1">
                         <span className={composeClasses(
                           'text-[10px] font-medium',
                           date.isToday ? 'text-white' : 'text-[#7A7F9C]'
                         )}>
                           {date.weekday}
                         </span>
                         <span className={composeClasses(
                           'text-[12px] font-semibold',
                           date.isToday ? 'text-white' : 'text-[#21295A]'
                         )}>
                           {date.day}
                         </span>
                         <span className={composeClasses(
                           'text-[10px] font-medium',
                           date.isToday ? 'text-white' : 'text-[#7A7F9C]'
                         )}>
                           {date.fullDate.toLocaleDateString('en-US', { month: 'short' })}
                         </span>
                       </div>
                     </div>
                   ))}
                </div>
              </div>

              {/* Time Slots Grid */}
              <div className="grid" style={gridTemplateColumnsMobile}>
                {timeSlots.map((slot, slotIdx) => (
                  <Fragment key={slot}>
                    <div
                      className={composeClasses(
                        'sticky left-0 z-20 flex min-h-[65px] min-w-[100px] items-center justify-center border border-[#B3DADA] bg-[#fff] px-2 py-4 text-[11px] font-medium text-[#21295A] shadow-[2px_0_4px_rgba(0,0,0,0.05)]',
                        slotIdx !== 0 && 'border-t-0'
                      )}
                    >
                      {slot}
                    </div>
                    {displayedDates.map((date, dateIdx) => {
                      const slotStatus = getSlotStatus(dateIdx, slotIdx);

                      return (
                        <button
                          key={`${slot}-${dateIdx}`}
                          className={composeClasses(
                            'flex min-h-[65px] min-w-[140px] items-center justify-center border border-[#B3DADA] bg-[#F1F5F9] text-[11px] font-medium transition-all duration-200 hover:bg-[#E2E8F0]',
                            slotIdx !== 0 && 'border-t-0',
                            dateIdx !== 0 && 'border-l-0'
                          )}
                          type="button"
                          onClick={() => handleSlotClick(dateIdx, slotIdx, date, slot)}
                        >
                           <div className="flex h-full w-full items-center justify-center px-2 py-2 text-center text-[11px] leading-tight">
                             {slotStatus === 'available' ? (
                               <span className="text-[16px] text-[#21295A]">✓</span>
                             ) : slotStatus === 'unavailable' ? (
                               <span className="text-[16px] text-[#64748B]">✕</span>
                             ) : (
                               ''
                             )}
                           </div>
                        </button>
                      );
                    })}
                  </Fragment>
                ))}
              </div>
            </div>

            {/* Desktop Layout */}
            <div className="hidden desktop:block">
              {/* Header Row - Sticky Top with Navigation */}
              <div className="sticky top-0 z-30 bg-white">
                <div className="flex items-center justify-end gap-2 border-b border-[#B3DADA] bg-white px-5 py-3">
                  <button
                    className="rounded-[8px] border border-[#E2E8F0] p-2.5 hover:bg-[#F8FAFC]"
                    type="button"
                    onClick={handleNavigatePrevious}
                  >
                    <img alt="arrow left" className="h-5 w-5" src={'/assets/svg/arrow_left.svg'} />
                  </button>
                  <button
                    className="rounded-[8px] border border-[#E2E8F0] p-2.5 hover:bg-[#F8FAFC]"
                    type="button"
                    onClick={handleNavigateNext}
                  >
                    <img alt="arrow right" className="h-5 w-5" src={'/assets/svg/arrow_right.svg'} />
                  </button>
                </div>
                <div className="grid bg-white" style={gridTemplateColumns}>
                  <div className="sticky left-0 z-40 flex min-h-[70px] min-w-[140px] items-center justify-center border border-[#B3DADA] bg-[#fff] px-5 py-4 text-[15px] font-semibold text-[#21295A] shadow-[2px_0_4px_rgba(0,0,0,0.05)]">
                    Time Slot
                  </div>
                   {displayedDates.map((date, dateIdx) => (
                     <div
                       key={dateIdx}
                       className={composeClasses(
                         'relative flex min-h-[70px] w-full min-w-[180px] flex-col items-center justify-center border border-l-0 border-[#B3DADA] px-4 py-4 text-center',
                         date.isToday ? 'bg-[#21295A]' : 'bg-[#fff]'
                       )}
                     >
                       <div className="flex flex-col items-center justify-center gap-2">
                         <span className={composeClasses(
                           'text-[12px] font-medium',
                           date.isToday ? 'text-white' : 'text-[#7A7F9C]'
                         )}>
                           {date.weekday}
                         </span>
                         <span className={composeClasses(
                           'text-[15px] font-semibold',
                           date.isToday ? 'text-white' : 'text-[#21295A]'
                         )}>
                           {date.day}
                         </span>
                         <span className={composeClasses(
                           'text-[13px] font-medium',
                           date.isToday ? 'text-white' : 'text-[#7A7F9C]'
                         )}>
                           {date.fullDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                         </span>
                       </div>
                     </div>
                   ))}
                </div>
              </div>

              {/* Time Slots Grid */}
              <div className="grid" style={gridTemplateColumns}>
                {timeSlots.map((slot, slotIdx) => (
                  <Fragment key={slot}>
                    <div
                      className={composeClasses(
                        'sticky left-0 z-20 flex min-h-[70px] min-w-[140px] items-center justify-center border border-[#B3DADA] bg-[#fff] px-4 py-6 text-[14px] font-medium text-[#21295A] shadow-[2px_0_4px_rgba(0,0,0,0.05)]',
                        slotIdx !== 0 && 'border-t-0'
                      )}
                    >
                      {slot}
                    </div>
                    {displayedDates.map((date, dateIdx) => {
                      const slotStatus = getSlotStatus(dateIdx, slotIdx);

                      return (
                        <button
                          key={`${slot}-${dateIdx}`}
                          className={composeClasses(
                            'group relative flex min-h-[70px] min-w-[180px] items-center justify-center border border-[#B3DADA] bg-[#F1F5F9] text-[14px] font-medium transition-all duration-200 hover:bg-[#E2E8F0]',
                            slotIdx !== 0 && 'border-t-0',
                            dateIdx !== 0 && 'border-l-0'
                          )}
                          type="button"
                          onClick={() => handleSlotClick(dateIdx, slotIdx, date, slot)}
                        >
                           <div className="flex h-full w-full items-center justify-center p-4 text-center text-[20px]">
                             {slotStatus === 'available' ? (
                               <span className="text-[#21295A]">✓</span>
                             ) : slotStatus === 'unavailable' ? (
                               <span className="text-[#64748B]">✕</span>
                             ) : (
                               ''
                             )}
                           </div>
                        </button>
                      );
                    })}
                  </Fragment>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Legend/Instructions */}
      <div className="flex flex-wrap items-center justify-center gap-4 rounded-[10px] border border-[#E2E8F0] bg-white px-4 py-3 desktop:justify-start desktop:px-5 desktop:py-4">
        <div className="flex items-center gap-2">
          <div className="flex h-6 w-6 items-center justify-center rounded bg-[#F1F5F9]">
            <span className="text-[14px] text-[#21295A]">✓</span>
          </div>
          <span className="text-[13px] font-medium text-[#1E293B] desktop:text-[14px]">Available</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex h-6 w-6 items-center justify-center rounded bg-[#F1F5F9]">
            <span className="text-[14px] text-[#64748B]">✕</span>
          </div>
          <span className="text-[13px] font-medium text-[#1E293B] desktop:text-[14px]">Unavailable</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-6 w-6 rounded bg-[#F1F5F9]"></div>
          <span className="text-[13px] font-medium text-[#1E293B] desktop:text-[14px]">Not Set</span>
        </div>
        <div className="ml-auto text-[12px] text-[#64748B] desktop:text-[13px]">
          Click any slot to mark your availability for that date and time
        </div>
      </div>
    </div>
  );
};

export default CoachScheduleGrid;
