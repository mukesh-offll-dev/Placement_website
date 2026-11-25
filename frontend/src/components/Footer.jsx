import { Link } from 'react-router-dom';
import { MapPin, Phone, Mail, ExternalLink } from 'lucide-react';
import BrandLogo from './BrandLogo';
import { COLLEGE, CONTACT, OFFICIAL_LINKS, OFFICIAL_SITE } from '../data/collegeInfo';

export default function Footer() {
  return (
    <footer id="contact" className="bg-slate-950 text-slate-300 pt-14 pb-6 px-4 md:px-8 scroll-mt-20">
      <div className="max-w-7xl mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10 mb-10">
        <div className="lg:col-span-1">
          <div className="flex items-center gap-3 mb-4">
            <span className="bg-white rounded-xl p-1.5">
              <BrandLogo className="h-10" />
            </span>
            <div>
              <p className="font-bold text-white leading-tight">{COLLEGE.shortName}</p>
              <p className="text-xs text-slate-400">Training & Placement Cell</p>
            </div>
          </div>
          <p className="text-sm leading-relaxed text-slate-400">
            {COLLEGE.name}. Established {COLLEGE.established}, affiliated to {COLLEGE.affiliation}.
          </p>
          <p className="text-xs mt-3 text-amber-300/90 font-medium tracking-wide">{COLLEGE.motto}</p>
        </div>

        <div>
          <h2 className="font-semibold text-white mb-4 text-sm uppercase tracking-wider">Contact</h2>
          <ul className="space-y-3 text-sm">
            <li className="flex gap-2.5">
              <MapPin className="w-4 h-4 mt-0.5 shrink-0 text-slate-500" />
              <span>
                {CONTACT.address.map((line) => (
                  <span key={line} className="block">{line}</span>
                ))}
              </span>
            </li>
            {CONTACT.phones.map((p) => (
              <li key={p.label} className="flex gap-2.5">
                <Phone className="w-4 h-4 mt-0.5 shrink-0 text-slate-500" />
                <a href={p.href} className="hover:text-white transition-colors">
                  {p.label}: {p.value}
                </a>
              </li>
            ))}
            <li className="flex gap-2.5">
              <Mail className="w-4 h-4 mt-0.5 shrink-0 text-slate-500" />
              <a href={`mailto:${CONTACT.email}`} className="hover:text-white transition-colors break-all">
                {CONTACT.email}
              </a>
            </li>
          </ul>
        </div>

        <div>
          <h2 className="font-semibold text-white mb-4 text-sm uppercase tracking-wider">Official links</h2>
          <ul className="space-y-2 text-sm">
            {OFFICIAL_LINKS.map((l) => (
              <li key={l.url}>
                <a href={l.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 hover:text-white transition-colors">
                  {l.label} <ExternalLink className="w-3 h-3 opacity-60" />
                </a>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h2 className="font-semibold text-white mb-4 text-sm uppercase tracking-wider">Sign in</h2>
          <ul className="space-y-2 text-sm">
            <li><Link to="/student/login" className="hover:text-white transition-colors">Student login</Link></li>
          </ul>
          <p className="mt-4 mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">Institution login</p>
          <ul className="space-y-2 text-sm">
            <li><Link to="/faculty/login" className="hover:text-white transition-colors">Faculty advisor</Link></li>
            <li><Link to="/admin/login" className="hover:text-white transition-colors">Admin &amp; placement officer</Link></li>
          </ul>
          <a
            href={CONTACT.directionsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-white bg-white/10 hover:bg-white/15 px-4 py-2 rounded-lg transition-colors"
          >
            <MapPin className="w-4 h-4" /> How to reach the campus
          </a>
        </div>
      </div>

      <div className="max-w-7xl mx-auto border-t border-slate-800 pt-6 flex flex-col md:flex-row justify-between items-center gap-3 text-xs text-slate-500 text-center">
        <p>© {new Date().getFullYear()} {COLLEGE.name} · Training & Placement Cell</p>
        <p>
          College information and photographs from{' '}
          <a href={OFFICIAL_SITE} target="_blank" rel="noopener noreferrer" className="underline hover:text-slate-300">
            gces.edu.in
          </a>
        </p>
      </div>
    </footer>
  );
}
