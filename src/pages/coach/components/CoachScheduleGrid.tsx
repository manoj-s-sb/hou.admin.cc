import { Fragment, useState, useMemo, useEffect, useRef, useCallback } from 'react';

import { toast } from 'react-hot-toast';
import { useDispatch } from 'react-redux';

import { updateCoachSlots } from '../../../store/slots/api';
import { CoachSlotsResponse, Coach, CoachSlot } from '../../../store/slots/types';
import { AppDispatch } from '../../../store/store';
import { getTodayDateInChicago } from '../../../utils/dateUtils';

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

const CoachScheduleGrid: React.FC<{
  coachSlotsList: CoachSlotsResponse[];
  isLoading: boolean;
  onDateRangeChange: (startDate: string, endDate: string) => void;
}> = ({ coachSlotsList, isLoading, onDateRangeChange }) => {
  const dispatch = useDispatch<AppDispatch>();

  // Store availability state
  const [availability, setAvailability] = useState<SlotAvailability>({});
  const [selectedSlot, setSelectedSlot] = useState<SelectedSlot | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [selectedCoachIndex] = useState(0);

  // Multi-select state
  const [isSelecting, setIsSelecting] = useState(false);
  const [selectedSlots, setSelectedSlots] = useState<Set<string>>(new Set());
  const selectedSlotsRef = useRef<Set<string>>(new Set()); // Keep ref in sync with state for accurate reads
  const [selectionMode, setSelectionMode] = useState(false);
  const selectionStartRef = useRef<SlotKey | null>(null);
  const startCellSelectedRef = useRef(false); // was start cell already selected at mousedown (for click-vs-drag)
  const gestureCellsRef = useRef<Set<string>>(new Set()); // cells touched during current gesture
  const [selectionTypeRestriction, setSelectionTypeRestriction] = useState<'available' | 'unavailable' | null>(null);

  // Keep ref in sync with state
  useEffect(() => {
    selectedSlotsRef.current = selectedSlots;
  }, [selectedSlots]);

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

  // Helper function to get weekday in Chicago timezone
  const getWeekdayInChicago = (date: Date): string => {
    return date
      .toLocaleDateString('en-US', {
        weekday: 'short',
        timeZone: 'America/Chicago',
      })
      .toUpperCase();
  };

  // Helper function to get today's date components in Chicago timezone
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
      month: parseInt(parts.find(p => p.type === 'month')?.value || '0') - 1, // 0-indexed
      day: parseInt(parts.find(p => p.type === 'day')?.value || '0'),
    };
  };

  // Helper function to get date components in Chicago timezone
  // The dateString is in YYYY-MM-DD format and should be interpreted as a date in Chicago timezone
  const getDateComponentsInChicago = (dateString: string): { year: number; month: number; day: number } => {
    // Parse the date string directly (YYYY-MM-DD format)
    // The API sends dates that represent dates in Chicago timezone, so we parse them directly
    const [year, month, day] = dateString.split('-').map(Number);

    // Return the components directly since the date string already represents Chicago timezone date
    return {
      year,
      month: month - 1, // Convert to 0-indexed month
      day,
    };
  };

  // Helper function to create a Date object for weekday calculation in Chicago timezone
  // The date string represents a date in Chicago timezone, so we need to create a Date object
  // that when formatted in Chicago timezone gives us the correct weekday
  const createDateForChicagoWeekday = (year: number, month: number, day: number): Date => {
    // Create a date at noon UTC (or later) to ensure it's the same day in Chicago
    // Chicago is UTC-6 (CST) or UTC-5 (CDT), so we use 18:00 UTC which is definitely
    // the same calendar day in Chicago (12:00 PM CST or 1:00 PM CDT)
    // This ensures the weekday calculation is correct regardless of DST
    return new Date(Date.UTC(year, month, day, 18, 0, 0));
  };

  // Extract dates from availability
  const displayedDates = useMemo(() => {
    if (!currentCoachData) return [];

    const todayChicago = getTodayInChicago();

    return currentCoachData.availability.map(dayAvailability => {
      const dateComponents = getDateComponentsInChicago(dayAvailability.date);
      // Create a date object that represents this date in Chicago timezone for weekday calculation
      const dateForWeekday = createDateForChicagoWeekday(dateComponents.year, dateComponents.month, dateComponents.day);
      // Create a local date object for display purposes (using local timezone for the Date object itself)
      const localDate = new Date(dateComponents.year, dateComponents.month, dateComponents.day);

      // Check if this date is today in Chicago timezone
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

  // Helper function to format time consistently - extracts time directly from string without timezone conversion
  const formatTime = (timeString: string): string => {
    // Parse the time string directly to extract hours and minutes without timezone conversion
    // Handles formats like "2024-01-15T10:30:00" or "2024-01-15T10:30:00Z" or "2024-01-15T10:30:00-06:00"
    // Extract time part (HH:MM) directly from the string
    const timeMatch = timeString.match(/T(\d{2}):(\d{2})/);
    if (timeMatch) {
      return `${timeMatch[1]}:${timeMatch[2]}`;
    }
    // Fallback: if format is different, try parsing as Date and use UTC methods
    const date = new Date(timeString);
    const hours = date.getUTCHours().toString().padStart(2, '0');
    const minutes = date.getUTCMinutes().toString().padStart(2, '0');
    return `${hours}:${minutes}`;
  };

  // Extract unique time slots from all dates
  const timeSlots = useMemo(() => {
    if (!currentCoachData) return [];

    const allTimeSlots = new Set<string>();

    currentCoachData.availability.forEach(dayAvailability => {
      dayAvailability.slots.forEach(slot => {
        const startTimeStr = formatTime(slot.startTime);
        const endTimeStr = formatTime(slot.endTime);

        allTimeSlots.add(`${startTimeStr} - ${endTimeStr}`);
      });
    });

    return Array.from(allTimeSlots).sort();
  }, [currentCoachData]);

  // Helper function to format booking type to readable text
  const formatBookingType = (bookingType: string): string => {
    // Convert camelCase to readable format
    // e.g., "tourBooking" -> "Tour Booked"
    const result = bookingType
      .replace(/([A-Z])/g, ' $1') // Add space before capital letters
      .replace(/^./, str => str.toUpperCase()) // Capitalize first letter
      .trim();

    // Replace "Booking" with "Booked" at the end
    return result.replace(/Booking$/i, 'Booked');
  };

  // Helper function to format date in Chicago timezone
  const formatDateOnly = (date: Date): string => {
    // Format the date in Chicago timezone to get the correct date components
    const dateFormatter = new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/Chicago',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });

    const parts = dateFormatter.formatToParts(date);
    const year = parts.find(p => p.type === 'year')?.value || '0';
    const month = parts.find(p => p.type === 'month')?.value || '0';
    const day = parts.find(p => p.type === 'day')?.value || '0';

    return `${year}-${month}-${day}`;
  };

  // Helper function to add days to a date string in Chicago timezone
  const addDaysInChicago = (dateString: string, days: number): string => {
    const dateComponents = getDateComponentsInChicago(dateString);
    // Create a date at noon UTC to avoid DST issues
    const date = new Date(Date.UTC(dateComponents.year, dateComponents.month, dateComponents.day, 18, 0, 0));
    // Add days
    date.setUTCDate(date.getUTCDate() + days);
    // Format back in Chicago timezone
    return formatDateOnly(date);
  };

  const handleNavigatePrevious = () => {
    // Get the first date from displayed dates
    if (displayedDates.length === 0) return;

    const [{ dateString }] = displayedDates;

    // Calculate previous 8 days: first date minus 8 days
    const newStartDate = addDaysInChicago(dateString, -8);

    // End date is 7 days after start date (8 days total)
    const newEndDate = addDaysInChicago(newStartDate, 7);

    // Format dates and fetch new data
    onDateRangeChange(newStartDate, newEndDate);
  };

  const handleNavigateNext = () => {
    // Get the first date from displayed dates
    if (displayedDates.length === 0) return;

    const [{ dateString }] = displayedDates;

    // Calculate next 8 days: first date plus 8 days
    const newStartDate = addDaysInChicago(dateString, 8);

    // End date is 7 days after start date (8 days total)
    const newEndDate = addDaysInChicago(newStartDate, 7);

    // Format dates and fetch new data
    onDateRangeChange(newStartDate, newEndDate);
  };

  const handleNavigateToday = () => {
    // Get today's date in Chicago
    const todayStr = getTodayDateInChicago();

    // End date is 7 days after today (8 days total)
    const endDate = addDaysInChicago(todayStr, 7);

    // Format dates and fetch new data
    onDateRangeChange(todayStr, endDate);
  };

  // Toggle selection mode
  const toggleSelectionMode = () => {
    setSelectionMode(!selectionMode);
    if (selectionMode) {
      // Exiting selection mode - clear selections and restriction
      const emptySet = new Set<string>();
      setSelectedSlots(emptySet);
      selectedSlotsRef.current = emptySet;
      setSelectionTypeRestriction(null);
    }
  };

  // Find slot by date index and time slot
  const findSlotByIndices = (dateIndex: number, timeSlotStr: string): CoachSlot | null => {
    const date = displayedDates[dateIndex];
    if (!date || date.isHoliday) return null;

    const slot = date.slots.find(s => {
      const startTimeStr = formatTime(s.startTime);
      const endTimeStr = formatTime(s.endTime);
      const formattedSlot = `${startTimeStr} - ${endTimeStr}`;

      return formattedSlot === timeSlotStr;
    });

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
    const slotStatus = getSlotStatus(dateIndex, slotIndex);

    // Don't allow selecting 'booked' slots
    if (slotStatus === 'booked') return;

    // Check restriction before adding (use current state via callback)
    if (selectionTypeRestriction && slotStatus !== 'not-set' && slotStatus !== selectionTypeRestriction) {
      return;
    }

    setSelectedSlots(prev => {
      const newSelected = new Set(prev);

      if (newSelected.has(coachSlotCode)) {
        newSelected.delete(coachSlotCode);
        if (newSelected.size === 0) {
          setSelectionTypeRestriction(null);
        }
        return newSelected;
      }

      // First selection in this batch: set restriction if slot has status
      if (newSelected.size === 0 && (slotStatus === 'available' || slotStatus === 'unavailable')) {
        setSelectionTypeRestriction(slotStatus as 'available' | 'unavailable');
      }

      newSelected.add(coachSlotCode);
      return newSelected;
    });
  };

  // Handle mouse down to start drag selection
  const handleSlotMouseDown = (dateIndex: number, slotIndex: number) => {
    if (!selectionMode) return;

    const date = displayedDates[dateIndex];
    if (date.isHoliday) return;

    const timeSlot = timeSlots[slotIndex];
    const slot = findSlotByIndices(dateIndex, timeSlot);
    const coachSlotCode = slot?.coachSlotCode || `temp-${dateIndex}-${slotIndex}`;
    const slotStatus = getSlotStatus(dateIndex, slotIndex);

    // Don't allow selecting 'booked' slots
    if (slotStatus === 'booked') return;

    // Use ref for accurate "was already selected" check (avoids stale closure)
    startCellSelectedRef.current = selectedSlotsRef.current.has(coachSlotCode);
    gestureCellsRef.current = new Set([coachSlotCode]);

    setIsSelecting(true);
    selectionStartRef.current = { dateIndex, slotIndex };

    // Check restriction before adding
    if (selectionTypeRestriction && slotStatus !== 'not-set' && slotStatus !== selectionTypeRestriction) {
      return;
    }

    // Use functional updater so we always add to the latest selection (fixes "second click loses first")
    setSelectedSlots(prev => {
      const newSelected = new Set(prev);
      if (newSelected.size === 0 && (slotStatus === 'available' || slotStatus === 'unavailable')) {
        setSelectionTypeRestriction(slotStatus as 'available' | 'unavailable');
      }
      newSelected.add(coachSlotCode);
      return newSelected;
    });
  };

  // Handle mouse enter for drag selection
  const handleSlotMouseEnter = (dateIndex: number, slotIndex: number) => {
    if (!selectionMode || !isSelecting) return;

    const date = displayedDates[dateIndex];
    if (date.isHoliday) return;

    const timeSlot = timeSlots[slotIndex];
    const slot = findSlotByIndices(dateIndex, timeSlot);
    const coachSlotCode = slot?.coachSlotCode || `temp-${dateIndex}-${slotIndex}`;
    const slotStatus = getSlotStatus(dateIndex, slotIndex);

    // Don't allow selecting 'booked' slots
    if (slotStatus === 'booked') return;

    // Check if this slot matches the restriction type (skip check for 'not-set' slots)
    if (selectionTypeRestriction && slotStatus !== 'not-set' && slotStatus !== selectionTypeRestriction) {
      return;
    }

    gestureCellsRef.current.add(coachSlotCode);

    // Use functional updater so we always add to the latest selection during drag
    setSelectedSlots(prev => {
      const newSelected = new Set(prev);
      if (newSelected.size === 0 && (slotStatus === 'available' || slotStatus === 'unavailable')) {
        setSelectionTypeRestriction(slotStatus as 'available' | 'unavailable');
      }
      newSelected.add(coachSlotCode);
      return newSelected;
    });
  };

  // Handle mouse up on a cell: treat same-cell release as click (toggle); used because preventDefault on mousedown blocks click
  const handleSlotMouseUpOnCell = (dateIndex: number, slotIndex: number) => {
    if (!selectionMode || !isSelecting) return;

    const start = selectionStartRef.current;
    const sameCell = start?.dateIndex === dateIndex && start?.slotIndex === slotIndex;
    const gestureSize = gestureCellsRef.current?.size ?? 0;

    // If it's a simple click (same cell, no drag), handle toggle
    if (sameCell && gestureSize === 1) {
      // If the cell was already selected at mousedown, toggle it off
      // If it wasn't selected, it was added in mousedown, so we do nothing (keep it selected)
      if (startCellSelectedRef.current) {
        toggleSlotSelection(dateIndex, slotIndex);
      }
      // If it wasn't selected, it's already been added in mousedown, so we're done
    }
    // If gestureSize > 1, it was a drag - selections already handled in mousedown/mouseenter

    setIsSelecting(false);
    selectionStartRef.current = null;
    gestureCellsRef.current = new Set();
  };

  // Handle mouse up to end selection (document-level)
  const handleSlotMouseUp = useCallback(() => {
    if (selectionMode) {
      setIsSelecting(false);
      selectionStartRef.current = null;
      gestureCellsRef.current = new Set();
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

    // Don't allow clicking on booked slots
    const slotStatus = getSlotStatus(dateIndex, slotIndex);
    if (slotStatus === 'booked') return;

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

  // Clear all selections
  const clearSelections = () => {
    const emptySet = new Set<string>();
    setSelectedSlots(emptySet);
    selectedSlotsRef.current = emptySet;
    setSelectionTypeRestriction(null);
  };

  // Check if a slot is selected
  const isSlotSelected = (dateIndex: number, slotIndex: number): boolean => {
    const timeSlot = timeSlots[slotIndex];
    const slot = findSlotByIndices(dateIndex, timeSlot);
    const coachSlotCode = slot?.coachSlotCode || `temp-${dateIndex}-${slotIndex}`;
    return selectedSlots.has(coachSlotCode);
  };

  // Check if a slot can be selected based on the current restriction
  const canSelectSlot = (dateIndex: number, slotIndex: number): boolean => {
    if (!selectionMode) return true;

    const slotStatus = getSlotStatus(dateIndex, slotIndex);

    // Can't select holiday or booked slots
    if (slotStatus === 'holiday' || slotStatus === 'booked') return false;

    // If no restriction yet, any slot (including not-set) can be selected
    if (!selectionTypeRestriction) return true;

    // 'not-set' slots can always be selected regardless of restriction
    if (slotStatus === 'not-set') return true;

    // If there's a restriction, only slots matching the restriction can be selected
    return slotStatus === selectionTypeRestriction;
  };

  // Get slot availability status
  const getSlotStatus = (
    dateIndex: number,
    slotIndex: number
  ): 'available' | 'unavailable' | 'not-set' | 'holiday' | 'booked' => {
    const date = displayedDates[dateIndex];
    if (date.isHoliday) return 'holiday';

    const timeSlot = timeSlots[slotIndex];
    const slot = findSlotByIndices(dateIndex, timeSlot);
    if (!slot) return 'not-set';

    // Check if slot has a booking
    if (slot.bookingType && slot.bookingCode) return 'booked';

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
      {showModal &&
        selectedSlot &&
        (() => {
          const currentSlotStatus = getSlotStatus(selectedSlot.dateIndex, selectedSlot.slotIndex);
          const isCurrentlyAvailable = currentSlotStatus === 'available';
          const isCurrentlyUnavailable = currentSlotStatus === 'unavailable';

          return (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
              <div className="w-[90%] max-w-md rounded-[12px] bg-white p-6 shadow-lg">
                <h3 className="mb-2 text-[18px] font-semibold text-[#21295A]">Set Availability</h3>
                <div className="mb-4 text-[14px] text-[#64748B]">
                  <p className="mb-1">
                    <strong>Date:</strong> {selectedSlot.date}
                  </p>
                  <p className="mb-2">
                    <strong>Time:</strong> {selectedSlot.timeSlot}
                  </p>
                  {currentSlotStatus !== 'not-set' && (
                    <p className="mt-2 text-[13px] italic">
                      <strong>Current Status:</strong>{' '}
                      <span className={currentSlotStatus === 'available' ? 'text-[#10B981]' : 'text-[#EF4444]'}>
                        {currentSlotStatus === 'available' ? 'Available' : 'Unavailable'}
                      </span>
                    </p>
                  )}
                </div>
                <div className="mb-6 flex flex-col gap-3">
                  <button
                    className="rounded-[10px] border-2 border-[#10B981] bg-[#10B981] px-6 py-3 text-[15px] font-semibold text-white transition hover:bg-[#059669] disabled:cursor-not-allowed disabled:opacity-50"
                    disabled={isCurrentlyAvailable}
                    type="button"
                    onClick={() => setSlotAvailability(true)}
                  >
                    ✓ Mark as Available
                  </button>
                  <button
                    className="rounded-[10px] border-2 border-[#EF4444] bg-[#EF4444] px-6 py-3 text-[15px] font-semibold text-white transition hover:bg-[#DC2626] disabled:cursor-not-allowed disabled:opacity-50"
                    disabled={isCurrentlyUnavailable}
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
          );
        })()}

      {/* Schedule Grid */}
      <div className="rounded-[10px] bg-white">
        {/* Navigation Buttons - Fixed outside scrollable area */}
        <div className="sticky top-0 z-40 flex items-center justify-between border-b border-[#B3DADA] bg-white px-2 py-2.5 sm:px-3 sm:py-3">
          {/* Previous/Next Navigation */}
          <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
            <button
              className="flex shrink-0 items-center gap-1.5 rounded-[8px] border border-[#E2E8F0] bg-white px-2 py-1.5 text-[10px] font-medium text-[#21295A] hover:bg-[#F8FAFC] active:bg-[#E2E8F0] disabled:cursor-not-allowed disabled:opacity-40 sm:gap-2 sm:px-2.5 sm:py-2 sm:text-[11px]"
              disabled={isLoading || displayedDates.length === 0}
              type="button"
              onClick={handleNavigatePrevious}
            >
              <img alt="previous dates" className="h-3.5 w-3.5 sm:h-4 sm:w-4" src={'/assets/svg/arrow_left.svg'} />
              <span className="hidden sm:inline">Previous 8 Days</span>
              <span className="sm:hidden">Prev 8</span>
            </button>
            <button
              className="shrink-0 rounded-[8px] border border-[#E2E8F0] bg-white px-2.5 py-1.5 text-[11px] font-medium text-[#21295A] hover:bg-[#F8FAFC] active:bg-[#E2E8F0] disabled:cursor-not-allowed disabled:opacity-40 sm:px-3 sm:py-2 sm:text-[12px]"
              disabled={isLoading}
              type="button"
              onClick={handleNavigateToday}
            >
              Current Date
            </button>
            <button
              className="flex shrink-0 items-center gap-1.5 rounded-[8px] border border-[#E2E8F0] bg-white px-2 py-1.5 text-[10px] font-medium text-[#21295A] hover:bg-[#F8FAFC] active:bg-[#E2E8F0] disabled:cursor-not-allowed disabled:opacity-40 sm:gap-2 sm:px-2.5 sm:py-2 sm:text-[11px]"
              disabled={isLoading || displayedDates.length === 0}
              type="button"
              onClick={handleNavigateNext}
            >
              <span className="hidden sm:inline">Next 8 Days</span>
              <span className="sm:hidden">Next 8</span>
              <img alt="next dates" className="h-3.5 w-3.5 sm:h-4 sm:w-4" src={'/assets/svg/arrow_right.svg'} />
            </button>
          </div>

          {/* Multi-Select Toggle */}
          <div className="flex flex-1 justify-end">
            <button
              className={`shrink-0 rounded-[8px] border px-3 py-1.5 text-[12px] font-medium transition lg:px-4 lg:py-2 lg:text-[13px] desktop:hidden ${
                selectionMode
                  ? 'bg-[#21295A] text-white active:bg-[#1a1f42]'
                  : 'border-[#E2E8F0] bg-white text-[#21295A] active:bg-[#F1F5F9]'
              }`}
              type="button"
              onClick={toggleSelectionMode}
            >
              {selectionMode ? 'Done' : 'Multi-Select'}
            </button>
            <button
              className={`hidden shrink-0 rounded-[8px] border px-3 py-1.5 text-[12px] font-medium transition lg:px-4 lg:py-2 lg:text-[13px] desktop:block ${
                selectionMode
                  ? 'border-[#21295A] bg-[#21295A] text-white hover:bg-[#1a1f42]'
                  : 'border-[#E2E8F0] bg-white text-[#21295A] hover:bg-[#F8FAFC]'
              }`}
              type="button"
              onClick={toggleSelectionMode}
            >
              {selectionMode ? '✓ Multi-Select ON' : 'Enable Multi-Select'}
            </button>
          </div>
        </div>

        {/* Desktop Selection Actions Bar - Outside scrollable container for full visibility */}
        {selectionMode && selectedSlots.size > 0 && (
          <div className="hidden flex-wrap items-center gap-2 border-b border-[#B3DADA] bg-[#F8FAFC] px-3 py-2.5 lg:px-5 lg:py-3 desktop:flex">
            <span className="text-[12px] font-medium text-[#64748B] lg:text-[13px]">{selectedSlots.size} selected</span>
            <button
              className="rounded-[8px] bg-[#10B981] px-2 py-1.5 text-[12px] font-semibold text-white transition hover:bg-[#059669] disabled:cursor-not-allowed disabled:opacity-50 lg:px-3 lg:py-2 lg:text-[13px]"
              disabled={selectionTypeRestriction === 'available'}
              type="button"
              onClick={() => setMultipleSlotAvailability(true)}
            >
              ✓ Available
            </button>
            <button
              className="rounded-[8px] bg-[#EF4444] px-2 py-1.5 text-[12px] font-semibold text-white transition hover:bg-[#DC2626] disabled:cursor-not-allowed disabled:opacity-50 lg:px-3 lg:py-2 lg:text-[13px]"
              disabled={selectionTypeRestriction === 'unavailable'}
              type="button"
              onClick={() => setMultipleSlotAvailability(false)}
            >
              ✕ Unavailable
            </button>
            <button
              className="rounded-[8px] border border-[#E2E8F0] bg-white px-2 py-1.5 text-[12px] font-medium text-[#64748B] transition hover:bg-[#F8FAFC] lg:px-3 lg:py-2 lg:text-[13px]"
              type="button"
              onClick={clearSelections}
            >
              Clear
            </button>
          </div>
        )}

        <div className="relative max-h-[calc(55vh+65px)] overflow-x-auto overflow-y-auto desktop:max-h-[calc(65vh+70px)]">
          <div className="min-w-fit">
            {/* Mobile Layout */}
            <div className="desktop:hidden">
              {/* Selection Actions Bar - Only show when slots are selected */}
              {selectionMode && selectedSlots.size > 0 && (
                <div className="sticky top-0 z-30 flex items-center gap-2 border-b border-[#B3DADA] bg-[#F8FAFC] px-3 py-2">
                  <span className="text-[12px] font-medium text-[#64748B]">{selectedSlots.size} selected</span>
                  <button
                    className="rounded-[6px] bg-[#10B981] px-2 py-1.5 text-[11px] font-semibold text-white active:bg-[#059669] disabled:cursor-not-allowed disabled:opacity-50"
                    disabled={selectionTypeRestriction === 'available'}
                    type="button"
                    onClick={() => setMultipleSlotAvailability(true)}
                  >
                    ✓ Available
                  </button>
                  <button
                    className="rounded-[6px] bg-[#EF4444] px-2 py-1.5 text-[11px] font-semibold text-white active:bg-[#DC2626] disabled:cursor-not-allowed disabled:opacity-50"
                    disabled={selectionTypeRestriction === 'unavailable'}
                    type="button"
                    onClick={() => setMultipleSlotAvailability(false)}
                  >
                    ✕ Unavailable
                  </button>
                  <button
                    className="rounded-[6px] border border-[#E2E8F0] bg-white px-2 py-1.5 text-[11px] font-medium text-[#64748B] active:bg-[#F1F5F9]"
                    type="button"
                    onClick={clearSelections}
                  >
                    Clear
                  </button>
                </div>
              )}

              {/* Instruction text when in selection mode but no slots selected */}
              {selectionMode && selectedSlots.size === 0 && (
                <div className="sticky top-0 z-30 border-b border-[#B3DADA] bg-[#F8FAFC] px-3 py-2 text-center text-[12px] text-[#64748B]">
                  Tap slots to select them
                </div>
              )}
              {/* Header Row - Sticky */}
              <div
                className={composeClasses(
                  'sticky z-30 bg-white',
                  selectionMode && selectedSlots.size > 0
                    ? 'top-[44px]'
                    : selectionMode && selectedSlots.size === 0
                      ? 'top-[40px]'
                      : 'top-0'
                )}
              >
                <div className="grid bg-white" style={gridTemplateColumnsMobile}>
                  <div className="sticky left-0 z-40 flex min-h-[65px] min-w-[100px] items-center justify-center border border-[#B3DADA] bg-[#fff] px-2 py-3 text-[12px] font-semibold text-[#21295A] shadow-[2px_0_4px_rgba(0,0,0,0.05)]">
                    Time Slot
                  </div>
                  {displayedDates.map((date, dateIdx) => (
                    <div
                      key={dateIdx}
                      className={composeClasses(
                        'relative flex min-h-[65px] w-full min-w-[140px] flex-col items-center justify-center border border-l-0 border-[#B3DADA] px-2 py-3 text-center',
                        date.isToday ? 'border-l-4 border-l-[#3B82F6] bg-[#F0F9FF]' : 'bg-[#fff]'
                      )}
                    >
                      <div className="flex flex-col items-center justify-center gap-1">
                        <span className="text-[10px] font-medium text-[#7A7F9C]">{date.weekday}</span>
                        <div className="flex items-center gap-1.5">
                          <span
                            className={composeClasses(
                              'text-[12px] font-semibold',
                              date.isToday ? 'text-[#3B82F6]' : 'text-[#21295A]'
                            )}
                          >
                            {date.day}
                          </span>
                          {date.isToday && (
                            <span className="rounded-full bg-[#3B82F6] px-1.5 py-0.5 text-[8px] font-semibold text-white">
                              Today
                            </span>
                          )}
                        </div>
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
                      const canSelect = canSelectSlot(dateIdx, slotIdx);

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

                      // If it's a booked slot, show booked cell (non-clickable)
                      if (slotStatus === 'booked') {
                        const currentSlot = findSlotByIndices(dateIdx, slot);
                        const bookingTypeText = currentSlot?.bookingType
                          ? formatBookingType(currentSlot.bookingType)
                          : 'Booked';

                        return (
                          <div
                            key={`${slot}-${dateIdx}`}
                            className={composeClasses(
                              'flex min-h-[70px] min-w-[140px] cursor-not-allowed items-center justify-center border border-[#B3DADA] bg-[#F1F5F9] text-[11px] font-medium',
                              slotIdx !== 0 && 'border-t-0',
                              dateIdx !== 0 && 'border-l-0'
                            )}
                          >
                            <div className="flex h-full w-full flex-col items-center justify-center px-2 py-3 text-center">
                              <span className="text-[10px] font-semibold leading-tight text-[#94A3B8]">
                                {bookingTypeText}
                              </span>
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
                              : !canSelect && selectionMode
                                ? 'cursor-not-allowed bg-[#F1F5F9] opacity-40'
                                : 'bg-[#F1F5F9] active:bg-[#E2E8F0]',
                            selectionMode && canSelect && 'cursor-pointer select-none'
                          )}
                          disabled={selectionMode && !canSelect && !isSelected}
                          type="button"
                          onClick={() => {
                            // In selection mode, onClick is blocked by preventDefault on mousedown
                            // Selection is handled entirely via mousedown/mouseup to avoid conflicts
                            if (!selectionMode) {
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
                              handleSlotMouseUpOnCell(dateIdx, slotIdx);
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
              {/* Header Row */}
              <div className="sticky top-0 z-30 bg-white">
                <div className="grid bg-white" style={gridTemplateColumns}>
                  <div className="sticky left-0 z-40 flex min-h-[70px] min-w-[140px] items-center justify-center border border-[#B3DADA] bg-[#fff] px-5 py-4 text-[15px] font-semibold text-[#21295A] shadow-[2px_0_4px_rgba(0,0,0,0.05)]">
                    Time Slot
                  </div>
                  {displayedDates.map((date, dateIdx) => (
                    <div
                      key={dateIdx}
                      className={composeClasses(
                        'relative flex min-h-[70px] w-full min-w-[180px] flex-col items-center justify-center border border-l-0 border-[#B3DADA] px-4 py-4 text-center',
                        date.isToday ? 'border-l-4 border-l-[#3B82F6] bg-[#F0F9FF]' : 'bg-[#fff]'
                      )}
                    >
                      <div className="flex flex-col items-center justify-center gap-2">
                        <span className="text-[12px] font-medium text-[#7A7F9C]">{date.weekday}</span>
                        <div className="flex items-center gap-2">
                          <span
                            className={composeClasses(
                              'text-[15px] font-semibold',
                              date.isToday ? 'text-[#3B82F6]' : 'text-[#21295A]'
                            )}
                          >
                            {date.day}
                          </span>
                          {date.isToday && (
                            <span className="rounded-full bg-[#3B82F6] px-2 py-1 text-[10px] font-semibold text-white">
                              Today
                            </span>
                          )}
                        </div>
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
                      const canSelect = canSelectSlot(dateIdx, slotIdx);

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

                      // If it's a booked slot, show booked cell (non-clickable)
                      if (slotStatus === 'booked') {
                        const currentSlot = findSlotByIndices(dateIdx, slot);
                        const bookingTypeText = currentSlot?.bookingType
                          ? formatBookingType(currentSlot.bookingType)
                          : 'Booked';

                        return (
                          <div
                            key={`${slot}-${dateIdx}`}
                            className={composeClasses(
                              'flex min-h-[70px] min-w-[180px] cursor-not-allowed items-center justify-center border border-[#B3DADA] bg-[#F1F5F9] text-[14px] font-medium',
                              slotIdx !== 0 && 'border-t-0',
                              dateIdx !== 0 && 'border-l-0'
                            )}
                          >
                            <div className="flex h-full w-full flex-col items-center justify-center p-4 text-center">
                              <span className="text-[13px] font-semibold leading-tight text-[#94A3B8]">
                                {bookingTypeText}
                              </span>
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
                              : !canSelect && selectionMode
                                ? 'cursor-not-allowed bg-[#F1F5F9] opacity-40'
                                : 'bg-[#F1F5F9] hover:bg-[#E2E8F0]',
                            selectionMode && canSelect && 'cursor-pointer select-none'
                          )}
                          disabled={selectionMode && !canSelect && !isSelected}
                          type="button"
                          onClick={() => {
                            // In selection mode, onClick is blocked by preventDefault on mousedown
                            // Selection is handled entirely via mousedown/mouseup to avoid conflicts
                            if (!selectionMode) {
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
                              handleSlotMouseUpOnCell(dateIdx, slotIdx);
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
        <div className="flex items-center gap-2">
          <div className="h-6 w-6 rounded border border-[#B3DADA] bg-[#F1F5F9]"></div>
          <span className="text-[13px] font-medium text-[#1E293B] desktop:text-[14px]">Booked</span>
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
            <div className="flex h-6 w-6 items-center justify-center rounded bg-[#1a1f42]">
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
