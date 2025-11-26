import { createAsyncThunk } from '@reduxjs/toolkit';

import api from '../../services';
import endpoints from '../../constants/endpoints';
import { handleApiError } from '../../utils/errorUtils';
import { GetSlotsRequest } from './types';

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