import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { TOKEN_KEY, USER_KEY } from '../services/api/axiosClient.js';
import {
  getToken,
  getUser,
  storeAuth,
  clearAuth,
  isAuthenticated as hasStoredSession,
  login as authServiceLogin,
  getCurrentUser as authServiceGetCurrentUser,
} from '../services/authService.js';
import { isStaffRole, homePathForRole } from '../utils/roles.js';

// Exported as the default only: a named context export trips the react-refresh
// lint rule, and useAuth below is the supported way to read it.
const AuthContext = createContext(null);

const getSessionUser = (authData) => ({
  id: authData.userId || authData.id,
  email: authData.email,
  role: authData.role,
  fullName: authData.fullName,
  // A new student is held on the first-login setup page until this clears.
  setupRequired: Boolean(authData.setupRequired),
  // A staff member signed in with a temporary password is held on the change-password page.
  passwordChangeRequired: Boolean(authData.passwordChangeRequired),
});

const persistSession = (token, user) => storeAuth({
  token,
  userId: user.id,
  email: user.email,
  role: user.role,
  fullName: user.fullName,
  setupRequired: user.setupRequired,
  passwordChangeRequired: user.passwordChangeRequired,
});

const getStoredSession = () => {
  const token = getToken();
  const user = getUser();

  if (!token || !user || !hasStoredSession()) {
    clearAuth();
    return { token: null, user: null };
  }

  return { token, user };
};

export function AuthProvider({ children }) {
  const [session, setSession] = useState(getStoredSession);
  const [loading, setLoading] = useState(false);
  const { token, user } = session;
  // Latest session for the cross-tab storage listener, which is registered once.
  const sessionRef = useRef(session);
  useEffect(() => {
    sessionRef.current = session;
  }, [session]);

  useEffect(() => {
    const handleUnauthorized = () => {
      setSession({ token: null, user: null });
    };

    // Another tab signed in, switched account or signed out. One browser holds one session, so
    // follow it here too. storeAuth writes the token first and the user second, so wait for the
    // user key (or a full clear) before acting, and never clear storage from here: that could
    // wipe a sign-in still being written by the other tab.
    const handleStorage = (event) => {
      if (event.key !== null && event.key !== USER_KEY && event.key !== TOKEN_KEY) return;
      const nextToken = getToken();
      const nextUser = getUser();
      const current = sessionRef.current;

      if (!nextToken || !nextUser) {
        if (event.key === TOKEN_KEY && nextToken) return; // token written, user still to come
        setSession({ token: null, user: null });
        return;
      }
      if (event.key === TOKEN_KEY) return; // the user write that follows decides

      const switchedAccount =
        !current.user ||
        // A session restored from storage keeps `userId`; one set by login() keeps `id`.
        String(current.user.id ?? current.user.userId ?? '') !== String(nextUser.userId ?? nextUser.id ?? '') ||
        current.user.role !== nextUser.role;
      if (switchedAccount) {
        // Reload onto the new account's home so no page of the old role keeps calling the API
        // with the new role's token (that was the "You do not have permission" error).
        window.location.assign(homePathForRole(nextUser.role));
        return;
      }
      setSession(getStoredSession());
    };

    // The server refused a request because setup is pending (a stale tab, a reset password):
    // mark the session so the route guard sends a student to the setup page, or a staff member
    // (admin, officer, faculty) to the change-password page.
    const handleSetupRequired = () => {
      setSession((prev) => {
        if (!prev.user) return prev;
        const flag = isStaffRole(prev.user.role) ? 'passwordChangeRequired' : 'setupRequired';
        if (prev.user[flag]) return prev;
        const user = { ...prev.user, [flag]: true };
        persistSession(prev.token, user);
        return { ...prev, user };
      });
    };

    window.addEventListener('auth:unauthorized', handleUnauthorized);
    window.addEventListener('auth:setup-required', handleSetupRequired);
    window.addEventListener('storage', handleStorage);
    return () => {
      window.removeEventListener('auth:unauthorized', handleUnauthorized);
      window.removeEventListener('auth:setup-required', handleSetupRequired);
      window.removeEventListener('storage', handleStorage);
    };
  }, []);

  const login = async (credentials, expectedRole) => {
    const { expectedRole: credentialRole, ...loginCredentials } = credentials;
    setLoading(true);
    try {
      const authData = await authServiceLogin(loginCredentials);

      // Accepts a single role or a list: the admin portal admits both ADMIN and
      // PLACEMENT_OFFICER, which is what SecurityConfig grants /admin/** too.
      const requiredRole = expectedRole || credentialRole;
      const allowedRoles = Array.isArray(requiredRole)
        ? requiredRole
        : (requiredRole ? [requiredRole] : []);

      if (allowedRoles.length > 0 && !allowedRoles.includes(authData.role)) {
        clearAuth();
        setSession({ token: null, user: null });
        return {
          success: false,
          error: `Unauthorized: account role is ${authData.role}, expected ${allowedRoles.join(' or ')}.`,
        };
      }

      setSession({ token: authData.token, user: getSessionUser(authData) });

      return { success: true, user: authData };
    } catch (err) {
      clearAuth();
      setSession({ token: null, user: null });
      return {
        success: false,
        error: err.message || 'Unable to connect to server. Please try again later.',
      };
    } finally {
      setLoading(false);
    }
  };

  /**
   * Adopts an AuthResponse the service layer has already stored (first-login setup and password
   * change both return a fresh token), so the context and the route guard see the new session.
   */
  const applyAuthData = useCallback((authData) => {
    if (authData?.token) {
      setSession({ token: authData.token, user: getSessionUser(authData) });
    }
    return authData;
  }, []);

  /**
   * Re-reads the signed-in user from GET /auth/me and merges the result into the
   * session, so a profile edited elsewhere (or by an admin) shows up without a
   * re-login. Returns null when there is no session or the request fails.
   */
  const refreshUser = useCallback(async () => {
    const currentToken = getToken();
    if (!currentToken) return null;

    try {
      const userData = await authServiceGetCurrentUser();
      if (!userData) return null;

      setSession((prev) => {
        const merged = { ...(prev.user || {}), ...userData, id: userData.id ?? prev.user?.id };
        // storeAuth reads userId, while the session keeps it as id — map it back
        // so a reload does not lose the user's id.
        persistSession(currentToken, merged);
        return { token: currentToken, user: merged };
      });

      return userData;
    } catch {
      return null;
    }
  }, []);

  const logout = () => {
    clearAuth();
    setSession({ token: null, user: null });
  };

  const isAuthenticated = Boolean(token && user);
  const role = user?.role || null;
  const hasRole = (requiredRole) => role === requiredRole;

  return (
    <AuthContext.Provider
      value={{
        session: isAuthenticated ? { token, user, role } : null,
        token,
        user,
        role,
        loading,
        isAuthenticated,
        hasRole,
        login,
        applyAuthData,
        refreshUser,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

/* eslint-disable-next-line react-refresh/only-export-components */
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export default AuthContext;
