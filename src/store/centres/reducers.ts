import { createSlice } from '@reduxjs/toolkit';

import { createCentre, getCentreBookings, getCentreDetails, getCentreMembers, getCentres, updateCentre } from './api';
import { initialState } from './types';

const centresSlice = createSlice({
  name: 'centres',
  initialState,
  reducers: {},
  extraReducers: builder => {
    // ── List ──
    builder.addCase(getCentres.pending, state => {
      state.isLoading = true;
      state.error = null;
    });
    builder.addCase(getCentres.fulfilled, (state, action) => {
      state.isLoading = false;
      state.facilities = action.payload.facilities;
      state.total = action.payload.total;
    });
    builder.addCase(getCentres.rejected, (state, action) => {
      state.isLoading = false;
      state.facilities = [];
      state.total = 0;
      state.error = action.payload ?? 'Failed to fetch centres';
    });

    // ── Details ── (clear on pending so switching centres never shows a stale bundle)
    builder.addCase(getCentreDetails.pending, state => {
      state.detailsLoading = true;
      state.detailsError = null;
      state.details = null;
    });
    builder.addCase(getCentreDetails.fulfilled, (state, action) => {
      state.detailsLoading = false;
      state.details = action.payload;
    });
    builder.addCase(getCentreDetails.rejected, (state, action) => {
      state.detailsLoading = false;
      state.detailsError = action.payload ?? 'Could not load this centre.';
    });

    // ── Create / update ──
    builder
      .addCase(createCentre.pending, state => {
        state.saving = true;
      })
      .addCase(createCentre.fulfilled, state => {
        state.saving = false;
      })
      .addCase(createCentre.rejected, state => {
        state.saving = false;
      })
      .addCase(updateCentre.pending, state => {
        state.saving = true;
      })
      .addCase(updateCentre.fulfilled, state => {
        state.saving = false;
      })
      .addCase(updateCentre.rejected, state => {
        state.saving = false;
      });

    // ── Members ──
    builder.addCase(getCentreMembers.pending, state => {
      state.membersLoading = true;
      state.members = [];
    });
    builder.addCase(getCentreMembers.fulfilled, (state, action) => {
      state.membersLoading = false;
      state.members = action.payload;
    });
    builder.addCase(getCentreMembers.rejected, state => {
      state.membersLoading = false;
      state.members = [];
    });

    // ── Bookings ──
    builder.addCase(getCentreBookings.pending, state => {
      state.bookingsLoading = true;
      state.bookings = [];
    });
    builder.addCase(getCentreBookings.fulfilled, (state, action) => {
      state.bookingsLoading = false;
      state.bookings = action.payload;
    });
    builder.addCase(getCentreBookings.rejected, state => {
      state.bookingsLoading = false;
      state.bookings = [];
    });
  },
});

export default centresSlice.reducer;
