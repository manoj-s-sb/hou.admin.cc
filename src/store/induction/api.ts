import { createAsyncThunk } from '@reduxjs/toolkit';

import endpoints from '../../constants/endpoints';
import api from '../../services';
import { handleApiError } from '../../utils/errorUtils';

import {
  InductionListRequest,
  InductionStepsDetailsRequest,
  UpdateInductionStepsRequest,
  UpdateTourStatusRequest,
} from './types';

export const inductionList = createAsyncThunk(
  'induction/inductionList',
  async (
    { date, startDate, endDate, page, type, listLimit, search, status, facilityCode }: InductionListRequest,
    { rejectWithValue }
  ) => {
    try {
      const payload: Record<string, unknown> = {
        type,
        page,
        limit: listLimit,
      };

      // The backend rejects a request with neither `date` nor `startDate`+`endDate`
      // set — never send date: '' on its own. Prefer the exact single day when
      // given; fall back to the range.
      if (date) {
        payload.date = date;
      } else if (startDate && endDate) {
        payload.startDate = startDate;
        payload.endDate = endDate;
      }

      if (search?.trim()) {
        payload.search = search.trim();
      }

      if (status && status !== 'all') {
        payload.status = status;
      }

      if (facilityCode) {
        payload.facilityCode = facilityCode;
      }

      const response = await api.post(`${endpoints.induction.list}`, payload);
      return response?.data;
    } catch (error) {
      return rejectWithValue(handleApiError(error, 'Failed to fetch induction list'));
    }
  }
);

export const getInductionStepsDetails = createAsyncThunk(
  'induction/getInductionStepsDetails',
  async ({ userId }: InductionStepsDetailsRequest, { rejectWithValue }) => {
    try {
      const response = await api.post(`${endpoints.induction.search}`, {
        userId,
      });
      return response?.data;
    } catch (error) {
      return rejectWithValue(handleApiError(error, 'Failed to fetch induction steps details'));
    }
  }
);

export const updateInductionSteps = createAsyncThunk(
  'induction/updateInductionSteps',
  async ({ userId, subSteps }: UpdateInductionStepsRequest, { rejectWithValue }) => {
    try {
      const response = await api.post(`${endpoints.induction.update}`, {
        userId,
        subSteps,
      });
      return response?.data;
    } catch (error) {
      return rejectWithValue(handleApiError(error, 'Failed to update induction steps'));
    }
  }
);

export const updateTourStatus = createAsyncThunk(
  'induction/updateTourStatus',
  async ({ userId, bookingCode, status }: UpdateTourStatusRequest, { rejectWithValue }) => {
    try {
      const response = await api.post(`${endpoints.tour.updateTourStatus}`, {
        userId,
        bookingCode,
        status,
      });
      return response?.data;
    } catch (error) {
      return rejectWithValue(handleApiError(error, 'Failed to update tour status'));
    }
  }
);

export const updateInductionBookingStatus = createAsyncThunk(
  'induction/updateInductionBookingStatus',
  async ({ userId, bookingCode, status }: UpdateTourStatusRequest, { rejectWithValue }) => {
    try {
      const response = await api.post(`${endpoints.induction.updateBookingStatus}`, {
        userId,
        bookingCode,
        status,
      });
      return response?.data;
    } catch (error) {
      return rejectWithValue(handleApiError(error, 'Failed to update induction booking status'));
    }
  }
);

export const userInductionDetails = createAsyncThunk(
  'induction/userInductionDetails',
  async ({ userId }: { userId: string }, { rejectWithValue }) => {
    try {
      const response = await api.post(`${endpoints.induction.userInductionDetails}`, { userId });
      return response?.data;
    } catch (error) {
      return rejectWithValue(handleApiError(error, 'Failed to fetch user induction details'));
    }
  }
);
