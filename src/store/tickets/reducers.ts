import { createSlice } from '@reduxjs/toolkit';

import {
  acknowledgeTicket,
  addTicketAttachment,
  addTicketComment,
  createTicket,
  getTicket,
  getTicketCounts,
  getTickets,
  reassignTicket,
  updateTicketStatus,
} from './api';
import { initialTicketsState, Ticket } from './types';

const ticketsSlice = createSlice({
  name: 'tickets',
  initialState: initialTicketsState,
  reducers: {
    clearCurrentTicket: state => {
      state.current = null;
      state.detailError = null;
    },
  },
  extraReducers: builder => {
    // Keep `current` and the matching list row in sync after any mutation.
    const applyUpdated = (state: typeof initialTicketsState, ticket: Ticket) => {
      state.saving = false;
      state.current = ticket;
      const idx = state.items.findIndex(t => t.id === ticket.id);
      if (idx >= 0) state.items[idx] = ticket;
    };

    // ── List ──
    builder.addCase(getTickets.pending, state => {
      state.listLoading = true;
      state.listError = null;
    });
    builder.addCase(getTickets.fulfilled, (state, action) => {
      state.listLoading = false;
      state.items = action.payload.items;
      state.total = action.payload.total;
      state.page = action.payload.page;
      state.limit = action.payload.limit;
    });
    builder.addCase(getTickets.rejected, (state, action) => {
      state.listLoading = false;
      state.items = [];
      state.total = 0;
      state.listError = action.payload ?? 'Failed to fetch tickets';
    });

    // ── Counts ──
    builder.addCase(getTicketCounts.fulfilled, (state, action) => {
      state.counts = action.payload;
    });

    // ── Single ticket ──
    builder.addCase(getTicket.pending, state => {
      state.detailLoading = true;
      state.detailError = null;
      state.current = null;
    });
    builder.addCase(getTicket.fulfilled, (state, action) => {
      state.detailLoading = false;
      state.current = action.payload;
    });
    builder.addCase(getTicket.rejected, (state, action) => {
      state.detailLoading = false;
      state.detailError = action.payload ?? 'Failed to load the ticket';
    });

    // ── Mutations (all return the updated ticket) ──
    [
      createTicket,
      updateTicketStatus,
      acknowledgeTicket,
      addTicketComment,
      addTicketAttachment,
      reassignTicket,
    ].forEach(thunk => {
      builder.addCase(thunk.pending, state => {
        state.saving = true;
      });
      builder.addCase(thunk.fulfilled, (state, action) => {
        applyUpdated(state, action.payload as Ticket);
      });
      builder.addCase(thunk.rejected, state => {
        state.saving = false;
      });
    });
  },
});

export const { clearCurrentTicket } = ticketsSlice.actions;
export default ticketsSlice.reducer;
