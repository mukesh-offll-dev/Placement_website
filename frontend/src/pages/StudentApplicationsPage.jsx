import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
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
  Undo2,
  Plus,
  Trophy,
  Hourglass,
  Users,
} from 'lucide-react';
import studentService from '../services/api/studentService.js';
import EmptyState from '../components/EmptyState';
import ConfirmDialog from '../components/ConfirmDialog';
import ApplicationProgress from '../components/ApplicationProgress';
import { ApplicationCardSkeleton } from '../components/Skeleton';
import { toastError, toastSuccess } from '../utils/toast';
import { applicationGroup, summarizeApplications } from '../utils/placement';

const STATUS_LABELS = {
  APPLIED: 'Applied',
  UNDER_REVIEW: 'Under Review',
  SHORTLISTED: 'Shortlisted',
  INTERVIEW: 'Interview',
  REJECTED: 'Rejected',
  SELECTED: 'Selected',
  WITHDRAWN: 'Withdrawn',
};

const STATUS_CONFIG = {
  APPLIED: { bg: 'bg-blue-100', text: 'text-blue-700', icon: FileText },
  UNDER_REVIEW: { bg: 'bg-yellow-100', text: 'text-yellow-700', icon: Clock },
  SHORTLISTED: { bg: 'bg-green-100', text: 'text-green-700', icon: CheckCircle },
  INTERVIEW: { bg: 'bg-purple-100', text: 'text-purple-700', icon: Clock },
  REJECTED: { bg: 'bg-red-100', text: 'text-red-600', icon: XCircle },
  SELECTED: { bg: 'bg-emerald-100', text: 'text-emerald-700', icon: CheckCircle },
  WITHDRAWN: { bg: 'bg-gray-100', text: 'text-gray-600', icon: XCircle },
};

/** Tracker tabs; the active one is kept in ?tab= (default = In progress). */
const TABS = [
  { value: 'IN_PROGRESS', label: 'In progress', countKey: 'inProgress' },
  { value: 'OFFERS', label: 'Offers', countKey: 'offers' },
  { value: 'CLOSED', label: 'Closed', countKey: 'closed' },
  { value: 'ALL', label: 'All', countKey: 'total' },
];
const TAB_VALUES = new Set(TABS.map((t) => t.value));
const TAB_LABELS = Object.fromEntries(TABS.map((t) => [t.value, t.label]));

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

/** Applications in these states are final; anything else can still be withdrawn. */
const NON_WITHDRAWABLE = new Set(['WITHDRAWN', 'REJECTED', 'SELECTED']);
const canWithdraw = (status) => typeof status === 'string' && !NON_WITHDRAWABLE.has(status);

/** Timeline stages in the order the placement cell added them (displayOrder), then by date. */
const sortTimeline = (timeline) =>
  [...(Array.isArray(timeline) ? timeline : [])].sort((a, b) => {
    const orderA = Number.isFinite(a?.displayOrder) ? a.displayOrder : Number.MAX_SAFE_INTEGER;
    const orderB = Number.isFinite(b?.displayOrder) ? b.displayOrder : Number.MAX_SAFE_INTEGER;
    if (orderA !== orderB) return orderA - orderB;
    const dateA = String(a?.stageDate || a?.createdAt || '');
    const dateB = String(b?.stageDate || b?.createdAt || '');
    if (dateA !== dateB) return dateA.localeCompare(dateB);
    return (Number(a?.id) || 0) - (Number(b?.id) || 0);
  });

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
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedTab = searchParams.get('tab');
  const activeTab = TAB_VALUES.has(requestedTab) ? requestedTab : 'IN_PROGRESS';
  const selectTab = (value) =>
    setSearchParams(value === 'IN_PROGRESS' ? {} : { tab: value }, { replace: true });
  const [expanded, setExpanded] = useState(null);
  const [timelineDetails, setTimelineDetails] = useState({});
  const [withdrawTarget, setWithdrawTarget] = useState(null);
  const [withdrawing, setWithdrawing] = useState(false);
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
          [application.id]: { status: 'success', timeline: sortTimeline(detail.timeline) },
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

  const confirmWithdraw = async () => {
    if (!withdrawTarget) return;
    setWithdrawing(true);
    try {
      await studentService.withdrawApplication(withdrawTarget.id);
      toastSuccess('Application withdrawn.');
      setWithdrawTarget(null);
      await loadApplications();
    } catch (err) {
      toastError(err, 'Could not withdraw this application. Please try again.');
    } finally {
      setWithdrawing(false);
    }
  };

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return applications.filter((application) => {
      const company = getText(application.job?.company?.name).toLowerCase();
      const role = getText(application.job?.jobRole).toLowerCase();
      const matchSearch = company.includes(query) || role.includes(query);
      const matchTab = activeTab === 'ALL' || applicationGroup(application.status) === activeTab;
      return matchSearch && matchTab;
    });
  }, [applications, search, activeTab]);

  const stats = useMemo(() => summarizeApplications(applications), [applications]);

  const statValue = (value) =>
    loadState === 'success' ? value : loadState === 'loading' ? '...' : '—';

  return (
    <main className="flex-1 px-4 md:px-8 py-4 md:py-6 max-w-6xl w-full mx-auto overflow-x-hidden">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-5">
        <div>
          <h2 className="text-xl md:text-2xl font-extrabold text-[#0F172A] tracking-tight mb-0.5">
            My Applications
          </h2>
          <p className="text-[#475569] text-sm">
            Follow every drive you’ve applied to, round by round.
          </p>
        </div>
        <Link
          to="/student/jobs"
          className="inline-flex items-center justify-center gap-1.5 bg-[#1D4ED8] text-white px-4 h-[44px] rounded-[14px] text-sm font-bold hover:bg-[#1E3A8A] transition shadow-xs shrink-0"
        >
          <Plus className="w-4 h-4" /> Find more drives
        </Link>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
        {[
          { label: 'Total applied', value: statValue(stats.total), color: 'text-[#0F172A]', icon: FileText, iconBg: 'bg-[#F4F6FB] text-[#475569]' },
          { label: 'In progress', value: statValue(stats.inProgress), color: 'text-[#1D4ED8]', icon: Hourglass, iconBg: 'bg-[#E0EAFF] text-[#1D4ED8]' },
          { label: 'Interviews', value: statValue(stats.interviews), color: 'text-[#0F766E]', icon: Users, iconBg: 'bg-[#E0F2F1] text-[#0F766E]' },
          { label: 'Offers', value: statValue(stats.offers), color: 'text-[#047857]', icon: Trophy, iconBg: 'bg-[#ECFDF5] text-[#047857]' },
        ].map(({ label, value, color, icon: Icon, iconBg }) => (
          <div key={label} className="bg-white rounded-[18px] p-3.5 sm:p-4 shadow-[0_1px_2px_rgba(15,23,42,0.05)] flex items-center gap-3">
            <span className={`w-10 h-10 rounded-[12px] flex items-center justify-center shrink-0 ${iconBg}`}>
              <Icon className="w-5 h-5" />
            </span>
            <div className="min-w-0">
              <p className="text-[12px] text-[#475569] font-medium truncate">{label}</p>
              <p className={`text-[22px] font-extrabold leading-tight ${color}`}>{value}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-[20px] shadow-[0_1px_2px_rgba(15,23,42,0.05)] mb-5 p-3 sm:px-4 sm:py-2.5 flex flex-col sm:flex-row gap-3 sm:items-center justify-between">
        <div role="tablist" aria-label="Application groups" className="flex gap-1.5 overflow-x-auto no-scrollbar flex-1 py-0.5">
          {TABS.map(({ value, label, countKey }) => {
            const active = activeTab === value;
            return (
              <button
                key={value}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => selectTab(value)}
                className={`px-3.5 py-2 rounded-[12px] text-xs sm:text-sm font-bold whitespace-nowrap flex items-center gap-2 transition-colors min-h-[38px] cursor-pointer ${
                  active ? 'bg-[#E0EAFF] text-[#1D4ED8]' : 'text-[#475569] hover:bg-[#F4F6FB] hover:text-[#0F172A]'
                }`}
              >
                {label}
                {loadState === 'success' && (
                  <span className={`text-[11px] px-1.5 py-0.5 rounded-full ${active ? 'bg-[#1D4ED8] text-white' : 'bg-[#F4F6FB] text-[#475569]'}`}>
                    {stats[countKey]}
                  </span>
                )}
              </button>
            );
          })}
        </div>
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#64748B]" />
          <input
            type="text"
            placeholder="Search company or role..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="border-[1.5px] border-[#E2E8F0] pl-9 pr-4 h-[42px] rounded-[14px] text-sm text-[#0F172A] placeholder:text-[#94A3B8] focus:outline-none focus:border-[#1D4ED8] focus:bg-[#F8FAFF] w-full sm:w-56 transition-all"
          />
        </div>
      </div>

      {loadState === 'loading' ? (
        <ApplicationCardSkeleton count={4} />
      ) : loadState === 'error' ? (
        <EmptyState
          type="error"
          title="Unable to load applications"
          description="Could not connect to the placement server. Please check your network connection and try again."
          action={{
            label: 'Retry',
            onClick: loadApplications,
          }}
        />
      ) : applications.length === 0 ? (
        <EmptyState
          type="empty"
          icon={FileText}
          title="No applications submitted yet"
          description="You haven't applied to any job drives yet. Explore active campus drives and apply to positions matching your profile."
          action={{
            label: 'Explore Jobs',
            to: '/student/jobs',
            icon: Briefcase,
          }}
        />
      ) : filtered.length === 0 ? (
        <EmptyState
          type="search"
          title="No matching applications found"
          description={
            search.trim()
              ? `No applications matched "${search}"${activeTab !== 'ALL' ? ` in "${TAB_LABELS[activeTab]}"` : ''}.`
              : `Nothing in "${TAB_LABELS[activeTab]}" right now.`
          }
          action={{
            label: 'Show all applications',
            onClick: () => {
              setSearch('');
              selectTab('ALL');
            },
          }}
        />
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
              <div key={application.id} className="bg-white rounded-[22px] shadow-[0_1px_2px_rgba(15,23,42,0.05)] overflow-hidden">
                <div className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center gap-4">
                  <div
                    className={`relative w-11 h-11 rounded-[14px] flex items-center justify-center font-extrabold text-sm shrink-0 ${
                      logoColor ? 'text-white' : 'bg-[#FFF1E0] text-[#C2410C]'
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

                  <div className="flex items-center gap-3 shrink-0">
                  {canWithdraw(application.status) && (
                    <button
                      type="button"
                      onClick={() => setWithdrawTarget({ id: application.id, companyName, role })}
                      className="flex items-center gap-1 text-red-600 text-sm hover:underline"
                    >
                      <Undo2 className="w-4 h-4" />
                      Withdraw
                    </button>
                  )}
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
                </div>

                <div className="px-5 pb-4 -mt-1">
                  <ApplicationProgress status={application.status} />
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

      <ConfirmDialog
        open={Boolean(withdrawTarget)}
        title="Withdraw application?"
        message={
          withdrawTarget ? (
            <>
              You are withdrawing your application for <strong>{withdrawTarget.role}</strong> at{' '}
              <strong>{withdrawTarget.companyName}</strong>. This cannot be undone and you will not be
              considered for this drive any further.
            </>
          ) : null
        }
        confirmLabel="Withdraw"
        busy={withdrawing}
        onConfirm={confirmWithdraw}
        onCancel={() => setWithdrawTarget(null)}
      />
    </main>
  );
}
