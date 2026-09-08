import { EVENT_TYPE_CONFIG } from '../../../store/calendar/eventTypeConfig';
import { CalendarEvent } from '../../../store/calendar/types';
import { formatDateTimeAsAuthored, formatTimeRangeAsAuthored } from '../../../utils/dateUtils';

interface DetailRowProps {
  label: string;
  value?: string;
}

const DetailRow = ({ label, value }: DetailRowProps) => {
  if (!value) return null;
  return (
    <div className="flex justify-between gap-4 py-1.5">
      <span className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">{label}</span>
      <span className="text-right text-[13px] font-medium text-[#21295A]">{value}</span>
    </div>
  );
};

/** "BLR01-L2" / "LANE_HOU01_L001" / "L3" → "Lane 2" — just the number, not the facility
 * prefix, matching the "Lane N" label already used for Coach Booking events. */
const laneLabel = (laneCode?: string): string | undefined => {
  const m = laneCode ? /L(\d+)/.exec(laneCode) : null;
  return m ? `Lane ${Number(m[1])}` : laneCode;
};

interface EventDetailModalProps {
  event: CalendarEvent | null;
  onClose: () => void;
}

/** Renders the meta fields relevant to the event's source type (see meta shape in normalize.ts). */
const MetaFields = ({ event }: { event: CalendarEvent }) => {
  const { meta } = event;

  // Every branch below uses formatTimeRangeAsAuthored/formatDateTimeAsAuthored,
  // NOT the Chicago-hardcoded formatters — a booking's start/end times carry
  // the FACILITY'S OWN local offset (e.g. +05:30 for an India centre), so this
  // calendar must show exactly the time each respective module recorded, not a
  // time converted into a fixed US timezone. See formatTimeRangeAsAuthored's
  // doc comment in dateUtils.ts for the full reasoning.

  if (event.type === 'booking') {
    const user = meta.user as { firstName?: string; lastName?: string; email?: string; phone?: string } | undefined;
    const name = `${user?.firstName ?? ''} ${user?.lastName ?? ''}`.trim();
    return (
      <>
        <DetailRow label="Name" value={name || undefined} />
        <DetailRow label="Email" value={user?.email} />
        <DetailRow label="Phone" value={user?.phone} />
        <DetailRow label="Lane" value={laneLabel(meta.laneCode as string | undefined)} />
        <DetailRow label="Status" value={meta.bookingStatus as string | undefined} />
        <DetailRow label="Time" value={formatTimeRangeAsAuthored(event.start, event.end)} />
      </>
    );
  }

  if (event.type === 'induction' || event.type === 'tour') {
    const name = `${meta.firstName ?? ''} ${meta.lastName ?? ''}`.trim();
    const timeSlot = meta.timeSlot as { startTime?: string; endTime?: string } | undefined;
    return (
      <>
        <DetailRow label="Name" value={name || undefined} />
        <DetailRow label="Email" value={meta.email as string | undefined} />
        <DetailRow label="Phone" value={meta.phone as string | undefined} />
        <DetailRow label="Facility" value={meta.facilityCode as string | undefined} />
        <DetailRow label="Status" value={meta.status as string | undefined} />
        {timeSlot?.startTime && timeSlot?.endTime && (
          <DetailRow label="Time" value={formatTimeRangeAsAuthored(timeSlot.startTime, timeSlot.endTime)} />
        )}
      </>
    );
  }

  // coach_booking
  return (
    <>
      <DetailRow label="Booked By" value={(meta.memberName as string | undefined) || 'Booking details unavailable'} />
      <DetailRow label="Email" value={meta.memberEmail as string | undefined} />
      <DetailRow label="Phone" value={meta.memberPhone as string | undefined} />
      <DetailRow label="Coach" value={meta.coachName as string | undefined} />
      <DetailRow label="Lane" value={typeof meta.laneNo === 'number' ? `Lane ${meta.laneNo}` : undefined} />
      <DetailRow
        label="Time"
        value={formatTimeRangeAsAuthored(meta.startTime as string | undefined, meta.endTime as string | undefined)}
      />
    </>
  );
};

const EventDetailModal = ({ event, onClose }: EventDetailModalProps) => {
  if (!event) return null;
  const typeConfig = EVENT_TYPE_CONFIG[event.type];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-sm overflow-hidden rounded-2xl bg-white shadow-2xl" role="dialog">
        <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
          <div className="flex items-center gap-2">
            <span
              aria-hidden
              className="inline-block h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: typeConfig.color }}
            />
            <h3 className="text-[15px] font-bold text-[#21295A]">{typeConfig.label}</h3>
          </div>
          <button
            aria-label="Close"
            className="text-gray-400 transition hover:text-gray-600"
            type="button"
            onClick={onClose}
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path d="M6 18L18 6M6 6l12 12" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} />
            </svg>
          </button>
        </div>
        <div className="px-5 py-4">
          <p className="mb-2 text-[15px] font-semibold text-[#21295A]">{event.title}</p>
          <p className="mb-3 text-[12px] text-gray-400">{formatDateTimeAsAuthored(event.start)}</p>
          <div className="divide-y divide-gray-50">
            <MetaFields event={event} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default EventDetailModal;
