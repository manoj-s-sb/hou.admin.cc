import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';

import type { CentreApiStatus } from '../pages/centres/apiTypes';

/** Modules shown in the centre's left nav (mirrors the HTML ops-nav). */
export type CentreModuleKey =
  // Operations
  | 'members'
  | 'bookings'
  | 'induction'
  | 'tours'
  | 'waitlist'
  | 'tailgate'
  | 'maintenance'
  | 'tickets'
  // Centre Config
  | 'facility'
  | 'lanes'
  | 'plans'
  | 'salesflow';

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
    setActiveCentre(centre);
    setModule('members'); // open on Members first, like the reference
  }, []);
  const closeCentre = useCallback(() => setActiveCentre(null), []);

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
