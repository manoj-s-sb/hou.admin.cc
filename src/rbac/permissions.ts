import { PermissionAction } from '../store/auth/types';
import store from '../store/store';

import { SUPER_ADMIN_ONLY, SUPER_ADMIN_ROLE } from './constants';

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

export const isSuperAdmin = (): boolean => getRole() === SUPER_ADMIN_ROLE;

const toList = (key: ModuleKey): readonly string[] => (Array.isArray(key) ? key : [key as string]);

export const hasPermission = (modules: ModuleKey | undefined, action: PermissionAction): boolean => {
  if (!modules) return true;
  const list = toList(modules);
  if (list.includes(SUPER_ADMIN_ONLY)) return isSuperAdmin();

  const storedModules = getModules();
  if (!storedModules) return false;

  return list.some(m => storedModules[m]?.includes(action));
};

export const canRead = (modules: ModuleKey | undefined): boolean => hasPermission(modules, 'read');

export const canWrite = (modules: ModuleKey | undefined): boolean => hasPermission(modules, 'write');
