import { useState } from 'react';
import { Outlet, useLocation, Link, useNavigate } from 'react-router-dom';
import {
  Menu,
  ChevronRight,
  Briefcase,
  Bell,
  LogOut,
  LayoutDashboard,
  FileText,
  User,
} from 'lucide-react';
import StudentSidebar from '../components/StudentSidebar';
import { useAuth } from '../context/AuthContext';
import { toastInfo } from '../utils/toast';
import useUnreadNotifications from '../hooks/useUnreadNotifications';
import useVerificationStatus from '../components/student/useVerificationStatus';

const breadcrumbMap = {
  '/student/dashboard': [{ label: 'Student', to: '/student/dashboard' }, { label: 'Dashboard' }],
  '/student/jobs': [{ label: 'Student', to: '/student/dashboard' }, { label: 'Job Drives' }],
  '/student/applications': [{ label: 'Student', to: '/student/dashboard' }, { label: 'My Applications' }],
  '/student/profile': [{ label: 'Student', to: '/student/dashboard' }, { label: 'My Profile' }],
  '/student/notifications': [{ label: 'Student', to: '/student/dashboard' }, { label: 'Notifications' }],
  '/student/verification': [{ label: 'Student', to: '/student/dashboard' }, { label: 'Profile Verification' }],
  '/student/add-project': [
    { label: 'Student', to: '/student/dashboard' },
    { label: 'My Profile', to: '/student/profile' },
    { label: 'Add Project' },
  ],
};

export default function StudentLayout() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { user: currentUser, logout } = useAuth();
  const { count: unreadCount } = useUnreadNotifications();
  const { status: draftStatus, profileVerificationStatus } = useVerificationStatus();
  const verificationStatus =
    draftStatus === 'PENDING'
      ? 'PENDING'
      : draftStatus === 'REJECTED' || profileVerificationStatus === 'REJECTED'
      ? 'REJECTED'
      : null;

  // Compute breadcrumbs
  const getBreadcrumbs = () => {
    if (breadcrumbMap[location.pathname]) {
      return breadcrumbMap[location.pathname];
    }
    if (location.pathname.startsWith('/student/jobs/')) {
      return [
        { label: 'Student', to: '/student/dashboard' },
        { label: 'Job Drives', to: '/student/jobs' },
        { label: 'Job Details' },
      ];
    }
    return [{ label: 'Student', to: '/student/dashboard' }, { label: 'Portal' }];
  };

  const breadcrumbs = getBreadcrumbs();
  const isJobRoute =
    location.pathname === '/student/jobs' || location.pathname.startsWith('/student/jobs/');
  const mobileTabs = [
    { to: '/student/dashboard', label: 'Home', icon: LayoutDashboard },
    { to: '/student/jobs', label: 'Drives', icon: Briefcase },
    { to: '/student/applications', label: 'Applied', icon: FileText },
    { to: '/student/notifications', label: 'Alerts', icon: Bell },
    { to: '/student/profile', label: 'Profile', icon: User },
  ];

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col md:flex-row antialiased text-gray-900">
      {/* Unified Left Sidebar */}
      <StudentSidebar
        mobileOpen={mobileOpen}
        onCloseMobile={() => setMobileOpen(false)}
        unreadCount={unreadCount}
        verificationStatus={verificationStatus}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Contextual Topbar (Clean, no duplicate navigation or duplicate logos) */}
        <header className={`sticky top-0 z-20 bg-white/95 backdrop-blur-md border-b border-gray-200/80 px-4 md:px-8 py-3.5 flex items-center justify-between transition-all ${isJobRoute ? 'hidden md:flex' : ''}`}>
          {/* Left: Mobile hamburger & Dynamic Breadcrumb */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileOpen(true)}
              className="p-2 rounded-xl text-gray-600 hover:bg-gray-100 md:hidden transition-colors"
              aria-label="Open navigation menu"
            >
              <Menu className="w-5 h-5" />
            </button>

            {/* Breadcrumbs */}
            <nav className="flex items-center gap-1.5 text-sm" aria-label="Breadcrumb">
              {breadcrumbs.map((item, index) => {
                const isLast = index === breadcrumbs.length - 1;
                return (
                  <div key={index} className="flex items-center gap-1.5">
                    {index > 0 && <ChevronRight className="w-3.5 h-3.5 text-gray-400" />}
                    {item.to && !isLast ? (
                      <Link
                        to={item.to}
                        className="text-gray-500 hover:text-blue-600 font-medium transition-colors"
                      >
                        {item.label}
                      </Link>
                    ) : (
                      <span className="text-gray-900 font-semibold">{item.label}</span>
                    )}
                  </div>
                );
              })}
            </nav>
          </div>

          {/* Right: Quick actions & Student Profile */}
          <div className="flex items-center gap-3">
            <Link
              to="/student/jobs"
              className="hidden sm:inline-flex items-center gap-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors border border-blue-200/60"
            >
              <Briefcase className="w-3.5 h-3.5" />
              Explore Jobs
            </Link>

            {/* Notification bell with unread badge */}
            <Link
              to="/student/notifications"
              className={`relative p-2 rounded-xl transition-colors ${
                location.pathname === '/student/notifications'
                  ? 'bg-blue-50 text-blue-600'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
              aria-label={unreadCount > 0 ? `Notifications, ${unreadCount} unread` : 'Notifications'}
            >
              <Bell className="w-5 h-5" />
              {unreadCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 bg-red-500 text-white text-[10px] font-bold rounded-full ring-2 ring-white flex items-center justify-center">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
            </Link>

            {/* Student Profile Pill */}
            <Link
              to="/student/profile"
              className="flex items-center gap-2.5 pl-2.5 py-1 px-2 rounded-xl hover:bg-gray-100/80 transition-colors"
            >
              <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center font-bold text-xs shadow-xs">
                {currentUser?.fullName ? currentUser.fullName[0].toUpperCase() : 'S'}
              </div>
              <div className="hidden sm:block text-left">
                <p className="text-xs font-bold text-gray-900 leading-tight">{currentUser?.fullName || 'Student'}</p>
                <p className="text-[10px] text-gray-500">{currentUser?.email || ''}</p>
              </div>
            </Link>

            <button
              onClick={() => {
                logout();
                toastInfo('You have been signed out successfully.');
                navigate('/student/login', { replace: true });
              }}
              title="Logout"
              className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </header>

        {/* Child Route Outlet */}
        <div className="flex-1 flex flex-col">
          <Outlet />
        </div>
        {isJobRoute && (
          <nav
            className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 border-t border-gray-200 bg-white px-2 pt-2 pb-[calc(0.5rem+env(safe-area-inset-bottom))] md:hidden"
            aria-label="Student navigation"
          >
            {mobileTabs.map(({ to, label, icon: Icon }) => {
              const active =
                label === 'Drives'
                  ? isJobRoute
                  : location.pathname === to;
              return (
                <Link
                  key={to}
                  to={to}
                  aria-current={active ? 'page' : undefined}
                  className={`flex flex-col items-center gap-1 py-1 text-[10px] font-medium ${
                    active ? 'text-blue-700' : 'text-gray-500'
                  }`}
                >
                  <Icon className={`h-4 w-4 ${active ? 'text-blue-700' : 'text-gray-500'}`} />
                  {label}
                </Link>
              );
            })}
          </nav>
        )}
      </div>
    </div>
  );
}
