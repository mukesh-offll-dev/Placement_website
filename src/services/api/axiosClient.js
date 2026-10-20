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
 * Helper to safely extract error message from response data without leaking server internals.
 */
const getSafeServerMessage = (data, fallback) => {
  if (data && typeof data === 'object' && typeof data.message === 'string' && data.message.trim()) {
    const msg = data.message.trim();
    const isSensitive =
      msg.includes('Exception') ||
      msg.includes('org.springframework') ||
      msg.includes('org.hibernate') ||
      msg.includes('SQL') ||
      msg.includes('NullPointer') ||
      msg.includes('stacktrace');
    if (!isSensitive) return msg;
  }
  return fallback;
};

/**
 * Response Interceptor:
 * Unwraps data and normalizes error objects from the Spring Boot ApiResponse structure.
 */
axiosClient.interceptors.response.use(
  (response) => {
    // If response body is an ApiResponse object explicitly stating failure
    if (response.data && typeof response.data === 'object' && response.data.success === false) {
      const msg = response.data.message || 'Operation failed';
      const apiError = new Error(msg);
      apiError.status = response.status || 400;
      apiError.data = response.data;
      apiError.validationErrors = response.data.data || null;
      apiError.isAxiosError = true;
      return Promise.reject(apiError);
    }

    // For blob or arraybuffer responses (e.g. file downloads), return full response data
    return response.data ?? null;
  },
  (error) => {
    // 1. HTTP Response received with 4xx or 5xx status
    if (error.response) {
      const { status, data } = error.response;
      const validationErrors = (data && typeof data === 'object') ? (data.data || data.errors || null) : null;

      let message;

      switch (status) {
        case 400: {
          if (validationErrors && typeof validationErrors === 'object' && Object.keys(validationErrors).length > 0) {
            const fieldMsgs = Object.values(validationErrors).filter(Boolean);
            message = fieldMsgs.length > 0 ? fieldMsgs.join('. ') : 'Invalid request. Please check the entered information.';
          } else {
            message = getSafeServerMessage(data, 'Invalid request. Please check the entered information.');
          }
          break;
        }

        case 401: {
          const isAuthEndpoint =
            typeof error.config?.url === 'string' &&
            (error.config.url.includes('/auth/login') || error.config.url.includes('/auth/register'));

          const defaultMsg = isAuthEndpoint
            ? 'Invalid email or password.'
            : 'Your session has expired or you are not authorized. Please log in again.';

          message = getSafeServerMessage(data, defaultMsg);

          // Only clear session credentials and dispatch unauthorized event if the 401
          // occurred on a protected resource, preventing a failed login attempt from wiping an active session.
          if (!isAuthEndpoint) {
            localStorage.removeItem(TOKEN_KEY);
            localStorage.removeItem(USER_KEY);
            if (typeof window !== 'undefined') {
              window.dispatchEvent(new CustomEvent('auth:unauthorized', { detail: { status, message } }));
            }
          }
          break;
        }

        case 403: {
          message = getSafeServerMessage(data, 'You do not have permission to perform this action.');
          break;
        }

        case 404: {
          message = getSafeServerMessage(data, 'The requested resource was not found.');
          break;
        }

        case 409: {
          message = getSafeServerMessage(data, 'A conflict occurred with the current state of the resource.');
          break;
        }

        case 422: {
          message = getSafeServerMessage(data, 'Unable to process the request data. Please verify your input.');
          break;
        }

        case 429: {
          message = 'Too many requests. Please wait a moment and try again.';
          break;
        }

        case 500:
        case 502:
        case 503:
        case 504: {
          // Guard against internal server details leaking to end users
          message = getSafeServerMessage(data, 'A server error occurred. Please try again later.');
          break;
        }

        default: {
          message = getSafeServerMessage(data, error.message || `Request failed with status ${status}`);
          break;
        }
      }

      const apiError = new Error(message);
      apiError.status = status;
      apiError.data = data;
      apiError.validationErrors = validationErrors;
      apiError.isAxiosError = true;
      return Promise.reject(apiError);
    }

    // 2. Request was made but no response was received (network failure or timeout)
    if (error.request) {
      const isTimeout =
        error.code === 'ECONNABORTED' ||
        (typeof error.message === 'string' && error.message.toLowerCase().includes('timeout'));

      if (isTimeout) {
        const timeoutError = new Error('Request timed out. The server took too long to respond. Please try again.');
        timeoutError.status = 408;
        timeoutError.isTimeout = true;
        timeoutError.isNetworkError = true;
        return Promise.reject(timeoutError);
      }

      const networkError = new Error(
        'Unable to connect to the server. Please check your internet connection and verify the service is running.'
      );
      networkError.status = 0;
      networkError.isNetworkError = true;
      return Promise.reject(networkError);
    }

    // 3. Error occurred in request setup before reaching network
    const clientError = new Error(error.message || 'An unexpected error occurred while preparing the request.');
    clientError.status = -1;
    return Promise.reject(clientError);
  }
);

export default axiosClient;
