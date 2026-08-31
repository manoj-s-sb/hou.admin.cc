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
  async ({ date, page, type, listLimit, search, status, facilityCode }: InductionListRequest, { rejectWithValue }) => {
    try {
      const payload: Record<string, unknown> = {
        date,
        type,
        page,
        limit: listLimit,
      };

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
