import { createAsyncThunk } from '@reduxjs/toolkit';

import endpoints from '../../constants/endpoints';
import api from '../../services';
import { handleApiError } from '../../utils/errorUtils';

import type { RootState } from '../store';
import type {
  CreateStaffRequest,
  StaffConfig,
  StaffListRequest,
  UpdateStaffRequest,
} from './types';

export const getStaffList = createAsyncThunk(
  'staff/getList',
  async (params: StaffListRequest, { rejectWithValue }) => {
    try {
      const response = await api.post(endpoints.staff.list, params);
      return response.data;
    } catch (error: unknown) {
      return rejectWithValue(handleApiError(error, 'Failed to fetch staff list'));
    }
  },
);

// Config rarely changes during a session — skip refetch when already loaded.
export const getStaffConfig = createAsyncThunk(
  'staff/getConfig',
  async (_, { rejectWithValue }) => {
    try {
      const response = await api.get<{ data: StaffConfig }>(endpoints.staff.config);
      return response.data;
    } catch (error: unknown) {
      return rejectWithValue(handleApiError(error, 'Failed to load staff config'));
    }
  },
  {
    condition: (_, { getState }) => {
      const state = (getState() as RootState).staff;
      return !state.staffConfig && !state.isConfigLoading;
    },
  },
);

export const getStaffDetails = createAsyncThunk(
  'staff/getDetails',
  async ({ staffId }: { staffId: string }, { rejectWithValue }) => {
    try {
      const response = await api.post(endpoints.staff.details, { staffId });
      return response.data;
    } catch (error: unknown) {
      return rejectWithValue(handleApiError(error, 'Failed to load staff details'));
    }
  },
);

export const createStaff = createAsyncThunk(
  'staff/create',
  async (payload: CreateStaffRequest, { rejectWithValue }) => {
    try {
      const response = await api.post(endpoints.staff.create, payload);
      return response.data;
    } catch (error: unknown) {
      return rejectWithValue(handleApiError(error, 'Failed to create staff member'));
    }
  },
);

export const updateStaff = createAsyncThunk(
  'staff/update',
  async (payload: UpdateStaffRequest, { rejectWithValue }) => {
    try {
      const response = await api.post(endpoints.staff.update, payload);
      return response.data;
    } catch (error: unknown) {
      return rejectWithValue(handleApiError(error, 'Failed to update staff member'));
    }
  },
);
