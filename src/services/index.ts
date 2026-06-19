import { AxiosError, create, InternalAxiosRequestConfig } from 'axios';

import { isTokenExpired } from '../utils/tokenUtils';

// Create axios instance with default configuration
const api = create({
  baseURL: process.env.REACT_APP_API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Store ref is injected from app bootstrap to avoid a circular import with the
// store (store → auth/reducers → auth/api → services would otherwise loop back).
type StoreLike = {
  getState: () => {
    auth: {
      tokens?: { access_token?: string } | null;
      tokenExpirationTime?: number | null;
    };
  };
};
let storeRef: StoreLike | null = null;
export const attachStore = (store: StoreLike) => {
  storeRef = store;
};

// Callback to trigger session expired modal
let onSessionExpiredCallback: (() => void) | null = null;

export const setSessionExpiredCallback = (callback: () => void) => {
  onSessionExpiredCallback = callback;
};

const triggerSessionExpired = () => {
  if (onSessionExpiredCallback) {
    onSessionExpiredCallback();
  }
};

// Request interceptor - Add auth token to requests and check expiration
api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    // Skip token check for login endpoint
    if (config.url?.includes('/login')) {
      return config;
    }

    const authState = storeRef?.getState().auth;

    // Check if token is expired before making the request
    if (authState && isTokenExpired(authState)) {
      triggerSessionExpired();
      // Reject the request to prevent API call with expired token
      return Promise.reject(new Error('Token expired'));
    }

    if (authState?.tokens?.access_token && config.headers) {
      config.headers.Authorization = `Bearer ${authState.tokens.access_token}`;
    }
    return config;
  },
  (error: AxiosError) => {
    // Handle request error
    return Promise.reject(error);
  }
);

// Response interceptor - Handle errors globally
api.interceptors.response.use(
  response => {
    // Return successful responses as-is
    return response;
  },
  (error: AxiosError) => {
    // Handle response errors
    if (error.response) {
      // Server responded with error status
      const { status } = error.response;

      if (status === 400) {
        // Bad Request - Log full details for debugging
        console.error('Bad Request (400):', {
          url: error.config?.url,
          method: error.config?.method,
          data: error.config?.data,
          response: error.response.data,
        });
      } else if (status === 401) {
        console.error('Unauthorized (401) - Token may be invalid or expired');
        // Server rejected the token (e.g. expired server-side but still passed the
        // client-side expiry check) — surface the session-expired modal so the user
        // re-logs in, instead of bubbling up a cryptic per-feature error.
        triggerSessionExpired();
      } else if (status === 403) {
        // Forbidden - user doesn't have permission
        console.error('Access forbidden (403)');
      } else if (status >= 500) {
        // Server error
        console.error('Server error:', error.response.data);
      }
    } else if (error.request) {
      // Request was made but no response received (network error)
      console.error('Network error: No response received');
    } else {
      // Check if error is due to token expiration (from request interceptor)
      if (error.message === 'Token expired') {
        // Token expired error from request interceptor
        console.error('Request blocked - Token expired');
      } else {
        // Something else happened
        console.error('Error:', error.message);
      }
    }

    return Promise.reject(error);
  }
);

export default api;
