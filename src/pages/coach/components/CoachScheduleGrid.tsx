import { Fragment, useState, useMemo, useEffect, useRef } from 'react';

interface SlotAvailability {
  [key: string]: boolean | undefined; // key format: "dateIndex-slotIndex", undefined = not set, true = available, false = unavailable
}

interface SelectedSlot {
  dateIndex: number;
  slotIndex: number;
  date: string;
  timeSlot: string;
}

interface SlotKey {
  dateIndex: number;
  slotIndex: number;
}

const CoachScheduleGrid: React.FC = () => {
  // Store availability state
  const [availability, setAvailability] = useState<SlotAvailability>({});
  const [dateOffset, setDateOffset] = useState(0);
  const [isMobile, setIsMobile] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<SelectedSlot | null>(null);
  const [showModal, setShowModal] = useState(false);

  // Multi-select state
  const [isSelecting, setIsSelecting] = useState(false);
  const [selectedSlots, setSelectedSlots] = useState<Set<string>>(new Set());
  const [selectionMode, setSelectionMode] = useState(false);
  const selectionStartRef = useRef<SlotKey | null>(null);

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

  // Toggle selection mode
  const toggleSelectionMode = () => {
    setSelectionMode(!selectionMode);
    if (selectionMode) {
      // Exiting selection mode - clear selections
      setSelectedSlots(new Set());
    }
  };

  // Generate absolute slot key based on date and time
  const getAbsoluteSlotKey = (date: any, timeSlot: string): string => {
    const dateStr = `${date.year}-${String(date.month + 1).padStart(2, '0')}-${String(date.day).padStart(2, '0')}`;
    return `${dateStr}_${timeSlot}`;
  };

  // Handle mouse down to start selection
  const handleSlotMouseDown = (dateIndex: number, slotIndex: number) => {
    if (!selectionMode) return;

    setIsSelecting(true);
    selectionStartRef.current = { dateIndex, slotIndex };

    const date = displayedDates[dateIndex];
    const timeSlot = timeSlots[slotIndex];
    const key = getAbsoluteSlotKey(date, timeSlot);
    const newSelected = new Set(selectedSlots);

    if (newSelected.has(key)) {
      newSelected.delete(key);
    } else {
      newSelected.add(key);
    }

    setSelectedSlots(newSelected);
  };

  // Handle mouse enter for drag selection
  const handleSlotMouseEnter = (dateIndex: number, slotIndex: number) => {
    if (!selectionMode || !isSelecting) return;

    const date = displayedDates[dateIndex];
    const timeSlot = timeSlots[slotIndex];
    const key = getAbsoluteSlotKey(date, timeSlot);
    const newSelected = new Set(selectedSlots);
    newSelected.add(key);
    setSelectedSlots(newSelected);
  };

  // Handle mouse up to end selection
  const handleSlotMouseUp = () => {
    if (selectionMode) {
      setIsSelecting(false);
      selectionStartRef.current = null;
    }
  };

  // Add global mouse up listener
  useEffect(() => {
    if (selectionMode) {
      document.addEventListener('mouseup', handleSlotMouseUp);
      return () => {
        document.removeEventListener('mouseup', handleSlotMouseUp);
      };
    }
  }, [selectionMode]);

  // Open modal for slot selection
  const handleSlotClick = (dateIndex: number, slotIndex: number, date: any, timeSlot: string) => {
    if (selectionMode) return; // Don't open modal in selection mode

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

  // Set slot availability (single slot)
  const setSlotAvailability = (isAvailable: boolean) => {
    if (!selectedSlot) return;

    const date = displayedDates[selectedSlot.dateIndex];
    const timeSlot = timeSlots[selectedSlot.slotIndex];
    const key = getAbsoluteSlotKey(date, timeSlot);
    setAvailability(prev => ({
      ...prev,
      [key]: isAvailable,
    }));
    setShowModal(false);
    setSelectedSlot(null);
  };

  // Set multiple slots availability
  const setMultipleSlotAvailability = (isAvailable: boolean) => {
    const updates: SlotAvailability = {};

    // Use absolute keys directly for availability
    selectedSlots.forEach(absoluteKey => {
      updates[absoluteKey] = isAvailable;
    });

    setAvailability(prev => ({
      ...prev,
      ...updates,
    }));

    // Clear selection after applying
    setSelectedSlots(new Set());
    setSelectionMode(false);
  };

  // Clear all selections
  const clearSelections = () => {
    setSelectedSlots(new Set());
  };

  // Check if a slot is selected
  const isSlotSelected = (dateIndex: number, slotIndex: number): boolean => {
    const date = displayedDates[dateIndex];
    const timeSlot = timeSlots[slotIndex];
    const key = getAbsoluteSlotKey(date, timeSlot);
    return selectedSlots.has(key);
  };

  // Get slot availability status
  const getSlotStatus = (dateIndex: number, slotIndex: number): 'available' | 'unavailable' | 'not-set' => {
    const date = displayedDates[dateIndex];
    const timeSlot = timeSlots[slotIndex];
    const key = getAbsoluteSlotKey(date, timeSlot);
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
              <div className="sticky top-0 z-30">
                <div className="flex items-center justify-between gap-2 border-b border-[#B3DADA] bg-white px-2 py-2">
                  <div className="flex items-center gap-1">
                    <button
                      className="rounded-[8px] border border-[#E2E8F0] p-2 hover:bg-[#F8FAFC]"
                      type="button"
                      onClick={handleNavigatePrevious}
                    >
                      <img alt="arrow left" className="h-4 w-4" src={'/assets/svg/arrow_left.svg'} />
                    </button>
                    <button
                      className="rounded-[8px] border border-[#E2E8F0] p-2 hover:bg-[#F8FAFC]"
                      type="button"
                      onClick={handleNavigateNext}
                    >
                      <img alt="arrow right" className="h-4 w-4" src={'/assets/svg/arrow_right.svg'} />
                    </button>
                  </div>

                  <button
                    className={`rounded-[8px] px-2 py-1.5 text-[11px] font-medium transition ${
                      selectionMode ? 'bg-[#21295A] text-white' : 'border border-[#E2E8F0] bg-white text-[#21295A]'
                    }`}
                    type="button"
                    onClick={toggleSelectionMode}
                  >
                    {selectionMode ? `✓ ${selectedSlots.size || 0} Selected` : 'Multi-Select'}
                  </button>

                  {selectionMode && selectedSlots.size > 0 && (
                    <>
                      <button
                        className="rounded-[8px] bg-[#21295A] px-2 py-1.5 text-[11px] font-medium text-white"
                        type="button"
                        onClick={() => setMultipleSlotAvailability(true)}
                      >
                        ✓
                      </button>
                      <button
                        className="rounded-[8px] border border-[#E2E8F0] bg-white px-2 py-1.5 text-[11px] font-medium text-[#64748B]"
                        type="button"
                        onClick={() => setMultipleSlotAvailability(false)}
                      >
                        ✕
                      </button>
                    </>
                  )}
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
                        <span
                          className={composeClasses(
                            'text-[10px] font-medium',
                            date.isToday ? 'text-white' : 'text-[#7A7F9C]'
                          )}
                        >
                          {date.weekday}
                        </span>
                        <span
                          className={composeClasses(
                            'text-[12px] font-semibold',
                            date.isToday ? 'text-white' : 'text-[#21295A]'
                          )}
                        >
                          {date.day}
                        </span>
                        <span
                          className={composeClasses(
                            'text-[10px] font-medium',
                            date.isToday ? 'text-white' : 'text-[#7A7F9C]'
                          )}
                        >
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
                      const isSelected = isSlotSelected(dateIdx, slotIdx);

                      return (
                        <button
                          key={`${slot}-${dateIdx}`}
                          className={composeClasses(
                            'flex min-h-[65px] min-w-[140px] items-center justify-center border border-[#B3DADA] text-[11px] font-medium transition-all duration-200',
                            slotIdx !== 0 && 'border-t-0',
                            dateIdx !== 0 && 'border-l-0',
                            isSelected
                              ? 'bg-[#21295A] ring-2 ring-inset ring-[#1a1f42]'
                              : 'bg-[#F1F5F9] hover:bg-[#E2E8F0]',
                            selectionMode && 'cursor-pointer select-none'
                          )}
                          type="button"
                          onClick={() => handleSlotClick(dateIdx, slotIdx, date, slot)}
                          onMouseDown={() => handleSlotMouseDown(dateIdx, slotIdx)}
                          onMouseEnter={() => handleSlotMouseEnter(dateIdx, slotIdx)}
                        >
                          <div className="flex h-full w-full items-center justify-center px-2 py-2 text-center text-[11px] leading-tight">
                            {isSelected ? (
                              <span className="text-[16px] text-white">●</span>
                            ) : slotStatus === 'available' ? (
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
              <div className="sticky top-0 z-30">
                <div className="flex items-center justify-between gap-3 border-b border-[#B3DADA] bg-white px-5 py-3">
                  <button
                    className={`rounded-[8px] border px-4 py-2 text-[13px] font-medium transition ${
                      selectionMode
                        ? 'border-[#21295A] bg-[#21295A] text-white hover:bg-[#1a1f42]'
                        : 'border-[#E2E8F0] bg-white text-[#21295A] hover:bg-[#F8FAFC]'
                    }`}
                    type="button"
                    onClick={toggleSelectionMode}
                  >
                    {selectionMode ? '✓ Multi-Select ON' : 'Enable Multi-Select'}
                  </button>

                  {selectionMode && (
                    <div className="flex items-center gap-2">
                      {selectedSlots.size > 0 && (
                        <>
                          <span className="text-[13px] font-medium text-[#64748B]">{selectedSlots.size} selected</span>
                          <button
                            className="rounded-[8px] bg-[#21295A] px-3 py-2 text-[13px] font-medium text-white transition hover:bg-[#1a1f42]"
                            type="button"
                            onClick={() => setMultipleSlotAvailability(true)}
                          >
                            ✓ Available
                          </button>
                          <button
                            className="rounded-[8px] border border-[#E2E8F0] bg-white px-3 py-2 text-[13px] font-medium text-[#64748B] transition hover:bg-[#F1F5F9]"
                            type="button"
                            onClick={() => setMultipleSlotAvailability(false)}
                          >
                            ✕ Unavailable
                          </button>
                          <button
                            className="rounded-[8px] border border-[#E2E8F0] bg-white px-3 py-2 text-[13px] font-medium text-[#64748B] transition hover:bg-[#F8FAFC]"
                            type="button"
                            onClick={clearSelections}
                          >
                            Clear
                          </button>
                        </>
                      )}
                    </div>
                  )}

                  <div className="ml-auto flex items-center gap-2">
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
                        <span
                          className={composeClasses(
                            'text-[12px] font-medium',
                            date.isToday ? 'text-white' : 'text-[#7A7F9C]'
                          )}
                        >
                          {date.weekday}
                        </span>
                        <span
                          className={composeClasses(
                            'text-[15px] font-semibold',
                            date.isToday ? 'text-white' : 'text-[#21295A]'
                          )}
                        >
                          {date.day}
                        </span>
                        <span
                          className={composeClasses(
                            'text-[13px] font-medium',
                            date.isToday ? 'text-white' : 'text-[#7A7F9C]'
                          )}
                        >
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
                      const isSelected = isSlotSelected(dateIdx, slotIdx);

                      return (
                        <button
                          key={`${slot}-${dateIdx}`}
                          className={composeClasses(
                            'group relative flex min-h-[70px] min-w-[180px] items-center justify-center border border-[#B3DADA] text-[14px] font-medium transition-all duration-200',
                            slotIdx !== 0 && 'border-t-0',
                            dateIdx !== 0 && 'border-l-0',
                            isSelected
                              ? 'bg-[#21295A] ring-2 ring-inset ring-[#1a1f42]'
                              : 'bg-[#F1F5F9] hover:bg-[#E2E8F0]',
                            selectionMode && 'cursor-pointer select-none'
                          )}
                          type="button"
                          onClick={() => handleSlotClick(dateIdx, slotIdx, date, slot)}
                          onMouseDown={() => handleSlotMouseDown(dateIdx, slotIdx)}
                          onMouseEnter={() => handleSlotMouseEnter(dateIdx, slotIdx)}
                        >
                          <div className="flex h-full w-full items-center justify-center p-4 text-center text-[20px]">
                            {isSelected ? (
                              <span className="text-white">●</span>
                            ) : slotStatus === 'available' ? (
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

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-4 rounded-[10px] border border-[#E2E8F0] bg-white px-4 py-3 desktop:px-5 desktop:py-4">
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
        {selectionMode && (
          <div className="flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded bg-[#21295A]">
              <span className="text-[14px] text-white">●</span>
            </div>
            <span className="text-[13px] font-medium text-[#1E293B] desktop:text-[14px]">Selected</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default CoachScheduleGrid;
