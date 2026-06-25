import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';

import { facilityScope } from '../utils/facilityScope';

import type { CentreApiStatus } from '../store/centres/types';

/** Modules shown in the centre's left nav (mirrors the HTML ops-nav). */
export type CentreModuleKey =
  // Operations
  'members' | 'bookings' | 'coach' | 'induction' | 'tours' | 'tailgate' | 'maintenance' | 'waitlist';

/** Minimal centre identity needed to drive the sidebar badge + detail fetch. */
export interface ActiveCentre {
  code: string;
  name: string;
  countryCode: string;
  status: CentreApiStatus;
}

interface CentreNavContextValue {
  /** Non-null while a centre is open — the global Sidebar swaps to its module nav. */
  activeCentre: ActiveCentre | null;
  module: CentreModuleKey;
  openCentre: (centre: ActiveCentre) => void;
  closeCentre: () => void;
  setModule: (module: CentreModuleKey) => void;
}

const CentreNavContext = createContext<CentreNavContextValue | null>(null);

export const CentreNavProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [activeCentre, setActiveCentre] = useState<ActiveCentre | null>(null);
  const [module, setModule] = useState<CentreModuleKey>('members');

  const openCentre = useCallback((centre: ActiveCentre) => {
    facilityScope.set(centre.code); // scope every API call to this centre
    setActiveCentre(centre);
    setModule('members'); // open on Members first, like the reference
  }, []);
  const closeCentre = useCallback(() => {
    facilityScope.clear(); // back to the all-centres list — no centre scope
    setActiveCentre(null);
  }, []);

  const value = useMemo<CentreNavContextValue>(
    () => ({ activeCentre, module, openCentre, closeCentre, setModule }),
    [activeCentre, module, openCentre, closeCentre]
  );

  return <CentreNavContext.Provider value={value}>{children}</CentreNavContext.Provider>;
};

export const useCentreNav = (): CentreNavContextValue => {
  const ctx = useContext(CentreNavContext);
  if (!ctx) throw new Error('useCentreNav must be used within a CentreNavProvider');
  return ctx;
};
