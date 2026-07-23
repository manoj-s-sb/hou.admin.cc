import { isSuperAdmin } from '../rbac/permissions';
import store from '../store/store';
import { facilityScope } from '../utils/facilityScope';

export const getLocalUser = (): { userId: string; name: string; facilityCode: string } => {
  const u = store.getState().auth.user;
  if (!u) return { userId: '', name: '', facilityCode: '' };
  const name = [u.firstName, u.lastName].filter(Boolean).join(' ');
  return { userId: u.userId || '', name, facilityCode: u.facilityCode || '' };
};

/**
 * The facility code to scope API calls to. Gated on ROLE, not on any localStorage flag,
 * so it's correct regardless of how the page was reached (deep-link, refresh, bookmark):
 *  - Super admin → the centre they've opened (facilityScope), or '' when on the list.
 *  - Everyone else (coach/staff) → the facility assigned at login. A stale selected-centre
 *    value can never leak into their requests because the role check excludes it.
 */
export const getFacilityCode = (): string => {
  if (isSuperAdmin()) return facilityScope.get();
  return getLocalUser().facilityCode;
};
