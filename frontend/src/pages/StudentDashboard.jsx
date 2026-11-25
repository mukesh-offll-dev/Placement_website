import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Briefcase,
  Check,
  Clock,
  ChevronRight,
  FileText,
  ShieldCheck,
  AlertCircle,
  CheckCircle2,
  Sparkles,
} from 'lucide-react';
import { getUser } from '../services/authService';
import studentService, { getStudentDashboard, getProfile } from '../services/api/studentService.js';
import { jobService } from '../services/api';
import EmptyState from '../components/EmptyState';
import { getDraft } from '../services/api/studentDraftService';
import {
  APPLICATION_PIPELINE,
  PIPELINE_LABELS,
  formatCtc,
  isPlaced,
  pipelineIndex,
  summarizeApplications,
} from '../utils/placement';

const JOB_STATUS_LABELS = {
  ACTIVE: 'Open',
  CLOSING_SOON: 'Closing Soon',
  CLOSED: 'Closed',
  DRAFT: 'Draft',
};

const MONOGRAM_THEMES = [
  'bg-[#E0F2F1] text-[#0F766E]',
  'bg-[#E0EAFF] text-[#1D4ED8]',
  'bg-[#FFF1E0] text-[#C2410C]',
  'bg-[#EEF2FF] text-[#1E3A8A]',
];

const appStatusStyle = {
  APPLIED: 'bg-[#EEF2FF] text-[#1D4ED8]',
  UNDER_REVIEW: 'bg-[#FEF3C7] text-[#B45309]',
  SHORTLISTED: 'bg-[#EEF2FF] text-[#1D4ED8]',
  INTERVIEW: 'bg-[#E0EAFF] text-[#1D4ED8]',
  REJECTED: 'bg-red-50 text-red-700',
  SELECTED: 'bg-[#ECFDF5] text-[#047857]',
  WITHDRAWN: 'bg-slate-100 text-[#475569]',
};

const appStatusLabel = {
  APPLIED: 'Applied',
  UNDER_REVIEW: 'Under Review',
  SHORTLISTED: 'Shortlisted',
  INTERVIEW: 'Interview',
  REJECTED: 'Not Selected',
  SELECTED: 'Selected',
  WITHDRAWN: 'Withdrawn',
};

const formatAppliedDate = (value) => {
  if (typeof value !== 'string' || !value.trim()) return 'Date unavailable';
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? 'Date unavailable'
    : date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
};

const getApplicationStatus = (status) => {
  if (typeof status !== 'string' || !status.trim()) return 'Status unavailable';
  return (
    appStatusLabel[status] ||
    status.toLowerCase().replaceAll('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase())
  );
};

const getApplicationStatusStyle = (status) =>
  (typeof status === 'string' && appStatusStyle[status]) || 'bg-slate-100 text-[#475569]';

const getDaysLeftBadge = (deadlineStr, expired, status) => {
  if (expired || status === 'Closed') {
    return { text: 'Closed', cls: 'bg-slate-100 text-[#475569]' };
  }
  if (!deadlineStr) {
    return { text: status || 'Open', cls: 'bg-[#F1F5F9] text-[#475569]' };
  }
  const deadline = new Date(deadlineStr);
  if (Number.isNaN(deadline.getTime())) {
    return { text: status || 'Open', cls: 'bg-[#F1F5F9] text-[#475569]' };
  }
  const diffDays = Math.ceil((deadline.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  if (diffDays < 0) return { text: 'Closed', cls: 'bg-slate-100 text-[#475569]' };
  if (diffDays === 0) return { text: 'Due today', cls: 'bg-[#FEF3C7] text-[#B45309]' };
  if (diffDays <= 20) return { text: `${diffDays}d left`, cls: 'bg-[#FEF3C7] text-[#B45309]' };
  return { text: `${diffDays}d left`, cls: 'bg-[#F1F5F9] text-[#475569]' };
};

export default function StudentDashboard() {
  const [applications, setApplications] = useState([]);
  const [applicationsState, setApplicationsState] = useState('loading');
  const applicationsRequest = useRef(null);

  const loadApplications = useCallback(async () => {
    applicationsRequest.current?.abort();
    const controller = new AbortController();
    applicationsRequest.current = controller;
    setApplicationsState('loading');

    try {
      const result = await studentService.getMyApplications({ signal: controller.signal });
      if (applicationsRequest.current === controller) {
        setApplications(result);
        setApplicationsState('success');
      }
    } catch {
      if (applicationsRequest.current === controller && !controller.signal.aborted) {
        setApplicationsState('error');
      }
    } finally {
      if (applicationsRequest.current === controller) {
        applicationsRequest.current = null;
      }
    }
  }, []);

  useEffect(() => {
    loadApplications();
    return () => applicationsRequest.current?.abort();
  }, [loadApplications]);

  const currentUser = getUser();
  const [stats, setStats] = useState(null);
  const [profile, setProfile] = useState(null);
  const [liveJobs, setLiveJobs] = useState([]);
  const [verification, setVerification] = useState(null);
  const [jobsState, setJobsState] = useState('loading');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    const loadDashboard = async () => {
      try {
        const [dashData, profData, jobsData, draftData] = await Promise.allSettled([
          getStudentDashboard(),
          getProfile(),
          jobService.getJobs({ page: 0, size: 6 }),
          getDraft(),
        ]);

        if (isMounted) {
          if (dashData.status === 'fulfilled') {
            setStats(dashData.value);
          }
          if (profData.status === 'fulfilled') {
            setProfile(profData.value);
          }
          if (draftData.status === 'fulfilled' && draftData.value) {
            setVerification(draftData.value);
          }
          const rawList =
            jobsData.status !== 'fulfilled'
              ? null
              : Array.isArray(jobsData.value)
              ? jobsData.value
              : Array.isArray(jobsData.value?.content)
              ? jobsData.value.content
              : null;
          if (!rawList) {
            setJobsState('error');
          } else {
            setJobsState('success');
            setLiveJobs(
              rawList.map((j) => {
                const companyName =
                  j.company?.name ||
                  j.company?.shortName ||
                  (typeof j.company === 'string' ? j.company : 'Company');
                const ctcRaw = j.ctcText || (j.ctcValue ? formatCtc(j.ctcValue) : null);
                const ctc = ctcRaw ? String(ctcRaw).replace(/^₹\s*/, '') : 'CTC TBD';
                const status = j.expired ? 'Closed' : JOB_STATUS_LABELS[j.status] || j.status || 'Open';
                const badge = getDaysLeftBadge(j.applicationDeadline, j.expired, status);
                return {
                  id: j.id,
                  company: companyName,
                  monogram: companyName.slice(0, 2).toUpperCase(),
                  role: j.jobRole || j.role || 'Job Opening',
                  location: j.location || 'Campus Drive',
                  ctc,
                  minCgpa: j.minCgpa,
                  status,
                  badge,
                };
              })
            );
          }
        }
      } catch {
        // Fallback to local user
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    loadDashboard();
    return () => {
      isMounted = false;
    };
  }, []);

  if (loading) {
    return (
      <main className="flex-1 w-full max-w-5xl mx-auto px-4 sm:px-5 md:px-8 pt-2 pb-6 overflow-x-hidden animate-pulse">
        <div className="h-[148px] sm:h-[156px] rounded-[20px] sm:rounded-[24px] bg-[#0F2A6B]/15" />
        <div className="grid grid-cols-3 gap-2 sm:gap-3.5 mt-3.5 sm:mt-4">
          <div className="h-[68px] sm:h-[74px] rounded-[16px] sm:rounded-[18px] bg-white" />
          <div className="h-[68px] sm:h-[74px] rounded-[16px] sm:rounded-[18px] bg-white" />
          <div className="h-[68px] sm:h-[74px] rounded-[16px] sm:rounded-[18px] bg-white" />
        </div>
        <div className="h-[64px] rounded-[16px] sm:rounded-[18px] bg-white mt-3.5 sm:mt-4" />
        <div className="h-[156px] rounded-[20px] sm:rounded-[22px] bg-white mt-5 sm:mt-6" />
        <div className="h-[124px] rounded-[20px] sm:rounded-[22px] bg-white mt-5 sm:mt-6" />
      </main>
    );
  }

  const studentName = profile?.fullName || currentUser?.fullName || stats?.studentName || 'Student';
  const activeJobsCount = stats?.activeJobsCount ?? liveJobs.length ?? 0;
  const completionPercent = profile?.profileCompletionPercent ?? 0;
  const appSummary = summarizeApplications(applications);
  const placed = isPlaced(profile?.placementStatus);
  const placedCtc = formatCtc(profile?.placedCtc);
  const recentApplications = applications.slice(0, 3);
  const studentCgpa = profile?.cgpa != null ? Number(profile.cgpa) : null;

  const statValue = (val) =>
    applicationsState === 'success' ? val : applicationsState === 'loading' ? '…' : '—';

  const vStatus = verification
    ? verification.status === 'PENDING'
      ? 'PENDING'
      : verification.profileVerificationStatus || 'NOT_SUBMITTED'
    : null;

  const verificationBannerConfig = {
    PENDING: {
      wrap: 'bg-[#FFF7E6] border-[#FCD9A0] text-[#0F172A]',
      iconBox: 'bg-[#FDE7BF] text-[#92400E]',
      subColor: 'text-[#7C4A03]',
      arrowColor: 'text-[#7C4A03]',
      Icon: Clock,
      title: 'Profile under review',
      subtitle: 'Personal details · sent to your advisor',
      to: '/student/verification',
    },
    REJECTED: {
      wrap: 'bg-red-50 border-red-200 text-[#0F172A]',
      iconBox: 'bg-red-100 text-red-700',
      subColor: 'text-red-700',
      arrowColor: 'text-red-700',
      Icon: AlertCircle,
      title: 'Advisor requested changes',
      subtitle: 'Review feedback, edit profile & resubmit',
      to: '/student/verification',
    },
    VERIFIED: {
      wrap: 'bg-[#ECFDF5] border-[#A7F3D0] text-[#0F172A]',
      iconBox: 'bg-[#D1FAE5] text-[#047857]',
      subColor: 'text-[#047857]',
      arrowColor: 'text-[#047857]',
      Icon: CheckCircle2,
      title: 'Profile verified',
      subtitle: 'Approved by your faculty advisor',
      to: '/student/verification',
    },
    NOT_SUBMITTED: {
      wrap: 'bg-[#F1F5FF] border-[#C7D2FE] text-[#0F172A]',
      iconBox: 'bg-[#E0EAFF] text-[#1D4ED8]',
      subColor: 'text-[#1E3A8A]',
      arrowColor: 'text-[#1D4ED8]',
      Icon: ShieldCheck,
      title: 'Verify your profile',
      subtitle: 'Complete & submit details for advisor review',
      to: '/student/profile',
    },
  };

  const vBanner = vStatus ? verificationBannerConfig[vStatus] || verificationBannerConfig.NOT_SUBMITTED : null;

  const drivesGridCols =
    liveJobs.length === 1
      ? 'grid-cols-1'
      : liveJobs.length === 2
      ? 'grid-cols-1 sm:grid-cols-2'
      : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3';

  const appsGridCols =
    recentApplications.length === 1
      ? 'grid-cols-1'
      : recentApplications.length === 2
      ? 'grid-cols-1 md:grid-cols-2'
      : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3';

  return (
    <main className="flex-1 w-full max-w-5xl mx-auto px-4 sm:px-5 md:px-8 pt-2 md:pt-5 pb-6 overflow-x-hidden">
      {/* Desktop Welcome Header */}
      <div className="hidden md:flex items-center justify-between gap-4 mb-5">
        <div className="min-w-0">
          <h1 className="text-2xl font-extrabold text-[#0F172A] tracking-tight truncate">
            Welcome back, {studentName}
          </h1>
          <p className="text-sm text-[#475569] mt-0.5">
            Track your placement status, open drives, and application progress.
          </p>
        </div>
        <Link
          to="/student/profile"
          className="inline-flex items-center gap-1.5 bg-white hover:bg-slate-50 text-[#0F172A] text-xs font-bold px-4 py-2.5 rounded-[14px] border border-[#E2E8F0] shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition-colors shrink-0"
        >
          View My Profile <ChevronRight className="w-4 h-4 text-[#64748B]" />
        </Link>
      </div>

      {/* 1. Deep Navy Hero Placement Card */}
      <section
        aria-label="Placement status"
        className="w-full rounded-[20px] sm:rounded-[24px] bg-[#0F2A6B] text-white p-4 sm:p-5 relative overflow-hidden shadow-[0_2px_8px_rgba(15,42,107,0.14)]"
      >
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-10 -top-10 w-36 h-36 sm:w-40 sm:h-40 rounded-full border-[24px] sm:border-[28px] border-[rgba(245,179,1,0.18)]"
        />
        {placed ? (
          <div className="relative z-10 min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-[5px] rounded-full bg-[#F5B301] text-[#1F1500] text-[11px] sm:text-[12px] font-bold leading-none">
                <Check className="w-3.5 h-3.5" strokeWidth={2.4} aria-hidden="true" />
                Placed
              </span>
              {profile?.placedDate && (
                <span className="text-[11px] sm:text-[12px] text-[#C7D2FE]">
                  Recorded {formatAppliedDate(profile.placedDate)}
                </span>
              )}
            </div>
            <p className="mt-3 text-[20px] sm:text-[24px] font-extrabold tracking-[-0.3px] leading-tight break-words">
              {profile?.placedCompanyName || 'Offer Recorded'}
            </p>
            <p className="mt-0.5 text-[13px] sm:text-[14px] text-[#DBE4FF] break-words">
              {[profile?.placedRole, placedCtc].filter(Boolean).join(' · ') || 'Placement confirmed'}
            </p>
            <p className="mt-3 text-[12px] sm:text-[13px] text-[#C7D2FE] leading-[1.5]">
              You can still apply to other drives you’re eligible for.
            </p>
          </div>
        ) : (
          <div className="relative z-10 min-w-0">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-[5px] rounded-full bg-[#F5B301] text-[#1F1500] text-[11px] sm:text-[12px] font-bold leading-none shrink-0">
                <Sparkles className="w-3.5 h-3.5" strokeWidth={2.2} aria-hidden="true" />
                Placement Ready
              </span>
              <div className="flex flex-wrap items-center gap-1.5 text-[11px] sm:text-[12px] font-semibold">
                {profile?.cgpa != null && (
                  <span className="bg-white/15 px-2.5 py-0.5 rounded-full text-white whitespace-nowrap">
                    CGPA {profile.cgpa}
                  </span>
                )}
                {profile?.semester && (
                  <span className="bg-white/15 px-2.5 py-0.5 rounded-full text-white whitespace-nowrap">
                    Sem {profile.semester}
                  </span>
                )}
              </div>
            </div>

            <p className="mt-3 text-[18px] sm:text-[22px] font-extrabold tracking-[-0.3px] leading-snug break-words">
              {profile?.degree || 'Your Placement Journey'}
            </p>
            <p className="mt-0.5 text-[12px] sm:text-[13px] text-[#DBE4FF] leading-snug break-words">
              {profile?.department || 'Explore open drives and keep your profile verified'}
            </p>

            <div className="mt-3.5 sm:mt-4">
              <div className="flex items-center justify-between text-[11px] sm:text-[12px] text-[#C7D2FE] mb-1.5">
                <span>Profile completion</span>
                <span className="font-bold text-white">{completionPercent}%</span>
              </div>
              <div className="w-full h-1.5 rounded-full bg-white/15 overflow-hidden">
                <div
                  className="h-full rounded-full bg-[#F5B301] transition-all duration-500"
                  style={{ width: `${Math.min(100, Math.max(0, completionPercent))}%` }}
                />
              </div>
            </div>
          </div>
        )}
      </section>

      {/* 2. Three Summary Tiles (Applied · In progress · Offers) */}
      <section aria-label="Summary" className="grid grid-cols-3 gap-2 sm:gap-3.5 mt-3.5 sm:mt-4 w-full">
        <Link
          to="/student/applications?tab=ALL"
          className="min-w-0 bg-white rounded-[16px] sm:rounded-[18px] px-2.5 py-3 sm:p-4 text-[#0F172A] shadow-[0_1px_2px_rgba(15,23,42,0.05)] hover:shadow-md active:scale-[0.98] transition-all flex flex-col justify-between"
        >
          <p className="text-[20px] sm:text-[24px] font-extrabold leading-tight">{statValue(appSummary.total)}</p>
          <p className="mt-0.5 text-[11px] sm:text-[12px] text-[#475569] font-medium whitespace-nowrap truncate">
            Applied
          </p>
        </Link>
        <Link
          to="/student/applications?tab=IN_PROGRESS"
          className="min-w-0 bg-white rounded-[16px] sm:rounded-[18px] px-2.5 py-3 sm:p-4 text-[#0F172A] shadow-[0_1px_2px_rgba(15,23,42,0.05)] hover:shadow-md active:scale-[0.98] transition-all flex flex-col justify-between"
        >
          <p className="text-[20px] sm:text-[24px] font-extrabold leading-tight text-[#1D4ED8]">
            {statValue(appSummary.inProgress)}
          </p>
          <p className="mt-0.5 text-[11px] sm:text-[12px] text-[#475569] font-medium whitespace-nowrap truncate">
            In progress
          </p>
        </Link>
        <Link
          to="/student/applications?tab=OFFERS"
          className="min-w-0 bg-white rounded-[16px] sm:rounded-[18px] px-2.5 py-3 sm:p-4 text-[#0F172A] shadow-[0_1px_2px_rgba(15,23,42,0.05)] hover:shadow-md active:scale-[0.98] transition-all flex flex-col justify-between"
        >
          <p className="text-[20px] sm:text-[24px] font-extrabold leading-tight text-[#047857]">
            {statValue(appSummary.offers)}
          </p>
          <p className="mt-0.5 text-[11px] sm:text-[12px] text-[#475569] font-medium whitespace-nowrap truncate">
            Offers
          </p>
        </Link>
      </section>

      {/* 3. Profile Verification Alert Banner */}
      {vBanner && (
        <Link
          to={vBanner.to}
          className={`w-full mt-3.5 sm:mt-4 px-3.5 py-3 sm:px-4 sm:py-3.5 rounded-[16px] sm:rounded-[18px] border flex items-center gap-3 active:scale-[0.99] transition-all min-w-0 ${vBanner.wrap}`}
        >
          <span className={`w-9 h-9 sm:w-10 sm:h-10 rounded-[12px] flex items-center justify-center shrink-0 ${vBanner.iconBox}`}>
            <vBanner.Icon className="w-[18px] h-[18px] sm:w-5 sm:h-5" strokeWidth={1.9} aria-hidden="true" />
          </span>
          <span className="flex-1 min-w-0">
            <span className="block text-[13px] sm:text-[14px] font-bold leading-snug break-words">
              {vBanner.title}
            </span>
            <span className={`block text-[11px] sm:text-[12px] mt-0.5 leading-snug break-words ${vBanner.subColor}`}>
              {vBanner.subtitle}
            </span>
          </span>
          <ChevronRight className={`w-[18px] h-[18px] shrink-0 ${vBanner.arrowColor}`} aria-hidden="true" />
        </Link>
      )}

      {/* 4. Open Drives For You (100% viewport-fitting responsive grid — zero horizontal overflow or cut-off) */}
      <section aria-label="Open drives for you" className="mt-5 sm:mt-6 w-full">
        <div className="flex items-baseline justify-between gap-2 mb-3">
          <h2 className="text-[16px] sm:text-[18px] font-bold text-[#0F172A] min-w-0">
            Open drives for you
          </h2>
          <Link
            to="/student/jobs"
            className="text-[13px] font-semibold text-[#1D4ED8] hover:text-[#1E3A8A] transition-colors shrink-0 py-1 pl-2"
          >
            See all{activeJobsCount > 0 ? ` ${activeJobsCount}` : ''}
          </Link>
        </div>

        {jobsState === 'error' ? (
          <EmptyState
            type="error"
            title="Could not load job drives"
            description="The list of open drives could not be fetched right now."
            action={{
              label: 'Browse Jobs Page',
              to: '/student/jobs',
              icon: Briefcase,
            }}
          />
        ) : liveJobs.length === 0 ? (
          <EmptyState
            type="empty"
            icon={Briefcase}
            title="No active job drives yet"
            description="There are currently no active campus recruitment drives posted. Check back soon."
            action={{
              label: 'Browse Jobs Page',
              to: '/student/jobs',
              icon: Briefcase,
            }}
          />
        ) : (
          <div className={`grid gap-3 w-full ${drivesGridCols}`}>
            {liveJobs.map((job, idx) => {
              const theme = MONOGRAM_THEMES[idx % MONOGRAM_THEMES.length];
              const isEligible =
                job.minCgpa == null || (studentCgpa != null && studentCgpa >= Number(job.minCgpa));
              const secondChip =
                job.minCgpa == null
                  ? { label: 'Open CGPA', cls: 'bg-[#ECFDF5] text-[#047857]' }
                  : isEligible
                  ? { label: 'Eligible', cls: 'bg-[#ECFDF5] text-[#047857]' }
                  : { label: `${job.minCgpa}+ CGPA`, cls: 'bg-slate-100 text-[#475569]' };

              return (
                <Link
                  key={job.id}
                  to={`/student/jobs/${job.id}`}
                  className="w-full min-w-0 bg-white rounded-[20px] sm:rounded-[22px] p-4 text-[#0F172A] shadow-[0_1px_2px_rgba(15,23,42,0.05)] hover:shadow-md active:scale-[0.98] transition-all flex flex-col justify-between"
                >
                  <div className="min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span
                        className={`w-10 h-10 sm:w-11 sm:h-11 rounded-[12px] sm:rounded-[14px] font-extrabold flex items-center justify-center text-[14px] sm:text-[15px] shrink-0 ${theme}`}
                      >
                        {job.monogram}
                      </span>
                      <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full leading-none shrink-0 ${job.badge.cls}`}>
                        {job.badge.text}
                      </span>
                    </div>
                    <p className="mt-3 text-[15px] sm:text-[16px] font-bold text-[#0F172A] leading-snug truncate">
                      {job.role}
                    </p>
                    <p className="mt-0.5 text-[12px] sm:text-[13px] text-[#475569] truncate">
                      {job.company} · {job.location}
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-1.5 mt-3">
                    <span className="text-[11px] sm:text-[12px] font-semibold bg-[#EEF2FF] text-[#1E3A8A] px-[9px] py-[5px] rounded-[8px] leading-none">
                      {job.ctc}
                    </span>
                    <span className={`text-[11px] sm:text-[12px] font-semibold px-[9px] py-[5px] rounded-[8px] leading-none ${secondChip.cls}`}>
                      {secondChip.label}
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </section>

      {/* 5. Track Applications (5-Segment Progress Tracker) */}
      <section aria-label="Track applications" className="mt-5 sm:mt-6 w-full">
        <div className="flex items-baseline justify-between gap-2 mb-3">
          <h2 className="text-[16px] sm:text-[18px] font-bold text-[#0F172A] min-w-0">
            Track applications
          </h2>
          <Link
            to="/student/applications"
            className="text-[13px] font-semibold text-[#1D4ED8] hover:text-[#1E3A8A] transition-colors shrink-0 py-1 pl-2"
          >
            View all
          </Link>
        </div>

        {applicationsState === 'loading' ? (
          <div className="bg-white rounded-[20px] sm:rounded-[22px] p-4 text-sm text-[#64748B]" role="status">
            Loading applications...
          </div>
        ) : applicationsState === 'error' ? (
          <EmptyState
            type="error"
            title="Unable to load applications"
            description="Failed to fetch your application status."
            action={{
              label: 'Retry',
              onClick: loadApplications,
            }}
            compact
          />
        ) : applications.length === 0 ? (
          <EmptyState
            type="empty"
            icon={FileText}
            title="No applications yet"
            description="You haven't applied to any drives yet. Explore open drives above!"
            action={{
              label: 'Explore Drives',
              to: '/student/jobs',
              icon: Briefcase,
            }}
            compact
          />
        ) : (
          <div className={`grid gap-3 w-full ${appsGridCols}`}>
            {recentApplications.map((application, idx) => {
              const company = application.job?.company?.name || 'Company';
              const roleTitle = application.job?.jobRole || 'Role';
              const location = application.job?.location || formatAppliedDate(application.appliedOn);
              const idxOnPipeline = pipelineIndex(application.status);
              const isFinalBad = application.status === 'REJECTED' || application.status === 'WITHDRAWN';
              const stepNum = idxOnPipeline >= 0 ? idxOnPipeline + 1 : 0;
              const nextStepLabel =
                idxOnPipeline >= 0 && idxOnPipeline < APPLICATION_PIPELINE.length - 1
                  ? PIPELINE_LABELS[APPLICATION_PIPELINE[idxOnPipeline + 1]]
                  : null;
              const theme = MONOGRAM_THEMES[(idx + 2) % MONOGRAM_THEMES.length];

              return (
                <Link
                  key={application.id}
                  to="/student/applications"
                  className="block w-full min-w-0 bg-white rounded-[20px] sm:rounded-[22px] p-4 text-[#0F172A] shadow-[0_1px_2px_rgba(15,23,42,0.05)] hover:shadow-md active:scale-[0.99] transition-all"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span
                      className={`w-10 h-10 sm:w-11 sm:h-11 rounded-[12px] sm:rounded-[14px] font-extrabold flex items-center justify-center text-[14px] sm:text-[15px] shrink-0 ${theme}`}
                    >
                      {company.slice(0, 2).toUpperCase()}
                    </span>
                    <span className="flex-1 min-w-0">
                      <span className="block text-[14px] sm:text-[15px] font-bold text-[#0F172A] truncate leading-snug">
                        {roleTitle}
                      </span>
                      <span className="block text-[12px] sm:text-[13px] text-[#475569] truncate leading-snug">
                        {company} · {location}
                      </span>
                    </span>
                    <span
                      className={`text-[11px] sm:text-[12px] font-bold px-2.5 py-[5px] rounded-full leading-none shrink-0 max-w-[110px] truncate ${getApplicationStatusStyle(
                        application.status
                      )}`}
                    >
                      {getApplicationStatus(application.status)}
                    </span>
                  </div>

                  {!isFinalBad ? (
                    <>
                      <div className="grid grid-cols-5 gap-1 mt-3.5" aria-hidden="true">
                        {APPLICATION_PIPELINE.map((step, sIdx) => (
                          <span
                            key={step}
                            className={`h-1.5 rounded-[3px] transition-colors ${
                              sIdx < stepNum ? 'bg-[#1D4ED8]' : 'bg-[#E2E8F0]'
                            }`}
                          />
                        ))}
                      </div>
                      <p className="mt-2 text-[11px] sm:text-[12px] text-[#475569]">
                        Step {stepNum} of {APPLICATION_PIPELINE.length}
                        {nextStepLabel ? ` · Next: ${nextStepLabel}` : ' · Completed'}
                      </p>
                    </>
                  ) : (
                    <p className="mt-3 text-[11px] sm:text-[12px] text-[#64748B]">
                      Applied {formatAppliedDate(application.appliedOn)} · Tap to view timeline
                    </p>
                  )}
                </Link>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}
