import { createAsyncThunk } from '@reduxjs/toolkit';

import endpoints from '../../constants/endpoints';
import api from '../../services';
import { handleApiError } from '../../utils/errorUtils';

import { WalletCreditRequest, WalletTransactionListRequest } from './types';

export const listWalletTransactions = createAsyncThunk(
  'wallet/listWalletTransactions',
  async (request: WalletTransactionListRequest, { rejectWithValue }) => {
    try {
      const response = await api.post(endpoints.wallets.transactionsList, request);
      return response.data?.data;
    } catch (error) {
      return rejectWithValue(handleApiError(error, 'Failed to fetch wallet transactions'));
    }
  }
);

/** Superadmin only — the backend 403s any other role regardless of module permissions. */
export const creditWallet = createAsyncThunk(
  'wallet/creditWallet',
  async (request: WalletCreditRequest, { rejectWithValue }) => {
    try {
      const response = await api.post(endpoints.wallets.credit, request);
      return response.data?.data;
    } catch (error) {
      return rejectWithValue(handleApiError(error, 'Failed to credit wallet'));
    }
  }
);
