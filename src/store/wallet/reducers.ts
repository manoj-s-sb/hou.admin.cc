import { createSlice } from '@reduxjs/toolkit';

import { creditWallet, listWalletTransactions } from './api';
import { initialWalletState } from './types';

const walletSlice = createSlice({
  name: 'wallet',
  initialState: initialWalletState,
  reducers: {
    clearCreditError: state => {
      state.creditError = null;
    },
  },
  extraReducers: builder => {
    builder.addCase(listWalletTransactions.pending, state => {
      state.isLoading = true;
      state.error = null;
    });
    builder.addCase(listWalletTransactions.fulfilled, (state, action) => {
      state.isLoading = false;
      state.transactions = action.payload;
    });
    builder.addCase(listWalletTransactions.rejected, (state, action) => {
      state.isLoading = false;
      state.error = (action.payload as string) ?? 'Failed to fetch wallet transactions';
    });

    builder.addCase(creditWallet.pending, state => {
      state.isCrediting = true;
      state.creditError = null;
    });
    builder.addCase(creditWallet.fulfilled, state => {
      state.isCrediting = false;
    });
    builder.addCase(creditWallet.rejected, (state, action) => {
      state.isCrediting = false;
      state.creditError = (action.payload as string) ?? 'Failed to credit wallet';
    });
  },
});

export const { clearCreditError } = walletSlice.actions;
export default walletSlice.reducer;
