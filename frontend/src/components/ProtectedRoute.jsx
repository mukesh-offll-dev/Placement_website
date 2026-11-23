import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  changePasswordPathForRole,
  homePathForRole,
  isStaffRole,
  loginPathForAllowedRoles,
} from '../utils/roles';

/**
 * ProtectedRoute
 *
 * Route guard enforcing role-based access control on frontend routes (the backend enforces the
 * same rules; this only keeps people on pages they can use).
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
    return <Navigate to={redirectTo || loginPathForAllowedRoles(targetRoles)} replace />;
  }

  if (targetRoles.length > 0 && !targetRoles.includes(role)) {
    // Authenticated but wrong role → back to their own portal.
    return <Navigate to={homePathForRole(role)} replace />;
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

  // A staff member signed in with a temporary password must replace it first.
  if (isStaffRole(role)) {
    const changePath = changePasswordPathForRole(role);
    const onChangePage = location.pathname === changePath;
    if (user?.passwordChangeRequired && !onChangePage) {
      return <Navigate to={changePath} replace />;
    }
  }

  return children ? children : <Outlet />;
}
