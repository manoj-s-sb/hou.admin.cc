import { useParams } from 'react-router-dom';

import { getFacilityCode } from '../constants/user';

/**
 * The facility code the current page should act on.
 *
 * Priority:
 *  1. The centre in the URL — a `/centres/:facilityCode/...` route (a card opened from
 *     Centre Management, or a deep-link). This wins for EVERY role, so opening Houston
 *     shows Houston's data, not the viewer's default facility.
 *  2. Otherwise (the global sidebar pages, which have no `:facilityCode`) → the role-based
 *     default in `getFacilityCode()` (super-admin = network-wide, coach/staff = own centre).
 *
 * Reads the URL (not the persisted `facilityScope`) on purpose: `facilityScope` lives in
 * localStorage and can go stale across visits, which for a facility-scoped role would leak
 * another centre's data. The URL cannot go stale.
 *
 * SECURITY: honouring the URL centre for facility-scoped roles relies on the API rejecting
 * centres the caller isn't allowed to see — the client cannot enforce that on its own.
 */
export const useScopedFacilityCode = (): string => {
  const { facilityCode } = useParams<{ facilityCode?: string }>();
  return facilityCode || getFacilityCode();
};
