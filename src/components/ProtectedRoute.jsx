import { Navigate, Outlet } from 'react-router-dom';
import { isAuthenticated, getRole } from '../services/authService';

/**
 * ProtectedRoute
 *
 * Route guard enforcing role-based access control on frontend routes.
 * Ensures Students can only access student features and Admins can only access admin features.
 *
 * Supports both wrapper style (<ProtectedRoute allowedRole="STUDENT"><Layout/></ProtectedRoute>)
 * and layout route style (<Route element={<ProtectedRoute allowedRole="STUDENT" />} />).
 */
export default function ProtectedRoute({
  children,
  allowedRole,
  requiredRole,
  redirectTo,
}) {
  const targetRole = allowedRole || requiredRole;

  if (!isAuthenticated()) {
    const defaultRedirect = targetRole === 'ADMIN'
      ? '/admin/login'
      : (targetRole === 'STUDENT' ? '/student/login' : '/login');
    return <Navigate to={redirectTo || defaultRedirect} replace />;
  }

  if (targetRole) {
    const role = getRole();
    if (role !== targetRole) {
      // Authenticated but wrong role → redirect to their own authorized dashboard
      const dashboardPath = role === 'ADMIN' ? '/admin/dashboard' : '/student/dashboard';
      return <Navigate to={dashboardPath} replace />;
    }
  }

  return children ? children : <Outlet />;
}
