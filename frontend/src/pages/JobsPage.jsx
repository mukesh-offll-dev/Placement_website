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
import studentService from '../services/api/studentService';
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

// Filter state
  const [filterCompany, setFilterCompany] = useState('');


  // Load student's applications to know which jobs are applied
  useEffect(() => {
    if (!isAdmin) {
      (async () => {
        try {
          const apps = await studentService.getMyApplications();
          const ids = new Set(apps.map((a) => a.jobId || a.job?.id));
          setAppliedJobIds(ids);
        } catch (e) {
          console.error('Failed to load applications', e);
        }
      })();
    }
  }, [isAdmin]);

  // Filtering logic
  const filtered = jobs.filter((job) => {
    if (filterCompany && !job.company.toLowerCase().includes(filterCompany.toLowerCase())) return false;
    if (filterRole && !job.role.toLowerCase().includes(filterRole.toLowerCase())) return false;
    if (filterLocation && !job.location.toLowerCase().includes(filterLocation.toLowerCase())) return false;
    if (filterType && job.type !== filterType) return false;
    // Salary parsing – assume ctc format like "10 LPA" or numeric string
    if (salaryMin) {
      const num = parseFloat(job.ctc);
      if (isNaN(num) || num < parseFloat(salaryMin)) return false;
    }
    if (salaryMax) {
      const num = parseFloat(job.ctc);
      if (isNaN(num) || num > parseFloat(salaryMax)) return false;
    }
    if (cgpaMin) {
      const cg = parseFloat(job.cgpa);
      if (isNaN(cg) || cg < parseFloat(cgpaMin)) return false;
    }
    if (applicationStatusFilter !== 'all') {
      const isApplied = appliedJobIds.has(job.id);
      if (applicationStatusFilter === 'applied' && !isApplied) return false;
      if (applicationStatusFilter === 'not_applied' && isApplied) return false;
    }
    return true;
  });

  // UI for filter panel (basic)
  const renderFilterPanel = () => (
    <div className="bg-[#F9FAFB] p-4 rounded-md mb-4 border border-[#E5E7EB]">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <input
          type="text"
          placeholder="Company"
          value={filterCompany}
          onChange={(e) => setFilterCompany(e.target.value)}
          className="border rounded px-2 py-1"
        />
        <input
          type="text"
          placeholder="Role"
          value={filterRole}
          onChange={(e) => setFilterRole(e.target.value)}
          className="border rounded px-2 py-1"
        />
        <input
          type="text"
          placeholder="Location"
          value={filterLocation}
          onChange={(e) => setFilterLocation(e.target.value)}
          className="border rounded px-2 py-1"
        />
        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          className="border rounded px-2 py-1"
        >
          <option value="">All Types</option>
          <option value="FULL_TIME">Full Time</option>
          <option value="INTERNSHIP">Internship</option>
          <option value="PART_TIME">Part Time</option>
          <option value="CONTRACT">Contract</option>
        </select>
        <input
          type="number"
          placeholder="Salary Min (LPA)"
          value={salaryMin}
          onChange={(e) => setSalaryMin(e.target.value)}
          className="border rounded px-2 py-1"
        />
        <input
          type="number"
          placeholder="Salary Max (LPA)"
          value={salaryMax}
          onChange={(e) => setSalaryMax(e.target.value)}
          className="border rounded px-2 py-1"
        />
        <input
          type="number"
          step="0.01"
          placeholder="CGPA Min"
          value={cgpaMin}
          onChange={(e) => setCgpaMin(e.target.value)}
          className="border rounded px-2 py-1"
        />
        <select
          value={applicationStatusFilter}
          onChange={(e) => setApplicationStatusFilter(e.target.value)}
          className="border rounded px-2 py-1"
        >
          <option value="all">All Applications</option>
          <option value="applied">Applied</option>
          <option value="not_applied">Not Applied</option>
        </select>
      </div>
      <div className="flex space-x-2 mt-3">
        <button
          onClick={() => {
            // Apply – already reactive via state, just force re‑render
            setPage(1);
          }}
          className="bg-blue-600 text-white px-3 py-1 rounded"
        >Apply Filters</button>
        <button
          onClick={() => {
            setFilterCompany('');
            setFilterRole('');
            setFilterLocation('');
            setFilterType('');
            setSalaryMin('');
            setSalaryMax('');
            setCgpaMin('');
            setApplicationStatusFilter('all');
            setPage(1);
          }}
          className="bg-gray-300 px-3 py-1 rounded"
        >Clear</button>
      </div>
    </div>
  );

  // Replace original jobs rendering with filtered slice
  const paginated = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  // Update job count display to use filtered.length

// in the background, which hides most of the database latency.
const jobsCache = new Map();

export default function JobsPage({ isAdmin = false }) {
  const cacheKey = isAdmin ? 'admin' : 'student';
  const [search, setSearch] = useState('');
  const [mobileFilter, setMobileFilter] = useState('all');
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
    const matchesSearch =
      j.company.toLowerCase().includes(q) ||
      j.role.toLowerCase().includes(q) ||
      j.location.toLowerCase().includes(q);
    if (!matchesSearch || isAdmin) return matchesSearch;
    if (mobileFilter === 'open') return j.status === 'Open' || j.status === 'Closing Soon';
    if (mobileFilter === 'closing') return j.status === 'Closing Soon';
    if (mobileFilter === 'internship') return j.type === 'Internship';
    return true;
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
    <main className="flex-1 px-4 md:px-8 py-4 md:py-6 max-w-6xl w-full mx-auto overflow-x-hidden">
      <div className="flex items-center justify-between gap-3 mb-1">
        <h2 className="text-xl md:text-2xl font-extrabold text-[#0F172A] tracking-tight">Job Drives</h2>
        {isAdmin && (
          // The old modal only added a row to local state; the real form posts to
          // /admin/jobs and validates against the backend contract.
          <Link
            to="/admin/jobs/new"
            className="bg-[#1D4ED8] text-white text-sm font-semibold px-4 py-2.5 rounded-[14px] hover:bg-[#1E3A8A] transition-colors flex items-center gap-1.5"
          >
            <Briefcase className="w-4 h-4" /> Post New Job
          </Link>
        )}
      </div>
      <p className="text-[#475569] text-sm mb-5">Browse active campus recruitment drives.</p>

      {/* Search & Filter */}
      <div className="bg-white rounded-[20px] p-3.5 shadow-[0_1px_2px_rgba(15,23,42,0.05)] mb-5 flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#64748B]" />
          <input
            type="text"
            placeholder="Search company, role, or location..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="w-full h-[46px] pl-10 pr-4 border-[1.5px] border-[#E2E8F0] rounded-[14px] text-[15px] text-[#0F172A] placeholder:text-[#94A3B8] focus:outline-none focus:border-[#1D4ED8] focus:bg-[#F8FAFF] transition-all"
          />
        </div>
        <div className="flex items-center gap-2 text-xs font-semibold text-[#475569] bg-[#F4F6FB] px-3.5 py-2.5 rounded-[12px] shrink-0">
          <Filter className="w-3.5 h-3.5 text-[#1D4ED8]" />
          <span>{filtered.length} drives found</span>
        </div>
      </div>

      {/* Status chips (students): one search box above serves every screen size. */}
      {!isAdmin && (
        <div className="-mt-2 mb-4">
          <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1 -mx-1 px-1" role="group" aria-label="Filter job drives">
            {[
              ['all', 'All'],
              ['open', 'Open'],
              ['closing', 'Closing soon'],
              ['internship', 'Internships'],
            ].map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => {
                  setMobileFilter(value);
                  setPage(1);
                }}
                aria-pressed={mobileFilter === value}
                className={`shrink-0 h-9 rounded-full px-3.5 text-[13px] font-semibold transition-colors ${
                  mobileFilter === value
                    ? 'bg-[#1D4ED8] text-white'
                    : 'bg-white text-[#334155] border border-[#DDE3EE] hover:border-[#1D4ED8]'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      )}

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
        search.trim() || (!isAdmin && mobileFilter !== 'all') ? (
          <EmptyState
            type="search"
            title="No matching job drives found"
            description={
              search.trim()
                ? `We couldn't find any job drives matching "${search}". Try adjusting your keywords or clearing the search.`
                : 'No drives match this filter. Choose another filter to see more opportunities.'
            }
            action={{
              label: search.trim() ? 'Clear Search' : 'Clear Filter',
              onClick: () => {
                setSearch('');
                setMobileFilter('all');
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
        <div className="space-y-3.5">
          {paginated.map((job, idx) => {
            const pastelMonograms = [
              'bg-[#E0F2F1] text-[#0F766E]',
              'bg-[#E0EAFF] text-[#1D4ED8]',
              'bg-[#FFF1E0] text-[#C2410C]',
              'bg-[#EEF2FF] text-[#1E3A8A]',
            ];
            const monogramCls = pastelMonograms[idx % pastelMonograms.length];
            return (
              <div
                key={job.id}
                className="bg-white rounded-[22px] p-4 sm:p-5 shadow-[0_1px_2px_rgba(15,23,42,0.05)] hover:shadow-md transition-all flex flex-col md:flex-row md:items-center gap-4"
              >
                <div className="flex items-start gap-3.5 flex-1 min-w-0">
                  <div
                    className={`w-12 h-12 ${job.logoHex ? 'text-white' : monogramCls} rounded-[14px] flex items-center justify-center font-extrabold text-sm shrink-0`}
                    style={job.logoHex ? { backgroundColor: job.logoHex } : undefined}
                  >
                    {job.companyShort}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <h3 className="font-bold text-[16px] text-[#0F172A] truncate">{job.role}</h3>
                      <span
                        className={`text-[11px] px-2.5 py-1 rounded-full font-bold shrink-0 ${
                          job.status === 'Closing Soon' || job.status === 'Expired'
                            ? 'bg-[#FEF3C7] text-[#B45309]'
                            : job.status === 'Draft' || job.status === 'Closed'
                              ? 'bg-slate-100 text-[#475569]'
                              : 'bg-[#ECFDF5] text-[#047857]'
                        }`}
                      >
                        {job.status}
                      </span>
                    </div>
                    <p className="text-[#475569] text-[13px] font-medium mt-0.5 truncate">
                      {job.company} · {job.location}
                    </p>
                    <div className="flex flex-wrap items-center gap-2 mt-3">
                      <span className="text-[12px] font-semibold bg-[#EEF2FF] text-[#1E3A8A] px-2.5 py-1 rounded-[8px]">
                        {job.ctc}
                      </span>
                      <span className="text-[12px] font-semibold bg-[#ECFDF5] text-[#047857] px-2.5 py-1 rounded-[8px]">
                        CGPA {job.cgpa}
                      </span>
                      <span className="inline-flex items-center gap-1 text-[12px] font-medium text-[#64748B] bg-[#F4F6FB] px-2.5 py-1 rounded-[8px]">
                        <Clock className="w-3 h-3" /> {job.deadline}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="shrink-0 pt-1 md:pt-0">
                  {isAdmin ? (
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => navigate(`/admin/jobs/${job.id}/edit`)}
                        className="bg-[#F4F6FB] text-[#334155] text-sm font-semibold px-4 py-2.5 rounded-[12px] hover:bg-slate-200 transition-colors inline-flex items-center gap-1.5"
                      >
                        <Pencil className="w-4 h-4" /> Manage
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeleteTarget(job)}
                        className="text-red-600 text-sm font-semibold px-3 py-2.5 rounded-[12px] hover:bg-red-50 transition-colors inline-flex items-center gap-1.5"
                        aria-label={`Delete ${job.role} at ${job.company}`}
                      >
                        <Trash2 className="w-4 h-4" /> Delete
                      </button>
                    </div>
                  ) : (
                    <Link
                      to={`/student/jobs/${job.id}`}
                      className="h-[44px] bg-[#1D4ED8] text-white text-[14px] font-bold px-5 rounded-[14px] hover:bg-[#1E3A8A] active:scale-[0.98] transition-all flex items-center justify-center text-center"
                    >
                      Apply Now
                    </Link>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination */
      {!loading && !error && filtered.length > 0 && (
        <div className="flex justify-between items-center mt-5 text-sm text-gray-500">
          <p className={isAdmin ? '' : 'hidden sm:block'}>
            Showing {Math.min((page - 1) * PAGE_SIZE + 1, filtered.length)}–
            {Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length}
          </p>
          <div className="flex items-center gap-1">
            <button
              disabled={page === 1}
              onClick={() => setPage(page - 1)}
              className="p-1.5 rounded hover:bg-gray-200 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            {Array.from({ length: Math.ceil(filtered.length / PAGE_SIZE) }, (_, i) => i + 1).map((p) => (
              <button
                key={p}
                onClick={() => setPage(p)}
                className={`w-8 h-8 rounded text-sm ${page === p ? 'bg-blue-600 text-white' : 'hover:bg-gray-200'}`}
              >
                {p}
              </button>
            ))}
            <button
              disabled={page === Math.ceil(filtered.length / PAGE_SIZE)}
              onClick={() => setPage(page + 1)}
              className="p-1.5 rounded hover:bg-gray-200 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
}
      {!loading && !error && filtered.length > 0 && (
        <div className="flex justify-between items-center mt-5 text-sm text-gray-500">
          <p className={isAdmin ? '' : 'hidden sm:block'}>
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
