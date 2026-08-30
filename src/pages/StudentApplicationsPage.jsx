import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  FileText,
  ChevronRight,
  CheckCircle,
  Clock,
  XCircle,
  Search,
  Calendar,
  MapPin,
  Briefcase,
} from 'lucide-react';

const ALL_APPLICATIONS = [
  {
    id: 1,
    jobId: 2,
    company: 'Amazon',
    logo: 'AM',
    logoColor: 'bg-orange-100 text-orange-700',
    role: 'Data Analyst',
    location: 'Hyderabad',
    ctc: '18 LPA',
    appliedOn: 'Oct 10, 2026',
    status: 'Shortlisted',
    stage: 'Technical Interview',
    timeline: [
      { label: 'Application Submitted', date: 'Oct 10', done: true },
      { label: 'Resume Screened', date: 'Oct 13', done: true },
      { label: 'Shortlisted', date: 'Oct 16', done: true },
      { label: 'Technical Interview', date: 'Oct 28', done: false, upcoming: true },
      { label: 'HR Round', date: 'TBD', done: false },
      { label: 'Offer', date: 'TBD', done: false },
    ],
  },
  {
    id: 2,
    jobId: 5,
    company: 'TCS',
    logo: 'TC',
    logoColor: 'bg-purple-100 text-purple-700',
    role: 'Systems Engineer',
    location: 'Pan India',
    ctc: '7 LPA',
    appliedOn: 'Oct 05, 2026',
    status: 'Under Review',
    stage: 'Resume Screening',
    timeline: [
      { label: 'Application Submitted', date: 'Oct 05', done: true },
      { label: 'Resume Screened', date: 'Oct 09', done: true },
      { label: 'Online Test', date: 'TBD', done: false, upcoming: true },
      { label: 'Technical Interview', date: 'TBD', done: false },
      { label: 'HR Round', date: 'TBD', done: false },
      { label: 'Offer', date: 'TBD', done: false },
    ],
  },
  {
    id: 3,
    jobId: 7,
    company: 'Wipro',
    logo: 'WP',
    logoColor: 'bg-teal-100 text-teal-700',
    role: 'Project Engineer',
    location: 'Pan India',
    ctc: '6 LPA',
    appliedOn: 'Sep 28, 2026',
    status: 'Rejected',
    stage: 'Online Test',
    timeline: [
      { label: 'Application Submitted', date: 'Sep 28', done: true },
      { label: 'Resume Screened', date: 'Oct 01', done: true },
      { label: 'Online Test', date: 'Oct 06', done: true, failed: true },
      { label: 'Technical Interview', date: '—', done: false, skipped: true },
      { label: 'Offer', date: '—', done: false, skipped: true },
    ],
  },
  {
    id: 4,
    jobId: 8,
    company: 'Freshworks',
    logo: 'FW',
    logoColor: 'bg-green-100 text-green-700',
    role: 'Frontend Developer',
    location: 'Chennai',
    ctc: '12 LPA',
    appliedOn: 'Oct 18, 2026',
    status: 'Applied',
    stage: 'Application Submitted',
    timeline: [
      { label: 'Application Submitted', date: 'Oct 18', done: true },
      { label: 'Resume Screening', date: 'TBD', done: false, upcoming: true },
      { label: 'Online Test', date: 'TBD', done: false },
      { label: 'Technical Interview', date: 'TBD', done: false },
      { label: 'Offer', date: 'TBD', done: false },
    ],
  },
];

const STATUS_CONFIG = {
  Shortlisted: { bg: 'bg-green-100', text: 'text-green-700', icon: CheckCircle },
  'Under Review': { bg: 'bg-yellow-100', text: 'text-yellow-700', icon: Clock },
  Applied: { bg: 'bg-blue-100', text: 'text-blue-700', icon: FileText },
  Rejected: { bg: 'bg-red-100', text: 'text-red-600', icon: XCircle },
  Selected: { bg: 'bg-emerald-100', text: 'text-emerald-700', icon: CheckCircle },
};

const FILTERS = ['All', 'Applied', 'Under Review', 'Shortlisted', 'Rejected'];

export default function StudentApplicationsPage() {
  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState('All');
  const [expanded, setExpanded] = useState(null);

  const filtered = ALL_APPLICATIONS.filter((a) => {
    const matchSearch =
      a.company.toLowerCase().includes(search.toLowerCase()) ||
      a.role.toLowerCase().includes(search.toLowerCase());
    const matchFilter = activeFilter === 'All' || a.status === activeFilter;
    return matchSearch && matchFilter;
  });

  const stats = {
    total: ALL_APPLICATIONS.length,
    shortlisted: ALL_APPLICATIONS.filter((a) => a.status === 'Shortlisted').length,
    underReview: ALL_APPLICATIONS.filter((a) => a.status === 'Under Review').length,
    rejected: ALL_APPLICATIONS.filter((a) => a.status === 'Rejected').length,
  };

  return (
    <main className="flex-1 px-4 md:px-8 py-6 overflow-x-hidden">
      <h2 className="text-2xl font-bold text-gray-900 mb-1">My Applications</h2>
          <p className="text-gray-500 text-sm mb-6">
            Track the status of all your job applications.
          </p>

          {/* Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            {[
              { label: 'Total Applied', value: stats.total, color: 'text-gray-900', bg: 'bg-white' },
              { label: 'Shortlisted', value: stats.shortlisted, color: 'text-green-600', bg: 'bg-white' },
              { label: 'Under Review', value: stats.underReview, color: 'text-yellow-600', bg: 'bg-white' },
              { label: 'Rejected', value: stats.rejected, color: 'text-red-500', bg: 'bg-white' },
            ].map(({ label, value, color, bg }) => (
              <div key={label} className={`${bg} rounded-xl p-4 shadow-sm`}>
                <p className="text-xs text-gray-500 mb-1">{label}</p>
                <p className={`text-3xl font-bold ${color}`}>{value}</p>
              </div>
            ))}
          </div>

          {/* Filters & Search */}
          <div className="bg-white rounded-xl p-4 shadow-sm mb-5 flex flex-col sm:flex-row gap-3 items-start sm:items-center flex-wrap">
            <div className="flex gap-1.5 flex-wrap flex-1">
              {FILTERS.map((f) => (
                <button
                  key={f}
                  onClick={() => setActiveFilter(f)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    activeFilter === f
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search applications..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="border border-gray-300 pl-9 pr-4 py-1.5 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-44"
              />
            </div>
          </div>

          {/* Application list */}
          {filtered.length === 0 ? (
            <div className="bg-white rounded-xl p-12 text-center text-gray-400 shadow-sm">
              <FileText className="w-10 h-10 mx-auto mb-3 text-gray-300" />
              <p className="font-medium">No applications found.</p>
              <Link to="/student/jobs" className="text-sm text-blue-600 hover:underline mt-2 block">
                Browse job drives →
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {filtered.map((app) => {
                const { bg, text, icon: StatusIcon } = STATUS_CONFIG[app.status] || STATUS_CONFIG['Applied'];
                const isExpanded = expanded === app.id;

                return (
                  <div key={app.id} className="bg-white rounded-2xl shadow-sm overflow-hidden">
                    {/* Application row */}
                    <div className="p-5 flex flex-col sm:flex-row sm:items-center gap-4">
                      <div className={`w-12 h-12 rounded-xl ${app.logoColor} flex items-center justify-center font-bold text-sm shrink-0`}>
                        {app.logo}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2 flex-wrap">
                          <div>
                            <p className="font-semibold text-gray-900">{app.company}</p>
                            <p className="text-gray-500 text-sm">{app.role}</p>
                          </div>
                          <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${bg} ${text} flex items-center gap-1`}>
                            <StatusIcon className="w-3 h-3" />
                            {app.status}
                          </span>
                        </div>

                        <div className="flex flex-wrap gap-3 mt-2 text-xs text-gray-400">
                          <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{app.location}</span>
                          <span className="flex items-center gap-1"><Briefcase className="w-3 h-3" />{app.ctc}</span>
                          <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />Applied {app.appliedOn}</span>
                          <span className="font-medium text-blue-600">Current: {app.stage}</span>
                        </div>
                      </div>

                      <button
                        onClick={() => setExpanded(isExpanded ? null : app.id)}
                        className="flex items-center gap-1 text-blue-600 text-sm hover:underline shrink-0"
                      >
                        {isExpanded ? 'Hide' : 'Timeline'}
                        <ChevronRight className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                      </button>
                    </div>

                    {/* Timeline (collapsible) */}
                    {isExpanded && (
                      <div className="border-t border-gray-100 px-5 py-4 bg-gray-50">
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Application Timeline</p>
                        <div className="flex flex-col gap-0">
                          {app.timeline.map((step, i) => {
                            const isLast = i === app.timeline.length - 1;
                            let dotColor = 'bg-gray-300';
                            if (step.done && !step.failed && !step.skipped) dotColor = 'bg-green-500';
                            if (step.failed) dotColor = 'bg-red-400';
                            if (step.upcoming) dotColor = 'bg-blue-500 ring-2 ring-blue-200';

                            return (
                              <div key={step.label} className="flex items-start gap-3">
                                <div className="flex flex-col items-center">
                                  <div className={`w-3 h-3 rounded-full mt-1 shrink-0 ${dotColor}`} />
                                  {!isLast && <div className="w-0.5 h-6 bg-gray-200" />}
                                </div>
                                <div className="pb-4">
                                  <p className={`text-sm font-medium ${step.skipped ? 'text-gray-300' : step.failed ? 'text-red-500' : step.upcoming ? 'text-blue-600' : step.done ? 'text-gray-800' : 'text-gray-400'}`}>
                                    {step.label}
                                    {step.upcoming && <span className="ml-2 text-xs bg-blue-100 text-blue-600 px-1.5 py-0.5 rounded">Upcoming</span>}
                                    {step.failed && <span className="ml-2 text-xs bg-red-100 text-red-500 px-1.5 py-0.5 rounded">Not Cleared</span>}
                                  </p>
                                  <p className="text-xs text-gray-400 mt-0.5">{step.date}</p>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </main>
  );
}
