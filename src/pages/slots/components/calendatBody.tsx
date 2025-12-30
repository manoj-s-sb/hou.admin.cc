import { Fragment, useState } from 'react';

import { jwtDecode } from 'jwt-decode';
import moment from 'moment';
import { toast } from 'react-hot-toast';
import { useDispatch, useSelector } from 'react-redux';

import { getSlots, updateLaneStatus } from '../../../store/slots/api';
import { BookingUser, Lanes, Slot } from '../../../store/slots/types';
import { AppDispatch, RootState } from '../../../store/store';

import LaneDetailsModal from './LaneDetailsModal';
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
  const [selectedSlot, setSelectedSlot] = useState<{
    slot: Slot;
    laneNo: number;
    laneCode: string;
    slotIndex: number;
  } | null>(null);

  const decodeUserType = () => {
    const tokens = localStorage.getItem('tokens');
    if (tokens) {
      const decodedToken: any = jwtDecode(JSON.parse(tokens).access_token);
      return decodedToken?.userType?.[0];
    }
    return null;
  };

  const isStanceBeamAdmin = decodeUserType() === 'stancebeamadmin';

  const gridTemplateColumns = { gridTemplateColumns: `110px repeat(${lanes.length}, minmax(180px, 1fr))` };
  const gridTemplateColumnsMobile = { gridTemplateColumns: `75px repeat(${lanes.length}, minmax(140px, 1fr))` };

  const handleMenuClick = (lane: Lanes, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedLane(lane);
  };

  const handleCloseModal = () => {
    setSelectedLane(null);
  };

  const handleUnblockLane = async () => {
    if (selectedLane) {
      try {
        // Check if lane is currently blocked (all slots are disabled)
        const isLaneBlocked = selectedLane.slots.some(slot => slot.status?.toLowerCase() === 'disabled');
        const action = isLaneBlocked ? 'available' : 'disable';
        const reason = isLaneBlocked ? 'Manual unblock from admin' : 'Manual block from admin';

        await dispatch(
          updateLaneStatus({
            date,
            facilityCode,
            laneCode: selectedLane.laneCode,
            action,
            reason,
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

  const handleSlotClick = (slot: Slot, lane: Lanes, slotIndex: number) => {
    // Only open modal for booked slots to show booking details
    // For available/blocked slots, only StanceBeam admins can interact
    if (slot.isBooked && slot.status?.toLowerCase() === 'confirmed') {
      setSelectedSlot({ slot, laneNo: lane.laneNo, laneCode: lane.laneCode, slotIndex });
    } else if (isStanceBeamAdmin) {
      setSelectedSlot({ slot, laneNo: lane.laneNo, laneCode: lane.laneCode, slotIndex });
    }
  };

  const handleCloseSlotModal = () => {
    setSelectedSlot(null);
  };

  const handleBlockSlot = async () => {
    if (selectedSlot) {
      try {
        await dispatch(
          updateLaneStatus({
            action: 'disable',
            reason: 'Manual block from admin',
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
                  {isStanceBeamAdmin && (
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
                  )}
                </div>
              ))}
            </div>
            {/* Time Slots Grid */}
            <div className="grid" style={gridTemplateColumnsMobile}>
              {timeSlots.map((slot, slotIdx) => (
                <Fragment key={slot}>
                  <div
                    className={composeClasses(
                      'sticky left-0 z-20 flex min-h-[65px] min-w-[75px] items-center justify-center border border-[#B3DADA] bg-[#fff] px-2 py-4 text-[11px] font-medium text-[#212295A] shadow-[2px_0_4px_rgba(0,0,0,0.05)]',
                      slotIdx !== 0 && 'border-t-0'
                    )}
                  >
                    {formatTimeSlot(slot)}
                  </div>
                  {lanes.map((lane, laneIdx) => {
                    const currentSlot = lane.slots[slotIdx];
                    const zebraBgClass = slotIdx % 2 === 0 ? 'bg-[#DCEDED]' : 'bg-[#E6F3F3]';
                    return (
                      <button
                        key={`${slot}-${lane.laneNo}`}
                        className={composeClasses(
                          'flex min-h-[65px] min-w-[95px] items-center justify-center border border-[#B3DADA] bg-[transparent] text-[11px] font-medium text-[#21295A] transition hover:border-[#B3DADA] hover:bg-[#fff] hover:text-[#21295A]',
                          slotIdx !== 0 && 'border-t-0',
                          laneIdx !== 0 && 'border-l-0'
                        )}
                        type="button"
                        onClick={() => handleSlotClick(currentSlot, lane, slotIdx)}
                      >
                        {currentSlot?.isBooked && currentSlot?.status?.toLowerCase() === 'confirmed' ? (
                          <div
                            className={composeClasses(
                              'flex h-full w-full flex-col items-center justify-center gap-1 rounded-[6px] px-2 py-2 text-center text-[11px] leading-tight',
                              // currentSlot?.booking?.bookingStatus?.toLowerCase() === 'completed'
                              //   ? 'bg-[#43a047] text-white'
                              currentSlot?.booking?.guests && currentSlot.booking.guests.length > 0
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
                  {isStanceBeamAdmin && (
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
                  )}
                </div>
              ))}
            </div>
            {/* Time Slots Grid */}
            <div className="grid" style={gridTemplateColumns}>
              {timeSlots.map((slot, slotIdx) => (
                <Fragment key={slot}>
                  <div
                    className={composeClasses(
                      'sticky left-0 z-20 flex min-h-[70px] min-w-[110px] items-center justify-center border border-[#B3DADA] bg-[#fff] px-4 py-6 text-[14px] font-medium text-[#212295A] shadow-[2px_0_4px_rgba(0,0,0,0.05)] sm:px-10',
                      slotIdx !== 0 && 'border-t-0'
                    )}
                  >
                    {formatTimeSlot(slot)}
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
                        {currentSlot?.isBooked && currentSlot?.status?.toLowerCase() === 'confirmed' ? (
                          <div
                            className={composeClasses(
                              'flex h-full w-full flex-col items-center justify-center gap-1.5 rounded-[8px] p-4 text-center',
                              // currentSlot?.booking?.bookingStatus?.toLowerCase() === 'completed'
                              //   ? 'bg-[#43a047] text-white'
                              currentSlot?.booking?.guests && currentSlot.booking.guests.length > 0
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
          isStanceBeamAdmin={isStanceBeamAdmin}
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
        {/* <div className="flex items-center gap-2">
          <div className="h-6 w-6 rounded bg-[#43a047]"></div>
          <span className="text-[13px] font-medium text-[#1E293B] desktop:text-[14px]">Completed</span>
        </div> */}
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
