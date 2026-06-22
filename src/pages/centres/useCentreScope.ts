import { useEffect } from 'react';

import { useSelector } from 'react-redux';

import { useCentreNav } from '../../contexts/CentreNavContext';
import { RootState } from '../../store/store';

/**
 * Rehydrates the centre context + facility scope from a URL :facilityCode.
 *
 * Shared by every centre module route (members, slot-bookings, …) so the sidebar's
 * centre nav and the API scope work on a direct load / refresh when the in-memory
 * context is empty. openCentre() also writes facilityScope.
 */
export const useCentreScope = (facilityCode: string): void => {
  const { activeCentre, openCentre } = useCentreNav();
  const facilities = useSelector((state: RootState) => state.centres.facilities);

  useEffect(() => {
    if (!facilityCode || activeCentre?.code === facilityCode) return;
    const f = facilities.find(x => x.code === facilityCode);
    openCentre({
      code: facilityCode,
      name: f?.name ?? facilityCode,
      countryCode: f?.countryCode ?? '',
      status: f?.status ?? 'active',
    });
  }, [facilityCode, activeCentre, facilities, openCentre]);
};
