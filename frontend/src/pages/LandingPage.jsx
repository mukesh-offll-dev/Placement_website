import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import {
  FileText,
  FolderKanban,
  Users,
  Award,
  Globe,
  Target,
} from 'lucide-react';

const stats = [
  { label: 'Impression Rate', value: '98.4', unit: '%' },
  { label: 'Top Package', value: '85', unit: 'LPA' },
  { label: 'Students Placed', value: '500', unit: '+' },
];

const services = [
  {
    icon: FileText,
    title: 'Resume Building',
    desc: 'Professional portfolio design focused on algorithmic visibility and executive impact.',
  },
  {
    icon: FolderKanban,
    title: 'Student Projects',
    desc: 'Stimulated technical and behavioural evaluations using industry-standard rubrics.',
  },
  {
    icon: Users,
    title: 'Mentorship',
    desc: 'One-on-one sessions with industry veterans and esteemed college alumni.',
  },
  {
    icon: Award,
    title: 'Certification Programs',
    desc: 'Skill validation through global partners with tech and business titans.',
  },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white">
      <Navbar />

      {/* Hero */}
      <main className="flex flex-col items-center text-center px-6 pt-20 pb-10">
        <span className="bg-blue-100 text-blue-800 text-sm font-semibold px-5 py-1.5 rounded-full mb-6">
          Defining Professional Excellence
        </span>
        <h1 className="text-4xl md:text-6xl font-bold text-gray-900 max-w-2xl leading-tight mb-6">
          Welcome to the{' '}
          <span className="text-blue-700">Placement</span> Cell
        </h1>
        <p className="text-gray-500 max-w-xl text-base md:text-lg mb-10">
          Shaping careers and defining futures through academic excellence and strategic
          global partnerships with industry leaders.
        </p>
        <Link
          to="/login"
          className="bg-blue-700 text-white font-semibold px-8 py-3 rounded-xl hover:bg-blue-800 transition-colors shadow-md"
        >
          College Login
        </Link>

        {/* Stats */}
        <div className="flex flex-wrap justify-center gap-12 mt-20">
          {stats.map((s) => (
            <div key={s.label} className="text-center">
              <p className="text-gray-400 text-sm mb-1">{s.label}</p>
              <p className="text-3xl font-bold text-gray-900">
                {s.value}{' '}
                <span className="text-blue-700">{s.unit}</span>
              </p>
            </div>
          ))}
        </div>
      </main>

      {/* Vision & Mission */}
      <section id="vision" className="bg-gray-50 py-16 px-6 md:px-16">
        <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-12 items-center">
          <div>
            <p className="text-blue-700 font-semibold text-sm mb-2">Legacy of Excellence</p>
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6">
              Vision &amp; Strategic Mission
            </h2>
            <p className="text-gray-500 mb-8">
              We don&apos;t just facilitate jobs, we architect global careers. Our commitment to
              excellence drives every student toward a prestige-driven future.
            </p>

            <div className="space-y-4">
              <div className="flex gap-4 bg-white rounded-2xl p-4 shadow-sm">
                <div className="bg-blue-100 p-3 rounded-xl shrink-0">
                  <Globe className="w-5 h-5 text-blue-700" />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 mb-1">Global Vision</h3>
                  <p className="text-gray-500 text-sm">
                    To be a world class centre of excellence for career development and strategic
                    recruitment on the international stage.
                  </p>
                </div>
              </div>

              <div id="mission" className="flex gap-4 bg-white rounded-2xl p-4 shadow-sm">
                <div className="bg-blue-100 p-3 rounded-xl shrink-0">
                  <Target className="w-5 h-5 text-blue-700" />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 mb-1">Our Mission</h3>
                  <p className="text-gray-500 text-sm">
                    Empowering students with industry-ready cognitive skills and connecting them
                    with world leaders across sectors.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-blue-100 rounded-2xl h-72 md:h-full min-h-64 flex items-center justify-center">
            <div className="text-center text-blue-400">
              <Globe className="w-16 h-16 mx-auto mb-3" />
              <p className="font-semibold">Global Connections</p>
            </div>
          </div>
        </div>
      </section>

      {/* Services */}
      <section className="py-16 px-6 md:px-16">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-3">Career Support &amp; Services</h2>
            <p className="text-gray-500">
              Comprehensive grooming and tactical preparation for the global job market.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {services.map(({ icon: ServiceIcon, title, desc }) => (
              <div key={title} className="text-left">
                <div className="bg-blue-100 w-fit p-3 rounded-xl mb-4">
                  <ServiceIcon className="w-6 h-6 text-blue-700" />
                </div>
                <h3 className="font-bold text-gray-900 mb-2">{title}</h3>
                <p className="text-gray-500 text-sm">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-blue-700 py-14 px-6 text-center text-white">
        <h2 className="text-3xl font-bold mb-4">Ready to Launch Your Career?</h2>
        <p className="text-blue-100 mb-8 max-w-md mx-auto">
          Log in to explore active job drives, track your applications, and connect with top
          recruiters.
        </p>
        <Link
          to="/login"
          className="bg-white text-blue-700 font-semibold px-8 py-3 rounded-xl hover:bg-blue-50 transition-colors shadow"
        >
          Get Started
        </Link>
      </section>

      <Footer />
    </div>
  );
}
