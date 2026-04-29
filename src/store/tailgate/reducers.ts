import { createSlice } from '@reduxjs/toolkit';

import { createTailgateEvent, submitTailgateReview } from './api';
import { initialState } from './types';

const tailgateSlice = createSlice({
  name: 'tailgate',
  initialState,
  reducers: {
    updateLogReview(state, action: { payload: {
      id: string;
      status: import('./types').TailgateStatus;
      notes: string | null;
      personName: string | null;
      personType: import('./types').PersonType | null;
      personMemberId: string | null;
      subscription: import('./types').SubscriptionType | null;
    }}) {
      const log = state.logs.find(l => l.id === action.payload.id);
      if (log) {
        log.status        = action.payload.status;
        log.viol          = action.payload.status === 'violation';
        log.notes         = action.payload.notes;
        log.personName    = action.payload.personName;
        log.personType    = action.payload.personType;
        log.personMemberId = action.payload.personMemberId;
        log.subscription  = action.payload.subscription;
      }
    },
  },
  extraReducers: builder => {
    builder.addCase(createTailgateEvent.pending, state => {
      state.isLoading = true;
      state.error = null;
    });
    builder.addCase(createTailgateEvent.fulfilled, (state, action) => {
      state.isLoading = false;
      state.logs = Array.isArray(action.payload) ? action.payload : [];
    });
    builder.addCase(createTailgateEvent.rejected, (state, action) => {
      state.isLoading = false;
      state.error = (action.payload as string) || 'Failed to fetch tailgate events.';
      state.logs = [];
    });
    builder.addCase(submitTailgateReview.fulfilled, (state, action) => {
      const { id, review } = action.payload;
      const log = state.logs.find(l => l.cosmosId === id);
      if (log) {
        log.review         = review;
        log.status         = review.isViolation ? 'violation' : 'reviewed';
        log.viol           = review.isViolation ?? false;
        log.ev             = review.isViolation ? 'Tailgate' : review.actualEventType ? (review.actualEventType === 'entry' ? 'Entry' : 'Exit') : log.ev;
        log.notes          = review.comment;
        log.personName     = review.memberName ?? null;
        log.personType     = review.memberType === 'member' ? 'Member' : review.memberType === 'non-member' ? 'Non-Member' : null;
        log.personMemberId = review.memberId     ?? null;
        log.subscription   = (review.subscription as import('./types').SubscriptionType) ?? null;
      }
    });
  },
});

export const { updateLogReview } = tailgateSlice.actions;
export default tailgateSlice.reducer;
