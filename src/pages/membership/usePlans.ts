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

import endpoints from '../../constants/endpoints';
import api from '../../services';

import { DEFAULT_FACILITY_CODE } from './constants';
import { mapApiMembership, toUpdatePayload, type ApiMembershipsPayload } from './mapApiPlan';
import { SEED_PLANS } from './seed';

import type { MembershipPlan } from './types';

interface UsePlansResult {
  plans: MembershipPlan[];
  isLoading: boolean;
  usingMockData: boolean;
  refetch: () => void;
  /** Local upsert so the drawer reflects changes before the API is wired. */
  upsertPlan: (plan: MembershipPlan) => void;
}

export function usePlans(facilityCode: string = DEFAULT_FACILITY_CODE): UsePlansResult {
  const [plans, setPlans] = useState<MembershipPlan[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [usingMockData, setUsingMockData] = useState(false);
  const [nonce, setNonce] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);

    api
      .get<{ data: ApiMembershipsPayload }>(endpoints.memberships.list, {
        params: { facilityCode },
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
    await api.post(endpoints.memberships.update, toUpdatePayload(plan));
    return true;
  } catch {
    return false;
  }
}
