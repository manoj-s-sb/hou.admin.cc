import { Fragment } from 'react';

import { BookingUser, Lanes } from '../../../store/slots/types';

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

const CalendarBody = ({ lanes, timeSlots }: { lanes: Lanes[]; timeSlots: string[] }) => {
  return (
    <div className="rounded-[10px] bg-white">
      <div className="grid" style={{ gridTemplateColumns: `110px repeat(${lanes.length}, minmax(0, 1fr))` }}>
        <div className="flex min-h-[70px] min-w-[110px] items-center justify-center border border-[#B3DADA] bg-[#fff] px-5 py-4 text-[15px] font-semibold text-[#21295A]">
          Lane No
        </div>
        {lanes.map((lane, laneIdx) => (
          <div
            key={lane.laneNo}
            className={composeClasses(
              'flex min-h-[70px] min-w-[110px] flex-col items-center justify-center gap-2 border border-[#B3DADA] bg-[#fff] px-5 py-4 text-center text-[13px] font-semibold text-slate-600',
              laneIdx !== 0 && 'border-l-0'
            )}
          >
            <span className="text-[15px] font-medium text-[#21295A]">{formatLaneType(lane.laneType)}</span>
            <span className="text-[14px] font-semibold text-[#21295A]">Lane {lane.laneNo}</span>
          </div>
        ))}
      </div>
      <div className="grid" style={{ gridTemplateColumns: `110px repeat(${lanes.length}, minmax(0, 1fr))` }}>
        {timeSlots.map((slot, slotIdx) => (
          <Fragment key={slot}>
            <div
              className={composeClasses(
                'flex min-h-[70px] min-w-[110px] items-center justify-center border border-[#B3DADA] bg-[#fff] px-10 py-6 text-[14px] font-medium text-[#212295A]',
                slotIdx !== 0 && 'border-t-0'
              )}
            >
              {slot}
            </div>
            {lanes.map((lane, laneIdx) => {
              const currentSlot = lane.slots[slotIdx];
              const zebraBgClass = slotIdx % 2 === 0 ? 'bg-[#DCEDED]' : 'bg-[#E6F3F3]'; // zebra pattern per row for available slots
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
                  {/* <div className="h-full w-full bg-green-500" /> */}

                  {currentSlot?.isBooked && currentSlot?.status?.toLowerCase() === 'confirmed' ? (
                    <div className="flex h-full w-full items-center justify-between rounded-[8px] bg-[#21295A] p-4 text-center align-middle text-white">
                      {getDisplayName(currentSlot?.booking?.user)}
                      <span
                        className="flex rotate-180 items-center justify-center pt-1 text-[15px] font-semibold"
                        role="button"
                        tabIndex={0}
                        onClick={() => alert('Alert button clicked')}
                        onKeyDown={e => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            alert('Alert button clicked');
                          }
                        }}
                      >
                        ...
                      </span>
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
  );
};

export default CalendarBody;
