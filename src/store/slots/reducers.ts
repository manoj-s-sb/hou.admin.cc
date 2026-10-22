import { createSlice } from '@reduxjs/toolkit';

import { cancelBooking, coachSlots, createBooking, editBooking, getSlots, staffSlots, updateLaneStatus } from './api';
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
      state.error = (action.payload as string) ?? null;
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
      state.error = (action.payload as string) ?? null;
    });
    builder.addCase(createBooking.pending, state => {
      // Same flag Block/Unblock/Cancel already share as the modal's generic
      // "an action is in flight" indicator.
      state.isBlockLaneLoading = true;
      state.error = null;
    });
    builder.addCase(createBooking.fulfilled, state => {
      state.isBlockLaneLoading = false;
      state.error = null;
    });
    builder.addCase(createBooking.rejected, (state, action) => {
      state.isBlockLaneLoading = false;
      state.error = (action.payload as string) ?? null;
    });
    builder.addCase(editBooking.pending, state => {
      state.isBlockLaneLoading = true;
      state.error = null;
    });
    builder.addCase(editBooking.fulfilled, state => {
      state.isBlockLaneLoading = false;
      state.error = null;
    });
    builder.addCase(editBooking.rejected, (state, action) => {
      state.isBlockLaneLoading = false;
      state.error = (action.payload as string) ?? null;
    });
    builder.addCase(cancelBooking.pending, state => {
      state.isBlockLaneLoading = true;
      state.error = null;
    });
    builder.addCase(cancelBooking.fulfilled, state => {
      state.isBlockLaneLoading = false;
      state.error = null;
    });
    builder.addCase(cancelBooking.rejected, (state, action) => {
      state.isBlockLaneLoading = false;
      state.error = (action.payload as string) ?? null;
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
      state.error = (action.payload as string) ?? null;
      state.coachSlotsList = null;
    });
    builder.addCase(staffSlots.pending, state => {
      state.isStaffLoading = true;
      state.error = null;
    });
    builder.addCase(staffSlots.fulfilled, (state, action) => {
      state.isStaffLoading = false;
      state.staffSlotsList = action.payload ? [action.payload] : null;
    });
    builder.addCase(staffSlots.rejected, (state, action) => {
      state.isStaffLoading = false;
      state.error = (action.payload as string) ?? null;
      state.staffSlotsList = null;
    });
  },
});

export default slotsSlice.reducer;
