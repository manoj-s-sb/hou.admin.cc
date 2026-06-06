import { createAsyncThunk } from '@reduxjs/toolkit';

import endpoints from '../../constants/endpoints';
import { getLocalUser } from '../../constants/user';
import api from '../../services';
import { handleApiError } from '../../utils/errorUtils';

import { CreateTailgateEventRequest, TailgateReview, TailgateStats } from './types';

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
      const { facilityCode } = getLocalUser();
      const response = await api.post(endpoints.tailgate.review, {
        id: payload.id,
        facilityCode,
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

export const fetchTailgateStats = createAsyncThunk(
  'tailgate/fetchStats',
  async (
    filters: { fromDate?: string; toDate?: string; memberName?: string; laneDoor?: string; eventType?: string; reviewStatus?: string } = {},
    { rejectWithValue }
  ) => {
    try {
      const now = new Date();
      const [y, m, d] = now.toLocaleDateString('en-CA', { timeZone: 'America/Chicago' }).split('-');
      const date = `${d}-${m}-${y}`;
      const payload: Record<string, string> = { date };
      if (filters.fromDate) payload.fromDate = filters.fromDate;
      if (filters.toDate) payload.toDate = filters.toDate;
      if (filters.memberName) payload.memberName = filters.memberName;
      if (filters.laneDoor) payload.laneDoor = filters.laneDoor;
      if (filters.eventType) payload.eventType = filters.eventType;
      if (filters.reviewStatus) payload.reviewStatus = filters.reviewStatus;
      const response = await api.post(endpoints.tailgate.stats, payload);
      return response?.data?.data as TailgateStats;
    } catch (error: any) {
      return rejectWithValue(handleApiError(error, 'Failed to fetch tailgate stats'));
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
