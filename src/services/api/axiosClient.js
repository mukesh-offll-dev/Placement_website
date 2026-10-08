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
export const LEGACY_TOKEN_KEY = 'token';
export const LEGACY_USER_KEY = 'user';

/**
 * Unauthorized redirect guard to prevent multiple simultaneous 401 responses
 * from triggering repeated redirects or event storms.
 */
let isAuthRedirecting = false;

export const resetAuthRedirectGuard = () => {
  isAuthRedirecting = false;
};

export const getIsAuthRedirecting = () => isAuthRedirecting;

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
      // For bean-validation failures the backend's top-level message is just
      // "Validation failed"; the useful text is per field in data.data. Surface the
      // field messages so the user sees *why* (e.g. "Email must be a valid address").
      const fieldErrors =
        data?.data && typeof data.data === 'object' && !Array.isArray(data.data)
          ? Object.values(data.data).filter((v) => typeof v === 'string')
          : [];
      const message =
        (status === 400 && fieldErrors.length > 0 ? fieldErrors.join(' ') : null) ||
        data?.message ||
        error.message ||
        'An unexpected error occurred';

      // 401 Unauthorized: token expired, invalid, or missing
      // Exclude login/auth credential verification requests so login forms can display errors
      const requestUrl = error.config?.url || '';
      const isAuthEndpoint =
        requestUrl.includes('/auth/login') ||
        requestUrl.includes('/auth/register') ||
        requestUrl.endsWith('/login');

      if (status === 401 && !isAuthEndpoint) {
        // 1. Read the user's role BEFORE clearing the stored user data
        let role = null;
        try {
          const rawUser = localStorage.getItem(USER_KEY) || localStorage.getItem(LEGACY_USER_KEY);
          if (rawUser) {
            const parsed = JSON.parse(rawUser);
            role = parsed.role || null;
          }
        } catch {
          role = null;
        }

        if (!role) {
          try {
            const rawToken = localStorage.getItem(TOKEN_KEY) || localStorage.getItem(LEGACY_TOKEN_KEY);
            if (rawToken && rawToken.includes('.')) {
              const payload = JSON.parse(atob(rawToken.split('.')[1]));
              role = payload.role || null;
            }
          } catch {
            role = null;
          }
        }

        // 2. Clear current and legacy auth keys
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(USER_KEY);
        localStorage.removeItem(LEGACY_TOKEN_KEY);
        localStorage.removeItem(LEGACY_USER_KEY);

        // 3. Prevent multiple simultaneous 401 responses from triggering repeated redirects
        if (!isAuthRedirecting) {
          isAuthRedirecting = true;

          // 4. Dispatch a global auth:unauthorized event containing status, message, and role
          if (typeof window !== 'undefined') {
            window.dispatchEvent(
              new CustomEvent('auth:unauthorized', {
                detail: { status, message, role },
              })
            );
          }
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
