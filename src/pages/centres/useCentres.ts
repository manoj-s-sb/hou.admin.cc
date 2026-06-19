/**
 * Data-fetching hooks for the Centre Management module.
 *
 * The grid talks to the NEW doc-bundle endpoints via `centresApi`
 * (POST /admin/centres/list) and gracefully falls back to seed data when the
 * API is unreachable (404 / network error) so the module stays usable while
 * the backend environment is being wired. The ops dashboard hooks
 * (useCentreMembers / useCentreBookings) still use the legacy endpoints.
 */
import { useCallback, useEffect, useState } from 'react';

import endpoints from '../../constants/endpoints';
import api from '../../services';

import { listCentres } from './centresApi';
import { SEED_CENTRES, seedBookings, seedMembers } from './seed';

import type { CentreApiStatus, FacilitySummary } from './apiTypes';
import type { CentreBooking, CentreMember } from './types';

export { createCentre, updateCentre, getCentreDetails } from './centresApi';

/* ── Centre grid (new list endpoint) ───────────────────────────────────────── */

/** Map a seed CentreWithKPI onto the new FacilitySummary list-row shape. */
const seedToSummary = (c: (typeof SEED_CENTRES)[number]): FacilitySummary => ({
  id: c.id,
  code: c.shortCode,
  name: c.name,
  status: c.status === 'active' ? 'active' : c.status === 'suspended' ? 'suspended' : 'draft',
  cityCode: c.city,
  countryCode: typeof c.country === 'string' ? c.country : '',
  stateCode: c.state ?? '',
  timezone: c.timezone,
  latitude: 0,
  longitude: 0,
  freeSolts: c.foundationPool,
  createdAt: c.createdAt ?? '',
  updatedAt: c.updatedAt ?? '',
});

const SEED_SUMMARIES: FacilitySummary[] = SEED_CENTRES.map(seedToSummary);

/** Client-side filter + paginate over seed rows (mirrors the server contract). */
const mockList = (params: UseCentresParams) => {
  let rows = SEED_SUMMARIES;
  if (params.status) rows = rows.filter(r => r.status === params.status);
  const q = params.search?.trim().toLowerCase();
  if (q) {
    rows = rows.filter(
      r => r.name.toLowerCase().includes(q) || r.code.toLowerCase().includes(q) || r.cityCode.toLowerCase().includes(q)
    );
  }
  const total = rows.length;
  return { facilities: rows.slice(params.skip, params.skip + params.limit), total };
};

export interface UseCentresParams {
  status?: CentreApiStatus;
  search?: string;
  skip: number;
  limit: number;
}

export interface UseCentresResult {
  facilities: FacilitySummary[];
  total: number;
  isLoading: boolean;
  usingMockData: boolean;
  refetch: () => void;
}

export function useCentres({ status, search, skip, limit }: UseCentresParams): UseCentresResult {
  const [facilities, setFacilities] = useState<FacilitySummary[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [usingMockData, setUsingMockData] = useState(false);
  const [nonce, setNonce] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);

    listCentres({ status, search: search?.trim() || undefined, skip, limit })
      .then(res => {
        if (cancelled) return;
        setFacilities(res.facilities ?? []);
        setTotal(res.total ?? res.facilities?.length ?? 0);
        setUsingMockData(false);
      })
      .catch(() => {
        // API not ready — fall back to filtered/paginated seed data.
        if (cancelled) return;
        const mock = mockList({ status, search, skip, limit });
        setFacilities(mock.facilities);
        setTotal(mock.total);
        setUsingMockData(true);
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [status, search, skip, limit, nonce]);

  const refetch = useCallback(() => setNonce(n => n + 1), []);

  return { facilities, total, isLoading, usingMockData, refetch };
}

/* ── Ops dashboard hooks (legacy endpoints — unchanged) ─────────────────────── */

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

/* ── Wizard session helpers — no-ops (new model uses a single create call) ──── */

export async function startWizard(): Promise<string | null> {
  return null;
}

export async function saveWizardStep(_wizardId?: string | null, _step?: number, _payload?: unknown): Promise<void> {
  /* new model has no per-step persistence — submission is one create call */
}
