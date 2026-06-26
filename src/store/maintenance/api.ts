import { createAsyncThunk } from '@reduxjs/toolkit';

import endpoints from '../../constants/endpoints';
import api from '../../services';
import { handleApiError } from '../../utils/errorUtils';

import { CreateWorkRequest, UpdateWorkRequest, WorkListRequest } from './types';

export const getWorkUploadUrl = async (
  facilityCode: string,
  fileName: string
): Promise<{ uploadUrl: string; blobName: string }> => {
  const response = await api.post(endpoints.maintenance.uploadUrl, { facilityCode, fileName });
  const data = response?.data?.data;
  return { uploadUrl: data?.uploadUrl as string, blobName: data?.blobName as string };
};

export const deleteWorkMedia = async (blobName: string): Promise<void> => {
  await api.post(endpoints.maintenance.deleteMedia, { blobName });
};

export const uploadFileToBlob = async (uploadUrl: string, file: File): Promise<void> => {
  await fetch(uploadUrl, {
    method: 'PUT',
    headers: { 'x-ms-blob-type': 'BlockBlob' },
    body: file,
  });
};

export const getWorkList = createAsyncThunk(
  'maintenance/getWorkList',
  async (payload: WorkListRequest, { rejectWithValue }) => {
    try {
      const body: Record<string, unknown> = {
        facilityCode: payload.facilityCode,
        page: payload.page,
        limit: payload.limit,
      };

      if (payload.type) body.type = payload.type;
      if (payload.status) body.status = payload.status;
      if (payload.category) body.category = payload.category;
      if (payload.frequency) body.frequency = payload.frequency;
      if (payload.scheduledDate) body.scheduledDate = payload.scheduledDate;
      if (payload.fromDate) body.fromDate = payload.fromDate;
      if (payload.toDate) body.toDate = payload.toDate;
      if (payload.laneNo !== undefined) body.laneNo = payload.laneNo;
      if (payload.isActive !== undefined) body.isActive = payload.isActive;

      const response = await api.post(`${endpoints.maintenance.workList}`, body);
      return response?.data;
    } catch (error) {
      return rejectWithValue(handleApiError(error, 'Failed to fetch work list'));
    }
  }
);

export const updateWork = createAsyncThunk(
  'maintenance/updateWork',
  async (payload: UpdateWorkRequest, { rejectWithValue }) => {
    try {
      const response = await api.post(`${endpoints.maintenance.updateWork}`, payload);
      return response?.data;
    } catch (error) {
      return rejectWithValue(handleApiError(error, 'Failed to update work item'));
    }
  }
);

export const createWork = createAsyncThunk(
  'maintenance/createWork',
  async (payload: CreateWorkRequest, { rejectWithValue }) => {
    try {
      const response = await api.post(`${endpoints.maintenance.createWork}`, payload);
      return response?.data;
    } catch (error) {
      return rejectWithValue(handleApiError(error, 'Failed to create work item'));
    }
  }
);
