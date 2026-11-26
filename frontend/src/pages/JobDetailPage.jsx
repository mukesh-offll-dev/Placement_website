import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft,
  ChevronDown,
  MapPin,
  Clock,
  DollarSign,
  GraduationCap,
  Briefcase,
  Users,
  CheckCircle,
  Calendar,
  Building2,
  Share2,
  Bookmark,
  Send,
  X,
  AlertTriangle,
  Loader2,
} from 'lucide-react';
import { jobService } from '../services/api';
import { submitApplication, getMyApplications, getProfile } from '../services/api/studentService.js';
import EmptyState from '../components/EmptyState';
import { JobDetailSkeleton } from '../components/Skeleton';
import { toastSuccess, toastInfo, toastError } from '../utils/toast';
import { getIneligibilityReasons } from '../utils/jobEligibility';

const EMPLOYMENT_TYPE_LABELS = {
  FULL_TIME: 'Full Time',
  PART_TIME: 'Part Time',
  INTERNSHIP: 'Internship',
  CONTRACT: 'Contract',
};

const JOB_STATUS_LABELS = {
  DRAFT: 'Draft',
  ACTIVE: 'Open',
  CLOSING_SOON: 'Closing Soon',
  CLOSED: 'Closed',
};

const APPLICATION_STATUS_LABELS = {
  APPLIED: 'Applied',
  UNDER_REVIEW: 'Under Review',
  SHORTLISTED: 'Shortlisted',
  INTERVIEW: 'Interview',
  SELECTED: 'Selected',
  REJECTED: 'Rejected',
  WITHDRAWN: 'Withdrawn',
};

const DRIVE_MODE_LABELS = { ONLINE: 'Online', OFFLINE: 'On campus', HYBRID: 'Hybrid' };

const HEX_COLOR = /^#(?:[\da-f]{3}|[\da-f]{4}|[\da-f]{6}|[\da-f]{8})$/i;

/** "2026-11-15" -> Nov 15, 2026, parsed as a local date so it does not shift a day. */
const formatLocalDate = (value) => {
  if (!value || typeof value !== 'string') return null;
  const [y, m, d] = value.slice(0, 10).split('-').map(Number);
  if (!y || !m || !d) return null;
  const date = new Date(y, m - 1, d);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' });
};

const daysUntil = (value) => {
  if (!value || typeof value !== 'string') return null;
  const [y, m, d] = value.slice(0, 10).split('-').map(Number);
  if (!y || !m || !d) return null;
  const end = new Date(y, m - 1, d, 23, 59, 59);
  return (end.getTime() - Date.now()) / (1000 * 60 * 60 * 24);
};

const textList = (value) =>
  Array.isArray(value) ? value.filter((v) => typeof v === 'string' && v.trim()) : [];

/** Maps a JobResponse (see JobResponse.java) onto what this page renders. No invented content. */
const toViewModel = (data) => {
  const companyName = data.company?.name || data.company?.shortName || 'Company';
  const logoColor = HEX_COLOR.test(data.company?.logoColor || '') ? data.company.logoColor : null;
  const rounds = Array.isArray(data.selectionRounds)
    ? [...data.selectionRounds]
        .filter(Boolean)
        .sort((a, b) => (a.roundNumber ?? 0) - (b.roundNumber ?? 0))
    : [];

  return {
    id: data.id,
    company: companyName,
    logo: (data.company?.shortName || companyName.slice(0, 2) || '—').toUpperCase(),
    logoColor,
    logoUrl: data.company?.logoUrl || null,
    about: data.company?.about || null,
    website: data.company?.website || null,
    role: data.jobRole || 'Role not specified',
    cgpa: data.minCgpa != null ? `${data.minCgpa}+` : 'No minimum',
    deadlineRaw: data.applicationDeadline || null,
    deadline: formatLocalDate(data.applicationDeadline) || 'No deadline',
    location: data.location || 'Not specified',
    type: EMPLOYMENT_TYPE_LABELS[data.jobType] || data.jobType || 'Not specified',
    ctc: data.ctcText || (data.ctcValue != null ? String(data.ctcValue) : 'Not disclosed'),
    statusRaw: data.status || null,
    status: JOB_STATUS_LABELS[data.status] || data.status || 'Unknown',
    expired: Boolean(data.expired),
    bond: data.bond || 'None',
    vacancies: data.vacancies != null ? data.vacancies : null,
    backlogsAllowed: data.backlogsAllowed,
    graduationYear: data.graduationYear ?? null,
    eligibleDepartments: textList(data.eligibleDepartments),
    eligibleDegrees: textList(data.eligibleDegrees),
    description: data.jobDescription || null,
    responsibilities: textList(data.responsibilities),
    requirements: textList(data.requirements),
    skills: textList(data.skills),
    perks: textList(data.perks),
    selectionRounds: rounds,
    postedOn: formatLocalDate(data.postedDate) || formatLocalDate(data.createdAt) || null,
    raw: data,
  };
};

export default function JobDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [showApply, setShowApply] = useState(false);
  const [saved, setSaved] = useState(false);
  const [openSections, setOpenSections] = useState({ description: true });
  const [existingApplication, setExistingApplication] = useState(null);
  const [applyStep, setApplyStep] = useState(1);
  const [applyForm, setApplyForm] = useState({ coverLetter: '', consent: false });
  const [submittingApplication, setSubmittingApplication] = useState(false);
  const [applicationError, setApplicationError] = useState('');

  const [job, setJob] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [profile, setProfile] = useState(null);
  const [profileState, setProfileState] = useState('idle');

  useEffect(() => {
    const controller = new AbortController();
    const fetchJob = async () => {
      setLoading(true);
      setError(null);
      setExistingApplication(null);
      setProfileState('loading');
      getProfile()
        .then((profileData) => {
          if (controller.signal.aborted) return;
          setProfile(profileData || null);
          setProfileState(profileData ? 'success' : 'error');
        })
        .catch(() => {
          if (controller.signal.aborted) return;
          setProfile(null);
          setProfileState('error');
        });
      try {
        const [data, applications] = await Promise.all([
          jobService.getJobById(id, { signal: controller.signal }),
          // Whether this student already applied. A failure here must not hide the job: the
          // server still refuses a duplicate application with a clear message.
          getMyApplications({ signal: controller.signal }).catch(() => null),
        ]);
        if (controller.signal.aborted) return;
        if (data) {
          setJob(toViewModel(data));
          const match = Array.isArray(applications)
            ? applications.find((app) => String(app?.job?.id) === String(data.id))
            : null;
          setExistingApplication(match || null);
        } else {
          setJob(null);
          setError('Job drive not found.');
        }
      } catch (err) {
        if (controller.signal.aborted || err?.code === 'ERR_CANCELED') return;
        setJob(null);
        setError(
          err?.status === 404 ? 'Job drive not found.' : err?.message || 'Failed to load job drive.'
        );
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    };

    fetchJob();
    return () => controller.abort();
  }, [id]);

  const openApply = async () => {
    setApplicationError('');
    setApplyStep(1);
    setShowApply(true);
    if (profileState === 'success' || profileState === 'loading') return;
    setProfileState('loading');
    try {
      const data = await getProfile();
      setProfile(data || null);
      setProfileState(data ? 'success' : 'error');
    } catch {
      setProfileState('error');
    }
  };

  const closeApply = () => {
    if (submittingApplication) return;
    setShowApply(false);
    setApplyStep(1);
  };

  const ineligibility = useMemo(
    () => (profile && job ? getIneligibilityReasons(profile, job.raw) : []),
    [profile, job]
  );

  const handleApply = async (e) => {
    e.preventDefault();
    if (applyStep === 1) {
      setApplyStep(2);
      return;
    }

    setSubmittingApplication(true);
    setApplicationError('');
    try {
      const created = await submitApplication({
        jobId: Number(job.id),
        coverLetter: applyForm.coverLetter.trim() || null,
        resumeUrl: null,
        consentGiven: applyForm.consent,
      });
      setExistingApplication(created && typeof created === 'object' ? created : { status: 'APPLIED' });
      setShowApply(false);
      setApplyStep(1);
      toastSuccess(`Application submitted for ${job.role} at ${job.company}!`);
    } catch (err) {
      // 400 = not eligible (the server names the criterion), 409 = already applied.
      const message = err?.message || 'Could not submit your application. Please try again.';
      setApplicationError(message);
      toastError(err, 'Could not submit your application. Please try again.');
      if (err?.status === 409) {
        setExistingApplication((prev) => prev || { status: 'APPLIED' });
      }
    } finally {
      setSubmittingApplication(false);
    }
  };

  if (loading) {
    return <JobDetailSkeleton />;
  }

  if (!job || error) {
    return (
      <main className="flex-1 px-4 md:px-8 py-12 flex items-center justify-center min-h-[60vh]">
        <div className="w-full max-w-md">
          <EmptyState
            type="not-found"
            icon={Briefcase}
            title="Job Drive Not Found"
            description={
              error ||
              `Unable to locate job drive #${id}. The recruitment opening may have expired, closed, or does not exist.`
            }
            action={{
              label: 'Explore Job Drives',
              to: '/student/jobs',
              icon: Briefcase,
            }}
            secondaryAction={{
              label: 'Back to Previous Page',
              onClick: () => navigate(-1),
              icon: ArrowLeft,
            }}
          />
        </div>
      </main>
    );
  }

  const remainingDays = daysUntil(job.deadlineRaw);
  const isClosingSoon =
    job.statusRaw === 'CLOSING_SOON' || (remainingDays !== null && remainingDays >= 0 && remainingDays <= 5);
  const isOpen = !job.expired && (job.statusRaw === 'ACTIVE' || job.statusRaw === 'CLOSING_SOON');
  const applied = Boolean(existingApplication);
  const appliedLabel = APPLICATION_STATUS_LABELS[existingApplication?.status] || 'Applied';
  const canApply = isOpen && !applied;

  const logoStyle = job.logoColor ? { backgroundColor: job.logoColor } : undefined;
  const logoClasses = job.logoColor ? 'text-white' : 'bg-blue-100 text-blue-700';

  return (
    <>
      <main className="flex-1 px-3 md:px-8 py-4 md:py-6 pb-32 md:pb-6 max-w-6xl w-full mx-auto overflow-x-hidden">
        <div className="hidden md:block">
        {/* Back */}
          <button
            onClick={() => navigate('/student/jobs')}
            className="inline-flex items-center gap-1.5 text-[#1D4ED8] text-sm font-bold hover:text-[#1E3A8A] mb-4 min-h-[38px] cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Job Drives
          </button>

          <div className="grid lg:grid-cols-3 gap-5">

            {/* ── LEFT: main content ── */}
            <div className="lg:col-span-2 space-y-5">

              {/* Company header */}
              <div className="bg-white rounded-[22px] shadow-[0_1px_2px_rgba(15,23,42,0.05)] p-5 sm:p-6">
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div className="flex items-center gap-4">
                    <div
                      className={`relative w-16 h-16 rounded-2xl ${logoClasses} flex items-center justify-center font-bold text-xl shrink-0`}
                      style={logoStyle}
                    >
                      {job.logo}
                      {job.logoUrl && (
                        <img
                          src={job.logoUrl}
                          alt={`${job.company} logo`}
                          onError={(event) => {
                            event.currentTarget.style.display = 'none';
                          }}
                          className="absolute inset-0 w-full h-full rounded-2xl object-contain bg-white"
                        />
                      )}
                    </div>
                    <div>
                      <h1 className="text-2xl font-bold text-gray-900">{job.role}</h1>
                      <p className="text-gray-600 font-medium">{job.company}</p>
                      <div className="flex flex-wrap items-center gap-3 mt-2 text-sm text-gray-400">
                        <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" />{job.location}</span>
                        <span className="flex items-center gap-1"><Briefcase className="w-3.5 h-3.5" />{job.type}</span>
                        {job.postedOn && (
                          <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" />Posted {job.postedOn}</span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        const next = !saved;
                        setSaved(next);
                        if (next) {
                          toastSuccess(`Job drive at ${job.company} saved to bookmarks!`);
                        } else {
                          toastInfo(`Job drive at ${job.company} removed from bookmarks.`);
                        }
                      }}
                      className={`p-2 rounded-lg border transition-colors ${saved ? 'border-blue-200 bg-blue-50 text-blue-600' : 'border-gray-200 text-gray-400 hover:border-blue-200 hover:text-blue-600'}`}
                      title="Save job"
                    >
                      <Bookmark className="w-4 h-4" fill={saved ? 'currentColor' : 'none'} />
                    </button>
                    <button
                      onClick={() => {
                        navigator.clipboard?.writeText(window.location.href);
                        toastSuccess('Job link copied to clipboard!');
                      }}
                      className="p-2 rounded-lg border border-gray-200 text-gray-400 hover:border-blue-200 hover:text-blue-600 transition-colors"
                      title="Share"
                    >
                      <Share2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Badges row */}
                <div className="flex flex-wrap gap-2 mt-4">
                  <span
                    className={`text-xs px-3 py-1 rounded-full font-medium ${
                      !isOpen ? 'bg-gray-100 text-gray-600' : isClosingSoon ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'
                    }`}
                  >
                    ● {!isOpen ? (job.expired ? 'Closed' : job.status) : isClosingSoon ? 'Closing Soon' : job.status}
                  </span>
                  <span className="text-xs px-3 py-1 rounded-full bg-blue-50 text-blue-700 font-medium">
                    CTC: {job.ctc}
                  </span>
                  <span className="text-xs px-3 py-1 rounded-full bg-gray-100 text-gray-600">
                    Min CGPA: {job.cgpa}
                  </span>
                  {job.vacancies != null && (
                    <span className="text-xs px-3 py-1 rounded-full bg-purple-50 text-purple-600">
                      {job.vacancies} Vacancies
                    </span>
                  )}
                </div>

                {/* Apply / Applied */}
                <div className="mt-5 flex gap-3 flex-wrap items-center">
                  {applied ? (
                    <Link
                      to="/student/applications"
                      className="flex items-center gap-2 bg-green-50 border border-green-200 text-green-700 px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-green-100"
                    >
                      <CheckCircle className="w-4 h-4" /> Applied · {appliedLabel}
                    </Link>
                  ) : isOpen ? (
                    <button
                      onClick={openApply}
                      className="flex items-center gap-2 bg-blue-600 text-white px-6 py-2.5 rounded-xl text-sm font-semibold hover:bg-blue-700 transition-colors shadow-sm"
                    >
                      <Send className="w-4 h-4" /> Apply Now
                    </button>
                  ) : (
                    <span className="flex items-center gap-2 bg-gray-100 text-gray-500 px-5 py-2.5 rounded-xl text-sm font-semibold">
                      Applications closed
                    </span>
                  )}
                  <span className="flex items-center gap-1 text-sm text-red-500 font-medium">
                    <Clock className="w-4 h-4" /> Deadline: {job.deadline}
                  </span>
                </div>
              </div>

              {/* About company */}
              {job.about && (
                <div className="bg-white rounded-2xl shadow-sm p-6">
                  <h2 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-blue-600" /> About {job.company}
                  </h2>
                  <p className="text-gray-600 text-sm leading-relaxed whitespace-pre-line">{job.about}</p>
                </div>
              )}

              {/* Job description */}
              <div className="bg-white rounded-2xl shadow-sm p-6">
                <h2 className="font-bold text-gray-900 mb-3">Job Description</h2>
                <p className="text-gray-600 text-sm leading-relaxed mb-5 whitespace-pre-line">
                  {job.description || 'The placement cell has not added a description for this drive yet.'}
                </p>

                {job.responsibilities.length > 0 && (
                  <>
                    <h3 className="font-semibold text-gray-800 mb-2 text-sm">Key Responsibilities</h3>
                    <ul className="space-y-2 mb-5">
                      {job.responsibilities.map((r, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-gray-600">
                          <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 shrink-0" />
                          {r}
                        </li>
                      ))}
                    </ul>
                  </>
                )}

                {job.skills.length > 0 && (
                  <>
                    <h3 className="font-semibold text-gray-800 mb-2 text-sm">Skills</h3>
                    <div className="flex flex-wrap gap-1.5">
                      {job.skills.map((s) => (
                        <span key={s} className="bg-gray-100 text-gray-700 text-xs px-2.5 py-1 rounded-lg">
                          {s}
                        </span>
                      ))}
                    </div>
                  </>
                )}
              </div>

              {/* Requirements */}
              <div className="bg-white rounded-2xl shadow-sm p-6">
                <h2 className="font-bold text-gray-900 mb-3">Eligibility & Requirements</h2>
                <ul className="space-y-2">
                  <li className="flex items-start gap-2 text-sm text-gray-600">
                    <span className="w-1.5 h-1.5 bg-blue-600 rounded-full mt-1.5 shrink-0" />
                    Minimum CGPA: {job.cgpa}
                  </li>
                  <li className="flex items-start gap-2 text-sm text-gray-600">
                    <span className="w-1.5 h-1.5 bg-blue-600 rounded-full mt-1.5 shrink-0" />
                    {job.backlogsAllowed ? 'Active backlogs allowed' : 'No active backlogs'}
                  </li>
                  {job.graduationYear && (
                    <li className="flex items-start gap-2 text-sm text-gray-600">
                      <span className="w-1.5 h-1.5 bg-blue-600 rounded-full mt-1.5 shrink-0" />
                      {job.graduationYear} graduating batch
                    </li>
                  )}
                  <li className="flex items-start gap-2 text-sm text-gray-600">
                    <span className="w-1.5 h-1.5 bg-blue-600 rounded-full mt-1.5 shrink-0" />
                    Degrees: {job.eligibleDegrees.length > 0 ? job.eligibleDegrees.join(', ') : 'Open to all degrees'}
                  </li>
                  {job.requirements.map((r, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-gray-600">
                      <span className="w-1.5 h-1.5 bg-blue-600 rounded-full mt-1.5 shrink-0" />
                      {r}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Selection process */}
              {job.selectionRounds.length > 0 && (
                <div className="bg-white rounded-2xl shadow-sm p-6">
                  <h2 className="font-bold text-gray-900 mb-4">Selection Process</h2>
                  <div className="flex flex-col gap-0">
                    {job.selectionRounds.map((round, i) => {
                      const when = formatLocalDate(round.scheduledOn);
                      const mode = DRIVE_MODE_LABELS[round.roundMode] || round.roundMode;
                      return (
                        <div key={round.id ?? i} className="flex items-start gap-3">
                          <div className="flex flex-col items-center">
                            <div className="w-8 h-8 rounded-full bg-blue-600 text-white text-sm font-bold flex items-center justify-center shrink-0">
                              {round.roundNumber ?? i + 1}
                            </div>
                            {i < job.selectionRounds.length - 1 && (
                              <div className="w-0.5 h-6 bg-blue-200" />
                            )}
                          </div>
                          <div className="pb-4 pt-1">
                            <p className="text-sm text-gray-700">{round.roundName || `Round ${i + 1}`}</p>
                            {(mode || when) && (
                              <p className="text-xs text-gray-400 mt-0.5">
                                {[mode, when].filter(Boolean).join(' · ')}
                              </p>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* ── RIGHT: sidebar info ── */}
            <div className="space-y-4">
              {/* Job Summary */}
              <div className="bg-white rounded-2xl shadow-sm p-5">
                <h3 className="font-semibold text-sm mb-4 text-gray-800">Job Overview</h3>
                <div className="space-y-3">
                  {[
                    { icon: DollarSign, label: 'CTC', value: job.ctc, color: 'text-green-600' },
                    { icon: MapPin, label: 'Location', value: job.location },
                    { icon: Briefcase, label: 'Job Type', value: job.type },
                    { icon: GraduationCap, label: 'Min CGPA', value: job.cgpa },
                    {
                      icon: Users,
                      label: 'Vacancies',
                      value: job.vacancies != null ? `${job.vacancies} positions` : 'Not specified',
                    },
                    { icon: Clock, label: 'Bond', value: job.bond },
                    { icon: Calendar, label: 'Deadline', value: job.deadline, color: isClosingSoon ? 'text-red-500' : '' },
                  ].map(({ icon: Icon, label, value, color }) => (
                    <div key={label} className="flex items-start gap-3">
                      <div className="bg-gray-100 p-1.5 rounded-lg shrink-0">
                        <Icon className="w-3.5 h-3.5 text-gray-500" />
                      </div>
                      <div>
                        <p className="text-xs text-gray-400 leading-none mb-0.5">{label}</p>
                        <p className={`text-sm font-medium ${color || 'text-gray-700'}`}>{value}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Eligible Departments */}
              <div className="bg-white rounded-2xl shadow-sm p-5">
                <h3 className="font-semibold text-sm mb-3 text-gray-800">Eligible Departments</h3>
                {job.eligibleDepartments.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {job.eligibleDepartments.map((d) => (
                      <span key={d} className="bg-blue-50 text-blue-700 text-xs px-2.5 py-1 rounded-lg font-medium">
                        {d}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-gray-500">Open to all departments</p>
                )}
              </div>

              {/* Eligible Degrees */}
              <div className="bg-white rounded-2xl shadow-sm p-5">
                <h3 className="font-semibold text-sm mb-3 text-gray-800">Eligible Degrees</h3>
                {job.eligibleDegrees.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {job.eligibleDegrees.map((d) => (
                      <span key={d} className="bg-indigo-50 text-indigo-700 text-xs px-2.5 py-1 rounded-lg font-medium">
                        {d}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-gray-500">Open to all degrees</p>
                )}
              </div>

              {/* Perks */}
              {job.perks.length > 0 && (
                <div className="bg-white rounded-2xl shadow-sm p-5">
                  <h3 className="font-semibold text-sm mb-3 text-gray-800">Perks & Benefits</h3>
                  <div className="space-y-1.5">
                    {job.perks.map((p) => (
                      <div key={p} className="flex items-center gap-2 text-xs text-gray-600">
                        <CheckCircle className="w-3.5 h-3.5 text-green-500 shrink-0" />
                        {p}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Apply CTA */}
              {canApply && (
                <button
                  onClick={openApply}
                  className="w-full bg-blue-600 text-white py-3 rounded-xl font-semibold hover:bg-blue-700 transition-colors text-sm shadow-sm"
                >
                  Apply for this Position
                </button>
              )}
            </div>
          </div>
        </div>

        <section className="md:hidden -mx-3 -mt-4">
          <div className="rounded-b-[26px] bg-[#142f70] px-4 pt-4 pb-14 text-white">
            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={() => navigate('/student/jobs')}
                className="rounded-lg bg-white/10 p-2"
                aria-label="Back to job drives"
              >
                <ArrowLeft className="h-4 w-4" />
              </button>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard?.writeText(window.location.href);
                    toastSuccess('Job link copied to clipboard!');
                  }}
                  className="rounded-lg bg-white/10 p-2"
                  aria-label="Share job"
                >
                  <Share2 className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const next = !saved;
                    setSaved(next);
                    if (next) toastSuccess(`Job drive at ${job.company} saved to bookmarks!`);
                    else toastInfo(`Job drive at ${job.company} removed from bookmarks.`);
                  }}
                  className="rounded-lg bg-white/10 p-2"
                  aria-label={saved ? 'Remove saved job' : 'Save job'}
                >
                  <Bookmark className="h-4 w-4" fill={saved ? 'currentColor' : 'none'} />
                </button>
              </div>
            </div>
            <div className="mt-4 flex items-center gap-3">
              <div
                className={`relative flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white text-xs font-bold ${logoClasses}`}
                style={logoStyle}
              >
                {job.logo}
                {job.logoUrl && (
                  <img
                    src={job.logoUrl}
                    alt={`${job.company} logo`}
                    onError={(event) => {
                      event.currentTarget.style.display = 'none';
                    }}
                    className="absolute inset-0 h-full w-full rounded-xl bg-white object-contain"
                  />
                )}
              </div>
              <div className="min-w-0">
                <p className="text-[11px] text-blue-100">{job.company} · {job.type}</p>
                <h1 className="text-base font-bold leading-5">{job.role}</h1>
              </div>
            </div>
          </div>

          <div className="relative z-10 mx-3 -mt-8 grid grid-cols-2 gap-3 rounded-2xl bg-white p-3.5 shadow-sm">
            {[
              ['Package', job.ctc],
              ['Location', job.location],
              ['Apply by', job.deadline],
              ['Min. CGPA', job.cgpa],
            ].map(([label, value], index) => (
              <div key={label} className={`rounded-xl px-2.5 py-2 ${index === 2 ? 'bg-amber-50' : 'bg-gray-50'}`}>
                <p className="text-[10px] text-gray-500">{label}</p>
                <p className={`text-xs font-bold ${index === 2 ? 'text-amber-800' : 'text-gray-900'}`}>{value}</p>
              </div>
            ))}
          </div>
          {(job.vacancies != null || job.bond !== 'None') && (
            <div className="mx-3 mt-2.5 grid grid-cols-2 gap-3 rounded-xl bg-white px-3.5 py-3 shadow-sm">
              {job.vacancies != null && (
                <div>
                  <p className="text-[10px] text-gray-500">Vacancies</p>
                  <p className="text-xs font-bold text-gray-900">{job.vacancies} positions</p>
                </div>
              )}
              {job.bond !== 'None' && (
                <div>
                  <p className="text-[10px] text-gray-500">Bond</p>
                  <p className="text-xs font-bold text-gray-900">{job.bond}</p>
                </div>
              )}
            </div>
          )}

          <div className={`mx-3 mt-2.5 rounded-2xl border p-3 ${
            profile && ineligibility.length === 0
              ? 'border-emerald-200 bg-emerald-50'
              : profile && ineligibility.length > 0
                ? 'border-amber-200 bg-amber-50'
                : 'border-blue-100 bg-blue-50'
          }`}>
            <div className="flex items-start gap-2">
              <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-emerald-700" />
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold text-gray-900">
                  {profile ? (ineligibility.length ? 'Check your eligibility' : 'You’re eligible') : 'Eligibility criteria'}
                </p>
                {profile && ineligibility.length > 0 ? (
                  <p className="mt-1 text-[10px] leading-4 text-amber-900">{ineligibility[0]}</p>
                ) : (
                  <div className="mt-1 grid grid-cols-2 gap-x-3 text-[10px] leading-4 text-gray-600">
                    <span>CGPA {job.cgpa}</span>
                    <span className="text-right">You: {profile?.cgpa ?? '—'}</span>
                    <span>{job.backlogsAllowed ? 'Backlogs allowed' : 'No active backlogs'}</span>
                    <span className="text-right">Dept: {profile?.departmentCode || '—'}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="mx-3 mt-2.5 space-y-2">
            {[
              {
                id: 'description',
                title: 'Job description',
                content: <p className="whitespace-pre-line text-xs leading-5 text-gray-600">{job.description || 'The placement cell has not added a description for this drive yet.'}</p>,
              },
              ...(job.about ? [{
                id: 'company',
                title: `About ${job.company}`,
                content: <p className="whitespace-pre-line text-xs leading-5 text-gray-600">{job.about}</p>,
              }] : []),
              {
                id: 'requirements',
                title: 'Eligibility & requirements',
                content: (
                  <ul className="space-y-2">
                    <li className="text-xs text-gray-600">Minimum CGPA: {job.cgpa}</li>
                    <li className="text-xs text-gray-600">{job.backlogsAllowed ? 'Active backlogs allowed' : 'No active backlogs'}</li>
                    {job.graduationYear && <li className="text-xs text-gray-600">{job.graduationYear} graduating batch</li>}
                    <li className="text-xs text-gray-600">
                      Departments: {job.eligibleDepartments.length ? job.eligibleDepartments.join(', ') : 'Open to all departments'}
                    </li>
                    <li className="text-xs text-gray-600">
                      Degrees: {job.eligibleDegrees.length ? job.eligibleDegrees.join(', ') : 'Open to all degrees'}
                    </li>
                    {job.requirements.map((requirement, index) => (
                      <li key={index} className="text-xs text-gray-600">{requirement}</li>
                    ))}
                  </ul>
                ),
              },
              {
                id: 'responsibilities',
                title: 'Key responsibilities',
                content: job.responsibilities.length ? (
                  <ul className="space-y-2">
                    {job.responsibilities.map((item, index) => (
                      <li key={index} className="flex gap-2 text-xs leading-5 text-gray-600">
                        <CheckCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600" />{item}
                      </li>
                    ))}
                  </ul>
                ) : <p className="text-xs text-gray-500">No responsibilities listed.</p>,
              },
              {
                id: 'skills',
                title: 'Skills required',
                content: job.skills.length ? (
                  <div className="flex flex-wrap gap-1.5">
                    {job.skills.map((skill) => (
                      <span key={skill} className="rounded-full bg-blue-50 px-2.5 py-1 text-[10px] font-medium text-blue-800">{skill}</span>
                    ))}
                  </div>
                ) : <p className="text-xs text-gray-500">No specific skills listed.</p>,
              },
              {
                id: 'selection',
                title: 'Selection process',
                content: job.selectionRounds.length ? (
                  <div className="space-y-2">
                    {job.selectionRounds.map((round, index) => (
                      <p key={round.id ?? index} className="text-xs text-gray-600">
                        {round.roundNumber ?? index + 1}. {round.roundName || `Round ${index + 1}`}
                        {round.scheduledOn ? ` · ${formatLocalDate(round.scheduledOn)}` : ''}
                      </p>
                    ))}
                  </div>
                ) : <p className="text-xs text-gray-500">Selection details will be shared by the placement cell.</p>,
              },
              {
                id: 'perks',
                title: 'Perks & benefits',
                content: job.perks.length ? (
                  <ul className="space-y-1.5">
                    {job.perks.map((perk) => <li key={perk} className="text-xs text-gray-600">• {perk}</li>)}
                  </ul>
                ) : <p className="text-xs text-gray-500">No perks listed.</p>,
              },
            ].map(({ id: sectionId, title, content }) => (
              <section key={sectionId} className="overflow-hidden rounded-xl bg-white shadow-sm">
                <button
                  type="button"
                  onClick={() => setOpenSections((current) => ({ ...current, [sectionId]: !current[sectionId] }))}
                  aria-expanded={Boolean(openSections[sectionId])}
                  className="flex w-full items-center justify-between px-3.5 py-3 text-left"
                >
                  <span className="text-xs font-bold text-gray-900">{title}</span>
                  <ChevronDown className={`h-3.5 w-3.5 text-gray-500 transition-transform ${openSections[sectionId] ? 'rotate-180' : ''}`} />
                </button>
                {openSections[sectionId] && <div className="border-t border-gray-100 px-3.5 py-3">{content}</div>}
              </section>
            ))}
          </div>

          <div className="mx-3 mt-2.5 rounded-2xl bg-white p-3.5 shadow-sm">
            <h2 className="text-xs font-bold text-gray-900">Open to</h2>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {(job.eligibleDegrees.length ? job.eligibleDegrees : ['All degrees'])
                .concat(job.eligibleDepartments.length ? job.eligibleDepartments : [])
                .map((item) => (
                  <span key={item} className="rounded-full bg-blue-50 px-2.5 py-1 text-[10px] font-medium text-blue-800">{item}</span>
                ))}
            </div>
          </div>
          <div className="h-24" />
        </section>

        <div className="fixed inset-x-0 bottom-[calc(72px+env(safe-area-inset-bottom))] z-30 border-t border-gray-200 bg-white px-4 py-2.5 md:hidden">
          <div className="flex items-center gap-3">
            <div className="min-w-0 flex-1">
              <p className={`text-[10px] ${isClosingSoon ? 'text-red-600' : 'text-gray-500'}`}>
                {remainingDays !== null && remainingDays >= 0 ? `Closes in ${Math.ceil(remainingDays)} days` : 'Application deadline'}
              </p>
              <p className="truncate text-[10px] font-medium text-gray-700">{job.deadline}</p>
            </div>
            {applied ? (
              <Link to="/student/applications" className="inline-flex min-w-32 justify-center rounded-xl bg-emerald-700 px-4 py-2.5 text-xs font-semibold text-white">
                Applied · {appliedLabel}
              </Link>
            ) : canApply ? (
              <button type="button" onClick={openApply} className="inline-flex min-w-32 items-center justify-center gap-1.5 rounded-xl bg-blue-700 px-5 py-2.5 text-xs font-semibold text-white">
                Apply now <ArrowLeft className="h-3.5 w-3.5 rotate-180" />
              </button>
            ) : (
              <span className="inline-flex min-w-32 justify-center rounded-xl bg-gray-200 px-4 py-2.5 text-xs font-semibold text-gray-600">
                Applications closed
              </span>
            )}
          </div>
        </div>
        </main>

      {/* ── Apply Modal ── */}
      {showApply && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden">
            {/* Modal header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <div>
                <h3 className="font-bold text-gray-900">Apply — {job.company}</h3>
                <p className="text-xs text-gray-500 mt-0.5">{job.role} · {job.location}</p>
              </div>
              <button onClick={closeApply} className="p-1 hover:bg-gray-100 rounded-lg transition-colors">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            {/* Step indicator */}
            <div className="flex px-6 pt-4 gap-2">
              {['Review Profile', 'Confirm & Submit'].map((s, i) => (
                <div key={s} className="flex-1">
                  <div className={`h-1 rounded-full ${applyStep > i ? 'bg-blue-600' : 'bg-gray-200'}`} />
                  <p className={`text-xs mt-1 ${applyStep === i + 1 ? 'text-blue-600 font-medium' : 'text-gray-400'}`}>{s}</p>
                </div>
              ))}
            </div>

            <form onSubmit={handleApply} className="px-6 py-4 space-y-4">
              {applicationError && (
                <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg p-3" role="alert">
                  {applicationError}
                </p>
              )}
              {applyStep === 1 ? (
                <>
                  <p className="text-sm text-gray-600">Review your profile before applying. Make sure it&apos;s up to date.</p>
                  {profileState === 'loading' ? (
                    <div className="bg-gray-50 rounded-xl p-4 text-sm text-gray-500 flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" /> Loading your profile…
                    </div>
                  ) : profileState === 'error' || !profile ? (
                    <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-xs text-amber-800">
                      Your profile could not be loaded. You can still apply; the placement cell checks
                      eligibility when you submit.{' '}
                      <Link to="/student/profile" className="underline font-medium">Open my profile</Link>
                    </div>
                  ) : (
                    <>
                      <div className="bg-gray-50 rounded-xl p-4 space-y-3 text-sm">
                        {[
                          ['Name', profile.fullName],
                          ['Register No', profile.rollNo],
                          ['CGPA', profile.cgpa],
                          ['Department', profile.departmentCode || profile.department],
                          ['Degree', profile.degree],
                          ['Batch', profile.batch],
                          ['Email', profile.email],
                        ].map(([label, value]) => (
                          <div key={label} className="flex justify-between gap-3">
                            <span className="text-gray-500">{label}</span>
                            <span className={`font-medium text-right ${label === 'CGPA' ? 'text-blue-600' : ''}`}>
                              {value !== null && value !== undefined && value !== '' ? String(value) : 'Not provided'}
                            </span>
                          </div>
                        ))}
                      </div>
                      {ineligibility.length === 0 ? (
                        <div className="flex items-center gap-2 text-xs text-green-600 bg-green-50 p-3 rounded-xl">
                          <CheckCircle className="w-4 h-4 shrink-0" />
                          Your profile meets the stated criteria for this role.
                        </div>
                      ) : (
                        <div className="flex items-start gap-2 text-xs text-amber-800 bg-amber-50 border border-amber-200 p-3 rounded-xl">
                          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                          <div>
                            <p className="font-semibold mb-1">You may not be eligible:</p>
                            <ul className="list-disc ml-4 space-y-0.5">
                              {ineligibility.map((r) => (
                                <li key={r}>{r}</li>
                              ))}
                            </ul>
                            <p className="mt-1">If your details are wrong, contact the placement cell.</p>
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </>
              ) : (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Cover Letter (optional)</label>
                    <textarea
                      rows={4}
                      placeholder="Why are you interested in this role at this company?"
                      value={applyForm.coverLetter}
                      onChange={(e) => setApplyForm((f) => ({ ...f, coverLetter: e.target.value }))}
                      className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                    />
                  </div>
                  <div className="flex items-start gap-2">
                    <input
                      type="checkbox"
                      id="consent"
                      checked={applyForm.consent}
                      onChange={(e) => setApplyForm((f) => ({ ...f, consent: e.target.checked }))}
                      required
                      className="mt-0.5 accent-blue-600"
                    />
                    <label htmlFor="consent" className="text-xs text-gray-600">
                      I confirm that all information in my profile is accurate and I meet the eligibility requirements for this position.
                    </label>
                  </div>
                </>
              )}

              <div className="flex gap-3 pt-1">
                {applyStep === 2 && (
                  <button type="button" onClick={() => setApplyStep(1)} className="flex-1 border border-gray-300 py-2.5 rounded-xl text-sm hover:bg-gray-50 transition-colors">
                    Back
                  </button>
                )}
                <button
                  type="submit"
                  disabled={submittingApplication || (applyStep === 1 && profileState === 'loading')}
                  className="flex-1 bg-blue-600 text-white py-2.5 rounded-xl text-sm font-semibold hover:bg-blue-700 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {submittingApplication ? 'Submitting…' : applyStep === 1 ? 'Continue →' : 'Submit Application'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
