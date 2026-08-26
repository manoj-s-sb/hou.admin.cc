import { createSlice } from '@reduxjs/toolkit';

import {
  addLeadNote,
  addWaitlistNote,
  createCentre,
  deleteLead,
  deleteLeadNote,
  deleteWaitlistNote,
  getCentreBookings,
  getCentreDetails,
  getCentreLeads,
  getCentreMembers,
  getCentres,
  getCentreWaitlist,
  updateCentre,
  updateLeadStatus,
  updateWaitlistStatus,
} from './api';
import { initialState } from './types';

const centresSlice = createSlice({
  name: 'centres',
  initialState,
  reducers: {},
  extraReducers: builder => {
    // ── List ──
    builder.addCase(getCentres.pending, (state, action) => {
      state.isLoading = true;
      state.error = null;
      // Mark this as the latest in-flight request — see field doc in types.ts.
      state.centresRequestId = action.meta.requestId;
    });
    builder.addCase(getCentres.fulfilled, (state, action) => {
      // A newer search/filter was dispatched after this one — an older, slower
      // request resolving now would overwrite the current (correct) results.
      if (action.meta.requestId !== state.centresRequestId) return;
      state.isLoading = false;
      state.facilities = action.payload.facilities;
      state.total = action.payload.total;
    });
    builder.addCase(getCentres.rejected, (state, action) => {
      if (action.meta.requestId !== state.centresRequestId) return;
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

    // ── Waitlist ── (clear on pending so a stale tab's rows never linger)
    builder.addCase(getCentreWaitlist.pending, state => {
      state.waitlistLoading = true;
      state.waitlistError = null;
      state.waitlist = [];
    });
    builder.addCase(getCentreWaitlist.fulfilled, (state, action) => {
      state.waitlistLoading = false;
      state.waitlist = action.payload.entries;
      state.waitlistTotal = action.payload.total;
      state.waitlistPage = action.payload.page;
      state.waitlistLimit = action.payload.limit;
    });
    builder.addCase(getCentreWaitlist.rejected, (state, action) => {
      state.waitlistLoading = false;
      state.waitlist = [];
      state.waitlistTotal = 0;
      state.waitlistError = action.payload ?? 'Failed to fetch waitlist';
    });

    // ── Leads ──
    builder.addCase(getCentreLeads.pending, state => {
      state.leadsLoading = true;
      state.leadsError = null;
      state.leads = [];
    });
    builder.addCase(getCentreLeads.fulfilled, (state, action) => {
      state.leadsLoading = false;
      state.leads = action.payload.entries;
      state.leadsTotal = action.payload.total;
      state.leadsPage = action.payload.page;
      state.leadsLimit = action.payload.limit;
    });
    builder.addCase(getCentreLeads.rejected, (state, action) => {
      state.leadsLoading = false;
      state.leads = [];
      state.leadsTotal = 0;
      state.leadsError = action.payload ?? 'Failed to fetch leads';
    });

    // ── Notes ── (keep the loaded page's row in sync after an add)
    builder.addCase(addWaitlistNote.fulfilled, (state, action) => {
      const updated = action.payload;
      const idx = state.waitlist.findIndex(e => e.id === updated.id);
      if (idx !== -1) state.waitlist[idx] = updated;
    });
    builder.addCase(addLeadNote.fulfilled, (state, action) => {
      const updated = action.payload;
      const idx = state.leads.findIndex(e => e.id === updated.id);
      if (idx !== -1) state.leads[idx] = updated;
    });
    builder.addCase(deleteWaitlistNote.fulfilled, (state, action) => {
      const updated = action.payload;
      const idx = state.waitlist.findIndex(e => e.id === updated.id);
      if (idx !== -1) state.waitlist[idx] = updated;
    });
    builder.addCase(deleteLeadNote.fulfilled, (state, action) => {
      const updated = action.payload;
      const idx = state.leads.findIndex(e => e.id === updated.id);
      if (idx !== -1) state.leads[idx] = updated;
    });
    builder.addCase(deleteLead.fulfilled, (state, action) => {
      state.leads = state.leads.filter(e => e.id !== action.payload.leadId);
    });
    builder.addCase(updateWaitlistStatus.fulfilled, (state, action) => {
      const updated = action.payload;
      const idx = state.waitlist.findIndex(e => e.id === updated.id);
      if (idx !== -1) state.waitlist[idx] = updated;
    });
    builder.addCase(updateLeadStatus.fulfilled, (state, action) => {
      const updated = action.payload;
      const idx = state.leads.findIndex(e => e.id === updated.id);
      if (idx !== -1) state.leads[idx] = updated;
    });
  },
});

export default centresSlice.reducer;
