import axiosClient, {
  TOKEN_KEY,
  USER_KEY,
  LEGACY_TOKEN_KEY,
  LEGACY_USER_KEY,
  resetAuthRedirectGuard,
  API_BASE_URL,
} from './axiosClient.js';

export { resetAuthRedirectGuard };

/**
 * Authentication API Service
 * Maps to backend AuthController (/api/auth/**)
 */

export const storeAuth = (authResponse) => {
  if (!authResponse) return;
  resetAuthRedirectGuard();
  if (authResponse.token) {
    localStorage.setItem(TOKEN_KEY, authResponse.token);
  }
  localStorage.setItem(
    USER_KEY,
    JSON.stringify({
      userId: authResponse.userId,
      email: authResponse.email,
      role: authResponse.role,
      fullName: authResponse.fullName,
    })
  );
  localStorage.removeItem(LEGACY_TOKEN_KEY);
  localStorage.removeItem(LEGACY_USER_KEY);
};

export const clearAuth = () => {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
  localStorage.removeItem(LEGACY_TOKEN_KEY);
  localStorage.removeItem(LEGACY_USER_KEY);
};

export const getToken = () => localStorage.getItem(TOKEN_KEY) || localStorage.getItem(LEGACY_TOKEN_KEY);

export const getUser = () => {
  try {
    const raw = localStorage.getItem(USER_KEY) || localStorage.getItem(LEGACY_USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

export const isAuthenticated = () => {
  const token = getToken();
  if (!token) return false;
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.exp * 1000 > Date.now();
  } catch {
    return false;
  }
};

export const getRole = () => {
  const user = getUser();
  return user ? user.role : null;
};

/**
 * Login user (Student or Admin).
 * Supports both login(email, password) and login({ email, password }).
 * POST /api/auth/login
 * @param {string|Object} emailOrCredentials
 * @param {string} [password]
 * @returns {Promise<Object>} AuthResponse data { token, type, userId, email, role, fullName }
 */
export const login = async (emailOrCredentials, password) => {
  const payload =
    typeof emailOrCredentials === 'object' && emailOrCredentials !== null
      ? emailOrCredentials
      : { email: emailOrCredentials, password };

  const response = await axiosClient.post('/auth/login', payload);
  const authData = response && response.data ? response.data : response;
  storeAuth(authData);
  resetAuthRedirectGuard();
  return authData;
};

/**
 * Register a student account.
 * Supports both registerStudent(data) and registerStudent({ email, password, fullName, rollNo }).
 * POST /api/auth/register/student
 * @param {Object} studentData - { email, password, fullName, rollNo }
 * @returns {Promise<Object>} AuthResponse data
 */
export const registerStudent = async (studentData) => {
  const payload = {
    ...studentData,
    role: 'STUDENT',
  };
  const response = await axiosClient.post('/auth/register/student', payload);
  const authData = response.data;
  storeAuth(authData);
  resetAuthRedirectGuard();
  return authData;
};

/**
 * Register an admin account (Admin-only).
 * POST /api/auth/register/admin
 * @param {Object} adminData - { email, password, fullName, department }
 * @returns {Promise<Object>} AuthResponse data
 */
export const registerAdmin = async (adminData) => {
  const payload = {
    ...adminData,
    role: 'ADMIN',
  };
  const response = await axiosClient.post('/auth/register/admin', payload);
  return response.data;
};

/**
 * Get current authenticated user details.
 * GET /api/auth/me
 * @returns {Promise<Object>} UserResponse data
 */
export const getCurrentUser = async () => {
  const response = await axiosClient.get('/auth/me');
  return response.data;
};

/**
 * Helper authFetch wrapper to maintain backward compatibility with any legacy fetch callers.
 */
export const authFetch = async (path, options = {}) => {
  const token = getToken();
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers || {}),
  };

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
  });

  if (response.status === 401) {
    const role = getRole();
    clearAuth();
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('auth:unauthorized', {
          detail: { status: 401, message: 'Session expired. Please log in again.', role },
        })
      );
    }
    throw new Error('Session expired. Please log in again.');
  }

  return response;
};

/**
 * Logout - clear credentials and redirect.
 */
export const logout = (redirectTo = '/login') => {
  resetAuthRedirectGuard();
  clearAuth();
  if (typeof window !== 'undefined' && redirectTo) {
    window.location.href = redirectTo;
  }
};

const authService = {
  login,
  registerStudent,
  registerAdmin,
  getCurrentUser,
  authFetch,
  logout,
  storeAuth,
  clearAuth,
  getToken,
  getUser,
  isAuthenticated,
  getRole,
  resetAuthRedirectGuard,
};

export default authService;
