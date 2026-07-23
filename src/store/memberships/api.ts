/**
 * Async thunks for the Memberships module.
 *
 * Loads the facility's memberships from the live
 * `GET /admin/memberships?facilityCode=…` endpoint and maps the rich nested
 * response onto the flat `MembershipPlan` model (see `mapApiMembership`).
 */
import { createAsyncThunk } from '@reduxjs/toolkit';
import { AxiosError } from 'axios';

import endpoints from '../../constants/endpoints';
import api from '../../services';
import { handleApiError } from '../../utils/errorUtils';

import { mapApiMembership, toCreatePayload, toUpdatePayload } from './mapApiPlan';

import type { ApiMembershipsPayload, CreatePlanResult, MembershipPlan, ValidationErrorBody } from './types';

/**
 * Lists memberships and maps them to flat plans. Resolves with an empty array
 * when the API returns no memberships; rejects on request failure.
 *
 * @param facilityCode  When omitted, lists the GLOBAL plan templates
 *   (`GET /admin/memberships`). When provided, lists that centre's per-centre
 *   instances (`?facilityCode=…`) — used by Centre Management, not this page.
 */
export const getMemberships = createAsyncThunk<MembershipPlan[], string | undefined, { rejectValue: string }>(
  'memberships/getMemberships',
  async (facilityCode, { rejectWithValue }) => {
    try {
      const res = await api.get<{ data: ApiMembershipsPayload }>(endpoints.memberships.list, {
        params: facilityCode ? { facilityCode } : undefined,
      });
      const payload = res.data?.data ?? (res.data as unknown as ApiMembershipsPayload);
      const memberships = payload?.memberships;
      return Array.isArray(memberships) ? memberships.map(mapApiMembership) : [];
    } catch (error) {
      return rejectWithValue(handleApiError(error, 'Failed to fetch memberships'));
    }
  }
);

/** Daily FX rates for the network reference-price currency conversion. */
export interface FxRatesResult {
  base: string;
  rates: Record<string, number>;
  asOf?: string;
}

/**
 * Fetches daily market FX rates from `GET /admin/fxrates`, so the plan reference
 * prices convert at current rates instead of a fixed table. The caller falls back
 * to the static defaults when this rejects (endpoint absent / offline).
 */
export const getFxRates = createAsyncThunk<FxRatesResult, void, { rejectValue: string }>(
  'memberships/getFxRates',
  async (_, { rejectWithValue }) => {
    try {
      const res = await api.get<{ data: FxRatesResult }>(endpoints.memberships.fxRates);
      const payload = res.data?.data ?? (res.data as unknown as FxRatesResult);
      return { base: payload?.base ?? 'USD', rates: payload?.rates ?? {}, asOf: payload?.asOf };
    } catch (error) {
      return rejectWithValue(handleApiError(error, 'Failed to fetch exchange rates'));
    }
  }
);

/**
 * Creates a new global plan template via `POST /admin/memberships/create`.
 * Maps the flat drawer model to the create body and classifies the response so
 * the caller can surface a duplicate-code error, validation fields, etc.
 *
 * Resolves with a discriminated `CreatePlanResult` (never rejects) — unwrap the
 * dispatched thunk to read the status.
 */
export const createMembership = createAsyncThunk<
  CreatePlanResult,
  { plan: MembershipPlan; customHours?: { start: string; end: string } }
>('memberships/createMembership', async ({ plan, customHours }) => {
  try {
    await api.post(endpoints.memberships.create, toCreatePayload(plan, customHours));
    return { status: 'ok' };
  } catch (e) {
    const err = e as AxiosError<ValidationErrorBody>;
    const code = err.response?.status;
    if (code === 409) return { status: 'duplicate' };
    if (code === 400) {
      const errors = err.response?.data?.data?.errors ?? [];
      const fields = errors
        .map(x => (Array.isArray(x.loc) ? x.loc[x.loc.length - 1] : x.loc))
        .filter((f): f is string => typeof f === 'string' && f.length > 0);
      return { status: 'validation', fields };
    }
    if (code === 401 || code === 403) return { status: 'auth' };
    return { status: 'error' };
  }
});

/**
 * Persists a plan via `POST /admin/memberships/update`. The flat drawer model
 * is mapped back to the backend's nested membership shape (changed fields
 * merged onto the original, see `toUpdatePayload`) before sending. Resolves
 * `true` on success, `false` on any error (never rejects).
 */
export const updateMembership = createAsyncThunk<boolean, MembershipPlan>(
  'memberships/updateMembership',
  async plan => {
    try {
      await api.post(endpoints.memberships.update, toUpdatePayload(plan));
      return true;
    } catch {
      return false;
    }
  }
);
