import { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Landmark,
  Home,
  ArrowLeft,
  Briefcase,
  GraduationCap,
  ShieldCheck,
  Search,
  Compass,
} from 'lucide-react';
import { isAuthenticated, getRole } from '../services/authService';

export default function NotFoundPage() {
  const navigate = useNavigate();
  const authed = isAuthenticated();
  const role = getRole();

  useEffect(() => {
    document.title = '404 - Page Not Found | GCES Placement Cell';
  }, []);

  // Determine dashboard link according to user role
  const dashboardLink =
    role === 'ADMIN' || role === 'PLACEMENT_OFFICER'
      ? '/admin/dashboard'
      : role === 'STUDENT'
      ? '/student/dashboard'
      : null;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-between text-gray-800 antialiased selection:bg-blue-100 selection:text-blue-900">
      {/* Top Navbar Header */}
      <header className="w-full bg-white/90 backdrop-blur-md border-b border-gray-200/80 px-4 md:px-10 py-3.5 sticky top-0 z-20">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-md shadow-blue-200 group-hover:scale-105 transition-transform">
              <Landmark className="w-5 h-5" />
            </div>
            <div>
              <h1 className="font-bold text-base text-gray-900 leading-tight">GCE Srirangam</h1>
              <p className="text-[11px] text-gray-500 font-medium">Placement & Training Cell</p>
            </div>
          </Link>

          <div className="flex items-center gap-2">
            <Link
              to="/"
              className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-gray-700 hover:text-blue-600 px-3 py-2 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <Home className="w-4 h-4" />
              <span>Home</span>
            </Link>
            {dashboardLink && (
              <Link
                to={dashboardLink}
                className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 px-3.5 py-2 rounded-xl shadow-xs transition-colors"
              >
                <span>Dashboard</span>
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* Main 404 Content */}
      <main className="flex-1 flex items-center justify-center px-4 py-12 md:py-16">
        <div className="max-w-2xl w-full text-center flex flex-col items-center">
          {/* Custom Modern 404 Illustration */}
          <div className="relative mb-6 group">
            {/* Ambient background glow */}
            <div
              className="absolute -inset-4 bg-gradient-to-r from-blue-400/20 via-indigo-400/20 to-purple-400/20 rounded-full blur-2xl opacity-75 group-hover:opacity-100 transition-opacity"
              aria-hidden="true"
            />

            <svg
              className="w-56 h-44 sm:w-72 sm:h-56 relative drop-shadow-sm select-none"
              viewBox="0 0 320 220"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              aria-hidden="true"
            >
              {/* Ground shadow */}
              <ellipse cx="160" cy="195" rx="100" ry="12" fill="#E2E8F0" />
              <ellipse cx="160" cy="195" rx="60" ry="6" fill="#CBD5E1" />

              {/* Number 4 - Left */}
              <g className="animate-pulse" style={{ animationDuration: '3s' }}>
                <rect x="35" y="45" width="22" height="90" rx="11" fill="url(#blueGrad)" />
                <rect x="35" y="105" width="80" height="22" rx="11" fill="url(#blueGrad)" />
                <rect x="85" y="60" width="22" height="110" rx="11" fill="url(#blueGrad)" />
              </g>

              {/* Center Magnifying Glass / Compass (Zero) */}
              <g transform="translate(115, 30)">
                {/* Outer Ring */}
                <circle
                  cx="45"
                  cy="65"
                  r="45"
                  stroke="url(#indigoGrad)"
                  strokeWidth="14"
                  fill="white"
                  className="filter drop-shadow"
                />
                <circle
                  cx="45"
                  cy="65"
                  r="30"
                  stroke="#E0E7FF"
                  strokeWidth="2"
                  strokeDasharray="4 4"
                  fill="#F8FAFC"
                />

                {/* Compass needle */}
                <path
                  d="M45 42 L52 65 L45 88 L38 65 Z"
                  fill="#3B82F6"
                  transform="rotate(35 45 65)"
                />
                <path
                  d="M45 42 L52 65 L45 65 Z"
                  fill="#EF4444"
                  transform="rotate(35 45 65)"
                />
                <circle cx="45" cy="65" r="4" fill="#1E293B" />

                {/* Handle */}
                <rect
                  x="72"
                  y="92"
                  width="14"
                  height="45"
                  rx="7"
                  transform="rotate(-40 72 92)"
                  fill="#64748B"
                />
                <rect
                  x="74"
                  y="94"
                  width="10"
                  height="30"
                  rx="5"
                  transform="rotate(-40 72 92)"
                  fill="#475569"
                />
              </g>

              {/* Number 4 - Right */}
              <g className="animate-pulse" style={{ animationDuration: '3.5s' }}>
                <rect x="215" y="45" width="22" height="90" rx="11" fill="url(#purpleGrad)" />
                <rect x="215" y="105" width="80" height="22" rx="11" fill="url(#purpleGrad)" />
                <rect x="265" y="60" width="22" height="110" rx="11" fill="url(#purpleGrad)" />
              </g>

              {/* Floating question marks & search dots */}
              <circle cx="30" cy="30" r="4" fill="#60A5FA" opacity="0.7" />
              <circle cx="290" cy="35" r="5" fill="#818CF8" opacity="0.6" />
              <circle cx="160" cy="18" r="3" fill="#A78BFA" opacity="0.8" />
              <path
                d="M28 22 C28 17, 34 17, 34 20 C34 23, 31 24, 31 26"
                stroke="#3B82F6"
                strokeWidth="2"
                strokeLinecap="round"
              />

              {/* Definitions */}
              <defs>
                <linearGradient id="blueGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#2563EB" />
                  <stop offset="100%" stopColor="#1D4ED8" />
                </linearGradient>
                <linearGradient id="indigoGrad" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="#4F46E5" />
                  <stop offset="100%" stopColor="#3B82F6" />
                </linearGradient>
                <linearGradient id="purpleGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#4F46E5" />
                  <stop offset="100%" stopColor="#6366F1" />
                </linearGradient>
              </defs>
            </svg>
          </div>

          {/* Badge */}
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-red-50 text-red-700 border border-red-200/60 mb-3 shadow-2xs">
            <Compass className="w-3.5 h-3.5" /> Error 404 • Invalid Route
          </span>

          {/* Main Titles */}
          <h2 className="text-3xl sm:text-4xl font-extrabold text-gray-900 tracking-tight mb-2">
            Page Not Found
          </h2>

          <p className="text-sm sm:text-base text-gray-500 max-w-lg mb-8 leading-relaxed">
            The link you clicked may be broken, or the page may have been moved, renamed,
            or is currently inaccessible. Let&apos;s get you back on track.
          </p>

          {/* Core Action Buttons */}
          <div className="flex flex-wrap items-center justify-center gap-3 mb-10 w-full max-w-md">
            {/* Primary Required: "Back to Home" */}
            <Link
              to="/"
              className="flex-1 min-w-[150px] inline-flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm px-6 py-3 rounded-xl shadow-md shadow-blue-200 transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              <Home className="w-4 h-4" />
              <span>Back to Home</span>
            </Link>

            {/* Contextual Dashboard if logged in */}
            {dashboardLink ? (
              <Link
                to={dashboardLink}
                className="flex-1 min-w-[150px] inline-flex items-center justify-center gap-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200/80 font-semibold text-sm px-6 py-3 rounded-xl transition-colors"
              >
                <GraduationCap className="w-4 h-4" />
                <span>My Dashboard</span>
              </Link>
            ) : (
              <button
                type="button"
                onClick={() => navigate(-1)}
                className="flex-1 min-w-[150px] inline-flex items-center justify-center gap-2 bg-white hover:bg-gray-100 text-gray-700 border border-gray-200 font-semibold text-sm px-6 py-3 rounded-xl shadow-xs transition-colors cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Go Back</span>
              </button>
            )}
          </div>

          {/* Quick Links Help Grid */}
          <div className="w-full bg-white rounded-2xl p-5 border border-gray-200/80 shadow-xs text-left">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
              Helpful Placement Portal Destinations
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <Link
                to="/student/jobs"
                className="group p-3 rounded-xl hover:bg-blue-50/70 border border-transparent hover:border-blue-100 transition-all flex items-start gap-3"
              >
                <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                  <Briefcase className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-gray-900 group-hover:text-blue-700">
                    Job Drives
                  </h4>
                  <p className="text-xs text-gray-500 mt-0.5">Explore active campus drives</p>
                </div>
              </Link>

              <Link
                to={authed ? '/student/profile' : '/student/login'}
                className="group p-3 rounded-xl hover:bg-purple-50/70 border border-transparent hover:border-purple-100 transition-all flex items-start gap-3"
              >
                <div className="w-8 h-8 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                  <GraduationCap className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-gray-900 group-hover:text-purple-700">
                    Student Portal
                  </h4>
                  <p className="text-xs text-gray-500 mt-0.5">Profile, resume, & applications</p>
                </div>
              </Link>

              <Link
                to="/admin/login"
                className="group p-3 rounded-xl hover:bg-emerald-50/70 border border-transparent hover:border-emerald-100 transition-all flex items-start gap-3"
              >
                <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-gray-900 group-hover:text-emerald-700">
                    Admin Portal
                  </h4>
                  <p className="text-xs text-gray-500 mt-0.5">Placement cell management</p>
                </div>
              </Link>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full bg-white border-t border-gray-200/80 py-4 px-6 text-center text-xs text-gray-400">
        <p>© {new Date().getFullYear()} Government College of Engineering, Srirangam. All rights reserved.</p>
      </footer>
    </div>
  );
}
