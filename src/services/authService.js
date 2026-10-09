/**
 * authService.js
 *
 * Centralised authentication service for the Placement Cell frontend.
 * Re-exports the API service powered by the centralized Axios client,
 * maintaining full backwards compatibility with all existing components.
 */

export {
  API_BASE_URL,
  TOKEN_KEY,
  USER_KEY,
  LEGACY_TOKEN_KEY,
  LEGACY_USER_KEY,
  resetAuthRedirectGuard,
} from './api/axiosClient.js';

export {
  storeAuth,
  clearAuth,
  getToken,
  getUser,
  isAuthenticated,
  getRole,
  authFetch,
  login,
  registerStudent,
  registerAdmin,
  getCurrentUser,
  logout,
  default,
} from './api/authService.js';
