import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Menu, X, GraduationCap, Building2, ChevronDown, UserCheck, ShieldCheck, LayoutDashboard } from 'lucide-react';
import BrandLogo from './BrandLogo';
import { useAuth } from '../context/AuthContext';
import { homePathForRole } from '../utils/roles';

/** Faculty and placement-cell staff sign in under "Institution login". */
const INSTITUTION_LOGINS = [
  { to: '/faculty/login', label: 'Faculty advisor', shortLabel: 'Faculty', hint: 'Verify your department’s students', icon: UserCheck },
  { to: '/admin/login', label: 'Admin & placement officer', shortLabel: 'Admin', hint: 'Manage drives, students and placements', icon: ShieldCheck },
];

/** In-page sections of the public landing page. */
const SECTIONS = [
  { href: '#about', label: 'About' },
  { href: '#departments', label: 'Departments' },
  { href: '#placements', label: 'Placements' },
  { href: '#recruiters', label: 'Recruiters' },
  { href: '#campus', label: 'Campus' },
  { href: '#contact', label: 'Contact' },
];

export default function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [institutionOpen, setInstitutionOpen] = useState(false);
  const menuRef = useRef(null);
  const close = () => setMenuOpen(false);
  // Signed-in visitors get a way back to their own dashboard instead of the login buttons.
  const { isAuthenticated, role } = useAuth();
  const home = isAuthenticated ? homePathForRole(role) : null;
  const dashboardPath = home && home !== '/' ? home : null;

  // Close the institution menu on an outside click or Escape.
  useEffect(() => {
    if (!institutionOpen) return undefined;
    const onPointer = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) setInstitutionOpen(false);
    };
    const onKey = (event) => {
      if (event.key === 'Escape') setInstitutionOpen(false);
    };
    document.addEventListener('mousedown', onPointer);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onPointer);
      document.removeEventListener('keydown', onKey);
    };
  }, [institutionOpen]);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <header
      className={`sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b transition-shadow ${
        scrolled ? 'border-gray-200 shadow-sm' : 'border-transparent'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 md:px-8 py-3 flex items-center justify-between gap-4">
        <Link to="/" className="flex items-center gap-3 group min-w-0" onClick={close}>
          <BrandLogo className="h-11 shrink-0 group-hover:scale-105 transition-transform" />
          <div className="min-w-0">
            <p className="font-bold text-[15px] text-gray-900 leading-tight truncate">GCE Srirangam</p>
            <p className="text-[11px] text-gray-500 font-medium truncate">Training & Placement Cell</p>
          </div>
        </Link>

        <nav aria-label="Page sections" className="hidden lg:flex items-center gap-6 text-sm font-medium text-gray-600">
          {SECTIONS.map(({ href, label }) => (
            <a key={href} href={href} className="hover:text-blue-700 transition-colors">
              {label}
            </a>
          ))}
        </nav>

        <div className="hidden lg:flex items-center gap-2">
          {dashboardPath ? (
            <Link
              to={dashboardPath}
              className="inline-flex items-center gap-2 bg-blue-700 text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-blue-800 shadow-sm transition-colors"
            >
              <LayoutDashboard className="w-4 h-4" /> Go to dashboard
            </Link>
          ) : (
            <>
              <Link
                to="/student/login"
                className="inline-flex items-center gap-2 bg-blue-700 text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-blue-800 shadow-sm transition-colors"
              >
                <GraduationCap className="w-4 h-4" /> Student login
              </Link>
              <div className="relative" ref={menuRef}>
                <button
                  type="button"
                  onClick={() => setInstitutionOpen((open) => !open)}
                  aria-expanded={institutionOpen}
                  aria-haspopup="menu"
                  className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-semibold text-blue-700 border border-blue-200 hover:bg-blue-50 transition-colors"
                >
                  <Building2 className="w-4 h-4" /> Institution login
                  <ChevronDown className={`w-4 h-4 transition-transform ${institutionOpen ? 'rotate-180' : ''}`} />
                </button>
                {institutionOpen && (
                  <div role="menu" className="absolute right-0 mt-2 w-72 bg-white rounded-2xl shadow-xl ring-1 ring-gray-200 p-2 z-40">
                    {INSTITUTION_LOGINS.map(({ to, label, hint, icon: Icon }) => (
                      <Link
                        key={to}
                        to={to}
                        role="menuitem"
                        onClick={() => setInstitutionOpen(false)}
                        className="flex items-start gap-3 px-3 py-2.5 rounded-xl hover:bg-blue-50 transition-colors"
                      >
                        <span className="bg-blue-100 text-blue-700 rounded-lg p-2 shrink-0"><Icon className="w-4 h-4" /></span>
                        <span>
                          <span className="block text-sm font-semibold text-gray-900">{label}</span>
                          <span className="block text-xs text-gray-500">{hint}</span>
                        </span>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        <button
          type="button"
          className="lg:hidden p-2 rounded-xl text-gray-700 hover:bg-gray-100 transition-colors"
          onClick={() => setMenuOpen((open) => !open)}
          aria-label={menuOpen ? 'Close menu' : 'Open menu'}
          aria-expanded={menuOpen}
          aria-controls="landing-mobile-menu"
        >
          {menuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {menuOpen && (
        <div id="landing-mobile-menu" className="lg:hidden border-t border-gray-100 bg-white shadow-xl px-4 pb-5 pt-2">
          <nav aria-label="Page sections" className="grid grid-cols-2 gap-1 text-sm">
            {SECTIONS.map(({ href, label }) => (
              <a key={href} href={href} onClick={close} className="px-3 py-2.5 rounded-lg text-gray-700 font-medium hover:bg-gray-50">
                {label}
              </a>
            ))}
          </nav>
          <div className="mt-3 pt-3 border-t border-gray-100 flex flex-col gap-2">
            {dashboardPath ? (
              <Link
                to={dashboardPath}
                onClick={close}
                className="flex items-center justify-center gap-2 bg-blue-700 text-white py-3 rounded-xl text-sm font-semibold hover:bg-blue-800"
              >
                <LayoutDashboard className="w-4 h-4" /> Go to dashboard
              </Link>
            ) : (
              <>
                <Link
                  to="/student/login"
                  onClick={close}
                  className="flex items-center justify-center gap-2 bg-blue-700 text-white py-3 rounded-xl text-sm font-semibold hover:bg-blue-800"
                >
                  <GraduationCap className="w-4 h-4" /> Student login
                </Link>
                <p className="mt-2 px-1 text-xs font-semibold uppercase tracking-wider text-gray-400">Institution login</p>
                <div className="grid grid-cols-2 gap-2">
                  {INSTITUTION_LOGINS.map(({ to, shortLabel, icon: Icon }) => (
                    <Link
                      key={to}
                      to={to}
                      onClick={close}
                      className="flex items-center justify-center gap-2 bg-blue-50 text-blue-700 py-2.5 rounded-xl text-sm font-semibold hover:bg-blue-100"
                    >
                      <Icon className="w-4 h-4" /> {shortLabel}
                    </Link>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
