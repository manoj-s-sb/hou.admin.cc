/**
 * Centre Management — async thunks for the doc-bundle endpoints.
 *
 * Thin wrappers over the shared axios instance (`src/services`) that unwrap the
 * standard `{ status, message, data, statusCode }` envelope and return `data`.
 * Each thunk rejects (via `handleApiError`) on failure so the slice/UI can show
 * a message — there is no seed/mock fallback.
 */
import { createAsyncThunk } from '@reduxjs/toolkit';

import endpoints from '../../constants/endpoints';
import api from '../../services';
import { handleApiError } from '../../utils/errorUtils';

import type {
  CentreApiStatus,
  CentreBooking,
  CentreBundle,
  CentreCreateRequest,
  CentreListRequest,
  CentreListResponse,
  CentreMember,
  FacilitySummary,
} from './types';

/** POST /admin/centres/list — paginated facility rows (skip + limit). */
export const getCentres = createAsyncThunk<
  { facilities: FacilitySummary[]; total: number },
  { status?: CentreApiStatus; search?: string; skip: number; limit: number },
  { rejectValue: string }
>('centres/getCentres', async ({ status, search, skip, limit }, { rejectWithValue }) => {
  try {
    const body: CentreListRequest = {
      sort: 'createdAtTs',
      order: 'desc',
      status,
      search: search?.trim() || undefined,
      skip,
      limit,
    };
    const res = await api.post<{ data: CentreListResponse }>(endpoints.centres.centresList, body);
    const data = res.data?.data ?? (res.data as unknown as CentreListResponse);
    return { facilities: data.facilities ?? [], total: data.total ?? data.facilities?.length ?? 0 };
  } catch (error) {
    return rejectWithValue(handleApiError(error, 'Failed to fetch centres'));
  }
});

/** POST /admin/centres/details — full doc bundle for one centre. */
export const getCentreDetails = createAsyncThunk<CentreBundle, string, { rejectValue: string }>(
  'centres/getCentreDetails',
  async (code, { rejectWithValue }) => {
    try {
      const res = await api.post<{ data: CentreBundle }>(endpoints.centres.centreDetails, { code });
      return res.data?.data ?? (res.data as unknown as CentreBundle);
    } catch (error) {
      return rejectWithValue(
        handleApiError(error, 'Could not load this centre. The details API may not be reachable yet.')
      );
    }
  }
);

/** POST /admin/centres/create — create a centre from the assembled bundle. */
export const createCentre = createAsyncThunk<CentreBundle, CentreCreateRequest, { rejectValue: string }>(
  'centres/createCentre',
  async (payload, { rejectWithValue }) => {
    try {
      const res = await api.post<{ data: CentreBundle }>(endpoints.centres.centreCreate, payload);
      return res.data?.data ?? (res.data as unknown as CentreBundle);
    } catch (error) {
      return rejectWithValue(handleApiError(error, 'Could not save the centre. Please try again.'));
    }
  }
);

/**
 * POST /admin/centres/update — edit an existing centre (e.g. activate a draft).
 *
 * The update endpoint keys on `centreId` and accepts the `facility` document
 * (which carries `status`, so this is what flips draft → active). It does NOT
 * take the same `lanes[]` / `memberships[]` arrays as /create — those sections
 * use a different request shape that isn't documented yet, so we omit them and
 * send only the facility.
 */
export const updateCentre = createAsyncThunk<
  CentreBundle,
  { payload: CentreCreateRequest; centreId: string },
  { rejectValue: string }
>('centres/updateCentre', async ({ payload, centreId }, { rejectWithValue }) => {
  try {
    const body = { centreId, facility: payload.facility };
    const res = await api.post<{ data: CentreBundle }>(endpoints.centres.centreUpdate, body);
    return res.data?.data ?? (res.data as unknown as CentreBundle);
  } catch (error) {
    return rejectWithValue(handleApiError(error, 'Could not save the centre. Please try again.'));
  }
});

/** GET /admin/centres/:id/members — ops dashboard member list. */
export const getCentreMembers = createAsyncThunk<
  CentreMember[],
  { centreId: string; search?: string; plan?: string; status?: string },
  { rejectValue: string }
>('centres/getCentreMembers', async ({ centreId, search, plan, status }, { rejectWithValue }) => {
  try {
    const res = await api.get<{ data: CentreMember[] }>(endpoints.centres.members(centreId), {
      params: { search, plan, status },
    });
    const data = res.data?.data ?? (res.data as unknown as CentreMember[]);
    return Array.isArray(data) ? data : [];
  } catch (error) {
    return rejectWithValue(handleApiError(error, 'Failed to fetch members'));
  }
});

/** GET /admin/centres/:id/bookings — ops dashboard booking list. */
export const getCentreBookings = createAsyncThunk<CentreBooking[], string, { rejectValue: string }>(
  'centres/getCentreBookings',
  async (centreId, { rejectWithValue }) => {
    try {
      const res = await api.get<{ data: CentreBooking[] }>(endpoints.centres.bookings(centreId));
      const data = res.data?.data ?? (res.data as unknown as CentreBooking[]);
      return Array.isArray(data) ? data : [];
    } catch (error) {
      return rejectWithValue(handleApiError(error, 'Failed to fetch bookings'));
    }
  }
);
