import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Landmark, Menu, X, ArrowRight, ShieldCheck, GraduationCap } from 'lucide-react';

export default function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false);
  const close = () => setMenuOpen(false);

  return (
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-gray-200/80 px-4 md:px-10 py-3.5 flex items-center justify-between shadow-xs transition-all">
      {/* College Logo */}
      <Link to="/" className="flex items-center gap-3 group">
        <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-md shadow-blue-200 group-hover:scale-105 transition-transform">
          <Landmark className="w-5 h-5" />
        </div>
        <div>
          <h1 className="font-bold text-base text-gray-900 leading-tight">GCE Srirangam</h1>
          <p className="text-[11px] text-gray-500 font-medium">Placement & Training Cell</p>
        </div>
      </Link>

      {/* Public Navigation */}
      <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-gray-600">
        <a href="#vision" className="hover:text-blue-600 transition-colors">
          Vision & Mission
        </a>
        <a href="#services" className="hover:text-blue-600 transition-colors">
          Services
        </a>
        <a href="#stats" className="hover:text-blue-600 transition-colors">
          Placements
        </a>
        <Link
          to="/login"
          className="inline-flex items-center gap-2 bg-blue-600 text-white px-5 py-2.5 rounded-xl font-semibold hover:bg-blue-700 shadow-sm shadow-blue-200 transition-all hover:scale-[1.02] active:scale-[0.98]"
        >
          Portal Login <ArrowRight className="w-4 h-4" />
        </Link>
      </nav>

      {/* Mobile menu toggle */}
      <button
        className="md:hidden p-2 rounded-xl text-gray-600 hover:bg-gray-100 transition-colors"
        onClick={() => setMenuOpen(!menuOpen)}
        aria-label="Toggle navigation menu"
      >
        {menuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
      </button>

      {/* Mobile Dropdown */}
      {menuOpen && (
        <div className="absolute top-full left-0 right-0 bg-white border-b border-gray-200 shadow-xl py-5 px-6 flex flex-col gap-4 text-sm md:hidden z-40 animate-in fade-in slide-in-from-top-2 duration-150">
          <a
            href="#vision"
            onClick={close}
            className="text-gray-700 hover:text-blue-600 font-medium py-1"
          >
            Vision & Mission
          </a>
          <a
            href="#services"
            onClick={close}
            className="text-gray-700 hover:text-blue-600 font-medium py-1"
          >
            Services
          </a>
          <a
            href="#stats"
            onClick={close}
            className="text-gray-700 hover:text-blue-600 font-medium py-1"
          >
            Placements
          </a>
          <div className="pt-2 border-t border-gray-100 flex flex-col gap-2">
            <Link
              to="/student/login"
              onClick={close}
              className="flex items-center justify-center gap-2 bg-blue-50 text-blue-700 py-2.5 rounded-xl font-semibold hover:bg-blue-100 transition-colors"
            >
              <GraduationCap className="w-4 h-4" /> Student Login
            </Link>
            <Link
              to="/admin/login"
              onClick={close}
              className="flex items-center justify-center gap-2 bg-blue-600 text-white py-2.5 rounded-xl font-semibold hover:bg-blue-700 shadow-xs transition-colors"
            >
              <ShieldCheck className="w-4 h-4" /> Admin Login
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
