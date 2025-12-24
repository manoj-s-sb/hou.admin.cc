import { createSlice } from '@reduxjs/toolkit';

import { coachSlots, getSlots, updateLaneStatus } from './api';
import { initialState } from './types';

const slotsSlice = createSlice({
  name: 'slots',
  initialState,
  reducers: {},
  extraReducers: builder => {
    builder.addCase(getSlots.pending, state => {
      state.isLoading = true;
      state.error = null;
    });
    builder.addCase(getSlots.fulfilled, (state, action) => {
      state.isLoading = false;
      state.slots = action.payload;
      state.error = null;
    });
    builder.addCase(getSlots.rejected, (state, action) => {
      state.isLoading = false;
      state.error = action.payload;
      state.slots = null;
    });
    builder.addCase(updateLaneStatus.pending, state => {
      state.isBlockLaneLoading = true;
      state.error = null;
    });
    builder.addCase(updateLaneStatus.fulfilled, state => {
      state.isBlockLaneLoading = false;
      state.error = null;
    });
    builder.addCase(updateLaneStatus.rejected, (state, action) => {
      state.isBlockLaneLoading = false;
      state.error = action.payload;
    });
    builder.addCase(coachSlots.pending, state => {
      state.isLoading = true;
      state.error = null;
    });
    builder.addCase(coachSlots.fulfilled, (state, action) => {
      state.isLoading = false;
      state.coachSlotsList = action.payload ? [action.payload] : null;
    });
    builder.addCase(coachSlots.rejected, (state, action) => {
      state.isLoading = false;
      state.error = action.payload;
      state.coachSlotsList = null;
    });
  },
});

export default slotsSlice.reducer;
