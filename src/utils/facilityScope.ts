/**
 * Centre facility scope — the single source of truth for "which facility are we acting on".
 *
 * Two sources feed the active facility code (resolved in getFacilityCode, src/constants/user):
 *  1. SELECTED centre — written here when a superadmin opens a centre. Stored under its
 *     own plain key (matching the existing 'user' / 'permissions' localStorage keys).
 *  2. ASSIGNED facility — auth.user.facilityCode, set at login for coach/staff.
 *
 * Stored under `centreFacilityCode` to stay distinct from the assigned `user.facilityCode`.
 * This module imports nothing from the store so it is safe to use from the axios layer
 * and the UI alike.
 */
const SELECTED_KEY = 'centreFacilityCode';

export const facilityScope = {
  /** Superadmin opened a centre — scope every subsequent request to it. */
  set: (code: string): void => {
    if (code) localStorage.setItem(SELECTED_KEY, code);
  },
  /** The selected centre code, or '' when no centre is open (coach/staff fall back to auth). */
  get: (): string => localStorage.getItem(SELECTED_KEY) ?? '',
  /** "Back to Centres" — drop the selected centre. */
  clear: (): void => localStorage.removeItem(SELECTED_KEY),

  /** Logout — drop the selected centre. */
  reset: (): void => localStorage.removeItem(SELECTED_KEY),
};
