import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Search, Filter, Briefcase, ChevronLeft, ChevronRight, MapPin, Clock } from 'lucide-react';

const ALL_JOBS = [
  { id: 1, company: 'Google', role: 'Software Engineer', cgpa: '8.5+', deadline: 'Nov 15, 2026', location: 'Bangalore', type: 'Full Time', ctc: '24 LPA', status: 'Open' },
  { id: 2, company: 'Amazon', role: 'Data Analyst', cgpa: '7.5+', deadline: 'Nov 01, 2026', location: 'Hyderabad', type: 'Full Time', ctc: '18 LPA', status: 'Open' },
  { id: 3, company: 'Microsoft', role: 'Cloud Engineer', cgpa: '8.0+', deadline: 'Oct 30, 2026', location: 'Hyderabad', type: 'Full Time', ctc: '22 LPA', status: 'Open' },
  { id: 4, company: 'Zoho', role: 'UI/UX Designer', cgpa: '7.0+', deadline: 'Oct 28, 2026', location: 'Chennai', type: 'Full Time', ctc: '10 LPA', status: 'Closing Soon' },
  { id: 5, company: 'TCS', role: 'Systems Engineer', cgpa: '6.5+', deadline: 'Nov 10, 2026', location: 'Pan India', type: 'Full Time', ctc: '7 LPA', status: 'Open' },
  { id: 6, company: 'Infosys', role: 'Associate Developer', cgpa: '6.5+', deadline: 'Nov 05, 2026', location: 'Pan India', type: 'Full Time', ctc: '6.5 LPA', status: 'Open' },
  { id: 7, company: 'Wipro', role: 'Project Engineer', cgpa: '6.0+', deadline: 'Nov 20, 2026', location: 'Pan India', type: 'Full Time', ctc: '6 LPA', status: 'Open' },
  { id: 8, company: 'Freshworks', role: 'Frontend Developer', cgpa: '7.5+', deadline: 'Nov 08, 2026', location: 'Chennai', type: 'Full Time', ctc: '12 LPA', status: 'Open' },
];

const PAGE_SIZE = 5;

export default function JobsPage({ isAdmin = false }) {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [showAddModal, setShowAddModal] = useState(false);
  const [jobs, setJobs] = useState(ALL_JOBS);
  const [newJob, setNewJob] = useState({ company: '', role: '', cgpa: '', deadline: '', location: '', ctc: '' });

  const filtered = jobs.filter((j) => {
    const q = search.toLowerCase();
    return j.company.toLowerCase().includes(q) || j.role.toLowerCase().includes(q);
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const handleAdd = (e) => {
    e.preventDefault();
    setJobs((prev) => [...prev, { ...newJob, id: Date.now(), status: 'Open', type: 'Full Time' }]);
    setNewJob({ company: '', role: '', cgpa: '', deadline: '', location: '', ctc: '' });
    setShowAddModal(false);
  };

  const content = (
    <main className="flex-1 px-4 md:px-8 py-6 overflow-x-hidden">
      <div className="flex items-center justify-between mb-1">
        <h2 className="text-2xl font-bold">Job Drives</h2>
        {isAdmin && (
          <button
            onClick={() => setShowAddModal(true)}
            className="bg-blue-600 text-white text-sm px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-1.5"
          >
            <Briefcase className="w-4 h-4" /> Post New Job
          </button>
        )}
      </div>
      <p className="text-gray-500 text-sm mb-6">Browse active recruitment drives.</p>

      {/* Search & Filter */}
      <div className="bg-white rounded-xl p-4 shadow-sm mb-5 flex flex-col sm:flex-row gap-3 items-start sm:items-center">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search company or role..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <Filter className="w-4 h-4" />
          <span>{filtered.length} drives found</span>
        </div>
      </div>

      {/* Job Cards */}
      <div className="space-y-4">
        {paginated.length === 0 ? (
          <div className="bg-white rounded-xl p-10 text-center text-gray-400 shadow-sm">
            <Briefcase className="w-10 h-10 mx-auto mb-3 text-gray-300" />
            No jobs found.
          </div>
        ) : (
          paginated.map((job) => (
            <div key={job.id} className="bg-white rounded-xl p-5 shadow-sm flex flex-col md:flex-row md:items-center gap-4">
              <div className="w-14 h-14 bg-blue-100 rounded-xl flex items-center justify-center font-bold text-blue-700 text-sm shrink-0">
                {job.company.slice(0, 2).toUpperCase()}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-start gap-2">
                  <h3 className="font-bold text-base">{job.company}</h3>
                  <span className={`text-xs px-2.5 py-0.5 rounded-full ${job.status === 'Closing Soon' ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'}`}>
                    {job.status}
                  </span>
                </div>
                <p className="text-gray-600 text-sm">{job.role}</p>
                <div className="flex flex-wrap gap-3 mt-2 text-xs text-gray-400">
                  <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {job.location}</span>
                  <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> Deadline: {job.deadline}</span>
                  <span>CGPA: {job.cgpa}</span>
                  <span>CTC: {job.ctc}</span>
                </div>
              </div>

              <div className="shrink-0">
                {isAdmin ? (
                  <button className="bg-gray-100 text-gray-600 text-sm px-4 py-2 rounded-lg hover:bg-gray-200 transition-colors">
                    Manage
                  </button>
                ) : (
                  <Link
                    to={`/student/jobs/${job.id}`}
                    className="bg-blue-600 text-white text-sm px-5 py-2 rounded-lg hover:bg-blue-700 transition-colors block text-center"
                  >
                    Apply Now
                  </Link>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Pagination */}
      <div className="flex justify-between items-center mt-5 text-sm text-gray-500">
        <p>
          Showing {Math.min((page - 1) * PAGE_SIZE + 1, filtered.length)}–
          {Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length}
        </p>
        <div className="flex items-center gap-1">
          <button
            disabled={page === 1}
            onClick={() => setPage((p) => p - 1)}
            className="p-1.5 rounded hover:bg-gray-200 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => i + 1).map((p) => (
            <button
              key={p}
              onClick={() => setPage(p)}
              className={`w-8 h-8 rounded text-sm ${page === p ? 'bg-blue-600 text-white' : 'hover:bg-gray-200'}`}
            >
              {p}
            </button>
          ))}
          <button
            disabled={page === totalPages}
            onClick={() => setPage((p) => p + 1)}
            className="p-1.5 rounded hover:bg-gray-200 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Add Job Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-lg shadow-xl">
            <h3 className="font-bold text-lg mb-4">Post New Job Drive</h3>
            <form onSubmit={handleAdd} className="space-y-3">
              {[
                { field: 'company', label: 'Company Name' },
                { field: 'role', label: 'Job Role' },
                { field: 'cgpa', label: 'Min CGPA (e.g. 7.5+)' },
                { field: 'deadline', label: 'Deadline (e.g. Nov 30, 2026)' },
                { field: 'location', label: 'Location' },
                { field: 'ctc', label: 'CTC (e.g. 12 LPA)' },
              ].map(({ field, label }) => (
                <div key={field}>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
                  <input
                    type="text"
                    required
                    value={newJob[field]}
                    onChange={(e) => setNewJob((j) => ({ ...j, [field]: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              ))}
              <div className="flex gap-3 pt-2">
                <button type="submit" className="flex-1 bg-blue-600 text-white py-2.5 rounded-lg hover:bg-blue-700 font-medium text-sm">
                  Post Job
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 border border-gray-300 py-2.5 rounded-lg text-sm hover:bg-gray-50"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );

  return content;
}
