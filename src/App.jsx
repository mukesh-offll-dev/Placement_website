import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';

import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import AdminLoginPage from './pages/AdminLoginPage';
import StudentLoginPage from './pages/StudentLoginPage';
import StudentRegisterPage from './pages/StudentRegisterPage';

import AdminLayout from './layouts/AdminLayout';
import StudentLayout from './layouts/StudentLayout';

import AdminDashboard from './pages/AdminDashboard';
import AdminStudents from './pages/AdminStudents';
import AdminStudentDetail from './pages/AdminStudentDetail';
import NotificationsPage from './pages/NotificationsPage';
import JobsPage from './pages/JobsPage';
import JobDetailPage from './pages/JobDetailPage';
import StudentDashboard from './pages/StudentDashboard';
import StudentProfile from './pages/StudentProfile';
import AddProjectPage from './pages/AddProjectPage';
import StudentApplicationsPage from './pages/StudentApplicationsPage';

import ProtectedRoute from './components/ProtectedRoute';

const AUTH_PAGES = ['/login', '/admin/login', '/student/login', '/student/register'];

/**
 * Listens for centralized 401 unauthorized events inside the React Router context.
 * Redirects ADMIN users to /admin/login and student/other users to /student/login,
 * while preventing repeated redirects if already on a login or registration page.
 */
function AuthUnauthorizedListener() {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const handleUnauthorized = (event) => {
      const currentPath = location.pathname;
      const isAlreadyOnAuthPage = AUTH_PAGES.some(
        (page) => currentPath === page || currentPath.startsWith(page + '/')
      );

      if (isAlreadyOnAuthPage) {
        return;
      }

      const role = event?.detail?.role;
      const targetPath = role === 'ADMIN' ? '/admin/login' : '/student/login';

      navigate(targetPath, { replace: true });
    };

    window.addEventListener('auth:unauthorized', handleUnauthorized);
    return () => {
      window.removeEventListener('auth:unauthorized', handleUnauthorized);
    };
  }, [navigate, location.pathname]);

  return null;
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthUnauthorizedListener />
      <Routes>
        {/* Public */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />

        {/* Admin Auth */}
        <Route path="/admin/login" element={<AdminLoginPage />} />

        {/* Admin Routes — protected, require ADMIN role */}
        <Route
          element={
            <ProtectedRoute allowedRole="ADMIN" redirectTo="/admin/login">
              <AdminLayout />
            </ProtectedRoute>
          }
        >
          <Route path="/admin/dashboard" element={<AdminDashboard />} />
          <Route path="/admin/students" element={<AdminStudents />} />
          <Route path="/admin/students/:id" element={<AdminStudentDetail />} />
          <Route path="/admin/jobs" element={<JobsPage isAdmin />} />
          <Route path="/admin/notifications" element={<NotificationsPage />} />
        </Route>

        {/* Student Auth */}
        <Route path="/student/login" element={<StudentLoginPage />} />
        <Route path="/student/register" element={<StudentRegisterPage />} />

        {/* Student Routes — protected, require STUDENT role */}
        <Route
          element={
            <ProtectedRoute allowedRole="STUDENT" redirectTo="/student/login">
              <StudentLayout />
            </ProtectedRoute>
          }
        >
          <Route path="/student/dashboard" element={<StudentDashboard />} />
          <Route path="/student/profile" element={<StudentProfile />} />
          <Route path="/student/jobs" element={<JobsPage />} />
          <Route path="/student/add-project" element={<AddProjectPage />} />
          <Route path="/student/jobs/:id" element={<JobDetailPage />} />
          <Route path="/student/applications" element={<StudentApplicationsPage />} />
        </Route>

        {/* Catch-all */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
