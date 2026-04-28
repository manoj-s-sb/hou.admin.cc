import { createSlice } from '@reduxjs/toolkit';

import {
  getMembers,
  getSingleMemberDetails,
  activateUserSubscription,
  getMembersCount,
  getMemberPurchasedSlots,
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
      state.error = action.payload || 'Failed to fetch members list';
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
      state.error = action.payload || 'Failed to fetch single member details';
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
      state.error = action.payload || 'Failed to fetch members count';
    });
    builder.addCase(getMemberPurchasedSlots.pending, state => {
      state.isPurchasedSlotsLoading = true;
    });
    builder.addCase(getMemberPurchasedSlots.fulfilled, (state, action) => {
      state.isPurchasedSlotsLoading = false;
      state.purchasedSlotsData = action.payload?.data || null;
    });
    builder.addCase(getMemberPurchasedSlots.rejected, state => {
      state.isPurchasedSlotsLoading = false;
      state.purchasedSlotsData = null;
    });
  },
});

export default membersSlice.reducer;
