import { createAsyncThunk } from '@reduxjs/toolkit';

import endpoints from '../../constants/endpoints';
import api from '../../services';
import { handleApiError } from '../../utils/errorUtils';

import { CoachSlotsRequest, GetSlotsRequest, UpdateLaneStatusRequest } from './types';

export const getSlots = createAsyncThunk(
  'slots/getSlots',
  async ({ date, facilityCode }: GetSlotsRequest, { rejectWithValue }) => {
    try {
      const response = await api.post(endpoints.slots.list, { date, facilityCode });
      return response.data?.data;
    } catch (error: any) {
      return rejectWithValue(handleApiError(error, 'Failed to fetch slots'));
    }
  }
);
export const updateLaneStatus = createAsyncThunk(
  'slots/updateLaneStatus',
  async ({ date, facilityCode, laneCode, action, reason, slotCode }: UpdateLaneStatusRequest, { rejectWithValue }) => {
    try {
      const response = await api.post(endpoints.slots.updateLaneStatus, {
        date,
        facilityCode,
        laneCode,
        action,
        reason,
        slotCode,
      });
      return response.data?.data;
    } catch (error: any) {
      return rejectWithValue(handleApiError(error, 'Failed to update lane status'));
    }
  }
);

export const coachSlots = createAsyncThunk(
  'slots/coachSlots',
  async ({ date, facilityCode }: CoachSlotsRequest, { rejectWithValue }) => {
    try {
      const response = await api.post(endpoints.slots.coachSlots, { date, facilityCode });
      return response.data?.data;
    } catch (error: any) {
      return rejectWithValue(handleApiError(error, 'Failed to fetch coach slots'));
    }
  }
);

export const updateCoachSlots = createAsyncThunk(
  'slots/updateCoachSlots',
  async (
    {
      slotCodes,
      action,
      reason,
    }: {
      slotCodes: string[];
      action: string;
      reason: string;
    },
    { rejectWithValue }
  ) => {
    try {
      const response = await api.post(endpoints.slots.updateCoachSlots, { slotCodes, action, reason });
      return response.data?.data;
    } catch (error: any) {
      return rejectWithValue(handleApiError(error, 'Failed to update coach slots'));
    }
  }
);
