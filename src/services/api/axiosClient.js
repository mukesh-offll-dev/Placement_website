import axios from 'axios';

/**
 * API Base URL resolution:
 * 1. Environment variable: VITE_API_BASE_URL (configured in .env / .env.example)
 * 2. Fallback to default Spring Boot backend context: http://localhost:8080/api
 */
export const API_BASE_URL =
  (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_API_BASE_URL) ||
  'http://localhost:8080/api';
export const TOKEN_KEY = 'placement_jwt';
export const USER_KEY = 'placement_user';

/**
 * Reusable Axios Client configured for the Placement Cell Spring Boot backend.
 */
const axiosClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
});

/**
 * Request Interceptor:
 * Attaches the JWT Bearer token to the Authorization header if available.
 */
axiosClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem(TOKEN_KEY);
    if (token && !config.headers.Authorization) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

/**
 * Response Interceptor:
 * Unwraps data and normalizes error objects from the Spring Boot ApiResponse structure.
 */
axiosClient.interceptors.response.use(
  (response) => {
    // For blob or arraybuffer responses (e.g. file downloads), return full response data
    return response.data;
  },
  (error) => {
    if (error.response) {
      const { status, data } = error.response;
      const message = data?.message || error.message || 'An unexpected error occurred';

      // 401 Unauthorized: token expired, invalid, or missing
      if (status === 401) {
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(USER_KEY);
        // Optional dispatch for app-wide auth state listeners
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('auth:unauthorized', { detail: { status, message } }));
        }
      }

      // Build structured error for calling components
      const apiError = new Error(message);
      apiError.status = status;
      apiError.data = data;
      apiError.validationErrors = data?.data || null;
      apiError.isAxiosError = true;
      return Promise.reject(apiError);
    } else if (error.request) {
      // Request was made but no response was received (network failure / server down)
      const networkError = new Error(
        'Unable to connect to the backend server. Please verify the Spring Boot service is running at ' + API_BASE_URL
      );
      networkError.status = 0;
      networkError.isNetworkError = true;
      return Promise.reject(networkError);
    }

    return Promise.reject(error);
  }
);

export default axiosClient;
