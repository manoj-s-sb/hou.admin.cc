import { Fragment, useState, useMemo, useEffect, useRef, useCallback } from 'react';

import { toast } from 'react-hot-toast';
import { useDispatch } from 'react-redux';

import { updateCoachSlots } from '../../../store/slots/api';
import { CoachSlotsResponse, Coach, CoachSlot } from '../../../store/slots/types';
import { AppDispatch } from '../../../store/store';

interface SlotAvailability {
  [key: string]: boolean | undefined; // key format: "coachSlotCode", undefined = not set, true = available, false = unavailable
}

interface SelectedSlot {
  dateIndex: number;
  slotIndex: number;
  date: string;
  timeSlot: string;
  coachSlotCode: string;
}

interface SlotKey {
  dateIndex: number;
  slotIndex: number;
}

const CoachScheduleGrid: React.FC<{ coachSlotsList: CoachSlotsResponse[]; isLoading: boolean }> = ({
  coachSlotsList,
  isLoading,
}) => {
  const dispatch = useDispatch<AppDispatch>();

  // Store availability state
  const [availability, setAvailability] = useState<SlotAvailability>({});
  const [selectedSlot, setSelectedSlot] = useState<SelectedSlot | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [selectedCoachIndex, setSelectedCoachIndex] = useState(0);

  // Multi-select state
  const [isSelecting, setIsSelecting] = useState(false);
  const [selectedSlots, setSelectedSlots] = useState<Set<string>>(new Set());
  const [selectionMode, setSelectionMode] = useState(false);
  const selectionStartRef = useRef<SlotKey | null>(null);

  // API state
  const [isUpdating, setIsUpdating] = useState(false);

  // Initialize availability from API data
  useEffect(() => {
    if (coachSlotsList && coachSlotsList.length > 0) {
      const currentCoach = coachSlotsList[0].coaches[selectedCoachIndex];
      if (currentCoach) {
        const initialAvailability: SlotAvailability = {};
        currentCoach.availability.forEach(dayAvailability => {
          dayAvailability.slots.forEach(slot => {
            initialAvailability[slot.coachSlotCode] = slot.isAvailable;
          });
        });
        setAvailability(initialAvailability);
      }
    }
  }, [coachSlotsList, selectedCoachIndex]);

  // Get current coach data
  const currentCoachData: Coach | null = useMemo(() => {
    if (!coachSlotsList || coachSlotsList.length === 0) return null;
    return coachSlotsList[0].coaches[selectedCoachIndex] || null;
  }, [coachSlotsList, selectedCoachIndex]);

  // Extract dates from availability
  const displayedDates = useMemo(() => {
    if (!currentCoachData) return [];

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return currentCoachData.availability.map(dayAvailability => {
      const date = new Date(dayAvailability.date);
      const dateOnly = new Date(date);
      dateOnly.setHours(0, 0, 0, 0);
      const isToday = dateOnly.getTime() === today.getTime();

      return {
        day: date.getDate(),
        month: date.getMonth(),
        year: date.getFullYear(),
        fullDate: date,
        dateString: dayAvailability.date,
        weekday: date.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase(),
        isToday,
        isHoliday: dayAvailability.isHoliday,
        slots: dayAvailability.slots,
      };
    });
  }, [currentCoachData]);

  // Helper function to format time consistently
  const formatTime = (date: Date): string => {
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${hours}:${minutes}`;
  };

  // Extract unique time slots from all dates
  const timeSlots = useMemo(() => {
    if (!currentCoachData) return [];

    const allTimeSlots = new Set<string>();

    currentCoachData.availability.forEach(dayAvailability => {
      dayAvailability.slots.forEach(slot => {
        const startTime = new Date(slot.startTime);
        const endTime = new Date(slot.endTime);

        const startTimeStr = formatTime(startTime);
        const endTimeStr = formatTime(endTime);

        allTimeSlots.add(`${startTimeStr} - ${endTimeStr}`);
      });
    });

    return Array.from(allTimeSlots).sort();
  }, [currentCoachData]);

  const handleNavigatePrevious = () => {
    if (selectedCoachIndex > 0) {
      setSelectedCoachIndex(prev => prev - 1);
    }
  };

  const handleNavigateNext = () => {
    if (coachSlotsList && coachSlotsList.length > 0 && selectedCoachIndex < coachSlotsList[0].coaches.length - 1) {
      setSelectedCoachIndex(prev => prev + 1);
    }
  };

  // Toggle selection mode
  const toggleSelectionMode = () => {
    setSelectionMode(!selectionMode);
    if (selectionMode) {
      // Exiting selection mode - clear selections
      setSelectedSlots(new Set());
    }
  };

  // Find slot by date index and time slot
  const findSlotByIndices = (dateIndex: number, timeSlotStr: string): CoachSlot | null => {
    const date = displayedDates[dateIndex];
    if (!date || date.isHoliday) return null;

    console.log('Looking for slot:', timeSlotStr, 'on date index:', dateIndex);
    console.log('Available slots for this date:', date.slots.length);

    const slot = date.slots.find(s => {
      const startTime = new Date(s.startTime);
      const endTime = new Date(s.endTime);

      const startTimeStr = formatTime(startTime);
      const endTimeStr = formatTime(endTime);
      const formattedSlot = `${startTimeStr} - ${endTimeStr}`;

      console.log(
        'Comparing:',
        formattedSlot,
        'with',
        timeSlotStr,
        'isAvailable:',
        s.isAvailable,
        'code:',
        s.coachSlotCode
      );

      return formattedSlot === timeSlotStr;
    });

    console.log('Found slot:', slot ? slot.coachSlotCode : 'NULL');
    return slot || null;
  };

  // Toggle slot selection (for click)
  const toggleSlotSelection = (dateIndex: number, slotIndex: number) => {
    if (!selectionMode) return;

    const date = displayedDates[dateIndex];
    if (date.isHoliday) return;

    const timeSlot = timeSlots[slotIndex];
    const slot = findSlotByIndices(dateIndex, timeSlot);
    const coachSlotCode = slot?.coachSlotCode || `temp-${dateIndex}-${slotIndex}`;

    const newSelected = new Set(selectedSlots);

    if (newSelected.has(coachSlotCode)) {
      newSelected.delete(coachSlotCode);
    } else {
      newSelected.add(coachSlotCode);
    }

    setSelectedSlots(newSelected);
  };

  // Handle mouse down to start drag selection
  const handleSlotMouseDown = (dateIndex: number, slotIndex: number) => {
    if (!selectionMode) return;

    const date = displayedDates[dateIndex];
    if (date.isHoliday) return;

    setIsSelecting(true);
    selectionStartRef.current = { dateIndex, slotIndex };
  };

  // Handle mouse enter for drag selection
  const handleSlotMouseEnter = (dateIndex: number, slotIndex: number) => {
    if (!selectionMode || !isSelecting) return;

    const date = displayedDates[dateIndex];
    if (date.isHoliday) return;

    const timeSlot = timeSlots[slotIndex];
    const slot = findSlotByIndices(dateIndex, timeSlot);
    const coachSlotCode = slot?.coachSlotCode || `temp-${dateIndex}-${slotIndex}`;

    const newSelected = new Set(selectedSlots);
    newSelected.add(coachSlotCode);
    setSelectedSlots(newSelected);
  };

  // Handle mouse up to end selection
  const handleSlotMouseUp = useCallback(() => {
    if (selectionMode) {
      setIsSelecting(false);
      selectionStartRef.current = null;
    }
  }, [selectionMode]);

  // Add global mouse up listener
  useEffect(() => {
    if (selectionMode) {
      document.addEventListener('mouseup', handleSlotMouseUp);
      return () => {
        document.removeEventListener('mouseup', handleSlotMouseUp);
      };
    }
  }, [selectionMode, handleSlotMouseUp]);

  // Open modal for slot selection
  const handleSlotClick = (dateIndex: number, slotIndex: number, date: any, timeSlot: string) => {
    if (selectionMode || date.isHoliday) return; // Don't open modal in selection mode or for holidays

    const slot = findSlotByIndices(dateIndex, timeSlot);

    console.log('slot', dateIndex);
    console.log('timeSlot', timeSlot);

    // For slots that don't exist yet, we still want to allow user to set availability
    // Generate a temporary coachSlotCode if slot doesn't exist
    const coachSlotCode = slot?.coachSlotCode || `temp-${dateIndex}-${slotIndex}`;

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
      coachSlotCode,
    });
    setShowModal(true);
  };

  // Set slot availability (single slot)
  const setSlotAvailability = async (isAvailable: boolean) => {
    if (!selectedSlot) return;

    setIsUpdating(true);

    console.log('selectedSlot', selectedSlot);

    try {
      const action = isAvailable ? 'available' : 'disable';
      const resultAction = await dispatch(
        updateCoachSlots({
          slotCodes: [selectedSlot.coachSlotCode],
          action,
          reason: '',
        })
      );

      if (updateCoachSlots.fulfilled.match(resultAction)) {
        // Update local state on success
        setAvailability(prev => ({
          ...prev,
          [selectedSlot.coachSlotCode]: isAvailable,
        }));
        toast.success(`Slot marked as ${isAvailable ? 'available' : 'unavailable'}`);
        setShowModal(false);
        setSelectedSlot(null);
      } else {
        toast.error('Failed to update slot availability');
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to update slot availability');
    } finally {
      setIsUpdating(false);
    }
  };

  // Set multiple slots availability
  const setMultipleSlotAvailability = async (isAvailable: boolean) => {
    if (selectedSlots.size === 0) return;

    setIsUpdating(true);

    try {
      const action = isAvailable ? 'available' : 'disable';
      const slotCodesArray = Array.from(selectedSlots);

      const resultAction = await dispatch(
        updateCoachSlots({
          slotCodes: slotCodesArray,
          action,
          reason: '',
        })
      );

      if (updateCoachSlots.fulfilled.match(resultAction)) {
        // Update local state on success
        const updates: SlotAvailability = {};
        selectedSlots.forEach(coachSlotCode => {
          updates[coachSlotCode] = isAvailable;
        });

        setAvailability(prev => ({
          ...prev,
          ...updates,
        }));

        toast.success(`${selectedSlots.size} slot(s) marked as ${isAvailable ? 'available' : 'unavailable'}`);

        // Clear selection after applying
        setSelectedSlots(new Set());
        setSelectionMode(false);
      } else {
        toast.error('Failed to update slots availability');
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to update slots availability');
    } finally {
      setIsUpdating(false);
    }
  };

  // Clear all selections
  const clearSelections = () => {
    setSelectedSlots(new Set());
  };

  // Check if a slot is selected
  const isSlotSelected = (dateIndex: number, slotIndex: number): boolean => {
    const timeSlot = timeSlots[slotIndex];
    const slot = findSlotByIndices(dateIndex, timeSlot);
    const coachSlotCode = slot?.coachSlotCode || `temp-${dateIndex}-${slotIndex}`;
    return selectedSlots.has(coachSlotCode);
  };

  // Get slot availability status
  const getSlotStatus = (dateIndex: number, slotIndex: number): 'available' | 'unavailable' | 'not-set' | 'holiday' => {
    const date = displayedDates[dateIndex];
    if (date.isHoliday) return 'holiday';

    const timeSlot = timeSlots[slotIndex];
    const slot = findSlotByIndices(dateIndex, timeSlot);
    if (!slot) return 'not-set';

    // Check availability state first (this is updated by user actions)
    const value = availability[slot.coachSlotCode];

    // If value is in state, use it. Otherwise fall back to slot's isAvailable from API
    if (value !== undefined) {
      return value ? 'available' : 'unavailable';
    }

    // Fall back to the original slot data from API
    return slot.isAvailable ? 'available' : 'unavailable';
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

  // Show loading state
  if (isLoading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center rounded-[10px] bg-white">
        <div className="flex flex-col items-center justify-center">
          <svg
            className="h-12 w-12 animate-spin text-[#21295A]"
            fill="none"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path
              className="opacity-75"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              fill="currentColor"
            ></path>
          </svg>
          <p className="mt-4 text-[16px] font-medium text-[#64748B]">Loading coach schedule...</p>
        </div>
      </div>
    );
  }

  // Show empty state
  if (!coachSlotsList || coachSlotsList.length === 0 || !currentCoachData) {
    return (
      <div className="flex min-h-[400px] items-center justify-center rounded-[10px] bg-white">
        <div className="text-center">
          <p className="text-[16px] font-medium text-[#64748B]">No coach schedule data available</p>
          <p className="mt-2 text-[14px] text-[#94A3B8]">Please check back later</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Loading Overlay */}
      {isUpdating && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black bg-opacity-50">
          <div className="rounded-[10px] bg-white p-6 shadow-lg">
            <div className="flex items-center gap-3">
              <svg
                className="h-6 w-6 animate-spin text-[#21295A]"
                fill="none"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path
                  className="opacity-75"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  fill="currentColor"
                ></path>
              </svg>
              <span className="text-[14px] font-medium text-[#21295A]">Updating slots...</span>
            </div>
          </div>
        </div>
      )}

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
                className="rounded-[10px] border-2 border-[#10B981] bg-[#10B981] px-6 py-3 text-[15px] font-semibold text-white transition hover:bg-[#059669]"
                type="button"
                onClick={() => setSlotAvailability(true)}
              >
                ✓ Mark as Available
              </button>
              <button
                className="rounded-[10px] border-2 border-[#EF4444] bg-[#EF4444] px-6 py-3 text-[15px] font-semibold text-white transition hover:bg-[#DC2626]"
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
                {/* Navigation and Multi-Select Toggle */}
                <div className="flex items-center justify-between gap-3 border-b border-[#B3DADA] bg-white px-3 py-3">
                  {coachSlotsList && coachSlotsList[0].coaches.length > 1 && (
                    <div className="flex items-center gap-2">
                      <button
                        className="rounded-[8px] border border-[#E2E8F0] p-2.5 hover:bg-[#F8FAFC] active:bg-[#E2E8F0] disabled:cursor-not-allowed disabled:opacity-40"
                        type="button"
                        onClick={handleNavigatePrevious}
                        disabled={selectedCoachIndex === 0}
                      >
                        <img alt="previous coach" className="h-5 w-5" src={'/assets/svg/arrow_left.svg'} />
                      </button>
                      <button
                        className="rounded-[8px] border border-[#E2E8F0] p-2.5 hover:bg-[#F8FAFC] active:bg-[#E2E8F0] disabled:cursor-not-allowed disabled:opacity-40"
                        type="button"
                        onClick={handleNavigateNext}
                        disabled={selectedCoachIndex === coachSlotsList[0].coaches.length - 1}
                      >
                        <img alt="next coach" className="h-5 w-5" src={'/assets/svg/arrow_right.svg'} />
                      </button>
                    </div>
                  )}

                  <button
                    className={`rounded-[8px] px-4 py-2.5 text-[13px] font-medium transition ${
                      selectionMode
                        ? 'bg-[#21295A] text-white active:bg-[#1a1f42]'
                        : 'border border-[#E2E8F0] bg-white text-[#21295A] active:bg-[#F1F5F9]'
                    }`}
                    type="button"
                    onClick={toggleSelectionMode}
                  >
                    {selectionMode ? 'Done' : 'Multi-Select'}
                  </button>
                </div>

                {/* Selection Actions Bar - Only show when slots are selected */}
                {selectionMode && selectedSlots.size > 0 && (
                  <div className="flex flex-col gap-2 border-b border-[#B3DADA] bg-[#F8FAFC] px-3 py-3">
                    <div className="text-center text-[13px] font-medium text-[#64748B]">
                      {selectedSlots.size} slot{selectedSlots.size > 1 ? 's' : ''} selected
                    </div>
                    <div className="flex gap-2">
                      <button
                        className="flex-1 rounded-[8px] bg-[#10B981] px-2 py-2.5 text-[12px] font-semibold text-white active:bg-[#059669]"
                        type="button"
                        onClick={() => setMultipleSlotAvailability(true)}
                      >
                        ✓ Available
                      </button>
                      <button
                        className="flex-1 rounded-[8px] border-2 border-[#EF4444] bg-[#EF4444] px-2 py-2.5 text-[12px] font-semibold text-white active:bg-[#DC2626]"
                        type="button"
                        onClick={() => setMultipleSlotAvailability(false)}
                      >
                        ✕ Unavailable
                      </button>
                    </div>
                  </div>
                )}

                {/* Instruction text when in selection mode but no slots selected */}
                {selectionMode && selectedSlots.size === 0 && (
                  <div className="border-b border-[#B3DADA] bg-[#F8FAFC] px-3 py-2 text-center text-[12px] text-[#64748B]">
                    Tap slots to select them
                  </div>
                )}
                <div className="grid bg-white" style={gridTemplateColumnsMobile}>
                  <div className="sticky left-0 z-40 flex min-h-[65px] min-w-[100px] items-center justify-center border border-[#B3DADA] bg-[#fff] px-2 py-3 text-[12px] font-semibold text-[#21295A] shadow-[2px_0_4px_rgba(0,0,0,0.05)]">
                    Time Slot
                  </div>
                  {displayedDates.map((date, dateIdx) => (
                    <div
                      key={dateIdx}
                      className="relative flex min-h-[65px] w-full min-w-[140px] flex-col items-center justify-center border border-l-0 border-[#B3DADA] bg-[#fff] px-2 py-3 text-center"
                    >
                      {date.isToday && (
                        <div className="absolute left-2 top-2 h-2 w-2 rounded-full bg-[#21295A]"></div>
                      )}
                      <div className="flex flex-col items-center justify-center gap-1">
                        <span className="text-[10px] font-medium text-[#7A7F9C]">{date.weekday}</span>
                        <span className="text-[12px] font-semibold text-[#21295A]">{date.day}</span>
                        <span className="text-[10px] font-medium text-[#7A7F9C]">
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

                      // If it's a holiday, show holiday cell
                      if (date.isHoliday) {
                        return (
                          <div
                            key={`${slot}-${dateIdx}`}
                            className={composeClasses(
                              'flex min-h-[70px] min-w-[140px] items-center justify-center border border-[#B3DADA] bg-gradient-to-br from-[#FEF3C7] to-[#FDE68A] text-[11px] font-medium',
                              slotIdx !== 0 && 'border-t-0',
                              dateIdx !== 0 && 'border-l-0'
                            )}
                          >
                            <div className="flex h-full w-full items-center justify-center px-2 py-3 text-center text-[10px] font-semibold leading-tight text-[#92400E]">
                              Holiday
                            </div>
                          </div>
                        );
                      }

                      return (
                        <button
                          key={`${slot}-${dateIdx}`}
                          className={composeClasses(
                            'flex min-h-[70px] min-w-[140px] items-center justify-center border border-[#B3DADA] text-[11px] font-medium transition-all duration-200 active:scale-95',
                            slotIdx !== 0 && 'border-t-0',
                            dateIdx !== 0 && 'border-l-0',
                            isSelected
                              ? 'bg-[#21295A] ring-2 ring-inset ring-[#1a1f42]'
                              : 'bg-[#F1F5F9] active:bg-[#E2E8F0]',
                            selectionMode && 'cursor-pointer select-none'
                          )}
                          type="button"
                          onClick={() => {
                            if (selectionMode) {
                              toggleSlotSelection(dateIdx, slotIdx);
                            } else {
                              handleSlotClick(dateIdx, slotIdx, date, slot);
                            }
                          }}
                          onMouseDown={e => {
                            if (selectionMode && !('ontouchstart' in window)) {
                              e.preventDefault();
                              handleSlotMouseDown(dateIdx, slotIdx);
                            }
                          }}
                          onMouseEnter={() => {
                            if (selectionMode && isSelecting && !('ontouchstart' in window)) {
                              handleSlotMouseEnter(dateIdx, slotIdx);
                            }
                          }}
                          onMouseUp={() => {
                            if (selectionMode && !('ontouchstart' in window)) {
                              setIsSelecting(false);
                            }
                          }}
                        >
                          <div className="flex h-full w-full flex-col items-center justify-center gap-1 px-2 py-3 text-center">
                            {isSelected ? (
                              <>
                                <span className="text-[18px] text-white">●</span>
                                <span className="text-[9px] font-medium text-white">Selected</span>
                              </>
                            ) : slotStatus === 'available' ? (
                              <>
                                <span className="text-[18px] text-[#10B981]">✓</span>
                                <span className="text-[9px] font-semibold text-[#10B981]">Available</span>
                              </>
                            ) : slotStatus === 'unavailable' ? (
                              <>
                                <span className="text-[18px] text-[#EF4444]">✕</span>
                                <span className="text-[9px] font-semibold text-[#EF4444]">Unavailable</span>
                              </>
                            ) : (
                              <span className="text-[9px] font-medium text-[#94A3B8]">Not Set</span>
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
                            className="rounded-[8px] bg-[#10B981] px-3 py-2 text-[13px] font-semibold text-white transition hover:bg-[#059669]"
                            type="button"
                            onClick={() => setMultipleSlotAvailability(true)}
                          >
                            ✓ Available
                          </button>
                          <button
                            className="rounded-[8px] bg-[#EF4444] px-3 py-2 text-[13px] font-semibold text-white transition hover:bg-[#DC2626]"
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

                  {coachSlotsList && coachSlotsList[0].coaches.length > 1 && (
                    <div className="ml-auto flex items-center gap-2">
                      <button
                        className="rounded-[8px] border border-[#E2E8F0] p-2.5 hover:bg-[#F8FAFC] disabled:cursor-not-allowed disabled:opacity-40"
                        disabled={selectedCoachIndex === 0}
                        type="button"
                        onClick={handleNavigatePrevious}
                      >
                        <img alt="previous coach" className="h-5 w-5" src={'/assets/svg/arrow_left.svg'} />
                      </button>
                      <button
                        className="rounded-[8px] border border-[#E2E8F0] p-2.5 hover:bg-[#F8FAFC] disabled:cursor-not-allowed disabled:opacity-40"
                        disabled={selectedCoachIndex === coachSlotsList[0].coaches.length - 1}
                        type="button"
                        onClick={handleNavigateNext}
                      >
                        <img alt="next coach" className="h-5 w-5" src={'/assets/svg/arrow_right.svg'} />
                      </button>
                    </div>
                  )}
                </div>
                <div className="grid bg-white" style={gridTemplateColumns}>
                  <div className="sticky left-0 z-40 flex min-h-[70px] min-w-[140px] items-center justify-center border border-[#B3DADA] bg-[#fff] px-5 py-4 text-[15px] font-semibold text-[#21295A] shadow-[2px_0_4px_rgba(0,0,0,0.05)]">
                    Time Slot
                  </div>
                  {displayedDates.map((date, dateIdx) => (
                    <div
                      key={dateIdx}
                      className="relative flex min-h-[70px] w-full min-w-[180px] flex-col items-center justify-center border border-l-0 border-[#B3DADA] bg-[#fff] px-4 py-4 text-center"
                    >
                      {date.isToday && (
                        <div className="absolute left-3 top-3 h-2.5 w-2.5 rounded-full bg-[#21295A]"></div>
                      )}
                      <div className="flex flex-col items-center justify-center gap-2">
                        <span className="text-[12px] font-medium text-[#7A7F9C]">{date.weekday}</span>
                        <span className="text-[15px] font-semibold text-[#21295A]">{date.day}</span>
                        <span className="text-[13px] font-medium text-[#7A7F9C]">
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

                      // If it's a holiday, show holiday cell
                      if (date.isHoliday) {
                        return (
                          <div
                            key={`${slot}-${dateIdx}`}
                            className={composeClasses(
                              'flex min-h-[70px] min-w-[180px] items-center justify-center border border-[#B3DADA] bg-gradient-to-br from-[#FEF3C7] to-[#FDE68A] text-[14px] font-medium',
                              slotIdx !== 0 && 'border-t-0',
                              dateIdx !== 0 && 'border-l-0'
                            )}
                          >
                            <div className="flex h-full w-full items-center justify-center p-4 text-center text-[12px] font-semibold leading-tight text-[#92400E]">
                              Holiday
                            </div>
                          </div>
                        );
                      }

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
                          onClick={() => {
                            if (selectionMode) {
                              toggleSlotSelection(dateIdx, slotIdx);
                            } else {
                              handleSlotClick(dateIdx, slotIdx, date, slot);
                            }
                          }}
                          onMouseDown={e => {
                            if (selectionMode) {
                              e.preventDefault();
                              handleSlotMouseDown(dateIdx, slotIdx);
                            }
                          }}
                          onMouseEnter={() => {
                            if (selectionMode && isSelecting) {
                              handleSlotMouseEnter(dateIdx, slotIdx);
                            }
                          }}
                          onMouseUp={() => {
                            if (selectionMode) {
                              setIsSelecting(false);
                            }
                          }}
                        >
                          <div className="flex h-full w-full flex-col items-center justify-center gap-1 p-4 text-center">
                            {isSelected ? (
                              <>
                                <span className="text-[20px] text-white">●</span>
                                <span className="text-[11px] font-medium text-white">Selected</span>
                              </>
                            ) : slotStatus === 'available' ? (
                              <>
                                <span className="text-[24px] text-[#10B981]">✓</span>
                                <span className="text-[12px] font-semibold text-[#10B981]">Available</span>
                              </>
                            ) : slotStatus === 'unavailable' ? (
                              <>
                                <span className="text-[24px] text-[#EF4444]">✕</span>
                                <span className="text-[12px] font-semibold text-[#EF4444]">Unavailable</span>
                              </>
                            ) : (
                              <span className="text-[12px] font-medium text-[#94A3B8]">Not Set</span>
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
          <div className="flex h-6 w-6 items-center justify-center rounded bg-[#D1FAE5]">
            <span className="text-[14px] text-[#10B981]">✓</span>
          </div>
          <span className="text-[13px] font-medium text-[#1E293B] desktop:text-[14px]">Available</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex h-6 w-6 items-center justify-center rounded bg-[#FEE2E2]">
            <span className="text-[14px] text-[#EF4444]">✕</span>
          </div>
          <span className="text-[13px] font-medium text-[#1E293B] desktop:text-[14px]">Unavailable</span>
        </div>
        {/* <div className="flex items-center gap-2">
          <div className="flex h-6 w-6 items-center justify-center rounded bg-[#F1F5F9]">
            <span className="text-[10px] font-medium text-[#94A3B8]">Not Set</span>
          </div>
          <span className="text-[13px] font-medium text-[#1E293B] desktop:text-[14px]">Not Set</span>
        </div> */}
        <div className="flex items-center gap-2">
          <div className="h-6 w-6 rounded bg-gradient-to-br from-[#FEF3C7] to-[#FDE68A]"></div>
          <span className="text-[13px] font-medium text-[#1E293B] desktop:text-[14px]">Holiday</span>
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
