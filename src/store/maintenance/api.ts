import { createAsyncThunk } from '@reduxjs/toolkit';

import endpoints from '../../constants/endpoints';
import api from '../../services';
import { handleApiError } from '../../utils/errorUtils';

import { WorkListRequest } from './types';

export const getWorkList = createAsyncThunk(
  'maintenance/getWorkList',
  async (payload: WorkListRequest, { rejectWithValue }) => {
    try {
      const body: Record<string, any> = {
        facilityCode: payload.facilityCode,
        page: payload.page,
        limit: payload.limit,
      };

      if (payload.type) body.type = payload.type;
      if (payload.status) body.status = payload.status;
      if (payload.category) body.category = payload.category;
      if (payload.frequency) body.frequency = payload.frequency;
      if (payload.scheduledDate) body.scheduledDate = payload.scheduledDate;
      if (payload.laneId !== undefined) body.laneId = payload.laneId;
      if (payload.isActive !== undefined) body.isActive = payload.isActive;

      const response = await api.post(`${endpoints.maintenance.workList}`, body);
      return response?.data;
    } catch (error: any) {
      return rejectWithValue(handleApiError(error, 'Failed to fetch work list'));
    }
  }
);
