import { createSlice } from '@reduxjs/toolkit';

import { fetchTailgateEvents, fetchTailgateStats, submitTailgateReview } from './api';
import { initialState } from './types';

const tailgateSlice = createSlice({
  name: 'tailgate',
  initialState,
  reducers: {},
  extraReducers: builder => {
    builder.addCase(fetchTailgateEvents.pending, state => {
      state.isLoading = true;
      state.error = null;
    });
    builder.addCase(fetchTailgateEvents.fulfilled, (state, action) => {
      state.isLoading = false;
      const raw = action.payload;
      state.logs = Array.isArray(raw) ? raw : (raw?.events ?? []);
    });
    builder.addCase(fetchTailgateEvents.rejected, (state, action) => {
      state.isLoading = false;
      state.error = (action.payload as string) || 'Failed to fetch tailgate events.';
      state.logs = [];
    });
    builder.addCase(submitTailgateReview.fulfilled, (state, action) => {
      const { id, review } = action.payload;
      const log = state.logs.find(l => l.id === id);
      if (log) {
        log.review = review;
      }
    });
    builder.addCase(fetchTailgateStats.pending, state => {
      state.statsLoading = true;
    });
    builder.addCase(fetchTailgateStats.fulfilled, (state, action) => {
      state.statsLoading = false;
      state.stats = action.payload;
    });
    builder.addCase(fetchTailgateStats.rejected, state => {
      state.statsLoading = false;
    });
  },
});

export default tailgateSlice.reducer;
