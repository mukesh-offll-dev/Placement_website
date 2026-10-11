import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  getToken,
  getUser,
  storeAuth,
  clearAuth,
  isAuthenticated as hasStoredSession,
  login as authServiceLogin,
  registerStudent as authServiceRegisterStudent,
  getCurrentUser as authServiceGetCurrentUser,
} from '../services/authService.js';

// Exported as the default only: a named context export trips the react-refresh
// lint rule, and useAuth below is the supported way to read it.
const AuthContext = createContext(null);

const getSessionUser = (authData) => ({
  id: authData.userId || authData.id,
  email: authData.email,
  role: authData.role,
  fullName: authData.fullName,
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

  useEffect(() => {
    const handleUnauthorized = () => {
      setSession({ token: null, user: null });
    };

    const handleStorage = () => {
      setSession(getStoredSession());
    };

    window.addEventListener('auth:unauthorized', handleUnauthorized);
    window.addEventListener('storage', handleStorage);
    return () => {
      window.removeEventListener('auth:unauthorized', handleUnauthorized);
      window.removeEventListener('storage', handleStorage);
    };
  }, []);

  const login = async (credentials, expectedRole) => {
    const { expectedRole: credentialRole, ...loginCredentials } = credentials;
    setLoading(true);
    try {
      const authData = await authServiceLogin(loginCredentials);
      const requiredRole = expectedRole || credentialRole;

      if (requiredRole && authData.role !== requiredRole) {
        clearAuth();
        setSession({ token: null, user: null });
        return {
          success: false,
          error: `Unauthorized: account role is ${authData.role}, expected ${requiredRole}.`,
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

  const registerStudent = async (studentData) => {
    const authData = await authServiceRegisterStudent(studentData);
    if (authData?.token) {
      setSession({ token: authData.token, user: getSessionUser(authData) });
    }
    return authData;
  };

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
        storeAuth({
          token: currentToken,
          userId: merged.id,
          email: merged.email,
          role: merged.role,
          fullName: merged.fullName,
        });
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
        registerStudent,
        // Alias: some pages call register() instead of registerStudent().
        register: registerStudent,
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
