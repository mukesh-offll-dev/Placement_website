import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  Bell,
  UserCheck,
  Send,
  TrendingUp,
  Briefcase,
  Users,
  FolderGit2,
  Building2,
  FileCheck,
  RefreshCw,
  AlertCircle,
  Loader2,
  ArrowRight,
  Sparkles,
} from 'lucide-react';
import { getDashboardStats } from '../services/api/adminService';
import AdminApplicationManagement from '../components/AdminApplicationManagement';

function formatTimeAgo(dateString) {
  if (!dateString) return 'Recently';
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return String(dateString);
  const diffSec = Math.floor((Date.now() - date.getTime()) / 1000);
  if (diffSec < 60) return 'Just now';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d ago`;
}

export default function AdminDashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchStats = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getDashboardStats();
      setStats(data);
    } catch (err) {
      console.error('Failed to load admin dashboard stats:', err);
      setError(
        err.message || 'Unable to load real-time dashboard data. Please verify your connection.'
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  const jobs = stats?.recentJobs || [];
  const totalStudents = stats?.totalStudents ?? 0;
  const totalProjects = stats?.totalProjects ?? 0;
  const totalCompanies = stats?.totalCompanies ?? 0;
  const totalApplications = stats?.totalApplications ?? 0;
  const totalActiveJobs = stats?.totalActiveJobs ?? 0;
  const totalPlaced = stats?.totalPlaced ?? 0;
  const placementRate = stats?.placementPercentage ?? 0;
  const jobsPostedThisWeek = stats?.jobsPostedThisWeek ?? 0;
  const applicationsToday = stats?.applicationsToday ?? 0;

  const WEEKLY_TARGET = 10;
  const weeklyProgress = Math.min((jobsPostedThisWeek / WEEKLY_TARGET) * 100, 100);

  return (
    <main className="flex-1 px-4 md:px-8 py-6 overflow-x-hidden">
      {/* Page Title & Refresh */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
        <div>
          <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-gray-900">
            Admin Dashboard Overview
          </h2>
          <p className="text-gray-500 text-sm mt-0.5">
            Real-time live placement metrics and student activity.
          </p>
        </div>
        <button
          onClick={fetchStats}
          disabled={loading}
          className="inline-flex items-center gap-2 bg-white hover:bg-gray-50 text-gray-700 text-xs font-semibold px-3.5 py-2 rounded-xl border border-gray-200 shadow-xs transition-colors self-start sm:self-auto disabled:opacity-60"
          title="Refresh dashboard data"
        >
          <RefreshCw className={`w-3.5 h-3.5 text-blue-600 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh Data</span>
        </button>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="flex items-start justify-between gap-3 bg-red-50 border border-red-200 text-red-700 text-sm p-4 rounded-xl mb-6 shadow-xs">
          <div className="flex items-start gap-2.5">
            <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-red-800">Error loading dashboard statistics</p>
              <p className="text-xs text-red-600 mt-0.5">{error}</p>
            </div>
          </div>
          <button
            onClick={fetchStats}
            className="text-xs font-semibold bg-red-100 hover:bg-red-200 text-red-800 px-3 py-1.5 rounded-lg transition-colors shrink-0"
          >
            Retry
          </button>
        </div>
      )}

      {/* Loading Skeleton / State */}
      {loading && !stats && (
        <div className="py-20 flex flex-col items-center justify-center text-gray-400">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600 mb-3" />
          <p className="text-sm font-medium">Fetching real backend statistics...</p>
        </div>
      )}

      {/* Real Statistics Grid */}
      {(!loading || stats) && (
        <>
          {/* Top 4 Primary Metric Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {/* Total Students */}
            <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Total Students
                </span>
                <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                  <Users className="w-4 h-4" />
                </div>
              </div>
              <p className="text-3xl font-extrabold text-gray-900 tracking-tight">{totalStudents}</p>
              <p className="text-xs text-blue-600 font-medium mt-1.5 flex items-center gap-1">
                <UserCheck className="w-3.5 h-3.5" />
                <span>{totalPlaced} Placed ({placementRate}%)</span>
              </p>
            </div>

            {/* Total Projects */}
            <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Total Projects
                </span>
                <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
                  <FolderGit2 className="w-4 h-4" />
                </div>
              </div>
              <p className="text-3xl font-extrabold text-gray-900 tracking-tight">{totalProjects}</p>
              <p className="text-xs text-indigo-600 font-medium mt-1.5 flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Active student portfolios</span>
              </p>
            </div>

            {/* Total Jobs & Companies */}
            <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Jobs & Companies
                </span>
                <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
                  <Briefcase className="w-4 h-4" />
                </div>
              </div>
              <div className="flex items-baseline gap-2">
                <p className="text-3xl font-extrabold text-emerald-600 tracking-tight">
                  {totalActiveJobs}
                </p>
                <span className="text-xs font-medium text-gray-400">
                  / {totalCompanies} Companies
                </span>
              </div>
              <p className="text-xs text-emerald-600 font-medium mt-1.5 flex items-center gap-1">
                <Building2 className="w-3.5 h-3.5" />
                <span>{jobsPostedThisWeek} posted this week</span>
              </p>
            </div>

            {/* Total Applications */}
            <Link
              to="/admin/applications"
              className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 hover:shadow-md hover:border-blue-200 transition-all group block"
              title="Click to view all student applications"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-gray-500 uppercase tracking-wider group-hover:text-blue-600 transition-colors">
                  Applications
                </span>
                <div className="p-2 bg-amber-50 text-amber-600 rounded-lg group-hover:bg-blue-50 group-hover:text-blue-600 transition-colors">
                  <FileCheck className="w-4 h-4" />
                </div>
              </div>
              <p className="text-3xl font-extrabold text-gray-900 tracking-tight">
                {totalApplications}
              </p>
              <p className="text-xs text-amber-600 font-medium mt-1.5 flex items-center gap-1">
                <Send className="w-3.5 h-3.5" />
                <span>{applicationsToday} submitted today • Manage →</span>
              </p>
            </Link>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Real Job Feed */}
            <div className="lg:col-span-2">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                  <Briefcase className="w-5 h-5 text-blue-600" />
                  Recent Job Activity Feed
                </h3>
                <Link
                  to="/admin/jobs"
                  className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1 transition-colors"
                >
                  View all drives <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>

              {jobs.length === 0 ? (
                <div className="bg-white rounded-xl p-10 text-center text-gray-400 border border-gray-100 shadow-sm">
                  <Briefcase className="w-10 h-10 mx-auto text-gray-300 mb-2" />
                  <p className="font-medium text-gray-700">No active job drives yet</p>
                  <p className="text-xs text-gray-400 mt-1">
                    Newly posted campus recruitment drives will appear in real time here.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {jobs.map((job) => (
                    <div
                      key={job.id}
                      className="bg-white rounded-xl p-4 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 shadow-xs border border-gray-100 hover:border-gray-200 transition-colors"
                    >
                      <div className="flex gap-3.5 items-center">
                        <div className="w-12 h-12 bg-blue-50 border border-blue-100 rounded-xl flex items-center justify-center font-bold text-blue-700 text-sm shrink-0 shadow-xs">
                          {(job.company || 'JB').slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-semibold text-sm text-gray-900">{job.company}</p>
                          <p className="text-gray-500 text-xs mt-0.5">
                            {job.role || job.title}
                            {job.cgpa && (
                              <span className="ml-2 font-medium text-blue-600">
                                • CGPA: {job.cgpa}+
                              </span>
                            )}
                            {job.salary && (
                              <span className="ml-2 font-medium text-emerald-600">
                                • {job.salary}
                              </span>
                            )}
                          </p>
                          {job.deadline && (
                            <p className="text-gray-400 text-[11px] mt-0.5">
                              Deadline: {job.deadline}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="text-left sm:text-right shrink-0">
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${
                            job.status === 'ACTIVE'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-gray-100 text-gray-600 border border-gray-200'
                          }`}
                        >
                          ● {job.status || 'Active'}
                        </span>
                        <p className="text-gray-400 text-[11px] mt-1">
                          Posted {formatTimeAgo(job.createdAt)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Right Side Overview Column */}
            <div className="space-y-5">
              {/* Placement Performance */}
              <div className="bg-white rounded-xl p-5 shadow-xs border border-gray-100">
                <h3 className="font-bold mb-4 flex items-center gap-2 text-sm text-gray-900">
                  <TrendingUp className="w-4 h-4 text-blue-600" />
                  Placement Performance
                </h3>
                <div className="flex justify-between items-baseline mb-2">
                  <span className="text-gray-500 text-sm">Placement Rate</span>
                  <span className="text-2xl font-bold text-blue-600">{placementRate}%</span>
                </div>
                <div className="w-full bg-gray-100 h-2.5 rounded-full overflow-hidden mt-1">
                  <div
                    className="bg-blue-600 h-2.5 rounded-full transition-all duration-700"
                    style={{ width: `${Math.min(placementRate, 100)}%` }}
                  />
                </div>
                <div className="grid grid-cols-2 gap-2 mt-4 pt-3 border-t border-gray-100 text-xs">
                  <div>
                    <span className="text-gray-400 block">Placed</span>
                    <span className="font-bold text-gray-900 text-sm">{totalPlaced}</span>
                  </div>
                  <div>
                    <span className="text-gray-400 block">Unplaced / Seeking</span>
                    <span className="font-bold text-gray-900 text-sm">
                      {stats?.totalUnplaced ?? Math.max(0, totalStudents - totalPlaced)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Weekly Drive Target */}
              <div className="bg-white rounded-xl p-5 shadow-xs border border-gray-100">
                <h3 className="font-bold mb-3 flex items-center gap-2 text-sm text-gray-900">
                  <Briefcase className="w-4 h-4 text-emerald-600" />
                  Weekly Job Target
                </h3>
                <div className="flex justify-between items-center text-xs mb-1.5">
                  <span className="text-gray-500">Posted this week</span>
                  <span className="font-bold text-gray-900">
                    {jobsPostedThisWeek} / {WEEKLY_TARGET} drives
                  </span>
                </div>
                <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-emerald-600 h-2 rounded-full transition-all duration-700"
                    style={{ width: `${weeklyProgress}%` }}
                  />
                </div>
              </div>

              {/* Quick Actions */}
              <div className="bg-white rounded-xl p-5 shadow-xs border border-gray-100">
                <h3 className="font-bold mb-3 text-sm text-gray-900">Quick Actions</h3>
                <div className="space-y-1.5">
                  <Link
                    to="/admin/applications"
                    className="flex items-center gap-2.5 w-full text-xs font-semibold text-gray-700 hover:text-blue-700 hover:bg-blue-50/70 px-3 py-2.5 rounded-lg transition-colors"
                  >
                    <FileCheck className="w-4 h-4 text-blue-600" />
                    <span>Manage Applications</span>
                  </Link>
                  <Link
                    to="/admin/students"
                    className="flex items-center gap-2.5 w-full text-xs font-semibold text-gray-700 hover:text-blue-700 hover:bg-blue-50/70 px-3 py-2.5 rounded-lg transition-colors"
                  >
                    <UserCheck className="w-4 h-4 text-blue-600" />
                    <span>Manage Students</span>
                  </Link>
                  <Link
                    to="/admin/jobs"
                    className="flex items-center gap-2.5 w-full text-xs font-semibold text-gray-700 hover:text-blue-700 hover:bg-blue-50/70 px-3 py-2.5 rounded-lg transition-colors"
                  >
                    <Briefcase className="w-4 h-4 text-blue-600" />
                    <span>Manage Job Drives</span>
                  </Link>
                  <Link
                    to="/admin/notifications"
                    className="flex items-center gap-2.5 w-full text-xs font-semibold text-gray-700 hover:text-blue-700 hover:bg-blue-50/70 px-3 py-2.5 rounded-lg transition-colors"
                  >
                    <Bell className="w-4 h-4 text-blue-600" />
                    <span>Campus Announcements</span>
                  </Link>
                </div>
              </div>
            </div>
          </div>

          {/* Embedded Real Application Status Management Section */}
          <section className="mt-10 pt-8 border-t border-gray-200/80">
            <AdminApplicationManagement embeddedInDashboard={true} />
          </section>
        </>
      )}
    </main>
  );
}
