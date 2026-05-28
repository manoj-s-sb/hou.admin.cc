import { PermissionAction } from '../store/auth/types';

export const SUPER_ADMIN_ROLE = 'stancebeamadmin';

export const SUPER_ADMIN_ONLY = '__superadmin__';

export type ModuleKey = string | readonly string[];

type ModulesMap = Record<string, PermissionAction[]>;

interface StoredPermissions {
  role?: string;
  facilityCode?: string;
  modules?: ModulesMap;
  [moduleKey: string]: unknown;
}

const META_KEYS = new Set(['role', 'facilityCode', 'modules']);

const readStoredPermissions = (): StoredPermissions | null => {
  try {
    const raw = localStorage.getItem('permissions');
    return raw ? (JSON.parse(raw) as StoredPermissions) : null;
  } catch {
    return null;
  }
};

const getModules = (): ModulesMap | null => {
  const stored = readStoredPermissions();
  if (!stored) return null;
  if (stored.modules && typeof stored.modules === 'object') return stored.modules;
  const flat: ModulesMap = {};
  Object.entries(stored).forEach(([key, value]) => {
    if (META_KEYS.has(key)) return;
    if (Array.isArray(value)) flat[key] = value as PermissionAction[];
  });
  return Object.keys(flat).length ? flat : null;
};

const getRoleFromUser = (): string => {
  try {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    return user?.userType?.[0] ?? '';
  } catch {
    return '';
  }
};

export const getRole = (): string => readStoredPermissions()?.role || getRoleFromUser();

export const isSuperAdmin = (): boolean => getRole() === SUPER_ADMIN_ROLE;

const toList = (key: ModuleKey): readonly string[] => (Array.isArray(key) ? key : [key as string]);

export const hasPermission = (modules: ModuleKey | undefined, action: PermissionAction): boolean => {
  if (!modules) return true;
  const list = toList(modules);
  if (list.includes(SUPER_ADMIN_ONLY)) return isSuperAdmin();
  if (isSuperAdmin()) return true;

  const storedModules = getModules();
  // Backend hasn't deployed RBAC yet — preserve legacy allow-all behavior.
  if (!storedModules) return true;

  return list.some(m => storedModules[m]?.includes(action));
};

export const canRead = (modules: ModuleKey | undefined): boolean => hasPermission(modules, 'read');

export const canWrite = (modules: ModuleKey | undefined): boolean => hasPermission(modules, 'write');
