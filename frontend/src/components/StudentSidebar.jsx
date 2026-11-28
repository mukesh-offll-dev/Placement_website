import { Link, NavLink, useNavigate } from 'react-router-dom';
import {
  Home,
  Briefcase,
  CheckSquare,
  User,
  Bell,
  LogOut,
  X,
  ShieldCheck,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import BrandLogo from './BrandLogo';
import { toastInfo } from '../utils/toast';

const navItems = [
  { to: '/student/dashboard', icon: Home, label: 'Home' },
  { to: '/student/jobs', icon: Briefcase, label: 'Job Drives' },
  { to: '/student/applications', icon: CheckSquare, label: 'My Applications' },
  { to: '/student/notifications', icon: Bell, label: 'Alerts', showUnread: true },
  { to: '/student/profile', icon: User, label: 'My Profile' },
  { to: '/student/verification', icon: ShieldCheck, label: 'Verification', showVerification: true },
];

const VERIFICATION_BADGE = {
  PENDING: { text: 'Pending', cls: 'bg-yellow-100 text-yellow-800', label: 'Verification pending review' },
  REJECTED: { text: 'Action', cls: 'bg-red-100 text-red-700', label: 'Verification changes requested' },
};

export default function StudentSidebar({
  mobileOpen = false,
  onCloseMobile = () => {},
  unreadCount = 0,
  verificationStatus = null,
}) {
  const verificationBadge = VERIFICATION_BADGE[verificationStatus] || null;
  const navigate = useNavigate();
  const { user: currentUser, logout } = useAuth();

  const displayName = currentUser?.fullName || 'Student';
  const initial = displayName.trim() ? displayName.trim()[0].toUpperCase() : 'S';

  const handleLogout = () => {
    logout();
    toastInfo('You have been signed out successfully.');
    navigate('/student/login', { replace: true });
  };

  const sidebarContent = (
    <div
      className="flex flex-col h-full bg-white border-r border-[#E5E9F2]"
      style={{ fontFamily: "'Plus Jakarta Sans', ui-sans-serif, system-ui, sans-serif" }}
    >
      {/* Brand Header */}
      <div className="px-5 py-5 border-b border-[#E5E9F2] flex items-center justify-between bg-[#0F2A6B] text-white relative overflow-hidden">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-10 -top-10 w-28 h-28 rounded-full border-[18px] border-[#F5B301]/18"
        />
        <Link to="/student/dashboard" onClick={onCloseMobile} className="flex items-center gap-3 relative z-10" aria-label="Student dashboard">
          <div className="w-11 h-11 rounded-[14px] bg-white flex items-center justify-center shrink-0">
            <BrandLogo className="h-8" />
          </div>
          <div>
            <p className="font-extrabold text-[14px] text-white leading-tight">GCE Srirangam</p>
            <div className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#F5B301] text-[#1F1500] mt-1">
              Student Portal
            </div>
          </div>
        </Link>
        <button
          onClick={onCloseMobile}
          className="p-2 rounded-xl text-[#C7D2FE] hover:text-white hover:bg-white/10 md:hidden relative z-10"
          aria-label="Close sidebar"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Navigation section */}
      <div className="px-3 py-4 flex-1 overflow-y-auto space-y-1.5">
        <p className="px-3 text-[11px] font-bold text-[#64748B] uppercase tracking-wider mb-2">
          Menu
        </p>
        {navItems.map(({ to, icon: NavIcon, label, showUnread, showVerification }) => (
          <NavLink
            key={to}
            to={to}
            onClick={onCloseMobile}
            className={({ isActive }) =>
              `flex items-center justify-between px-3.5 py-2.5 rounded-[16px] text-[14px] transition-all duration-150 ${
                isActive
                  ? 'bg-[#E0EAFF] text-[#1D4ED8] font-bold'
                  : 'text-[#475569] hover:bg-[#F8F9FC] hover:text-[#0F172A] font-semibold'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <div className="flex items-center gap-3">
                  <NavIcon className={`w-[18px] h-[18px] ${isActive ? 'text-[#1D4ED8]' : 'text-[#64748B]'}`} strokeWidth={isActive ? 2.1 : 1.8} />
                  <span>{label}</span>
                </div>
                {showUnread && unreadCount > 0 && (
                  <span
                    className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                      isActive ? 'bg-[#1D4ED8] text-white' : 'bg-[#FEF3C7] text-[#B45309]'
                    }`}
                    aria-label={`${unreadCount} unread notifications`}
                  >
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </span>
                )}
                {showVerification && verificationBadge && (
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${verificationBadge.cls}`}
                    aria-label={verificationBadge.label}
                  >
                    {verificationBadge.text}
                  </span>
                )}
              </>
            )}
          </NavLink>
        ))}
      </div>

      {/* User profile & Logout Footer */}
      <div className="p-3 border-t border-[#E5E9F2] bg-[#F8F9FC]/70">
        <div className="flex items-center justify-between p-2.5 rounded-[16px] bg-white border border-[#E2E8F0] shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
          <Link to="/student/profile" onClick={onCloseMobile} className="flex items-center gap-2.5 min-w-0 flex-1">
            <div className="relative w-9 h-9 rounded-full bg-[#1D4ED8] text-white flex items-center justify-center font-bold text-sm shrink-0">
              {initial}
              <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-[#047857] border-2 border-white rounded-full"></span>
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold text-[#0F172A] truncate">{displayName}</p>
              <p className="text-[11px] text-[#64748B] truncate">{currentUser?.email || 'Student Portal'}</p>
            </div>
          </Link>
          <button
            onClick={handleLogout}
            title="Logout"
            aria-label="Logout"
            className="p-2 text-[#64748B] hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors shrink-0 cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <>
      <aside className="hidden md:block w-64 h-screen sticky top-0 shrink-0 z-30">
        {sidebarContent}
      </aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          <div
            className="fixed inset-0 bg-[#0F172A]/50 backdrop-blur-xs transition-opacity"
            onClick={onCloseMobile}
          />
          <div className="relative w-72 max-w-[85vw] h-full shadow-2xl z-10">
            {sidebarContent}
          </div>
        </div>
      )}
    </>
  );
}
