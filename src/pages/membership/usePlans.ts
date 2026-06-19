/**
 * Data hook for the Membership Plans module.
 *
 * Loads the facility's memberships from the live
 * `GET /admin/memberships?facilityCode=…` endpoint and maps the rich nested
 * response onto the flat `MembershipPlan` model (see `mapApiPlan`). Falls back
 * to seed data when the API is unavailable (404 / network error) so the module
 * stays usable offline.
 */
import { useCallback, useEffect, useState } from 'react';

import { AxiosError } from 'axios';

import endpoints from '../../constants/endpoints';
import api from '../../services';

import { mapApiMembership, toCreatePayload, toUpdatePayload, type ApiMembershipsPayload } from './mapApiPlan';
import { SEED_PLANS } from './seed';

import type { MembershipPlan } from './types';

// The membership endpoints live on the same local backend as Centre Management
// (http://localhost:7071), NOT the shared azure dev URL the default axios
// instance targets. Override the base URL so list/create/update reach it.
// Falls back to the centres base URL (same host) when its own var is unset.
const membershipsBaseUrl =
  process.env.REACT_APP_MEMBERSHIPS_API_BASE_URL || process.env.REACT_APP_CENTRES_API_BASE_URL;
const mcfg = membershipsBaseUrl ? { baseURL: membershipsBaseUrl } : undefined;

interface UsePlansResult {
  plans: MembershipPlan[];
  isLoading: boolean;
  usingMockData: boolean;
  refetch: () => void;
  /** Local upsert so the drawer reflects changes before the API is wired. */
  upsertPlan: (plan: MembershipPlan) => void;
}

/**
 * @param facilityCode  When omitted, lists the GLOBAL plan templates
 *   (`GET /admin/memberships`). When provided, lists that centre's per-centre
 *   instances (`?facilityCode=…`) — used by Centre Management, not this page.
 */
export function usePlans(facilityCode?: string): UsePlansResult {
  const [plans, setPlans] = useState<MembershipPlan[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [usingMockData, setUsingMockData] = useState(false);
  const [nonce, setNonce] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);

    api
      .get<{ data: ApiMembershipsPayload }>(endpoints.memberships.list, {
        ...mcfg,
        params: facilityCode ? { facilityCode } : undefined,
      })
      .then(res => {
        if (cancelled) return;
        const payload = res.data?.data ?? (res.data as unknown as ApiMembershipsPayload);
        const memberships = payload?.memberships;
        if (Array.isArray(memberships) && memberships.length) {
          setPlans(memberships.map(mapApiMembership));
          setUsingMockData(false);
        } else {
          setPlans(SEED_PLANS);
          setUsingMockData(true);
        }
      })
      .catch(() => {
        if (cancelled) return;
        setPlans(SEED_PLANS);
        setUsingMockData(true);
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [nonce, facilityCode]);

  const refetch = useCallback(() => setNonce(n => n + 1), []);

  const upsertPlan = useCallback((plan: MembershipPlan) => {
    setPlans(prev => {
      const idx = prev.findIndex(p => p.id === plan.id);
      if (idx === -1) return [...prev, plan];
      const next = [...prev];
      next[idx] = plan;
      return next;
    });
  }, []);

  return { plans, isLoading, usingMockData, refetch, upsertPlan };
}

/**
 * Persists a plan via `POST /admin/memberships/update`. The flat drawer model
 * is mapped back to the backend's nested membership shape (changed fields
 * merged onto the original, see `toUpdatePayload`) before sending.
 */
export async function savePlan(plan: MembershipPlan): Promise<boolean> {
  try {
    await api.post(endpoints.memberships.update, toUpdatePayload(plan), mcfg);
    return true;
  } catch {
    return false;
  }
}

/** Outcome of a create attempt, discriminated so the drawer can show field/toasts. */
export type CreatePlanResult =
  | { status: 'ok' }
  | { status: 'duplicate' } // 409 — code already exists
  | { status: 'validation'; fields: string[] } // 400 — data.errors[].loc
  | { status: 'auth' } // 401 / 403
  | { status: 'error' };

interface ValidationErrorBody {
  data?: { errors?: { loc?: string[] | string; msg?: string }[] };
}

/**
 * Creates a new global plan template via `POST /admin/memberships/create`.
 * Maps the flat drawer model to the create body and classifies the response so
 * the caller can surface a duplicate-code error, validation fields, etc.
 */
export async function createPlan(
  plan: MembershipPlan,
  customHours?: { start: string; end: string }
): Promise<CreatePlanResult> {
  try {
    await api.post(endpoints.memberships.create, toCreatePayload(plan, customHours), mcfg);
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
}
