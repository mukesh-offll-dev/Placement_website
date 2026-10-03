import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

/**
 * Route guard enforcing role-based access control on frontend routes.
 * Ensures Students can only access student features and Admins can only access admin features.
 */
export default function ProtectedRoute({ requiredRole }) {
  const { isAuthenticated, user } = useAuth();
  const location = useLocation();

  if (!isAuthenticated) {
    const redirectPath = requiredRole === 'ADMIN' ? '/admin/login' : '/student/login';
    return <Navigate to={redirectPath} state={{ from: location }} replace />;
  }

  if (requiredRole && user?.role !== requiredRole) {
    // Redirect user to their own role-authorized dashboard if they attempt to cross boundaries
    if (user?.role === 'ADMIN') {
      return <Navigate to="/admin/dashboard" replace />;
    }
    if (user?.role === 'STUDENT') {
      return <Navigate to="/student/dashboard" replace />;
    }
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}
