import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import {
  AlertCircle,
  Archive,
  Ban,
  ChevronLeft,
  ChevronRight,
  Eye,
  KeyRound,
  Pencil,
  Plus,
  RefreshCw,
  RotateCcw,
  Search,
  Trash2,
  Users,
  UserPlus,
} from 'lucide-react';
import ActionsCell from './ActionsCell';
import { BulkActionBar, BulkConfirmDialog } from './BulkActionBar';
import { Field, Modal } from './Modal';
import { inputClass } from './formStyles';
import { LifecycleBadge, VerificationBadge } from './StatusBadges';
import { AddStudentModal, BulkAddModal, EditStudentModal } from './StudentFormModals';
import EmptyState from '../EmptyState';
import { TableSkeleton } from '../Skeleton';
import { toastError, toastSuccess, toastWarning } from '../../utils/toast';
import { normalizeRegisterNumber, yearFromBatch } from '../../utils/studentValidation';
import {
  LIFECYCLE_TABS,
  VERIFICATION_STATUSES,
  VERIFICATION_BADGES,
  bulkActionsFor,
  chunkIds,
  lifecycleOf,
  mergeBulkResults,
  summarizeBulkResult,
} from '../../utils/studentQuery';

const PAGE_SIZE = 20;

const SINGLE_COPY = {
  deactivate: {
    title: 'Disable student?',
    body: (s) => `${s.rollNo} will be signed out and unable to sign in until enabled again. Their data is kept.`,
    button: 'Disable',
    tone: 'bg-gray-700 hover:bg-gray-800',
  },
  reactivate: {
    title: 'Enable student?',
    body: (s) => `${s.rollNo} will be able to sign in again.`,
    button: 'Enable',
    tone: 'bg-green-600 hover:bg-green-700',
  },
  archive: {
    title: 'Archive student?',
    body: (s) => `${s.rollNo} keeps read-only access but cannot apply for jobs or edit their profile, and is hidden from the default lists. History is kept.`,
    button: 'Archive',
    tone: 'bg-amber-600 hover:bg-amber-700',
  },
  restore: {
    title: 'Restore student?',
    body: (s) => `${s.rollNo} becomes active again.`,
    button: 'Restore',
    tone: 'bg-blue-600 hover:bg-blue-700',
  },
  reset: {
    title: 'Reset password?',
    body: (s) => `${s.rollNo}'s password will be set back to their register number, and they must choose a new one the next time they sign in.`,
    button: 'Reset password',
    tone: 'bg-blue-600 hover:bg-blue-700',
  },
  delete: {
    title: 'Delete student?',
    body: (s) => `This removes ${s.rollNo} from the portal and blocks sign-in. Their applications are kept for the records, and the register number stays reserved. This cannot be undone from here.`,
    button: 'Delete student',
    tone: 'bg-red-600 hover:bg-red-700',
  },
};

const pageOf = (data) => ({
  content: Array.isArray(data?.content) ? data.content : Array.isArray(data) ? data : [],
  totalElements: Number(data?.totalElements ?? (Array.isArray(data) ? data.length : 0)) || 0,
  totalPages: Math.max(1, Number(data?.totalPages) || 1),
});

/**
 * Student management table shared by the admin and faculty portals: lifecycle tabs, server-side
 * search/filters/paging, row selection with "select all matching", bulk actions, and per-row
 * edit / disable / archive / reset / delete.
 *
 * @param {object} props
 * @param {object} props.api - adminStudentApi or facultyStudentApi (services/api/studentManagementApi)
 * @param {Array} [props.departments] - every department (admin); used for the filter and edit form
 * @param {Array} [props.activeDepartments] - departments a new student can join (admin)
 * @param {{code: string, name?: string}|null} [props.fixedDepartment] - faculty: their department
 * @param {boolean} [props.canRestore] - ADMIN only
 * @param {boolean} [props.showPlacement] - placement fields in the edit form
 * @param {object} [props.initialFilters] - { lifecycle, verificationStatus, batch }
 * @param {React.ReactNode} [props.toolbarExtra]
 * @param {number} [props.reloadKey] - bump to reload from outside
 * @param {() => void} [props.onChanged] - called after any change (e.g. to refresh counts)
 */
export default function StudentManager({
  api,
  departments = [],
  activeDepartments = [],
  fixedDepartment = null,
  canRestore = false,
  showPlacement = true,
  initialFilters = {},
  toolbarExtra = null,
  reloadKey = 0,
  onChanged,
}) {
  const navigate = useNavigate();
  const location = useLocation();
  const [urlParams, setUrlParams] = useSearchParams();
  const [lifecycle, setLifecycle] = useState(initialFilters.lifecycle || 'ACTIVE');
  // The filters live in the page URL too, so opening a student and pressing Back returns to the same
  // tab, search and filters (the detail page goes back to the exact URL it was opened from).
  const [searchInput, setSearchInput] = useState(urlParams.get('q') || '');
  const [search, setSearch] = useState(urlParams.get('q') || '');
  const [verificationStatus, setVerificationStatus] = useState(initialFilters.verificationStatus || '');
  const [batch, setBatch] = useState(initialFilters.batch || urlParams.get('batch') || '');
  const [department, setDepartment] = useState(urlParams.get('dept') || '');
  const [page, setPage] = useState(0);
  const [tick, setTick] = useState(0);
  const [result, setResult] = useState({ key: null, page: pageOf(null), error: '' });

  const [selected, setSelected] = useState(() => new Set());
  const [allMatching, setAllMatching] = useState(false);
  const [selectingAll, setSelectingAll] = useState(false);
  const [bulkAction, setBulkAction] = useState(null);
  const [bulkBusy, setBulkBusy] = useState(false);

  const [addModal, setAddModal] = useState(null); // 'single' | 'bulk'
  const [editing, setEditing] = useState(null);
  const [confirm, setConfirm] = useState(null); // { kind, student, typed }
  const [busyId, setBusyId] = useState(null);

  const filters = useMemo(() => ({
    search,
    lifecycle,
    verificationStatus,
    batch: batch.trim(),
    department: fixedDepartment ? '' : department,
  }), [search, lifecycle, verificationStatus, batch, department, fixedDepartment]);

  useEffect(() => {
    setUrlParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        const put = (key, value, fallback = '') => (value && value !== fallback ? next.set(key, value) : next.delete(key));
        put('lifecycle', lifecycle, 'ACTIVE');
        put('verification', verificationStatus);
        put('batch', batch.trim());
        put('dept', fixedDepartment ? '' : department);
        put('q', search);
        return next.toString() === prev.toString() ? prev : next;
      },
      { replace: true }
    );
  }, [lifecycle, verificationStatus, batch, department, search, fixedDepartment, setUrlParams]);

  const openDetail = (studentId) =>
    navigate(api.detailPath(studentId), { state: { from: `${location.pathname}${location.search}` } });

  const requestKey = JSON.stringify({ ...filters, page, tick, reloadKey });
  const loading = result.key !== requestKey;
  const { content: rows, totalElements, totalPages } = result.page;

  // Debounce the search box.
  useEffect(() => {
    const t = setTimeout(() => {
      const next = searchInput.trim();
      setSearch(next);
      setPage(0);
      setSelected(new Set());
      setAllMatching(false);
    }, 350);
    return () => clearTimeout(t);
  }, [searchInput]);

  useEffect(() => {
    let cancelled = false;
    api.list({ ...filters, page, size: PAGE_SIZE, sortBy: 'createdAt', sortDir: 'desc' })
      .then((data) => { if (!cancelled) setResult({ key: requestKey, page: pageOf(data), error: '' }); })
      .catch((err) => { if (!cancelled) setResult({ key: requestKey, page: pageOf(null), error: err.message || 'Could not load students.' }); });
    return () => { cancelled = true; };
    // requestKey captures filters, page, tick and reloadKey.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [api, requestKey]);

  const refresh = useCallback(() => setTick((t) => t + 1), []);
  const changed = useCallback(() => {
    refresh();
    onChanged?.();
  }, [refresh, onChanged]);

  const resetSelection = () => {
    setSelected(new Set());
    setAllMatching(false);
  };

  const changeFilter = (setter) => (value) => {
    setter(value);
    setPage(0);
    resetSelection();
  };

  const departmentName = (code) => departments.find((d) => d.code === String(code ?? '').toUpperCase())?.name;

  // ------------------------------------------------------------ selection

  const pageIds = rows.map((s) => s.id);
  const selectedOnPage = pageIds.filter((id) => selected.has(id)).length;
  const allPageSelected = pageIds.length > 0 && selectedOnPage === pageIds.length;

  const togglePage = () => {
    setAllMatching(false);
    setSelected((prev) => {
      const next = new Set(prev);
      if (allPageSelected) pageIds.forEach((id) => next.delete(id));
      else pageIds.forEach((id) => next.add(id));
      return next;
    });
  };

  const toggleOne = (id) => {
    setAllMatching(false);
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAllMatching = async () => {
    setSelectingAll(true);
    try {
      const ids = await api.ids(filters);
      const list = Array.isArray(ids) ? ids : [];
      setSelected(new Set(list));
      setAllMatching(true);
      if (list.length < totalElements) {
        toastWarning(`Selected the first ${list.length} of ${totalElements} matching students (the limit for one selection).`);
      }
    } catch (err) {
      toastError(err, 'Could not select every matching student.');
    } finally {
      setSelectingAll(false);
    }
  };

  // ------------------------------------------------------------ bulk

  const runBulk = async (reason) => {
    if (!bulkAction || bulkBusy) return;
    const ids = Array.from(selected);
    setBulkBusy(true);
    try {
      const results = [];
      for (const chunk of chunkIds(ids)) {
        results.push(await api.bulk(chunk, bulkAction, reason));
      }
      const merged = mergeBulkResults(results);
      const summary = summarizeBulkResult(bulkAction, merged);
      if (merged.failed.length > 0) {
        const first = merged.failed[0];
        toastWarning(`${summary}. ${first?.reason ? `First failure: ${first.reason}` : ''}`.trim());
      } else {
        toastSuccess(summary);
      }
      setBulkAction(null);
      resetSelection();
      changed();
    } catch (err) {
      toastError(err, 'The bulk action could not be completed.');
    } finally {
      setBulkBusy(false);
    }
  };

  // ------------------------------------------------------------ single actions

  const runConfirmed = async () => {
    if (!confirm || busyId) return;
    const { kind, student } = confirm;
    setBusyId(student.id);
    try {
      if (kind === 'deactivate') await api.deactivate(student.id);
      if (kind === 'reactivate') await api.reactivate(student.id);
      if (kind === 'reset') await api.resetPassword(student.id);
      if (kind === 'delete') await api.remove(student.id);
      if (kind === 'archive' || kind === 'restore') {
        const res = await api.bulk([student.id], kind.toUpperCase());
        const failed = Array.isArray(res?.failed) ? res.failed : [];
        if (failed.length > 0 || Number(res?.succeeded) === 0) {
          throw new Error(failed[0]?.reason || 'The student was skipped.');
        }
      }
      toastSuccess({
        deactivate: `${student.rollNo} disabled. They can no longer sign in.`,
        reactivate: `${student.rollNo} enabled.`,
        archive: `${student.rollNo} archived.`,
        restore: `${student.rollNo} restored.`,
        reset: `Password for ${student.rollNo} reset to their register number.`,
        delete: `${student.rollNo} deleted.`,
      }[kind]);
      setConfirm(null);
      setSelected((prev) => {
        if (!prev.has(student.id)) return prev;
        const next = new Set(prev);
        next.delete(student.id);
        return next;
      });
      changed();
    } catch (err) {
      toastError(err, err.message || 'The action could not be completed.');
    } finally {
      setBusyId(null);
    }
  };

  const rowItems = (s) => {
    const lc = lifecycleOf(s);
    const items = [{ key: 'view', label: 'View profile', icon: Eye, onClick: () => openDetail(s.id) }];
    if (lc === 'ACTIVE') items.push({ key: 'deactivate', label: 'Disable', icon: Ban, tone: 'warn', onClick: () => setConfirm({ kind: 'deactivate', student: s, typed: '' }) });
    if (lc === 'DISABLED') items.push({ key: 'reactivate', label: 'Enable', icon: RotateCcw, tone: 'good', onClick: () => setConfirm({ kind: 'reactivate', student: s, typed: '' }) });
    if (lc !== 'ARCHIVED') items.push({ key: 'archive', label: 'Archive', icon: Archive, tone: 'warn', onClick: () => setConfirm({ kind: 'archive', student: s, typed: '' }) });
    if (lc === 'ARCHIVED' && canRestore) items.push({ key: 'restore', label: 'Restore', icon: RotateCcw, tone: 'good', onClick: () => setConfirm({ kind: 'restore', student: s, typed: '' }) });
    items.push({ key: 'reset', label: 'Reset password', icon: KeyRound, onClick: () => setConfirm({ kind: 'reset', student: s, typed: '' }) });
    items.push({ key: 'delete', label: 'Delete', icon: Trash2, tone: 'danger', separatorBefore: true, onClick: () => setConfirm({ kind: 'delete', student: s, typed: '' }) });
    return items;
  };

  const showDeptColumn = !fixedDepartment;
  const grid = {
    gridTemplateColumns: showDeptColumn
      ? '32px 1.2fr 1.4fr 0.7fr 0.7fr 0.5fr 0.8fr 0.9fr 132px'
      : '32px 1.2fr 1.5fr 0.7fr 0.5fr 0.8fr 0.9fr 132px',
  };
  const noAddDepartments = !fixedDepartment && activeDepartments.length === 0;
  const actions = bulkActionsFor(lifecycle, { canRestore });

  return (
    <section>
      {/* Lifecycle tabs */}
      <div role="tablist" aria-label="Student status" className="flex gap-1 border-b border-gray-200 mb-4 overflow-x-auto overflow-y-hidden">
        {LIFECYCLE_TABS.map((t) => {
          const active = lifecycle === t.value;
          return (
            <button
              key={t.value}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => changeFilter(setLifecycle)(t.value)}
              className={`px-4 py-2.5 text-sm font-semibold border-b-2 -mb-px whitespace-nowrap transition-colors ${
                active ? 'border-blue-600 text-blue-700' : 'border-transparent text-gray-500 hover:text-gray-800'
              }`}
            >
              {t.label}
              {active && !loading && (
                <span className="ml-2 text-[11px] px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-700">{totalElements}</span>
              )}
            </button>
          );
        })}
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-4 flex flex-col lg:flex-row lg:items-center gap-3">
        <div className="relative flex-1 min-w-0">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search by register number, name or email"
            aria-label="Search students"
            className="w-full border border-gray-300 pl-9 pr-4 py-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div className="grid grid-cols-2 sm:flex gap-2">
          {showDeptColumn && (
            <select
              value={department}
              onChange={(e) => changeFilter(setDepartment)(e.target.value)}
              aria-label="Filter by department"
              className="border border-gray-300 px-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All departments</option>
              {departments.map((d) => <option key={d.id} value={d.code}>{d.code}</option>)}
            </select>
          )}
          <select
            value={verificationStatus}
            onChange={(e) => changeFilter(setVerificationStatus)(e.target.value)}
            aria-label="Filter by verification status"
            className="border border-gray-300 px-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Any verification</option>
            {VERIFICATION_STATUSES.map((v) => <option key={v} value={v}>{VERIFICATION_BADGES[v].label}</option>)}
          </select>
          <input
            value={batch}
            onChange={(e) => changeFilter(setBatch)(e.target.value.replace(/[^\d-]/g, '').slice(0, 9))}
            placeholder="Batch (e.g. 2026)"
            aria-label="Filter by batch"
            inputMode="numeric"
            className="border border-gray-300 px-3 py-2 rounded-lg text-sm w-full sm:w-36 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button type="button" onClick={refresh} className="flex items-center justify-center gap-1.5 border border-gray-300 px-3 py-2 rounded-lg text-sm hover:bg-gray-50">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
          </button>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-end gap-2 mb-3">
        {toolbarExtra}
        <button
          type="button"
          onClick={() => setAddModal('bulk')}
          disabled={noAddDepartments}
          className="flex items-center gap-1.5 border border-blue-600 text-blue-700 px-3 py-2 rounded-lg text-sm hover:bg-blue-50 font-medium disabled:opacity-50"
        >
          <Users className="w-4 h-4" /> Add range
        </button>
        <button
          type="button"
          onClick={() => setAddModal('single')}
          disabled={noAddDepartments}
          className="flex items-center gap-1.5 bg-blue-600 text-white px-3 py-2 rounded-lg text-sm hover:bg-blue-700 font-medium disabled:opacity-50"
        >
          <UserPlus className="w-4 h-4" /> Add student
        </button>
      </div>

      <BulkActionBar
        count={selected.size}
        pageCount={pageIds.length}
        matchingTotal={totalElements}
        allMatchingSelected={allMatching}
        selectingAll={selectingAll}
        onSelectAllMatching={selectAllMatching}
        onClear={resetSelection}
        actions={actions}
        onAction={setBulkAction}
        busy={bulkBusy}
      />

      {result.error && !loading && (
        <div className="flex items-center justify-between gap-2 bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-xl mb-4" role="alert">
          <span className="flex items-center gap-2"><AlertCircle className="w-4 h-4" /> {result.error}</span>
          <button type="button" onClick={refresh} className="underline font-medium">Retry</button>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-x-auto">
        <div className="min-w-[880px]">
          <div style={grid} className="grid gap-3 px-4 py-3 bg-gray-50 text-xs font-semibold text-gray-600 border-b border-gray-200 items-center">
            <div>
              <input
                type="checkbox"
                aria-label="Select all students on this page"
                checked={allPageSelected}
                ref={(el) => { if (el) el.indeterminate = selectedOnPage > 0 && !allPageSelected; }}
                onChange={togglePage}
                disabled={loading || pageIds.length === 0}
                className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
            </div>
            <div>Register No.</div>
            <div>Name</div>
            {showDeptColumn && <div>Department</div>}
            <div>Passing year</div>
            <div>CGPA</div>
            <div>Status</div>
            <div>Verification</div>
            <div className="text-right sticky right-0 bg-gray-50">Actions</div>
          </div>

          {loading ? (
            <TableSkeleton rows={6} cols={6} className="shadow-none rounded-none" />
          ) : rows.length === 0 ? (
            <div className="p-4">
              <EmptyState
                type={search || verificationStatus || batch || department ? 'search' : 'empty'}
                icon={Users}
                title={search || verificationStatus || batch || department ? 'No matching students' : 'No students here'}
                description={search || verificationStatus || batch || department
                  ? 'No students match your search and filters.'
                  : `There are no ${lifecycle === 'ALL' ? '' : `${lifecycle.toLowerCase()} `}students yet.`}
                action={lifecycle === 'ACTIVE' && !noAddDepartments ? { label: 'Add student', onClick: () => setAddModal('single'), icon: Plus } : undefined}
                compact
              />
            </div>
          ) : (
            rows.map((s) => {
              const notSetUp = s.profileSetupCompleted === false;
              const code = s.departmentCode || s.department;
              const isSelected = selected.has(s.id);
              return (
                <div
                  key={s.id}
                  style={grid}
                  className={`group grid gap-3 px-4 py-3 border-b border-gray-100 last:border-b-0 items-center text-sm ${isSelected ? 'bg-blue-50/50' : 'hover:bg-gray-50'}`}
                >
                  <div>
                    <input
                      type="checkbox"
                      aria-label={`Select ${s.rollNo}`}
                      checked={isSelected}
                      onChange={() => toggleOne(s.id)}
                      className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                  </div>
                  <div className="font-mono text-xs text-gray-800 break-all">
                    <Link to={api.detailPath(s.id)} state={{ from: `${location.pathname}${location.search}` }} className="hover:text-blue-700 hover:underline">{s.rollNo || '—'}</Link>
                  </div>
                  <div className="min-w-0">
                    <p className={`truncate ${notSetUp ? 'text-gray-400 italic' : 'font-medium text-gray-900'}`}>
                      {notSetUp ? 'Not set up yet' : s.fullName}
                    </p>
                    {s.email && <p className="text-xs text-gray-400 truncate">{s.email}</p>}
                  </div>
                  {showDeptColumn && (
                    <div>
                      {code ? (
                        <span className="inline-block font-semibold text-xs px-2 py-1 rounded-md bg-gray-100 text-gray-800" title={departmentName(s.departmentCode) || s.department}>
                          {code}
                        </span>
                      ) : '—'}
                    </div>
                  )}
                  <div className="text-gray-600">{yearFromBatch(s.batch) || '—'}</div>
                  <div className="text-gray-700">{s.cgpa ?? '—'}</div>
                  <div className="flex flex-wrap gap-1">
                    <LifecycleBadge status={lifecycleOf(s)} />
                    {notSetUp && <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold bg-yellow-100 text-yellow-700">Setup pending</span>}
                  </div>
                  <div><VerificationBadge status={s.profileVerificationStatus} /></div>
                  <ActionsCell
                    sticky
                    label={s.rollNo}
                    busy={busyId === s.id}
                    primary={{ label: 'Edit', icon: Pencil, onClick: () => setEditing(s) }}
                    items={rowItems(s)}
                  />
                </div>
              );
            })
          )}
        </div>
      </div>

      {!loading && totalElements > 0 && (
        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2 mt-4 text-sm text-gray-500">
          <p>
            Showing {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, totalElements)} of {totalElements}
          </p>
          <div className="flex items-center gap-1">
            <button type="button" disabled={page === 0} onClick={() => setPage(page - 1)} className="p-1.5 rounded hover:bg-gray-200 disabled:opacity-40" aria-label="Previous page">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="px-2">Page {page + 1} of {totalPages}</span>
            <button type="button" disabled={page + 1 >= totalPages} onClick={() => setPage(page + 1)} className="p-1.5 rounded hover:bg-gray-200 disabled:opacity-40" aria-label="Next page">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Modals */}
      {addModal === 'single' && (
        <AddStudentModal api={api} departments={activeDepartments} fixedDepartment={fixedDepartment} onClose={() => setAddModal(null)} onAdded={changed} />
      )}
      {addModal === 'bulk' && (
        <BulkAddModal api={api} departments={activeDepartments} fixedDepartment={fixedDepartment} onClose={() => setAddModal(null)} onAdded={changed} />
      )}
      {editing && (
        <EditStudentModal
          api={api}
          student={editing}
          departments={departments}
          fixedDepartment={fixedDepartment}
          showPlacement={showPlacement}
          onClose={() => setEditing(null)}
          onSaved={changed}
        />
      )}
      {bulkAction && (
        <BulkConfirmDialog
          key={bulkAction}
          action={bulkAction}
          count={selected.size}
          busy={bulkBusy}
          onConfirm={runBulk}
          onCancel={() => !bulkBusy && setBulkAction(null)}
        />
      )}
      {confirm && (
        <Modal title={SINGLE_COPY[confirm.kind].title} onClose={() => setConfirm(null)} locked={Boolean(busyId)}>
          <p className="text-sm text-gray-600 mb-4">{SINGLE_COPY[confirm.kind].body(confirm.student)}</p>
          {confirm.kind === 'delete' && (
            <Field label={`Type ${confirm.student.rollNo} to confirm`} htmlFor="confirm-typed">
              <input
                id="confirm-typed"
                value={confirm.typed}
                onChange={(e) => setConfirm((c) => ({ ...c, typed: e.target.value }))}
                autoComplete="off"
                className={inputClass(false)}
              />
            </Field>
          )}
          <div className="flex justify-end gap-2 mt-5">
            <button type="button" onClick={() => setConfirm(null)} disabled={Boolean(busyId)} className="px-4 py-2 rounded-lg text-sm border border-gray-300 hover:bg-gray-50">
              Cancel
            </button>
            <button
              type="button"
              onClick={runConfirmed}
              disabled={Boolean(busyId)
                || (confirm.kind === 'delete' && normalizeRegisterNumber(confirm.typed) !== normalizeRegisterNumber(confirm.student.rollNo))}
              className={`flex items-center gap-1.5 text-white px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50 ${SINGLE_COPY[confirm.kind].tone}`}
            >
              {SINGLE_COPY[confirm.kind].button}
            </button>
          </div>
        </Modal>
      )}
    </section>
  );
}
