import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Archive,
  ArrowRight,
  Ban,
  CheckCircle2,
  Clock,
  FileQuestion,
  RefreshCw,
  ShieldCheck,
  UserCheck,
  Users,
  XCircle,
} from 'lucide-react';
import EmptyState from '../components/EmptyState';
import { ListRowSkeleton, StatCardSkeleton } from '../components/Skeleton';
import { getFacultyDashboard } from '../services/api/facultyService';
import { formatDateTime, timeAgo } from '../utils/dateFormat';

const ACTION_META = {
  SUBMITTED: { label: 'submitted changes', icon: Clock, cls: 'bg-amber-100 text-amber-700' },
  APPROVED: { label: 'approved', icon: CheckCircle2, cls: 'bg-green-100 text-green-700' },
  REJECTED: { label: 'rejected', icon: XCircle, cls: 'bg-red-100 text-red-700' },
  WITHDRAWN: { label: 'withdrew a request', icon: RefreshCw, cls: 'bg-gray-100 text-gray-600' },
  CREATED: { label: 'started a draft', icon: FileQuestion, cls: 'bg-gray-100 text-gray-600' },
  DISCARDED: { label: 'discarded a draft', icon: XCircle, cls: 'bg-gray-100 text-gray-600' },
};

function StatTile({ label, value, icon: Icon, tone, to }) {
  const body = (
    <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 h-full hover:border-blue-200 transition-colors">
      <div className={`w-9 h-9 rounded-lg flex items-center justify-center mb-2 ${tone}`}>
        <Icon className="w-4.5 h-4.5" />
      </div>
      <p className="text-2xl font-bold text-gray-900">{value ?? '—'}</p>
      <p className="text-xs text-gray-500 mt-0.5">{label}</p>
    </div>
  );
  return to ? <Link to={to} className="block">{body}</Link> : body;
}

export default function FacultyDashboard() {
  const [tick, setTick] = useState(0);
  const [state, setState] = useState({ key: -1, data: null, error: '' });
  const loading = state.key !== tick;

  useEffect(() => {
    let cancelled = false;
    getFacultyDashboard()
      .then((data) => { if (!cancelled) setState({ key: tick, data, error: '' }); })
      .catch((err) => { if (!cancelled) setState({ key: tick, data: null, error: err.message || 'Could not load the dashboard.' }); });
    return () => { cancelled = true; };
  }, [tick]);

  const d = state.data;
  const activity = Array.isArray(d?.recentActivity) ? d.recentActivity : [];

  return (
    <main className="flex-1 px-4 md:px-8 py-6 overflow-x-hidden">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-1">Dashboard</h2>
          <p className="text-gray-500 text-sm">
            {d?.department ? `${d.department.code} · ${d.department.name}` : 'Your department at a glance'}
          </p>
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={() => setTick((t) => t + 1)} className="flex items-center gap-1.5 border border-gray-300 bg-white px-3 py-2 rounded-lg text-sm hover:bg-gray-50">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
          </button>
          <Link to="/faculty/verifications" className="flex items-center gap-1.5 bg-blue-600 text-white px-3 py-2 rounded-lg text-sm hover:bg-blue-700 font-medium">
            <ShieldCheck className="w-4 h-4" /> Review requests
          </Link>
        </div>
      </div>

      {loading ? (
        <>
          <StatCardSkeleton count={4} className="mb-4" />
          <ListRowSkeleton count={4} />
        </>
      ) : state.error ? (
        <EmptyState type="error" title="Could not load the dashboard" description={state.error} action={{ label: 'Try again', onClick: () => setTick((t) => t + 1), icon: RefreshCw }} />
      ) : (
        <>
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Profile verification</h3>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
            <StatTile label="Pending requests" value={d?.pendingRequests} icon={Clock} tone="bg-amber-50 text-amber-600" to="/faculty/verifications" />
            <StatTile label="Verified profiles" value={d?.verifiedProfiles} icon={CheckCircle2} tone="bg-green-50 text-green-600" to="/faculty/students?verification=VERIFIED" />
            <StatTile label="Rejected (awaiting correction)" value={d?.rejectedRequests} icon={XCircle} tone="bg-red-50 text-red-600" to="/faculty/students?verification=REJECTED" />
            <StatTile label="Not submitted" value={d?.notSubmitted} icon={FileQuestion} tone="bg-gray-100 text-gray-600" to="/faculty/students?verification=NOT_SUBMITTED" />
          </div>

          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Students</h3>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-8">
            <StatTile label="Total (not archived)" value={d?.totalStudents} icon={Users} tone="bg-blue-50 text-blue-600" to="/faculty/students" />
            <StatTile label="Active" value={d?.activeStudents} icon={UserCheck} tone="bg-green-50 text-green-600" to="/faculty/students?lifecycle=ACTIVE" />
            <StatTile label="Disabled" value={d?.disabledStudents} icon={Ban} tone="bg-gray-100 text-gray-600" to="/faculty/students?lifecycle=DISABLED" />
            <StatTile label="Archived" value={d?.archivedStudents} icon={Archive} tone="bg-amber-50 text-amber-600" to="/faculty/students?lifecycle=ARCHIVED" />
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-100">
            <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100">
              <h3 className="font-semibold text-gray-900 text-sm">Recent verification activity</h3>
              <Link to="/faculty/verifications?status=ALL" className="text-xs text-blue-600 hover:underline font-medium inline-flex items-center gap-1">
                All requests <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
            {activity.length === 0 ? (
              <EmptyState type="empty" icon={ShieldCheck} title="No activity yet" description="Submissions and decisions for your department will appear here." compact />
            ) : (
              <ul className="divide-y divide-gray-50">
                {activity.map((a, i) => {
                  const meta = ACTION_META[a.action] || ACTION_META.CREATED;
                  const Icon = meta.icon;
                  const byStudent = a.action === 'SUBMITTED' || a.action === 'WITHDRAWN' || a.action === 'CREATED' || a.action === 'DISCARDED';
                  return (
                    <li key={`${a.versionId}-${a.action}-${a.at}-${i}`}>
                      <Link to={`/faculty/verifications/${a.versionId}`} className="flex items-start gap-3 px-5 py-3 hover:bg-gray-50">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${meta.cls}`}><Icon className="w-4 h-4" /></div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-gray-800">
                            {byStudent ? (
                              <><span className="font-semibold">{a.studentName || a.rollNo}</span> {meta.label}</>
                            ) : (
                              <><span className="font-semibold">{a.actorName || 'A reviewer'}</span> {meta.label} <span className="font-semibold">{a.studentName || a.rollNo}</span>&apos;s request</>
                            )}
                          </p>
                          <p className="text-xs text-gray-500">
                            {a.rollNo && <span className="font-mono mr-2">{a.rollNo}</span>}
                            <span title={formatDateTime(a.at)}>{timeAgo(a.at)}</span>
                          </p>
                          {a.comment && <p className="text-xs text-gray-600 mt-0.5 truncate">“{a.comment}”</p>}
                        </div>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </>
      )}
    </main>
  );
}
