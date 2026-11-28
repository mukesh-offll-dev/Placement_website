import { Link } from 'react-router-dom';
import { ArrowLeft, GraduationCap, UserCheck, ShieldCheck } from 'lucide-react';
import BrandLogo from './BrandLogo';

/** Every sign-in page, so the switcher can offer the ones the visitor is not on. */
const LOGIN_OPTIONS = {
  student: { to: '/student/login', label: 'Student', icon: GraduationCap },
  faculty: { to: '/faculty/login', label: 'Faculty advisor', icon: UserCheck },
  admin: { to: '/admin/login', label: 'Admin & placement officer', icon: ShieldCheck },
};

/**
 * Shared frame for the sign-in pages: the college header (logo back to the home page), the page
 * body, and a footer that switches to the other sign-in pages.
 *
 * @param {object} props
 * @param {'student'|'faculty'|'admin'|'institution'} props.current - the page being shown
 * @param {string} [props.audience] - "Students" or "Institution", shown under the college name
 * @param {boolean} [props.hideSwitcher] - leave out the "Sign in as" links (password recovery pages)
 */
export default function AuthShell({ current, audience, hideSwitcher = false, children }) {
  // The institution page links every login in its body, so it shows no switcher.
  const others = hideSwitcher || current === 'institution'
    ? []
    : Object.entries(LOGIN_OPTIONS).filter(([key]) => key !== current);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-3">
          <Link to="/" className="flex items-center gap-3 min-w-0" aria-label="GCE Srirangam placement cell home">
            <BrandLogo className="h-11 shrink-0" />
            <div className="min-w-0">
              <p className="font-bold text-[15px] text-gray-900 leading-tight truncate">GCE Srirangam</p>
              <p className="text-[11px] text-gray-500 truncate">
                Training &amp; Placement Cell{audience ? ` · ${audience}` : ''}
              </p>
            </div>
          </Link>
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-600 hover:text-blue-700 px-3 py-2 rounded-lg hover:bg-gray-100 transition-colors shrink-0"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Back to home</span>
            <span className="sm:hidden">Home</span>
          </Link>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center px-4 py-10">{children}</main>

      <footer className="pb-6 px-4">
        {others.length > 0 && (
          <>
            <p className="text-center text-xs font-semibold uppercase tracking-wider text-gray-400 mb-3">Not you? Sign in as</p>
            <nav aria-label="Other sign-in pages" className="flex flex-wrap justify-center gap-2 mb-5">
              {others.map(([key, { to, label, icon: Icon }]) => (
                <Link
                  key={key}
                  to={to}
                  className="inline-flex items-center gap-1.5 text-sm text-gray-600 bg-white border border-gray-200 px-3.5 py-2 rounded-lg hover:border-blue-300 hover:text-blue-700 transition-colors"
                >
                  <Icon className="w-4 h-4" /> {label}
                </Link>
              ))}
            </nav>
          </>
        )}
        <p className="border-t border-gray-200 pt-4 text-center text-xs text-gray-400">
          © {new Date().getFullYear()} GCE Srirangam Training &amp; Placement Cell
        </p>
      </footer>
    </div>
  );
}
