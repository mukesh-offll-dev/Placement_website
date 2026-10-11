import { createElement, useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Briefcase,
  CheckCircle,
  Clock,
  ChevronRight,
  TrendingUp,
  Loader2,
} from 'lucide-react';
import { getUser } from '../services/authService';
import studentService, { getStudentDashboard, getProfile } from '../services/api/studentService.js';

const recentJobs = [
  { id: 1, company: 'Google', role: 'Software Engineer', cgpa: '8.5+', deadline: 'Nov 15, 2026', status: 'Open' },
  { id: 2, company: 'Amazon', role: 'Data Analyst', cgpa: '7.5+', deadline: 'Nov 01, 2026', status: 'Open' },
  { id: 3, company: 'Microsoft', role: 'Cloud Engineer', cgpa: '8.0+', deadline: 'Oct 30, 2026', status: 'Open' },
  { id: 4, company: 'Zoho', role: 'UI/UX Designer', cgpa: '7.0+', deadline: 'Oct 28, 2026', status: 'Closing Soon' },
];

const appStatusStyle = {
  APPLIED: 'bg-blue-100 text-blue-700',
  UNDER_REVIEW: 'bg-yellow-100 text-yellow-700',
  SHORTLISTED: 'bg-green-100 text-green-700',
  REJECTED: 'bg-red-100 text-red-700',
  SELECTED: 'bg-blue-100 text-blue-700',
  WITHDRAWN: 'bg-gray-100 text-gray-700',
};

const appStatusLabel = {
  APPLIED: 'Applied',
  UNDER_REVIEW: 'Under Review',
  SHORTLISTED: 'Shortlisted',
  REJECTED: 'Rejected',
  SELECTED: 'Selected',
  WITHDRAWN: 'Withdrawn',
};

const formatAppliedDate = (value) => {
  if (typeof value !== 'string' || !value.trim()) {
    return 'Date unavailable';
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? 'Date unavailable'
    : date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
};

const getApplicationStatus = (status) => {
  if (typeof status !== 'string' || !status.trim()) {
    return 'Status unavailable';
  }

  return (
    appStatusLabel[status] ||
    status.toLowerCase().replaceAll('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase())
  );
};

const getApplicationStatusStyle = (status) =>
  (typeof status === 'string' && appStatusStyle[status]) || 'bg-gray-100 text-gray-700';

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

  const applicationStats = [
    {
      label: 'Applied',
      value: applications.length,
      icon: CheckCircle,
      color: 'text-green-600',
      bg: 'bg-green-50',
    },
    {
      label: 'Shortlisted',
      value: applications.filter((application) => application.status === 'SHORTLISTED').length,
      icon: TrendingUp,
      color: 'text-purple-600',
      bg: 'bg-purple-50',
    },
    {
      label: 'Pending',
      value: applications.filter(
        (application) =>
          application.status === 'APPLIED' || application.status === 'UNDER_REVIEW'
      ).length,
      icon: Clock,
      color: 'text-yellow-600',
      bg: 'bg-yellow-50',
    },
  ];

  const applicationStatValue = (value) =>
    applicationsState === 'success' ? value : applicationsState === 'loading' ? '...' : '—';

  const recentApplications = applications.slice(0, 2);

  // Header, profile card and the "Jobs Available" tile come from the dashboard
  // summary and the student's profile; the application tiles above are counted
  // from the real applications list rather than estimated from the summary.
  const currentUser = getUser();
  const [stats, setStats] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    const loadDashboard = async () => {
      try {
        const [dashData, profData] = await Promise.allSettled([
          getStudentDashboard(),
          getProfile(),
        ]);

        if (isMounted) {
          if (dashData.status === 'fulfilled') {
            setStats(dashData.value);
          }
          if (profData.status === 'fulfilled') {
            setProfile(profData.value);
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
      <main className="flex-1 px-4 md:px-8 py-12 flex flex-col items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin mb-3" />
        <p className="text-gray-500 text-sm">Loading your dashboard...</p>
      </main>
    );
  }

  const studentName = profile?.fullName || currentUser?.fullName || stats?.studentName || 'Student';
  const activeJobsCount = stats?.activeJobsCount ?? 0;
  const completionPercent = profile?.profileCompletionPercent ?? 0;

  return (
    <main className="flex-1 px-4 md:px-8 py-6 overflow-x-hidden">
      {/* Welcome */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900">
          Welcome back, {studentName}! 👋
        </h2>
        <p className="text-gray-500 text-sm mt-1">Here&apos;s your placement activity summary.</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Jobs Available', value: activeJobsCount, icon: Briefcase, color: 'text-blue-600', bg: 'bg-blue-50' },
          ...applicationStats,
        ].map(({ label, value, icon: StatIcon, color, bg }) => (
          <div key={label} className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
            <div className={`${bg} w-9 h-9 rounded-lg flex items-center justify-center mb-3`}>
              {createElement(StatIcon, { className: `w-5 h-5 ${color}` })}
            </div>
            <p className="text-2xl font-bold text-gray-900">
              {label === 'Jobs Available' ? value : applicationStatValue(value)}
            </p>
            <p className="text-gray-500 text-xs mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Job Listings */}
        <div className="lg:col-span-2">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-bold text-lg text-gray-900">Recent Job Drives</h3>
            <Link to="/student/jobs" className="text-blue-600 text-sm hover:underline flex items-center gap-1 font-medium">
              View all <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
          <div className="space-y-3">
            {recentJobs.map((job) => (
              <div key={job.id} className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="flex gap-3 items-center">
                  <div className="w-11 h-11 bg-blue-100 rounded-lg flex items-center justify-center font-bold text-blue-700 text-sm shrink-0">
                    {job.company.slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <p className="font-semibold text-sm text-gray-900">{job.company}</p>
                    <p className="text-gray-500 text-xs">{job.role} &nbsp;|&nbsp; CGPA: {job.cgpa}</p>
                    <p className="text-gray-400 text-xs">Deadline: {job.deadline}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${job.status === 'Closing Soon' ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'}`}>
                    {job.status}
                  </span>
                  <Link
                    to={`/student/jobs/${job.id}`}
                    className="bg-blue-600 text-white text-xs px-3.5 py-1.5 rounded-lg hover:bg-blue-700 transition font-semibold"
                  >
                    Apply
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Sidebar */}
        <div className="space-y-5">
          {/* Profile Card */}
          <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 text-center">
            <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center text-white text-2xl font-bold mx-auto mb-3 shadow-md">
              {studentName[0]}
            </div>
            <p className="font-bold text-gray-900">{studentName}</p>
            <p className="text-gray-500 text-xs mt-0.5">
              {profile?.degree || 'B.E Computer Science'} &nbsp;·&nbsp; Sem {profile?.semester || 7}
            </p>
            {profile?.cgpa && (
              <p className="text-blue-600 text-sm font-semibold mt-1">CGPA: {profile.cgpa}</p>
            )}
            <div className="w-full bg-gray-100 h-1.5 rounded-full mt-3 mb-1 overflow-hidden">
              <div className="bg-blue-600 h-1.5 rounded-full" style={{ width: `${completionPercent}%` }} />
            </div>
            <p className="text-xs text-gray-400">Profile: {completionPercent}% complete</p>
            <Link
              to="/student/profile"
              className="mt-3 w-full block text-center text-sm font-medium text-blue-600 border border-blue-200 py-2 rounded-xl hover:bg-blue-50 transition"
            >
              View Full Profile
            </Link>
          </div>

          {/* My Applications */}
          <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
            <h3 className="font-semibold text-sm mb-3 text-gray-900">My Applications</h3>
            {applicationsState === 'loading' ? (
              <p className="text-gray-500 text-xs" role="status">Loading applications...</p>
            ) : applicationsState === 'error' ? (
              <div className="text-xs text-gray-500" role="alert">
                <p>Unable to load your applications.</p>
                <button
                  type="button"
                  onClick={loadApplications}
                  className="text-blue-600 hover:underline mt-1"
                >
                  Retry
                </button>
              </div>
            ) : applications.length === 0 ? (
              <p className="text-gray-500 text-xs">You have not applied to any jobs yet.</p>
            ) : (
              <div className="space-y-3">
                {recentApplications.map((application) => (
                  <div key={application.id} className="border-b pb-3 last:border-0 last:pb-0">
                    <p className="font-medium text-sm">
                      {application.job?.company?.name || 'Company unavailable'}
                    </p>
                    <p className="text-gray-500 text-xs">
                      {application.job?.jobRole || 'Role unavailable'}
                    </p>
                    <div className="flex justify-between items-center mt-1 gap-2">
                      <span className="text-gray-400 text-xs">
                        {formatAppliedDate(application.appliedOn)}
                      </span>
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full ${getApplicationStatusStyle(application.status)}`}
                      >
                        {getApplicationStatus(application.status)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
            <Link to="/student/applications" className="block text-center text-xs text-blue-600 mt-3 hover:underline font-medium">
              View all applications →
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
