import { createAsyncThunk } from '@reduxjs/toolkit';
import axios from 'axios';

import endpoints from '../../constants/endpoints';
import api from '../../services';
import { handleApiError } from '../../utils/errorUtils';
import store from '../store';

import { ActivateSubscriptionRequest, MemberNoteItem, MemberRequest } from './types';

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

// ── Admin Notes ──────────────────────────────────────────────────────
// Kept as a separate slice of state (memberNotes) from memberDetails so
// adding/editing/deleting a note never has to refetch the whole member
// object — see MembersInitialState in ./types.ts.

export const getMemberNotes = createAsyncThunk(
  'members/getMemberNotes',
  async ({ userId }: { userId: string }, { rejectWithValue }) => {
    try {
      const response = await api.post(endpoints.members.notesList, { userId });
      return response.data as { data: { notes: MemberNoteItem[] } };
    } catch (error) {
      return rejectWithValue(handleApiError(error, 'Failed to fetch notes'));
    }
  }
);

export const addMemberNote = createAsyncThunk(
  'members/addMemberNote',
  async ({ userId, noteText }: { userId: string; noteText: string }, { rejectWithValue }) => {
    try {
      const response = await api.post(endpoints.members.notesAdd, { userId, noteText });
      return response.data as { data: MemberNoteItem };
    } catch (error) {
      return rejectWithValue(handleApiError(error, 'Failed to add note'));
    }
  }
);

export const updateMemberNote = createAsyncThunk(
  'members/updateMemberNote',
  async ({ userId, noteId, noteText }: { userId: string; noteId: string; noteText: string }, { rejectWithValue }) => {
    try {
      const response = await api.post(endpoints.members.notesUpdate, { userId, noteId, noteText });
      return response.data as { data: MemberNoteItem };
    } catch (error) {
      return rejectWithValue(handleApiError(error, 'Failed to update note'));
    }
  }
);

export const deleteMemberNote = createAsyncThunk(
  'members/deleteMemberNote',
  async ({ userId, noteId }: { userId: string; noteId: string }, { rejectWithValue }) => {
    try {
      await api.post(endpoints.members.notesDelete, { userId, noteId });
      return { noteId };
    } catch (error) {
      return rejectWithValue(handleApiError(error, 'Failed to delete note'));
    }
  }
);
