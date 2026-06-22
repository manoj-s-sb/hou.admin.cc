import store from '../store/store';
import { facilityScope } from '../utils/facilityScope';

export const getLocalUser = (): { userId: string; name: string; facilityCode: string } => {
  const u = store.getState().auth.user;
  if (!u) return { userId: '', name: '', facilityCode: '' };
  const name = [u.firstName, u.lastName].filter(Boolean).join(' ');
  return { userId: u.userId || '', name, facilityCode: u.facilityCode || '' };
};

/**
 * The facility code to scope API calls to.
 *  - Superadmin inside Centre Management (isCenterManagement + an opened centre) → the
 *    selected centreFacilityCode.
 *  - Everyone else (coach/staff) → the facility assigned at login.
 */
export const getFacilityCode = (): string => {
  if (facilityScope.isManagement() && facilityScope.get()) return facilityScope.get();
  return getLocalUser().facilityCode;
};
