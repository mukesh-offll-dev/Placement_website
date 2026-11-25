import { Link, NavLink, useNavigate } from 'react-router-dom';
import { Bell, KeyRound, LayoutDashboard, LogOut, ShieldCheck, Users, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import BrandLogo from './BrandLogo';
import { toastInfo } from '../utils/toast';

const navItems = [
  { to: '/faculty/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/faculty/students', icon: Users, label: 'Students' },
  { to: '/faculty/verifications', icon: ShieldCheck, label: 'Verifications', badge: 'pending' },
  { to: '/faculty/notifications', icon: Bell, label: 'Notifications', badge: 'unread' },
];

/** Faculty advisor navigation; mirrors AdminSidebar (fixed on desktop, drawer on mobile). */
export default function FacultySidebar({ mobileOpen = false, onCloseMobile = () => {}, unreadCount = 0, pendingCount = 0, department = null }) {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const handleLogout = () => {
    logout();
    toastInfo('You have been signed out successfully.');
    navigate('/faculty/login', { replace: true });
  };

  const badges = { pending: pendingCount, unread: unreadCount };

  const sidebarContent = (
    <div className="flex flex-col h-full bg-white border-r border-gray-200">
      <div className="px-5 py-5 border-b border-gray-100 flex items-center justify-between">
        <Link to="/faculty/dashboard" onClick={onCloseMobile} className="flex items-center gap-3 min-w-0" aria-label="Faculty dashboard">
          <BrandLogo className="h-11 shrink-0" />
          <div className="min-w-0">
            <p className="font-bold text-sm text-gray-900 leading-tight">GCE Srirangam</p>
            <div className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-indigo-50 text-indigo-700 mt-0.5">
              Faculty Portal
            </div>
          </div>
        </Link>
        <button onClick={onCloseMobile} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 md:hidden" aria-label="Close sidebar">
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="px-5 py-3 border-b border-gray-100 bg-gray-50/60">
        <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Department</p>
        {department ? (
          <p className="text-sm text-gray-900 mt-0.5">
            <span className="font-bold">{department.code}</span>
            {department.name && <span className="block text-xs text-gray-500 truncate" title={department.name}>{department.name}</span>}
          </p>
        ) : (
          <p className="text-xs text-amber-700 mt-0.5">Not assigned</p>
        )}
      </div>

      <div className="px-3 py-4 flex-1 overflow-y-auto space-y-1">
        <p className="px-3 text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-2">Advisor</p>
        {navItems.map(({ to, icon: NavIcon, label, badge }) => {
          const value = badge ? badges[badge] : 0;
          return (
            <NavLink
              key={to}
              to={to}
              onClick={onCloseMobile}
              className={({ isActive }) =>
                `flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 ${
                  isActive ? 'bg-blue-600 text-white shadow-sm shadow-blue-200 font-semibold' : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <div className="flex items-center gap-3">
                    <NavIcon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-gray-500'}`} />
                    <span>{label}</span>
                  </div>
                  {value > 0 && (
                    <span
                      className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                        isActive ? 'bg-white/20 text-white' : badge === 'pending' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'
                      }`}
                      aria-label={badge === 'pending' ? `${value} pending verifications` : `${value} unread notifications`}
                    >
                      {value > 99 ? '99+' : value}
                    </span>
                  )}
                </>
              )}
            </NavLink>
          );
        })}
        <NavLink
          to="/faculty/change-password"
          onClick={onCloseMobile}
          className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-100 hover:text-gray-900"
        >
          <KeyRound className="w-4 h-4 text-gray-500" /> Change password
        </NavLink>
      </div>

      <div className="p-3 border-t border-gray-100 bg-gray-50/70">
        <div className="flex items-center justify-between p-2 rounded-xl bg-white border border-gray-200 shadow-xs">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="relative w-8 h-8 rounded-lg bg-gradient-to-tr from-indigo-600 to-blue-600 text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-xs">
              {(user?.fullName || 'F').charAt(0).toUpperCase()}
              <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-500 border-2 border-white rounded-full"></span>
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold text-gray-900 truncate">{user?.fullName || 'Faculty Advisor'}</p>
              <p className="text-[10px] text-gray-500 truncate">{user?.email || ''}</p>
            </div>
          </div>
          <button onClick={handleLogout} title="Logout" aria-label="Log out" className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors shrink-0">
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <>
      <aside className="hidden md:block w-64 h-screen sticky top-0 shrink-0 z-30">{sidebarContent}</aside>
      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-xs transition-opacity" onClick={onCloseMobile} />
          <div className="relative w-72 max-w-[85vw] h-full shadow-2xl z-10 animate-in slide-in-from-left duration-200">{sidebarContent}</div>
        </div>
      )}
    </>
  );
}
