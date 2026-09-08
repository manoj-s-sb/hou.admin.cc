import { safeDate } from '../../utils/dateUtils';
import { Induction } from '../induction/types';
import { Coach, GetSlotsResponse } from '../slots/types';

import { EVENT_TYPE_CONFIG } from './eventTypeConfig';
import { CalendarEvent } from './types';

/**
 * Pure, framework-free normalization/merging for the Calendar feature. Kept
 * separate from the Redux thunk (api.ts) so it can be unit tested without any
 * store/network setup — see normalize.test.ts.
 */

const isValidTimeSlot = (startTime?: string, endTime?: string): boolean =>
  Boolean(safeDate(startTime) && safeDate(endTime));

/** Induction bookings come from `POST admin/bookings/list` with type "inductionbooking". */
export const normalizeInductionEvent = (item: Induction): CalendarEvent | null => {
  if (!isValidTimeSlot(item.timeSlot?.startTime, item.timeSlot?.endTime)) return null;
  const name = `${item.firstName ?? ''} ${item.lastName ?? ''}`.trim();
  return {
    id: `induction-${item.bookingCode || item.userId}`,
    title: name || 'Induction',
    start: item.timeSlot.startTime,
    end: item.timeSlot.endTime,
    type: 'induction',
    color: EVENT_TYPE_CONFIG.induction.color,
    meta: { ...item },
  };
};

/**
 * Tour bookings come from the SAME `POST admin/bookings/list` endpoint with
 * type "tourbooking" — there is no separate tours API. See booking_service.py.
 */
export const normalizeTourEvent = (item: Induction): CalendarEvent | null => {
  if (!isValidTimeSlot(item.timeSlot?.startTime, item.timeSlot?.endTime)) return null;
  const name = `${item.firstName ?? ''} ${item.lastName ?? ''}`.trim();
  return {
    id: `tour-${item.bookingCode || item.userId}`,
    title: name || 'Tour',
    start: item.timeSlot.startTime,
    end: item.timeSlot.endTime,
    type: 'tour',
    color: EVENT_TYPE_CONFIG.tour.color,
    meta: { ...item },
  };
};

/**
 * Coach bookings come from `POST admin/coach/calendar`, which returns every
 * coach's full day-by-day slot grid (available, disabled, AND booked). The
 * endpoint doesn't expose which member booked a slot — only `status`/`bookingId`
 * mark it taken — so a coach_booking event's meta is limited to the coach + slot,
 * unlike induction/tour events which carry full member details.
 *
 * IMPORTANT: `isAvailable: false` is NOT the same as "booked" — it's also set on
 * non-bookable 'disabled' placeholder slots (e.g. off-hours), which would
 * otherwise flood the calendar with fake "Booked" entries every day. Only
 * status === 'confirmed' (equivalently, bookingId being set) is a real booking.
 */
export const extractCoachBookingEvents = (coaches: Coach[]): CalendarEvent[] => {
  const events: CalendarEvent[] = [];
  for (const coach of coaches ?? []) {
    for (const day of coach.availability ?? []) {
      for (const slot of day.slots ?? []) {
        if (slot.status !== 'confirmed' && !slot.bookingId) continue; // only real bookings are "events"
        if (!isValidTimeSlot(slot.startTime, slot.endTime)) continue;
        events.push({
          id: `coach-${slot.coachSlotCode}`,
          title: `${coach.name || coach.coachCode} — Booked`,
          start: slot.startTime,
          end: slot.endTime,
          type: 'coach_booking',
          color: EVENT_TYPE_CONFIG.coach_booking.color,
          meta: {
            coachCode: coach.coachCode,
            coachName: coach.name,
            laneNo: slot.laneNo,
            memberName: slot.memberName,
            memberEmail: slot.memberEmail,
            memberPhone: slot.memberPhone,
            date: day.date,
            startTime: slot.startTime,
            endTime: slot.endTime,
          },
        });
      }
    }
  }
  return events;
};

/**
 * Slot bookings come from `POST admin/slots/calendar` (the same endpoint the
 * Slot Bookings admin page uses), called with a startDate/endDate range and
 * returning one day-grid (lanes -> slots) per date. Only booked slots become
 * events; an available/unbooked slot isn't a calendar event.
 */
export const extractSlotBookingEvents = (days: GetSlotsResponse[]): CalendarEvent[] => {
  const events: CalendarEvent[] = [];
  for (const day of days ?? []) {
    for (const lane of day.lanes ?? []) {
      for (const slot of lane.slots ?? []) {
        if (!slot.isBooked || !slot.booking) continue;
        if (!isValidTimeSlot(slot.startTime, slot.endTime)) continue;
        const { user } = slot.booking;
        const name = `${user?.firstName ?? ''} ${user?.lastName ?? ''}`.trim();
        events.push({
          id: `booking-${slot.booking.bookingCode || slot.slotCode}`,
          title: name || 'Slot Booking',
          start: slot.startTime,
          end: slot.endTime,
          type: 'booking',
          color: EVENT_TYPE_CONFIG.booking.color,
          meta: { ...slot.booking, slotCode: slot.slotCode, laneCode: lane.laneCode, date: day.date },
        });
      }
    }
  }
  return events;
};

/** Merges the four source lists into one normalized, sorted event list. */
export const mergeCalendarEvents = (
  inductions: Induction[],
  tours: Induction[],
  coaches: Coach[],
  slotBookingDays: GetSlotsResponse[] = []
): CalendarEvent[] => {
  const events: CalendarEvent[] = [
    ...(inductions ?? []).map(normalizeInductionEvent),
    ...(tours ?? []).map(normalizeTourEvent),
    ...extractCoachBookingEvents(coaches),
    ...extractSlotBookingEvents(slotBookingDays),
  ].filter((e): e is CalendarEvent => e !== null);

  // Cross-day order stays purely chronological. WITHIN the same day, Coach
  // Booking always sorts after every other type — react-big-calendar stacks a
  // day cell's events in this array's order, and Coach Booking chips should
  // appear at the bottom of that stack, not interleaved by time.
  return events.sort((a, b) => {
    const aDay = a.start.slice(0, 10);
    const bDay = b.start.slice(0, 10);
    if (aDay !== bDay) return new Date(a.start).getTime() - new Date(b.start).getTime();
    const aCoach = a.type === 'coach_booking' ? 1 : 0;
    const bCoach = b.type === 'coach_booking' ? 1 : 0;
    if (aCoach !== bCoach) return aCoach - bCoach;
    return new Date(a.start).getTime() - new Date(b.start).getTime();
  });
};
