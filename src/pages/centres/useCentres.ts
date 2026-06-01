/**
 * Data-fetching hooks for the Centre Management module.
 *
 * The portal uses Redux Toolkit thunks elsewhere, but the centre endpoints are
 * still being built backend-side, so these hooks talk to the shared axios
 * instance directly and gracefully fall back to seed data when the API is
 * unavailable (404 / network error). Swap the seed fallback out once the
 * endpoints are live — the request shape already matches the spec.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';

import endpoints from '../../constants/endpoints';
import api from '../../services';

import { SEED_CENTRES, seedBookings, seedMembers } from './seed';

import type { CentreBooking, CentreMember, CentreWithKPI, NetworkSummary, WizardState } from './types';

const round1 = (n: number) => Math.round(n * 10) / 10;

export const buildSummary = (centres: CentreWithKPI[]): NetworkSummary => {
  if (!centres.length) {
    return { totalCentres: 0, totalMembers: 0, avgUtilisation: 0, avgNoShow: 0 };
  }
  const totalMembers = centres.reduce((sum, c) => sum + c.kpi.totalMembers, 0);
  const avgUtilisation = Math.round(centres.reduce((sum, c) => sum + c.kpi.utilisationPct, 0) / centres.length);
  const avgNoShow = round1(centres.reduce((sum, c) => sum + c.kpi.noShowPct, 0) / centres.length);
  return { totalCentres: centres.length, totalMembers, avgUtilisation, avgNoShow };
};

interface UseCentresResult {
  centres: CentreWithKPI[];
  summary: NetworkSummary;
  isLoading: boolean;
  error: string | null;
  usingMockData: boolean;
  refetch: () => void;
}

export function useCentres(): UseCentresResult {
  const [centres, setCentres] = useState<CentreWithKPI[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [usingMockData, setUsingMockData] = useState(false);
  const [nonce, setNonce] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setError(null);

    api
      .get<{ data: CentreWithKPI[] }>(endpoints.centres.list)
      .then(res => {
        if (cancelled) return;
        const data = res.data?.data ?? (res.data as unknown as CentreWithKPI[]);
        if (Array.isArray(data) && data.length) {
          setCentres(data);
          setUsingMockData(false);
        } else {
          setCentres(SEED_CENTRES);
          setUsingMockData(true);
        }
      })
      .catch(() => {
        // API not ready yet — fall back to seed data so the module is usable.
        if (cancelled) return;
        setCentres(SEED_CENTRES);
        setUsingMockData(true);
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [nonce]);

  const summary = useMemo(() => buildSummary(centres), [centres]);
  const refetch = useCallback(() => setNonce(n => n + 1), []);

  return { centres, summary, isLoading, error, usingMockData, refetch };
}

interface UseCentreMembersParams {
  search?: string;
  plan?: string;
  status?: string;
}

export function useCentreMembers(centreId: string | null, params: UseCentreMembersParams = {}) {
  const [members, setMembers] = useState<CentreMember[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { search, plan, status } = params;

  useEffect(() => {
    if (!centreId) return;
    let cancelled = false;
    setIsLoading(true);

    api
      .get<{ data: CentreMember[] }>(endpoints.centres.members(centreId), {
        params: { search, plan, status },
      })
      .then(res => {
        if (cancelled) return;
        const data = res.data?.data ?? (res.data as unknown as CentreMember[]);
        setMembers(Array.isArray(data) && data.length ? data : seedMembers(centreId));
      })
      .catch(() => {
        if (!cancelled) setMembers(seedMembers(centreId));
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [centreId, search, plan, status]);

  return { members, isLoading };
}

export function useCentreBookings(centreId: string | null) {
  const [bookings, setBookings] = useState<CentreBooking[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!centreId) return;
    let cancelled = false;
    setIsLoading(true);

    api
      .get<{ data: CentreBooking[] }>(endpoints.centres.bookings(centreId))
      .then(res => {
        if (cancelled) return;
        const data = res.data?.data ?? (res.data as unknown as CentreBooking[]);
        setBookings(Array.isArray(data) && data.length ? data : seedBookings(centreId));
      })
      .catch(() => {
        if (!cancelled) setBookings(seedBookings(centreId));
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [centreId]);

  return { bookings, isLoading };
}

/* ── Wizard persistence helpers ─────────────────────────────────────────── */

export async function startWizard(): Promise<string | null> {
  try {
    const res = await api.post<{ data: { id: string } }>(endpoints.centres.wizardStart);
    return res.data?.data?.id ?? null;
  } catch {
    return null;
  }
}

export async function saveWizardStep(wizardId: string | null, step: number, payload: unknown): Promise<void> {
  if (!wizardId) return;
  try {
    await api.patch(endpoints.centres.wizardStep(wizardId, step), payload);
  } catch {
    /* best-effort persistence while the API is being built */
  }
}

export async function commitWizard(state: WizardState, activate: boolean): Promise<boolean> {
  if (!state.wizardId) return true; // mock mode — treat as success
  try {
    const url = activate ? endpoints.centres.saveActivate(state.wizardId) : endpoints.centres.saveDraft(state.wizardId);
    await api.post(url, state);
    return true;
  } catch {
    return false;
  }
}
