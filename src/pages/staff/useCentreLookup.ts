/**
 * Loads the live centre catalogue from Centre Management and resolves centre
 * codes → human-readable labels ("Name, State"). No hard-coded centre names — the
 * staff list / view screens display exactly the centres that exist in the DB.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';

import { useDispatch } from 'react-redux';

import { getCentres } from '../../store/centres/api';

import type { FacilitySummary } from '../../store/centres/types';
import type { AppDispatch } from '../../store/store';

export interface CentreLookup {
  /** Label for a single centre code: "Bangalore, KA" — falls back to the raw code. */
  label: (code: string | null | undefined) => string;
  /** Comma-joined labels for codes, or the labelled fallback (e.g. home facility). */
  text: (codes: string[] | null | undefined, fallback?: string | null) => string;
  loading: boolean;
}

export function useCentreLookup(): CentreLookup {
  const dispatch = useDispatch<AppDispatch>();
  const [byCode, setByCode] = useState<Record<string, FacilitySummary>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    dispatch(getCentres({ skip: 0, limit: 200 }))
      .unwrap()
      .then(res => {
        if (cancelled) return;
        const map: Record<string, FacilitySummary> = {};
        (res.facilities ?? []).forEach(c => {
          if (c.code) map[c.code.toUpperCase()] = c;
        });
        setByCode(map);
      })
      .catch(() => {
        if (!cancelled) setByCode({});
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [dispatch]);

  const label = useCallback(
    (code: string | null | undefined): string => {
      if (!code) return '—';
      const c = byCode[code.toUpperCase()];
      if (!c) return code; // not yet loaded / unknown → show the raw code, never a guess
      const place = [c.name, c.stateCode || c.cityCode].filter(Boolean).join(', ');
      return place || c.code;
    },
    [byCode]
  );

  // Multiple centres are separated with " · " so each "Name, State" stays readable.
  const text = useCallback(
    (codes: string[] | null | undefined, fallback?: string | null): string => {
      if (codes && codes.length > 0) return codes.map(label).join(' · ');
      return fallback ? label(fallback) : '—';
    },
    [label]
  );

  return useMemo(() => ({ label, text, loading }), [label, text, loading]);
}
