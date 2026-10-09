import { createContext, useContext, useState, useEffect } from 'react';
import {
  getToken,
  getUser,
  clearAuth,
  login as authServiceLogin,
} from '../services/authService.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => getToken());
  const [user, setUser] = useState(() => getUser());
  const [loading, setLoading] = useState(false);

  // Sync state with storage and listen for global unauthorized events
  useEffect(() => {
    const handleUnauthorized = () => {
      setToken(null);
      setUser(null);
    };

    window.addEventListener('auth:unauthorized', handleUnauthorized);
    return () => {
      window.removeEventListener('auth:unauthorized', handleUnauthorized);
    };
  }, []);

  const login = async ({ email, password }, expectedRole) => {
    setLoading(true);
    try {
      const authData = await authServiceLogin({ email, password });

      if (expectedRole && authData.role !== expectedRole) {
        clearAuth();
        setToken(null);
        setUser(null);
        return {
          success: false,
          error: `Unauthorized: account role is ${authData.role}, expected ${expectedRole}.`,
        };
      }

      setToken(authData.token);
      setUser({
        id: authData.userId || authData.id,
        email: authData.email,
        role: authData.role,
        fullName: authData.fullName,
      });

      return { success: true, user: authData };
    } catch (err) {
      return {
        success: false,
        error: err.message || 'Unable to connect to server. Please try again later.',
      };
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    clearAuth();
  };

  const isAuthenticated = Boolean(token && user);
  const hasRole = (role) => user?.role === role;

  return (
    <AuthContext.Provider
      value={{
        token,
        user,
        loading,
        isAuthenticated,
        hasRole,
        login,
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
