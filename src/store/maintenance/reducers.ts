import { createSlice } from '@reduxjs/toolkit';

import { createWork, getWorkList, updateWork } from './api';
import { initialState } from './types';

const maintenanceSlice = createSlice({
  name: 'maintenance',
  initialState,
  reducers: {},
  extraReducers: builder => {
    builder.addCase(getWorkList.pending, state => {
      state.isLoading = true;
      state.error = '';
    });
    builder.addCase(getWorkList.fulfilled, (state, action) => {
      state.isLoading = false;
      const data = action.payload?.data;
      // Issue returns a raw array; task/log return { items, total, page, limit, totalPages }
      if (Array.isArray(data)) {
        state.workList = {
          items: data,
          total: data.length,
          page: 1,
          limit: 20,
          totalPages: 1,
        };
      } else {
        state.workList = data || {
          items: [],
          total: 0,
          page: 1,
          limit: 20,
          totalPages: 1,
        };
      }
    });
    builder.addCase(getWorkList.rejected, (state, action) => {
      state.isLoading = false;
      state.error = (action.payload as string) || 'Failed to fetch work list. Please try again.';
    });
    builder.addCase(createWork.pending, state => {
      state.isLoading = true;
      state.error = '';
    });
    builder.addCase(createWork.fulfilled, state => {
      state.isLoading = false;
      state.error = '';
    });
    builder.addCase(createWork.rejected, (state, action) => {
      state.isLoading = false;
      state.error = (action.payload as string) || 'Failed to create work item. Please try again.';
    });
    builder.addCase(updateWork.pending, state => {
      state.isLoading = true;
      state.error = '';
    });
    builder.addCase(updateWork.fulfilled, state => {
      state.isLoading = false;
      state.error = '';
    });
    builder.addCase(updateWork.rejected, (state, action) => {
      state.isLoading = false;
      state.error = (action.payload as string) || 'Failed to update work item. Please try again.';
    });
  },
});

export default maintenanceSlice.reducer;
