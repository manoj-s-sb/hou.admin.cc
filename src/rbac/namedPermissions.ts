/**
 * Named permissions (backend `shared/access_permissions.py`) — for the handful
 * of actions restricted to specific individuals rather than a whole role (e.g.
 * deleting a waitlist entry). Deliberately separate from `permissions.ts`'s
 * `hasPermission()`, which always lets a superadmin through — these checks
 * must NOT do that, so they're resolved server-side per logged-in user and
 * cached here rather than derived from `isSuperAdmin()`.
 *
 * The server returns only booleans for the names you ask about — never the
 * underlying allow-list — so a client never learns which other logins hold a
 * permission, just its own.
 */
import endpoints from '../constants/endpoints';
import api from '../services';

type ResolvedMap = Record<string, boolean>;

let cache: ResolvedMap = {};
let inFlight: Promise<ResolvedMap> | null = null;

/** Fetch + cache the given named permissions for the current user. Safe to call
 * repeatedly (e.g. on every page mount) — concurrent calls share one request. */
export const fetchNamedPermissions = async (names: string[]): Promise<ResolvedMap> => {
  if (!names.length) return cache;
  if (inFlight) await inFlight;

  inFlight = api
    .post<{ data: ResolvedMap }>(endpoints.centres.permissionsResolve, { names })
    .then(res => res.data?.data ?? {})
    .catch(() => ({}) as ResolvedMap) // fail-closed: an unresolved name reads as false via getNamedPermission
    .finally(() => {
      inFlight = null;
    });

  const resolved = await inFlight;
  cache = { ...cache, ...resolved };
  return cache;
};

/** Synchronous read of a previously-fetched named permission. False (not
 * undefined) until resolved — fail-closed, never shows a restricted action by
 * default while the fetch is in flight. */
export const getNamedPermission = (name: string): boolean => cache[name] === true;
