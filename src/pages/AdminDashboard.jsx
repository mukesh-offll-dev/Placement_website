import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Bell, UserCheck, Send, TrendingUp, Briefcase } from 'lucide-react';

const COMPANIES = ['Google', 'Amazon', 'Microsoft', 'Infosys', 'TCS', 'Wipro', 'Zoho'];
const ROLES = ['Software Engineer', 'Data Analyst', 'Product Manager', 'DevOps Engineer'];

const initialJobs = [
  {
    id: 1,
    company: 'Google',
    role: 'Software Engineer',
    cgpa: '8.5+',
    deadline: 'Oct 25, 2026',
    status: 'Active',
    posted: '2h ago',
  },
  {
    id: 2,
    company: 'Amazon',
    role: 'Data Analyst',
    cgpa: '7.5+',
    deadline: 'Nov 01, 2026',
    status: 'Active',
    posted: '5h ago',
  },
];

export default function AdminDashboard() {
  const [notifCount, setNotifCount] = useState(0);
  const [jobs, setJobs] = useState(initialJobs);
  const [stats, setStats] = useState({
    totalJobs: 2,
    weeklyPosted: 2,
    registeredStudents: 1248,
    appliedToday: 156,
  });

  const WEEKLY_TARGET = 20;
  const progress = Math.min((stats.weeklyPosted / WEEKLY_TARGET) * 100, 100);

  useEffect(() => {
    const interval = setInterval(() => {
      const newJob = {
        id: Date.now(),
        company: COMPANIES[Math.floor(Math.random() * COMPANIES.length)],
        role: ROLES[Math.floor(Math.random() * ROLES.length)],
        cgpa: `${(6.5 + Math.random() * 2).toFixed(1)}+`,
        deadline: 'Nov 30, 2026',
        status: 'Active',
        posted: 'Just now',
      };
      setJobs((prev) => [newJob, ...prev.slice(0, 9)]);
      setStats((prev) => ({
        ...prev,
        totalJobs: prev.totalJobs + 1,
        weeklyPosted: prev.weeklyPosted + 1,
        appliedToday: prev.appliedToday + Math.floor(Math.random() * 5 + 1),
      }));
      setNotifCount((n) => n + 1);
    }, 10000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setStats((prev) => ({
        ...prev,
        registeredStudents: prev.registeredStudents + (Math.random() > 0.5 ? 1 : 0),
      }));
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <main className="flex-1 px-4 md:px-8 py-6 overflow-x-hidden">
      <h2 className="text-2xl md:text-3xl font-bold mb-1">Admin Dashboard Overview</h2>
          <p className="text-gray-500 mb-6 text-sm">
            Welcome back, Admin. Here&apos;s what&apos;s happening today in the placement portal.
          </p>

          {/* Summary Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <div className="bg-white rounded-xl p-4 shadow-sm">
              <p className="text-xs text-gray-500 mb-1">Total Active Jobs</p>
              <p className="text-2xl font-bold text-blue-600">{stats.totalJobs}</p>
              <p className="text-xs text-green-500 mt-1">↑ Live</p>
            </div>
            <div className="bg-white rounded-xl p-4 shadow-sm">
              <p className="text-xs text-gray-500 mb-1">Posted This Week</p>
              <p className="text-2xl font-bold text-gray-900">{stats.weeklyPosted}</p>
              <div className="w-full bg-gray-200 h-1.5 rounded mt-2">
                <div
                  className="bg-blue-600 h-1.5 rounded transition-all duration-700"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
            <div className="bg-white rounded-xl p-4 shadow-sm">
              <p className="text-xs text-gray-500 mb-1">Registered Students</p>
              <p className="text-2xl font-bold text-gray-900">{stats.registeredStudents}</p>
              <p className="text-xs text-blue-500 mt-1">↑ Growing</p>
            </div>
            <div className="bg-white rounded-xl p-4 shadow-sm">
              <p className="text-xs text-gray-500 mb-1">Applied Today</p>
              <p className="text-2xl font-bold text-gray-900">{stats.appliedToday}</p>
              <p className="text-xs text-green-500 mt-1">↑ Active</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Job Feed */}
            <div className="lg:col-span-2">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold">Recent Job Activity Feed</h3>
                <Link
                  to="/admin/jobs"
                  className="text-sm text-blue-600 hover:underline"
                >
                  View all →
                </Link>
              </div>

              <div className="space-y-3">
                {jobs.map((job) => (
                  <div
                    key={job.id}
                    className="bg-white rounded-xl p-4 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 shadow-sm"
                  >
                    <div className="flex gap-3 items-center">
                      <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center font-bold text-blue-700 text-sm shrink-0">
                        {job.company.slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-semibold text-sm">{job.company}</p>
                        <p className="text-gray-500 text-xs">
                          {job.role} &nbsp;|&nbsp; CGPA: {job.cgpa}
                        </p>
                        <p className="text-gray-400 text-xs">Deadline: {job.deadline}</p>
                      </div>
                    </div>
                    <div className="text-left sm:text-right">
                      <span className="bg-green-100 text-green-600 px-3 py-1 rounded-full text-xs">
                        ● {job.status}
                      </span>
                      <p className="text-gray-400 text-xs mt-1">Posted {job.posted}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Right Side */}
            <div className="space-y-5">
              {/* Job Statistics */}
              <div className="bg-white rounded-xl p-5 shadow-sm">
                <h3 className="font-bold mb-4 flex items-center gap-2 text-sm">
                  <TrendingUp className="w-4 h-4 text-blue-600" /> Job Statistics
                </h3>
                <div className="flex justify-between mb-2">
                  <span className="text-gray-500 text-sm">Total Active Jobs</span>
                  <span className="text-2xl font-bold text-blue-600">{stats.totalJobs}</span>
                </div>
                <div className="w-full bg-gray-200 h-2 rounded mt-3">
                  <div
                    className="bg-blue-600 h-2 rounded transition-all duration-700"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <div className="flex justify-between mt-3 text-xs">
                  <span className="text-gray-500">Posted This Week</span>
                  <span className="font-semibold">{stats.weeklyPosted} / {WEEKLY_TARGET}</span>
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
                  <span className="font-bold text-sm">{stats.registeredStudents}</span>
                </div>
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <Send className="w-4 h-4 text-green-500" />
                    <span className="text-gray-500 text-sm">Applied Today</span>
                  </div>
                  <span className="font-bold text-sm">{stats.appliedToday}</span>
                </div>
                <button className="w-full mt-5 bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg font-semibold transition-colors text-sm">
                  Generate Engagement Report
                </button>
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
                    to="/admin/jobs"
                    className="flex items-center gap-2 w-full text-sm text-blue-600 hover:bg-blue-50 px-3 py-2 rounded-lg transition-colors"
                  >
                    <Briefcase className="w-4 h-4" /> Post New Job
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </main>
  );
}
