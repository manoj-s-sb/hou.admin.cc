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
  const gridTemplateColumns = { gridTemplateColumns: `110px repeat(${lanes.length}, minmax(0, 1fr))` };

  return (
    <div className="rounded-[10px] bg-white">
      <div className="overflow-x-auto">
        <div className="min-w-fit">
          <div className="sticky top-0 z-10 bg-white">
            <div className="grid" style={gridTemplateColumns}>
              <div className="flex min-h-[70px] min-w-[110px] items-center justify-center border border-[#B3DADA] bg-[#fff] px-5 py-4 text-[15px] font-semibold text-[#21295A]">
                Lane No
              </div>
              {lanes.map(lane => (
                <div
                  key={lane.laneNo}
                  className={composeClasses(
                    'relative flex min-h-[70px] min-w-[110px] w-full flex-row items-center justify-between gap-4 border border-l-0 border-[#B3DADA] bg-[#fff] px-5 py-4 text-center text-[13px] font-semibold text-slate-600'
                  )}
                >
                  <div className="flex flex-1 flex-col items-center justify-center gap-2">
                    <span className="text-[15px] font-medium text-[#21295A]">{formatLaneType(lane.laneType)}</span>
                    <span className="text-[14px] font-semibold text-[#21295A]">Lane {lane.laneNo}</span>
                  </div>
                  {/* <span
                    className="absolute right-0 flex h-8 w-8 items-center justify-center rounded-full pt-1 text-[15px] font-semibold z-10 rotate-90 top-[10px] cursor-pointer"
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
                  </span> */}
                </div>
              ))}
            </div>
          </div>
          <div className="max-h-[65vh] overflow-auto">
            <div className="grid" style={gridTemplateColumns}>
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
                            {/* <span
                              className="flex rotate-90 items-center justify-center pt-1 text-[15px] font-semibold z-10 cursor-pointer"
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
                            </span> */}
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
    </div>
  );
};

export default CalendarBody;
