import { useState, useEffect, useCallback } from 'react';
import {
  Bell,
  BriefcaseIcon,
  GraduationCap,
  AlertCircle,
  CheckCircle,
  X,
  RefreshCw,
  AlertTriangle,
} from 'lucide-react';
import notificationService from '../services/api/notificationService';

const typeConfig = {
  job: { icon: BriefcaseIcon, color: 'text-blue-600', bg: 'bg-blue-100' },
  application: { icon: GraduationCap, color: 'text-green-600', bg: 'bg-green-100' },
  alert: { icon: AlertCircle, color: 'text-yellow-600', bg: 'bg-yellow-100' },
  success: { icon: CheckCircle, color: 'text-emerald-600', bg: 'bg-emerald-100' },
};

const FILTERS = ['All', 'Unread', 'Job Drives', 'Applications', 'Alerts'];

const mapNotificationType = (rawType) => {
  const type = (rawType || '').toUpperCase();
  if (type === 'JOB' || type === 'PLACEMENT_DRIVE') return 'job';
  if (type === 'APPLICATION' || type === 'INTERVIEW') return 'application';
  if (type === 'ANNOUNCEMENT' || type === 'GENERAL') return 'success';
  return 'alert';
};

const formatRelativeTime = (timestamp) => {
  if (!timestamp) return '';
  try {
    const date = new Date(timestamp);
    if (isNaN(date.getTime())) return String(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    if (diffMs < 0) return 'Just now';
    const diffSecs = Math.floor(diffMs / 1000);
    if (diffSecs < 60) return 'Just now';
    const diffMins = Math.floor(diffSecs / 60);
    if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    return date.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return String(timestamp);
  }
};

export default function NotificationsPage() {
  const [notifs, setNotifs] = useState([]);
  const [activeFilter, setActiveFilter] = useState('All');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionError, setActionError] = useState(null);

  const loadNotifications = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await notificationService.getNotifications({ page: 0, size: 50 });
      const items = Array.isArray(data)
        ? data
        : Array.isArray(data?.content)
        ? data.content
        : [];
      setNotifs(
        items.map((item) => ({
          id: item.id,
          type: mapNotificationType(item.notificationType),
          rawType: item.notificationType,
          title: item.title || 'Notification',
          message: item.message || '',
          time: formatRelativeTime(item.createdAt || item.publishedAt),
          read: Boolean(item.isRead),
          priority: item.priority,
        }))
      );
    } catch (err) {
      console.error('Failed to load notifications:', err);
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        'Unable to load notifications. Please check your connection and try again.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  const markAllRead = async () => {
    const previous = notifs;
    setNotifs((current) => current.map((x) => ({ ...x, read: true })));
    setActionError(null);
    try {
      await notificationService.markAllAsRead();
    } catch (err) {
      setNotifs(previous);
      setActionError('Failed to mark all as read. Please try again.');
    }
  };

  const dismiss = async (id) => {
    const previous = notifs;
    setNotifs((current) => current.filter((x) => x.id !== id));
    setActionError(null);
    try {
      await notificationService.deleteNotification(id);
    } catch (err) {
      setNotifs(previous);
      setActionError('Failed to dismiss notification. Please try again.');
    }
  };

  const toggleRead = async (id) => {
    const target = notifs.find((x) => x.id === id);
    if (!target) return;
    const previous = notifs;
    const willBeRead = !target.read;
    setNotifs((current) =>
      current.map((x) => (x.id === id ? { ...x, read: willBeRead } : x))
    );
    setActionError(null);
    try {
      if (willBeRead) {
        await notificationService.markAsRead(id);
      } else {
        await notificationService.markAsUnread(id);
      }
    } catch (err) {
      setNotifs(previous);
      setActionError('Failed to update notification. Please try again.');
    }
  };

  const filtered = notifs.filter((n) => {
    if (activeFilter === 'Unread') return !n.read;
    if (activeFilter === 'Job Drives') return n.type === 'job';
    if (activeFilter === 'Applications') return n.type === 'application';
    if (activeFilter === 'Alerts') return n.type === 'alert' || n.type === 'success';
    return true;
  });

  const unreadCount = notifs.filter((n) => !n.read).length;

  return (
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
        {loading
          ? 'Loading notifications...'
          : unreadCount > 0
          ? `You have ${unreadCount} unread notification${unreadCount > 1 ? 's' : ''}.`
          : 'All caught up!'}
      </p>

      {/* Action error banner */}
      {actionError && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
            <span>{actionError}</span>
          </div>
          <button
            onClick={() => setActionError(null)}
            className="text-red-500 hover:text-red-700"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

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

      {/* Main Content Area */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="bg-white rounded-xl p-4 shadow-sm flex gap-4 items-start animate-pulse"
            >
              <div className="shrink-0 w-10 h-10 rounded-full bg-gray-200" />
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-gray-200 rounded w-1/3" />
                <div className="h-3 bg-gray-200 rounded w-3/4" />
                <div className="h-2.5 bg-gray-200 rounded w-1/6" />
              </div>
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="bg-white rounded-xl p-8 text-center text-gray-600 shadow-sm border border-red-100">
          <AlertTriangle className="w-10 h-10 mx-auto mb-3 text-red-400" />
          <h3 className="font-semibold text-gray-800 mb-1">Failed to Load Notifications</h3>
          <p className="text-sm text-gray-500 mb-4">{error}</p>
          <button
            onClick={loadNotifications}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
          >
            <RefreshCw className="w-4 h-4" /> Try Again
          </button>
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-xl p-10 text-center text-gray-400 shadow-sm">
          <Bell className="w-10 h-10 mx-auto mb-3 text-gray-300" />
          <p>No notifications here.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((n) => {
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
                        title="Dismiss notification"
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
          })}
        </div>
      )}
    </main>
  );
}
