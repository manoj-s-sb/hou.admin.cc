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
  const details = useSelector((state: RootState) => state.centres.details);

  useEffect(() => {
    if (!facilityCode) return;
    // The summary list may not be loaded yet on a direct/refreshed load — fall back to
    // the single-centre details bundle (fetched separately by CentreDetailView) so the
    // sidebar upgrades from the bare code to the real name once either source resolves.
    const f = facilities.find(x => x.code === facilityCode);
    const resolved = f ?? (details?.facility.code === facilityCode ? details.facility : undefined);

    const next = {
      code: facilityCode,
      name: resolved?.name ?? facilityCode,
      countryCode: resolved?.countryCode ?? '',
      status: resolved?.status ?? 'active',
    };
    const isSame =
      activeCentre?.code === next.code &&
      activeCentre?.name === next.name &&
      activeCentre?.countryCode === next.countryCode &&
      activeCentre?.status === next.status;

    if (!isSame) openCentre(next);
  }, [facilityCode, activeCentre, facilities, details, openCentre]);
};
