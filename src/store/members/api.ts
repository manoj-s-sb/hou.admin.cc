import { createAsyncThunk } from '@reduxjs/toolkit';
import axios from 'axios';

import endpoints from '../../constants/endpoints';
import api from '../../services';
import { handleApiError } from '../../utils/errorUtils';
import store from '../store';

import { ActivateSubscriptionRequest, MemberRequest } from './types';

export const getMembers = createAsyncThunk(
  'members/getMembers',
  async (
    { skip, limit, facilityCode, search, billingCycle, subscriptionCode, subscriptionStatus }: MemberRequest,
    { rejectWithValue }
  ) => {
    try {
      const response = await api.post(endpoints.members.list, {
        skip,
        limit,
        facilityCode,
        search,
        billingCycle,
        subscriptionCode,
        subscriptionStatus,
      });
      return response.data;
    } catch (error) {
      return rejectWithValue(handleApiError(error, 'Failed to fetch members list'));
    }
  }
);

export const getSingleMemberDetails = createAsyncThunk(
  'members/getSingleMemberDetails',
  async ({ userId }: { userId: string }, { rejectWithValue }) => {
    try {
      const response = await api.post(`${endpoints.members.membersDetails}`, {
        userId,
      });
      return response.data;
    } catch (error) {
      return rejectWithValue(handleApiError(error, 'Failed to fetch single member details'));
    }
  }
);

export const activateUserSubscription = createAsyncThunk(
  'user/activateUserSubscription',
  async ({ userId, adminId, adminName }: ActivateSubscriptionRequest, { rejectWithValue }) => {
    try {
      const accessToken = store.getState().auth.tokens?.access_token || '';
      //uat: 'https://century-subscription-func-uat-fkapb0bphngbgnfb.centralindia-01.azurewebsites.net/subscription/admin/activate',
      //prod: 'https://subscription-func-g4dvhpbhemd9hsbd.centralus-01.azurewebsites.net/subscription/admin/activate',
      const response = await axios.post(
        'https://century-subscription-func-uat-fkapb0bphngbgnfb.centralindia-01.azurewebsites.net/subscription/admin/activate',
        {
          userId,
          adminId,
          adminName,
        },
        {
          headers: {
            'Content-Type': 'application/json',
            ...(accessToken && { Authorization: `Bearer ${accessToken}` }),
          },
        }
      );

      return response?.data;
    } catch (error) {
      const err = error as { response?: { data?: unknown }; message?: string };
      return rejectWithValue(err.response?.data || err.message || 'Failed to activate user subscription');
    }
  }
);
export const getMembersCount = createAsyncThunk(
  'members/getMembersCount',
  async ({ facilityCode }: { facilityCode: string }, { rejectWithValue }) => {
    try {
      const response = await api.post(endpoints.members.membersCount, {
        facilityCode,
      });
      return response.data;
    } catch (error) {
      return rejectWithValue(handleApiError(error, 'Failed to fetch members count'));
    }
  }
);
