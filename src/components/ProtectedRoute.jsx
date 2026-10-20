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
  allowedRoles,
  requiredRole,
  redirectTo,
}) {
  const targetRoles = allowedRoles || [allowedRole || requiredRole].filter(Boolean);

  if (!isAuthenticated()) {
    const defaultRedirect = targetRoles.includes('ADMIN') || targetRoles.includes('PLACEMENT_OFFICER')
      ? '/admin/login'
      : (targetRoles.includes('STUDENT') ? '/student/login' : '/login');
    return <Navigate to={redirectTo || defaultRedirect} replace />;
  }

  if (targetRoles.length > 0) {
    const role = getRole();
    if (!targetRoles.includes(role)) {
      // Authenticated but wrong role → redirect to their own authorized dashboard
      const dashboardPath = ['ADMIN', 'PLACEMENT_OFFICER'].includes(role)
        ? '/admin/dashboard'
        : role === 'STUDENT' ? '/student/dashboard' : '/';
      return <Navigate to={dashboardPath} replace />;
    }
  }

  return children ? children : <Outlet />;
}
