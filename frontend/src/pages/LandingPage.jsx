import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  GraduationCap,
  Building2,
  Eye,
  Target,
  CheckCircle2,
  BookOpen,
  MessagesSquare,
  Mic,
  Briefcase,
  FileText,
  ExternalLink,
  Mail,
  CalendarDays,
  Users,
  Quote,
  Award,
} from 'lucide-react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import {
  COLLEGE,
  STATS,
  VISION,
  MISSION,
  DEPARTMENTS,
  SCIENCE_AND_HUMANITIES,
  PLACEMENT_CELL_ROLE,
  PLACEMENT_SERVICES,
  TRAINING_EVENTS,
  PLACEMENT_TEAM,
  PLACEMENT_RECORDS,
  RECRUITERS,
  CAMPUS_PHOTOS,
  PRINCIPAL,
  OFFICIAL_SITE,
} from '../data/collegeInfo';

const HERO_PHOTOS = CAMPUS_PHOTOS.slice(0, 4);
const SERVICE_ICONS = { training: BookOpen, softskills: MessagesSquare, mock: Mic, drives: Briefcase };

const prefersReducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

/** Fades its children in the first time they scroll into view. */
function Reveal({ as: Tag = 'div', className = '', delay = 0, children, ...rest }) {
  const ref = useRef(null);
  useEffect(() => {
    const node = ref.current;
    if (!node) return undefined;
    if (prefersReducedMotion() || typeof IntersectionObserver === 'undefined') {
      node.classList.add('is-visible');
      return undefined;
    }
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          node.classList.add('is-visible');
          observer.disconnect();
        }
      },
      { threshold: 0.12 }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);
  return (
    <Tag ref={ref} className={`landing-reveal ${className}`} style={delay ? { transitionDelay: `${delay}ms` } : undefined} {...rest}>
      {children}
    </Tag>
  );
}

function SectionHeading({ eyebrow, title, intro, center = false, light = false }) {
  return (
    <div className={`mb-10 ${center ? 'text-center mx-auto' : ''} max-w-3xl`}>
      <p className={`text-xs font-bold uppercase tracking-[0.18em] mb-2 ${light ? 'text-amber-300' : 'text-blue-700'}`}>{eyebrow}</p>
      <h2 className={`text-3xl md:text-4xl font-bold tracking-tight ${light ? 'text-white' : 'text-slate-900'}`}>{title}</h2>
      {intro && <p className={`mt-3 text-base leading-relaxed ${light ? 'text-blue-100' : 'text-slate-600'}`}>{intro}</p>}
    </div>
  );
}

function Hero() {
  const [slide, setSlide] = useState(0);

  useEffect(() => {
    if (prefersReducedMotion()) return undefined;
    const timer = setInterval(() => setSlide((s) => (s + 1) % HERO_PHOTOS.length), 6000);
    return () => clearInterval(timer);
  }, []);

  return (
    <section className="relative isolate overflow-hidden bg-slate-950" aria-label="Introduction">
      {HERO_PHOTOS.map((photo, index) => (
        <img
          key={photo.src}
          src={photo.src}
          alt=""
          aria-hidden="true"
          width="1170"
          height="466"
          loading={index === 0 ? 'eager' : 'lazy'}
          fetchPriority={index === 0 ? 'high' : 'low'}
          className={`absolute inset-0 -z-20 h-full w-full object-cover transition-opacity duration-[1500ms] ${
            index === slide ? 'opacity-100 landing-kenburns' : 'opacity-0'
          }`}
        />
      ))}
      <div className="absolute inset-0 -z-10 bg-gradient-to-r from-slate-950/95 via-blue-950/80 to-blue-900/40" />

      <div className="max-w-7xl mx-auto px-4 md:px-8 pt-16 pb-28 md:pt-24 md:pb-36">
        <div className="max-w-2xl">
          <p className="inline-flex items-center gap-2 text-[11px] sm:text-xs font-semibold uppercase tracking-[0.18em] text-amber-300 bg-white/10 ring-1 ring-white/15 px-3 py-1.5 rounded-full">
            <Award className="w-3.5 h-3.5" /> Est. {COLLEGE.established} · Affiliated to {COLLEGE.affiliation}
          </p>
          <h1 className="mt-6 text-4xl sm:text-5xl md:text-6xl font-bold text-white tracking-tight leading-[1.08]">
            Training &amp; Placement Cell
          </h1>
          <p className="mt-3 text-lg md:text-xl font-semibold text-blue-100">{COLLEGE.name}</p>
          <p className="mt-5 text-base md:text-lg text-blue-100/85 leading-relaxed">{PLACEMENT_CELL_ROLE}</p>
          <div className="mt-8 flex flex-col sm:flex-row gap-3">
            <Link
              to="/login"
              className="inline-flex items-center justify-center gap-2 bg-amber-400 text-slate-950 font-semibold px-6 py-3 rounded-xl hover:bg-amber-300 transition-colors shadow-lg shadow-black/20"
            >
              Login to the portal <ArrowRight className="w-4 h-4" />
            </Link>
            <a
              href="#placements"
              className="inline-flex items-center justify-center gap-2 bg-white/10 text-white font-semibold px-6 py-3 rounded-xl ring-1 ring-white/25 hover:bg-white/20 transition-colors"
            >
              Placement records
            </a>
          </div>
        </div>

        <div className="mt-10 flex gap-1.5" aria-hidden="true">
          {HERO_PHOTOS.map((photo, index) => (
            <span key={photo.src} className={`h-1 rounded-full transition-all duration-500 ${index === slide ? 'w-8 bg-amber-300' : 'w-3 bg-white/35'}`} />
          ))}
        </div>
      </div>
    </section>
  );
}

function StatsBand() {
  return (
    <div className="relative z-10 -mt-16 md:-mt-20 px-4 md:px-8">
      <Reveal className="max-w-6xl mx-auto bg-white rounded-2xl shadow-xl shadow-slate-900/10 ring-1 ring-slate-100 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 divide-slate-100">
        {STATS.map(({ value, label }, i) => (
          <div
            key={label}
            className={`px-4 py-5 md:py-7 text-center ${i === STATS.length - 1 && STATS.length % 2 ? 'col-span-2 sm:col-span-1' : ''}`}
          >
            <p className="text-3xl md:text-4xl font-bold text-blue-800 tracking-tight">{value}</p>
            <p className="mt-1 text-xs md:text-sm font-medium text-slate-500">{label}</p>
          </div>
        ))}
      </Reveal>
      <p className="max-w-6xl mx-auto mt-2 text-[11px] text-slate-400 text-right">Figures as published on gces.edu.in</p>
    </div>
  );
}

function About() {
  return (
    <section id="about" className="scroll-mt-20 py-20 px-4 md:px-8">
      <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-12 items-center">
        <Reveal>
          <SectionHeading eyebrow="About the college" title={`Welcome to ${COLLEGE.shortName}`} />
          <div className="space-y-4 text-slate-600 leading-relaxed">
            {COLLEGE.about.map((para) => (
              <p key={para.slice(0, 24)}>{para}</p>
            ))}
          </div>
          <ul className="mt-6 space-y-2.5">
            {COLLEGE.highlights.map((h) => (
              <li key={h.label} className="flex gap-2.5 text-sm text-slate-700">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                <a href={h.source} target="_blank" rel="noopener noreferrer" className="hover:text-blue-700 hover:underline">
                  {h.label}
                </a>
              </li>
            ))}
          </ul>
        </Reveal>

        <Reveal delay={120} className="relative">
          <div className="absolute -inset-3 -z-10 rounded-[2rem] bg-gradient-to-br from-blue-100 to-amber-100 rotate-2" />
          <img
            src={CAMPUS_PHOTOS[2].src}
            alt={CAMPUS_PHOTOS[2].alt}
            width="1170"
            height="466"
            loading="lazy"
            className="w-full aspect-[4/3] object-cover rounded-3xl shadow-xl"
          />
          <div className="absolute -bottom-6 left-4 right-4 sm:left-auto sm:right-6 sm:w-72 bg-white rounded-2xl shadow-lg ring-1 ring-slate-100 p-4 flex gap-3 items-center">
            <span className="bg-blue-700 text-white rounded-xl p-2.5"><GraduationCap className="w-5 h-5" /></span>
            <div>
              <p className="text-sm font-bold text-slate-900">Research Centre</p>
              <p className="text-xs text-slate-500">Recognised by Anna University for all departments</p>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

function VisionMission() {
  return (
    <section className="bg-slate-50 py-20 px-4 md:px-8" aria-labelledby="vision-title">
      <div className="max-w-7xl mx-auto grid md:grid-cols-5 gap-6">
        <Reveal className="md:col-span-2 bg-gradient-to-br from-blue-800 to-blue-950 text-white rounded-3xl p-8 shadow-lg">
          <span className="inline-flex bg-white/10 rounded-xl p-3"><Eye className="w-6 h-6 text-amber-300" /></span>
          <h2 id="vision-title" className="mt-5 text-2xl font-bold">Vision</h2>
          <p className="mt-3 text-blue-100 leading-relaxed">{VISION}</p>
        </Reveal>
        <Reveal delay={100} className="md:col-span-3 bg-white rounded-3xl p-8 shadow-sm ring-1 ring-slate-100">
          <span className="inline-flex bg-blue-50 rounded-xl p-3"><Target className="w-6 h-6 text-blue-700" /></span>
          <h2 className="mt-5 text-2xl font-bold text-slate-900">Mission</h2>
          <ol className="mt-4 grid sm:grid-cols-2 gap-3">
            {MISSION.map((m, i) => (
              <li key={m} className="flex gap-3 text-sm text-slate-700 leading-relaxed">
                <span className="w-6 h-6 rounded-full bg-amber-100 text-amber-800 text-xs font-bold flex items-center justify-center shrink-0">{i + 1}</span>
                {m}
              </li>
            ))}
          </ol>
        </Reveal>
      </div>
    </section>
  );
}

function Departments() {
  const [active, setActive] = useState(DEPARTMENTS[0].code);
  const dept = DEPARTMENTS.find((d) => d.code === active) || DEPARTMENTS[0];

  return (
    <section id="departments" className="scroll-mt-20 py-20 px-4 md:px-8">
      <div className="max-w-7xl mx-auto">
        <Reveal>
          <SectionHeading
            eyebrow="Academics"
            title="Departments & programmes"
            intro="Six four-year B.E. programmes, each with an AICTE-approved intake of 60 students."
          />
        </Reveal>

        <Reveal className="grid lg:grid-cols-[280px_1fr] gap-6">
          <div role="tablist" aria-label="Departments" aria-orientation="vertical" className="flex lg:flex-col gap-2 overflow-x-auto pb-1 lg:pb-0">
            {DEPARTMENTS.map((d) => {
              const selected = d.code === active;
              return (
                <button
                  key={d.code}
                  type="button"
                  role="tab"
                  id={`dept-tab-${d.code}`}
                  aria-selected={selected}
                  aria-controls="dept-panel"
                  onClick={() => setActive(d.code)}
                  className={`shrink-0 text-left px-4 py-3 rounded-xl border transition-all ${
                    selected
                      ? 'bg-blue-700 border-blue-700 text-white shadow-md'
                      : 'bg-white border-slate-200 text-slate-700 hover:border-blue-300 hover:bg-blue-50/50'
                  }`}
                >
                  <span className={`block text-xs font-bold tracking-wider ${selected ? 'text-amber-300' : 'text-blue-700'}`}>{d.code}</span>
                  <span className="block text-sm font-semibold whitespace-nowrap lg:whitespace-normal">{d.name}</span>
                </button>
              );
            })}
          </div>

          <div id="dept-panel" role="tabpanel" aria-labelledby={`dept-tab-${dept.code}`} className="bg-white rounded-3xl ring-1 ring-slate-100 shadow-sm p-6 md:p-10 flex flex-col">
            <div className="flex items-start gap-4">
              <span className="bg-blue-50 text-blue-700 rounded-2xl p-3.5 shrink-0"><Building2 className="w-7 h-7" /></span>
              <div>
                <p className="text-xs font-bold tracking-wider text-blue-700">B.E. · {dept.code}</p>
                <h3 className="text-2xl md:text-3xl font-bold text-slate-900">{dept.name}</h3>
              </div>
            </div>
            <p className="mt-6 text-slate-600 leading-relaxed text-base md:text-lg">{dept.summary}</p>
            <dl className="mt-8 grid grid-cols-3 gap-3">
              {[
                ['Duration', '4 years'],
                ['Started', dept.started],
                ['Annual intake', dept.intake],
              ].map(([k, v]) => (
                <div key={k} className="bg-slate-50 rounded-2xl p-4">
                  <dt className="text-xs text-slate-500">{k}</dt>
                  <dd className="text-lg md:text-xl font-bold text-slate-900">{v}</dd>
                </div>
              ))}
            </dl>
            <a
              href={dept.url}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-8 self-start inline-flex items-center gap-1.5 text-sm font-semibold text-blue-700 hover:underline"
            >
              Department page on gces.edu.in <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        </Reveal>

        <Reveal className="mt-6 flex flex-wrap items-center gap-2 text-sm">
          <span className="font-semibold text-slate-700 mr-1">Science &amp; Humanities:</span>
          {SCIENCE_AND_HUMANITIES.map((s) => (
            <span key={s} className="px-3 py-1 rounded-full bg-slate-100 text-slate-700">{s}</span>
          ))}
        </Reveal>
      </div>
    </section>
  );
}

function PlacementCell() {
  return (
    <section id="placements" className="scroll-mt-20 bg-gradient-to-b from-blue-950 to-slate-950 py-20 px-4 md:px-8">
      <div className="max-w-7xl mx-auto">
        <Reveal>
          <SectionHeading light eyebrow="Training & Placement Cell" title="From classroom to career" intro={PLACEMENT_CELL_ROLE} />
        </Reveal>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
          {PLACEMENT_SERVICES.map(({ key, title, text }, i) => {
            const Icon = SERVICE_ICONS[key] || Briefcase;
            return (
              <Reveal key={key} delay={i * 80} className="bg-white/[0.06] ring-1 ring-white/10 rounded-2xl p-4 md:p-6 hover:bg-white/[0.1] transition-colors">
                <span className="inline-flex bg-amber-400/15 text-amber-300 rounded-xl p-2.5 md:p-3"><Icon className="w-5 h-5" /></span>
                <h3 className="mt-3 md:mt-4 text-sm md:text-base font-bold text-white">{title}</h3>
                <p className="mt-1.5 text-xs md:text-sm text-blue-100/80 leading-relaxed">{text}</p>
              </Reveal>
            );
          })}
        </div>

        <div className="mt-12 grid lg:grid-cols-5 gap-6">
          <Reveal className="lg:col-span-3 bg-white rounded-3xl p-6 md:p-8">
            <div className="flex items-center justify-between gap-3 flex-wrap mb-5">
              <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2"><FileText className="w-5 h-5 text-blue-700" /> Placed-student records</h3>
              <span className="text-xs text-slate-500">Official lists published on gces.edu.in</span>
            </div>
            <ul className="divide-y divide-slate-100">
              {PLACEMENT_RECORDS.map((r) => (
                <li key={r.year} className="py-4 first:pt-0 last:pb-0 flex flex-col sm:flex-row sm:items-start gap-3 sm:gap-6">
                  <span className="text-lg font-bold text-blue-800 w-24 shrink-0">{r.year}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-slate-500 mb-1.5">Companies in this list</p>
                    <div className="flex flex-wrap gap-1.5">
                      {r.companies.slice(0, 6).map((c) => (
                        <span key={c} className="text-xs px-2 py-0.5 rounded-md bg-slate-100 text-slate-700">{c}</span>
                      ))}
                      {r.companies.length > 6 && <span className="text-xs px-2 py-0.5 text-slate-500">+{r.companies.length - 6} more</span>}
                    </div>
                  </div>
                  <a
                    href={r.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="self-start inline-flex items-center gap-1.5 text-sm font-semibold text-blue-700 hover:bg-blue-50 px-3 py-1.5 rounded-lg shrink-0"
                  >
                    View list <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </li>
              ))}
            </ul>
          </Reveal>

          <Reveal delay={100} className="lg:col-span-2 bg-white/[0.06] ring-1 ring-white/10 rounded-3xl p-6 md:p-8 flex flex-col">
            <h3 className="text-xl font-bold text-white flex items-center gap-2"><CalendarDays className="w-5 h-5 text-amber-300" /> Recent training</h3>
            <ol className="mt-6 relative border-l border-white/15 ml-1.5 space-y-6">
              {TRAINING_EVENTS.map((e) => (
                <li key={e.title} className="pl-5 relative">
                  <span className="absolute -left-[5px] top-1 w-2.5 h-2.5 rounded-full bg-amber-300 ring-4 ring-blue-950" aria-hidden="true" />
                  <a href={e.url} target="_blank" rel="noopener noreferrer" className="group block">
                    <p className="text-xs font-semibold text-amber-300">{e.date}</p>
                    <p className="mt-0.5 text-sm text-blue-50 group-hover:text-white group-hover:underline leading-snug">{e.title}</p>
                  </a>
                </li>
              ))}
            </ol>
            <a
              href={OFFICIAL_SITE}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-auto pt-8 inline-flex items-center gap-1.5 text-sm font-semibold text-blue-200 hover:text-white"
            >
              Latest news on gces.edu.in <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </Reveal>
        </div>

        <Reveal className="mt-6 bg-white/[0.06] ring-1 ring-white/10 rounded-3xl p-6 md:p-8">
          <div className="flex items-center justify-between gap-3 flex-wrap mb-6">
            <h3 className="text-xl font-bold text-white flex items-center gap-2"><Users className="w-5 h-5 text-amber-300" /> Placement cell team</h3>
            <a href={PLACEMENT_TEAM.url} target="_blank" rel="noopener noreferrer" className="text-sm font-semibold text-blue-200 hover:text-white inline-flex items-center gap-1.5">
              Full list <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            {PLACEMENT_TEAM.officers.map((o) => (
              <div key={o.name} className="bg-white rounded-2xl p-5 flex items-center gap-4">
                <span className="w-12 h-12 rounded-full bg-blue-700 text-white font-bold flex items-center justify-center shrink-0">
                  {o.name.replace(/^Dr\.\s*/, '').replace(/[^A-Z]/g, '').slice(-2)}
                </span>
                <div className="min-w-0">
                  <p className="font-bold text-slate-900">{o.name}</p>
                  <p className="text-xs text-slate-500">{o.role} · {o.designation}</p>
                  <a href={`mailto:${o.email}`} className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-blue-700 hover:underline break-all">
                    <Mail className="w-3 h-3 shrink-0" /> {o.email}
                  </a>
                </div>
              </div>
            ))}
          </div>
          <p className="mt-6 text-xs font-semibold uppercase tracking-wider text-blue-200">Department coordinators</p>
          <ul className="mt-3 flex flex-wrap gap-2">
            {PLACEMENT_TEAM.coordinators.map((c) => (
              <li key={c.name} className="text-sm text-white bg-white/10 rounded-full px-3 py-1.5">
                {c.name} <span className="text-blue-200/80 text-xs">· {c.designation}</span>
              </li>
            ))}
          </ul>
        </Reveal>
      </div>
    </section>
  );
}

function Recruiters() {
  const loop = [...RECRUITERS, ...RECRUITERS];
  return (
    <section id="recruiters" className="scroll-mt-20 py-20 bg-white" aria-labelledby="recruiters-title">
      <div className="max-w-7xl mx-auto px-4 md:px-8">
        <Reveal>
          <div className="text-center mx-auto max-w-3xl mb-10">
            <p className="text-xs font-bold uppercase tracking-[0.18em] mb-2 text-blue-700">Recruiters</p>
            <h2 id="recruiters-title" className="text-3xl md:text-4xl font-bold tracking-tight text-slate-900">Companies that hired our students</h2>
            <p className="mt-3 text-slate-600">Named in the placed-student lists from 2021–22 to 2025–26.</p>
          </div>
        </Reveal>
      </div>
      <div className="landing-marquee-wrap relative overflow-hidden py-2 [mask-image:linear-gradient(to_right,transparent,black_8%,black_92%,transparent)]">
        <ul className="landing-marquee flex w-max gap-3" aria-hidden="true">
          {loop.map((name, i) => (
            <li key={`${name}-${i}`} className="px-5 py-3 rounded-xl bg-slate-50 ring-1 ring-slate-200 text-sm font-semibold text-slate-700 whitespace-nowrap">
              {name}
            </li>
          ))}
        </ul>
      </div>
      {/* Screen readers get the list once, without the scrolling duplicate. */}
      <ul className="sr-only">
        {RECRUITERS.map((name) => <li key={name}>{name}</li>)}
      </ul>
    </section>
  );
}

function Campus() {
  return (
    <section id="campus" className="scroll-mt-20 bg-slate-50 py-20 px-4 md:px-8">
      <div className="max-w-7xl mx-auto">
        <Reveal>
          <SectionHeading eyebrow="Campus" title="Life at GCE Srirangam" intro="Academic blocks, laboratories, library, separate hostels for men and women, and sports facilities." />
        </Reveal>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 md:auto-rows-[200px]">
          {CAMPUS_PHOTOS.map((photo, i) => (
            <Reveal
              key={photo.src}
              delay={i * 60}
              as="figure"
              // Desktop: one large tile, then rows of 1+1 / 2 / 2+2 so the 4-column grid has no gaps.
              // Mobile (2 columns): the first and last photos span the full width.
              className={`group relative overflow-hidden rounded-2xl bg-slate-200 aspect-[4/3] md:aspect-auto ${
                i === 0 ? 'col-span-2 md:row-span-2' : i >= 3 ? `md:col-span-2 ${i === CAMPUS_PHOTOS.length - 1 ? 'col-span-2' : ''}` : ''
              }`}
            >
              <img src={photo.src} alt={photo.alt} loading="lazy" className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105" />
              <figcaption className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-slate-950/80 to-transparent px-4 pb-3 pt-10 text-sm font-semibold text-white">
                {photo.caption}
              </figcaption>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

function PrincipalMessage() {
  return (
    <section className="py-20 px-4 md:px-8" aria-labelledby="principal-title">
      <Reveal className="max-w-5xl mx-auto bg-white rounded-3xl ring-1 ring-slate-100 shadow-sm overflow-hidden grid md:grid-cols-[260px_1fr]">
        <img src={PRINCIPAL.photo} alt={`${PRINCIPAL.name}, Principal`} width="349" height="360" loading="lazy" className="w-full h-64 md:h-full object-cover object-top" />
        <div className="p-6 md:p-10 flex flex-col justify-center">
          <Quote className="w-8 h-8 text-amber-400" />
          <blockquote className="mt-3 text-lg md:text-xl text-slate-800 leading-relaxed">“{PRINCIPAL.quote}”</blockquote>
          <p id="principal-title" className="mt-5 font-bold text-slate-900">{PRINCIPAL.name}, {PRINCIPAL.qualification}</p>
          <p className="text-sm text-slate-500">Principal, {COLLEGE.name}</p>
          <a href={PRINCIPAL.url} target="_blank" rel="noopener noreferrer" className="mt-4 self-start inline-flex items-center gap-1.5 text-sm font-semibold text-blue-700 hover:underline">
            Read the full message <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      </Reveal>
    </section>
  );
}

function CallToAction() {
  return (
    <section className="px-4 md:px-8 pb-20">
      <Reveal className="max-w-7xl mx-auto relative overflow-hidden rounded-3xl bg-blue-800 px-6 py-12 md:px-14 md:py-14 text-white">
        <div className="absolute -right-16 -top-16 w-64 h-64 rounded-full bg-amber-400/20 blur-2xl" aria-hidden="true" />
        <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="max-w-xl">
            <h2 className="text-2xl md:text-3xl font-bold">Ready for placement season?</h2>
            <p className="mt-2 text-blue-100">
              Sign in to browse job drives, apply to as many as you&apos;re eligible for, and follow every application stage by stage.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 shrink-0">
            <Link to="/student/login" className="inline-flex items-center justify-center gap-2 bg-white text-blue-800 font-semibold px-6 py-3 rounded-xl hover:bg-blue-50 transition-colors">
              <GraduationCap className="w-4 h-4" /> Student login
            </Link>
            <Link to="/login" className="inline-flex items-center justify-center gap-2 bg-amber-400 text-slate-950 font-semibold px-6 py-3 rounded-xl hover:bg-amber-300 transition-colors">
              Staff login <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </Reveal>
    </section>
  );
}

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white text-slate-900 overflow-x-hidden">
      <Navbar />
      <main>
        <Hero />
        <StatsBand />
        <About />
        <VisionMission />
        <Departments />
        <PlacementCell />
        <Recruiters />
        <Campus />
        <PrincipalMessage />
        <CallToAction />
      </main>
      <Footer />
    </div>
  );
}
