import { createSlice } from '@reduxjs/toolkit';

import { getReport } from './api';
import { initialState, ReportData } from './types';

const reportsSlice = createSlice({
  name: 'reports',
  initialState,
  reducers: {},
  extraReducers: builder => {
    builder.addCase(getReport.pending, state => {
      state.isLoading = true;
      state.error = '';
    });
    builder.addCase(getReport.fulfilled, (state, action) => {
      state.isLoading = false;
      state.data = (action.payload?.data as ReportData) || null;
    });
    builder.addCase(getReport.rejected, (state, action) => {
      state.isLoading = false;
      state.error = (action.payload as string) || 'Failed to load report';
    });
  },
});

export default reportsSlice.reducer;
