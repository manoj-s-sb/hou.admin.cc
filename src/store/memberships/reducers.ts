import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

import { getMemberships } from './api';
import { initialState, type MembershipPlan } from './types';

const membershipsSlice = createSlice({
  name: 'memberships',
  initialState,
  reducers: {
    /** Local upsert so the drawer reflects a save before the refetch lands. */
    upsertPlan(state, action: PayloadAction<MembershipPlan>) {
      const idx = state.plans.findIndex(p => p.id === action.payload.id);
      if (idx === -1) state.plans.push(action.payload);
      else state.plans[idx] = action.payload;
    },
  },
  extraReducers: builder => {
    builder.addCase(getMemberships.pending, state => {
      state.isLoading = true;
      state.error = null;
    });
    builder.addCase(getMemberships.fulfilled, (state, action) => {
      state.isLoading = false;
      state.plans = action.payload;
    });
    builder.addCase(getMemberships.rejected, (state, action) => {
      state.isLoading = false;
      state.plans = [];
      state.error = action.payload ?? 'Failed to fetch memberships';
    });
  },
});

export const { upsertPlan } = membershipsSlice.actions;
export default membershipsSlice.reducer;
