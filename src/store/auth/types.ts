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

export interface LoginResponse {
  status: string;
  message: string;
  data: {
    user: User;
    tokens: AuthTokens;
  };
  statusCode: string;
}

export interface AuthState {
  isLoading: boolean;
  isAuthenticated: boolean;
  loginResponse: LoginResponse | null;
  error: string | null | any;
}

export const initialState: AuthState = {
  isLoading: false,
  isAuthenticated: false,
  loginResponse: null,
  error: null,
};
