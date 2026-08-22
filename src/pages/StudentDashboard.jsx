import { Link } from 'react-router-dom';
import {
  Briefcase,
  CheckCircle,
  Clock,
  ChevronRight,
  TrendingUp,
} from 'lucide-react';
import Navbar from '../components/Navbar';

const recentJobs = [
  { id: 1, company: 'Google', role: 'Software Engineer', cgpa: '8.5+', deadline: 'Nov 15, 2026', status: 'Open' },
  { id: 2, company: 'Amazon', role: 'Data Analyst', cgpa: '7.5+', deadline: 'Nov 01, 2026', status: 'Open' },
  { id: 3, company: 'Microsoft', role: 'Cloud Engineer', cgpa: '8.0+', deadline: 'Oct 30, 2026', status: 'Open' },
  { id: 4, company: 'Zoho', role: 'UI/UX Designer', cgpa: '7.0+', deadline: 'Oct 28, 2026', status: 'Closing Soon' },
];

const myApplications = [
  { company: 'TCS', role: 'Systems Engineer', appliedOn: 'Oct 10, 2026', status: 'Under Review' },
  { company: 'Infosys', role: 'Associate Developer', appliedOn: 'Oct 5, 2026', status: 'Shortlisted' },
];

const appStatusStyle = {
  'Under Review': 'bg-yellow-100 text-yellow-700',
  Shortlisted: 'bg-green-100 text-green-700',
  Rejected: 'bg-red-100 text-red-700',
  Selected: 'bg-blue-100 text-blue-700',
};

export default function StudentDashboard() {
  return (
    <div className="min-h-screen bg-gray-100">
      <Navbar />

      <main className="max-w-6xl mx-auto px-4 py-6">
        {/* Welcome */}
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-gray-900">Welcome back, Alex! 👋</h2>
          <p className="text-gray-500 text-sm mt-1">Here&apos;s your placement activity summary.</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {[
            { label: 'Jobs Available', value: '24', icon: Briefcase, color: 'text-blue-600', bg: 'bg-blue-50' },
            { label: 'Applied', value: '4', icon: CheckCircle, color: 'text-green-600', bg: 'bg-green-50' },
            { label: 'Shortlisted', value: '2', icon: TrendingUp, color: 'text-purple-600', bg: 'bg-purple-50' },
            { label: 'Pending', value: '2', icon: Clock, color: 'text-yellow-600', bg: 'bg-yellow-50' },
          ].map(({ label, value, icon: StatIcon, color, bg }) => (
            <div key={label} className="bg-white rounded-xl p-4 shadow-sm">
              <div className={`${bg} w-9 h-9 rounded-lg flex items-center justify-center mb-3`}>
                <StatIcon className={`w-5 h-5 ${color}`} />
              </div>
              <p className="text-2xl font-bold">{value}</p>
              <p className="text-gray-500 text-xs mt-0.5">{label}</p>
            </div>
          ))}
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Job Listings */}
          <div className="lg:col-span-2">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-lg">Recent Job Drives</h3>
              <Link to="/student/jobs" className="text-blue-600 text-sm hover:underline flex items-center gap-1">
                View all <ChevronRight className="w-4 h-4" />
              </Link>
            </div>
            <div className="space-y-3">
              {recentJobs.map((job) => (
                <div key={job.id} className="bg-white rounded-xl p-4 shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div className="flex gap-3 items-center">
                    <div className="w-11 h-11 bg-blue-100 rounded-lg flex items-center justify-center font-bold text-blue-700 text-sm shrink-0">
                      {job.company.slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <p className="font-semibold text-sm">{job.company}</p>
                      <p className="text-gray-500 text-xs">{job.role} &nbsp;|&nbsp; CGPA: {job.cgpa}</p>
                      <p className="text-gray-400 text-xs">Deadline: {job.deadline}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`text-xs px-2.5 py-1 rounded-full ${job.status === 'Closing Soon' ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'}`}>
                      {job.status}
                    </span>
                    <Link
                      to={`/student/jobs/${job.id}`}
                      className="bg-blue-600 text-white text-xs px-3 py-1.5 rounded-lg hover:bg-blue-700 transition-colors"
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
            <div className="bg-white rounded-xl p-5 shadow-sm text-center">
              <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center text-white text-2xl font-bold mx-auto mb-3">
                A
              </div>
              <p className="font-semibold">Alex Harrison</p>
              <p className="text-gray-500 text-xs">B.E CSE &nbsp;·&nbsp; 7th Sem</p>
              <p className="text-blue-600 text-sm font-semibold mt-1">CGPA: 8.9</p>
              <div className="w-full bg-gray-200 h-1.5 rounded mt-3 mb-1">
                <div className="bg-blue-600 h-1.5 rounded" style={{ width: '80%' }} />
              </div>
              <p className="text-xs text-gray-400">Profile: 80% complete</p>
              <Link
                to="/student/profile"
                className="mt-3 w-full block text-center text-sm text-blue-600 border border-blue-200 py-2 rounded-lg hover:bg-blue-50 transition-colors"
              >
                View Profile
              </Link>
            </div>

            {/* My Applications */}
            <div className="bg-white rounded-xl p-5 shadow-sm">
              <h3 className="font-semibold text-sm mb-3">My Applications</h3>
              <div className="space-y-3">
                {myApplications.map((app, i) => (
                  <div key={i} className="border-b pb-3 last:border-0 last:pb-0">
                    <p className="font-medium text-sm">{app.company}</p>
                    <p className="text-gray-500 text-xs">{app.role}</p>
                    <div className="flex justify-between items-center mt-1">
                      <span className="text-gray-400 text-xs">{app.appliedOn}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${appStatusStyle[app.status]}`}>
                        {app.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
              <Link to="/student/applications" className="block text-center text-xs text-blue-600 mt-3 hover:underline">
                View all applications →
              </Link>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
