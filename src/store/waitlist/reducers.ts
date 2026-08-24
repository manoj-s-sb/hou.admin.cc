import { createSlice } from '@reduxjs/toolkit';

import { getWaitlist, addWaitlistNote, bulkImportWaitlist, getLeads, addLeadNote, createLead } from './api';
import { initialState } from './types';

const waitlistSlice = createSlice({
  name: 'waitlist',
  initialState,
  reducers: {
    clearImportResult: state => {
      state.importResult = null;
      state.importError = '';
    },
  },
  extraReducers: builder => {
    builder.addCase(getWaitlist.pending, state => {
      state.waitlistLoading = true;
      state.waitlistError = '';
    });
    builder.addCase(getWaitlist.fulfilled, (state, action) => {
      state.waitlistLoading = false;
      state.waitlist = action.payload?.entries || [];
      state.waitlistTotal = action.payload?.total || 0;
    });
    builder.addCase(getWaitlist.rejected, (state, action) => {
      state.waitlistLoading = false;
      state.waitlistError = (action.payload as string) || 'Failed to fetch waitlist. Please try again.';
    });

    builder.addCase(addWaitlistNote.pending, state => {
      state.noteSaving = true;
    });
    builder.addCase(addWaitlistNote.fulfilled, (state, action) => {
      state.noteSaving = false;
      const updated = action.payload;
      if (updated?.id) {
        state.waitlist = state.waitlist.map(entry => (entry.id === updated.id ? { ...entry, ...updated } : entry));
      }
    });
    builder.addCase(addWaitlistNote.rejected, state => {
      state.noteSaving = false;
    });

    builder.addCase(bulkImportWaitlist.pending, state => {
      state.importLoading = true;
      state.importError = '';
    });
    builder.addCase(bulkImportWaitlist.fulfilled, (state, action) => {
      state.importLoading = false;
      state.importResult = action.payload || null;
    });
    builder.addCase(bulkImportWaitlist.rejected, (state, action) => {
      state.importLoading = false;
      state.importError = (action.payload as string) || 'Failed to import waitlist entries. Please try again.';
    });

    builder.addCase(getLeads.pending, state => {
      state.leadsLoading = true;
      state.leadsError = '';
    });
    builder.addCase(getLeads.fulfilled, (state, action) => {
      state.leadsLoading = false;
      state.leads = action.payload?.entries || [];
      state.leadsTotal = action.payload?.total || 0;
      state.leadsPage = action.payload?.page || 1;
      state.leadsLimit = action.payload?.limit || state.leadsLimit;
    });
    builder.addCase(getLeads.rejected, (state, action) => {
      state.leadsLoading = false;
      state.leadsError = (action.payload as string) || 'Failed to fetch leads. Please try again.';
    });

    builder.addCase(addLeadNote.pending, state => {
      state.noteSaving = true;
    });
    builder.addCase(addLeadNote.fulfilled, (state, action) => {
      state.noteSaving = false;
      const updated = action.payload;
      if (updated?.id) {
        state.leads = state.leads.map(entry => (entry.id === updated.id ? { ...entry, ...updated } : entry));
      }
    });
    builder.addCase(addLeadNote.rejected, state => {
      state.noteSaving = false;
    });

    builder.addCase(createLead.pending, state => {
      state.createLeadLoading = true;
      state.createLeadError = '';
    });
    builder.addCase(createLead.fulfilled, (state, action) => {
      state.createLeadLoading = false;
      if (action.payload) {
        state.leads = [action.payload, ...state.leads];
        state.leadsTotal += 1;
      }
    });
    builder.addCase(createLead.rejected, (state, action) => {
      state.createLeadLoading = false;
      state.createLeadError = (action.payload as string) || 'Failed to create lead. Please try again.';
    });
  },
});

export const { clearImportResult } = waitlistSlice.actions;
export default waitlistSlice.reducer;
