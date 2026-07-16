export interface User {
  id: string;
  userId: string;
  email: string;
  firstName: string;
  lastName: string;
  userType: string[];
  facilityCode: string;
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

export interface LoginResponse {
  status: string;
  message: string;
  data: {
    user: User;
    tokens: AuthTokens;
    permissions?: Permissions | null;
    scope?: Scope | null;
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
  tokenExpirationTime: null,
  error: null,
};
