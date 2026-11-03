import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

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
  // Values come from the auth context, not the storage helpers, so the guard
  // re-renders when a session ends instead of reading a stale snapshot.
  const { isAuthenticated, role, user } = useAuth();
  const location = useLocation();
  const targetRoles = allowedRoles || [allowedRole || requiredRole].filter(Boolean);

  if (!isAuthenticated) {
    const defaultRedirect = targetRoles.includes('ADMIN') || targetRoles.includes('PLACEMENT_OFFICER')
      ? '/admin/login'
      : (targetRoles.includes('STUDENT') ? '/student/login' : '/login');
    return <Navigate to={redirectTo || defaultRedirect} replace />;
  }

  if (targetRoles.length > 0) {
    if (!targetRoles.includes(role)) {
      // Authenticated but wrong role → redirect to their own authorized dashboard
      const dashboardPath = ['ADMIN', 'PLACEMENT_OFFICER'].includes(role)
        ? '/admin/dashboard'
        : role === 'STUDENT' ? '/student/dashboard' : '/';
      return <Navigate to={dashboardPath} replace />;
    }
  }

  // A new student must finish first-login setup (new password, name, email, phone) before using
  // anything else. The backend refuses every other request until then; this just routes them there.
  if (role === 'STUDENT') {
    const onSetupPage = location.pathname === '/student/setup';
    if (user?.setupRequired && !onSetupPage) {
      return <Navigate to="/student/setup" replace />;
    }
    if (!user?.setupRequired && onSetupPage) {
      return <Navigate to="/student/dashboard" replace />;
    }
  }

  return children ? children : <Outlet />;
}
