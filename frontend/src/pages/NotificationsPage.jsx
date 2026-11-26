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
  ShieldCheck,
  ArrowRight,
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import notificationService from '../services/api/notificationService';
import EmptyState from '../components/EmptyState';
import { ListRowSkeleton } from '../components/Skeleton';
import { toastSuccess, toastError } from '../utils/toast';
import { useAuth } from '../context/AuthContext';
import useUnreadNotifications, { notifyNotificationsChanged } from '../hooks/useUnreadNotifications';

const typeConfig = {
  job: { icon: BriefcaseIcon, color: 'text-blue-600', bg: 'bg-blue-100' },
  application: { icon: GraduationCap, color: 'text-green-600', bg: 'bg-green-100' },
  alert: { icon: AlertCircle, color: 'text-yellow-600', bg: 'bg-yellow-100' },
  success: { icon: CheckCircle, color: 'text-emerald-600', bg: 'bg-emerald-100' },
  verification: { icon: ShieldCheck, color: 'text-indigo-600', bg: 'bg-indigo-100' },
};

const FILTERS = ['All', 'Unread', 'Applications', 'Drives', 'Verification'];

/** Only same-app paths are followed, so a notification can never send someone off-site. */
const safeActionUrl = (url) =>
  typeof url === 'string' && url.startsWith('/') && !url.startsWith('//') ? url : null;

const mapNotificationType = (rawType) => {
  const type = (rawType || '').toUpperCase();
  if (type === 'JOB' || type === 'PLACEMENT_DRIVE' || type === 'DEADLINE') return 'job';
  if (type === 'APPLICATION' || type === 'INTERVIEW') return 'application';
  if (type === 'ANNOUNCEMENT' || type === 'GENERAL') return 'success';
  if (type === 'VERIFICATION') return 'verification';
  return 'alert';
};

/** Where "View details" should go. Students and admins have different pages for the same record. */
const linkFor = (item, isAdmin, isFaculty) => {
  if (item.actionUrl) return item.actionUrl;
  if (isFaculty) return null;
  const type = (item.rawType || '').toUpperCase();
  if (type === 'APPLICATION' || type === 'INTERVIEW') {
    return isAdmin ? '/admin/applications' : '/student/applications';
  }
  if (item.relatedJobId) {
    return isAdmin ? `/admin/jobs/${item.relatedJobId}/edit` : `/student/jobs/${item.relatedJobId}`;
  }
  return null;
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
  const { role } = useAuth();
  const { count: unreadCount } = useUnreadNotifications();
  const navigate = useNavigate();
  const isAdmin = role === 'ADMIN' || role === 'PLACEMENT_OFFICER';
  const isFaculty = role === 'FACULTY_ADVISOR';
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
          relatedJobId: item.relatedJobId,
          actionUrl: safeActionUrl(item.actionUrl),
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
      notifyNotificationsChanged();
      toastSuccess('All notifications marked as read.');
    } catch (err) {
      setNotifs(previous);
      const msg = 'Failed to mark all as read. Please try again.';
      setActionError(msg);
      toastError(err, msg);
    }
  };

  const dismiss = async (id) => {
    const previous = notifs;
    setNotifs((current) => current.filter((x) => x.id !== id));
    setActionError(null);
    try {
      await notificationService.deleteNotification(id);
      notifyNotificationsChanged();
      toastSuccess('Notification dismissed.');
    } catch (err) {
      setNotifs(previous);
      const msg = 'Failed to dismiss notification. Please try again.';
      setActionError(msg);
      toastError(err, msg);
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
      notifyNotificationsChanged();
    } catch (err) {
      setNotifs(previous);
      const msg = 'Failed to update notification. Please try again.';
      setActionError(msg);
      toastError(err, msg);
    }
  };

  const filtered = notifs.filter((n) => {
    if (activeFilter === 'Unread') return !n.read;
    if (activeFilter === 'Drives') return n.type === 'job';
    if (activeFilter === 'Applications') return n.type === 'application';
    if (activeFilter === 'Verification') return n.type === 'verification';
    return true;
  });

  /** Clicking a notification that points somewhere marks it read and opens that page. */
  const openNotification = (n) => {
    if (!n.actionUrl) return;
    if (!n.read) {
      setNotifs((current) => current.map((x) => (x.id === n.id ? { ...x, read: true } : x)));
      notificationService.markAsRead(n.id).then(notifyNotificationsChanged).catch(() => {});
    }
    navigate(n.actionUrl);
  };

  return (
    <main className="flex-1 px-4 md:px-8 py-4 md:py-6 max-w-5xl w-full mx-auto overflow-x-hidden">
      <div className="flex items-center justify-between gap-3 mb-1">
        <h2 className="text-xl md:text-2xl font-extrabold text-[#0F172A] tracking-tight">Notifications</h2>
        {unreadCount > 0 && (
          <button
            onClick={markAllRead}
            className="text-xs sm:text-sm font-bold text-[#1D4ED8] hover:text-[#1E3A8A] bg-[#E0EAFF] px-3 py-1.5 rounded-full transition-colors cursor-pointer"
          >
            Mark all read
          </button>
        )}
      </div>
      <p className="text-[#475569] text-sm mb-5">
        {loading
          ? 'Loading notifications...'
          : unreadCount > 0
          ? `You have ${unreadCount} unread notification${unreadCount > 1 ? 's' : ''}.`
          : 'All caught up!'}
      </p>

      {/* Action error banner */}
      {actionError && (
        <div className="mb-4 p-3.5 bg-red-50 border border-red-200 text-red-700 text-sm rounded-[16px] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
            <span>{actionError}</span>
          </div>
          <button
            onClick={() => setActionError(null)}
            className="text-red-500 hover:text-red-700 p-1"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Filter Tabs */}
      <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1 mb-5">
        {FILTERS.map((f) => (
          <button
            key={f}
            onClick={() => setActiveFilter(f)}
            className={`px-4 py-2 rounded-full text-xs sm:text-sm font-bold whitespace-nowrap transition-colors min-h-[38px] cursor-pointer ${
              activeFilter === f
                ? 'bg-[#1D4ED8] text-white shadow-xs'
                : 'bg-white text-[#475569] hover:bg-slate-100 border border-[#E2E8F0]'
            }`}
          >
            {f}
            {f === 'Unread' && unreadCount > 0 && (
              <span className={`ml-1.5 text-[11px] rounded-full px-1.5 py-0.5 ${activeFilter === f ? 'bg-[#F5B301] text-[#1F1500]' : 'bg-[#FEF3C7] text-[#B45309]'}`}>
                {unreadCount}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Main Content Area */}
      {loading ? (
        <ListRowSkeleton count={3} />
      ) : error ? (
        <EmptyState
          type="error"
          title="Failed to Load Notifications"
          description={error}
          action={{
            label: 'Try Again',
            onClick: loadNotifications,
            icon: RefreshCw,
          }}
        />
      ) : filtered.length === 0 ? (
        notifs.length === 0 ? (
          <EmptyState
            type="empty"
            icon={Bell}
            title="No notifications yet"
            description="You are all caught up! Updates about campus drives, application deadlines, and placement news will appear here."
            action={{
              label: 'Refresh',
              onClick: loadNotifications,
              icon: RefreshCw,
            }}
          />
        ) : (
          <EmptyState
            type="search"
            icon={Bell}
            title={`No ${activeFilter.toLowerCase()} notifications`}
            description={`There are currently no notifications matching the "${activeFilter}" filter.`}
            action={{
              label: 'View All Notifications',
              onClick: () => setActiveFilter('All'),
            }}
          />
        )
      ) : (
        <div className="space-y-3">
          {filtered.map((n) => {
            const { icon: Icon, color, bg } = typeConfig[n.type] || typeConfig.alert;
            const clickable = Boolean(n.actionUrl);
            const target = linkFor(n, isAdmin, isFaculty);
            return (
              <div
                key={n.id}
                onClick={clickable ? (e) => {
                  // Buttons and links inside the card keep their own behaviour.
                  if (e.target.closest('button, a')) return;
                  openNotification(n);
                } : undefined}
                onKeyDown={clickable ? (e) => {
                  if (e.key === 'Enter' && e.target === e.currentTarget) openNotification(n);
                } : undefined}
                role={clickable ? 'link' : undefined}
                tabIndex={clickable ? 0 : undefined}
                aria-label={clickable ? `${n.title}. Open` : undefined}
                className={`bg-white rounded-[22px] p-4 shadow-[0_1px_2px_rgba(15,23,42,0.05)] flex gap-3.5 items-start transition-all ${
                  n.read ? 'opacity-75' : 'ring-1 ring-[#E0EAFF]'
                } ${clickable ? 'cursor-pointer hover:shadow-md focus:outline-none focus:ring-2 focus:ring-[#1D4ED8]' : ''}`}
              >
                <div className={`shrink-0 w-11 h-11 rounded-[14px] ${bg} flex items-center justify-center`}>
                  <Icon className={`w-5 h-5 ${color}`} />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <p className={`font-bold text-[14px] leading-snug ${n.read ? 'text-[#475569]' : 'text-[#0F172A]'}`}>
                      {!n.read && (
                        <span className="inline-block w-2 h-2 bg-[#F59E0B] rounded-full mr-2 align-middle" />
                      )}
                      {n.title}
                    </p>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        onClick={() => toggleRead(n.id)}
                        className="text-xs font-semibold text-[#1D4ED8] hover:bg-[#EEF2FF] px-2 py-1 rounded-lg transition-colors cursor-pointer"
                      >
                        {n.read ? 'Unread' : 'Mark read'}
                      </button>
                      <button
                        onClick={() => dismiss(n.id)}
                        className="p-1.5 text-[#94A3B8] hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                        title="Dismiss notification"
                        aria-label="Dismiss notification"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  <p className="text-[#475569] text-[13px] mt-1 leading-relaxed">{n.message}</p>
                  <div className="flex items-center gap-3 mt-1.5">
                    <p className="text-gray-400 text-xs">{n.time}</p>
                    {target && (
                      <Link
                        to={target}
                        onClick={() => {
                          if (!n.read) toggleRead(n.id);
                        }}
                        className="text-xs font-medium text-blue-600 hover:underline inline-flex items-center gap-1"
                      >
                        {n.type === 'verification' ? 'Open request' : 'View details'}
                        {clickable && <ArrowRight className="w-3 h-3" />}
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </main>
  );
}
