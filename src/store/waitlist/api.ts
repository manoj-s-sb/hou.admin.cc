import { createAsyncThunk } from '@reduxjs/toolkit';

import endpoints from '../../constants/endpoints';
import api from '../../services';
import { handleApiError } from '../../utils/errorUtils';

import {
  GetWaitlistRequest,
  AddWaitlistNoteRequest,
  BulkImportWaitlistRequest,
  GetLeadsRequest,
  AddLeadNoteRequest,
  CreateLeadRequest,
} from './types';

// Backend responses for list endpoints vary between a bare array and an
// object wrapping the array under one of several possible keys.
function unwrapList(data: any, keys: string[]): { entries: any[]; total: number } {
  const payload = data?.data ?? data;

  if (Array.isArray(payload)) {
    return { entries: payload, total: payload.length };
  }

  for (const key of keys) {
    if (Array.isArray(payload?.[key])) {
      return { entries: payload[key], total: payload.total ?? payload[key].length };
    }
  }

  return { entries: [], total: 0 };
}

export const getWaitlist = createAsyncThunk(
  'waitlist/getWaitlist',
  async ({ facilityCode, subscriptionSrc, registerdVia, page, limit, all }: GetWaitlistRequest, { rejectWithValue }) => {
    try {
      // Omit facilityCode entirely for "All Centres" (empty/undefined) — the
      // backend treats a missing facilityCode as "combine every centre".
      const payload: any = {};
      if (facilityCode) payload.facilityCode = facilityCode;
      if (subscriptionSrc) payload.subscriptionSrc = subscriptionSrc;
      if (registerdVia) payload.registerdVia = registerdVia;
      if (all) {
        payload.all = true;
      } else {
        payload.page = page;
        payload.limit = limit;
      }

      const response = await api.post(endpoints.waitlist.list, payload);
      const { entries, total } = unwrapList(response?.data, ['items', 'waitlist', 'entries', 'results']);
      return { entries, total };
    } catch (error: any) {
      return rejectWithValue(handleApiError(error, 'Failed to fetch waitlist'));
    }
  }
);

export const addWaitlistNote = createAsyncThunk(
  'waitlist/addWaitlistNote',
  async ({ facilityCode, waitlistId, text, createdByName }: AddWaitlistNoteRequest, { rejectWithValue }) => {
    try {
      const response = await api.post(endpoints.waitlist.notesAdd, {
        facilityCode,
        waitlistId,
        text,
        createdByName,
      });
      return response?.data?.data ?? response?.data;
    } catch (error: any) {
      return rejectWithValue(handleApiError(error, 'Failed to add note'));
    }
  }
);

export const bulkImportWaitlist = createAsyncThunk(
  'waitlist/bulkImportWaitlist',
  async ({ facilityCode, subscriptionSrc, entries }: BulkImportWaitlistRequest, { rejectWithValue }) => {
    try {
      const response = await api.post(endpoints.waitlist.import, { facilityCode, subscriptionSrc, entries });
      return response?.data?.data ?? response?.data;
    } catch (error: any) {
      return rejectWithValue(handleApiError(error, 'Failed to import waitlist entries'));
    }
  }
);

export const getLeads = createAsyncThunk(
  'waitlist/getLeads',
  async ({ facilityCode, action, subscriptionCode, page, limit }: GetLeadsRequest, { rejectWithValue }) => {
    try {
      const payload: any = { page, limit };
      if (facilityCode) payload.facilityCode = facilityCode;
      if (action) payload.action = action;
      if (subscriptionCode) payload.subscription_code = subscriptionCode;

      const response = await api.post(endpoints.leads.list, payload);
      const { entries, total } = unwrapList(response?.data, ['items', 'leads', 'entries', 'results']);
      return { entries, total, page, limit };
    } catch (error: any) {
      return rejectWithValue(handleApiError(error, 'Failed to fetch leads'));
    }
  }
);

export const addLeadNote = createAsyncThunk(
  'waitlist/addLeadNote',
  async ({ facilityCode, leadId, text, createdByName }: AddLeadNoteRequest, { rejectWithValue }) => {
    try {
      const response = await api.post(endpoints.leads.notesAdd, { facilityCode, leadId, text, createdByName });
      return response?.data?.data ?? response?.data;
    } catch (error: any) {
      return rejectWithValue(handleApiError(error, 'Failed to add note'));
    }
  }
);

export const createLead = createAsyncThunk(
  'waitlist/createLead',
  async ({ facilityCode, name, email, phone, planInterest }: CreateLeadRequest, { rejectWithValue }) => {
    try {
      const payload: any = { facilityCode, name, email };
      if (phone) payload.phone = phone;
      if (planInterest) payload.planInterest = planInterest;

      const response = await api.post(endpoints.leads.create, payload);
      return response?.data?.data ?? response?.data;
    } catch (error: any) {
      return rejectWithValue(handleApiError(error, 'Failed to create lead'));
    }
  }
);
