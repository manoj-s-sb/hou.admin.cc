/**
 * Centre Management — async thunks for the doc-bundle endpoints.
 *
 * Thin wrappers over the shared axios instance (`src/services`) that unwrap the
 * Each thunk rejects (via `handleApiError`) on failure so the slice/UI can show
 * a message — there is no seed/mock fallback.
 */
import { createAsyncThunk } from '@reduxjs/toolkit';

import endpoints from '../../constants/endpoints';
import { getLocalUser } from '../../constants/user';
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
  LeadEntry,
  WaitlistEntry,
} from './types';

const actorName = (): string | undefined => getLocalUser().name || undefined;

/**
 * The waitlist/leads endpoints return the standard envelope, but `data` may be
 * either a bare array or a `{ <listKey>, total }` wrapper depending on backend
 * version — unwrap both shapes the same defensive way the other thunks do.
 */
const unwrapList = <T>(data: unknown, keys: string[]): { entries: T[]; total: number } => {
  if (Array.isArray(data)) return { entries: data as T[], total: data.length };
  const obj = (data ?? {}) as Record<string, unknown>;
  const listKey = keys.find(k => Array.isArray(obj[k]));
  const entries = (listKey ? (obj[listKey] as T[]) : []) as T[];
  const total = typeof obj.total === 'number' ? obj.total : entries.length;
  return { entries, total };
};

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
    // Map the API's `stats` rollup onto the `kpi` shape the card reads.
    const facilities = (data.facilities ?? []).map(f => ({
      ...f,
      kpi: f.kpi ?? {
        totalMembers: f.stats?.totalMembers,
        bookings30d: f.stats?.totalBookingsLast30Days,
        noShowPct: f.stats?.noShowRatePercent,
        plans: f.stats?.membersByPlan,
        tailgates: f.stats?.tailgates,
        openTasks: f.stats?.openTasks,
        // null (not yet configured) is left as-is → card renders "—", not "0%".
        utilisationPct: f.stats?.utilisationPct,
        utilisationStatus: f.stats?.utilisationStatus,
      },
    }));
    return { facilities, total: data.total ?? facilities.length };
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
 * POST /admin/centres/update — edit an existing centre (change capacity/plans,
 * flip status, etc).
 *
 * The endpoint keys on `centreId` (accepted as an alias for `code`) and takes the
 * SAME optional bundle parts as /create — `facility` (partial patch, carries
 * `status`), plus `lanes[]`, `memberships[]` and `membershipSalesFlow`, all
 * upserted by deterministic id (matched by code, so nothing duplicates). We send
 * the full payload so capacity (which lives in the sales-flow doc), plan and lane
 * edits all persist — not just the facility fields.
 */
export const updateCentre = createAsyncThunk<
  CentreBundle,
  { payload: CentreCreateRequest; centreId: string },
  { rejectValue: string }
>('centres/updateCentre', async ({ payload, centreId }, { rejectWithValue }) => {
  try {
    const body = { centreId, ...payload };
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

/**
 * POST /admin/centres/waitlist — paginated waitlist (promo) entries for a centre.
 *
 * Body keys are validated server-side with `extra="forbid"`, so we send only the
 * documented fields; axios drops `undefined` ones (so "All" omits subscriptionSrc).
 * `registerdVia` keeps the backend's source-data spelling verbatim.
 */
export const getCentreWaitlist = createAsyncThunk<
  { entries: WaitlistEntry[]; total: number; page: number; limit: number },
  { facilityCode: string; subscriptionSrc?: string; registerdVia?: string; page: number; limit: number },
  { rejectValue: string }
>(
  'centres/getCentreWaitlist',
  async ({ facilityCode, subscriptionSrc, registerdVia, page, limit }, { rejectWithValue }) => {
    try {
      const res = await api.post<{ data: unknown }>(endpoints.centres.waitlist, {
        facilityCode,
        subscriptionSrc,
        registerdVia,
        page,
        limit,
      });
      const { entries, total } = unwrapList<WaitlistEntry>(res.data?.data ?? res.data, [
        'items',
        'waitlist',
        'entries',
        'results',
      ]);
      return { entries, total, page, limit };
    } catch (error) {
      return rejectWithValue(handleApiError(error, 'Failed to fetch waitlist'));
    }
  }
);

/** POST /admin/centres/leads — paginated lead-activity logs for a centre. */
export const getCentreLeads = createAsyncThunk<
  { entries: LeadEntry[]; total: number; page: number; limit: number },
  { facilityCode: string; action?: string; subscriptionCode?: string; page: number; limit: number },
  { rejectValue: string }
>('centres/getCentreLeads', async ({ facilityCode, action, subscriptionCode, page, limit }, { rejectWithValue }) => {
  try {
    const res = await api.post<{ data: unknown }>(endpoints.centres.leads, {
      facilityCode,
      action,
      subscription_code: subscriptionCode,
      page,
      limit,
    });
    const { entries, total } = unwrapList<LeadEntry>(res.data?.data ?? res.data, [
      'items',
      'leads',
      'entries',
      'results',
    ]);
    return { entries, total, page, limit };
  } catch (error) {
    return rejectWithValue(handleApiError(error, 'Failed to fetch leads'));
  }
});

/** POST /admin/centres/waitlist/notes/add — append an admin note, returns the updated entry. */
export const addWaitlistNote = createAsyncThunk<
  WaitlistEntry,
  { facilityCode: string; waitlistId: string; text: string },
  { rejectValue: string }
>('centres/addWaitlistNote', async ({ facilityCode, waitlistId, text }, { rejectWithValue }) => {
  try {
    const res = await api.post<{ data: WaitlistEntry }>(endpoints.centres.waitlistNotesAdd, {
      facilityCode,
      waitlistId,
      text,
      createdByName: actorName(),
    });
    return res.data?.data ?? (res.data as unknown as WaitlistEntry);
  } catch (error) {
    return rejectWithValue(handleApiError(error, 'Failed to add note'));
  }
});

/**
 * POST /admin/centres/leads/create — manually add a lead (not backed by the funnel
 * tracker). Backend's CreateLeadRequest (extra="forbid") only accepts exactly:
 * facilityCode, name (required), email (required), phone, planInterest.
 */
export const createLead = createAsyncThunk<
  LeadEntry,
  { facilityCode: string; name: string; email: string; phone?: string; subscriptionCode?: string },
  { rejectValue: string }
>('centres/createLead', async ({ facilityCode, name, email, phone, subscriptionCode }, { rejectWithValue }) => {
  try {
    const res = await api.post<{ data: LeadEntry }>(endpoints.centres.leadsCreate, {
      facilityCode,
      name,
      email,
      phone,
      planInterest: subscriptionCode,
    });
    return res.data?.data ?? (res.data as unknown as LeadEntry);
  } catch (error) {
    return rejectWithValue(handleApiError(error, 'Failed to add lead'));
  }
});

/** POST /admin/centres/leads/notes/add — append an admin note, returns the updated entry. */
export const addLeadNote = createAsyncThunk<
  LeadEntry,
  { facilityCode: string; leadId: string; text: string },
  { rejectValue: string }
>('centres/addLeadNote', async ({ facilityCode, leadId, text }, { rejectWithValue }) => {
  try {
    const res = await api.post<{ data: LeadEntry }>(endpoints.centres.leadsNotesAdd, {
      facilityCode,
      leadId,
      text,
      createdByName: actorName(),
    });
    return res.data?.data ?? (res.data as unknown as LeadEntry);
  } catch (error) {
    return rejectWithValue(handleApiError(error, 'Failed to add note'));
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
