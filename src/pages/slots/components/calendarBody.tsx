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

const formatTimeSlot = (timeSlot: string): string => {
  if (!timeSlot) return timeSlot;
  if (/^\d{2}:\d{2}$/.test(timeSlot)) return timeSlot;
  if (/^\d+\.\d+$/.test(timeSlot)) {
    const [hours, minutes] = timeSlot.split('.');
    return `${hours.padStart(2, '0')}:${minutes.padStart(2, '0')}`;
  }
  const parsed = moment(timeSlot);
  if (parsed.isValid()) return parsed.format('HH:mm');
  return timeSlot;
};

const getDisplayName = (user?: BookingUser) => {
  const firstName = user?.firstName?.trim();
  const lastName = user?.lastName?.trim();
  if (!firstName && !lastName) return '';
  if ((firstName?.length ?? 0) > 10) return firstName ?? '';
  return [firstName, lastName].filter(Boolean).join(' ');
};

interface CalendarBodyProps {
  lanes: Lanes[];
  timeSlots: string[];
  date: string;
  facilityCode: string;
}

const AVAILABLE_ODD = 'bg-[#EEF7F7]';
const AVAILABLE_EVEN = 'bg-[#F5FAFA]';

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

  const handleCloseModal = () => setSelectedLane(null);

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
          ? `Time slot ${selectedTimeSlot.startTime} unblocked across all lanes!`
          : `Time slot ${selectedTimeSlot.startTime} blocked across all lanes!`,
        { duration: 4000 }
      );
      setSelectedTimeSlot(null);
    } catch (error: any) {
      toast.error(error?.message || 'Failed to update time slot status.', { duration: 5000 });
    }
  };

  const handleUnblockLane = async (blockReason?: string, blockLaneApp?: boolean) => {
    if (selectedLane) {
      try {
        const isLaneBlocked = selectedLane.slots.some(slot => slot.status?.toLowerCase() === 'disabled');
        const action = isLaneBlocked ? 'available' : 'disable';
        const reason = isLaneBlocked ? 'Manual unblock from admin' : blockReason || 'Manual block from admin';
        await dispatch(
          updateLaneStatus({ date, facilityCode, laneCode: selectedLane.laneCode, action, reason, blockLaneApp })
        ).unwrap();
        await dispatch(getSlots({ date, facilityCode }));
        toast.success(
          isLaneBlocked
            ? `Lane ${selectedLane.laneNo} unblocked successfully!`
            : `Lane ${selectedLane.laneNo} blocked successfully!`,
          { duration: 4000 }
        );
        setSelectedLane(null);
      } catch (error: any) {
        toast.error(error?.message || 'Failed to update lane status.', { duration: 5000 });
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

    if (selectedSlotCodes.includes(slot.slotCode)) {
      const next = selectedSlotCodes.filter(c => c !== slot.slotCode);
      setSelectedSlotCodes(next);
      if (next.length === 0) setSelectionType(null);
      return;
    }

    if (selectionType === null) {
      setSelectionType(slotType);
      setSelectedSlotCodes([slot.slotCode]);
      return;
    }

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
      toast.error(error?.message || 'Failed to update slots.', { duration: 5000 });
    }
  };

  const handleSlotClick = (slot: Slot, lane: Lanes, slotIndex: number) => {
    if (isMultiSelect) {
      handleMultiSlotToggle(slot);
      return;
    }
    setSelectedSlot({ slot, laneNo: lane.laneNo, laneCode: lane.laneCode, slotIndex });
  };

  const handleCloseSlotModal = () => setSelectedSlot(null);

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
        await dispatch(getSlots({ date, facilityCode }));
        toast.success('Slot blocked successfully!', { duration: 4000 });
        setSelectedSlot(null);
      } catch (error: any) {
        toast.error(error?.message || 'Failed to block slot.', { duration: 5000 });
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
        await dispatch(getSlots({ date, facilityCode }));
        toast.success('Slot unblocked successfully!', { duration: 4000 });
        setSelectedSlot(null);
      } catch (error: any) {
        toast.error(error?.message || 'Failed to unblock slot.', { duration: 5000 });
      }
    }
  };

  // Shared slot cell renderer
  const renderSlotCell = (currentSlot: Slot, slotIdx: number, lane: Lanes, laneIdx: number, isMobile: boolean) => {
    const zebraBg = slotIdx % 2 === 0 ? AVAILABLE_ODD : AVAILABLE_EVEN;
    const minH = isMobile ? 'min-h-[60px] min-w-[95px]' : 'min-h-[68px] min-w-[110px]';
    const isSelected = isMultiSelect && currentSlot?.slotCode && selectedSlotCodes.includes(currentSlot.slotCode);

    return (
      <button
        key={`${slotIdx}-${lane.laneNo}`}
        className={composeClasses(
          `relative flex ${minH} items-center justify-center border-b border-r border-gray-200 bg-transparent p-1 transition`,
          slotIdx === 0 && 'border-t-0',
          laneIdx === 0 && 'border-l-0',
          !isSelected && 'hover:brightness-95'
        )}
        type="button"
        onClick={() => handleSlotClick(currentSlot, lane, slotIdx)}
      >
        {isSelected && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-blue-500/25">
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-500 shadow-md">
              <svg className="h-3.5 w-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} />
              </svg>
            </div>
          </div>
        )}

        {currentSlot?.isBooked && currentSlot?.status?.toLowerCase() === 'confirmed' ? (
          <div
            className={composeClasses(
              'flex h-full w-full flex-col items-center justify-center gap-1 rounded-md px-2 py-2 text-center leading-tight',
              isMobile ? 'text-[10px]' : 'text-[12px]',
              currentSlot?.booking?.bookingStatus?.toLowerCase() === 'completed'
                ? 'bg-[#43a047] text-white'
                : currentSlot?.booking?.guests && currentSlot.booking.guests.length > 0
                  ? 'bg-[#F97316] text-white'
                  : currentSlot?.booking?.coach?.name
                    ? 'bg-[#006A68] text-white'
                    : 'bg-[#21295A] text-white'
            )}
          >
            <span className="font-semibold">{getDisplayName(currentSlot?.booking?.user)}</span>
            {currentSlot?.booking?.guests && currentSlot.booking.guests.length > 0 && (
              <span className={composeClasses('font-medium opacity-90', isMobile ? 'text-[9px]' : 'text-[11px]')}>
                {currentSlot.booking.guests.length} Guest{currentSlot.booking.guests.length > 1 ? 's' : ''}
              </span>
            )}
            {currentSlot?.booking?.coach?.name && (
              <span className={composeClasses('font-medium opacity-90', isMobile ? 'text-[9px]' : 'text-[11px]')}>
                Coach: {currentSlot.booking.coach.name}
              </span>
            )}
          </div>
        ) : !currentSlot?.isBooked && currentSlot?.status?.toLowerCase() === 'disabled' ? (
          <div
            className="h-full w-full rounded-md bg-cover bg-center opacity-80"
            style={{ backgroundImage: "url('/assets/svg/slot_bg.svg')" }}
          />
        ) : (
          <div className={composeClasses('h-full w-full rounded-sm', zebraBg)} />
        )}
      </button>
    );
  };

  // Shared lane header cell
  const renderLaneHeader = (lane: Lanes, isMobile: boolean) => (
    <div
      key={lane.laneNo}
      className="relative flex min-h-[60px] w-full flex-col items-center justify-center border-b border-r border-gray-200 bg-white px-3 py-3 text-center"
    >
      <span className={composeClasses('font-semibold text-[#21295A]', isMobile ? 'text-[11px]' : 'text-[13px]')}>
        {formatLaneType(lane.laneType)}
      </span>
      <span className={composeClasses('font-medium text-gray-500', isMobile ? 'text-[10px]' : 'text-[12px]')}>
        Lane {lane.laneNo}
      </span>
      <span
        className="absolute right-1 top-1/2 -translate-y-1/2 rotate-90 cursor-pointer px-1 text-[16px] font-bold text-gray-400 hover:text-[#21295A]"
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
  );

  // Shared time label cell
  const renderTimeCell = (slot: string, slotIdx: number, isMobile: boolean) => (
    <div
      className={composeClasses(
        'group sticky left-0 z-20 flex min-h-[60px] items-center justify-center border-b border-r border-gray-200 bg-white shadow-[1px_0_0_#e5e7eb]',
        isMobile ? 'min-w-[68px] px-1' : 'min-w-[100px] px-2'
      )}
    >
      <span className={composeClasses('font-medium text-gray-600', isMobile ? 'text-[11px]' : 'text-[13px]')}>
        {formatTimeSlot(slot)}
      </span>
      <span
        className="absolute right-0.5 top-1/2 -translate-y-1/2 rotate-90 cursor-pointer px-0.5 text-[15px] font-bold text-gray-400 opacity-0 transition hover:text-[#21295A] group-hover:opacity-100"
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
        ...
      </span>
    </div>
  );

  return (
    <div className="rounded-lg bg-white">
      {/* ── Multi-select toolbar ──────────────────────────────── */}
      <div className="mb-3 flex items-center justify-between">
        <button
          className={composeClasses(
            'flex items-center gap-2 rounded-lg border px-3 py-1.5 text-[12px] font-semibold transition-all',
            isMultiSelect
              ? 'border-[#21295A] bg-[#21295A] text-white'
              : 'border-gray-200 bg-white text-[#21295A] hover:border-[#21295A] hover:bg-gray-50'
          )}
          type="button"
          onClick={toggleMultiSelect}
        >
          <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
            />
          </svg>
          {isMultiSelect ? 'Cancel' : 'Multi-Select'}
        </button>

        {isMultiSelect && selectedSlotCodes.length > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-[12px] font-medium text-gray-500">
              {selectedSlotCodes.length} slot{selectedSlotCodes.length !== 1 ? 's' : ''} selected
            </span>
            <button
              className="rounded-lg border border-gray-200 px-2.5 py-1 text-[11px] font-medium text-gray-500 hover:bg-gray-50"
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
                className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-[12px] font-semibold text-white hover:bg-blue-700"
                type="button"
                onClick={() => handleMultiAction()}
              >
                Unblock Selected
              </button>
            ) : (
              <button
                className="flex items-center gap-1.5 rounded-lg bg-red-500 px-3 py-1.5 text-[12px] font-semibold text-white hover:bg-red-600"
                type="button"
                onClick={() => setShowMultiBlockModal(true)}
              >
                Block Selected
              </button>
            )}
          </div>
        )}

        {isMultiSelect && selectedSlotCodes.length === 0 && (
          <p className="text-[11px] text-gray-400">Click any slot to start selecting</p>
        )}
      </div>

      {/* ── Grid ─────────────────────────────────────────────── */}
      <div className="relative max-h-[calc(45vh)] overflow-x-auto overflow-y-auto rounded-lg border border-gray-200 desktop:max-h-[calc(58vh)]">
        <div className="min-w-fit">
          {/* Mobile */}
          <div className="desktop:hidden">
            <div className="sticky top-0 z-30 grid" style={gridTemplateColumnsMobile}>
              <div className="sticky left-0 z-40 flex min-h-[60px] min-w-[68px] items-center justify-center border-b border-r border-gray-200 bg-gray-50 px-2 text-[11px] font-bold text-[#21295A]">
                Lane
              </div>
              {lanes.map(lane => renderLaneHeader(lane, true))}
            </div>
            <div className="grid" style={gridTemplateColumnsMobile}>
              {timeSlots.map((slot, slotIdx) => (
                <Fragment key={slot}>
                  {renderTimeCell(slot, slotIdx, true)}
                  {lanes.map((lane, laneIdx) => renderSlotCell(lane.slots[slotIdx], slotIdx, lane, laneIdx, true))}
                </Fragment>
              ))}
            </div>
          </div>

          {/* Desktop */}
          <div className="hidden desktop:block">
            <div className="sticky top-0 z-30 grid" style={gridTemplateColumns}>
              <div className="sticky left-0 z-40 flex min-h-[60px] min-w-[100px] items-center justify-center border-b border-r border-gray-200 bg-gray-50 px-4 text-[13px] font-bold text-[#21295A]">
                Lane No
              </div>
              {lanes.map(lane => renderLaneHeader(lane, false))}
            </div>
            <div className="grid" style={gridTemplateColumns}>
              {timeSlots.map((slot, slotIdx) => (
                <Fragment key={slot}>
                  {renderTimeCell(slot, slotIdx, false)}
                  {lanes.map((lane, laneIdx) => renderSlotCell(lane.slots[slotIdx], slotIdx, lane, laneIdx, false))}
                </Fragment>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── Legend ───────────────────────────────────────────── */}
      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 px-1">
        {[
          { color: 'bg-[#EEF7F7]', label: 'Available', border: true },
          { color: 'bg-[#21295A]', label: 'Booked', border: false },
          { color: 'bg-[#006A68]', label: 'With Coach', border: false },
          { color: 'bg-[#F97316]', label: 'With Guest(s)', border: false },
          { color: 'bg-[#43a047]', label: 'Completed', border: false },
        ].map(item => (
          <div key={item.label} className="flex items-center gap-1.5">
            <span
              className={composeClasses('h-3 w-3 rounded-sm', item.color, item.border && 'border border-gray-300')}
            />
            <span className="text-[11px] font-medium text-gray-500">{item.label}</span>
          </div>
        ))}
        <div className="flex items-center gap-1.5">
          <div
            className="h-3 w-3 rounded-sm border border-gray-200 bg-cover bg-center"
            style={{ backgroundImage: "url('/assets/svg/slot_bg.svg')" }}
          />
          <span className="text-[11px] font-medium text-gray-500">Blocked</span>
        </div>
      </div>

      {/* ── Modals ───────────────────────────────────────────── */}
      <MultiBlockModal
        isLoading={isBlockLaneLoading}
        isOpen={showMultiBlockModal}
        slotCount={selectedSlotCodes.length}
        onClose={() => setShowMultiBlockModal(false)}
        onConfirm={handleMultiAction}
      />

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

      {selectedLane && (
        <LaneDetailsModal
          isLoading={isBlockLaneLoading}
          isOpen={!!selectedLane}
          lane={selectedLane}
          onClose={handleCloseModal}
          onLaneClick={handleUnblockLane}
        />
      )}

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
    </div>
  );
};

export default CalendarBody;
