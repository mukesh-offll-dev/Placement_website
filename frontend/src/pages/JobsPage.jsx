import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Search,
  Filter,
  Briefcase,
  ChevronLeft,
  ChevronRight,
  MapPin,
  Clock,
  AlertCircle,
  RotateCw,
  Pencil,
  Trash2,
} from 'lucide-react';
import { jobService } from '../services/api';
import EmptyState from '../components/EmptyState';
import ConfirmDialog from '../components/ConfirmDialog';
import { JobCardSkeleton } from '../components/Skeleton';
import { toastError, toastSuccess } from '../utils/toast';

const HEX_COLOR = /^#(?:[\da-f]{3}|[\da-f]{4}|[\da-f]{6}|[\da-f]{8})$/i;

const JOB_STATUS_LABELS = {
  DRAFT: 'Draft',
  ACTIVE: 'Open',
  CLOSING_SOON: 'Closing Soon',
  CLOSED: 'Closed',
};

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

// Last list seen per portal. Revisiting the page shows it instantly while a fresh copy loads
// in the background, which hides most of the database latency.
const jobsCache = new Map();

export default function JobsPage({ isAdmin = false }) {
  const cacheKey = isAdmin ? 'admin' : 'student';
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [jobs, setJobs] = useState(() => jobsCache.get(cacheKey) || []);
  const [loading, setLoading] = useState(() => !jobsCache.has(cacheKey));
  const [error, setError] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const navigate = useNavigate();

  const fetchJobs = useCallback(async (signal) => {
    // Only show the skeleton when there is nothing to show yet.
    if (!jobsCache.has(cacheKey)) setLoading(true);
    setError(null);
    try {
      // Every page: the backend caps a page at 100 rows, and search/pagination here run on
      // the full list in the browser.
      const rawList = await jobService.getAllJobs({ admin: isAdmin }, { signal });

      const normalized = rawList.map((j) => {
        const companyName =
          j.company?.name ||
          j.company?.shortName ||
          (typeof j.company === 'string' ? j.company : 'Company');
        const companyShort = (
          j.company?.shortName ||
          (companyName && companyName.length >= 2 ? companyName.slice(0, 2) : 'JB')
        ).toUpperCase();
        // CompanyResponse.logoColor is a hex colour; anything else falls back to the default badge.
        const logoHex = HEX_COLOR.test(j.company?.logoColor || '') ? j.company.logoColor : null;
        const role = j.jobRole || j.role || 'Job Opening';
        const location = j.location || 'Location Not Specified';
        const ctc = j.ctcText || (j.ctcValue ? `${j.ctcValue} LPA` : j.ctc || 'Not Disclosed');
        const cgpa = j.minCgpa != null ? `${j.minCgpa}+` : j.cgpa || 'Not Specified';
        const type = formatJobType(j.jobType || j.type);
        const deadline = j.applicationDeadline ? formatDate(j.applicationDeadline) : j.deadline || 'No Deadline';

        let status = JOB_STATUS_LABELS[j.status] || j.status || 'Open';
        if (j.expired) {
          status = 'Expired';
        } else if (
          (j.status === 'ACTIVE' || j.status === 'CLOSING_SOON') &&
          j.applicationDeadline &&
          isDeadlineClosingSoon(j.applicationDeadline)
        ) {
          status = 'Closing Soon';
        }

        return {
          id: j.id,
          company: companyName,
          companyShort,
          logoHex,
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

      jobsCache.set(cacheKey, normalized);
      setJobs(normalized);
    } catch (err) {
      if (err?.code === 'ERR_CANCELED' || err?.name === 'CanceledError') {
        // A newer request has taken over (unmount or StrictMode re-run); it owns the UI state.
        return;
      }
      // Keep a cached list on screen if the refresh fails; only show the error when empty.
      if (!jobsCache.has(cacheKey)) {
        setError(err?.message || 'Failed to load job drives. Please try again.');
      }
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, [isAdmin, cacheKey]);

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
  const currentPage = Math.min(page, totalPages);
  const paginated = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  // A window of up to five page buttons around the current page.
  const firstPageButton = Math.max(1, Math.min(currentPage - 2, totalPages - 4));
  const pageButtons = Array.from(
    { length: Math.min(totalPages, 5) },
    (_, i) => firstPageButton + i
  );

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await jobService.deleteJob(deleteTarget.id);
      toastSuccess(`${deleteTarget.role} at ${deleteTarget.company} deleted.`);
      setDeleteTarget(null);
      jobsCache.delete(cacheKey);
      setJobs((prev) => prev.filter((j) => j.id !== deleteTarget.id));
      await fetchJobs();
    } catch (err) {
      toastError(err, 'Could not delete this job drive.');
    } finally {
      setDeleting(false);
    }
  };


  return (
    <main className="flex-1 px-4 md:px-8 py-6 overflow-x-hidden">
      <div className="flex items-center justify-between mb-1">
        <h2 className="text-2xl font-bold">Job Drives</h2>
        {isAdmin && (
          // The old modal only added a row to local state; the real form posts to
          // /admin/jobs and validates against the backend contract.
          <Link
            to="/admin/jobs/new"
            className="bg-blue-600 text-white text-sm px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-1.5"
          >
            <Briefcase className="w-4 h-4" /> Post New Job
          </Link>
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

      {/* Loading Skeleton State */}
      {loading && <JobCardSkeleton count={PAGE_SIZE} />}

      {/* Error State */}
      {!loading && error && (
        <EmptyState
          type="error"
          title="Failed to load job drives"
          description={error}
          action={{
            label: 'Try Again',
            onClick: () => fetchJobs(),
            icon: RotateCw,
          }}
        />
      )}

      {/* Empty State / Search Not Found */}
      {!loading && !error && filtered.length === 0 && (
        search.trim() ? (
          <EmptyState
            type="search"
            title="No matching job drives found"
            description={`We couldn't find any job drives matching "${search}". Try adjusting your keywords or clearing the search.`}
            action={{
              label: 'Clear Search',
              onClick: () => {
                setSearch('');
                setPage(1);
              },
              icon: RotateCw,
            }}
          />
        ) : (
          <EmptyState
            type="empty"
            icon={Briefcase}
            title="No job drives available yet"
            description={
              isAdmin
                ? 'No recruitment drives have been created yet. Post a new job opportunity to get started.'
                : 'There are currently no active campus recruitment drives open. Please check back later.'
            }
            action={
              isAdmin
                ? {
                    label: 'Post New Job',
                    to: '/admin/jobs/new',
                    icon: Briefcase,
                  }
                : {
                    label: 'Refresh Drives',
                    onClick: () => fetchJobs(),
                    icon: RotateCw,
                  }
            }
          />
        )
      )}

      {/* Job Cards */}
      {!loading && !error && filtered.length > 0 && (
        <div className="space-y-4">
          {paginated.map((job) => (
            <div key={job.id} className="bg-white rounded-xl p-5 shadow-sm flex flex-col md:flex-row md:items-center gap-4">
              <div
                className={`w-14 h-14 ${job.logoHex ? 'text-white' : 'bg-blue-100 text-blue-700'} rounded-xl flex items-center justify-center font-bold text-sm shrink-0`}
                style={job.logoHex ? { backgroundColor: job.logoHex } : undefined}
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
                        : job.status === 'Draft' || job.status === 'Closed'
                          ? 'bg-gray-100 text-gray-600'
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
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => navigate(`/admin/jobs/${job.id}/edit`)}
                      className="bg-gray-100 text-gray-700 text-sm px-4 py-2 rounded-lg hover:bg-gray-200 transition-colors inline-flex items-center gap-1.5"
                    >
                      <Pencil className="w-4 h-4" /> Manage
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeleteTarget(job)}
                      className="text-red-600 text-sm px-3 py-2 rounded-lg hover:bg-red-50 transition-colors inline-flex items-center gap-1.5"
                      aria-label={`Delete ${job.role} at ${job.company}`}
                    >
                      <Trash2 className="w-4 h-4" /> Delete
                    </button>
                  </div>
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
            Showing {Math.min((currentPage - 1) * PAGE_SIZE + 1, filtered.length)}–
            {Math.min(currentPage * PAGE_SIZE, filtered.length)} of {filtered.length}
          </p>
          <div className="flex items-center gap-1">
            <button
              disabled={currentPage === 1}
              onClick={() => setPage(currentPage - 1)}
              className="p-1.5 rounded hover:bg-gray-200 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            {pageButtons.map((p) => (
              <button
                key={p}
                onClick={() => setPage(p)}
                className={`w-8 h-8 rounded text-sm ${currentPage === p ? 'bg-blue-600 text-white' : 'hover:bg-gray-200'}`}
              >
                {p}
              </button>
            ))}
            <button
              disabled={currentPage === totalPages}
              onClick={() => setPage(currentPage + 1)}
              className="p-1.5 rounded hover:bg-gray-200 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Delete job drive?"
        message={
          deleteTarget ? (
            <>
              <strong>{deleteTarget.role}</strong> at <strong>{deleteTarget.company}</strong> will be
              removed from the portal and students will no longer see it.
            </>
          ) : null
        }
        confirmLabel="Delete"
        busy={deleting}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </main>
  );
}
