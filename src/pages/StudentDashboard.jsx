import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Briefcase,
  CheckCircle,
  Clock,
  ChevronRight,
  TrendingUp,
} from 'lucide-react';
import { apiRequest } from '../services/api';

export default function StudentDashboard() {
  const [profile, setProfile] = useState(null);
  const [profileError, setProfileError] = useState('');

  useEffect(() => {
    let active = true;
    apiRequest('/students/me/profile')
      .then((response) => { if (active) setProfile(response.data); })
      .catch((error) => { if (active) setProfileError(error.message || 'Unable to load your profile.'); });
    return () => { active = false; };
  }, []);

  const completionChecks = profile ? [
    profile.name,
    profile.degree,
    profile.about,
    profile.contact?.phone,
    profile.education?.length,
    profile.projects?.length,
    profile.experience?.length,
  ] : [];
  const profileCompletion = completionChecks.length
    ? Math.floor((completionChecks.filter(Boolean).length / completionChecks.length) * 100)
    : 0;

  return (
    <main className="flex-1 px-4 md:px-8 py-6 overflow-x-hidden">
      {/* Welcome */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Welcome back, {profile?.name || profile?.email || 'Student'}!</h2>
        <p className="text-gray-500 text-sm mt-1">Here&apos;s your placement activity summary.</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Jobs Available', value: '—', icon: Briefcase, color: 'text-blue-600', bg: 'bg-blue-50' },
          { label: 'Applications', value: '—', icon: CheckCircle, color: 'text-green-600', bg: 'bg-green-50' },
          { label: 'Shortlisted', value: '—', icon: TrendingUp, color: 'text-green-600', bg: 'bg-green-50' },
          { label: 'Pending', value: '—', icon: Clock, color: 'text-yellow-600', bg: 'bg-yellow-50' },
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
          <div className="bg-white rounded-xl p-5 shadow-sm text-sm text-gray-500">
            Job drives are unavailable because the backend does not yet provide a job listing API.
          </div>
        </div>

        {/* Right Sidebar */}
        <div className="space-y-5">
          {/* Profile Card */}
          <div className="bg-white rounded-xl p-5 shadow-sm text-center">
            <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center text-white text-2xl font-bold mx-auto mb-3">
              {(profile?.name || profile?.email || 'S').charAt(0).toUpperCase()}
            </div>
            <p className="font-semibold">{profile?.name || 'Complete your profile'}</p>
            <p className="text-gray-500 text-xs">{profile?.degree || profile?.email || 'Student profile'}</p>
            <p className="text-blue-600 text-sm font-semibold mt-1">
              CGPA: {profile?.cgpa ?? 'Not provided'}
            </p>
            <p className="text-gray-500 text-xs mt-1">
              {profile?.department || 'Department not provided'}
              {profile?.semester ? ` · Semester ${profile.semester}` : ''}
            </p>
            <div className="w-full bg-gray-200 h-1.5 rounded mt-3 mb-1">
              <div className="bg-blue-600 h-1.5 rounded" style={{ width: `${profileCompletion}%` }} />
            </div>
            <p className="text-xs text-gray-400">Profile: {profileCompletion}% complete</p>
            {profileError && <p role="alert" className="mt-2 text-xs text-red-600">{profileError}</p>}
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
              <p className="text-sm text-gray-500">Application data is unavailable because the backend does not yet provide an applications API.</p>
            </div>
            <Link to="/student/applications" className="block text-center text-xs text-blue-600 mt-3 hover:underline">
              View all applications →
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
