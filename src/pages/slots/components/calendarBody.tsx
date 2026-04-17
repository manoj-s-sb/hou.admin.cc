import { Fragment, useState } from 'react';

import moment from 'moment';
import { toast } from 'react-hot-toast';
import { useDispatch, useSelector } from 'react-redux';

import { getSlots, updateLaneStatus } from '../../../store/slots/api';
import { BookingUser, Lanes, Slot } from '../../../store/slots/types';
import { AppDispatch, RootState } from '../../../store/store';

import BlockTimeSlotModal from './BlockTimeSlotModal';
import LaneDetailsModal from './LaneDetailsModal';
import MultiBlockModal from './MultiBlockModal';
import SlotDetailsModal from './SlotDetailsModal';

const composeClasses = (...classes: Array<string | false | null | undefined>) => classes.filter(Boolean).join(' ');
const formatLaneType = (type?: string) => (type ? `${type.charAt(0).toUpperCase()}${type.slice(1).toLowerCase()}` : '');

/**
 * Format time slot string to HH:mm format
 * Handles various input formats from backend (e.g., "2.15", "2:15", "14:15", ISO strings)
 */
const formatTimeSlot = (timeSlot: string): string => {
  if (!timeSlot) return timeSlot;

  // If it's already in HH:mm format, return as is
  if (/^\d{2}:\d{2}$/.test(timeSlot)) {
    return timeSlot;
  }

  // If it's in decimal format like "2.15" (2 hours 15 minutes)
  if (/^\d+\.\d+$/.test(timeSlot)) {
    const [hours, minutes] = timeSlot.split('.');
    return `${hours.padStart(2, '0')}:${minutes.padStart(2, '0')}`;
  }

  // Try to parse as ISO date/time string using moment
  const parsed = moment(timeSlot);
  if (parsed.isValid()) {
    return parsed.format('HH:mm');
  }

  // If all else fails, return original
  return timeSlot;
};

const getDisplayName = (user?: BookingUser) => {
  const firstName = user?.firstName?.trim();
  const lastName = user?.lastName?.trim();

  if (!firstName && !lastName) {
    return '';
  }

  if ((firstName?.length ?? 0) > 10) {
    return firstName ?? '';
  }

  return [firstName, lastName].filter(Boolean).join(' ');
};

interface CalendarBodyProps {
  lanes: Lanes[];
  timeSlots: string[];
  date: string;
  facilityCode: string;
}

const CalendarBody = ({ lanes, timeSlots, date, facilityCode }: CalendarBodyProps) => {
  const dispatch = useDispatch<AppDispatch>();
  const { isBlockLaneLoading } = useSelector((state: RootState) => state.slots);
  const [selectedLane, setSelectedLane] = useState<Lanes | null>(null);
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<{ startTime: string; slotIndex: number } | null>(null);
  const [isMultiSelect, setIsMultiSelect] = useState(false);
  const [selectedSlotCodes, setSelectedSlotCodes] = useState<string[]>([]);
  const [selectionType, setSelectionType] = useState<'block' | 'unblock' | null>(null);
  const [showMultiBlockModal, setShowMultiBlockModal] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<{
    slot: Slot;
    laneNo: number;
    laneCode: string;
    slotIndex: number;
  } | null>(null);

  const gridTemplateColumns = { gridTemplateColumns: `110px repeat(${lanes.length}, minmax(180px, 1fr))` };
  const gridTemplateColumnsMobile = { gridTemplateColumns: `75px repeat(${lanes.length}, minmax(140px, 1fr))` };

  const handleMenuClick = (lane: Lanes, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedLane(lane);
  };

  const handleCloseModal = () => {
    setSelectedLane(null);
  };

  const handleTimeSlotMenuClick = (startTime: string, slotIndex: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedTimeSlot({ startTime, slotIndex });
  };

  const handleBlockTimeSlot = async (reason?: string) => {
    if (!selectedTimeSlot) return;
    const isBlocked = lanes.every(lane => lane.slots[selectedTimeSlot.slotIndex]?.status?.toLowerCase() === 'disabled');
    try {
      await dispatch(
        updateLaneStatus({
          date,
          facilityCode,
          startTime: selectedTimeSlot.startTime,
          action: isBlocked ? 'available' : 'disable',
          reason: isBlocked ? 'Manual unblock from admin' : reason || 'Manual block from admin',
        })
      ).unwrap();
      await dispatch(getSlots({ date, facilityCode }));
      toast.success(
        isBlocked
          ? `Time slot ${selectedTimeSlot.startTime} has been unblocked across all lanes!`
          : `Time slot ${selectedTimeSlot.startTime} has been blocked across all lanes!`,
        { duration: 4000 }
      );
      setSelectedTimeSlot(null);
    } catch (error: any) {
      toast.error(error?.message || 'Failed to update time slot status. Please try again.', { duration: 5000 });
    }
  };

  const handleUnblockLane = async (blockReason?: string, blockLaneApp?: boolean) => {
    if (selectedLane) {
      try {
        // Check if lane is currently blocked (all slots are disabled)
        const isLaneBlocked = selectedLane.slots.some(slot => slot.status?.toLowerCase() === 'disabled');
        const action = isLaneBlocked ? 'available' : 'disable';
        const reason = isLaneBlocked ? 'Manual unblock from admin' : blockReason || 'Manual block from admin';

        await dispatch(
          updateLaneStatus({
            date,
            facilityCode,
            laneCode: selectedLane.laneCode,
            action,
            reason,
            blockLaneApp,
          })
        ).unwrap();

        // Refresh the slots data after updating
        await dispatch(
          getSlots({
            date,
            facilityCode,
          })
        );

        const successMessage = isLaneBlocked
          ? `Lane ${selectedLane.laneNo} has been unblocked successfully!`
          : `Lane ${selectedLane.laneNo} has been blocked successfully!`;

        toast.success(successMessage, {
          duration: 4000,
        });

        setSelectedLane(null);
      } catch (error: any) {
        const errorMessage = error?.message || 'Failed to update lane status. Please try again.';
        toast.error(errorMessage, {
          duration: 5000,
        });
        console.error('Failed to update lane status:', error);
      }
    }
  };

  const toggleMultiSelect = () => {
    setIsMultiSelect(prev => !prev);
    setSelectedSlotCodes([]);
    setSelectionType(null);
  };

  const handleMultiSlotToggle = (slot: Slot) => {
    if (!slot?.slotCode) return;
    const isDisabled = slot.status?.toLowerCase() === 'disabled';
    const slotType: 'block' | 'unblock' = isDisabled ? 'unblock' : 'block';

    // If deselecting, allow regardless
    if (selectedSlotCodes.includes(slot.slotCode)) {
      const next = selectedSlotCodes.filter(c => c !== slot.slotCode);
      setSelectedSlotCodes(next);
      if (next.length === 0) setSelectionType(null);
      return;
    }

    // First selection sets the mode
    if (selectionType === null) {
      setSelectionType(slotType);
      setSelectedSlotCodes([slot.slotCode]);
      return;
    }

    // Subsequent selections must match the mode
    if (slotType !== selectionType) {
      toast.error(
        selectionType === 'block'
          ? 'You can only select available slots in this session.'
          : 'You can only select blocked slots in this session.',
        { duration: 3000 }
      );
      return;
    }

    setSelectedSlotCodes(prev => [...prev, slot.slotCode]);
  };

  const handleMultiAction = async (reason?: string) => {
    try {
      await dispatch(
        updateLaneStatus({
          action: selectionType === 'unblock' ? 'available' : 'disable',
          reason: selectionType === 'unblock' ? 'Manual unblock from admin' : reason,
          slotCode: selectedSlotCodes,
        })
      ).unwrap();
      await dispatch(getSlots({ date, facilityCode }));
      const count = selectedSlotCodes.length;
      toast.success(
        selectionType === 'unblock'
          ? `${count} slot${count !== 1 ? 's' : ''} unblocked successfully!`
          : `${count} slot${count !== 1 ? 's' : ''} blocked successfully!`,
        { duration: 4000 }
      );
      setShowMultiBlockModal(false);
      setSelectedSlotCodes([]);
      setSelectionType(null);
      setIsMultiSelect(false);
    } catch (error: any) {
      toast.error(error?.message || 'Failed to update slots. Please try again.', { duration: 5000 });
    }
  };

  const handleSlotClick = (slot: Slot, lane: Lanes, slotIndex: number) => {
    if (isMultiSelect) {
      handleMultiSlotToggle(slot);
      return;
    }
    // Only open modal for booked slots to show booking details
    // For available/blocked slots, only StanceBeam admins can interact
    setSelectedSlot({ slot, laneNo: lane.laneNo, laneCode: lane.laneCode, slotIndex });
  };

  const handleCloseSlotModal = () => {
    setSelectedSlot(null);
  };

  const handleBlockSlot = async (reason: string) => {
    if (selectedSlot) {
      try {
        await dispatch(
          updateLaneStatus({
            action: 'disable',
            reason: reason || 'Manual block from admin',
            slotCode: selectedSlot.slot.slotCode,
          })
        ).unwrap();

        // Refresh the slots data after updating
        await dispatch(
          getSlots({
            date,
            facilityCode,
          })
        );

        toast.success('Slot has been blocked successfully!', {
          duration: 4000,
        });

        setSelectedSlot(null);
      } catch (error: any) {
        const errorMessage = error?.message || 'Failed to block slot. Please try again.';
        toast.error(errorMessage, {
          duration: 5000,
        });
        console.error('Failed to block slot:', error);
      }
    }
  };

  const handleUnblockSlot = async () => {
    if (selectedSlot) {
      try {
        await dispatch(
          updateLaneStatus({
            action: 'available',
            reason: 'Manual unblock from admin',
            slotCode: selectedSlot.slot.slotCode,
          })
        ).unwrap();

        // Refresh the slots data after updating
        await dispatch(
          getSlots({
            date,
            facilityCode,
          })
        );

        toast.success('Slot has been unblocked successfully!', {
          duration: 4000,
        });

        setSelectedSlot(null);
      } catch (error: any) {
        const errorMessage = error?.message || 'Failed to unblock slot. Please try again.';
        toast.error(errorMessage, {
          duration: 5000,
        });
        console.error('Failed to unblock slot:', error);
      }
    }
  };

  return (
    <div className="rounded-[10px] bg-white">
      {/* Multi-select toolbar */}
      <div className="mb-3 flex items-center justify-between">
        <button
          className={`flex items-center gap-2 rounded-xl border px-4 py-2 text-[13px] font-semibold transition-all ${
            isMultiSelect
              ? 'border-[#21295A] bg-[#21295A] text-white shadow-md'
              : 'border-gray-200 bg-white text-[#21295A] hover:border-[#21295A] hover:bg-gray-50'
          }`}
          type="button"
          onClick={toggleMultiSelect}
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
            />
          </svg>
          {isMultiSelect ? 'Cancel Multi-Select' : 'Multi-Select'}
        </button>

        {isMultiSelect && selectedSlotCodes.length > 0 && (
          <div className="flex items-center gap-3">
            <span className="text-[13px] font-medium text-gray-600">
              {selectedSlotCodes.length} slot{selectedSlotCodes.length !== 1 ? 's' : ''} selected
            </span>
            <button
              className="rounded-xl border border-gray-200 px-3 py-1.5 text-[12px] font-medium text-gray-500 hover:bg-gray-50"
              type="button"
              onClick={() => {
                setSelectedSlotCodes([]);
                setSelectionType(null);
              }}
            >
              Clear
            </button>
            {selectionType === 'unblock' ? (
              <button
                className="flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-1.5 text-[13px] font-semibold text-white shadow-sm hover:bg-blue-700"
                type="button"
                onClick={() => handleMultiAction()}
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                  />
                </svg>
                Unblock Selected
              </button>
            ) : (
              <button
                className="flex items-center gap-1.5 rounded-xl bg-red-600 px-4 py-1.5 text-[13px] font-semibold text-white shadow-sm hover:bg-red-700"
                type="button"
                onClick={() => setShowMultiBlockModal(true)}
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                  />
                </svg>
                Block Selected
              </button>
            )}
          </div>
        )}

        {isMultiSelect && selectedSlotCodes.length === 0 && (
          <p className="text-[12px] text-gray-400">Click any slot to select it</p>
        )}
      </div>

      <div className="relative max-h-[calc(45vh)] overflow-x-auto overflow-y-auto desktop:max-h-[calc(58vh)]">
        <div className="min-w-fit">
          {/* Mobile Layout */}
          <div className="desktop:hidden">
            {/* Header Row - Sticky Top */}
            <div className="sticky top-0 z-30 grid bg-white" style={gridTemplateColumnsMobile}>
              <div className="sticky left-0 z-40 flex min-h-[65px] min-w-[75px] items-center justify-center border border-[#B3DADA] bg-[#fff] px-2 py-3 text-[12px] font-semibold text-[#21295A] shadow-[2px_0_4px_rgba(0,0,0,0.05)]">
                Lane No
              </div>
              {lanes.map(lane => (
                <div
                  key={lane.laneNo}
                  className={composeClasses(
                    'relative flex min-h-[65px] w-full min-w-[95px] flex-row items-center justify-center border border-l-0 border-[#B3DADA] bg-[#fff] px-2 py-3 text-center'
                  )}
                >
                  <div className="flex flex-col items-center justify-center gap-1">
                    <span className="text-[12px] font-medium text-[#21295A]">{formatLaneType(lane.laneType)}</span>
                    <span className="text-[11px] font-semibold text-[#21295A]">Lane {lane.laneNo}</span>
                  </div>

                  <span
                    className="absolute right-0 top-1/2 -translate-y-1/2 rotate-90 cursor-pointer rounded-full px-1 text-[20px] font-medium text-[#21295A]"
                    role="button"
                    tabIndex={0}
                    onClick={e => handleMenuClick(lane, e)}
                    onKeyDown={e => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        handleMenuClick(lane, e as any);
                      }
                    }}
                  >
                    ...
                  </span>
                </div>
              ))}
            </div>
            {/* Time Slots Grid */}
            <div className="grid" style={gridTemplateColumnsMobile}>
              {timeSlots.map((slot, slotIdx) => (
                <Fragment key={slot}>
                  <div
                    className={composeClasses(
                      'sticky left-0 z-20 flex min-h-[65px] min-w-[75px] flex-col items-center justify-center gap-1 border border-[#B3DADA] bg-[#fff] px-1 py-4 text-[11px] font-medium text-[#212295A] shadow-[2px_0_4px_rgba(0,0,0,0.05)]',
                      slotIdx !== 0 && 'border-t-0'
                    )}
                  >
                    {formatTimeSlot(slot)}
                    <span
                      className="cursor-pointer rounded px-0.5 text-[16px] font-bold leading-none text-[#21295A] hover:bg-gray-100"
                      role="button"
                      tabIndex={0}
                      title="Block/unblock this time slot across all lanes"
                      onClick={e => handleTimeSlotMenuClick(slot, slotIdx, e)}
                      onKeyDown={e => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          handleTimeSlotMenuClick(slot, slotIdx, e as any);
                        }
                      }}
                    >
                      •••
                    </span>
                  </div>
                  {lanes.map((lane, laneIdx) => {
                    const currentSlot = lane.slots[slotIdx];
                    const zebraBgClass = slotIdx % 2 === 0 ? 'bg-[#DCEDED]' : 'bg-[#E6F3F3]';
                    return (
                      <button
                        key={`${slot}-${lane.laneNo}`}
                        className={composeClasses(
                          'relative flex min-h-[65px] min-w-[95px] items-center justify-center border border-[#B3DADA] bg-[transparent] text-[11px] font-medium text-[#21295A] transition hover:border-[#B3DADA] hover:bg-[#fff] hover:text-[#21295A]',
                          slotIdx !== 0 && 'border-t-0',
                          laneIdx !== 0 && 'border-l-0'
                        )}
                        type="button"
                        onClick={() => handleSlotClick(currentSlot, lane, slotIdx)}
                      >
                        {isMultiSelect && currentSlot?.slotCode && selectedSlotCodes.includes(currentSlot.slotCode) && (
                          <div className="absolute inset-0 z-10 flex items-center justify-center bg-blue-500/30 backdrop-blur-[1px]">
                            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-500 shadow">
                              <svg
                                className="h-3.5 w-3.5 text-white"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} />
                              </svg>
                            </div>
                          </div>
                        )}
                        {currentSlot?.isBooked && currentSlot?.status?.toLowerCase() === 'confirmed' ? (
                          <div
                            className={composeClasses(
                              'flex h-full w-full flex-col items-center justify-center gap-1 rounded-[6px] px-2 py-2 text-center text-[11px] leading-tight',
                              currentSlot?.booking?.bookingStatus?.toLowerCase() === 'completed'
                                ? 'bg-[#43a047] text-white'
                                : currentSlot?.booking?.guests && currentSlot.booking.guests.length > 0
                                  ? 'bg-[#F97316] text-white'
                                  : currentSlot?.booking?.coach?.name
                                    ? 'bg-[#006A68] text-white'
                                    : 'bg-[#21295A] text-white'
                            )}
                          >
                            <span className="font-medium">{getDisplayName(currentSlot?.booking?.user)}</span>
                            {currentSlot?.booking?.guests && currentSlot.booking.guests.length > 0 && (
                              <span className="text-[10px] font-semibold opacity-90">
                                {currentSlot.booking.guests.length} Guest
                                {currentSlot.booking.guests.length > 1 ? 's' : ''}
                              </span>
                            )}
                            {currentSlot?.booking?.coach?.name && (
                              <span className="text-[10px] font-semibold opacity-90">
                                Coach: {currentSlot.booking.coach.name}
                              </span>
                            )}
                          </div>
                        ) : !currentSlot?.isBooked && currentSlot?.status?.toLowerCase() === 'disabled' ? (
                          <div
                            className="h-full w-full rounded-[6px] bg-cover bg-center"
                            style={{ backgroundImage: "url('/assets/svg/slot_bg.svg')" }}
                          />
                        ) : currentSlot?.status?.toLowerCase() === 'available' ? (
                          <div className={composeClasses('h-full w-full', zebraBgClass)} />
                        ) : null}
                      </button>
                    );
                  })}
                </Fragment>
              ))}
            </div>
          </div>

          {/* Desktop Layout */}
          <div className="hidden desktop:block">
            {/* Header Row - Sticky Top */}
            <div className="sticky top-0 z-30 grid bg-white" style={gridTemplateColumns}>
              <div className="sticky left-0 z-40 flex min-h-[70px] min-w-[110px] items-center justify-center border border-[#B3DADA] bg-[#fff] px-5 py-4 text-[15px] font-semibold text-[#21295A] shadow-[2px_0_4px_rgba(0,0,0,0.05)]">
                Lane No
              </div>
              {lanes.map(lane => (
                <div
                  key={lane.laneNo}
                  className={composeClasses(
                    'relative flex min-h-[70px] w-full min-w-[110px] flex-row items-center justify-center border border-l-0 border-[#B3DADA] bg-[#fff] px-4 py-4 text-center'
                  )}
                >
                  <div className="flex flex-col items-center justify-center gap-2">
                    <span className="text-[15px] font-medium text-[#21295A]">{formatLaneType(lane.laneType)}</span>
                    <span className="text-[14px] font-semibold text-[#21295A]">Lane {lane.laneNo}</span>
                  </div>
                  <span
                    className="absolute right-0 top-1/2 -translate-y-1/2 rotate-90 cursor-pointer rounded-full px-2 text-[25px] font-medium text-[#21295A]"
                    role="button"
                    tabIndex={0}
                    onClick={e => handleMenuClick(lane, e)}
                    onKeyDown={e => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        handleMenuClick(lane, e as any);
                      }
                    }}
                  >
                    ...
                  </span>
                </div>
              ))}
            </div>
            {/* Time Slots Grid */}
            <div className="grid" style={gridTemplateColumns}>
              {timeSlots.map((slot, slotIdx) => (
                <Fragment key={slot}>
                  <div
                    className={composeClasses(
                      'sticky left-0 z-20 flex min-h-[70px] min-w-[110px] flex-col items-center justify-center gap-1 border border-[#B3DADA] bg-[#fff] px-2 py-4 text-[14px] font-medium text-[#212295A] shadow-[2px_0_4px_rgba(0,0,0,0.05)]',
                      slotIdx !== 0 && 'border-t-0'
                    )}
                  >
                    {formatTimeSlot(slot)}
                    <span
                      className="cursor-pointer rounded px-1 text-[18px] font-bold leading-none text-[#21295A] hover:bg-gray-100"
                      role="button"
                      tabIndex={0}
                      title="Block/unblock this time slot across all lanes"
                      onClick={e => handleTimeSlotMenuClick(slot, slotIdx, e)}
                      onKeyDown={e => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          handleTimeSlotMenuClick(slot, slotIdx, e as any);
                        }
                      }}
                    >
                      •••
                    </span>
                  </div>
                  {lanes.map((lane, laneIdx) => {
                    const currentSlot = lane.slots[slotIdx];
                    const zebraBgClass = slotIdx % 2 === 0 ? 'bg-[#DCEDED]' : 'bg-[#E6F3F3]';
                    return (
                      <button
                        key={`${slot}-${lane.laneNo}`}
                        className={composeClasses(
                          'group relative flex min-h-[70px] min-w-[110px] items-center justify-center border border-[#B3DADA] bg-[transparent] text-[14px] font-medium text-[#21295A] transition',
                          slotIdx !== 0 && 'border-t-0',
                          laneIdx !== 0 && 'border-l-0'
                        )}
                        type="button"
                        onClick={() => {
                          handleSlotClick(currentSlot, lane, slotIdx);
                        }}
                      >
                        {isMultiSelect && currentSlot?.slotCode && selectedSlotCodes.includes(currentSlot.slotCode) && (
                          <div className="absolute inset-0 z-10 flex items-center justify-center bg-blue-500/30 backdrop-blur-[1px]">
                            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-500 shadow">
                              <svg className="h-4 w-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} />
                              </svg>
                            </div>
                          </div>
                        )}
                        {currentSlot?.isBooked && currentSlot?.status?.toLowerCase() === 'confirmed' ? (
                          <div
                            className={composeClasses(
                              'flex h-full w-full flex-col items-center justify-center gap-1.5 rounded-[8px] p-4 text-center',
                              currentSlot?.booking?.bookingStatus?.toLowerCase() === 'completed'
                                ? 'bg-[#43a047] text-white'
                                : currentSlot?.booking?.guests && currentSlot.booking.guests.length > 0
                                  ? 'bg-[#F97316] text-white'
                                  : currentSlot?.booking?.coach?.name
                                    ? 'bg-[#006A68] text-white'
                                    : 'bg-[#21295A] text-white'
                            )}
                          >
                            <span className="font-medium leading-tight">
                              {getDisplayName(currentSlot?.booking?.user)}
                            </span>
                            {currentSlot?.booking?.guests && currentSlot.booking.guests.length > 0 && (
                              <span className="text-[12px] font-semibold opacity-90">
                                {currentSlot.booking.guests.length} Guest
                                {currentSlot.booking.guests.length > 1 ? 's' : ''}
                              </span>
                            )}
                            {currentSlot?.booking?.coach?.name && (
                              <span className="text-[12px] font-semibold opacity-90">
                                Coach: {currentSlot.booking.coach.name}
                              </span>
                            )}
                          </div>
                        ) : !currentSlot?.isBooked && currentSlot?.status?.toLowerCase() === 'disabled' ? (
                          <div
                            className="h-full w-full rounded-[8px] bg-cover bg-center"
                            style={{ backgroundImage: "url('/assets/svg/slot_bg.svg')" }}
                          />
                        ) : currentSlot?.status?.toLowerCase() === 'available' ? (
                          <div className={composeClasses('h-full w-full', zebraBgClass)} />
                        ) : null}
                      </button>
                    );
                  })}
                </Fragment>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Multi-Block Modal */}
      <MultiBlockModal
        isLoading={isBlockLaneLoading}
        isOpen={showMultiBlockModal}
        slotCount={selectedSlotCodes.length}
        onClose={() => setShowMultiBlockModal(false)}
        onConfirm={handleMultiAction}
      />

      {/* Block Time Slot Modal */}
      {selectedTimeSlot && (
        <BlockTimeSlotModal
          date={date}
          isBlocked={lanes.every(lane => lane.slots[selectedTimeSlot.slotIndex]?.status?.toLowerCase() === 'disabled')}
          isLoading={isBlockLaneLoading}
          isOpen={!!selectedTimeSlot}
          laneCount={lanes.length}
          startTime={formatTimeSlot(selectedTimeSlot.startTime)}
          onClose={() => setSelectedTimeSlot(null)}
          onConfirm={handleBlockTimeSlot}
        />
      )}

      {/* Lane Modal */}
      {selectedLane && (
        <LaneDetailsModal
          isLoading={isBlockLaneLoading}
          isOpen={!!selectedLane}
          lane={selectedLane}
          onClose={handleCloseModal}
          onLaneClick={handleUnblockLane}
        />
      )}

      {/* Slot Modal */}
      {selectedSlot && (
        <SlotDetailsModal
          isLoading={isBlockLaneLoading}
          isOpen={!!selectedSlot}
          laneNo={selectedSlot.laneNo}
          nextTimeSlot={timeSlots[selectedSlot.slotIndex + 1] || null}
          slot={selectedSlot.slot}
          timeSlot={timeSlots[selectedSlot.slotIndex]}
          onBlockSlot={handleBlockSlot}
          onClose={handleCloseSlotModal}
          onUnblockSlot={handleUnblockSlot}
        />
      )}

      {/* Legend */}
      <div className="mt-4 flex flex-wrap items-center gap-4 rounded-[10px] border border-[#E2E8F0] bg-white px-4 py-3 desktop:px-5 desktop:py-4">
        <div className="flex items-center gap-2">
          <div className="h-6 w-6 rounded bg-[#DCEDED]"></div>
          <span className="text-[13px] font-medium text-[#1E293B] desktop:text-[14px]">Available</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-6 w-6 rounded bg-[#21295A]"></div>
          <span className="text-[13px] font-medium text-[#1E293B] desktop:text-[14px]">Booked</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-6 w-6 rounded bg-[#006A68]"></div>
          <span className="text-[13px] font-medium text-[#1E293B] desktop:text-[14px]">Booked with Coach</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-6 w-6 rounded bg-[#F97316]"></div>
          <span className="text-[13px] font-medium text-[#1E293B] desktop:text-[14px]">Booked with Guest(s)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-6 w-6 rounded bg-[#43a047]"></div>
          <span className="text-[13px] font-medium text-[#1E293B] desktop:text-[14px]">Completed</span>
        </div>
        <div className="flex items-center gap-2">
          <div
            className="h-6 w-6 rounded bg-cover bg-center"
            style={{ backgroundImage: "url('/assets/svg/slot_bg.svg')" }}
          ></div>
          <span className="text-[13px] font-medium text-[#1E293B] desktop:text-[14px]">Blocked</span>
        </div>
      </div>
    </div>
  );
};

export default CalendarBody;
