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
  async ({ date, page, type, listLimit, email, status }: InductionListRequest, { rejectWithValue }) => {
    try {
      const payload: any = {
        date,
        type,
        page,
        limit: listLimit,
      };

      if (email?.trim()) {
        payload.email = email.trim();
      }

      if (status && status !== 'all') {
        payload.status = status;
      }

      const response = await api.post(`${endpoints.induction.list}`, payload);
      return response?.data;
    } catch (error: any) {
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
    } catch (error: any) {
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
    } catch (error: any) {
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
    } catch (error: any) {
      return rejectWithValue(handleApiError(error, 'Failed to update tour status'));
    }
  }
);
