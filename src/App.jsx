import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import AdminLoginPage from './pages/AdminLoginPage';
import StudentLoginPage from './pages/StudentLoginPage';

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

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />

        {/* Admin Auth */}
        <Route path="/admin/login" element={<AdminLoginPage />} />

        {/* Admin Routes with Unified Layout */}
        <Route element={<AdminLayout />}>
          <Route path="/admin/dashboard" element={<AdminDashboard />} />
          <Route path="/admin/students" element={<AdminStudents />} />
          <Route path="/admin/students/:id" element={<AdminStudentDetail />} />
          <Route path="/admin/jobs" element={<JobsPage isAdmin />} />
          <Route path="/admin/notifications" element={<NotificationsPage />} />
        </Route>

        {/* Student Auth */}
        <Route path="/student/login" element={<StudentLoginPage />} />

        {/* Student Routes with Unified Layout */}
        <Route element={<StudentLayout />}>
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
