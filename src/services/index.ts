import axios, { AxiosError, InternalAxiosRequestConfig } from "axios";

// Create axios instance with default configuration
const api = axios.create({
  //baseURL:
  //"https://houston-facilityadmin-func-epcvgvfcesezf7dr.canadacentral-01.azurewebsites.net/",
  baseURL:
    "https://adminportal-func-gxfraygwfuecb7fn.southindia-01.azurewebsites.net",
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 10000, // 10 seconds timeout
});

// Request interceptor - Add auth token to requests
api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
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
  }
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

      if (status === 401) {
        console.error("Unauthorized");
      } else if (status === 403) {
        // Forbidden - user doesn't have permission
        console.error("Access forbidden");
      } else if (status >= 500) {
        // Server error
        console.error("Server error:", error.response.data);
      }
    } else if (error.request) {
      // Request was made but no response received (network error)
      console.error("Network error: No response received");
    } else {
      // Something else happened
      console.error("Error:", error.message);
    }

    return Promise.reject(error);
  }
);

export default api;
