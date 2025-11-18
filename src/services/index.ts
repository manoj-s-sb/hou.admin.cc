import axios, { AxiosError, InternalAxiosRequestConfig } from "axios";
import { isTokenExpired } from "../utils/tokenUtils";

// Create axios instance with default configuration
const api = axios.create({
  baseURL:
    "https://houston-facilityadmin-func-epcvgvfcesezf7dr.canadacentral-01.azurewebsites.net/",
  // baseURL:
  //   "https://adminportal-func-gxfraygwfuecb7fn.southindia-01.azurewebsites.net",
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 10000, // 10 seconds timeout
});

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
    if (config.url?.includes("/login")) {
      return config;
    }

    // Check if token is expired before making the request
    if (isTokenExpired()) {
      triggerSessionExpired();
      // Reject the request to prevent API call with expired token
      return Promise.reject(new Error("Token expired"));
    }

    const tokensString = localStorage.getItem("tokens");
    if (tokensString && config.headers) {
      try {
        const tokens = JSON.parse(tokensString);
        if (tokens.access_token) {
          config.headers.Authorization = `Bearer ${tokens.access_token}`;
        }
      } catch (error) {
        console.error("Error parsing tokens from localStorage:", error);
      }
    }
    return config;
  },
  (error: AxiosError) => {
    // Handle request error
    return Promise.reject(error);
  },
);

// Response interceptor - Handle errors globally
api.interceptors.response.use(
  (response) => {
    // Return successful responses as-is
    return response;
  },
  (error: AxiosError) => {
    // Handle response errors
    if (error.response) {
      // Server responded with error status
      const status = error.response.status;

      if (status === 400) {
        // Bad Request - Log full details for debugging
        console.error("Bad Request (400):", {
          url: error.config?.url,
          method: error.config?.method,
          data: error.config?.data,
          response: error.response.data,
        });
      } else if (status === 401) {
        console.error("Unauthorized (401) - Token may be invalid or expired");
        // Trigger session expired modal for 401 errors
      } else if (status === 403) {
        // Forbidden - user doesn't have permission
        console.error("Access forbidden (403)");
      } else if (status >= 500) {
        // Server error
        console.error("Server error:", error.response.data);
      }
    } else if (error.request) {
      // Request was made but no response received (network error)
      console.error("Network error: No response received");
    } else {
      // Check if error is due to token expiration (from request interceptor)
      if (error.message === "Token expired") {
        // Token expired error from request interceptor
        console.error("Request blocked - Token expired");
      } else {
        // Something else happened
        console.error("Error:", error.message);
      }
    }

    return Promise.reject(error);
  },
);

export default api;
