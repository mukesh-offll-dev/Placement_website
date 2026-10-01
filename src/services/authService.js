/**
 * authService.js
 *
 * Centralised authentication service for the Placement Cell frontend.
 * Communicates with POST /api/auth/login and POST /api/auth/register/student.
 * Stores the JWT in localStorage and exposes helpers for other API calls.
 */

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api';

// ─────────────────────────────────────────────
// Storage helpers
// ─────────────────────────────────────────────

const TOKEN_KEY = 'placement_jwt';
const USER_KEY  = 'placement_user';

export const storeAuth = (authResponse) => {
  localStorage.setItem(TOKEN_KEY, authResponse.token);
  localStorage.setItem(USER_KEY, JSON.stringify({
    userId:   authResponse.userId,
    email:    authResponse.email,
    role:     authResponse.role,
    fullName: authResponse.fullName,
  }));
};

export const clearAuth = () => {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
};

export const getToken = () => localStorage.getItem(TOKEN_KEY);

export const getUser = () => {
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

export const isAuthenticated = () => {
  const token = getToken();
  if (!token) return false;
  // Basic expiry check by decoding the payload (no signature verification — that's on the server)
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

// ─────────────────────────────────────────────
// Axios-like fetch wrapper with auth header
// ─────────────────────────────────────────────

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
    clearAuth();
    window.location.href = '/login';
    throw new Error('Session expired. Please log in again.');
  }

  return response;
};

// ─────────────────────────────────────────────
// Auth API calls
// ─────────────────────────────────────────────

/**
 * Login for both students and admins.
 * Returns { token, type, userId, email, role, fullName }
 */
export const login = async (email, password) => {
  const response = await fetch(`${API_BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });

  const json = await response.json();

  if (!response.ok) {
    throw new Error(json.message || 'Login failed');
  }

  storeAuth(json.data);
  return json.data;
};

/**
 * Register a new student account.
 * Returns the same AuthResponse shape as login.
 */
export const registerStudent = async ({ email, password, fullName, rollNo }) => {
  const response = await fetch(`${API_BASE_URL}/auth/register/student`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, fullName, rollNo, role: 'STUDENT' }),
  });

  const json = await response.json();

  if (!response.ok) {
    throw new Error(json.message || 'Registration failed');
  }

  storeAuth(json.data);
  return json.data;
};

/**
 * Logout — clear local storage and redirect.
 */
export const logout = (redirectTo = '/login') => {
  clearAuth();
  window.location.href = redirectTo;
};
