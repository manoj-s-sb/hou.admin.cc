/**
 * Centre facility scope — the single source of truth for "which facility are we acting on".
 *
 * Two sources feed the active facility code (see resolveFacilityCode in services):
 *  1. SELECTED centre — written here when a superadmin opens a centre. Stored under its
 *     own plain key (matching the existing 'user' / 'permissions' localStorage keys).
 *  2. ASSIGNED facility — auth.user.facilityCode, set at login for coach/staff.
 *
 * Stored under `centreFacilityCode` to stay distinct from the assigned `user.facilityCode`.
 * This module imports nothing from the store so it is safe to use from the axios layer
 * and the UI alike.
 */
const SELECTED_KEY = 'centreFacilityCode';
const MODE_KEY = 'isCenterManagement';

export const facilityScope = {
  /** Superadmin opened a centre — scope every subsequent request to it. */
  set: (code: string): void => {
    if (code) localStorage.setItem(SELECTED_KEY, code);
  },
  /** The selected centre code, or '' when no centre is open (coach/staff fall back to auth). */
  get: (): string => localStorage.getItem(SELECTED_KEY) ?? '',
  /** "Back to Centres" — drop the selected centre (stays in centre-management mode). */
  clear: (): void => localStorage.removeItem(SELECTED_KEY),

  /** Superadmin entered Centre Management. */
  enterManagement: (): void => localStorage.setItem(MODE_KEY, 'true'),
  isManagement: (): boolean => localStorage.getItem(MODE_KEY) === 'true',

  /** Logout — clear both the selected centre and the management flag. */
  reset: (): void => {
    localStorage.removeItem(SELECTED_KEY);
    localStorage.removeItem(MODE_KEY);
  },
};

/**
 * Opt-in marker for facility-scoped requests. Pass as the axios config so the request
 * interceptor injects the resolved facilityCode — endpoints that don't accept it (strict
 * schemas) simply omit the flag and are never touched.
 *
 *   api.post(endpoints.members.list, { skip, limit }, SCOPED);
 *   api.get(endpoints.members.detail, SCOPED);
 */
export const SCOPED = { facilityScoped: true } as const;

// Teach axios' config about the opt-in flag so callers + interceptor are type-safe.
declare module 'axios' {
  interface AxiosRequestConfig {
    facilityScoped?: boolean;
  }
}
