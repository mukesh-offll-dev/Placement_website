import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  FileCheck,
  Search,
  Filter,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  Clock,
  Building2,
  Briefcase,
  User,
  Mail,
  Hash,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ArrowRight,
  Loader2,
  X,
  ExternalLink,
  Calendar,
  AlertTriangle,
  FileText,
  UserCheck,
  XCircle,
  HelpCircle,
  Send,
} from 'lucide-react';
import {
  getAllApplications,
  updateApplicationStatus,
  getApplicationById,
  addTimeline,
} from '../services/api/adminService';
import { getAllJobs } from '../services/api/jobService';
import InterviewSchedulingModal from './InterviewSchedulingModal';
import { buildInterviewStatusPayload, getJobDriveStatusBadge } from '../utils/jobFilterUtils';

const APPLICATIONS_PAGE_SIZE = 20;

const TIMELINE_STATUSES = [
  { value: 'DONE', label: 'Done' },
  { value: 'UPCOMING', label: 'Upcoming' },
  { value: 'PENDING', label: 'Pending' },
  { value: 'FAILED', label: 'Failed / Not cleared' },
  { value: 'SKIPPED', label: 'Skipped' },
];

const TIMELINE_DOT = {
  DONE: 'bg-emerald-500 ring-emerald-50',
  UPCOMING: 'bg-blue-600 ring-blue-50',
  PENDING: 'bg-amber-400 ring-amber-50',
  FAILED: 'bg-rose-500 ring-rose-50',
  SKIPPED: 'bg-gray-300 ring-gray-50',
};

const TIMELINE_STATUS_LABEL = Object.fromEntries(TIMELINE_STATUSES.map((s) => [s.value, s.label]));

const EMPTY_TIMELINE_FORM = { stageLabel: '', stageDate: '', status: 'UPCOMING', remarks: '' };

/** Timeline stages in the order they were added (displayOrder), then by date. */
function sortTimeline(timeline) {
  return [...(Array.isArray(timeline) ? timeline : [])].sort((a, b) => {
    const orderA = Number.isFinite(a?.displayOrder) ? a.displayOrder : Number.MAX_SAFE_INTEGER;
    const orderB = Number.isFinite(b?.displayOrder) ? b.displayOrder : Number.MAX_SAFE_INTEGER;
    if (orderA !== orderB) return orderA - orderB;
    const dateA = String(a?.stageDate || a?.createdAt || '');
    const dateB = String(b?.stageDate || b?.createdAt || '');
    if (dateA !== dateB) return dateA.localeCompare(dateB);
    return (Number(a?.id) || 0) - (Number(b?.id) || 0);
  });
}

// Standard stage definitions required by placement workflow
const STAGES = [
  { value: 'APPLIED', label: 'Applied', color: 'gray' },
  { value: 'SHORTLISTED', label: 'Shortlisted', color: 'blue' },
  { value: 'INTERVIEW', label: 'Interview', color: 'purple' },
  { value: 'SELECTED', label: 'Selected', color: 'green' },
  { value: 'REJECTED', label: 'Rejected', color: 'red' },
];

// Stage filter cards. Full class names are spelled out so Tailwind keeps them in the build.
const STAGE_CARDS = [
  { status: 'APPLIED', title: 'Applied', countKey: 'applied', selectedBg: 'bg-gray-700 border-gray-700', hoverBg: 'hover:bg-gray-50', label: 'text-gray-500', dot: 'bg-gray-400', value: 'text-gray-700' },
  { status: 'SHORTLISTED', title: 'Shortlisted', countKey: 'shortlisted', selectedBg: 'bg-blue-600 border-blue-600', hoverBg: 'hover:bg-blue-50/50', label: 'text-blue-600', dot: 'bg-blue-600', value: 'text-blue-600' },
  { status: 'INTERVIEW', title: 'Interview', countKey: 'interview', selectedBg: 'bg-purple-600 border-purple-600', hoverBg: 'hover:bg-purple-50/50', label: 'text-purple-600', dot: 'bg-purple-600', value: 'text-purple-600' },
  { status: 'SELECTED', title: 'Selected', countKey: 'selected', selectedBg: 'bg-emerald-600 border-emerald-600', hoverBg: 'hover:bg-emerald-50/50', label: 'text-emerald-600', dot: 'bg-emerald-600', value: 'text-emerald-600' },
  { status: 'REJECTED', title: 'Rejected', countKey: 'rejected', selectedBg: 'bg-rose-600 border-rose-600', hoverBg: 'hover:bg-rose-50/50', label: 'text-rose-600', dot: 'bg-rose-600', value: 'text-rose-600' },
];

/**
 * Status badge styling adhering strictly to requirements:
 * Applied – Grey
 * Shortlisted – Blue
 * Interview – Purple
 * Selected – Green
 * Rejected – Red
 */
function getStatusBadgeClasses(status) {
  const norm = String(status || '').toUpperCase();
  switch (norm) {
    case 'APPLIED':
      return 'bg-gray-100 text-gray-700 border-gray-300';
    case 'SHORTLISTED':
      return 'bg-blue-50 text-blue-700 border-blue-200';
    case 'INTERVIEW':
      return 'bg-purple-50 text-purple-700 border-purple-200';
    case 'SELECTED':
      return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    case 'REJECTED':
      return 'bg-rose-50 text-rose-700 border-rose-200';
    case 'UNDER_REVIEW':
      return 'bg-amber-50 text-amber-700 border-amber-200';
    case 'WITHDRAWN':
      return 'bg-slate-100 text-slate-600 border-slate-200';
    default:
      return 'bg-gray-100 text-gray-700 border-gray-200';
  }
}

function formatStatusLabel(status) {
  const norm = String(status || '').toUpperCase();
  switch (norm) {
    case 'APPLIED':
      return 'Applied';
    case 'SHORTLISTED':
      return 'Shortlisted';
    case 'INTERVIEW':
      return 'Interview';
    case 'SELECTED':
      return 'Selected';
    case 'REJECTED':
      return 'Rejected';
    case 'UNDER_REVIEW':
      return 'Under Review';
    case 'WITHDRAWN':
      return 'Withdrawn';
    default:
      return status || 'Unknown';
  }
}

function formatDate(dateString) {
  if (!dateString) return '—';
  try {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return String(dateString);
    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return String(dateString);
  }
}

function formatRelativeTime(dateString) {
  if (!dateString) return '';
  try {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return '';
    const diffSec = Math.floor((Date.now() - d.getTime()) / 1000);
    if (diffSec < 60) return 'just now';
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHours = Math.floor(diffMin / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
  } catch {
    return '';
  }
}

export default function AdminApplicationManagement({
  showHeader = true,
  maxDisplayCount = null,
}) {
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filter & Search states
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [jobFilter, setJobFilter] = useState('ALL');
  const [jobs, setJobs] = useState([]);
  const [page, setPage] = useState(1);

  // Updating tracking: disable duplicate calls while processing
  const [updatingId, setUpdatingId] = useState(null);

  // Success / error banner feedback
  const [feedback, setFeedback] = useState(null);

  // Confirmation modal state for Selected / Rejected transitions
  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    application: null,
    targetStatus: null,
    remarks: '',
  });

  // Interview scheduling modal when advancing an application to INTERVIEW
  const [interviewModal, setInterviewModal] = useState({
    isOpen: false,
    application: null,
  });

  // Application detail view modal
  const [detailModal, setDetailModal] = useState({
    isOpen: false,
    loading: false,
    data: null,
  });

  // "Add stage / note" form inside the detail modal
  const [timelineForm, setTimelineForm] = useState(EMPTY_TIMELINE_FORM);
  const [timelineError, setTimelineError] = useState('');
  const [timelineSaving, setTimelineSaving] = useState(false);

  // Fetch real applications from Spring Boot backend
  const fetchApplications = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Every page, not just the first 100: search and the stage counters run on the client,
      // so they must see the whole set.
      const content = await getAllApplications();
      setApplications(Array.isArray(content) ? content : []);
    } catch (err) {
      console.error('Failed to fetch job applications:', err);
      setError(
        err.message || 'Unable to fetch applications from server. Please verify backend connection.'
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchApplications();
  }, [fetchApplications]);

  useEffect(() => {
    const controller = new AbortController();
    getAllJobs({ admin: true }, { signal: controller.signal })
      .then((list) => setJobs(Array.isArray(list) ? list : []))
      .catch(() => {});
    return () => controller.abort();
  }, []);

  // Execute actual status update call to Spring Boot backend
  const handleExecuteStatusUpdate = async (applicationId, newStatus, remarks = '', extra = {}) => {
    setUpdatingId(applicationId);
    setFeedback(null);
    try {
      const payload = {
        status: newStatus,
        remarks: remarks || undefined,
        ...(extra.currentStage ? { currentStage: extra.currentStage } : {}),
        ...(extra.stageDate ? { stageDate: extra.stageDate } : {}),
      };

      const result = await updateApplicationStatus(applicationId, payload);
      const updatedApp = result?.data || result;

      // Update local state with returned updated record
      setApplications((prev) =>
        prev.map((app) => (app.id === applicationId ? { ...app, ...updatedApp } : app))
      );

      setFeedback({
        type: 'success',
        message: `Application #${applicationId} status updated to ${formatStatusLabel(newStatus)} successfully.`,
      });

      // Also refresh background data to keep any linked counters synced
      fetchApplications();
    } catch (err) {
      console.error('Failed to update application status:', err);
      // 400: the server refused the transition; 409: someone else changed this application
      // meanwhile. Show the server's message and reload so the dropdown shows the real status.
      const conflict = err?.status === 409;
      setFeedback({
        type: 'error',
        message:
          (conflict
            ? `${err.message || 'This application was changed by someone else.'} The list has been refreshed.`
            : err.message) ||
          'Failed to update application status. Please check authorization or server logs.',
      });
      if (err?.status === 400 || conflict) {
        fetchApplications();
      }
    } finally {
      setUpdatingId(null);
    }
  };

  // Status change initiator with confirmation check
  const handleInitiateStatusChange = (application, newStatus) => {
    if (!application || !newStatus) return;
    if (application.status === newStatus) return;

    // Ask confirmation for high-impact terminal stages: SELECTED and REJECTED
    if (newStatus === 'SELECTED' || newStatus === 'REJECTED') {
      setConfirmModal({
        isOpen: true,
        application,
        targetStatus: newStatus,
        remarks: '',
      });
      return;
    }

    // Prompt for interview date, time and mode/venue when moving to INTERVIEW
    if (newStatus === 'INTERVIEW') {
      setInterviewModal({
        isOpen: true,
        application,
      });
      return;
    }

    // Direct progression for APPLIED, SHORTLISTED, UNDER_REVIEW
    handleExecuteStatusUpdate(application.id, newStatus);
  };

  const handleInterviewConfirm = async (details) => {
    if (!interviewModal.application) return;
    const appId = interviewModal.application.id;
    const payload = buildInterviewStatusPayload(details);
    await handleExecuteStatusUpdate(appId, payload.status, payload.remarks, {
      currentStage: payload.currentStage,
      stageDate: payload.stageDate,
    });
    setInterviewModal({ isOpen: false, application: null });
  };

  const handleConfirmModalSubmit = () => {
    if (!confirmModal.application || !confirmModal.targetStatus) return;
    const appId = confirmModal.application.id;
    const target = confirmModal.targetStatus;
    const remarks = confirmModal.remarks;
    setConfirmModal({ isOpen: false, application: null, targetStatus: null, remarks: '' });
    handleExecuteStatusUpdate(appId, target, remarks);
  };

  // View detail modal
  const handleOpenDetailModal = async (application) => {
    setTimelineForm(EMPTY_TIMELINE_FORM);
    setTimelineError('');
    setDetailModal({ isOpen: true, loading: true, data: application });
    try {
      const fullDetails = await getApplicationById(application.id);
      setDetailModal({ isOpen: true, loading: false, data: fullDetails?.data || fullDetails });
    } catch (err) {
      console.warn('Could not fetch expanded application details, using cached row:', err);
      setDetailModal({ isOpen: true, loading: false, data: application });
    }
  };

  const closeDetailModal = () => {
    if (timelineSaving) return;
    setDetailModal({ isOpen: false, loading: false, data: null });
  };

  const handleAddTimeline = async (e) => {
    e.preventDefault();
    const applicationId = detailModal.data?.id;
    if (!applicationId) return;

    const stageLabel = timelineForm.stageLabel.trim();
    if (!stageLabel) {
      setTimelineError('Enter a stage name or note title.');
      return;
    }
    if (stageLabel.length > 80) {
      setTimelineError('Stage name cannot exceed 80 characters.');
      return;
    }
    if (timelineForm.remarks.length > 255) {
      setTimelineError('Remarks cannot exceed 255 characters.');
      return;
    }

    setTimelineSaving(true);
    setTimelineError('');
    try {
      await addTimeline(applicationId, {
        stageLabel,
        stageDate: timelineForm.stageDate || null,
        status: timelineForm.status,
        remarks: timelineForm.remarks.trim() || null,
      });
      const fresh = await getApplicationById(applicationId);
      setDetailModal((prev) =>
        prev.data?.id === applicationId ? { ...prev, data: fresh?.data || fresh || prev.data } : prev
      );
      setTimelineForm(EMPTY_TIMELINE_FORM);
      setFeedback({
        type: 'success',
        message: `Timeline entry "${stageLabel}" added to application #${applicationId}.`,
      });
    } catch (err) {
      setTimelineError(err?.message || 'Could not add the timeline entry. Please try again.');
    } finally {
      setTimelineSaving(false);
    }
  };

  // Quick next stage suggestion: Applied -> Shortlisted -> Interview -> Selected
  const getNextStageSuggestion = (currentStatus) => {
    const norm = String(currentStatus || '').toUpperCase();
    switch (norm) {
      case 'APPLIED':
        return { nextStatus: 'SHORTLISTED', label: 'Shortlist', color: 'blue' };
      case 'SHORTLISTED':
        return { nextStatus: 'INTERVIEW', label: 'Move to Interview', color: 'purple' };
      case 'INTERVIEW':
        return { nextStatus: 'SELECTED', label: 'Select Candidate', color: 'green' };
      default:
        return null;
    }
  };

  // Job drive choices merged from /admin/jobs and any applications already loaded
  const jobOptions = useMemo(() => {
    const map = new Map();
    jobs.forEach((j) => {
      if (j?.id != null) {
        map.set(String(j.id), {
          id: String(j.id),
          label: `${j.company?.name || 'Company'} — ${j.jobRole || 'Drive'}`,
        });
      }
    });
    applications.forEach((app) => {
      const j = app.job;
      if (j?.id != null && !map.has(String(j.id))) {
        map.set(String(j.id), {
          id: String(j.id),
          label: `${j.company?.name || 'Company'} — ${j.jobRole || 'Drive'}`,
        });
      }
    });
    return Array.from(map.values()).sort((a, b) => a.label.localeCompare(b.label));
  }, [jobs, applications]);

  const jobFilteredApplications = useMemo(() => {
    if (jobFilter === 'ALL') return applications;
    return applications.filter((app) => String(app.job?.id) === String(jobFilter));
  }, [applications, jobFilter]);

  // Metrics summary counts (reflecting the selected job drive filter)
  const counts = useMemo(() => {
    const total = jobFilteredApplications.length;
    let applied = 0;
    let shortlisted = 0;
    let interview = 0;
    let selected = 0;
    let rejected = 0;

    jobFilteredApplications.forEach((app) => {
      const s = String(app.status || '').toUpperCase();
      if (s === 'APPLIED') applied++;
      else if (s === 'SHORTLISTED') shortlisted++;
      else if (s === 'INTERVIEW') interview++;
      else if (s === 'SELECTED') selected++;
      else if (s === 'REJECTED') rejected++;
    });

    return { total, applied, shortlisted, interview, selected, rejected };
  }, [jobFilteredApplications]);

  // Filtered applications
  const filteredApplications = useMemo(() => {
    return jobFilteredApplications.filter((app) => {
      // Status filter
      if (statusFilter !== 'ALL') {
        const appStatus = String(app.status || '').toUpperCase();
        if (appStatus !== statusFilter) return false;
      }

      // Search term
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        const studentName = String(app.student?.fullName || '').toLowerCase();
        const studentEmail = String(app.student?.email || '').toLowerCase();
        const rollNo = String(app.student?.rollNo || '').toLowerCase();
        const companyName = String(app.job?.company?.name || '').toLowerCase();
        const jobRole = String(app.job?.jobRole || '').toLowerCase();
        const currentStage = String(app.currentStage || '').toLowerCase();

        return (
          studentName.includes(term) ||
          studentEmail.includes(term) ||
          rollNo.includes(term) ||
          companyName.includes(term) ||
          jobRole.includes(term) ||
          currentStage.includes(term)
        );
      }

      return true;
    });
  }, [jobFilteredApplications, statusFilter, searchTerm]);

  const totalPages = Math.max(1, Math.ceil(filteredApplications.length / APPLICATIONS_PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const displayedApplications = maxDisplayCount
    ? filteredApplications.slice(0, maxDisplayCount)
    : filteredApplications.slice(
        (currentPage - 1) * APPLICATIONS_PAGE_SIZE,
        currentPage * APPLICATIONS_PAGE_SIZE
      );

  return (
    <div className="space-y-6">
      {/* Optional Page/Section Header */}
      {showHeader && (
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-xl md:text-2xl font-bold tracking-tight text-gray-900 flex items-center gap-2.5">
              <FileCheck className="w-6 h-6 text-blue-600" />
              Job Application Status Management
            </h2>
            <p className="text-gray-500 text-xs md:text-sm mt-0.5">
              Review real student job applications and advance candidates through recruitment stages.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={fetchApplications}
              disabled={loading}
              className="inline-flex items-center gap-2 bg-white hover:bg-gray-50 text-gray-700 text-xs font-semibold px-3.5 py-2 rounded-xl border border-gray-200 shadow-xs transition-colors disabled:opacity-60"
              title="Refresh applications from database"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-blue-600 ${loading ? 'animate-spin' : ''}`} />
              <span>Refresh Applications</span>
            </button>
          </div>
        </div>
      )}

      {/* Real-time Feedback Banner */}
      {feedback && (
        <div
          className={`flex items-start justify-between gap-3 p-4 rounded-xl text-xs md:text-sm shadow-xs border transition-all ${
            feedback.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-rose-50 border-rose-200 text-rose-800'
          }`}
        >
          <div className="flex items-start gap-2.5">
            {feedback.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
            )}
            <div>
              <p className="font-semibold">
                {feedback.type === 'success' ? 'Update Successful' : 'Update Failed'}
              </p>
              <p className="text-xs mt-0.5 opacity-90">{feedback.message}</p>
            </div>
          </div>
          <button
            onClick={() => setFeedback(null)}
            className="p-1 hover:bg-black/5 rounded-lg text-current"
            aria-label="Dismiss message"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Global Error Alert */}
      {error && (
        <div className="flex items-start justify-between gap-3 bg-red-50 border border-red-200 text-red-700 text-sm p-4 rounded-xl shadow-xs">
          <div className="flex items-start gap-2.5">
            <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-red-800">Error loading applications</p>
              <p className="text-xs text-red-600 mt-0.5">{error}</p>
            </div>
          </div>
          <button
            onClick={fetchApplications}
            className="text-xs font-semibold bg-red-100 hover:bg-red-200 text-red-800 px-3 py-1.5 rounded-lg transition-colors shrink-0"
          >
            Retry
          </button>
        </div>
      )}

      {/* Stage Counter Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* Total */}
        <button
          onClick={() => {
            setStatusFilter('ALL');
            setPage(1);
          }}
          className={`text-left p-3.5 rounded-xl border transition-all ${
            statusFilter === 'ALL'
              ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
              : 'bg-white hover:bg-gray-50 border-gray-200 text-gray-800'
          }`}
        >
          <div className="text-[11px] font-medium opacity-80 uppercase tracking-wider">All Applications</div>
          <div className="text-2xl font-black mt-1">{counts.total}</div>
        </button>

        {STAGE_CARDS.map((card) => {
          const selected = statusFilter === card.status;
          return (
            <button
              key={card.status}
              type="button"
              onClick={() => {
                setStatusFilter(card.status);
                setPage(1);
              }}
              aria-pressed={selected}
              className={`text-left p-3.5 rounded-xl border transition-all ${
                selected ? `${card.selectedBg} text-white shadow-sm` : `bg-white ${card.hoverBg} border-gray-200 text-gray-800`
              }`}
            >
              <div className="flex items-center justify-between">
                {/* Selected: white text on the stage colour; otherwise stage-coloured text on white. */}
                <span className={`text-[11px] font-medium uppercase tracking-wider ${selected ? 'text-white/90' : card.label}`}>
                  {card.title}
                </span>
                <span className={`w-2 h-2 rounded-full ${selected ? 'bg-white' : card.dot}`} />
              </div>
              <div className={`text-2xl font-black mt-1 ${selected ? 'text-white' : card.value}`}>{counts[card.countKey]}</div>
            </button>
          );
        })}
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-2xl p-4 border border-gray-200 shadow-xs flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
        {/* Search Input */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setPage(1);
            }}
            placeholder="Search by student, email, roll no, company, or role..."
            className="w-full pl-10 pr-4 py-2 text-xs md:text-sm bg-gray-50 hover:bg-white focus:bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all"
          />
          {searchTerm && (
            <button
              onClick={() => {
                setSearchTerm('');
                setPage(1);
              }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Job Drive Filter Dropdown */}
          <div className="flex items-center gap-2">
            <label htmlFor="admin-app-job-filter" className="text-xs font-medium text-gray-500 whitespace-nowrap">
              Job Drive:
            </label>
            <select
              id="admin-app-job-filter"
              value={jobFilter}
              onChange={(e) => {
                setJobFilter(e.target.value);
                setPage(1);
              }}
              className="text-xs md:text-sm bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-gray-700 font-medium focus:outline-none focus:ring-2 focus:ring-blue-600 max-w-[220px]"
            >
              <option value="ALL">All Job Drives ({applications.length})</option>
              {jobOptions.map((opt) => (
                <option key={opt.id} value={opt.id}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* Stage Filter Dropdown */}
          <div className="flex items-center gap-2">
            <label htmlFor="admin-app-status-filter" className="text-xs font-medium text-gray-500 whitespace-nowrap">
              Filter Status:
            </label>
            <select
              id="admin-app-status-filter"
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              className="text-xs md:text-sm bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-gray-700 font-medium focus:outline-none focus:ring-2 focus:ring-blue-600"
            >
              <option value="ALL">All Stages ({counts.total})</option>
              <option value="APPLIED">Applied ({counts.applied})</option>
              <option value="SHORTLISTED">Shortlisted ({counts.shortlisted})</option>
              <option value="INTERVIEW">Interview ({counts.interview})</option>
              <option value="SELECTED">Selected ({counts.selected})</option>
              <option value="REJECTED">Rejected ({counts.rejected})</option>
            </select>
          </div>
        </div>
      </div>

      {/* Applications Table / Cards */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-xs overflow-hidden">
        {loading && applications.length === 0 ? (
          <div className="py-20 flex flex-col items-center justify-center text-gray-400">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600 mb-3" />
            <p className="text-sm font-medium">Loading real database applications...</p>
          </div>
        ) : displayedApplications.length === 0 ? (
          <div className="py-16 text-center px-4">
            <FileCheck className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="font-semibold text-gray-800 text-sm">No student applications match your filter</p>
            <p className="text-xs text-gray-400 mt-1 max-w-sm mx-auto">
              {searchTerm || statusFilter !== 'ALL' || jobFilter !== 'ALL'
                ? 'Try adjusting your search keywords or filters.'
                : 'Job applications submitted by students will appear in real time here.'}
            </p>
            {(searchTerm || statusFilter !== 'ALL' || jobFilter !== 'ALL') && (
              <button
                onClick={() => {
                  setSearchTerm('');
                  setStatusFilter('ALL');
                  setJobFilter('ALL');
                  setPage(1);
                }}
                className="mt-3 text-xs font-semibold text-blue-600 hover:text-blue-700 hover:underline"
              >
                Clear all filters
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs md:text-sm">
              <thead>
                <tr className="bg-gray-50/80 border-b border-gray-200 text-gray-500 font-semibold text-[11px] uppercase tracking-wider">
                  <th className="py-3.5 px-4">Student Details</th>
                  <th className="py-3.5 px-4">Company & Job Role</th>
                  <th className="py-3.5 px-4">Application Date</th>
                  <th className="py-3.5 px-4">Current Stage</th>
                  <th className="py-3.5 px-4 text-right">Update Status Stage</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {displayedApplications.map((app) => {
                  const studentName = app.student?.fullName || 'Student Applicant';
                  const studentEmail = app.student?.email || '—';
                  const registerNumber = app.student?.rollNo || 'Not Assigned';
                  const companyName = app.job?.company?.name || 'Company';
                  const jobRole = app.job?.jobRole || 'Open Position';
                  const applicationDate = formatDate(app.appliedOn);
                  const relativeTime = formatRelativeTime(app.appliedOn);
                  const isUpdating = updatingId === app.id;
                  const suggestion = getNextStageSuggestion(app.status);

                  return (
                    <tr
                      key={app.id}
                      className="hover:bg-blue-50/30 transition-colors group"
                    >
                      {/* 1. Student Details: Name, Email, Register Number */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-xs">
                            {studentName.charAt(0).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <p className="font-bold text-gray-900 text-xs md:text-sm truncate">
                              {studentName}
                            </p>
                            <div className="flex flex-wrap items-center gap-2 text-[11px] text-gray-500 mt-0.5">
                              <span className="flex items-center gap-1 truncate" title={studentEmail}>
                                <Mail className="w-3 h-3 text-gray-400 shrink-0" />
                                {studentEmail}
                              </span>
                              <span className="text-gray-300">•</span>
                              <span className="flex items-center gap-1 text-gray-600 font-mono font-medium" title="Register Number">
                                <Hash className="w-3 h-3 text-gray-400 shrink-0" />
                                {registerNumber}
                              </span>
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* 2. Company & Job Role */}
                      <td className="py-3.5 px-4">
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <p className="font-semibold text-gray-900 text-xs md:text-sm flex items-center gap-1.5 truncate">
                              <Building2 className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                              {companyName}
                            </p>
                            {(() => {
                              const jobBadge = getJobDriveStatusBadge(app.job);
                              return jobBadge ? (
                                <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full border ${jobBadge.classes}`}>
                                  {jobBadge.label}
                                </span>
                              ) : null;
                            })()}
                          </div>
                          <p className="text-gray-500 text-xs flex items-center gap-1.5 mt-0.5 truncate">
                            <Briefcase className="w-3 h-3 text-gray-400 shrink-0" />
                            {jobRole}
                          </p>
                        </div>
                      </td>

                      {/* 3. Application Date */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="text-xs text-gray-700 font-medium">
                          {applicationDate}
                        </div>
                        {relativeTime && (
                          <div className="text-[10px] text-gray-400 mt-0.5">
                            {relativeTime}
                          </div>
                        )}
                      </td>

                      {/* 4. Current Application Status Badge */}
                      <td className="py-3.5 px-4">
                        <div className="flex flex-col items-start gap-1">
                          <span
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${getStatusBadgeClasses(
                              app.status
                            )}`}
                          >
                            <span className="w-1.5 h-1.5 rounded-full bg-current opacity-70" />
                            {formatStatusLabel(app.status)}
                          </span>
                          {app.currentStage && app.currentStage !== formatStatusLabel(app.status) && (
                            <span className="text-[10px] text-gray-400 pl-1 truncate max-w-[150px]" title={app.currentStage}>
                              Stage: {app.currentStage}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* 5. Update Status Actions & Dropdown */}
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-2 justify-end">
                          {/* Quick progression button if applicable */}
                          {suggestion && app.status !== 'REJECTED' && app.status !== 'SELECTED' && (
                            <button
                              onClick={() => handleInitiateStatusChange(app, suggestion.nextStatus)}
                              disabled={isUpdating}
                              className={`hidden sm:inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1.5 rounded-lg border transition-all shadow-2xs ${
                                suggestion.color === 'blue'
                                  ? 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100'
                                  : suggestion.color === 'purple'
                                  ? 'bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100'
                                  : 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                              } disabled:opacity-50`}
                              title={`Advance application directly to ${suggestion.nextStatus}`}
                            >
                              {isUpdating ? (
                                <Loader2 className="w-3 h-3 animate-spin" />
                              ) : (
                                <ArrowRight className="w-3 h-3" />
                              )}
                              <span>{suggestion.label}</span>
                            </button>
                          )}

                          {/* Stage Selector Dropdown */}
                          <div className="relative inline-block">
                            <select
                              value={app.status || 'APPLIED'}
                              onChange={(e) => handleInitiateStatusChange(app, e.target.value)}
                              disabled={isUpdating || app.status === 'WITHDRAWN'}
                              title={app.status === 'WITHDRAWN' ? 'The student withdrew this application' : undefined}
                              aria-label={`Change status for ${studentName}`}
                              className="text-xs font-semibold bg-white hover:bg-gray-50 border border-gray-200 text-gray-700 rounded-lg px-2.5 py-1.5 pr-7 focus:outline-none focus:ring-2 focus:ring-blue-600 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shadow-2xs"
                            >
                              <option value="APPLIED">Applied</option>
                              <option value="UNDER_REVIEW">Under Review</option>
                              <option value="SHORTLISTED">Shortlisted</option>
                              <option value="INTERVIEW">Interview</option>
                              <option value="SELECTED">Selected</option>
                              <option value="REJECTED">Rejected</option>
                              {app.status === 'WITHDRAWN' && (
                                <option value="WITHDRAWN" disabled>Withdrawn</option>
                              )}
                            </select>
                            {isUpdating && (
                              <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none">
                                <Loader2 className="w-3 h-3 animate-spin text-blue-600" />
                              </div>
                            )}
                          </div>

                          {/* View Full Timeline / Details */}
                          <button
                            onClick={() => handleOpenDetailModal(app)}
                            className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="View candidate details & stage timeline"
                            aria-label="View application details"
                          >
                            <ChevronRight className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {!maxDisplayCount && filteredApplications.length > APPLICATIONS_PAGE_SIZE && (
          <div className="px-4 py-3 bg-gray-50/60 border-t border-gray-100 flex items-center justify-between text-xs text-gray-600">
            <span>
              Showing {(currentPage - 1) * APPLICATIONS_PAGE_SIZE + 1}–
              {Math.min(currentPage * APPLICATIONS_PAGE_SIZE, filteredApplications.length)} of{' '}
              {filteredApplications.length}
            </span>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                disabled={currentPage <= 1}
                onClick={() => setPage(currentPage - 1)}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-gray-200 bg-white hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed font-medium"
              >
                <ChevronLeft className="w-3.5 h-3.5" /> Prev
              </button>
              <span className="px-2 font-semibold text-gray-700">
                Page {currentPage} of {totalPages}
              </span>
              <button
                type="button"
                disabled={currentPage >= totalPages}
                onClick={() => setPage(currentPage + 1)}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-gray-200 bg-white hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed font-medium"
              >
                Next <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Confirmation Modal for Terminal / Major Transitions (Selected / Rejected) */}
      {confirmModal.isOpen && confirmModal.application && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-gray-100 overflow-hidden animate-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div
              className={`p-5 border-b flex items-start gap-3.5 ${
                confirmModal.targetStatus === 'SELECTED'
                  ? 'bg-emerald-50/70 border-emerald-100 text-emerald-900'
                  : 'bg-rose-50/70 border-rose-100 text-rose-900'
              }`}
            >
              <div
                className={`p-2 rounded-xl shrink-0 ${
                  confirmModal.targetStatus === 'SELECTED'
                    ? 'bg-emerald-100 text-emerald-700'
                    : 'bg-rose-100 text-rose-700'
                }`}
              >
                {confirmModal.targetStatus === 'SELECTED' ? (
                  <UserCheck className="w-5 h-5" />
                ) : (
                  <XCircle className="w-5 h-5" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-base text-gray-900">
                  {confirmModal.targetStatus === 'SELECTED'
                    ? 'Confirm Final Selection'
                    : 'Confirm Application Rejection'}
                </h3>
                <p className="text-xs text-gray-600 mt-0.5">
                  {confirmModal.targetStatus === 'SELECTED'
                    ? 'This will mark the student as Selected and update placement status.'
                    : 'This will transition the student application to Rejected.'}
                </p>
              </div>
              <button
                onClick={() => setConfirmModal({ isOpen: false, application: null, targetStatus: null, remarks: '' })}
                className="text-gray-400 hover:text-gray-600 p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 space-y-4">
              <div className="bg-gray-50 rounded-xl p-3.5 border border-gray-200/80 text-xs space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-gray-500">Student:</span>
                  <span className="font-bold text-gray-900">
                    {confirmModal.application.student?.fullName}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Register No:</span>
                  <span className="font-mono text-gray-700">
                    {confirmModal.application.student?.rollNo || '—'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Company:</span>
                  <span className="font-semibold text-gray-900">
                    {confirmModal.application.job?.company?.name}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Role:</span>
                  <span className="text-gray-700">{confirmModal.application.job?.jobRole}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">New Stage:</span>
                  <span
                    className={`font-bold px-2 py-0.5 rounded-full text-[11px] border ${getStatusBadgeClasses(
                      confirmModal.targetStatus
                    )}`}
                  >
                    {formatStatusLabel(confirmModal.targetStatus)}
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Optional Reviewer Remarks / Feedback
                </label>
                <textarea
                  value={confirmModal.remarks}
                  onChange={(e) =>
                    setConfirmModal((prev) => ({ ...prev, remarks: e.target.value }))
                  }
                  rows={2}
                  maxLength={250}
                  placeholder={
                    confirmModal.targetStatus === 'SELECTED'
                      ? 'e.g. Selected with 18 LPA offer package after technical & HR interview rounds.'
                      : 'e.g. Candidate lacked required experience in core system design.'
                  }
                  className="w-full text-xs p-3 bg-gray-50 hover:bg-white focus:bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-600 focus:outline-none"
                />
              </div>
            </div>

            {/* Modal Actions */}
            <div className="p-4 bg-gray-50/80 border-t border-gray-100 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setConfirmModal({ isOpen: false, application: null, targetStatus: null, remarks: '' })}
                className="px-4 py-2 text-xs font-semibold text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmModalSubmit}
                className={`px-4 py-2 text-xs font-bold text-white rounded-xl shadow-xs transition-colors flex items-center gap-1.5 ${
                  confirmModal.targetStatus === 'SELECTED'
                    ? 'bg-emerald-600 hover:bg-emerald-700'
                    : 'bg-rose-600 hover:bg-rose-700'
                }`}
              >
                <span>Confirm {formatStatusLabel(confirmModal.targetStatus)}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Candidate Details & Stage Timeline Drawer / Modal */}
      {detailModal.isOpen && detailModal.data && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-gray-100 overflow-hidden animate-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="p-5 border-b border-gray-100 flex items-start justify-between bg-gray-50/60">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold text-sm shadow-xs">
                  {(detailModal.data.student?.fullName || 'S').charAt(0).toUpperCase()}
                </div>
                <div>
                  <h3 className="font-bold text-base text-gray-900">
                    {detailModal.data.student?.fullName || 'Student Applicant'}
                  </h3>
                  <p className="text-xs text-gray-500">
                    Application #{detailModal.data.id} • {detailModal.data.job?.company?.name || 'Company'} —{' '}
                    {detailModal.data.job?.jobRole}
                  </p>
                </div>
              </div>
              <button
                onClick={closeDetailModal}
                className="text-gray-400 hover:text-gray-600 p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Scrollable Body */}
            <div className="p-5 overflow-y-auto space-y-5 flex-1">
              {/* Status Banner */}
              <div className="flex items-center justify-between p-3.5 bg-gray-50 rounded-xl border border-gray-200">
                <div>
                  <span className="text-xs text-gray-500 block">Current Status Stage</span>
                  <span
                    className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold border mt-1 ${getStatusBadgeClasses(
                      detailModal.data.status
                    )}`}
                  >
                    ● {formatStatusLabel(detailModal.data.status)}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-xs text-gray-500 block">Applied On</span>
                  <span className="text-xs font-semibold text-gray-800">
                    {formatDate(detailModal.data.appliedOn)}
                  </span>
                </div>
              </div>

              {/* Student Academic Info */}
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="bg-gray-50/60 p-3 rounded-xl border border-gray-100">
                  <span className="text-gray-400 block text-[11px]">Email</span>
                  <span className="font-semibold text-gray-800 break-all">
                    {detailModal.data.student?.email || '—'}
                  </span>
                </div>
                <div className="bg-gray-50/60 p-3 rounded-xl border border-gray-100">
                  <span className="text-gray-400 block text-[11px]">Register Number</span>
                  <span className="font-mono font-bold text-gray-800">
                    {detailModal.data.student?.rollNo || 'Not Assigned'}
                  </span>
                </div>
                <div className="bg-gray-50/60 p-3 rounded-xl border border-gray-100">
                  <span className="text-gray-400 block text-[11px]">Department</span>
                  <span className="font-semibold text-gray-800">
                    {detailModal.data.student?.department || '—'}
                  </span>
                </div>
                <div className="bg-gray-50/60 p-3 rounded-xl border border-gray-100">
                  <span className="text-gray-400 block text-[11px]">CGPA</span>
                  <span className="font-bold text-blue-600">
                    {detailModal.data.student?.cgpa ? `${detailModal.data.student.cgpa} CGPA` : '—'}
                  </span>
                </div>
              </div>

              {/* Cover Letter (if submitted) */}
              {detailModal.data.coverLetter && (
                <div>
                  <h4 className="text-xs font-bold text-gray-900 mb-1.5 flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-blue-600" />
                    Cover Letter / Statement
                  </h4>
                  <p className="text-xs text-gray-600 bg-gray-50 p-3 rounded-xl border border-gray-200 leading-relaxed">
                    {detailModal.data.coverLetter}
                  </p>
                </div>
              )}

              {/* Recruitment Timeline Stages */}
              <div>
                <h4 className="text-xs font-bold text-gray-900 mb-3 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-blue-600" />
                  Application Stage Timeline
                </h4>
                {detailModal.loading ? (
                  <p className="text-xs text-gray-400 bg-gray-50 p-3 rounded-xl text-center flex items-center justify-center gap-2">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" /> Loading timeline...
                  </p>
                ) : detailModal.data.timeline && detailModal.data.timeline.length > 0 ? (
                  <div className="space-y-3 relative before:absolute before:left-3.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-gray-200">
                    {sortTimeline(detailModal.data.timeline).map((stage, idx) => (
                      <div key={stage.id || idx} className="relative pl-8 flex items-start gap-2">
                        <div
                          className={`absolute left-2 top-1 w-3.5 h-3.5 -translate-x-1/2 rounded-full ring-4 ${
                            TIMELINE_DOT[stage.status] || TIMELINE_DOT.UPCOMING
                          }`}
                        />
                        <div className="flex-1 bg-gray-50/80 p-2.5 rounded-xl border border-gray-100">
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-bold text-xs text-gray-900">{stage.stageLabel}</span>
                            <span className="text-[11px] text-gray-400 whitespace-nowrap">
                              {TIMELINE_STATUS_LABEL[stage.status] ? `${TIMELINE_STATUS_LABEL[stage.status]} · ` : ''}
                              {formatDate(stage.stageDate)}
                            </span>
                          </div>
                          {stage.remarks && (
                            <p className="text-[11px] text-gray-600 mt-1">{stage.remarks}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-gray-400 bg-gray-50 p-3 rounded-xl text-center">
                    No individual timeline milestones recorded yet.
                  </p>
                )}
              </div>

              {/* Add stage / note */}
              <form onSubmit={handleAddTimeline} className="border border-gray-200 rounded-xl p-4 space-y-3">
                <h4 className="text-xs font-bold text-gray-900 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-blue-600" />
                  Add Stage / Note
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="sm:col-span-2">
                    <label htmlFor="timeline-stage-label" className="block text-[11px] font-semibold text-gray-600 mb-1">
                      Stage / note <span className="text-red-500">*</span>
                    </label>
                    <input
                      id="timeline-stage-label"
                      type="text"
                      value={timelineForm.stageLabel}
                      onChange={(e) => setTimelineForm((prev) => ({ ...prev, stageLabel: e.target.value }))}
                      maxLength={80}
                      placeholder="e.g. Technical Interview Round 1"
                      className="w-full text-xs p-2.5 bg-gray-50 hover:bg-white focus:bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-600 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label htmlFor="timeline-stage-date" className="block text-[11px] font-semibold text-gray-600 mb-1">
                      Date
                    </label>
                    <input
                      id="timeline-stage-date"
                      type="date"
                      value={timelineForm.stageDate}
                      onChange={(e) => setTimelineForm((prev) => ({ ...prev, stageDate: e.target.value }))}
                      className="w-full text-xs p-2.5 bg-gray-50 hover:bg-white focus:bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-600 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label htmlFor="timeline-stage-status" className="block text-[11px] font-semibold text-gray-600 mb-1">
                      Status
                    </label>
                    <select
                      id="timeline-stage-status"
                      value={timelineForm.status}
                      onChange={(e) => setTimelineForm((prev) => ({ ...prev, status: e.target.value }))}
                      className="w-full text-xs p-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-600 focus:outline-none"
                    >
                      {TIMELINE_STATUSES.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="sm:col-span-2">
                    <label htmlFor="timeline-remarks" className="block text-[11px] font-semibold text-gray-600 mb-1">
                      Remarks
                    </label>
                    <textarea
                      id="timeline-remarks"
                      rows={2}
                      maxLength={255}
                      value={timelineForm.remarks}
                      onChange={(e) => setTimelineForm((prev) => ({ ...prev, remarks: e.target.value }))}
                      placeholder="Visible to the student on their application timeline."
                      className="w-full text-xs p-2.5 bg-gray-50 hover:bg-white focus:bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-600 focus:outline-none"
                    />
                  </div>
                </div>
                {timelineError && (
                  <p className="text-xs text-rose-600 flex items-center gap-1.5" role="alert">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" /> {timelineError}
                  </p>
                )}
                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={timelineSaving || detailModal.loading}
                    className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-xs disabled:opacity-60"
                  >
                    {timelineSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                    Add to Timeline
                  </button>
                </div>
              </form>
            </div>

            {/* Footer */}
            <div className="p-4 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
              <span className="text-[11px] text-gray-500">
                Placement Cell Application Record
              </span>
              <button
                onClick={closeDetailModal}
                className="px-4 py-2 text-xs font-bold bg-white hover:bg-gray-100 text-gray-700 border border-gray-200 rounded-xl"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {interviewModal.isOpen && interviewModal.application && (
        <InterviewSchedulingModal
          key={interviewModal.application.id}
          isOpen={interviewModal.isOpen}
          application={interviewModal.application}
          busy={updatingId === interviewModal.application.id}
          onClose={() => setInterviewModal({ isOpen: false, application: null })}
          onConfirm={handleInterviewConfirm}
        />
      )}
    </div>
  );
}
