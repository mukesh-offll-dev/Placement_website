import { createContext, useState, useEffect, useCallback } from 'react';
import {
  getToken,
  getUser,
  storeAuth,
  clearAuth,
  login as apiLogin,
  registerStudent as apiRegisterStudent,
  getCurrentUser as apiGetCurrentUser,
} from '../services/authService';

export const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => getToken());
  const [user, setUser] = useState(() => getUser());
  const [loading, setLoading] = useState(false);

  // Sync state whenever unauthorized event is fired by axiosClient interceptor
  useEffect(() => {
    const handleUnauthorized = () => {
      setToken(null);
      setUser(null);
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('auth:unauthorized', handleUnauthorized);
      return () => {
        window.removeEventListener('auth:unauthorized', handleUnauthorized);
      };
    }
  }, []);

  const refreshUser = useCallback(async () => {
    if (!getToken()) return null;
    try {
      const userData = await apiGetCurrentUser();
      if (userData) {
        setUser((prev) => {
          const updated = { ...(prev || {}), ...userData };
          storeAuth({ token: getToken(), ...updated });
          return updated;
        });
      }
      return userData;
    } catch {
      return null;
    }
  }, []);

  const login = async (credentials, expectedRole) => {
    setLoading(true);
    try {
      const email = typeof credentials === 'object' ? credentials.email : credentials;
      const password = typeof credentials === 'object' ? credentials.password : arguments[1];

      const authData = await apiLogin(email, password);

      if (expectedRole && authData.role !== expectedRole) {
        clearAuth();
        setToken(null);
        setUser(null);
        return {
          success: false,
          error: `Unauthorized role. Expected ${expectedRole}, got ${authData.role}.`,
        };
      }

      setToken(authData.token);
      setUser({
        userId: authData.userId,
        email: authData.email,
        role: authData.role,
        fullName: authData.fullName,
      });

      return { success: true, user: authData };
    } catch (err) {
      return {
        success: false,
        error: err.message || 'Login failed. Please check your credentials.',
      };
    } finally {
      setLoading(false);
    }
  };

  const register = async (studentData) => {
    setLoading(true);
    try {
      const authData = await apiRegisterStudent(studentData);
      setToken(authData.token);
      setUser({
        userId: authData.userId,
        email: authData.email,
        role: authData.role,
        fullName: authData.fullName,
      });
      return { success: true, user: authData };
    } catch (err) {
      return {
        success: false,
        error: err.message || 'Registration failed.',
      };
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    clearAuth();
    setToken(null);
    setUser(null);
  };

  const isAuthenticated = Boolean(token && user);
  const hasRole = (targetRole) => user?.role === targetRole;

  return (
    <AuthContext.Provider
      value={{
        token,
        user,
        role: user?.role || null,
        loading,
        isAuthenticated,
        hasRole,
        login,
        register,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export { useAuth } from './useAuth';
export default AuthContext;
