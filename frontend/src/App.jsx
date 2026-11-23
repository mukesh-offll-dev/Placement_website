import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';

import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import AdminLoginPage from './pages/AdminLoginPage';
import StudentLoginPage from './pages/StudentLoginPage';
import StudentSetupPage from './pages/StudentSetupPage';
import FacultyLoginPage from './pages/FacultyLoginPage';
import StaffChangePasswordPage from './pages/StaffChangePasswordPage';

import AdminLayout from './layouts/AdminLayout';
import StudentLayout from './layouts/StudentLayout';
import FacultyLayout from './layouts/FacultyLayout';

import AdminDashboard from './pages/AdminDashboard';
import AdminStudents from './pages/AdminStudents';
import AdminStudentDetail from './pages/AdminStudentDetail';
import AdminManageStudents from './pages/AdminManageStudents';
import AdminApplications from './pages/AdminApplications';
import AdminJobDriveForm from './pages/AdminJobDriveForm';
import AdminDepartmentsPage from './pages/AdminDepartmentsPage';
import AdminAuditLogs from './pages/AdminAuditLogs';
import { AdminVerifications, AdminVerificationReview } from './pages/AdminVerificationPages';
import FacultyDashboard from './pages/FacultyDashboard';
import FacultyStudents from './pages/FacultyStudents';
import { FacultyStudentDetail, FacultyVerifications, FacultyVerificationReview } from './pages/FacultyPages';
import NotificationsPage from './pages/NotificationsPage';
import JobsPage from './pages/JobsPage';
import JobDetailPage from './pages/JobDetailPage';
import StudentDashboard from './pages/StudentDashboard';
import StudentProfile from './pages/StudentProfile';
import AddProjectPage from './pages/AddProjectPage';
import StudentVerificationPage from './pages/StudentVerificationPage';
import StudentApplicationsPage from './pages/StudentApplicationsPage';
import NotFoundPage from './pages/NotFoundPage';

import ProtectedRoute from './components/ProtectedRoute';
import ErrorBoundary from './components/ErrorBoundary';
import { loginPathForRole } from './utils/roles';

const AUTH_PAGES = ['/login', '/admin/login', '/student/login', '/faculty/login'];

/**
 * Listens for centralized 401 unauthorized events inside the React Router context.
 * Redirects ADMIN/officer users to /admin/login, faculty to /faculty/login and students to /student/login,
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

      // Placement officers sign in through the admin portal too (the backend admits
      // them to /admin/**); faculty advisors have their own login page.
      const role = event?.detail?.role;
      const targetPath = role ? loginPathForRole(role) : '/student/login';

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
      <ErrorBoundary>
        <Routes>
        {/* Public */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />

        {/* Admin Auth */}
        <Route path="/admin/login" element={<AdminLoginPage />} />

        {/* Staff forced/optional password change: outside the layouts, like student setup. */}
        <Route element={<ProtectedRoute allowedRoles={['ADMIN', 'PLACEMENT_OFFICER']} redirectTo="/admin/login" />}>
          <Route path="/admin/change-password" element={<StaffChangePasswordPage />} />
        </Route>

        {/* Admin Routes — protected, require ADMIN role */}
        <Route
          element={
            <ProtectedRoute allowedRoles={['ADMIN', 'PLACEMENT_OFFICER']} redirectTo="/admin/login">
              <AdminLayout />
            </ProtectedRoute>
          }
        >
          <Route path="/admin/dashboard" element={<AdminDashboard />} />
          <Route path="/admin/applications" element={<AdminApplications />} />
          <Route path="/admin/students" element={<AdminStudents />} />
          {/* Specific path before :id, or "manage" is read as a student id. */}
          <Route path="/admin/students/manage" element={<AdminManageStudents />} />
          <Route path="/admin/students/:id" element={<AdminStudentDetail />} />
          <Route path="/admin/jobs" element={<JobsPage isAdmin />} />
          {/* Specific paths before the :id route, or "new" is read as an id. */}
          <Route path="/admin/jobs/new" element={<AdminJobDriveForm />} />
          <Route path="/admin/jobs/:id/edit" element={<AdminJobDriveForm />} />
          <Route path="/admin/notifications" element={<NotificationsPage />} />
          {/* ADMIN only (officers are sent back to their dashboard; the backend refuses them too). */}
          <Route element={<ProtectedRoute allowedRole="ADMIN" redirectTo="/admin/login" />}>
            <Route path="/admin/departments" element={<AdminDepartmentsPage />} />
            <Route path="/admin/verifications" element={<AdminVerifications />} />
            <Route path="/admin/verifications/:id" element={<AdminVerificationReview />} />
            <Route path="/admin/audit-logs" element={<AdminAuditLogs />} />
          </Route>
        </Route>

        {/* Faculty advisor portal */}
        <Route path="/faculty/login" element={<FacultyLoginPage />} />
        <Route path="/faculty" element={<Navigate to="/faculty/dashboard" replace />} />
        <Route element={<ProtectedRoute allowedRole="FACULTY_ADVISOR" redirectTo="/faculty/login" />}>
          <Route path="/faculty/change-password" element={<StaffChangePasswordPage />} />
        </Route>
        <Route
          element={
            <ProtectedRoute allowedRole="FACULTY_ADVISOR" redirectTo="/faculty/login">
              <FacultyLayout />
            </ProtectedRoute>
          }
        >
          <Route path="/faculty/dashboard" element={<FacultyDashboard />} />
          <Route path="/faculty/students" element={<FacultyStudents />} />
          <Route path="/faculty/students/:id" element={<FacultyStudentDetail />} />
          <Route path="/faculty/verifications" element={<FacultyVerifications />} />
          <Route path="/faculty/verifications/:id" element={<FacultyVerificationReview />} />
          <Route path="/faculty/notifications" element={<NotificationsPage />} />
        </Route>

        {/* Student Auth */}
        <Route path="/student/login" element={<StudentLoginPage />} />
        {/* No public registration: the placement cell creates student accounts. */}

        {/* First-login setup: outside the student layout, because nothing else is usable yet. */}
        <Route element={<ProtectedRoute allowedRole="STUDENT" redirectTo="/student/login" />}>
          <Route path="/student/setup" element={<StudentSetupPage />} />
        </Route>

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
          <Route path="/student/notifications" element={<NotificationsPage />} />
          <Route path="/student/verification" element={<StudentVerificationPage />} />
        </Route>

        {/* Catch-all: 404 Not Found */}
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </ErrorBoundary>
  </BrowserRouter>
  );
}
