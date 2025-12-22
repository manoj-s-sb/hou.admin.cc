import { createAsyncThunk } from '@reduxjs/toolkit';
import axios from 'axios';

import endpoints from '../../constants/endpoints';
import api from '../../services';
import { handleApiError } from '../../utils/errorUtils';

import { ActivateSubscriptionRequest, MemberRequest } from './types';

export const getMembers = createAsyncThunk(
  'members/getMembers',
  async (
    { skip, limit, facilityCode, email, billingCycle, subscriptionCode, subscriptionStatus }: MemberRequest,
    { rejectWithValue }
  ) => {
    try {
      const response = await api.post(endpoints.members.list, {
        skip,
        limit,
        facilityCode,
        email,
        billingCycle,
        subscriptionCode,
        subscriptionStatus,
      });
      return response.data;
    } catch (error: any) {
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
    } catch (error: any) {
      return rejectWithValue(handleApiError(error, 'Failed to fetch single member details'));
    }
  }
);

export const activateUserSubscription = createAsyncThunk(
  'user/activateUserSubscription',
  async ({ userId, adminId, adminName }: ActivateSubscriptionRequest, { rejectWithValue }) => {
    try {
      // Get the access token from localStorage
      const tokensString = localStorage.getItem('tokens');
      let accessToken = '';

      if (tokensString) {
        const tokens = JSON.parse(tokensString);
        accessToken = tokens.access_token || '';
      }
      //  'https://century-subscription-func-uat-fkapb0bphngbgnfb.centralindia-01.azurewebsites.net/subscription/admin/activate',
      const response = await axios.post(
        'https://subscription-func-g4dvhpbhemd9hsbd.centralus-01.azurewebsites.net/subscription/admin/activate',
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
    } catch (error: any) {
      // Return the actual API error response, not the transformed message
      return rejectWithValue(error.response?.data || error.message || 'Failed to activate user subscription');
    }
  }
);
