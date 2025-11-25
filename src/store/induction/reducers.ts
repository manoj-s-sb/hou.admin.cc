import { createSlice } from '@reduxjs/toolkit';
import { initialState } from './types';
import { inductionList, getInductionStepsDetails, updateInductionSteps, updateTourStatus } from './api';

const inductionSlice = createSlice({
  name: 'induction',
  initialState,
  reducers: {
    setSelectedInduction: (state, action) => {
      state.selectedInduction = action.payload;
    },
  },
  extraReducers: builder => {
    builder.addCase(inductionList.pending, state => {
      state.isLoading = true;
      state.error = '';
    });
    builder.addCase(inductionList.fulfilled, (state, action) => {
      state.isLoading = false;
      state.inductionList = action.payload?.data || {
        bookings: [],
        total: 0,
        page: 0,
        limit: 0,
      };
    });
    builder.addCase(inductionList.rejected, (state, action) => {
      state.isLoading = false;
      state.error = (action.payload as string) || 'Induction list failed. Please try again.';
    });
    builder.addCase(getInductionStepsDetails.pending, state => {
      state.isLoading = true;
      state.error = '';
    });
    builder.addCase(getInductionStepsDetails.fulfilled, (state, action) => {
      state.isLoading = false;
      state.inductionStep = action.payload?.data || null;
    });
    builder.addCase(getInductionStepsDetails.rejected, (state, action) => {
      state.isLoading = false;
      state.error = (action.payload as string) || 'Induction steps details failed. Please try again.';
    });
    builder.addCase(updateInductionSteps.pending, state => {
      state.isLoading = true;
      state.error = '';
    });
    builder.addCase(updateInductionSteps.fulfilled, state => {
      state.isLoading = false;
      state.error = '';
    });
    builder.addCase(updateInductionSteps.rejected, (state, action) => {
      state.isLoading = false;

      console.error('Update Induction Steps Failed:', {
        payload: action.payload,
        error: action.error,
        meta: action.meta,
      });
      state.error = (action.payload as string) || 'Failed to update induction steps. Please try again.';
    });
    builder.addCase(updateTourStatus.pending, state => {
      state.isLoading = true;
      state.error = '';
    });
    builder.addCase(updateTourStatus.fulfilled, state => {
      state.isLoading = false;
      state.error = '';
    });
    builder.addCase(updateTourStatus.rejected, (state, action) => {
      state.isLoading = false;
      state.error = (action.payload as string) || 'Failed to update tour status. Please try again.';
    });
  },
});

export const { setSelectedInduction } = inductionSlice.actions;
export default inductionSlice.reducer;
