import { createAsyncThunk } from '@reduxjs/toolkit';

import endpoints from '../../constants/endpoints';
import api from '../../services';
import { handleApiError } from '../../utils/errorUtils';

import { CreateTailgateEventRequest, TailgateReview } from './types';

export const submitTailgateReview = createAsyncThunk(
  'tailgate/submitReview',
  async (
    payload: {
      id: string;
      comment: string;
      memberName: string | null;
      memberType: string | null;
      memberId: string | null;
      subscription: string | null;
      isViolation: boolean;
      actualEventType: string | null;
    },
    { rejectWithValue }
  ) => {
    try {
      const response = await api.post(endpoints.tailgate.review, {
        id: payload.id,
        facilityCode: 'HOU01',
        comment: payload.comment,
        memberName: payload.memberName,
        memberType: payload.memberType,
        memberId: payload.memberId,
        subscription: payload.subscription,
        isViolation: payload.isViolation,
        actualEventType: payload.isViolation ? null : payload.actualEventType,
      });
      return response?.data?.data as { id: string; eventId: string; review: TailgateReview };
    } catch (error: any) {
      if (error?.response?.status === 404) {
        return rejectWithValue('Event not found in the database.');
      }
      return rejectWithValue(handleApiError(error, 'Failed to submit review'));
    }
  }
);

export const fetchTailgateEvents = createAsyncThunk(
  'tailgate/fetchEvents',
  async (payload: CreateTailgateEventRequest, { rejectWithValue }) => {
    try {
      const response = await api.post(endpoints.tailgate.createEvent, payload);
      return response?.data?.data ?? response?.data;
    } catch (error: any) {
      return rejectWithValue(handleApiError(error, 'Failed to fetch tailgate events'));
    }
  }
);
