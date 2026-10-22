import { createAsyncThunk } from '@reduxjs/toolkit';

import endpoints from '../../constants/endpoints';
import api from '../../services';
import { handleApiError } from '../../utils/errorUtils';

import {
  CancelBookingRequest,
  CoachSlotsRequest,
  CreateBookingRequest,
  EditBookingRequest,
  GetSlotsRequest,
  UpdateLaneStatusRequest,
} from './types';

export const getSlots = createAsyncThunk(
  'slots/getSlots',
  async ({ date, facilityCode }: GetSlotsRequest, { rejectWithValue }) => {
    try {
      const response = await api.post(endpoints.slots.list, { date, facilityCode });
      return response.data?.data;
    } catch (error) {
      return rejectWithValue(handleApiError(error, 'Failed to fetch slots'));
    }
  }
);
export const updateLaneStatus = createAsyncThunk(
  'slots/updateLaneStatus',
  async (
    {
      date,
      facilityCode,
      laneCode,
      action,
      reason,
      slotCode,
      blockLaneApp,
      startTime,
      blockedByName,
    }: UpdateLaneStatusRequest,
    { rejectWithValue }
  ) => {
    try {
      const normalizedSlotCode = slotCode ? (Array.isArray(slotCode) ? slotCode : [slotCode]) : undefined;
      const response = await api.post(endpoints.slots.updateLaneStatus, {
        date,
        facilityCode,
        laneCode,
        action,
        reason,
        slotCode: normalizedSlotCode,
        blockLaneApp,
        startTime,
        blockedByName,
      });
      return response.data?.data;
    } catch (error) {
      return rejectWithValue(handleApiError(error, 'Failed to update lane status'));
    }
  }
);

export const coachSlots = createAsyncThunk(
  'slots/coachSlots',
  async ({ startDate, endDate, facilityCode }: CoachSlotsRequest, { rejectWithValue }) => {
    try {
      const response = await api.post(endpoints.slots.coachSlots, { startDate, endDate, facilityCode });
      return response.data?.data;
    } catch (error) {
      return rejectWithValue(handleApiError(error, 'Failed to fetch coach slots'));
    }
  }
);

/** Bulk status update over an arbitrary, admin-picked list of coach slot
 * codes — any combination of dates/time-slots (CoachScheduleGrid's click/drag
 * multi-select), no day-of-week/day-of-month/recurring pattern involved.
 * includeInduction is optional: true adds 'induction' to supportedSessionTypes
 * (keeping 'regular'), false keeps only 'regular', omitted leaves it untouched. */
export const updateCoachSlots = createAsyncThunk(
  'slots/updateCoachSlots',
  async (
    {
      slotCodes,
      action,
      reason,
      includeInduction,
    }: {
      slotCodes: string[];
      action: string;
      reason: string;
      includeInduction?: boolean;
    },
    { rejectWithValue }
  ) => {
    try {
      const response = await api.post(endpoints.slots.updateCoachSlots, {
        slotCodes,
        action,
        reason,
        includeInduction,
      });
      return response.data?.data;
    } catch (error) {
      return rejectWithValue(handleApiError(error, 'Failed to update coach slots'));
    }
  }
);

/** Same request/response shape and behavior as updateCoachSlots — a separate
 * thunk/route purely so edit access is gated by the 'staffschedule'
 * permission instead of 'coachschedule'. */
export const updateStaffSlots = createAsyncThunk(
  'slots/updateStaffSlots',
  async (
    {
      slotCodes,
      action,
      reason,
      includeInduction,
    }: {
      slotCodes: string[];
      action: string;
      reason: string;
      includeInduction?: boolean;
    },
    { rejectWithValue }
  ) => {
    try {
      const response = await api.post(endpoints.slots.updateStaffSlots, {
        slotCodes,
        action,
        reason,
        includeInduction,
      });
      return response.data?.data;
    } catch (error) {
      return rejectWithValue(handleApiError(error, 'Failed to update staff slots'));
    }
  }
);

/** Fills in missing coachslot inventory for a coach over a plain contiguous
 * date range (no day-of-week/day-of-month pattern) — for when CenturyBackend
 * hasn't pre-created slots that far out yet. New slots default to
 * disabled/unavailable; use updateCoachSlots afterward to open them up. */
export const generateCoachSlots = createAsyncThunk(
  'slots/generateCoachSlots',
  async (
    {
      facilityCode,
      coachCode,
      startDate,
      endDate,
    }: {
      facilityCode: string;
      coachCode: string;
      startDate: string;
      endDate: string;
    },
    { rejectWithValue }
  ) => {
    try {
      const response = await api.post(endpoints.slots.generateCoachSlots, {
        facilityCode,
        coachCode,
        startDate,
        endDate,
      });
      return response.data?.data;
    } catch (error) {
      return rejectWithValue(handleApiError(error, 'Failed to generate coach slots'));
    }
  }
);

/** Staff Schedule's equivalent of coachSlots — same mechanism, same
 * coachslot-shaped documents, just over the facility's staff roster. */
export const staffSlots = createAsyncThunk(
  'slots/staffSlots',
  async ({ startDate, endDate, facilityCode }: CoachSlotsRequest, { rejectWithValue }) => {
    try {
      const response = await api.post(endpoints.slots.staffSlots, { startDate, endDate, facilityCode });
      return response.data?.data;
    } catch (error) {
      return rejectWithValue(handleApiError(error, 'Failed to fetch staff slots'));
    }
  }
);

/** Staff Schedule's equivalent of generateCoachSlots — same mechanism, for a
 * staff member's own code instead of a coach's. A brand-new staff member has
 * no existing slots to template from; the backend falls back to a sensible
 * default (45-min cadence, induction/tour, the facility's own timezone)
 * rather than erroring the way generateCoachSlots still does. */
export const generateStaffSlots = createAsyncThunk(
  'slots/generateStaffSlots',
  async (
    {
      facilityCode,
      coachCode,
      startDate,
      endDate,
    }: {
      facilityCode: string;
      coachCode: string;
      startDate: string;
      endDate: string;
    },
    { rejectWithValue }
  ) => {
    try {
      const response = await api.post(endpoints.slots.generateStaffSlots, {
        facilityCode,
        coachCode,
        startDate,
        endDate,
      });
      return response.data?.data;
    } catch (error) {
      return rejectWithValue(handleApiError(error, 'Failed to generate staff slots'));
    }
  }
);

/** "Book for someone" — books a lane slot on a walk-in/phone caller's behalf. */
export const createBooking = createAsyncThunk(
  'slots/createBooking',
  async (request: CreateBookingRequest, { rejectWithValue }) => {
    try {
      const response = await api.post(endpoints.slots.createBooking, request);
      return response.data?.data;
    } catch (error) {
      return rejectWithValue(handleApiError(error, 'Failed to create booking'));
    }
  }
);

/** "Shift Lane" — moves an existing booking to a different lane's slot. */
export const editBooking = createAsyncThunk(
  'slots/editBooking',
  async (request: EditBookingRequest, { rejectWithValue }) => {
    try {
      const response = await api.post(endpoints.slots.editBooking, request);
      return response.data?.data;
    } catch (error) {
      return rejectWithValue(handleApiError(error, 'Failed to shift booking'));
    }
  }
);

/** Cancel one booking: refund + DB write + push/email, via CancelBookingService. */
export const cancelBooking = createAsyncThunk(
  'slots/cancelBooking',
  async (request: CancelBookingRequest, { rejectWithValue }) => {
    try {
      const response = await api.post(endpoints.slots.cancelBooking, request);
      return response.data?.data;
    } catch (error) {
      return rejectWithValue(handleApiError(error, 'Failed to cancel booking'));
    }
  }
);
