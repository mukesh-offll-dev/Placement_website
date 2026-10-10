import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  Search,
  Filter,
  Briefcase,
  ChevronLeft,
  ChevronRight,
  MapPin,
  Clock,
  Loader2,
  AlertCircle,
  RotateCw,
} from 'lucide-react';
import { jobService } from '../services/api';

const PAGE_SIZE = 5;

const formatDate = (dateStr) => {
  if (!dateStr) return 'No Deadline';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' });
  } catch {
    return dateStr;
  }
};

const isDeadlineClosingSoon = (dateStr) => {
  if (!dateStr) return false;
  try {
    const deadline = new Date(dateStr);
    const now = new Date();
    const diffDays = (deadline - now) / (1000 * 60 * 60 * 24);
    return diffDays >= 0 && diffDays <= 5;
  } catch {
    return false;
  }
};

const formatJobType = (type) => {
  if (!type) return 'Full Time';
  switch (type) {
    case 'FULL_TIME':
      return 'Full Time';
    case 'INTERNSHIP':
      return 'Internship';
    case 'PART_TIME':
      return 'Part Time';
    case 'CONTRACT':
      return 'Contract';
    default:
      return type;
  }
};

export default function JobsPage({ isAdmin = false }) {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [showAddModal, setShowAddModal] = useState(false);
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [newJob, setNewJob] = useState({ company: '', role: '', cgpa: '', deadline: '', location: '', ctc: '' });

  const fetchJobs = useCallback(async (signal) => {
    setLoading(true);
    setError(null);
    try {
      const fetcher = isAdmin ? jobService.getAdminJobs : jobService.getJobs;
      const responseData = await fetcher({ page: 0, size: 100 }, { signal });

      // Spring Data Page returns { content: [...] }; array returned directly is also handled safely
      const rawList = Array.isArray(responseData)
        ? responseData
        : Array.isArray(responseData?.content)
          ? responseData.content
          : [];

      const normalized = rawList.map((j) => {
        const companyName =
          j.company?.name ||
          j.company?.shortName ||
          (typeof j.company === 'string' ? j.company : 'Company');
        const companyShort = (
          j.company?.shortName ||
          (companyName && companyName.length >= 2 ? companyName.slice(0, 2) : 'JB')
        ).toUpperCase();
        const logoColor = j.company?.logoColor || 'bg-blue-100 text-blue-700';
        const role = j.jobRole || j.role || 'Job Opening';
        const location = j.location || 'Location Not Specified';
        const ctc = j.ctcText || (j.ctcValue ? `${j.ctcValue} LPA` : j.ctc || 'Not Disclosed');
        const cgpa = j.minCgpa != null ? `${j.minCgpa}+` : j.cgpa || 'Not Specified';
        const type = formatJobType(j.jobType || j.type);
        const deadline = j.applicationDeadline ? formatDate(j.applicationDeadline) : j.deadline || 'No Deadline';

        let status = j.status || 'Open';
        if (j.expired) {
          status = 'Expired';
        } else if (j.applicationDeadline && isDeadlineClosingSoon(j.applicationDeadline)) {
          status = 'Closing Soon';
        } else if (j.status === 'ACTIVE') {
          status = 'Open';
        }

        return {
          id: j.id,
          company: companyName,
          companyShort,
          logoColor,
          role,
          location,
          ctc,
          cgpa,
          type,
          deadline,
          status,
          raw: j,
        };
      });

      setJobs(normalized);
    } catch (err) {
      if (err?.code === 'ERR_CANCELED' || err?.name === 'CanceledError') {
        return;
      }
      setError(err?.message || 'Failed to load job drives. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [isAdmin]);

  useEffect(() => {
    const controller = new AbortController();
    fetchJobs(controller.signal);
    return () => controller.abort();
  }, [fetchJobs]);

  const filtered = jobs.filter((j) => {
    const q = search.toLowerCase();
    return (
      j.company.toLowerCase().includes(q) ||
      j.role.toLowerCase().includes(q) ||
      j.location.toLowerCase().includes(q)
    );
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const handleAdd = (e) => {
    e.preventDefault();
    const created = {
      ...newJob,
      id: Date.now(),
      companyShort: (newJob.company.slice(0, 2) || 'JB').toUpperCase(),
      logoColor: 'bg-blue-100 text-blue-700',
      status: 'Open',
      type: 'Full Time',
    };
    setJobs((prev) => [created, ...prev]);
    setNewJob({ company: '', role: '', cgpa: '', deadline: '', location: '', ctc: '' });
    setShowAddModal(false);
  };

  return (
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
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <Filter className="w-4 h-4" />
          <span>{filtered.length} drives found</span>
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="bg-white rounded-xl p-12 text-center shadow-sm flex flex-col items-center justify-center gap-3">
          <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
          <p className="text-gray-500 text-sm">Loading job drives...</p>
        </div>
      )}

      {/* Error State */}
      {!loading && error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center shadow-sm">
          <AlertCircle className="w-8 h-8 text-red-500 mx-auto mb-2" />
          <p className="text-red-700 font-medium text-sm mb-1">{error}</p>
          <p className="text-red-500 text-xs mb-4">Could not connect to the backend server. Please check your connection and retry.</p>
          <button
            onClick={() => fetchJobs()}
            className="inline-flex items-center gap-1.5 bg-red-600 hover:bg-red-700 text-white text-xs px-4 py-2 rounded-lg font-medium transition-colors cursor-pointer"
          >
            <RotateCw className="w-3.5 h-3.5" /> Retry
          </button>
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && filtered.length === 0 && (
        <div className="bg-white rounded-xl p-10 text-center text-gray-400 shadow-sm">
          <Briefcase className="w-10 h-10 mx-auto mb-3 text-gray-300" />
          {search.trim() ? 'No jobs match your search criteria.' : 'No active job drives found.'}
        </div>
      )}

      {/* Job Cards */}
      {!loading && !error && filtered.length > 0 && (
        <div className="space-y-4">
          {paginated.map((job) => (
            <div key={job.id} className="bg-white rounded-xl p-5 shadow-sm flex flex-col md:flex-row md:items-center gap-4">
              <div
                className={`w-14 h-14 ${job.logoColor} rounded-xl flex items-center justify-center font-bold text-sm shrink-0`}
              >
                {job.companyShort}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-start gap-2">
                  <h3 className="font-bold text-base">{job.company}</h3>
                  <span
                    className={`text-xs px-2.5 py-0.5 rounded-full ${
                      job.status === 'Closing Soon' || job.status === 'Expired'
                        ? 'bg-red-100 text-red-600'
                        : 'bg-green-100 text-green-600'
                    }`}
                  >
                    {job.status}
                  </span>
                </div>
                <p className="text-gray-600 text-sm">{job.role}</p>
                <div className="flex flex-wrap gap-3 mt-2 text-xs text-gray-400">
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3 h-3" /> {job.location}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" /> Deadline: {job.deadline}
                  </span>
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
          ))}
        </div>
      )}

      {/* Pagination */}
      {!loading && !error && filtered.length > 0 && (
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
      )}

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
}
