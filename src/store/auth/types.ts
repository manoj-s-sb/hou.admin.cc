export interface User {
  id: string;
  userId: string;
  email: string;
  firstName: string;
  lastName: string;
  userType: string[];
  facilityCode: string | null;
  countryCode?: string | null;
  status: 'active' | 'inactive';
  createdAt: string;
  lastLoginAt: string;
}

export interface AuthTokens {
  access_token: string;
  token_type: string;
  expires_in: number;
  refresh_token: string;
}

export type PermissionAction = 'read' | 'write';

export interface Permissions {
  role: string;
  facilityCode: string;
  modules: Record<string, PermissionAction[]>;
}

export type ScopeType = 'global' | 'country' | 'regional' | 'facility';

/** Data-visibility scope from login/me. Country & region codes are lowercase;
 *  facility codes are UPPERCASE. May be null → treated as no centre access. */
export interface Scope {
  role: string;
  scopeType: ScopeType;
  countryCodes: string[];
  regionCodes: string[];
  facilityCodes: string[];
}

/**
 * One backend-resolved sidebar entry (already filtered + sorted for this user).
 * `id` is the module id (matches `permissions.modules` keys / MODULES values).
 * `canEdit === false` → the module page renders read-only. Extra keys are
 * tolerated; the frontend maps `id` onto its own icon/route/group visuals.
 */
export interface SidebarItem {
  id: string;
  label?: string;
  order?: number;
  canEdit?: boolean;
  [key: string]: unknown;
}

/** A centre the user is assigned to, resolved to a detail object by the backend. */
export interface AssignedCentre {
  code: string;
  name?: string;
  [key: string]: unknown;
}

export interface LoginResponse {
  status: string;
  message: string;
  data: {
    user: User;
    tokens: AuthTokens;
    permissions?: Permissions | null;
    scope?: Scope | null;
    sidebar?: SidebarItem[] | null;
    assignedCentres?: AssignedCentre[] | null;
  };
  statusCode: string;
}

export interface AuthState {
  isLoading: boolean;
  isAuthenticated: boolean;
  loginResponse: LoginResponse | null;
  tokens: AuthTokens | null;
  user: User | null;
  permissions: Permissions | null;
  scope: Scope | null;
  /** Backend-filtered + sorted sidebar. Empty/null → fall back to full menu. */
  sidebar: SidebarItem[] | null;
  /** Centres the user is assigned to, as resolved detail objects. */
  assignedCentres: AssignedCentre[] | null;
  tokenExpirationTime: number | null;
  error: string | null;
}

export const initialState: AuthState = {
  isLoading: false,
  isAuthenticated: false,
  loginResponse: null,
  tokens: null,
  user: null,
  permissions: null,
  scope: null,
  sidebar: null,
  assignedCentres: null,
  tokenExpirationTime: null,
  error: null,
};
