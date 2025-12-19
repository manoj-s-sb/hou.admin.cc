import { Fragment, useState } from 'react';

import { toast } from 'react-hot-toast';
import { useDispatch } from 'react-redux';

import { getSlots, updateLaneStatus } from '../../../store/slots/api';
import { BookingUser, Lanes } from '../../../store/slots/types';
import { AppDispatch } from '../../../store/store';

import LaneDetailsModal from './LaneDetailsModal';

const composeClasses = (...classes: Array<string | false | null | undefined>) => classes.filter(Boolean).join(' ');
const formatLaneType = (type?: string) => (type ? `${type.charAt(0).toUpperCase()}${type.slice(1).toLowerCase()}` : '');

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
  const [selectedLane, setSelectedLane] = useState<Lanes | null>(null);
  const [isUpdatingLane, setIsUpdatingLane] = useState(false);

  const gridTemplateColumns = { gridTemplateColumns: `110px repeat(${lanes.length}, minmax(0, 1fr))` };
  const gridTemplateColumnsMobile = { gridTemplateColumns: `75px repeat(${lanes.length}, minmax(95px, 1fr))` };

  const handleMenuClick = (lane: Lanes, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedLane(lane);
  };

  const handleCloseModal = () => {
    setSelectedLane(null);
  };

  const handleUnblockLane = async () => {
    if (selectedLane) {
      setIsUpdatingLane(true);
      try {
        // Check if lane is currently blocked (all slots are disabled)
        const isLaneBlocked = selectedLane.slots.every(slot => slot.status?.toLowerCase() === 'disabled');
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
      } finally {
        setIsUpdatingLane(false);
      }
    }
  };

  return (
    <div className="rounded-[10px] bg-white">
      <div className="overflow-x-auto">
        <div className="min-w-fit">
          <div className="sticky top-0 z-10 bg-white">
            <div className="grid sm:hidden" style={gridTemplateColumnsMobile}>
              <div className="flex min-h-[65px] min-w-[75px] items-center justify-center border border-[#B3DADA] bg-[#fff] px-2 py-3 text-[12px] font-semibold text-[#21295A]">
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
                    className="absolute right-0 top-1/2 -translate-y-1/2 rotate-90 cursor-pointer rounded-full px-1 text-[20px] font-medium text-[#21295A] hover:bg-gray-100"
                    onClick={e => handleMenuClick(lane, e)}
                  >
                    ...
                  </span>
                </div>
              ))}
            </div>
            <div className="grid sm:grid" style={gridTemplateColumns}>
              <div className="flex min-h-[70px] min-w-[110px] items-center justify-center border border-[#B3DADA] bg-[#fff] px-5 py-4 text-[15px] font-semibold text-[#21295A]">
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
                    onClick={e => handleMenuClick(lane, e)}
                  >
                    ...
                  </span>
                </div>
              ))}
            </div>
          </div>
          <div className="max-h-[55vh] overflow-auto sm:max-h-[65vh]">
            <div className="grid sm:hidden" style={gridTemplateColumnsMobile}>
              {timeSlots.map((slot, slotIdx) => (
                <Fragment key={slot}>
                  <div
                    className={composeClasses(
                      'flex min-h-[65px] min-w-[75px] items-center justify-center border border-[#B3DADA] bg-[#fff] px-2 py-4 text-[11px] font-medium text-[#212295A]',
                      slotIdx !== 0 && 'border-t-0'
                    )}
                  >
                    {slot}
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
                      >
                        {currentSlot?.isBooked && currentSlot?.status?.toLowerCase() === 'confirmed' ? (
                          <div className="flex h-full w-full items-center justify-center rounded-[6px] bg-[#21295A] px-2 py-2 text-center text-[11px] leading-tight text-white">
                            {getDisplayName(currentSlot?.booking?.user)}
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
            <div className="grid sm:grid" style={gridTemplateColumns}>
              {timeSlots.map((slot, slotIdx) => (
                <Fragment key={slot}>
                  <div
                    className={composeClasses(
                      'flex min-h-[70px] min-w-[110px] items-center justify-center border border-[#B3DADA] bg-[#fff] px-4 py-6 text-[14px] font-medium text-[#212295A] sm:px-10',
                      slotIdx !== 0 && 'border-t-0'
                    )}
                  >
                    {slot}
                  </div>
                  {lanes.map((lane, laneIdx) => {
                    const currentSlot = lane.slots[slotIdx];
                    const zebraBgClass = slotIdx % 2 === 0 ? 'bg-[#DCEDED]' : 'bg-[#E6F3F3]';
                    return (
                      <button
                        key={`${slot}-${lane.laneNo}`}
                        className={composeClasses(
                          'flex min-h-[70px] min-w-[110px] items-center justify-center border border-[#B3DADA] bg-[transparent] text-[14px] font-medium text-[#21295A] transition hover:border-[#B3DADA] hover:bg-[#fff] hover:text-[#21295A]',
                          slotIdx !== 0 && 'border-t-0',
                          laneIdx !== 0 && 'border-l-0'
                        )}
                        type="button"
                      >
                        {currentSlot?.isBooked && currentSlot?.status?.toLowerCase() === 'confirmed' ? (
                          <div className="flex h-full w-full items-center justify-between rounded-[8px] bg-[#21295A] p-4 text-center text-white">
                            {getDisplayName(currentSlot?.booking?.user)}
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

      {/* Modal */}
      {selectedLane && (
        <LaneDetailsModal
          lane={selectedLane}
          isOpen={!!selectedLane}
          onClose={handleCloseModal}
          onLaneClick={handleUnblockLane}
          isLoading={isUpdatingLane}
        />
      )}
    </div>
  );
};

export default CalendarBody;
