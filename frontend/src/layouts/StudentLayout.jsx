import { useState } from 'react';
import { Outlet, useLocation, Link, NavLink, useNavigate } from 'react-router-dom';
import {
  Menu,
  ChevronRight,
  Briefcase,
  Bell,
  LogOut,
  Home,
  CheckSquare,
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

const bottomNavItems = [
  { to: '/student/dashboard', icon: Home, label: 'Home' },
  { to: '/student/jobs', icon: Briefcase, label: 'Drives' },
  { to: '/student/applications', icon: CheckSquare, label: 'Applied' },
  { to: '/student/notifications', icon: Bell, label: 'Alerts', showUnread: true },
  { to: '/student/profile', icon: User, label: 'Profile' },
];

function getTimeGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning,';
  if (hour < 17) return 'Good afternoon,';
  return 'Good evening,';
}

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
  const displayName = currentUser?.fullName || 'Student';
  const initial = displayName.trim() ? displayName.trim()[0].toUpperCase() : 'S';
  const isHome = location.pathname === '/student/dashboard';
  const pageTitle = breadcrumbs[breadcrumbs.length - 1]?.label || 'Portal';

  const handleLogout = () => {
    logout();
    toastInfo('You have been signed out successfully.');
    navigate('/student/login', { replace: true });
  };

  return (
    <div className="student-app-shell min-h-screen bg-gray-50 flex flex-col md:flex-row antialiased text-gray-900 overflow-x-hidden">
      {/* Desktop Sidebar & Optional Mobile Drawer */}
      <StudentSidebar
        mobileOpen={mobileOpen}
        onCloseMobile={() => setMobileOpen(false)}
        unreadCount={unreadCount}
        verificationStatus={verificationStatus}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile App Header (< md) — inspired directly by Page 2 */}
        <header className="md:hidden sticky top-0 z-20 bg-[#F4F6FB]/95 backdrop-blur-md px-4 pt-3.5 pb-2.5 flex items-center justify-between gap-2">
          <div className="flex items-center gap-3 min-w-0">
            <Link
              to="/student/profile"
              aria-label="Open profile"
              className="w-11 h-11 rounded-full bg-[#1D4ED8] text-white flex items-center justify-center font-bold text-[17px] shrink-0 shadow-xs active:scale-95 transition-transform"
            >
              {initial}
            </Link>
            <div className="min-w-0">
              {isHome ? (
                <>
                  <p className="text-[13px] text-[#475569] leading-tight truncate">{getTimeGreeting()}</p>
                  <p className="text-[17px] font-bold text-[#0F172A] leading-tight truncate">{displayName}</p>
                </>
              ) : (
                <>
                  <p className="text-[11px] font-semibold text-[#64748B] uppercase tracking-wider leading-tight truncate">
                    GCE Srirangam
                  </p>
                  <p className="text-[17px] font-bold text-[#0F172A] leading-tight truncate">{pageTitle}</p>
                </>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Link
              to="/student/notifications"
              aria-label={unreadCount > 0 ? `Notifications, ${unreadCount} unread` : 'Notifications'}
              className={`relative w-11 h-11 rounded-[14px] flex items-center justify-center transition-colors shadow-[0_1px_2px_rgba(15,23,42,0.06)] ${
                location.pathname === '/student/notifications'
                  ? 'bg-[#E0EAFF] text-[#1D4ED8]'
                  : 'bg-white text-[#0F172A] hover:bg-slate-50'
              }`}
            >
              <Bell className="w-[21px] h-[21px]" strokeWidth={1.8} />
              {unreadCount > 0 && (
                <span className="absolute top-2.5 right-2.5 w-2.5 h-2.5 rounded-full bg-[#F59E0B] border-2 border-white" />
              )}
            </Link>
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              aria-label="Open navigation menu"
              className="w-11 h-11 rounded-[14px] bg-white text-[#475569] hover:text-[#0F172A] flex items-center justify-center shadow-[0_1px_2px_rgba(15,23,42,0.06)] active:scale-95 transition-all"
            >
              <Menu className="w-5 h-5" strokeWidth={1.8} />
            </button>
          </div>
        </header>

        {/* Desktop / Tablet Topbar (>= md): the original portal header */}
        <header className="hidden md:flex sticky top-0 z-20 bg-white/95 backdrop-blur-md border-b border-gray-200/80 px-8 py-3.5 items-center justify-between transition-all">
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

          {/* Right: Quick actions & Student Profile */}
          <div className="flex items-center gap-3">
            <Link
              to="/student/jobs"
              className="inline-flex items-center gap-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors border border-blue-200/60"
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
                {initial}
              </div>
              <div className="text-left">
                <p className="text-xs font-bold text-gray-900 leading-tight">{displayName}</p>
                <p className="text-[10px] text-gray-500">{currentUser?.email || ''}</p>
              </div>
            </Link>

            <button
              type="button"
              onClick={handleLogout}
              title="Logout"
              aria-label="Logout"
              className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </header>

        {/* Child Route Outlet (safe bottom padding on mobile for bottom nav bar) */}
        <div className="flex-1 flex flex-col pb-[calc(84px+env(safe-area-inset-bottom))] md:pb-8">
          <Outlet />
        </div>
      </div>

      {/* Mobile Bottom Navigation Bar (< md) — 5 items matching Page 2 */}
      <nav
        aria-label="Main"
        className="md:hidden fixed bottom-0 inset-x-0 z-30 bg-white/98 backdrop-blur-md border-t border-[#E5E9F2] grid grid-cols-5 px-1.5 pt-2 pb-[max(10px,env(safe-area-inset-bottom))] shadow-[0_-4px_20px_rgba(15,23,42,0.04)]"
      >
        {bottomNavItems.map(({ to, icon: NavIcon, label, showUnread }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex flex-col items-center justify-center gap-1 py-0.5 text-[11px] transition-colors ${
                isActive ? 'text-[#1D4ED8] font-bold' : 'text-[#64748B] font-semibold'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <span
                  className={`relative w-[52px] h-[30px] rounded-[15px] flex items-center justify-center transition-colors ${
                    isActive ? 'bg-[#E0EAFF] text-[#1D4ED8]' : 'bg-transparent'
                  }`}
                >
                  <NavIcon className="w-[21px] h-[21px]" strokeWidth={isActive ? 2.1 : 1.8} aria-hidden="true" />
                  {showUnread && unreadCount > 0 && (
                    <span className="absolute top-1 right-3 w-2 h-2 rounded-full bg-[#F59E0B] ring-2 ring-white" />
                  )}
                </span>
                <span className="leading-none">{label}</span>
              </>
            )}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
