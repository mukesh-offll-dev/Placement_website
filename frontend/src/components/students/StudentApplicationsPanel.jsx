import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Briefcase, Calendar, Loader2, AlertCircle, RefreshCw, ExternalLink } from 'lucide-react';
import ApplicationProgress from '../ApplicationProgress';
import EmptyState from '../EmptyState';
import { formatDate } from '../../utils/dateFormat';
import { formatCtc, summarizeApplications, isPlaced } from '../../utils/placement';

const STATUS_STYLE = {
  APPLIED: 'bg-gray-100 text-gray-700',
  UNDER_REVIEW: 'bg-yellow-100 text-yellow-800',
  SHORTLISTED: 'bg-blue-100 text-blue-700',
  INTERVIEW: 'bg-purple-100 text-purple-700',
  SELECTED: 'bg-emerald-100 text-emerald-700',
  REJECTED: 'bg-rose-100 text-rose-700',
  WITHDRAWN: 'bg-gray-100 text-gray-500',
};

const statusLabel = (s) =>
  typeof s === 'string' ? s.toLowerCase().replaceAll('_', ' ').replace(/\b\w/g, (c) => c.toUpperCase()) : 'Unknown';

/**
 * Every job application of one student, for the admin / placement officer.
 * A student may apply to any number of drives; each one is tracked here with its stage.
 */
export default function StudentApplicationsPanel({ studentId, fetchApplications, student }) {
  const [state, setState] = useState({ status: 'loading', items: [] });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let active = true;
    fetchApplications(studentId)
      .then((items) => {
        if (active) setState({ status: 'success', items: Array.isArray(items) ? items : [] });
      })
      .catch((err) => {
        if (active) setState({ status: 'error', items: [], message: err?.message });
      });
    return () => {
      active = false;
    };
  }, [studentId, fetchApplications, attempt]);

  const load = useCallback(() => {
    setState({ status: 'loading', items: [] });
    setAttempt((n) => n + 1);
  }, []);

  if (state.status === 'loading') {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm py-12 flex items-center justify-center gap-2 text-sm text-gray-500">
        <Loader2 className="w-4 h-4 animate-spin text-blue-600" /> Loading applications…
      </div>
    );
  }

  if (state.status === 'error') {
    return (
      <div className="flex items-center justify-between gap-3 p-4 bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl">
        <span className="flex items-center gap-2"><AlertCircle className="w-4 h-4" /> {state.message || 'Could not load applications.'}</span>
        <button type="button" onClick={load} className="flex items-center gap-1.5 bg-red-100 hover:bg-red-200 px-3 py-1.5 rounded-lg text-xs font-semibold">
          <RefreshCw className="w-3.5 h-3.5" /> Retry
        </button>
      </div>
    );
  }

  const summary = summarizeApplications(state.items);
  const placed = isPlaced(student?.status);

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Applied', value: summary.total, color: 'text-gray-900' },
          { label: 'In progress', value: summary.inProgress, color: 'text-blue-600' },
          { label: 'Offers', value: summary.offers, color: 'text-emerald-600' },
          { label: 'Placement', value: placed ? 'Placed' : 'Not placed', color: placed ? 'text-green-600' : 'text-gray-500' },
        ].map(({ label, value, color }) => (
          <div key={label} className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
            <p className="text-xs text-gray-500">{label}</p>
            <p className={`text-2xl font-bold mt-0.5 ${color}`}>{value}</p>
          </div>
        ))}
      </div>

      {state.items.length === 0 ? (
        <EmptyState
          type="empty"
          icon={Briefcase}
          title="No applications yet"
          description="This student hasn't applied to any job drive yet."
          compact
        />
      ) : (
        <div className="space-y-3">
          {state.items.map((app) => {
            const company = app.job?.company?.name || 'Company';
            const ctc = formatCtc(app.job?.ctcValue) || app.job?.ctcText || null;
            return (
              <div key={app.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 sm:p-5">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-semibold text-gray-900">{company}</p>
                    <p className="text-sm text-gray-500">{app.job?.jobRole || 'Role'}</p>
                    <div className="flex flex-wrap gap-3 mt-1.5 text-xs text-gray-400">
                      <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> Applied {formatDate(app.appliedOn)}</span>
                      {ctc && <span className="flex items-center gap-1"><Briefcase className="w-3 h-3" /> {ctc}</span>}
                      {app.currentStage && <span className="font-medium text-blue-600">Stage: {app.currentStage}</span>}
                    </div>
                  </div>
                  <span className={`self-start text-xs px-2.5 py-1 rounded-full font-semibold ${STATUS_STYLE[app.status] || 'bg-gray-100 text-gray-600'}`}>
                    {statusLabel(app.status)}
                  </span>
                </div>
                <div className="mt-4">
                  <ApplicationProgress status={app.status} viewer="staff" />
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Link to="/admin/applications" className="inline-flex items-center gap-1.5 text-sm font-semibold text-blue-600 hover:underline">
        Update stages in Applications <ExternalLink className="w-3.5 h-3.5" />
      </Link>
    </div>
  );
}
