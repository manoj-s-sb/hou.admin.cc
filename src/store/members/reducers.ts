import { createSlice } from '@reduxjs/toolkit';

import {
  getMembers,
  getSingleMemberDetails,
  activateUserSubscription,
  getMembersCount,
  getMemberNotes,
  addMemberNote,
  updateMemberNote,
  deleteMemberNote,
} from './api';
import { initialState } from './types';

const membersSlice = createSlice({
  name: 'members',
  initialState,
  reducers: {},
  extraReducers: builder => {
    builder.addCase(getMembers.pending, state => {
      state.isLoading = true;
      state.error = '';
    });
    builder.addCase(getMembers.fulfilled, (state, action) => {
      state.isLoading = false;
      state.membersList = action.payload?.data || [];
    });
    builder.addCase(getMembers.rejected, (state, action) => {
      state.isLoading = false;
      state.error = (action.payload as string) || 'Failed to fetch members list';
    });
    builder.addCase(getSingleMemberDetails.pending, state => {
      state.isLoading = true;
      state.error = '';
    });
    builder.addCase(getSingleMemberDetails.fulfilled, (state, action) => {
      state.isLoading = false;
      state.memberDetails = action.payload?.data || [];
    });
    builder.addCase(getSingleMemberDetails.rejected, (state, action) => {
      state.isLoading = false;
      state.error = (action.payload as string) || 'Failed to fetch single member details';
    });
    builder.addCase(activateUserSubscription.pending, state => {
      state.isLoading = true;
      state.error = '';
      state.isSubscriptionActivation = true;
    });
    builder.addCase(activateUserSubscription.fulfilled, state => {
      state.isLoading = false;
      state.isSubscriptionActivation = false;
      state.error = '';
    });
    builder.addCase(activateUserSubscription.rejected, (state, action) => {
      state.isLoading = false;
      state.isSubscriptionActivation = false;
      state.error = (action.payload as string) || 'Failed to activate user subscription. Please try again.';
    });
    builder.addCase(getMembersCount.pending, state => {
      state.membersCountLoading = true;
      state.error = '';
    });
    builder.addCase(getMembersCount.fulfilled, (state, action) => {
      state.membersCountLoading = false;
      state.membersCount = action.payload?.data || [];
    });
    builder.addCase(getMembersCount.rejected, (state, action) => {
      state.membersCountLoading = false;
      state.error = (action.payload as string) || 'Failed to fetch members count';
    });

    // Admin Notes — a dedicated loading/error pair, separate from the member
    // details fetch's, so a note action never shows a spinner over the rest
    // of the page (and vice versa).
    builder.addCase(getMemberNotes.pending, state => {
      state.memberNotesLoading = true;
      state.memberNotesError = null;
    });
    builder.addCase(getMemberNotes.fulfilled, (state, action) => {
      state.memberNotesLoading = false;
      state.memberNotes = action.payload?.data?.notes || [];
    });
    builder.addCase(getMemberNotes.rejected, (state, action) => {
      state.memberNotesLoading = false;
      state.memberNotesError = (action.payload as string) || 'Failed to fetch notes';
    });

    builder.addCase(addMemberNote.pending, state => {
      state.memberNotesError = null;
    });
    builder.addCase(addMemberNote.fulfilled, (state, action) => {
      const note = action.payload?.data;
      if (note) state.memberNotes = [note, ...state.memberNotes];
    });
    builder.addCase(addMemberNote.rejected, (state, action) => {
      state.memberNotesError = (action.payload as string) || 'Failed to add note';
    });

    builder.addCase(updateMemberNote.pending, state => {
      state.memberNotesError = null;
    });
    builder.addCase(updateMemberNote.fulfilled, (state, action) => {
      const updated = action.payload?.data;
      if (updated) state.memberNotes = state.memberNotes.map(n => (n.id === updated.id ? updated : n));
    });
    builder.addCase(updateMemberNote.rejected, (state, action) => {
      state.memberNotesError = (action.payload as string) || 'Failed to update note';
    });

    builder.addCase(deleteMemberNote.pending, state => {
      state.memberNotesError = null;
    });
    builder.addCase(deleteMemberNote.fulfilled, (state, action) => {
      const { noteId } = action.payload;
      state.memberNotes = state.memberNotes.filter(n => n.id !== noteId);
    });
    builder.addCase(deleteMemberNote.rejected, (state, action) => {
      state.memberNotesError = (action.payload as string) || 'Failed to delete note';
    });
  },
});

export default membersSlice.reducer;
