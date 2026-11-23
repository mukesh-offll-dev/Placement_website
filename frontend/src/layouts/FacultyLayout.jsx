import { useEffect, useState } from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { AlertTriangle, Bell, ChevronRight, Menu } from 'lucide-react';
import FacultySidebar from '../components/FacultySidebar';
import { useAuth } from '../context/AuthContext';
import useUnreadNotifications from '../hooks/useUnreadNotifications';
import usePendingVerifications from '../hooks/usePendingVerifications';
import { getFacultyMe, getFacultyVerificationSummary } from '../services/api/facultyService';

const crumbs = (pathname) => {
  const base = { label: 'Faculty', to: '/faculty/dashboard' };
  if (pathname === '/faculty/dashboard') return [base, { label: 'Dashboard' }];
  if (pathname === '/faculty/students') return [base, { label: 'Students' }];
  if (pathname.startsWith('/faculty/students/')) return [base, { label: 'Students', to: '/faculty/students' }, { label: 'Student Profile' }];
  if (pathname === '/faculty/verifications') return [base, { label: 'Verifications' }];
  if (pathname.startsWith('/faculty/verifications/')) return [base, { label: 'Verifications', to: '/faculty/verifications' }, { label: 'Review' }];
  if (pathname === '/faculty/notifications') return [base, { label: 'Notifications' }];
  return [base, { label: 'Portal' }];
};

/**
 * Faculty advisor shell: sidebar, top bar and the advisor's own record (GET /faculty/me), passed to
 * pages through the outlet context as { faculty, department, facultyLoaded }.
 */
export default function FacultyLayout() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [me, setMe] = useState({ loaded: false, faculty: null, error: '' });
  const { user } = useAuth();
  const location = useLocation();
  const { count: unreadCount } = useUnreadNotifications();
  const { count: pendingCount } = usePendingVerifications(me.faculty?.department ? getFacultyVerificationSummary : null);

  useEffect(() => {
    let cancelled = false;
    getFacultyMe()
      .then((faculty) => { if (!cancelled) setMe({ loaded: true, faculty: faculty || null, error: '' }); })
      .catch((err) => { if (!cancelled) setMe({ loaded: true, faculty: null, error: err.message || 'Could not load your faculty record.' }); });
    return () => { cancelled = true; };
  }, []);

  const department = me.faculty?.department || null;
  const breadcrumbs = crumbs(location.pathname);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col md:flex-row antialiased text-gray-900">
      <FacultySidebar
        mobileOpen={mobileOpen}
        onCloseMobile={() => setMobileOpen(false)}
        unreadCount={unreadCount}
        pendingCount={pendingCount}
        department={department}
      />

      <div className="flex-1 flex flex-col min-w-0">
        <header className="sticky top-0 z-20 bg-white/95 backdrop-blur-md border-b border-gray-200/80 px-4 md:px-8 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <button onClick={() => setMobileOpen(true)} className="p-2 rounded-xl text-gray-600 hover:bg-gray-100 md:hidden" aria-label="Open navigation menu">
              <Menu className="w-5 h-5" />
            </button>
            <nav className="flex items-center gap-1.5 text-sm min-w-0" aria-label="Breadcrumb">
              {breadcrumbs.map((item, index) => {
                const isLast = index === breadcrumbs.length - 1;
                return (
                  <div key={item.label} className={`flex items-center gap-1.5 ${index === 0 ? 'hidden sm:flex' : ''}`}>
                    {index > 0 && <ChevronRight className={`w-3.5 h-3.5 text-gray-400 ${index === 1 ? 'hidden sm:block' : ''}`} />}
                    {item.to && !isLast ? (
                      <Link to={item.to} className="text-gray-500 hover:text-blue-600 font-medium">{item.label}</Link>
                    ) : (
                      <span className="text-gray-900 font-semibold truncate">{item.label}</span>
                    )}
                  </div>
                );
              })}
            </nav>
          </div>
          <div className="flex items-center gap-3">
            {department && (
              <span className="hidden sm:inline-flex items-center text-xs font-semibold px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-700 border border-indigo-100" title={department.name}>
                {department.code}
              </span>
            )}
            <Link to="/faculty/notifications" className="relative p-2 rounded-xl text-gray-600 hover:bg-gray-100" aria-label={`Notifications${unreadCount ? `, ${unreadCount} unread` : ''}`}>
              <Bell className="w-5 h-5" />
              {unreadCount > 0 && <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-red-500 rounded-full ring-2 ring-white" />}
            </Link>
            <div className="flex items-center gap-2.5 pl-2.5 border-l border-gray-200">
              <div className="w-8 h-8 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold text-xs">
                {(user?.fullName || 'F').charAt(0).toUpperCase()}
              </div>
              <div className="hidden lg:block text-left">
                <p className="text-xs font-bold text-gray-900 leading-tight">{user?.fullName || 'Faculty Advisor'}</p>
                <p className="text-[10px] text-gray-500">{me.faculty?.designation || 'Faculty Advisor'}</p>
              </div>
            </div>
          </div>
        </header>

        {me.loaded && !department && (
          <div className="mx-4 md:mx-8 mt-4 flex items-start gap-2 bg-amber-50 border border-amber-200 text-amber-900 text-sm rounded-xl px-4 py-3" role="alert">
            <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0 text-amber-600" />
            <p>
              {me.error && me.error !== 'No department assigned'
                ? me.error
                : 'You are not assigned to a department yet, so there are no students to show. Ask the placement cell administrator to assign you.'}
            </p>
          </div>
        )}

        <div className="flex-1 flex flex-col">
          <Outlet context={{ faculty: me.faculty, department, facultyLoaded: me.loaded }} />
        </div>
      </div>
    </div>
  );
}
