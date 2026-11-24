import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Menu, X, ArrowRight, GraduationCap } from 'lucide-react';
import BrandLogo from './BrandLogo';

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
  const close = () => setMenuOpen(false);

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
          <Link
            to="/student/login"
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-semibold text-blue-700 hover:bg-blue-50 transition-colors"
          >
            <GraduationCap className="w-4 h-4" /> Student login
          </Link>
          <Link
            to="/login"
            className="inline-flex items-center gap-2 bg-blue-700 text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-blue-800 shadow-sm transition-colors"
          >
            Portal login <ArrowRight className="w-4 h-4" />
          </Link>
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
          <div className="mt-3 pt-3 border-t border-gray-100 grid grid-cols-2 gap-2">
            <Link
              to="/student/login"
              onClick={close}
              className="flex items-center justify-center gap-2 bg-blue-50 text-blue-700 py-2.5 rounded-xl text-sm font-semibold hover:bg-blue-100"
            >
              <GraduationCap className="w-4 h-4" /> Student login
            </Link>
            <Link
              to="/login"
              onClick={close}
              className="flex items-center justify-center gap-2 bg-blue-700 text-white py-2.5 rounded-xl text-sm font-semibold hover:bg-blue-800"
            >
              Portal login <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
