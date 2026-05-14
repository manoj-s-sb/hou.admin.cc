import { Fragment, useState, useMemo, useEffect, useRef, useCallback } from 'react';

import { toast } from 'react-hot-toast';
import { useDispatch } from 'react-redux';

import Button from '../../../components/Button';
import LoaderComponent, { LoaderSpinner } from '../../../components/Loader';
import { ACCESS_SCOPES } from '../../../rbac';
import { updateCoachSlots } from '../../../store/slots/api';
import { CoachSlotsResponse, Coach, CoachSlot } from '../../../store/slots/types';
import { AppDispatch } from '../../../store/store';
import { getTodayDateInChicago } from '../../../utils/dateUtils';

interface SlotAvailability {
  [key: string]: boolean | undefined;
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

const cx = (...classes: Array<string | false | null | undefined>) => classes.filter(Boolean).join(' ');

const CoachScheduleGrid: React.FC<{
  coachSlotsList: CoachSlotsResponse[];
  isLoading: boolean;
  onDateRangeChange: (startDate: string, endDate: string) => void;
}> = ({ coachSlotsList, isLoading, onDateRangeChange }) => {
  const dispatch = useDispatch<AppDispatch>();

  const [availability, setAvailability] = useState<SlotAvailability>({});
  const [selectedSlot, setSelectedSlot] = useState<SelectedSlot | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [selectedCoachIndex] = useState(0);

  const [isSelecting, setIsSelecting] = useState(false);
  const [selectedSlots, setSelectedSlots] = useState<Set<string>>(new Set());
  const selectedSlotsRef = useRef<Set<string>>(new Set());
  const [selectionMode, setSelectionMode] = useState(false);
  const selectionStartRef = useRef<SlotKey | null>(null);
  const startCellSelectedRef = useRef(false);
  const gestureCellsRef = useRef<Set<string>>(new Set());
  const [selectionTypeRestriction, setSelectionTypeRestriction] = useState<'available' | 'unavailable' | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    selectedSlotsRef.current = selectedSlots;
  }, [selectedSlots]);

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

  const currentCoachData: Coach | null = useMemo(() => {
    if (!coachSlotsList || coachSlotsList.length === 0) return null;
    return coachSlotsList[0].coaches[selectedCoachIndex] || null;
  }, [coachSlotsList, selectedCoachIndex]);

  const getWeekdayInChicago = (date: Date): string =>
    date.toLocaleDateString('en-US', { weekday: 'short', timeZone: 'America/Chicago' }).toUpperCase();

  const getTodayInChicago = (): { year: number; month: number; day: number } => {
    const now = new Date();
    const dateFormatter = new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/Chicago',
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
    });
    const parts = dateFormatter.formatToParts(now);
    return {
      year: parseInt(parts.find(p => p.type === 'year')?.value || '0'),
      month: parseInt(parts.find(p => p.type === 'month')?.value || '0') - 1,
      day: parseInt(parts.find(p => p.type === 'day')?.value || '0'),
    };
  };

  const getDateComponentsInChicago = (dateString: string): { year: number; month: number; day: number } => {
    const [year, month, day] = dateString.split('-').map(Number);
    return { year, month: month - 1, day };
  };

  const createDateForChicagoWeekday = (year: number, month: number, day: number): Date =>
    new Date(Date.UTC(year, month, day, 18, 0, 0));

  const displayedDates = useMemo(() => {
    if (!currentCoachData) return [];
    const todayChicago = getTodayInChicago();
    return currentCoachData.availability.map(dayAvailability => {
      const dateComponents = getDateComponentsInChicago(dayAvailability.date);
      const dateForWeekday = createDateForChicagoWeekday(dateComponents.year, dateComponents.month, dateComponents.day);
      const localDate = new Date(dateComponents.year, dateComponents.month, dateComponents.day);
      const isToday =
        dateComponents.year === todayChicago.year &&
        dateComponents.month === todayChicago.month &&
        dateComponents.day === todayChicago.day;
      return {
        day: dateComponents.day,
        month: dateComponents.month,
        year: dateComponents.year,
        fullDate: localDate,
        dateString: dayAvailability.date,
        weekday: getWeekdayInChicago(dateForWeekday),
        isToday,
        isHoliday: dayAvailability.isHoliday,
        slots: dayAvailability.slots,
      };
    });
  }, [currentCoachData]);

  const formatTime = (timeString: string): string => {
    const timeMatch = timeString.match(/T(\d{2}):(\d{2})/);
    if (timeMatch) return `${timeMatch[1]}:${timeMatch[2]}`;
    const date = new Date(timeString);
    return `${date.getUTCHours().toString().padStart(2, '0')}:${date.getUTCMinutes().toString().padStart(2, '0')}`;
  };

  const timeSlots = useMemo(() => {
    if (!currentCoachData) return [];
    const allTimeSlots = new Set<string>();
    currentCoachData.availability.forEach(dayAvailability => {
      dayAvailability.slots.forEach(slot => {
        allTimeSlots.add(`${formatTime(slot.startTime)} - ${formatTime(slot.endTime)}`);
      });
    });
    return Array.from(allTimeSlots).sort();
  }, [currentCoachData]);

  const formatBookingType = (bookingType: string): string =>
    bookingType
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, str => str.toUpperCase())
      .trim()
      .replace(/Booking$/i, 'Booked');

  const formatDateOnly = (date: Date): string => {
    const dateFormatter = new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/Chicago',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    const parts = dateFormatter.formatToParts(date);
    return `${parts.find(p => p.type === 'year')?.value}-${parts.find(p => p.type === 'month')?.value}-${parts.find(p => p.type === 'day')?.value}`;
  };

  const addDaysInChicago = (dateString: string, days: number): string => {
    const dc = getDateComponentsInChicago(dateString);
    const date = new Date(Date.UTC(dc.year, dc.month, dc.day, 18, 0, 0));
    date.setUTCDate(date.getUTCDate() + days);
    return formatDateOnly(date);
  };

  const handleNavigatePrevious = () => {
    if (displayedDates.length === 0) return;
    const newStartDate = addDaysInChicago(displayedDates[0].dateString, -8);
    onDateRangeChange(newStartDate, addDaysInChicago(newStartDate, 7));
  };

  const handleNavigateNext = () => {
    if (displayedDates.length === 0) return;
    const newStartDate = addDaysInChicago(displayedDates[0].dateString, 8);
    onDateRangeChange(newStartDate, addDaysInChicago(newStartDate, 7));
  };

  const handleNavigateToday = () => {
    const todayStr = getTodayDateInChicago();
    onDateRangeChange(todayStr, addDaysInChicago(todayStr, 7));
  };

  const toggleSelectionMode = () => {
    setSelectionMode(!selectionMode);
    if (selectionMode) {
      const emptySet = new Set<string>();
      setSelectedSlots(emptySet);
      selectedSlotsRef.current = emptySet;
      setSelectionTypeRestriction(null);
    }
  };

  const findSlotByIndices = (dateIndex: number, timeSlotStr: string): CoachSlot | null => {
    const date = displayedDates[dateIndex];
    if (!date || date.isHoliday) return null;
    return date.slots.find(s => `${formatTime(s.startTime)} - ${formatTime(s.endTime)}` === timeSlotStr) || null;
  };

  const getSlotStatus = (
    dateIndex: number,
    slotIndex: number
  ): 'available' | 'unavailable' | 'not-set' | 'holiday' | 'booked' => {
    const date = displayedDates[dateIndex];
    if (date.isHoliday) return 'holiday';
    const timeSlot = timeSlots[slotIndex];
    const slot = findSlotByIndices(dateIndex, timeSlot);
    if (!slot) return 'not-set';
    if (slot.bookingType && slot.bookingCode) return 'booked';
    const value = availability[slot.coachSlotCode];
    if (value !== undefined) return value ? 'available' : 'unavailable';
    return slot.isAvailable ? 'available' : 'unavailable';
  };

  const toggleSlotSelection = (dateIndex: number, slotIndex: number) => {
    if (!selectionMode) return;
    const date = displayedDates[dateIndex];
    if (date.isHoliday) return;
    const timeSlot = timeSlots[slotIndex];
    const slot = findSlotByIndices(dateIndex, timeSlot);
    const coachSlotCode = slot?.coachSlotCode || `temp-${dateIndex}-${slotIndex}`;
    const slotStatus = getSlotStatus(dateIndex, slotIndex);
    if (slotStatus === 'booked') return;
    if (selectionTypeRestriction && slotStatus !== 'not-set' && slotStatus !== selectionTypeRestriction) return;
    setSelectedSlots(prev => {
      const newSelected = new Set(prev);
      if (newSelected.has(coachSlotCode)) {
        newSelected.delete(coachSlotCode);
        if (newSelected.size === 0) setSelectionTypeRestriction(null);
        return newSelected;
      }
      if (newSelected.size === 0 && (slotStatus === 'available' || slotStatus === 'unavailable')) {
        setSelectionTypeRestriction(slotStatus as 'available' | 'unavailable');
      }
      newSelected.add(coachSlotCode);
      return newSelected;
    });
  };

  const handleSlotMouseDown = (dateIndex: number, slotIndex: number) => {
    if (!selectionMode) return;
    const date = displayedDates[dateIndex];
    if (date.isHoliday) return;
    const timeSlot = timeSlots[slotIndex];
    const slot = findSlotByIndices(dateIndex, timeSlot);
    const coachSlotCode = slot?.coachSlotCode || `temp-${dateIndex}-${slotIndex}`;
    const slotStatus = getSlotStatus(dateIndex, slotIndex);
    if (slotStatus === 'booked') return;
    startCellSelectedRef.current = selectedSlotsRef.current.has(coachSlotCode);
    gestureCellsRef.current = new Set([coachSlotCode]);
    setIsSelecting(true);
    selectionStartRef.current = { dateIndex, slotIndex };
    if (selectionTypeRestriction && slotStatus !== 'not-set' && slotStatus !== selectionTypeRestriction) return;
    setSelectedSlots(prev => {
      const newSelected = new Set(prev);
      if (newSelected.size === 0 && (slotStatus === 'available' || slotStatus === 'unavailable')) {
        setSelectionTypeRestriction(slotStatus as 'available' | 'unavailable');
      }
      newSelected.add(coachSlotCode);
      return newSelected;
    });
  };

  const handleSlotMouseEnter = (dateIndex: number, slotIndex: number) => {
    if (!selectionMode || !isSelecting) return;
    const date = displayedDates[dateIndex];
    if (date.isHoliday) return;
    const timeSlot = timeSlots[slotIndex];
    const slot = findSlotByIndices(dateIndex, timeSlot);
    const coachSlotCode = slot?.coachSlotCode || `temp-${dateIndex}-${slotIndex}`;
    const slotStatus = getSlotStatus(dateIndex, slotIndex);
    if (slotStatus === 'booked') return;
    if (selectionTypeRestriction && slotStatus !== 'not-set' && slotStatus !== selectionTypeRestriction) return;
    gestureCellsRef.current.add(coachSlotCode);
    setSelectedSlots(prev => {
      const newSelected = new Set(prev);
      if (newSelected.size === 0 && (slotStatus === 'available' || slotStatus === 'unavailable')) {
        setSelectionTypeRestriction(slotStatus as 'available' | 'unavailable');
      }
      newSelected.add(coachSlotCode);
      return newSelected;
    });
  };

  const handleSlotMouseUpOnCell = (dateIndex: number, slotIndex: number) => {
    if (!selectionMode || !isSelecting) return;
    const start = selectionStartRef.current;
    const sameCell = start?.dateIndex === dateIndex && start?.slotIndex === slotIndex;
    const gestureSize = gestureCellsRef.current?.size ?? 0;
    if (sameCell && gestureSize === 1 && startCellSelectedRef.current) {
      toggleSlotSelection(dateIndex, slotIndex);
    }
    setIsSelecting(false);
    selectionStartRef.current = null;
    gestureCellsRef.current = new Set();
  };

  const handleSlotMouseUp = useCallback(() => {
    if (selectionMode) {
      setIsSelecting(false);
      selectionStartRef.current = null;
      gestureCellsRef.current = new Set();
    }
  }, [selectionMode]);

  useEffect(() => {
    if (selectionMode) {
      document.addEventListener('mouseup', handleSlotMouseUp);
      return () => document.removeEventListener('mouseup', handleSlotMouseUp);
    }
  }, [selectionMode, handleSlotMouseUp]);

  const handleSlotClick = (dateIndex: number, slotIndex: number, date: any, timeSlot: string) => {
    if (selectionMode || date.isHoliday) return;
    const slot = findSlotByIndices(dateIndex, timeSlot);
    const slotStatus = getSlotStatus(dateIndex, slotIndex);
    if (slotStatus === 'booked') return;
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

  const isSlotSelected = (dateIndex: number, slotIndex: number): boolean => {
    const timeSlot = timeSlots[slotIndex];
    const slot = findSlotByIndices(dateIndex, timeSlot);
    const coachSlotCode = slot?.coachSlotCode || `temp-${dateIndex}-${slotIndex}`;
    return selectedSlots.has(coachSlotCode);
  };

  const canSelectSlot = (dateIndex: number, slotIndex: number): boolean => {
    if (!selectionMode) return true;
    const slotStatus = getSlotStatus(dateIndex, slotIndex);
    if (slotStatus === 'holiday' || slotStatus === 'booked') return false;
    if (!selectionTypeRestriction) return true;
    if (slotStatus === 'not-set') return true;
    return slotStatus === selectionTypeRestriction;
  };

  const setSlotAvailability = async (isAvailable: boolean) => {
    if (!selectedSlot) return;
    setIsUpdating(true);
    try {
      const resultAction = await dispatch(
        updateCoachSlots({
          slotCodes: [selectedSlot.coachSlotCode],
          action: isAvailable ? 'available' : 'disable',
          reason: '',
        })
      );
      if (updateCoachSlots.fulfilled.match(resultAction)) {
        setAvailability(prev => ({ ...prev, [selectedSlot.coachSlotCode]: isAvailable }));
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

  const setMultipleSlotAvailability = async (isAvailable: boolean) => {
    if (selectedSlots.size === 0) return;
    setIsUpdating(true);
    try {
      const resultAction = await dispatch(
        updateCoachSlots({
          slotCodes: Array.from(selectedSlots),
          action: isAvailable ? 'available' : 'disable',
          reason: '',
        })
      );
      if (updateCoachSlots.fulfilled.match(resultAction)) {
        const updates: SlotAvailability = {};
        selectedSlots.forEach(code => {
          updates[code] = isAvailable;
        });
        setAvailability(prev => ({ ...prev, ...updates }));
        toast.success(`${selectedSlots.size} slot(s) marked as ${isAvailable ? 'available' : 'unavailable'}`);
        const emptySet = new Set<string>();
        setSelectedSlots(emptySet);
        selectedSlotsRef.current = emptySet;
        setSelectionTypeRestriction(null);
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

  const clearSelections = () => {
    const emptySet = new Set<string>();
    setSelectedSlots(emptySet);
    selectedSlotsRef.current = emptySet;
    setSelectionTypeRestriction(null);
  };

  const closeModal = () => {
    setShowModal(false);
    setSelectedSlot(null);
  };

  const gridTemplateColumns = { gridTemplateColumns: `130px repeat(${displayedDates.length}, minmax(140px, 1fr))` };
  const gridTemplateColumnsMobile = {
    gridTemplateColumns: `95px repeat(${displayedDates.length}, minmax(115px, 1fr))`,
  };

  if (isLoading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center rounded-xl border border-gray-100 bg-white">
        <LoaderComponent
          message="Loading coach schedule..."
          size="lg"
          spinnerClassName="text-[#21295A]"
          variant="inline"
        />
      </div>
    );
  }

  if (!coachSlotsList || coachSlotsList.length === 0 || !currentCoachData) {
    return (
      <div className="flex min-h-[400px] items-center justify-center rounded-xl border border-gray-100 bg-white">
        <div className="text-center">
          <p className="text-[15px] font-semibold text-gray-500">No coach schedule available</p>
          <p className="mt-1 text-[13px] text-gray-400">Please check back later</p>
        </div>
      </div>
    );
  }

  // Slot cell renderer
  const renderCell = (dateIdx: number, slotIdx: number, date: any, slot: string, isMobile: boolean) => {
    const slotStatus = getSlotStatus(dateIdx, slotIdx);
    const isSelected = isSlotSelected(dateIdx, slotIdx);
    const canSelect = canSelectSlot(dateIdx, slotIdx);
    const minSize = isMobile ? 'min-h-[56px] min-w-[115px]' : 'min-h-[60px] min-w-[140px]';

    if (date.isHoliday) {
      return (
        <div
          key={`${slot}-${dateIdx}`}
          className={cx(
            `flex ${minSize} items-center justify-center border-b border-r border-gray-200 bg-amber-50`,
            slotIdx === 0 && 'border-t-0',
            dateIdx === 0 && 'border-l-0'
          )}
        >
          <span className="text-[11px] font-semibold text-amber-600">Holiday</span>
        </div>
      );
    }

    if (slotStatus === 'booked') {
      const currentSlotData = findSlotByIndices(dateIdx, slot);
      const label = currentSlotData?.bookingType ? formatBookingType(currentSlotData.bookingType) : 'Booked';
      return (
        <div
          key={`${slot}-${dateIdx}`}
          className={cx(
            `flex ${minSize} cursor-not-allowed items-center justify-center border-b border-r border-gray-200 bg-slate-50`,
            slotIdx === 0 && 'border-t-0',
            dateIdx === 0 && 'border-l-0'
          )}
        >
          <span className="rounded-md bg-slate-200 px-2 py-0.5 text-[10px] font-semibold text-slate-500">{label}</span>
        </div>
      );
    }

    return (
      <button
        key={`${slot}-${dateIdx}`}
        className={cx(
          `group flex ${minSize} items-center justify-center border-b border-r border-gray-200 transition-all`,
          slotIdx === 0 && 'border-t-0',
          dateIdx === 0 && 'border-l-0',
          isSelected
            ? 'bg-[#21295A]'
            : !canSelect && selectionMode
              ? 'cursor-not-allowed bg-gray-50 opacity-40'
              : slotStatus === 'available'
                ? 'bg-green-50 hover:bg-green-100'
                : slotStatus === 'unavailable'
                  ? 'bg-red-50 hover:bg-red-100'
                  : 'bg-white hover:bg-gray-50',
          selectionMode && canSelect && 'cursor-pointer select-none'
        )}
        disabled={selectionMode && !canSelect && !isSelected}
        type="button"
        onClick={() => {
          if (!selectionMode) handleSlotClick(dateIdx, slotIdx, date, slot);
        }}
        onMouseDown={e => {
          if (selectionMode && !('ontouchstart' in window)) {
            e.preventDefault();
            handleSlotMouseDown(dateIdx, slotIdx);
          }
        }}
        onMouseEnter={() => {
          if (selectionMode && isSelecting && !('ontouchstart' in window)) handleSlotMouseEnter(dateIdx, slotIdx);
        }}
        onMouseUp={() => {
          if (selectionMode && !('ontouchstart' in window)) handleSlotMouseUpOnCell(dateIdx, slotIdx);
        }}
      >
        {isSelected ? (
          <div className="flex flex-col items-center gap-0.5">
            <svg className="h-3.5 w-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} />
            </svg>
            <span className="text-[10px] font-semibold text-white">Selected</span>
          </div>
        ) : slotStatus === 'available' ? (
          <div className="flex flex-col items-center gap-0.5">
            <svg className="h-3.5 w-3.5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} />
            </svg>
            <span className="text-[10px] font-semibold text-green-600">Available</span>
          </div>
        ) : slotStatus === 'unavailable' ? (
          <div className="flex flex-col items-center gap-0.5">
            <svg className="h-3.5 w-3.5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path d="M6 18L18 6M6 6l12 12" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} />
            </svg>
            <span className="text-[10px] font-medium text-red-400">Unavailable</span>
          </div>
        ) : (
          <span className="text-[11px] text-gray-300">—</span>
        )}
      </button>
    );
  };

  // Date column header
  const renderDateHeader = (date: any, dateIdx: number, isMobile: boolean) => (
    <div
      key={dateIdx}
      className={cx(
        'flex w-full flex-col items-center justify-center border-b border-r border-gray-200 py-2 text-center',
        isMobile ? 'min-h-[56px] min-w-[115px]' : 'min-h-[60px] min-w-[140px]',
        date.isToday ? 'border-l-2 border-l-[#21295A] bg-[#21295A]/5' : 'bg-gray-50'
      )}
    >
      <span className="text-[9px] font-bold uppercase tracking-wider text-gray-400">{date.weekday}</span>
      <div className="flex items-center gap-1">
        <span
          className={cx(
            'font-bold',
            isMobile ? 'text-[15px]' : 'text-[17px]',
            date.isToday ? 'text-[#21295A]' : 'text-gray-700'
          )}
        >
          {date.day}
        </span>
        {date.isToday && (
          <span className="rounded-full bg-[#21295A] px-1.5 py-0.5 text-[8px] font-bold text-white">Today</span>
        )}
      </div>
      <span className="text-[9px] text-gray-400">{date.fullDate.toLocaleDateString('en-US', { month: 'short' })}</span>
    </div>
  );

  return (
    <div className="flex flex-col gap-3">
      {/* Updating overlay */}
      {isUpdating && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50">
          <div className="flex items-center gap-3 rounded-xl bg-white px-5 py-4 shadow-xl">
            <LoaderSpinner className="text-[#21295A]" size="md" />
            <span className="text-[13px] font-semibold text-[#21295A]">Updating slots…</span>
          </div>
        </div>
      )}

      {/* Availability Modal */}
      {showModal &&
        selectedSlot &&
        (() => {
          const currentSlotStatus = getSlotStatus(selectedSlot.dateIndex, selectedSlot.slotIndex);
          const isCurrentlyAvailable = currentSlotStatus === 'available';
          const isCurrentlyUnavailable = currentSlotStatus === 'unavailable';
          return (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
              <div className="w-full max-w-sm overflow-hidden rounded-2xl bg-white shadow-2xl">
                <div className="border-b border-gray-100 px-5 py-4">
                  <h3 className="text-[15px] font-bold text-[#21295A]">Set Availability</h3>
                </div>
                <div className="px-5 py-4">
                  <p className="text-[12px] text-gray-500">
                    <span className="font-semibold text-gray-700">Date:</span> {selectedSlot.date}
                  </p>
                  <p className="mt-1 text-[12px] text-gray-500">
                    <span className="font-semibold text-gray-700">Time:</span> {selectedSlot.timeSlot}
                  </p>
                  {currentSlotStatus !== 'not-set' && (
                    <p className="mt-2 text-[11px] text-gray-400">
                      Current:{' '}
                      <span
                        className={
                          currentSlotStatus === 'available'
                            ? 'font-semibold text-green-600'
                            : 'font-semibold text-gray-500'
                        }
                      >
                        {currentSlotStatus === 'available' ? 'Available' : 'Unavailable'}
                      </span>
                    </p>
                  )}
                  <div className="mt-4 flex flex-col gap-2">
                    <Button
                      className="rounded-lg bg-green-500 px-4 py-2.5 text-[13px] font-semibold text-white transition hover:bg-green-600 disabled:cursor-not-allowed disabled:opacity-50"
                      disabled={isCurrentlyAvailable}
                      module={ACCESS_SCOPES.coaches}
                      onClick={() => setSlotAvailability(true)}
                    >
                      Mark as Available
                    </Button>
                    <Button
                      className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-2.5 text-[13px] font-semibold text-gray-700 transition hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50"
                      disabled={isCurrentlyUnavailable}
                      module={ACCESS_SCOPES.coaches}
                      onClick={() => setSlotAvailability(false)}
                    >
                      Mark as Unavailable
                    </Button>
                  </div>
                </div>
                <div className="border-t border-gray-100 px-5 py-3">
                  <button
                    className="w-full rounded-lg border border-gray-200 py-2 text-[12px] font-medium text-gray-500 hover:bg-gray-50"
                    type="button"
                    onClick={closeModal}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          );
        })()}

      {/* Grid card */}
      <div className="overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm">
        {/* Navigation bar */}
        <div className="flex items-center justify-between border-b border-gray-100 bg-white px-4 py-3">
          <div className="flex items-center gap-2">
            <button
              className="flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-[12px] font-semibold text-[#21295A] transition hover:border-[#21295A] hover:bg-[#21295A] hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
              disabled={isLoading || displayedDates.length === 0}
              type="button"
              onClick={handleNavigatePrevious}
            >
              <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path d="M15 19l-7-7 7-7" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} />
              </svg>
              <span className="hidden sm:inline">Previous 8 Days</span>
              <span className="sm:hidden">Prev</span>
            </button>
            <button
              className="rounded-lg border border-gray-200 px-3 py-1.5 text-[12px] font-semibold text-[#21295A] transition hover:border-[#21295A] hover:bg-[#21295A] hover:text-white disabled:opacity-40"
              disabled={isLoading}
              type="button"
              onClick={handleNavigateToday}
            >
              Today
            </button>
            <button
              className="flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-[12px] font-semibold text-[#21295A] transition hover:border-[#21295A] hover:bg-[#21295A] hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
              disabled={isLoading || displayedDates.length === 0}
              type="button"
              onClick={handleNavigateNext}
            >
              <span className="hidden sm:inline">Next 8 Days</span>
              <span className="sm:hidden">Next</span>
              <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path d="M9 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} />
              </svg>
            </button>
          </div>

          <button
            className={cx(
              'rounded-lg border px-3 py-1.5 text-[12px] font-semibold transition',
              selectionMode
                ? 'border-[#21295A] bg-[#21295A] text-white hover:bg-[#2d3570]'
                : 'border-gray-200 bg-white text-[#21295A] hover:border-[#21295A] hover:bg-gray-50'
            )}
            type="button"
            onClick={toggleSelectionMode}
          >
            {selectionMode ? 'Done' : 'Multi-Select'}
          </button>
        </div>

        {/* Selection action bar */}
        {selectionMode && selectedSlots.size > 0 && (
          <div className="flex items-center gap-2 border-b border-gray-100 bg-gray-50 px-4 py-2.5">
            <span className="text-[12px] font-medium text-gray-500">{selectedSlots.size} selected</span>
            <Button
              className="rounded-lg bg-green-500 px-3 py-1.5 text-[11px] font-semibold text-white hover:bg-green-600 disabled:opacity-50"
              disabled={selectionTypeRestriction === 'available'}
              module={ACCESS_SCOPES.coaches}
              onClick={() => setMultipleSlotAvailability(true)}
            >
              Mark Available
            </Button>
            <Button
              className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-[11px] font-semibold text-gray-600 hover:bg-gray-50 disabled:opacity-50"
              disabled={selectionTypeRestriction === 'unavailable'}
              module={ACCESS_SCOPES.coaches}
              onClick={() => setMultipleSlotAvailability(false)}
            >
              Mark Unavailable
            </Button>
            <button
              className="rounded-lg border border-gray-200 px-3 py-1.5 text-[11px] font-medium text-gray-500 hover:bg-gray-50"
              type="button"
              onClick={clearSelections}
            >
              Clear
            </button>
          </div>
        )}

        {selectionMode && selectedSlots.size === 0 && (
          <div className="border-b border-gray-100 bg-gray-50 px-4 py-2 text-center text-[11px] text-gray-400">
            Click or drag to select slots
          </div>
        )}

        {/* Scrollable grid */}
        <div className="relative max-h-[calc(55vh+65px)] overflow-x-auto overflow-y-auto desktop:max-h-[calc(65vh+70px)]">
          <div className="min-w-fit">
            {/* Mobile */}
            <div className="desktop:hidden">
              <div className="sticky top-0 z-30 grid bg-white" style={gridTemplateColumnsMobile}>
                <div className="sticky left-0 z-40 flex min-h-[56px] min-w-[95px] items-center justify-center border-b border-r border-gray-200 bg-gray-50 px-2 text-[10px] font-bold text-[#21295A] shadow-[1px_0_0_#e5e7eb]">
                  Time
                </div>
                {displayedDates.map((date, dateIdx) => renderDateHeader(date, dateIdx, true))}
              </div>
              <div className="grid" style={gridTemplateColumnsMobile}>
                {timeSlots.map((slot, slotIdx) => (
                  <Fragment key={slot}>
                    <div
                      className={cx(
                        'sticky left-0 z-20 flex min-h-[56px] min-w-[95px] items-center justify-center border-b border-r border-gray-200 bg-white px-2 shadow-[1px_0_0_#e5e7eb]',
                        slotIdx === 0 && 'border-t-0'
                      )}
                    >
                      <span className="text-center text-[11px] font-medium text-gray-600">{slot}</span>
                    </div>
                    {displayedDates.map((date, dateIdx) => renderCell(dateIdx, slotIdx, date, slot, true))}
                  </Fragment>
                ))}
              </div>
            </div>

            {/* Desktop */}
            <div className="hidden desktop:block">
              <div className="sticky top-0 z-30 grid bg-white" style={gridTemplateColumns}>
                <div className="sticky left-0 z-40 flex min-h-[60px] min-w-[130px] items-center justify-center border-b border-r border-gray-200 bg-gray-50 px-3 text-[11px] font-bold text-[#21295A] shadow-[1px_0_0_#e5e7eb]">
                  Time Slot
                </div>
                {displayedDates.map((date, dateIdx) => renderDateHeader(date, dateIdx, false))}
              </div>
              <div className="grid" style={gridTemplateColumns}>
                {timeSlots.map((slot, slotIdx) => (
                  <Fragment key={slot}>
                    <div
                      className={cx(
                        'sticky left-0 z-20 flex min-h-[60px] min-w-[130px] items-center justify-center border-b border-r border-gray-200 bg-white px-3 shadow-[1px_0_0_#e5e7eb]',
                        slotIdx === 0 && 'border-t-0'
                      )}
                    >
                      <span className="text-[12px] font-medium text-gray-600">{slot}</span>
                    </div>
                    {displayedDates.map((date, dateIdx) => renderCell(dateIdx, slotIdx, date, slot, false))}
                  </Fragment>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 px-1">
        {[
          {
            el: (
              <span className="flex h-3 w-3 items-center justify-center rounded-sm bg-green-50 ring-1 ring-green-200">
                <svg className="h-2 w-2 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} />
                </svg>
              </span>
            ),
            label: 'Available',
          },
          { el: <span className="h-3 w-3 rounded-sm bg-red-50 ring-1 ring-red-200" />, label: 'Unavailable' },
          { el: <span className="h-3 w-3 rounded-sm bg-slate-100" />, label: 'Booked' },
          { el: <span className="h-3 w-3 rounded-sm bg-amber-100" />, label: 'Holiday' },
          { el: <span className="h-3 w-3 rounded-sm bg-[#21295A]" />, label: 'Selected' },
        ].map(item => (
          <div key={item.label} className="flex items-center gap-1.5">
            {item.el}
            <span className="text-[11px] font-medium text-gray-500">{item.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default CoachScheduleGrid;
