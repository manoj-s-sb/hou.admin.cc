import { CalendarEventType } from './types';

/**
 * Single source of truth for how each event type is labelled and colored —
 * on the calendar grid itself and in the legend. Add a new source API's
 * event type here (and nowhere else) to give it a color.
 */
export const EVENT_TYPE_CONFIG: Record<CalendarEventType, { label: string; color: string }> = {
  booking: { label: 'Slot Booking', color: '#7c3aed' }, // violet-600
  induction: { label: 'Induction', color: '#2563eb' }, // blue-600
  tour: { label: 'Tour', color: '#16a34a' }, // green-600
  coach_booking: { label: 'Coach Booking', color: '#d97706' }, // amber-600
  gym_booking: { label: 'Gym Booking', color: '#db2777' }, // pink-600
  podcast_booking: { label: 'Podcast Booking', color: '#0891b2' }, // cyan-600
  meeting_booking: { label: 'Meeting Room Booking', color: '#ea580c' }, // orange-600
};

export const EVENT_TYPE_ORDER: CalendarEventType[] = [
  'booking',
  'induction',
  'tour',
  'coach_booking',
  'gym_booking',
  'podcast_booking',
  'meeting_booking',
];
