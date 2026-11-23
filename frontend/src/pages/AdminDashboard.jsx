import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Bell, UserCheck, Send, TrendingUp, Briefcase, Building2, FileText, Award } from 'lucide-react';
import EmptyState from '../components/EmptyState';
import { StatCardSkeleton, ListRowSkeleton } from '../components/Skeleton';
import { getDashboardStats } from '../services/api/adminService';

const formatDate = (value) => {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};

const formatNumber = (value) => (typeof value === 'number' ? value.toLocaleString('en-IN') : '0');

const statusLabel = (status) =>
  status ? String(status).replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase()) : '—';

const APPLICATION_STATUS_STYLES = {
  SELECTED: 'bg-green-100 text-green-700',
  REJECTED: 'bg-red-100 text-red-600',
  WITHDRAWN: 'bg-gray-100 text-gray-600',
  SHORTLISTED: 'bg-blue-100 text-blue-700',
};

export default function AdminDashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadStats = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await getDashboardStats();
      setStats(data || {});
    } catch (err) {
      setError(err?.message || 'Could not load dashboard statistics.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const first = setTimeout(loadStats, 0);
    return () => clearTimeout(first);
  }, [loadStats]);

  const recentJobs = Array.isArray(stats?.recentJobs) ? stats.recentJobs : [];
  const recentApplications = Array.isArray(stats?.recentApplications) ? stats.recentApplications : [];
  const departmentStats = Array.isArray(stats?.departmentStats) ? stats.departmentStats : [];
  const placementPct = typeof stats?.placementPercentage === 'number' ? stats.placementPercentage : 0;

  return (
    <main className="flex-1 px-4 md:px-8 py-6 overflow-x-hidden">
      <h2 className="text-2xl md:text-3xl font-bold mb-1">Admin Dashboard Overview</h2>
      <p className="text-gray-500 mb-6 text-sm">
        Here&apos;s what&apos;s happening in the placement portal.
      </p>

      {loading ? (
        <>
          <StatCardSkeleton count={4} className="mb-8" />
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <ListRowSkeleton count={5} />
            </div>
            <ListRowSkeleton count={3} />
          </div>
        </>
      ) : error ? (
        <EmptyState
          type="error"
          title="Could not load the dashboard"
          description={error}
          action={{ label: 'Try again', onClick: loadStats }}
        />
      ) : (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <div className="bg-white rounded-xl p-4 shadow-sm">
              <p className="text-xs text-gray-500 mb-1">Active Jobs</p>
              <p className="text-2xl font-bold text-blue-600">{formatNumber(stats.totalActiveJobs)}</p>
              <p className="text-xs text-gray-400 mt-1">{formatNumber(stats.totalJobs)} jobs in total</p>
            </div>
            <div className="bg-white rounded-xl p-4 shadow-sm">
              <p className="text-xs text-gray-500 mb-1">Posted This Week</p>
              <p className="text-2xl font-bold text-gray-900">{formatNumber(stats.jobsPostedThisWeek)}</p>
              <p className="text-xs text-gray-400 mt-1">{formatNumber(stats.totalCompanies)} companies on file</p>
            </div>
            <div className="bg-white rounded-xl p-4 shadow-sm">
              <p className="text-xs text-gray-500 mb-1">Registered Students</p>
              <p className="text-2xl font-bold text-gray-900">{formatNumber(stats.totalStudents)}</p>
              <p className="text-xs text-gray-400 mt-1">{formatNumber(stats.totalPlaced)} placed</p>
            </div>
            <div className="bg-white rounded-xl p-4 shadow-sm">
              <p className="text-xs text-gray-500 mb-1">Applied Today</p>
              <p className="text-2xl font-bold text-gray-900">{formatNumber(stats.applicationsToday)}</p>
              <p className="text-xs text-gray-400 mt-1">{formatNumber(stats.totalApplications)} applications in total</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-8">
              {/* Recent jobs */}
              <section>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold">Recent Jobs</h3>
                  <Link to="/admin/jobs" className="text-sm text-blue-600 hover:underline">
                    View all →
                  </Link>
                </div>

                {recentJobs.length === 0 ? (
                  <EmptyState
                    type="empty"
                    icon={Briefcase}
                    title="No active jobs"
                    description="No recruitment drives are open right now."
                    action={{ label: 'Post New Job', to: '/admin/jobs/new', icon: Briefcase }}
                  />
                ) : (
                  <div className="space-y-3">
                    {recentJobs.map((job) => {
                      const company = job.company || 'Company';
                      return (
                        <Link
                          key={job.id}
                          to={`/admin/jobs/${job.id}/edit`}
                          className="bg-white rounded-xl p-4 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 shadow-sm hover:shadow-md transition-shadow"
                        >
                          <div className="flex gap-3 items-center">
                            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center font-bold text-blue-700 text-sm shrink-0">
                              {company.slice(0, 2).toUpperCase()}
                            </div>
                            <div>
                              <p className="font-semibold text-sm">{company}</p>
                              <p className="text-gray-500 text-xs">
                                {job.title || job.role || 'Role not set'}
                                {job.cgpa ? <> &nbsp;|&nbsp; Min CGPA: {job.cgpa}</> : null}
                              </p>
                              <p className="text-gray-400 text-xs">Deadline: {formatDate(job.deadline)}</p>
                            </div>
                          </div>
                          <div className="text-left sm:text-right">
                            <span className="bg-green-100 text-green-600 px-3 py-1 rounded-full text-xs">
                              ● {statusLabel(job.status)}
                            </span>
                            <p className="text-gray-400 text-xs mt-1">Posted {formatDate(job.createdAt)}</p>
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                )}
              </section>

              {/* Recent applications */}
              <section>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold">Recent Applications</h3>
                  <Link to="/admin/applications" className="text-sm text-blue-600 hover:underline">
                    View all →
                  </Link>
                </div>
                {recentApplications.length === 0 ? (
                  <EmptyState
                    type="empty"
                    icon={FileText}
                    compact
                    title="No applications yet"
                    description="Applications will appear here as students apply to drives."
                  />
                ) : (
                  <div className="bg-white rounded-xl shadow-sm divide-y divide-gray-100">
                    {recentApplications.map((app) => (
                      <div key={app.id} className="p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                        <div className="min-w-0">
                          <p className="font-semibold text-sm truncate">
                            {app.studentName || 'Student'}
                            {app.studentRollNo ? <span className="text-gray-400 font-normal"> · {app.studentRollNo}</span> : null}
                          </p>
                          <p className="text-gray-500 text-xs truncate">
                            {app.jobTitle || 'Job'} at {app.company || 'Company'}
                            {app.studentDepartment ? ` · ${app.studentDepartment}` : ''}
                          </p>
                        </div>
                        <div className="flex items-center gap-3 shrink-0">
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                              APPLICATION_STATUS_STYLES[app.status] || 'bg-yellow-100 text-yellow-700'
                            }`}
                          >
                            {statusLabel(app.status)}
                          </span>
                          <span className="text-gray-400 text-xs">{formatDate(app.appliedAt)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            </div>

            {/* Right Side */}
            <div className="space-y-5">
              {/* Placement overview */}
              <div className="bg-white rounded-xl p-5 shadow-sm">
                <h3 className="font-bold mb-4 flex items-center gap-2 text-sm">
                  <TrendingUp className="w-4 h-4 text-blue-600" /> Placement Overview
                </h3>
                <div className="flex justify-between mb-2">
                  <span className="text-gray-500 text-sm">Placement Rate</span>
                  <span className="text-2xl font-bold text-blue-600">{placementPct.toFixed(1)}%</span>
                </div>
                <div className="w-full bg-gray-200 h-2 rounded mt-3">
                  <div
                    className="bg-blue-600 h-2 rounded transition-all duration-700"
                    style={{ width: `${Math.min(Math.max(placementPct, 0), 100)}%` }}
                  />
                </div>
                <div className="flex justify-between mt-3 text-xs">
                  <span className="text-gray-500">Placed / Unplaced</span>
                  <span className="font-semibold">
                    {formatNumber(stats.totalPlaced)} / {formatNumber(stats.totalUnplaced)}
                  </span>
                </div>
              </div>

              {/* Student Engagement */}
              <div className="bg-white rounded-xl p-5 shadow-sm">
                <h3 className="font-bold mb-4 flex items-center gap-2 text-sm">
                  <UserCheck className="w-4 h-4 text-blue-600" /> Student Engagement
                </h3>
                <div className="flex justify-between items-center mb-3">
                  <div className="flex items-center gap-2">
                    <UserCheck className="w-4 h-4 text-blue-500" />
                    <span className="text-gray-500 text-sm">Total Registered</span>
                  </div>
                  <span className="font-bold text-sm">{formatNumber(stats.totalStudents)}</span>
                </div>
                <div className="flex justify-between items-center mb-3">
                  <div className="flex items-center gap-2">
                    <Send className="w-4 h-4 text-green-500" />
                    <span className="text-gray-500 text-sm">Applied Today</span>
                  </div>
                  <span className="font-bold text-sm">{formatNumber(stats.applicationsToday)}</span>
                </div>
                <div className="flex justify-between items-center mb-3">
                  <div className="flex items-center gap-2">
                    <Award className="w-4 h-4 text-amber-500" />
                    <span className="text-gray-500 text-sm">Selected</span>
                  </div>
                  <span className="font-bold text-sm">{formatNumber(stats.selectedStudents)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-purple-500" />
                    <span className="text-gray-500 text-sm">Student Projects</span>
                  </div>
                  <span className="font-bold text-sm">{formatNumber(stats.totalProjects)}</span>
                </div>
              </div>

              {/* Department stats */}
              <div className="bg-white rounded-xl p-5 shadow-sm">
                <h3 className="font-bold mb-3 text-sm">Department Placement</h3>
                {departmentStats.length === 0 ? (
                  <p className="text-xs text-gray-400">No department data yet.</p>
                ) : (
                  <div className="space-y-3">
                    {departmentStats.map((dept) => {
                      const rate = typeof dept.placementRate === 'number' ? dept.placementRate : 0;
                      return (
                        <div key={dept.department}>
                          <div className="flex justify-between text-xs mb-1">
                            <span className="text-gray-600 font-medium truncate pr-2">{dept.department}</span>
                            <span className="text-gray-500 shrink-0">
                              {formatNumber(dept.placedStudents)}/{formatNumber(dept.totalStudents)} · {rate.toFixed(0)}%
                            </span>
                          </div>
                          <div className="w-full bg-gray-200 h-1.5 rounded">
                            <div
                              className="bg-blue-600 h-1.5 rounded"
                              style={{ width: `${Math.min(Math.max(rate, 0), 100)}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Quick Links */}
              <div className="bg-white rounded-xl p-5 shadow-sm">
                <h3 className="font-bold mb-3 text-sm">Quick Actions</h3>
                <div className="space-y-2">
                  <Link
                    to="/admin/students"
                    className="flex items-center gap-2 w-full text-sm text-blue-600 hover:bg-blue-50 px-3 py-2 rounded-lg transition-colors"
                  >
                    <UserCheck className="w-4 h-4" /> Manage Students
                  </Link>
                  <Link
                    to="/admin/notifications"
                    className="flex items-center gap-2 w-full text-sm text-blue-600 hover:bg-blue-50 px-3 py-2 rounded-lg transition-colors"
                  >
                    <Bell className="w-4 h-4" /> View Notifications
                  </Link>
                  <Link
                    to="/admin/jobs/new"
                    className="flex items-center gap-2 w-full text-sm text-blue-600 hover:bg-blue-50 px-3 py-2 rounded-lg transition-colors"
                  >
                    <Briefcase className="w-4 h-4" /> Post New Job
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </main>
  );
}
