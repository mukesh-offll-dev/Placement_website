import { Navigate } from 'react-router-dom';
import { isAuthenticated, getRole } from '../services/authService';

/**
 * ProtectedRoute
 *
 * Wraps a route element and checks authentication + optional role.
 *
 * Usage:
 *   <ProtectedRoute allowedRole="STUDENT">
 *     <StudentDashboard />
 *   </ProtectedRoute>
 *
 * Props:
 *   children      – the component to render if authorised
 *   allowedRole   – "STUDENT" | "ADMIN" | undefined (any authenticated user)
 *   redirectTo    – where to send unauthenticated users (default "/login")
 */
export default function ProtectedRoute({ children, allowedRole, redirectTo = '/login' }) {
  if (!isAuthenticated()) {
    return <Navigate to={redirectTo} replace />;
  }

  if (allowedRole) {
    const role = getRole();
    if (role !== allowedRole) {
      // Authenticated but wrong role → redirect to their own dashboard
      const dashboardPath = role === 'ADMIN' ? '/admin/dashboard' : '/student/dashboard';
      return <Navigate to={dashboardPath} replace />;
    }
  }

  return children;
}
