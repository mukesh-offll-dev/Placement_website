import { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, History, RefreshCw } from 'lucide-react';
import EmptyState from '../components/EmptyState';
import { TableSkeleton } from '../components/Skeleton';
import { getAuditLogs } from '../services/api/adminService';
import { formatDateTime } from '../utils/dateFormat';
import { roleLabel } from '../utils/roles';

const PAGE_SIZE = 25;
const ENTITY_TYPES = ['STUDENT', 'FACULTY', 'DEPARTMENT', 'PROFILE_VERSION'];
const GRID = { gridTemplateColumns: '160px 1fr 1.2fr 0.9fr 2fr' };

const humanize = (v) => String(v || '').toLowerCase().replace(/_/g, ' ').replace(/^\w/, (c) => c.toUpperCase());

/** /admin/audit-logs (ADMIN): who did what to which record. Never contains passwords. */
export default function AdminAuditLogs() {
  const [actionInput, setActionInput] = useState('');
  const [action, setAction] = useState('');
  const [entityType, setEntityType] = useState('');
  const [page, setPage] = useState(0);
  const [tick, setTick] = useState(0);
  const [result, setResult] = useState({ key: null, data: null, error: '' });

  const key = JSON.stringify({ action, entityType, page, tick });
  const loading = result.key !== key;

  useEffect(() => {
    const t = setTimeout(() => {
      setAction(actionInput.trim().toUpperCase().replace(/\s+/g, '_'));
      setPage(0);
    }, 400);
    return () => clearTimeout(t);
  }, [actionInput]);

  useEffect(() => {
    let cancelled = false;
    getAuditLogs({ page, size: PAGE_SIZE, action, entityType })
      .then((data) => { if (!cancelled) setResult({ key, data, error: '' }); })
      .catch((err) => { if (!cancelled) setResult({ key, data: null, error: err.message || 'Could not load the audit log.' }); });
    return () => { cancelled = true; };
    // key captures every input
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  const rows = Array.isArray(result.data?.content) ? result.data.content : [];
  const total = Number(result.data?.totalElements) || 0;
  const totalPages = Math.max(1, Number(result.data?.totalPages) || 1);

  return (
    <main className="flex-1 px-4 md:px-8 py-6 overflow-x-hidden">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-5">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-1">Audit log</h2>
          <p className="text-gray-500 text-sm">Bulk actions, archiving, faculty and department changes, and verification decisions.</p>
        </div>
        <button type="button" onClick={() => setTick((t) => t + 1)} className="flex items-center justify-center gap-1.5 border border-gray-300 bg-white px-3 py-2 rounded-lg text-sm hover:bg-gray-50 shrink-0">
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-4 flex flex-col sm:flex-row gap-3">
        <input
          value={actionInput}
          onChange={(e) => setActionInput(e.target.value)}
          placeholder="Action, e.g. STUDENT_ARCHIVE"
          aria-label="Filter by action"
          className="flex-1 border border-gray-300 px-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <select
          value={entityType}
          onChange={(e) => { setEntityType(e.target.value); setPage(0); }}
          aria-label="Filter by record type"
          className="border border-gray-300 px-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">All record types</option>
          {ENTITY_TYPES.map((t) => <option key={t} value={t}>{humanize(t)}</option>)}
        </select>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-x-auto">
        <div className="min-w-[860px]">
          <div style={GRID} className="grid gap-3 px-4 py-3 bg-gray-50 text-xs font-semibold text-gray-600 border-b border-gray-200">
            <div>When</div>
            <div>Who</div>
            <div>Action</div>
            <div>Record</div>
            <div>Details</div>
          </div>
          {loading ? (
            <TableSkeleton rows={8} cols={5} className="shadow-none rounded-none" />
          ) : result.error ? (
            <div className="p-4">
              <EmptyState type="error" title="Could not load the audit log" description={result.error} action={{ label: 'Try again', onClick: () => setTick((t) => t + 1), icon: RefreshCw }} compact />
            </div>
          ) : rows.length === 0 ? (
            <div className="p-4">
              <EmptyState type={action || entityType ? 'search' : 'empty'} icon={History} title="No entries" description={action || entityType ? 'Nothing matches these filters.' : 'Audited actions will appear here.'} compact />
            </div>
          ) : (
            rows.map((r) => (
              <div key={r.id} style={GRID} className="grid gap-3 px-4 py-3 border-b border-gray-100 last:border-b-0 text-sm items-start">
                <div className="text-xs text-gray-500">{formatDateTime(r.createdAt)}</div>
                <div className="min-w-0">
                  <p className="text-gray-900 truncate">{r.actorName || (r.actorUserId ? `User #${r.actorUserId}` : 'System')}</p>
                  {r.actorRole && <p className="text-[11px] text-gray-400">{roleLabel(r.actorRole)}</p>}
                </div>
                <div><span className="font-mono text-[11px] bg-gray-100 text-gray-800 px-1.5 py-0.5 rounded break-all">{r.action}</span></div>
                <div className="text-xs text-gray-600">{humanize(r.entityType)}{r.entityId != null ? ` #${r.entityId}` : ''}</div>
                <div className="text-xs text-gray-600 whitespace-pre-wrap break-words">{r.details || '—'}</div>
              </div>
            ))
          )}
        </div>
      </div>

      {!loading && total > PAGE_SIZE && (
        <div className="flex justify-between items-center mt-4 text-sm text-gray-500">
          <p>{total} entries</p>
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
