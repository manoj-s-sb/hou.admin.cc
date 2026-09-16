import { PermissionAction } from '../store/auth/types';
import store from '../store/store';

// Role strings the backend may use to denote a super admin. Compared
// case-insensitively. Add any new backend variants here.
export const SUPER_ADMIN_ROLES = ['stancebeamadmin', 'superadmin'] as const;
export const [SUPER_ADMIN_ROLE] = SUPER_ADMIN_ROLES;

export const SUPER_ADMIN_ONLY = '__superadmin__';

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
  // Also honour the userType-based definition, so a superadmin is never denied
  // because their role string differs from their userType.
  const userTypes = (store.getState().auth.user?.userType ?? []).map(t => t.toLowerCase());
  return SUPER_ADMIN_ROLES.some(r => userTypes.includes(r));
};

const toList = (key: ModuleKey): readonly string[] => (Array.isArray(key) ? key : [key as string]);

export const hasPermission = (modules: ModuleKey | undefined, action: PermissionAction): boolean => {
  if (!modules) return true;
  if (isSuperAdmin()) return true;
  const list = toList(modules);
  if (list.includes(SUPER_ADMIN_ONLY)) return false;

  const storedModules = getModules();
  // Permissions missing for a non-superadmin: deny-by-default, not allow-all.
  if (!storedModules) return false;

  return list.some(m => storedModules[m]?.includes(action));
};

export const canRead = (modules: ModuleKey | undefined): boolean => hasPermission(modules, 'read');

export const canWrite = (modules: ModuleKey | undefined): boolean => hasPermission(modules, 'write');
