import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ChevronLeft, ChevronRight, ChevronRight as Go, RefreshCw, Search, ShieldCheck } from 'lucide-react';
import { VerificationBadge } from '../students/StatusBadges';
import EmptyState from '../EmptyState';
import { ListRowSkeleton } from '../Skeleton';
import { diffSectionLabel } from '../../utils/profileDiff';
import { formatDateTime, timeAgo } from '../../utils/dateFormat';

const TABS = [
  { value: 'PENDING', label: 'Pending', summaryKey: 'pending' },
  { value: 'APPROVED', label: 'Approved', summaryKey: 'approved' },
  { value: 'REJECTED', label: 'Rejected', summaryKey: 'rejected' },
  { value: 'ALL', label: 'All' },
];
const PAGE_SIZE = 15;

/**
 * Paged list of verification requests (VersionSummary), shared by the faculty page and the admin
 * fallback. `departments` adds a department filter (admin only).
 */
export default function VerificationList({ api, title, description, departments = null }) {
  const [searchParams] = useSearchParams();
  const initialSearch = (searchParams.get('search') || '').trim();
  const initialStatus = ['PENDING', 'APPROVED', 'REJECTED', 'ALL'].includes(searchParams.get('status')) ? searchParams.get('status') : 'PENDING';
  const [status, setStatus] = useState(initialStatus);
  const [searchInput, setSearchInput] = useState(initialSearch);
  const [search, setSearch] = useState(initialSearch);
  const [departmentCode, setDepartmentCode] = useState('');
  const [page, setPage] = useState(0);
  const [tick, setTick] = useState(0);
  const [result, setResult] = useState({ key: null, data: null, error: '' });
  const [summary, setSummary] = useState(null);

  const key = JSON.stringify({ status, search, departmentCode, page, tick });
  const loading = result.key !== key;

  useEffect(() => {
    const t = setTimeout(() => {
      setSearch(searchInput.trim());
      setPage(0);
    }, 350);
    return () => clearTimeout(t);
  }, [searchInput]);

  useEffect(() => {
    let cancelled = false;
    api.list({ status, search, departmentCode, page, size: PAGE_SIZE })
      .then((data) => { if (!cancelled) setResult({ key, data, error: '' }); })
      .catch((err) => { if (!cancelled) setResult({ key, data: null, error: err.message || 'Could not load requests.' }); });
    return () => { cancelled = true; };
    // key captures every input
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [api, key]);

  useEffect(() => {
    let cancelled = false;
    api.summary()
      .then((s) => { if (!cancelled) setSummary(s || null); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [api, tick]);

  const rows = Array.isArray(result.data?.content) ? result.data.content : [];
  const total = Number(result.data?.totalElements) || 0;
  const totalPages = Math.max(1, Number(result.data?.totalPages) || 1);

  return (
    <main className="flex-1 px-4 md:px-8 py-6 overflow-x-hidden">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-5">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-1">{title}</h2>
          {description && <p className="text-gray-500 text-sm max-w-3xl">{description}</p>}
        </div>
        <button type="button" onClick={() => setTick((t) => t + 1)} className="flex items-center justify-center gap-1.5 border border-gray-300 bg-white px-3 py-2 rounded-lg text-sm hover:bg-gray-50 shrink-0">
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
        </button>
      </div>

      <div role="tablist" aria-label="Request status" className="flex gap-1 border-b border-gray-200 mb-4 overflow-x-auto overflow-y-hidden">
        {TABS.map((t) => {
          const active = status === t.value;
          const count = t.summaryKey && summary ? summary[t.summaryKey] : null;
          return (
            <button
              key={t.value}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => { setStatus(t.value); setPage(0); }}
              className={`px-4 py-2.5 text-sm font-semibold border-b-2 -mb-px whitespace-nowrap ${active ? 'border-blue-600 text-blue-700' : 'border-transparent text-gray-500 hover:text-gray-800'}`}
            >
              {t.label}
              {count != null && (
                <span className={`ml-2 text-[11px] px-1.5 py-0.5 rounded-full ${t.value === 'PENDING' && count > 0 ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-600'}`}>{count}</span>
              )}
            </button>
          );
        })}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-4 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search by student name or register number"
            aria-label="Search requests"
            className="w-full border border-gray-300 pl-9 pr-4 py-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        {departments && (
          <select
            value={departmentCode}
            onChange={(e) => { setDepartmentCode(e.target.value); setPage(0); }}
            aria-label="Filter by department"
            className="border border-gray-300 px-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All departments</option>
            {departments.map((d) => <option key={d.id} value={d.code}>{d.code}</option>)}
          </select>
        )}
      </div>

      {loading ? (
        <ListRowSkeleton count={4} />
      ) : result.error ? (
        <EmptyState type="error" title="Could not load requests" description={result.error} action={{ label: 'Try again', onClick: () => setTick((t) => t + 1), icon: RefreshCw }} />
      ) : rows.length === 0 ? (
        <EmptyState
          type={search || departmentCode ? 'search' : 'empty'}
          icon={ShieldCheck}
          title={status === 'PENDING' && !search ? 'No pending requests' : 'No requests found'}
          description={status === 'PENDING' && !search ? 'When a student submits profile changes, they will appear here for review.' : 'Nothing matches this filter.'}
        />
      ) : (
        <ul className="space-y-2.5">
          {rows.map((r) => (
            <li key={r.id}>
              <Link
                to={`${api.basePath}/${r.id}`}
                className="group bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex flex-col sm:flex-row sm:items-center gap-3 hover:border-blue-200 hover:shadow transition"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold text-gray-900 truncate">{r.studentName || 'Student'}</span>
                    {r.rollNo && <span className="font-mono text-xs text-gray-500">{r.rollNo}</span>}
                    {departments && r.departmentCode && <span className="text-[11px] font-semibold bg-gray-100 text-gray-700 px-1.5 py-0.5 rounded">{r.departmentCode}</span>}
                    <VerificationBadge status={r.status} />
                  </div>
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    {(r.changedSections || []).map((s) => (
                      <span key={s} className="text-[11px] px-1.5 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-100">{diffSectionLabel(s)}</span>
                    ))}
                  </div>
                  {r.reviewComment && r.status !== 'PENDING' && (
                    <p className="text-xs text-gray-500 mt-1.5 truncate">“{r.reviewComment}”</p>
                  )}
                </div>
                <div className="text-xs text-gray-500 sm:text-right shrink-0">
                  <p title={formatDateTime(r.submittedAt)}>Submitted {timeAgo(r.submittedAt) || '—'}</p>
                  {r.reviewedAt && <p>{r.reviewerName ? `${r.reviewerName} · ` : ''}{timeAgo(r.reviewedAt)}</p>}
                </div>
                <Go className="hidden sm:block w-4 h-4 text-gray-300 group-hover:text-blue-500 shrink-0" />
              </Link>
            </li>
          ))}
        </ul>
      )}

      {!loading && total > PAGE_SIZE && (
        <div className="flex justify-between items-center mt-4 text-sm text-gray-500">
          <p>{total} requests</p>
          <div className="flex items-center gap-1">
            <button type="button" disabled={page === 0} onClick={() => setPage(page - 1)} className="p-1.5 rounded hover:bg-gray-200 disabled:opacity-40" aria-label="Previous page"><ChevronLeft className="w-4 h-4" /></button>
            <span className="px-2">Page {page + 1} of {totalPages}</span>
            <button type="button" disabled={page + 1 >= totalPages} onClick={() => setPage(page + 1)} className="p-1.5 rounded hover:bg-gray-200 disabled:opacity-40" aria-label="Next page"><ChevronRight className="w-4 h-4" /></button>
          </div>
        </div>
      )}
    </main>
  );
}
