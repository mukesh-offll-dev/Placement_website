import { createContext, useContext, useState, useEffect } from 'react';
import {
  getToken,
  getUser,
  clearAuth,
  isAuthenticated as hasStoredSession,
  login as authServiceLogin,
  registerStudent as authServiceRegisterStudent,
} from '../services/authService.js';

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
