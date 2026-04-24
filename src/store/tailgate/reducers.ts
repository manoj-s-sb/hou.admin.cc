import { createSlice } from '@reduxjs/toolkit';

import { fetchTailgateLogs, fetchTailgateStats } from './api';
import { initialState } from './types';

const tailgateSlice = createSlice({
  name: 'tailgate',
  initialState,
  reducers: {
    updateLogReview(state, action: { payload: { id: string; status: import('./types').TailgateStatus; notes: string | null } }) {
      const log = state.logs.find(l => l.id === action.payload.id);
      if (log) {
        log.status = action.payload.status;
        log.viol   = action.payload.status === 'violation';
        log.notes  = action.payload.notes;
      }
    },
  },
  extraReducers: builder => {
    builder.addCase(fetchTailgateLogs.pending, state => {
      state.isLoading = true;
      state.error = null;
    });
    builder.addCase(fetchTailgateLogs.fulfilled, (state, action) => {
      state.isLoading = false;
      state.logs = action.payload;
    });
    builder.addCase(fetchTailgateLogs.rejected, (state, action) => {
      state.isLoading = false;
      state.error = (action.payload as string) || 'Failed to fetch tailgate logs.';
      state.logs = [];
    });
    builder.addCase(fetchTailgateStats.fulfilled, (state, action) => {
      state.stats = action.payload;
    });
  },
});

export const { updateLogReview } = tailgateSlice.actions;
export default tailgateSlice.reducer;
