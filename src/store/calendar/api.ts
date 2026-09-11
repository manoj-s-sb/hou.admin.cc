import { createAsyncThunk } from '@reduxjs/toolkit';

import endpoints from '../../constants/endpoints';
import api from '../../services';
import { handleApiError } from '../../utils/errorUtils';
import { Induction, InductionResponse } from '../induction/types';
import { Coach, CoachSlotsResponse, GetSlotsResponse } from '../slots/types';

import { mergeCalendarEvents } from './normalize';
import { CalendarRangeRequest } from './types';

// The list endpoint paginates (max 100/page) and the calendar renders a whole
// range in one go rather than paging — see the "Known limitation" callout in
// the feature summary: a single day with more than this many induction (or
// tour) bookings would only show the first 100 on the calendar.
const CALENDAR_LIST_LIMIT = 100;

/** admin/slots/calendar's range shape (startDate/endDate mode) — see backend SlotCalendarRangeResponse. */
interface SlotCalendarRangeResponse {
  startDate: string;
  endDate: string;
  facilityCode: string;
  days: GetSlotsResponse[];
}

export const fetchCalendarEvents = createAsyncThunk(
  'calendar/fetchCalendarEvents',
  async ({ startDate, endDate, facilityCode }: CalendarRangeRequest, { rejectWithValue }) => {
    try {
      const inductionsRequest = api.post(endpoints.induction.list, {
        startDate,
        endDate,
        type: 'inductionbooking',
        page: 1,
        limit: CALENDAR_LIST_LIMIT,
        facilityCode,
      });
      const toursRequest = api.post(endpoints.induction.list, {
        startDate,
        endDate,
        type: 'tourbooking',
        page: 1,
        limit: CALENDAR_LIST_LIMIT,
        facilityCode,
      });
      // Coach calendar and slot (lane) calendar both require a facilityCode (they're
      // per-centre) — skip the calls rather than send an invalid request when no
      // centre is in scope (e.g. a super admin viewing the global calendar outside
      // any centre).
      const coachRequest = facilityCode
        ? api.post(endpoints.slots.coachSlots, { startDate, endDate, facilityCode })
        : Promise.resolve(null);
      const slotBookingsRequest = facilityCode
        ? api.post(endpoints.slots.list, { startDate, endDate, facilityCode })
        : Promise.resolve(null);

      const [inductionsRes, toursRes, coachRes, slotBookingsRes] = await Promise.all([
        inductionsRequest,
        toursRequest,
        coachRequest,
        slotBookingsRequest,
      ]);

      const inductions: Induction[] = (inductionsRes.data?.data as InductionResponse | undefined)?.bookings ?? [];
      const tours: Induction[] = (toursRes.data?.data as InductionResponse | undefined)?.bookings ?? [];
      const coaches: Coach[] = coachRes ? ((coachRes.data?.data as CoachSlotsResponse | undefined)?.coaches ?? []) : [];
      const slotBookingDays: GetSlotsResponse[] = slotBookingsRes
        ? ((slotBookingsRes.data?.data as SlotCalendarRangeResponse | undefined)?.days ?? [])
        : [];

      return mergeCalendarEvents(inductions, tours, coaches, slotBookingDays);
    } catch (error) {
      return rejectWithValue(handleApiError(error, 'Failed to fetch calendar events'));
    }
  }
);
