/**
 * Data hook for the Membership Plans module.
 *
 * Like the Centre Management hooks, this talks to the shared axios instance and
 * falls back to seed data when the API is unavailable (404 / network error).
 * Swap the seed fallback out once the plan-template endpoints are live — the
 * request shape already matches the spec.
 */
import { useCallback, useEffect, useState } from 'react';

import endpoints from '../../constants/endpoints';
import api from '../../services';

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

export function usePlans(): UsePlansResult {
  const [plans, setPlans] = useState<MembershipPlan[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [usingMockData, setUsingMockData] = useState(false);
  const [nonce, setNonce] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);

    api
      .get<{ data: MembershipPlan[] }>(endpoints.membershipPlans.list)
      .then(res => {
        if (cancelled) return;
        const data = res.data?.data ?? (res.data as unknown as MembershipPlan[]);
        if (Array.isArray(data) && data.length) {
          setPlans(data);
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
  }, [nonce]);

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

/** Best-effort persistence while the API is being built. */
export async function savePlan(plan: MembershipPlan): Promise<boolean> {
  try {
    if (plan.id && SEED_PLANS.some(p => p.id === plan.id)) {
      await api.put(endpoints.membershipPlans.update(String(plan.id)), plan);
    } else {
      await api.post(endpoints.membershipPlans.list, plan);
    }
    return true;
  } catch {
    return false;
  }
}
