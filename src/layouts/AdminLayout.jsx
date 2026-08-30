import { useState, useRef, useEffect } from 'react';
import { Outlet, useLocation, Link, useNavigate } from 'react-router-dom';
import {
  Menu,
  Bell,
  ChevronRight,
  ShieldCheck,
  Briefcase,
  ExternalLink,
  CheckCircle,
  Clock,
  Sparkles,
} from 'lucide-react';
import AdminSidebar from '../components/AdminSidebar';

const breadcrumbMap = {
  '/admin/dashboard': [{ label: 'Admin', to: '/admin/dashboard' }, { label: 'Dashboard' }],
  '/admin/students': [{ label: 'Admin', to: '/admin/dashboard' }, { label: 'Students' }],
  '/admin/jobs': [{ label: 'Admin', to: '/admin/dashboard' }, { label: 'Job Drives' }],
  '/admin/notifications': [{ label: 'Admin', to: '/admin/dashboard' }, { label: 'Notifications' }],
};

const recentAdminNotifs = [
  { id: 1, title: 'New Job Drive: Google India', time: '5m ago', unread: true },
  { id: 2, title: 'Adithya K shortlisted for Amazon', time: '1h ago', unread: true },
  { id: 3, title: 'TCS NQT registration deadline near', time: '3h ago', unread: false },
];

export default function AdminLayout() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifs, setNotifs] = useState(recentAdminNotifs);
  const location = useLocation();
  const navigate = useNavigate();
  const notifRef = useRef(null);

  // Close notifications on outside click
  useEffect(() => {
    function handleClickOutside(e) {
      if (notifRef.current && !notifRef.current.contains(e.target)) {
        setNotifOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Compute breadcrumbs
  const getBreadcrumbs = () => {
    if (breadcrumbMap[location.pathname]) {
      return breadcrumbMap[location.pathname];
    }
    if (location.pathname.startsWith('/admin/students/')) {
      return [
        { label: 'Admin', to: '/admin/dashboard' },
        { label: 'Students', to: '/admin/students' },
        { label: 'Student Profile' },
      ];
    }
    return [{ label: 'Admin', to: '/admin/dashboard' }, { label: 'Portal' }];
  };

  const breadcrumbs = getBreadcrumbs();
  const unreadCount = notifs.filter((n) => n.unread).length;

  const markAllAsRead = () => {
    setNotifs((prev) => prev.map((n) => ({ ...n, unread: false })));
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col md:flex-row antialiased text-gray-900">
      {/* Unified Left Sidebar */}
      <AdminSidebar mobileOpen={mobileOpen} onCloseMobile={() => setMobileOpen(false)} />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Contextual Topbar (Clean, no duplicate navigation or duplicate logos) */}
        <header className="sticky top-0 z-20 bg-white/95 backdrop-blur-md border-b border-gray-200/80 px-4 md:px-8 py-3.5 flex items-center justify-between transition-all">
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

          {/* Right: Actions, Notification Dropdown, & Profile */}
          <div className="flex items-center gap-3">
            {/* Quick Action button */}
            <Link
              to="/admin/jobs"
              className="hidden sm:inline-flex items-center gap-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors border border-blue-200/60"
            >
              <Briefcase className="w-3.5 h-3.5" />
              Job Drives
            </Link>

            {/* Notification Bell with Dropdown */}
            <div className="relative" ref={notifRef}>
              <button
                onClick={() => setNotifOpen(!notifOpen)}
                className={`relative p-2 rounded-xl transition-colors ${
                  notifOpen ? 'bg-blue-50 text-blue-600' : 'text-gray-600 hover:bg-gray-100'
                }`}
                aria-label="Notifications"
              >
                <Bell className="w-5 h-5" />
                {unreadCount > 0 && (
                  <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-red-500 rounded-full ring-2 ring-white animate-pulse" />
                )}
              </button>

              {/* Dropdown Menu */}
              {notifOpen && (
                <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-2xl shadow-xl border border-gray-200/80 py-3 px-4 z-40 animate-in fade-in slide-in-from-top-2 duration-150">
                  <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                    <div className="flex items-center gap-2">
                      <h4 className="font-bold text-sm text-gray-900">Notifications</h4>
                      {unreadCount > 0 && (
                        <span className="bg-red-100 text-red-700 text-[10px] font-bold px-2 py-0.5 rounded-full">
                          {unreadCount} new
                        </span>
                      )}
                    </div>
                    {unreadCount > 0 && (
                      <button
                        onClick={markAllAsRead}
                        className="text-xs text-blue-600 hover:underline font-medium"
                      >
                        Mark all as read
                      </button>
                    )}
                  </div>

                  <div className="py-2 divide-y divide-gray-50 max-h-64 overflow-y-auto">
                    {notifs.map((n) => (
                      <div key={n.id} className="py-2.5 px-1 flex items-start gap-2.5 hover:bg-gray-50 rounded-lg">
                        <div className="w-2 h-2 rounded-full mt-1.5 shrink-0 bg-blue-600" />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-gray-900 leading-tight">{n.title}</p>
                          <p className="text-[11px] text-gray-400 mt-0.5">{n.time}</p>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="pt-2 border-t border-gray-100 text-center">
                    <Link
                      to="/admin/notifications"
                      onClick={() => setNotifOpen(false)}
                      className="text-xs font-semibold text-blue-600 hover:text-blue-700 inline-flex items-center gap-1"
                    >
                      View all notifications <ExternalLink className="w-3 h-3" />
                    </Link>
                  </div>
                </div>
              )}
            </div>

            {/* Admin Profile Pill */}
            <div className="flex items-center gap-2.5 pl-2.5 border-l border-gray-200">
              <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-xs shadow-xs">
                A
              </div>
              <div className="hidden lg:block text-left">
                <p className="text-xs font-bold text-gray-900 leading-tight">Admin</p>
                <p className="text-[10px] text-gray-500">Placement Cell</p>
              </div>
            </div>
          </div>
        </header>

        {/* Child Route Outlet */}
        <div className="flex-1 flex flex-col">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
