export interface CalendarRangeRequest {
  startDate: string;
  endDate: string;
  /** Omit for the global (all-centres) view; pass to scope to one centre. */
  facilityCode?: string;
}

/** The four source APIs a calendar event can come from. */
export type CalendarEventType = 'booking' | 'induction' | 'tour' | 'coach_booking';

/**
 * Common shape every source API's response is normalized into (see
 * store/calendar/normalize.ts). start/end are kept as ISO strings — not `Date`
 * — so this stays plain, serializable Redux state; pages/calendar/index.tsx
 * converts them to `Date` only when handing events to react-big-calendar.
 */
export interface CalendarEvent {
  id: string;
  title: string;
  start: string;
  end: string;
  type: CalendarEventType;
  color: string;
  meta: Record<string, unknown>;
}

export interface CalendarState {
  isLoading: boolean;
  error: string | null;
  events: CalendarEvent[];
}

export const initialState: CalendarState = {
  isLoading: false,
  error: null,
  events: [],
};
