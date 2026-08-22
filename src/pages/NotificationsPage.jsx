import { useState } from 'react';
import { Bell, BriefcaseIcon, GraduationCap, AlertCircle, CheckCircle, X, Filter } from 'lucide-react';
import Navbar from '../components/Navbar';
import AdminSidebar from '../components/AdminSidebar';

const ALL_NOTIFS = [
  {
    id: 1,
    type: 'job',
    title: 'New Drive: Google India',
    message: 'Google India has posted a new Software Engineer drive for 2026 batch. Deadline: Nov 15, 2026.',
    time: '2 minutes ago',
    read: false,
  },
  {
    id: 2,
    type: 'application',
    title: 'Application Shortlisted',
    message: 'Adithya K has been shortlisted for the Amazon SDE drive. Interview scheduled on Oct 28, 2026.',
    time: '1 hour ago',
    read: false,
  },
  {
    id: 3,
    type: 'alert',
    title: 'Profile Completion Reminder',
    message: '56 students have incomplete profiles. Send a follow-up reminder before the next drive.',
    time: '3 hours ago',
    read: false,
  },
  {
    id: 4,
    type: 'success',
    title: 'Placement Confirmed: Vijay T',
    message: 'Vijay T has accepted the offer from Microsoft with a CTC of 18 LPA. Congratulations!',
    time: '5 hours ago',
    read: true,
  },
  {
    id: 5,
    type: 'job',
    title: 'New Drive: Infosys',
    message: 'Infosys has opened registrations for Systems Engineer role. Minimum CGPA: 6.5. Deadline: Oct 30, 2026.',
    time: '1 day ago',
    read: true,
  },
  {
    id: 6,
    type: 'alert',
    title: 'Upcoming Deadline',
    message: 'TCS NQT registrations close in 48 hours. 124 students have not yet applied.',
    time: '1 day ago',
    read: true,
  },
  {
    id: 7,
    type: 'success',
    title: 'Resume Workshop Scheduled',
    message: 'A resume-building workshop is scheduled for Oct 22, 2026 at 10:00 AM in Seminar Hall.',
    time: '2 days ago',
    read: true,
  },
  {
    id: 8,
    type: 'application',
    title: 'New Application Received',
    message: 'Priya M has applied for the Zoho Corporation drive for UI/UX Designer role.',
    time: '3 days ago',
    read: true,
  },
];

const typeConfig = {
  job: { icon: BriefcaseIcon, color: 'text-blue-600', bg: 'bg-blue-100' },
  application: { icon: GraduationCap, color: 'text-green-600', bg: 'bg-green-100' },
  alert: { icon: AlertCircle, color: 'text-yellow-600', bg: 'bg-yellow-100' },
  success: { icon: CheckCircle, color: 'text-emerald-600', bg: 'bg-emerald-100' },
};

const FILTERS = ['All', 'Unread', 'Job Drives', 'Applications', 'Alerts'];

export default function NotificationsPage() {
  const [notifs, setNotifs] = useState(ALL_NOTIFS);
  const [activeFilter, setActiveFilter] = useState('All');

  const markAllRead = () => setNotifs((n) => n.map((x) => ({ ...x, read: true })));
  const dismiss = (id) => setNotifs((n) => n.filter((x) => x.id !== id));
  const toggleRead = (id) => setNotifs((n) => n.map((x) => x.id === id ? { ...x, read: !x.read } : x));

  const filtered = notifs.filter((n) => {
    if (activeFilter === 'Unread') return !n.read;
    if (activeFilter === 'Job Drives') return n.type === 'job';
    if (activeFilter === 'Applications') return n.type === 'application';
    if (activeFilter === 'Alerts') return n.type === 'alert' || n.type === 'success';
    return true;
  });

  const unreadCount = notifs.filter((n) => !n.read).length;

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      <Navbar variant="admin" notifications={unreadCount} />

      <div className="flex flex-1">
        <AdminSidebar />

        <main className="flex-1 px-4 md:px-8 py-6">
          <div className="flex items-center justify-between mb-1">
            <h2 className="text-2xl font-bold">Notifications</h2>
            {unreadCount > 0 && (
              <button
                onClick={markAllRead}
                className="text-sm text-blue-600 hover:underline"
              >
                Mark all as read
              </button>
            )}
          </div>
          <p className="text-gray-500 text-sm mb-6">
            {unreadCount > 0
              ? `You have ${unreadCount} unread notification${unreadCount > 1 ? 's' : ''}.`
              : 'All caught up!'}
          </p>

          {/* Filter Tabs */}
          <div className="flex gap-2 flex-wrap mb-5">
            {FILTERS.map((f) => (
              <button
                key={f}
                onClick={() => setActiveFilter(f)}
                className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                  activeFilter === f
                    ? 'bg-blue-600 text-white'
                    : 'bg-white text-gray-600 hover:bg-gray-200 border border-gray-200'
                }`}
              >
                {f}
                {f === 'Unread' && unreadCount > 0 && (
                  <span className="ml-1.5 bg-red-500 text-white text-xs rounded-full px-1.5 py-0.5">
                    {unreadCount}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Notification List */}
          <div className="space-y-3">
            {filtered.length === 0 ? (
              <div className="bg-white rounded-xl p-10 text-center text-gray-400 shadow-sm">
                <Bell className="w-10 h-10 mx-auto mb-3 text-gray-300" />
                <p>No notifications here.</p>
              </div>
            ) : (
              filtered.map((n) => {
                const { icon: Icon, color, bg } = typeConfig[n.type] || typeConfig.alert;
                return (
                  <div
                    key={n.id}
                    className={`bg-white rounded-xl p-4 shadow-sm flex gap-4 items-start transition-opacity ${
                      n.read ? 'opacity-70' : ''
                    }`}
                  >
                    <div className={`shrink-0 w-10 h-10 rounded-full ${bg} flex items-center justify-center`}>
                      <Icon className={`w-5 h-5 ${color}`} />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p className={`font-semibold text-sm ${n.read ? 'text-gray-600' : 'text-gray-900'}`}>
                          {!n.read && (
                            <span className="inline-block w-2 h-2 bg-blue-600 rounded-full mr-2 align-middle" />
                          )}
                          {n.title}
                        </p>
                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            onClick={() => toggleRead(n.id)}
                            className="text-xs text-blue-500 hover:underline"
                          >
                            {n.read ? 'Mark unread' : 'Mark read'}
                          </button>
                          <button
                            onClick={() => dismiss(n.id)}
                            className="text-gray-400 hover:text-red-500 transition-colors"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                      <p className="text-gray-500 text-xs mt-1 leading-relaxed">{n.message}</p>
                      <p className="text-gray-400 text-xs mt-1.5">{n.time}</p>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
