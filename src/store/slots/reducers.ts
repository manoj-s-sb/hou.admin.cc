import { createSlice, PayloadAction } from '@reduxjs/toolkit';

import { coachSlots, createBooking, editBooking, getSlots, updateLaneStatus } from './api';
import { initialState } from './types';

const slotsSlice = createSlice({
  name: 'slots',
  initialState,
  reducers: {
    // No cancel-booking endpoint exists yet — this frees the slot in the UI only
    // (grid + modals) so the flow can be reviewed before the backend is wired up.
    // A page refresh reverts it, since it re-fetches from getSlots.
    cancelBookingLocally: (state, action: PayloadAction<{ laneCode: string; slotCode: string }>) => {
      const lane = state.slots?.lanes.find(l => l.laneCode === action.payload.laneCode);
      const slot = lane?.slots.find(s => s.slotCode === action.payload.slotCode);
      if (slot) {
        slot.isBooked = false;
        slot.status = 'available';
        slot.booking = undefined;
      }
    },
  },
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
  },
});

export const { cancelBookingLocally } = slotsSlice.actions;
export default slotsSlice.reducer;
