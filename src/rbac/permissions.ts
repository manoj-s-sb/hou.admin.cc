import { PermissionAction, Scope, ScopeType, SidebarItem } from '../store/auth/types';
import store from '../store/store';

import { SUPER_ADMIN_ONLY, SUPER_ADMIN_ROLES } from './constants';

export type ModuleKey = string | readonly string[];

type ModulesMap = Record<string, PermissionAction[]>;

const getModules = (): ModulesMap | null => {
  const { permissions } = store.getState().auth;
  if (!permissions) return null;
  if (permissions.modules && typeof permissions.modules === 'object') return permissions.modules;
  const flat: ModulesMap = {};
  Object.entries(permissions as unknown as Record<string, unknown>).forEach(([key, value]) => {
    if (Array.isArray(value)) flat[key] = value as PermissionAction[];
  });
  return Object.keys(flat).length ? flat : null;
};

export const getRole = (): string => {
  const { permissions, user } = store.getState().auth;
  return permissions?.role || user?.userType?.[0] || '';
};

export const isSuperAdmin = (): boolean => {
  if (SUPER_ADMIN_ROLES.includes(getRole().toLowerCase() as (typeof SUPER_ADMIN_ROLES)[number])) return true;
  // Also honour the spec's userType-based definition, so a superadmin is never
  // denied because their role string differs from their userType.
  const userTypes = (store.getState().auth.user?.userType ?? []).map(t => t.toLowerCase());
  return SUPER_ADMIN_ROLES.some(r => userTypes.includes(r));
};

/** Spec alias — `isSuperadmin()` (lowercase). Same check as `isSuperAdmin()`. */
export const isSuperadmin = isSuperAdmin;

// Mirrors slots/api/slot_routes.py's _ADMIN_TIER_ROLES exactly — any of these
// on a login grants the full admin-operated Team Schedule view even if
// 'coach'/'staff' is ALSO present. This frontend check only decides what the
// UI shows; the real security boundary is the matching server-side check.
const ADMIN_TIER_ROLES = new Set(['superadmin', 'admin', 'countrymanager', 'regionalmanager']);

/** 'coach'/'staff' when this login should be locked to just their own Team
 * Schedule calendar (that role present, no admin-tier role alongside it);
 * null when the caller gets the full, unrestricted Coach/Staff tab view. */
export const getSelfOnlyPersonnelRole = (): 'coach' | 'staff' | null => {
  const userTypes = (store.getState().auth.user?.userType ?? []).map(t => t.toLowerCase());
  if (userTypes.some(t => ADMIN_TIER_ROLES.has(t))) return null;
  if (userTypes.includes('coach')) return 'coach';
  if (userTypes.includes('staff')) return 'staff';
  return null;
};

const toList = (key: ModuleKey): readonly string[] => (Array.isArray(key) ? key : [key as string]);

export const hasPermission = (modules: ModuleKey | undefined, action: PermissionAction): boolean => {
  if (!modules) return true;
  // A super admin can read/write everything — independent of the modules map — so
  // module-gated items (Tickets, Membership Plans, …) never disappear for them.
  if (isSuperAdmin()) return true;
  const list = toList(modules);
  if (list.includes(SUPER_ADMIN_ONLY)) return false;

  const storedModules = getModules();
  // §6 fallback — permissions missing for a non-superadmin: deny-by-default.
  if (!storedModules) return false;

  return list.some(m => storedModules[m]?.includes(action));
};

/** can(module, verb) — single-module permission check (spec §2). */
export const can = (module: string, verb: PermissionAction): boolean => hasPermission(module, verb);

export const canRead = (modules: ModuleKey | undefined): boolean => hasPermission(modules, 'read');

export const canWrite = (modules: ModuleKey | undefined): boolean => hasPermission(modules, 'write');

// ─── Data-visibility scope (spec §2 / §5) ───────────────────────────────
const getScope = (): Scope | null => store.getState().auth.scope;

/** Effective scope type — superadmin is always global even if scope is null. */
export const scopeType = (): ScopeType | null => {
  if (isSuperAdmin()) return 'global';
  return getScope()?.scopeType ?? null;
};

/** Global reach — superadmin or an explicit global scope: no centre restriction. */
export const isGlobalScope = (): boolean => isSuperAdmin() || getScope()?.scopeType === 'global';

/** Allowed country codes (lowercase). Empty = unrestricted only when global. */
export const allowedCountries = (): string[] => getScope()?.countryCodes ?? [];

/** Allowed region codes (lowercase). */
export const allowedRegions = (): string[] => getScope()?.regionCodes ?? [];

/** Allowed facility codes (UPPERCASE). */
export const allowedFacilities = (): string[] => (getScope()?.facilityCodes ?? []).map(c => c.toUpperCase());

// ─── Backend sidebar (spec §1 / §2) ─────────────────────────────────────
/** The backend-resolved, filtered + sorted sidebar (empty array when absent). */
export const sidebarItems = (): SidebarItem[] => store.getState().auth.sidebar ?? [];

/** The `canEdit` flag the backend set for a module (undefined if not in sidebar). */
export const sidebarCanEdit = (moduleId: string): boolean | undefined =>
  sidebarItems().find(i => i.id === moduleId)?.canEdit;

/**
 * Whether a module page should allow mutations (spec §2): it must be writable
 * AND the backend sidebar must not have flagged it read-only (`canEdit === false`).
 */
export const canEditModule = (moduleId: string): boolean => canWrite(moduleId) && sidebarCanEdit(moduleId) !== false;
