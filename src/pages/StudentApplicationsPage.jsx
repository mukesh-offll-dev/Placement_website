import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
import studentService from '../services/api/studentService.js';

const STATUS_LABELS = {
  APPLIED: 'Applied',
  UNDER_REVIEW: 'Under Review',
  SHORTLISTED: 'Shortlisted',
  REJECTED: 'Rejected',
  SELECTED: 'Selected',
  WITHDRAWN: 'Withdrawn',
};

const STATUS_CONFIG = {
  APPLIED: { bg: 'bg-blue-100', text: 'text-blue-700', icon: FileText },
  UNDER_REVIEW: { bg: 'bg-yellow-100', text: 'text-yellow-700', icon: Clock },
  SHORTLISTED: { bg: 'bg-green-100', text: 'text-green-700', icon: CheckCircle },
  REJECTED: { bg: 'bg-red-100', text: 'text-red-600', icon: XCircle },
  SELECTED: { bg: 'bg-emerald-100', text: 'text-emerald-700', icon: CheckCircle },
  WITHDRAWN: { bg: 'bg-gray-100', text: 'text-gray-600', icon: XCircle },
};

const FILTERS = [
  { label: 'All', value: 'All' },
  ...Object.entries(STATUS_LABELS).map(([value, label]) => ({ label, value })),
];

const getText = (value, fallback = '') =>
  typeof value === 'string' && value.trim() ? value.trim() : fallback;

const formatDate = (value) => {
  if (typeof value !== 'string' || !value.trim()) {
    return 'Date unavailable';
  }

  const [year, month, day] = value.slice(0, 10).split('-').map(Number);
  if (!year || month < 1 || month > 12 || day < 1 || day > 31) {
    return 'Date unavailable';
  }

  const date = new Date(year, month - 1, day);
  if (
    Number.isNaN(date.getTime()) ||
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return 'Date unavailable';
  }

  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(date);
};

const getStatusLabel = (status) => {
  if (typeof status !== 'string' || !status.trim()) {
    return 'Status unavailable';
  }
  if (Object.hasOwn(STATUS_LABELS, status)) {
    return STATUS_LABELS[status];
  }
  return status.toLowerCase().replaceAll('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
};

const getTimelineState = (status) => ({
  done: status === 'DONE',
  upcoming: status === 'UPCOMING',
  failed: status === 'FAILED',
  skipped: status === 'SKIPPED',
});

export default function StudentApplicationsPage() {
  const [applications, setApplications] = useState([]);
  const [loadState, setLoadState] = useState('loading');
  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState('All');
  const [expanded, setExpanded] = useState(null);
  const [timelineDetails, setTimelineDetails] = useState({});
  const applicationsRequest = useRef(null);
  const timelineRequests = useRef(new Map());

  const loadApplications = useCallback(async () => {
    applicationsRequest.current?.abort();
    timelineRequests.current.forEach((controller) => controller.abort());
    timelineRequests.current.clear();

    const controller = new AbortController();
    applicationsRequest.current = controller;
    setLoadState('loading');
    setTimelineDetails({});
    setExpanded(null);

    try {
      const result = await studentService.getMyApplications({ signal: controller.signal });
      if (applicationsRequest.current === controller) {
        setApplications(result);
        setLoadState('success');
      }
    } catch {
      if (applicationsRequest.current === controller && !controller.signal.aborted) {
        setLoadState('error');
      }
    } finally {
      if (applicationsRequest.current === controller) {
        applicationsRequest.current = null;
      }
    }
  }, []);

  useEffect(() => {
    const requests = timelineRequests.current;
    loadApplications();
    return () => {
      applicationsRequest.current?.abort();
      requests.forEach((controller) => controller.abort());
      requests.clear();
    };
  }, [loadApplications]);

  const loadTimeline = useCallback(async (application) => {
    if (timelineRequests.current.has(application.id)) {
      return;
    }

    const controller = new AbortController();
    timelineRequests.current.set(application.id, controller);
    setTimelineDetails((current) => ({
      ...current,
      [application.id]: { status: 'loading', timeline: [] },
    }));

    try {
      const detail = await studentService.getMyApplication(application.id, {
        signal: controller.signal,
      });
      if (!controller.signal.aborted) {
        setTimelineDetails((current) => ({
          ...current,
          [application.id]: { status: 'success', timeline: detail.timeline },
        }));
      }
    } catch {
      if (!controller.signal.aborted) {
        setTimelineDetails((current) => ({
          ...current,
          [application.id]: { status: 'error', timeline: [] },
        }));
      }
    } finally {
      if (timelineRequests.current.get(application.id) === controller) {
        timelineRequests.current.delete(application.id);
      }
    }
  }, []);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return applications.filter((application) => {
      const company = getText(application.job?.company?.name).toLowerCase();
      const role = getText(application.job?.jobRole).toLowerCase();
      const matchSearch = company.includes(query) || role.includes(query);
      const matchFilter = activeFilter === 'All' || application.status === activeFilter;
      return matchSearch && matchFilter;
    });
  }, [applications, search, activeFilter]);

  const stats = useMemo(
    () => ({
      total: applications.length,
      shortlisted: applications.filter((application) => application.status === 'SHORTLISTED')
        .length,
      underReview: applications.filter((application) => application.status === 'UNDER_REVIEW')
        .length,
      rejected: applications.filter((application) => application.status === 'REJECTED').length,
    }),
    [applications]
  );

  const statValue = (value) =>
    loadState === 'success' ? value : loadState === 'loading' ? '...' : '—';

  return (
    <main className="flex-1 px-4 md:px-8 py-6 overflow-x-hidden">
      <h2 className="text-2xl font-bold text-gray-900 mb-1">My Applications</h2>
      <p className="text-gray-500 text-sm mb-6">
        Track the status of all your job applications.
      </p>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Total Applied', value: statValue(stats.total), color: 'text-gray-900' },
          { label: 'Shortlisted', value: statValue(stats.shortlisted), color: 'text-green-600' },
          { label: 'Under Review', value: statValue(stats.underReview), color: 'text-yellow-600' },
          { label: 'Rejected', value: statValue(stats.rejected), color: 'text-red-500' },
        ].map(({ label, value, color }) => (
          <div key={label} className="bg-white rounded-xl p-4 shadow-sm">
            <p className="text-xs text-gray-500 mb-1">{label}</p>
            <p className={`text-3xl font-bold ${color}`}>{value}</p>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-xl p-4 shadow-sm mb-5 flex flex-col sm:flex-row gap-3 items-start sm:items-center flex-wrap">
        <div className="flex gap-1.5 flex-wrap flex-1">
          {FILTERS.map(({ label, value }) => (
            <button
              key={value}
              type="button"
              onClick={() => setActiveFilter(value)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                activeFilter === value
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search applications..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="border border-gray-300 pl-9 pr-4 py-1.5 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-44"
          />
        </div>
      </div>

      {loadState === 'loading' ? (
        <div className="bg-white rounded-xl p-12 text-center text-gray-500 shadow-sm" role="status">
          <Clock className="w-8 h-8 mx-auto mb-3 animate-spin text-blue-500" />
          <p>Loading your applications...</p>
        </div>
      ) : loadState === 'error' ? (
        <div className="bg-white rounded-xl p-12 text-center text-gray-600 shadow-sm" role="alert">
          <p className="font-medium">Unable to load your applications.</p>
          <p className="text-sm text-gray-400 mt-1">Please check your connection and try again.</p>
          <button
            type="button"
            onClick={loadApplications}
            className="mt-4 px-4 py-2 rounded-lg bg-blue-600 text-white text-sm hover:bg-blue-700"
          >
            Retry
          </button>
        </div>
      ) : applications.length === 0 ? (
        <div className="bg-white rounded-xl p-12 text-center text-gray-400 shadow-sm">
          <FileText className="w-10 h-10 mx-auto mb-3 text-gray-300" />
          <p className="font-medium">You have not applied to any jobs yet.</p>
          <Link to="/student/jobs" className="text-sm text-blue-600 hover:underline mt-2 block">
            Browse job drives
          </Link>
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-xl p-12 text-center text-gray-400 shadow-sm">
          <Search className="w-10 h-10 mx-auto mb-3 text-gray-300" />
          <p className="font-medium">No applications match your search or filters.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((application) => {
            const statusConfig =
              typeof application.status === 'string' &&
              Object.hasOwn(STATUS_CONFIG, application.status)
                ? STATUS_CONFIG[application.status]
                : {
              bg: 'bg-gray-100',
              text: 'text-gray-600',
              icon: FileText,
                };
            const StatusIcon = statusConfig.icon;
            const isExpanded = expanded === application.id;
            const details = timelineDetails[application.id];
            const company = application.job?.company;
            const companyName = getText(company?.name, 'Company unavailable');
            const role = getText(application.job?.jobRole, 'Role unavailable');
            const ctcText =
              getText(application.job?.ctcText) ||
              (typeof application.job?.ctcValue === 'number' ||
              typeof application.job?.ctcValue === 'string'
                ? String(application.job.ctcValue)
                : 'CTC unavailable');
            const logoUrl =
              getText(company?.logoUrl) || null;
            const companyLogoColor = getText(company?.logoColor);
            const logoColor = /^#(?:[\da-f]{3}|[\da-f]{4}|[\da-f]{6}|[\da-f]{8})$/i.test(
              companyLogoColor
            )
              ? companyLogoColor
              : '';
            const logo =
              getText(company?.shortName) ||
              (companyName === 'Company unavailable'
                ? '—'
                : companyName.slice(0, 2).toUpperCase());

            return (
              <div key={application.id} className="bg-white rounded-2xl shadow-sm overflow-hidden">
                <div className="p-5 flex flex-col sm:flex-row sm:items-center gap-4">
                  <div
                    className={`relative w-12 h-12 rounded-xl flex items-center justify-center font-bold text-sm shrink-0 ${
                      logoColor ? 'text-white' : 'bg-gray-100 text-gray-600'
                    }`}
                    style={logoColor ? { backgroundColor: logoColor } : undefined}
                  >
                    <span>{logo}</span>
                    {logoUrl && (
                      <img
                        src={logoUrl}
                        alt={`${companyName} logo`}
                        loading="lazy"
                        onError={(event) => {
                          event.currentTarget.style.display = 'none';
                        }}
                        className="absolute inset-0 w-full h-full rounded-xl object-contain bg-white"
                      />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 flex-wrap">
                      <div>
                        <p className="font-semibold text-gray-900">{companyName}</p>
                        <p className="text-gray-500 text-sm">{role}</p>
                      </div>
                      <span
                        className={`text-xs px-2.5 py-1 rounded-full font-medium ${statusConfig.bg} ${statusConfig.text} flex items-center gap-1`}
                      >
                        <StatusIcon className="w-3 h-3" />
                        {getStatusLabel(application.status)}
                      </span>
                    </div>

                    <div className="flex flex-wrap gap-3 mt-2 text-xs text-gray-400">
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        {getText(application.job?.location, 'Location unavailable')}
                      </span>
                      <span className="flex items-center gap-1">
                        <Briefcase className="w-3 h-3" />
                        {ctcText}
                      </span>
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        Applied {formatDate(application.appliedOn)}
                      </span>
                      <span className="font-medium text-blue-600">
                        Current: {getText(application.currentStage, 'Stage unavailable')}
                      </span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      if (isExpanded) {
                        setExpanded(null);
                      } else {
                        setExpanded(application.id);
                        if (details?.status !== 'success' && details?.status !== 'loading') {
                          loadTimeline(application);
                        }
                      }
                    }}
                    aria-expanded={isExpanded}
                    className="flex items-center gap-1 text-blue-600 text-sm hover:underline shrink-0"
                  >
                    {isExpanded ? 'Hide' : 'Timeline'}
                    <ChevronRight
                      className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
                    />
                  </button>
                </div>

                {isExpanded && (
                  <div className="border-t border-gray-100 px-5 py-4 bg-gray-50">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
                      Application Timeline
                    </p>
                    {details?.status === 'loading' ? (
                      <p className="text-sm text-gray-500" role="status">
                        Loading timeline...
                      </p>
                    ) : details?.status === 'error' ? (
                      <div className="text-sm text-gray-500">
                        <p>Unable to load this application timeline.</p>
                        <button
                          type="button"
                          onClick={() => loadTimeline(application)}
                          className="text-blue-600 hover:underline mt-1"
                        >
                          Retry timeline
                        </button>
                      </div>
                    ) : details?.timeline?.length ? (
                      <div className="flex flex-col gap-0">
                        {details.timeline.map((step, index) => {
                          const isLast = index === details.timeline.length - 1;
                          const state = getTimelineState(step.status);
                          let dotColor = 'bg-gray-300';
                          if (state.done) dotColor = 'bg-green-500';
                          if (state.failed) dotColor = 'bg-red-400';
                          if (state.upcoming) dotColor = 'bg-blue-500 ring-2 ring-blue-200';

                          return (
                            <div key={step.id ?? `${step.stageLabel}-${index}`} className="flex items-start gap-3">
                              <div className="flex flex-col items-center">
                                <div className={`w-3 h-3 rounded-full mt-1 shrink-0 ${dotColor}`} />
                                {!isLast && <div className="w-0.5 h-6 bg-gray-200" />}
                              </div>
                              <div className="pb-4">
                                <p
                                  className={`text-sm font-medium ${
                                    state.skipped
                                      ? 'text-gray-300'
                                      : state.failed
                                        ? 'text-red-500'
                                        : state.upcoming
                                          ? 'text-blue-600'
                                          : state.done
                                            ? 'text-gray-800'
                                            : 'text-gray-400'
                                  }`}
                                >
                                  {getText(step.stageLabel, 'Stage unavailable')}
                                  {state.upcoming && (
                                    <span className="ml-2 text-xs bg-blue-100 text-blue-600 px-1.5 py-0.5 rounded">
                                      Upcoming
                                    </span>
                                  )}
                                  {state.failed && (
                                    <span className="ml-2 text-xs bg-red-100 text-red-500 px-1.5 py-0.5 rounded">
                                      Not Cleared
                                    </span>
                                  )}
                                </p>
                                <p className="text-xs text-gray-400 mt-0.5">
                                  {formatDate(step.stageDate)}
                                </p>
                                {getText(step.remarks) && (
                                  <p className="text-xs text-gray-500 mt-1">
                                    {getText(step.remarks)}
                                  </p>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="text-sm text-gray-500">
                        No timeline events are available for this application.
                      </p>
                    )}
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
