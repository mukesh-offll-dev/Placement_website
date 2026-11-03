import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link, useSearchParams } from 'react-router-dom';
import {
  AlertCircle,
  ArrowLeft,
  Ban,
  Building2,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Ellipsis,
  Info,
  KeyRound,
  ListChecks,
  Loader2,
  Mail,
  Pencil,
  Plus,
  Power,
  RefreshCw,
  RotateCcw,
  Search,
  Trash2,
  UserPlus,
  Users,
  X,
} from 'lucide-react';
import {
  getAllStudents,
  getStudentById,
  provisionStudent,
  provisionStudentsBulk,
  updateStudent,
  deactivateStudent,
  reactivateStudent,
  resetStudentPassword,
  deleteStudent,
  sendProfileReminders,
} from '../services/api/adminService';
import { getCompanies } from '../services/api/jobService';
import { createDepartment, updateDepartment, deleteDepartment } from '../services/api/departmentService';
import useDepartments from '../hooks/useDepartments';
import EmptyState from '../components/EmptyState';
import { toastSuccess, toastError } from '../utils/toast';
import {
  MAX_BULK,
  digitsOnly,
  normalizeRegisterNumber,
  expandRegisterRange,
  validateProvisionForm,
  validateBulkForm,
  validateStudentEditForm,
  validateDepartmentForm,
  buildStudentEditPayload,
  yearFromBatch,
} from '../utils/studentValidation';

const PAGE_SIZE = 10;
// Column widths for the header and every row, so they line up. The last column is fixed: it holds
// the Edit button and the "more" menu.
const ROW_GRID = { gridTemplateColumns: '1.2fr 1.3fr 0.8fr 0.9fr 0.5fr 1fr 132px' };
const DEPT_GRID = { gridTemplateColumns: '0.8fr 2.4fr 0.8fr 1fr 132px' };
const THIS_YEAR = new Date().getFullYear();
const YEARS = Array.from({ length: 9 }, (_, i) => THIS_YEAR - 2 + i);
const DEFAULT_YEAR = String(THIS_YEAR + 2);
const PLACEMENT_STATUSES = ['PENDING', 'ACTIVE', 'PLACED', 'BLOCKED'];
const STATUS_FILTERS = [
  { value: 'ALL', label: 'All students' },
  { value: 'ACTIVE', label: 'Active' },
  { value: 'INACTIVE', label: 'Deactivated' },
  { value: 'SETUP', label: 'Setup pending' },
];

const inputClass = (hasError) =>
  `w-full px-3 py-2.5 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-60 disabled:bg-gray-50 ${
    hasError ? 'border-red-400' : 'border-gray-300'
  }`;

const emptySingle = (department = '') => ({ registerNumber: '', department, year: DEFAULT_YEAR });
const emptyBulk = (department = '') => ({ registerNumberFrom: '', registerNumberTo: '', department, year: DEFAULT_YEAR });

function Field({ label, htmlFor, error, hint, children }) {
  return (
    <div>
      <label htmlFor={htmlFor} className="block text-xs font-semibold text-gray-700 mb-1">
        {label}
      </label>
      {children}
      {error ? (
        <p className="text-red-500 text-xs mt-1">{error}</p>
      ) : hint ? (
        <p className="text-gray-400 text-xs mt-1">{hint}</p>
      ) : null}
    </div>
  );
}

function Modal({ title, subtitle, onClose, children, wide = false, locked = false }) {
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && !locked && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose, locked]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label={title}>
      <div className="absolute inset-0 bg-gray-900/50 backdrop-blur-[1px]" onClick={() => !locked && onClose()} />
      <div className={`relative bg-white rounded-2xl shadow-xl w-full ${wide ? 'max-w-3xl' : 'max-w-lg'} max-h-[90vh] overflow-y-auto`}>
        <div className="flex items-start justify-between gap-3 px-6 py-4 border-b border-gray-100">
          <div>
            <h3 className="font-bold text-gray-900">{title}</h3>
            {subtitle && <p className="text-xs text-gray-500 mt-0.5">{subtitle}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={locked}
            className="p-1 rounded-lg hover:bg-gray-100 disabled:opacity-40"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="px-6 py-5">{children}</div>
      </div>
    </div>
  );
}

function FormError({ message }) {
  if (!message) return null;
  return (
    <div className="flex items-start gap-2 bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2 rounded-lg" role="alert">
      <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" /> <span>{message}</span>
    </div>
  );
}

const MENU_TONES = {
  default: 'text-gray-700 hover:bg-gray-50',
  warn: 'text-orange-600 hover:bg-orange-50',
  good: 'text-green-600 hover:bg-green-50',
  danger: 'text-red-600 hover:bg-red-50',
};

/**
 * One row's actions: a clear primary button, and a "more" menu for the rest, so the common action
 * is obvious and the risky ones (deactivate, reset, delete) are one deliberate click away.
 * The menu is drawn in a portal so the table's horizontal scrolling cannot clip it.
 *
 * @param {{ primary: { label: string, icon: any, onClick: () => void },
 *           items: Array<{ key: string, label: string, icon: any, onClick: () => void, tone?: string,
 *                          disabled?: boolean, hint?: string, separatorBefore?: boolean }>,
 *           label: string, busy?: boolean }} props
 */
function ActionsCell({ primary, items, label, busy = false, sticky = false }) {
  const [menu, setMenu] = useState(null); // { top, right } in viewport pixels
  const buttonRef = useRef(null);
  const menuRef = useRef(null);
  const close = useCallback(() => setMenu(null), []);

  const toggle = () => {
    if (menu) {
      close();
      return;
    }
    const rect = buttonRef.current.getBoundingClientRect();
    const menuHeight = items.length * 40 + 16;
    const flip = rect.bottom + menuHeight > window.innerHeight;
    setMenu({
      right: Math.max(8, window.innerWidth - rect.right),
      top: flip ? Math.max(8, rect.top - menuHeight - 4) : rect.bottom + 4,
    });
  };

  useEffect(() => {
    if (!menu) return undefined;
    const onDown = (e) => {
      if (!menuRef.current?.contains(e.target) && !buttonRef.current?.contains(e.target)) close();
    };
    const onKey = (e) => e.key === 'Escape' && close();
    window.addEventListener('mousedown', onDown);
    window.addEventListener('keydown', onKey);
    window.addEventListener('scroll', close, true);
    window.addEventListener('resize', close);
    return () => {
      window.removeEventListener('mousedown', onDown);
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('scroll', close, true);
      window.removeEventListener('resize', close);
    };
  }, [menu, close]);

  const PrimaryIcon = primary.icon;
  return (
    <div
      className={`flex items-center justify-end gap-2 ${sticky ? 'sticky right-0 bg-white group-hover:bg-gray-50 pl-2' : ''}`}
    >
      <button
        type="button"
        onClick={primary.onClick}
        disabled={busy}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-blue-200 bg-blue-50 text-blue-700 text-xs font-semibold hover:bg-blue-100 transition-colors disabled:opacity-50"
      >
        {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <PrimaryIcon className="w-3.5 h-3.5" />}
        {primary.label}
      </button>
      <button
        ref={buttonRef}
        type="button"
        onClick={toggle}
        disabled={busy}
        aria-haspopup="menu"
        aria-expanded={Boolean(menu)}
        aria-label={`More actions for ${label}`}
        className={`p-1.5 rounded-lg border transition-colors disabled:opacity-50 ${
          menu ? 'border-gray-300 bg-gray-100 text-gray-800' : 'border-gray-200 text-gray-500 hover:bg-gray-100 hover:text-gray-800'
        }`}
      >
        <Ellipsis className="w-4 h-4" />
      </button>
      {menu && createPortal(
        <div
          ref={menuRef}
          role="menu"
          aria-label={`Actions for ${label}`}
          style={{ position: 'fixed', top: menu.top, right: menu.right }}
          className="z-50 w-56 bg-white rounded-xl shadow-lg border border-gray-100 py-1.5"
        >
          {items.map((item) => {
            const ItemIcon = item.icon;
            return (
              <div key={item.key}>
                {item.separatorBefore && <div className="my-1.5 border-t border-gray-100" role="separator" />}
                <button
                  type="button"
                  role="menuitem"
                  disabled={item.disabled}
                  title={item.hint}
                  onClick={() => { close(); item.onClick(); }}
                  className={`w-full flex items-center gap-2.5 px-3.5 py-2 text-sm text-left transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${MENU_TONES[item.tone || 'default']}`}
                >
                  <ItemIcon className="w-4 h-4 shrink-0" />
                  {item.label}
                </button>
              </div>
            );
          })}
        </div>,
        document.body
      )}
    </div>
  );
}

const statusBadge = (s) =>
  s.isActive === false
    ? { text: 'Deactivated', cls: 'bg-red-100 text-red-700' }
    : s.profileSetupCompleted === false
      ? { text: 'Setup pending', cls: 'bg-yellow-100 text-yellow-700' }
      : { text: 'Active', cls: 'bg-green-100 text-green-700' };

const toForm = (detail) => ({
  fullName: detail.fullName || '',
  email: detail.email || '',
  department: detail.departmentCode || '',
  year: yearFromBatch(detail.batch),
  cgpa: detail.cgpa ?? '',
  totalBacklogs: detail.totalBacklogs ?? 0,
  activeBacklogs: detail.activeBacklogs ?? 0,
  placementStatus: detail.placementStatus || 'PENDING',
  placedCompanyId: detail.placedCompanyId ? String(detail.placedCompanyId) : '',
  placedCtc: detail.placedCtc ?? '',
  skills: (detail.skills || []).map((s) => s.skillName || s.name || s).join(', '),
});

const timeLabel = (date) => date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

export default function AdminManageStudents() {
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedTab = searchParams.get('tab');
  const tab = requestedTab === 'add' || requestedTab === 'departments' ? requestedTab : 'list';
  const setTab = useCallback(
    (next) => setSearchParams(next === 'list' ? {} : { tab: next }, { replace: true }),
    [setSearchParams]
  );

  const { departments, active: activeDepartments, loading: departmentsLoading, reload: reloadDepartments } = useDepartments();
  const firstDepartment = activeDepartments[0]?.code || '';

  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [page, setPage] = useState(1);
  const [busyId, setBusyId] = useState(null);

  // Add popups: null | 'single' | 'bulk'
  const [addModal, setAddModal] = useState(null);
  const [single, setSingle] = useState(emptySingle);
  const [singleErrors, setSingleErrors] = useState({});
  const [singleBusy, setSingleBusy] = useState(false);
  const [bulk, setBulk] = useState(emptyBulk);
  const [bulkErrors, setBulkErrors] = useState({});
  const [bulkBusy, setBulkBusy] = useState(false);
  const [bulkResult, setBulkResult] = useState(null);
  const [recent, setRecent] = useState([]); // what was added in this visit

  // Edit / confirm popups
  const [editing, setEditing] = useState(null); // { student, form, errors, loading, saving, apiError }
  const [companies, setCompanies] = useState([]);
  const [confirm, setConfirm] = useState(null); // { kind, student, typed }
  const [reminding, setReminding] = useState(false);

  // Department popups
  const [deptModal, setDeptModal] = useState(null); // { dept: null | Department, form, errors, saving }
  const [deptConfirm, setDeptConfirm] = useState(null); // { kind: 'deactivate'|'activate'|'delete', dept }
  const [deptBusy, setDeptBusy] = useState(false);

  const singleInput = useRef(null);
  const [refocusTick, setRefocusTick] = useState(0);

  useEffect(() => {
    if (refocusTick > 0) singleInput.current?.focus();
  }, [refocusTick]);

  const loadStudents = useCallback(async () => {
    setLoading(true);
    setLoadError('');
    try {
      const data = await getAllStudents();
      setStudents(Array.isArray(data) ? data : []);
    } catch (err) {
      setLoadError(err.message || 'Could not load students.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadStudents();
  }, [loadStudents]);

  // ---------------------------------------------------------------- list

  const counts = useMemo(() => ({
    total: students.length,
    pending: students.filter((s) => s.profileSetupCompleted === false).length,
    inactive: students.filter((s) => s.isActive === false).length,
  }), [students]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return students.filter((s) => {
      if (statusFilter === 'ACTIVE' && !(s.isActive !== false && s.profileSetupCompleted !== false)) return false;
      if (statusFilter === 'INACTIVE' && s.isActive !== false) return false;
      if (statusFilter === 'SETUP' && s.profileSetupCompleted !== false) return false;
      if (!q) return true;
      return [s.rollNo, s.fullName, s.email, s.department, s.departmentCode]
        .some((v) => String(v ?? '').toLowerCase().includes(q));
    });
  }, [students, search, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const rows = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const departmentName = useCallback(
    (code) => departments.find((d) => d.code === String(code ?? '').toUpperCase())?.name,
    [departments]
  );

  // ---------------------------------------------------------------- add one

  const openSingle = () => {
    setSingle(emptySingle(firstDepartment));
    setSingleErrors({});
    setAddModal('single');
  };

  const closeAdd = () => {
    if (singleBusy || bulkBusy) return;
    setAddModal(null);
  };

  const submitSingle = async (e, keepOpen = false) => {
    e?.preventDefault();
    if (singleBusy) return;
    const errors = validateProvisionForm(single);
    setSingleErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setSingleBusy(true);
    try {
      const rn = normalizeRegisterNumber(single.registerNumber);
      await provisionStudent({ registerNumber: rn, department: single.department, year: Number(single.year) });
      toastSuccess(`Student ${rn} added. Their first password is their register number.`);
      setRecent((list) => [{ id: `${rn}-${Date.now()}`, text: rn, kind: `Single · ${single.department}`, at: new Date() }, ...list].slice(0, 8));
      loadStudents();
      reloadDepartments();
      if (keepOpen) {
        // Keep department and year, which usually stay the same for the next student.
        setSingle((f) => ({ ...f, registerNumber: '' }));
        setSingleErrors({});
        // Focus once the form is enabled again (the effect above runs after that render).
        setRefocusTick((t) => t + 1);
      } else {
        setAddModal(null);
      }
    } catch (err) {
      setSingleErrors({ form: err.message || 'Could not add the student.' });
    } finally {
      setSingleBusy(false);
    }
  };

  // ---------------------------------------------------------------- add many

  const openBulk = () => {
    setBulk(emptyBulk(firstDepartment));
    setBulkErrors({});
    setBulkResult(null);
    setAddModal('bulk');
  };

  const preview = useMemo(
    () => expandRegisterRange(bulk.registerNumberFrom, bulk.registerNumberTo),
    [bulk.registerNumberFrom, bulk.registerNumberTo]
  );

  const submitBulk = async (e) => {
    e?.preventDefault();
    if (bulkBusy) return;
    const errors = validateBulkForm(bulk);
    setBulkErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setBulkBusy(true);
    try {
      const from = normalizeRegisterNumber(bulk.registerNumberFrom);
      const to = normalizeRegisterNumber(bulk.registerNumberTo);
      const result = await provisionStudentsBulk({
        registerNumberFrom: from,
        registerNumberTo: to,
        department: bulk.department,
        year: Number(bulk.year),
      });
      setBulkResult(result);
      toastSuccess(`${result.created} student(s) added, ${result.skipped} already existed.`);
      setRecent((list) => [
        { id: `${from}-${to}-${Date.now()}`, text: `${from} to ${to}`, kind: `Bulk · ${bulk.department}: ${result.created} added, ${result.skipped} skipped`, at: new Date() },
        ...list,
      ].slice(0, 8));
      loadStudents();
      reloadDepartments();
    } catch (err) {
      setBulkErrors({ form: err.message || 'Could not add the students.' });
    } finally {
      setBulkBusy(false);
    }
  };

  // ---------------------------------------------------------------- edit

  const openEditor = async (student) => {
    setEditing({ student, form: null, errors: {}, loading: true, saving: false, apiError: '' });
    try {
      const [detail, companyList] = await Promise.all([
        getStudentById(student.id),
        companies.length ? Promise.resolve(companies) : getCompanies().catch(() => []),
      ]);
      if (!companies.length) setCompanies(Array.isArray(companyList) ? companyList : []);
      setEditing((cur) => (cur && cur.student.id === student.id
        ? { ...cur, form: toForm(detail?.data || detail), loading: false }
        : cur));
    } catch (err) {
      setEditing((cur) => (cur ? { ...cur, loading: false, apiError: err.message || 'Could not load the student.' } : cur));
    }
  };

  const setEditField = (field) => (e) =>
    setEditing((cur) => ({
      ...cur,
      form: { ...cur.form, [field]: e.target.value },
      errors: { ...cur.errors, [field]: '' },
      apiError: '',
    }));

  const saveEdit = async (e) => {
    e.preventDefault();
    if (!editing || editing.saving) return;
    const errors = validateStudentEditForm(editing.form);
    if (Object.keys(errors).length > 0) {
      setEditing((cur) => ({ ...cur, errors }));
      return;
    }
    setEditing((cur) => ({ ...cur, saving: true, apiError: '' }));
    try {
      await updateStudent(editing.student.id, buildStudentEditPayload(editing.form));
      toastSuccess('Student updated.');
      setEditing(null);
      await loadStudents();
      reloadDepartments();
    } catch (err) {
      setEditing((cur) => ({ ...cur, saving: false, apiError: err.message || 'Could not save the changes.' }));
    }
  };

  // ---------------------------------------------------------------- confirmed student actions

  const runConfirmed = async () => {
    if (!confirm || busyId) return;
    const { kind, student } = confirm;
    setBusyId(student.id);
    try {
      if (kind === 'deactivate') await deactivateStudent(student.id);
      if (kind === 'reactivate') await reactivateStudent(student.id);
      if (kind === 'reset') await resetStudentPassword(student.id);
      if (kind === 'delete') await deleteStudent(student.id);
      toastSuccess({
        deactivate: `${student.rollNo} deactivated. They can no longer sign in.`,
        reactivate: `${student.rollNo} reactivated.`,
        reset: `Password for ${student.rollNo} reset to their register number.`,
        delete: `${student.rollNo} deleted.`,
      }[kind]);
      setConfirm(null);
      await loadStudents();
      reloadDepartments();
    } catch (err) {
      toastError(err, err.message || 'The action could not be completed.');
    } finally {
      setBusyId(null);
    }
  };

  const handleReminders = async () => {
    if (reminding) return;
    setReminding(true);
    try {
      const result = await sendProfileReminders();
      const count = typeof result === 'number' ? result : Number(result?.data ?? result ?? 0);
      toastSuccess(count > 0 ? `${count} student(s) reminded to complete their profile.` : 'Nobody needs a reminder right now.');
    } catch (err) {
      toastError(err, err.message || 'Could not send reminders.');
    } finally {
      setReminding(false);
    }
  };

  const CONFIRM_COPY = {
    deactivate: {
      title: 'Deactivate student?',
      body: (s) => `${s.rollNo} will be signed out and unable to sign in until you reactivate them. Their data is kept.`,
      button: 'Deactivate',
      tone: 'bg-red-600 hover:bg-red-700',
    },
    reactivate: {
      title: 'Reactivate student?',
      body: (s) => `${s.rollNo} will be able to sign in again.`,
      button: 'Reactivate',
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

  // ---------------------------------------------------------------- departments

  const openDepartmentForm = (dept = null) =>
    setDeptModal({ dept, form: { code: dept?.code || '', name: dept?.name || '' }, errors: {}, saving: false });

  const saveDepartment = async (e) => {
    e.preventDefault();
    if (!deptModal || deptModal.saving) return;
    const { dept, form } = deptModal;
    const others = dept ? departments.filter((d) => d.id !== dept.id) : departments;
    const errors = validateDepartmentForm({ ...form, id: dept?.id }, others);
    if (Object.keys(errors).length > 0) {
      setDeptModal((cur) => ({ ...cur, errors }));
      return;
    }
    setDeptModal((cur) => ({ ...cur, saving: true, errors: {} }));
    try {
      if (dept) {
        await updateDepartment(dept.id, { name: form.name.trim() });
        toastSuccess(`${dept.code} renamed.`);
      } else {
        await createDepartment({ code: form.code.trim(), name: form.name.trim() });
        toastSuccess(`Department ${form.code.trim().toUpperCase()} added. It is now available in every student form.`);
      }
      setDeptModal(null);
      await reloadDepartments();
    } catch (err) {
      setDeptModal((cur) => ({ ...cur, saving: false, errors: { form: err.message || 'Could not save the department.' } }));
    }
  };

  const runDepartmentConfirm = async () => {
    if (!deptConfirm || deptBusy) return;
    const { kind, dept } = deptConfirm;
    setDeptBusy(true);
    try {
      if (kind === 'deactivate') await updateDepartment(dept.id, { isActive: false });
      if (kind === 'activate') await updateDepartment(dept.id, { isActive: true });
      if (kind === 'delete') await deleteDepartment(dept.id);
      toastSuccess({
        deactivate: `${dept.code} deactivated. It can no longer be chosen for new students.`,
        activate: `${dept.code} is active again.`,
        delete: `${dept.code} deleted.`,
      }[kind]);
      setDeptConfirm(null);
      await reloadDepartments();
    } catch (err) {
      toastError(err, err.message || 'The action could not be completed.');
    } finally {
      setDeptBusy(false);
    }
  };

  const DEPT_CONFIRM_COPY = {
    deactivate: {
      title: 'Deactivate department?',
      body: (d) => `${d.code} will no longer appear when adding students. Students already in it stay in it.`,
      button: 'Deactivate',
      tone: 'bg-red-600 hover:bg-red-700',
    },
    activate: {
      title: 'Activate department?',
      body: (d) => `${d.code} will be available again when adding students.`,
      button: 'Activate',
      tone: 'bg-blue-600 hover:bg-blue-700',
    },
    delete: {
      title: 'Delete department?',
      body: (d) => `${d.code} (${d.name}) will be removed. This is only possible because no student or job drive uses it.`,
      button: 'Delete department',
      tone: 'bg-red-600 hover:bg-red-700',
    },
  };

  // ---------------------------------------------------------------- tabs

  const TABS = [
    { id: 'list', label: 'Student List', icon: ListChecks, badge: loading ? null : counts.total },
    { id: 'add', label: 'Add Students', icon: UserPlus },
    { id: 'departments', label: 'Departments', icon: Building2, badge: departmentsLoading ? null : departments.length },
  ];

  const onTabKeyDown = (e) => {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
    e.preventDefault();
    const index = TABS.findIndex((t) => t.id === tab);
    const next = TABS[(index + (e.key === 'ArrowRight' ? 1 : TABS.length - 1)) % TABS.length];
    setTab(next.id);
  };

  /** Department <select> options: codes only, as the college refers to them. */
  const departmentOptions = (list) => list.map((d) => <option key={d.id} value={d.code} title={d.name}>{d.code}</option>);

  const noDepartments = !departmentsLoading && activeDepartments.length === 0;

  // ---------------------------------------------------------------- render

  return (
    <main className="flex-1 px-4 md:px-8 py-6 overflow-x-hidden">
      <Link to="/admin/students" className="inline-flex items-center gap-1 text-sm text-blue-600 hover:underline mb-3">
        <ArrowLeft className="w-4 h-4" /> Back to students
      </Link>
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-5">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-1">Manage Students</h2>
          <p className="text-gray-500 text-sm max-w-3xl">
            Add students, edit their profiles, and control their access.
          </p>
        </div>
        <button
          type="button"
          onClick={handleReminders}
          disabled={reminding}
          className="flex items-center justify-center gap-1.5 border border-gray-300 bg-white text-gray-700 px-4 py-2 rounded-lg text-sm hover:bg-gray-50 transition font-medium shrink-0 disabled:opacity-60"
          title="Email students whose profile is incomplete"
        >
          {reminding ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />}
          Remind incomplete profiles
        </button>
      </div>

      {/* Tabs */}
      <div role="tablist" aria-label="Manage students" onKeyDown={onTabKeyDown} className="flex gap-1 border-b border-gray-200 mb-6 overflow-x-auto overflow-y-hidden">
        {TABS.map(({ id, label, icon: TabIcon, badge }) => {
          const active = tab === id;
          return (
            <button
              key={id}
              type="button"
              role="tab"
              id={`tab-${id}`}
              aria-selected={active}
              aria-controls={`panel-${id}`}
              tabIndex={active ? 0 : -1}
              onClick={() => setTab(id)}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold border-b-2 -mb-px transition-colors whitespace-nowrap ${
                active ? 'border-blue-600 text-blue-700' : 'border-transparent text-gray-500 hover:text-gray-800'
              }`}
            >
              <TabIcon className="w-4 h-4" />
              {label}
              {badge != null && (
                <span className={`text-[11px] px-1.5 py-0.5 rounded-full ${active ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'}`}>
                  {badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ---------------------------------------------------------- Add Students tab */}
      {tab === 'add' && (
        <section role="tabpanel" id="panel-add" aria-labelledby="tab-add">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-6">
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 flex flex-col">
              <div className="w-11 h-11 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mb-4">
                <UserPlus className="w-5 h-5" />
              </div>
              <h3 className="font-semibold text-gray-900 text-lg">Add a student</h3>
              <p className="text-sm text-gray-500 mt-1 mb-5 flex-1">
                Create one account from a register number, department and year of passing.
              </p>
              <button
                type="button"
                onClick={openSingle}
                className="flex items-center justify-center gap-2 bg-blue-600 text-white px-4 py-2.5 rounded-lg text-sm hover:bg-blue-700 transition font-medium"
              >
                <Plus className="w-4 h-4" /> Add student
              </button>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 flex flex-col">
              <div className="w-11 h-11 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center mb-4">
                <Users className="w-5 h-5" />
              </div>
              <h3 className="font-semibold text-gray-900 text-lg">Add many students</h3>
              <p className="text-sm text-gray-500 mt-1 mb-5 flex-1">
                Create a whole class at once from a register number range. Numbers that already exist are skipped.
              </p>
              <button
                type="button"
                onClick={openBulk}
                className="flex items-center justify-center gap-2 border border-blue-600 text-blue-700 px-4 py-2.5 rounded-lg text-sm hover:bg-blue-50 transition font-medium"
              >
                <Users className="w-4 h-4" /> Bulk add
              </button>
            </div>
          </div>

          {noDepartments && (
            <div className="flex items-start gap-3 bg-yellow-50 border border-yellow-200 text-yellow-900 text-sm rounded-xl px-4 py-3 mb-6">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0 text-yellow-600" />
              <p>
                There are no active departments yet, so students cannot be added.{' '}
                <button type="button" onClick={() => setTab('departments')} className="underline font-medium">Add a department</button> first.
              </p>
            </div>
          )}

          <div className="flex items-start gap-3 bg-blue-50 border border-blue-100 text-blue-900 text-sm rounded-xl px-4 py-3 mb-6">
            <Info className="w-4 h-4 mt-0.5 shrink-0 text-blue-600" />
            <p>
              A new student signs in with their <strong>register number</strong> as both username and first password.
              On first login they set a new password, their name, email and phone. You never need to share a password.
            </p>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-100">
            <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100">
              <h3 className="font-semibold text-gray-900 text-sm flex items-center gap-2">
                <Clock className="w-4 h-4 text-gray-400" /> Added in this visit
              </h3>
              <button type="button" onClick={() => setTab('list')} className="text-sm text-blue-600 hover:underline font-medium">
                View student list
              </button>
            </div>
            {recent.length === 0 ? (
              <p className="px-5 py-6 text-sm text-gray-400">Nothing added yet. Students you add will be listed here.</p>
            ) : (
              <ul className="divide-y divide-gray-50">
                {recent.map((r) => (
                  <li key={r.id} className="flex items-center justify-between gap-3 px-5 py-3 text-sm">
                    <span className="flex items-center gap-2 min-w-0">
                      <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />
                      <span className="font-mono text-xs text-gray-800 truncate">{r.text}</span>
                      <span className="text-gray-400 text-xs truncate">{r.kind}</span>
                    </span>
                    <span className="text-xs text-gray-400 shrink-0">{timeLabel(r.at)}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
      )}

      {/* ---------------------------------------------------------- Departments tab */}
      {tab === 'departments' && (
        <section role="tabpanel" id="panel-departments" aria-labelledby="tab-departments">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
            <p className="text-sm text-gray-500 max-w-2xl">
              These appear in every student form. Add a department when the college starts one. Deactivate one it no longer
              offers: students already in it stay in it.
            </p>
            <button
              type="button"
              onClick={() => openDepartmentForm()}
              className="flex items-center justify-center gap-1.5 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700 font-medium shrink-0"
            >
              <Plus className="w-4 h-4" /> Add department
            </button>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-x-auto">
            <div className="min-w-[600px]">
              <div style={DEPT_GRID} className="grid gap-3 px-4 py-3 bg-gray-50 text-xs font-semibold text-gray-600 border-b border-gray-200">
                <div>Code</div>
                <div>Name</div>
                <div>Students</div>
                <div>Status</div>
                <div className="text-right sticky right-0 bg-gray-50">Actions</div>
              </div>

              {departmentsLoading ? (
                <div className="py-10 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-blue-600" /></div>
              ) : departments.length === 0 ? (
                <div className="p-4">
                  <EmptyState
                    type="empty"
                    icon={Building2}
                    title="No departments yet"
                    description="Add the departments your college offers, then you can add students to them."
                    action={{ label: 'Add department', onClick: () => openDepartmentForm(), icon: Plus }}
                    compact
                  />
                </div>
              ) : (
                departments.map((d) => (
                  <div key={d.id} style={DEPT_GRID} className="group grid gap-3 px-4 py-3 border-b border-gray-100 last:border-b-0 items-center text-sm hover:bg-gray-50">
                    <div>
                      <span className="inline-block font-semibold text-xs px-2 py-1 rounded-md bg-gray-100 text-gray-800">{d.code}</span>
                    </div>
                    <div className="text-gray-800 min-w-0 truncate" title={d.name}>{d.name}</div>
                    <div className="text-gray-600">{d.studentCount}</div>
                    <div>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${d.isActive === false ? 'bg-gray-100 text-gray-600' : 'bg-green-100 text-green-700'}`}>
                        {d.isActive === false ? 'Inactive' : 'Active'}
                      </span>
                    </div>
                    <ActionsCell
                      sticky
                      label={d.code}
                      primary={{ label: 'Rename', icon: Pencil, onClick: () => openDepartmentForm(d) }}
                      items={[
                        d.isActive === false
                          ? { key: 'activate', label: 'Activate', icon: Power, tone: 'good', onClick: () => setDeptConfirm({ kind: 'activate', dept: d }) }
                          : { key: 'deactivate', label: 'Deactivate', icon: Ban, tone: 'warn', onClick: () => setDeptConfirm({ kind: 'deactivate', dept: d }) },
                        {
                          key: 'delete',
                          label: 'Delete',
                          icon: Trash2,
                          tone: 'danger',
                          separatorBefore: true,
                          disabled: d.studentCount > 0,
                          hint: d.studentCount > 0 ? `${d.studentCount} student(s) are in ${d.code}. Deactivate it instead.` : undefined,
                          onClick: () => setDeptConfirm({ kind: 'delete', dept: d }),
                        },
                      ]}
                    />
                  </div>
                ))
              )}
            </div>
          </div>
        </section>
      )}

      {/* ---------------------------------------------------------- Student List tab */}
      {tab === 'list' && (
        <section role="tabpanel" id="panel-list" aria-labelledby="tab-list">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-4 flex flex-col md:flex-row md:items-center gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                placeholder="Search by register number, name, email or department"
                aria-label="Search students"
                className="w-full border border-gray-300 pl-9 pr-4 py-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
              aria-label="Filter by status"
              className="border border-gray-300 px-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {STATUS_FILTERS.map((f) => <option key={f.value} value={f.value}>{f.label}</option>)}
            </select>
            <button
              type="button"
              onClick={loadStudents}
              className="flex items-center justify-center gap-1.5 border border-gray-300 px-3 py-2 rounded-lg text-sm hover:bg-gray-50"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
            </button>
            <button
              type="button"
              onClick={() => setTab('add')}
              className="flex items-center justify-center gap-1.5 bg-blue-600 text-white px-3 py-2 rounded-lg text-sm hover:bg-blue-700 font-medium"
            >
              <Plus className="w-4 h-4" /> Add students
            </button>
          </div>

          {!loading && counts.total > 0 && (
            <p className="text-xs text-gray-500 mb-3">
              {counts.total} students
              {counts.pending > 0 && <> · <span className="text-yellow-700">{counts.pending} setup pending</span></>}
              {counts.inactive > 0 && <> · <span className="text-red-600">{counts.inactive} deactivated</span></>}
            </p>
          )}

          {loadError && (
            <div className="flex items-center justify-between gap-2 bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-xl mb-4" role="alert">
              <span className="flex items-center gap-2"><AlertCircle className="w-4 h-4" /> {loadError}</span>
              <button type="button" onClick={loadStudents} className="underline font-medium">Retry</button>
            </div>
          )}

          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-x-auto">
            <div className="min-w-[780px]">
              <div style={ROW_GRID} className="grid gap-3 px-4 py-3 bg-gray-50 text-xs font-semibold text-gray-600 border-b border-gray-200">
                <div>Register No.</div>
                <div>Name</div>
                <div>Department</div>
                <div>Passing year</div>
                <div>CGPA</div>
                <div>Status</div>
                <div className="text-right sticky right-0 bg-gray-50">Actions</div>
              </div>

              {loading ? (
                <div className="py-12 flex flex-col items-center text-gray-500">
                  <Loader2 className="w-6 h-6 animate-spin text-blue-600 mb-2" />
                  <span className="text-xs">Loading students…</span>
                </div>
              ) : rows.length === 0 ? (
                <div className="p-4">
                  <EmptyState
                    type={students.length === 0 ? 'empty' : 'search'}
                    icon={Users}
                    title={students.length === 0 ? 'No students yet' : 'No matching students'}
                    description={students.length === 0
                      ? 'Open the Add Students tab to add a student or a whole range.'
                      : 'No students match your search and filter.'}
                    action={students.length === 0 ? { label: 'Add students', onClick: () => setTab('add'), icon: Plus } : undefined}
                    compact
                  />
                </div>
              ) : (
                rows.map((s) => {
                  const badge = statusBadge(s);
                  const notSetUp = s.profileSetupCompleted === false;
                  const busy = busyId === s.id;
                  const code = s.departmentCode || s.department;
                  return (
                    <div key={s.id} style={ROW_GRID} className="group grid gap-3 px-4 py-3 border-b border-gray-100 last:border-b-0 items-center text-sm hover:bg-gray-50">
                      <div className="font-mono text-xs text-gray-800 break-all">{s.rollNo || '—'}</div>
                      <div className="min-w-0">
                        <p className={`truncate ${notSetUp ? 'text-gray-400 italic' : 'font-medium text-gray-900'}`}>
                          {notSetUp ? 'Not set up yet' : s.fullName}
                        </p>
                        {s.email && <p className="text-xs text-gray-400 truncate">{s.email}</p>}
                      </div>
                      <div>
                        {code ? (
                          <span className="inline-block font-semibold text-xs px-2 py-1 rounded-md bg-gray-100 text-gray-800" title={departmentName(s.departmentCode) || s.department}>
                            {code}
                          </span>
                        ) : '—'}
                      </div>
                      <div className="text-gray-600">{yearFromBatch(s.batch) || '—'}</div>
                      <div className="text-gray-700">{s.cgpa ?? '—'}</div>
                      <div>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${badge.cls}`}>{badge.text}</span>
                      </div>
                      <ActionsCell
                        sticky
                        label={s.rollNo}
                        busy={busy}
                        primary={{ label: 'Edit', icon: Pencil, onClick: () => openEditor(s) }}
                        items={[
                          s.isActive === false
                            ? { key: 'reactivate', label: 'Reactivate', icon: RotateCcw, tone: 'good', onClick: () => setConfirm({ kind: 'reactivate', student: s, typed: '' }) }
                            : { key: 'deactivate', label: 'Deactivate', icon: Ban, tone: 'warn', onClick: () => setConfirm({ kind: 'deactivate', student: s, typed: '' }) },
                          { key: 'reset', label: 'Reset password', icon: KeyRound, onClick: () => setConfirm({ kind: 'reset', student: s, typed: '' }) },
                          { key: 'delete', label: 'Delete', icon: Trash2, tone: 'danger', separatorBefore: true, onClick: () => setConfirm({ kind: 'delete', student: s, typed: '' }) },
                        ]}
                      />
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {!loading && filtered.length > 0 && (
            <div className="flex justify-between items-center mt-4 text-sm text-gray-500">
              <p>
                Showing {(currentPage - 1) * PAGE_SIZE + 1}–{Math.min(currentPage * PAGE_SIZE, filtered.length)} of {filtered.length}
              </p>
              <div className="flex items-center gap-1">
                <button type="button" disabled={currentPage === 1} onClick={() => setPage(currentPage - 1)} className="p-1.5 rounded hover:bg-gray-200 disabled:opacity-40" aria-label="Previous page">
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="px-2">Page {currentPage} of {totalPages}</span>
                <button type="button" disabled={currentPage === totalPages} onClick={() => setPage(currentPage + 1)} className="p-1.5 rounded hover:bg-gray-200 disabled:opacity-40" aria-label="Next page">
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </section>
      )}

      {/* ---------------------------------------------------------- Add one popup */}
      {addModal === 'single' && (
        <Modal title="Add a student" subtitle="Their first password will be their register number." onClose={closeAdd} locked={singleBusy}>
          <form onSubmit={(e) => submitSingle(e, false)} noValidate className="space-y-4">
            <FormError message={singleErrors.form} />
            <Field label="Register number" htmlFor="single-rn" error={singleErrors.registerNumber} hint="Exactly 12 digits, numbers only.">
              <input
                id="single-rn"
                ref={singleInput}
                autoFocus
                value={single.registerNumber}
                onChange={(e) => { setSingle((f) => ({ ...f, registerNumber: digitsOnly(e.target.value) })); setSingleErrors({}); }}
                placeholder="e.g. 830123104032"
                inputMode="numeric"
                maxLength={12}
                autoComplete="off"
                disabled={singleBusy}
                className={inputClass(singleErrors.registerNumber)}
              />
            </Field>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label="Department" htmlFor="single-dept" error={singleErrors.department}>
                <select
                  id="single-dept"
                  value={single.department}
                  onChange={(e) => setSingle((f) => ({ ...f, department: e.target.value }))}
                  disabled={singleBusy || noDepartments}
                  className={inputClass(singleErrors.department)}
                >
                  {noDepartments && <option value="">No departments</option>}
                  {departmentOptions(activeDepartments)}
                </select>
              </Field>
              <Field label="Year of passing" htmlFor="single-year" error={singleErrors.year} hint="The year this batch graduates">
                <select
                  id="single-year"
                  value={single.year}
                  onChange={(e) => setSingle((f) => ({ ...f, year: e.target.value }))}
                  disabled={singleBusy}
                  className={inputClass(singleErrors.year)}
                >
                  {YEARS.map((y) => <option key={y} value={y}>{y}</option>)}
                </select>
              </Field>
            </div>
            <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-2">
              <button type="button" onClick={closeAdd} disabled={singleBusy} className="px-4 py-2 rounded-lg text-sm border border-gray-300 hover:bg-gray-50 disabled:opacity-50">
                Cancel
              </button>
              <button
                type="button"
                onClick={(e) => submitSingle(e, true)}
                disabled={singleBusy || noDepartments}
                className="px-4 py-2 rounded-lg text-sm border border-blue-600 text-blue-700 hover:bg-blue-50 font-medium disabled:opacity-50"
              >
                Add &amp; add another
              </button>
              <button type="submit" disabled={singleBusy || noDepartments} className="flex items-center justify-center gap-1.5 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700 font-medium disabled:opacity-60">
                {singleBusy && <Loader2 className="w-4 h-4 animate-spin" />}
                {singleBusy ? 'Adding…' : 'Add student'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* ---------------------------------------------------------- Bulk add popup */}
      {addModal === 'bulk' && (
        <Modal
          title={bulkResult ? 'Students added' : 'Add many students'}
          subtitle={bulkResult ? undefined : 'Every register number from the first to the last is created.'}
          onClose={closeAdd}
          locked={bulkBusy}
        >
          {bulkResult ? (
            <div className="space-y-4" role="status">
              <div className="flex items-center gap-3 bg-green-50 border border-green-200 rounded-xl px-4 py-3">
                <CheckCircle2 className="w-6 h-6 text-green-600 shrink-0" />
                <div>
                  <p className="font-semibold text-green-900">{bulkResult.created} student(s) added</p>
                  <p className="text-xs text-green-800">
                    {bulkResult.skipped > 0
                      ? `${bulkResult.skipped} already existed and were skipped.`
                      : 'No register numbers were skipped.'}
                  </p>
                </div>
              </div>
              {bulkResult.skipped > 0 && (
                <div>
                  <p className="text-xs font-semibold text-gray-700 mb-1">Skipped (already existed)</p>
                  <p className="text-xs text-gray-500 bg-gray-50 border border-gray-200 rounded-lg p-2 max-h-24 overflow-y-auto break-words font-mono">
                    {bulkResult.skippedRegisterNumbers.join(', ')}
                  </p>
                </div>
              )}
              <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-1">
                <button type="button" onClick={openBulk} className="px-4 py-2 rounded-lg text-sm border border-gray-300 hover:bg-gray-50">
                  Add another range
                </button>
                <button type="button" onClick={() => { setAddModal(null); setTab('list'); }} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700 font-medium">
                  View student list
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={submitBulk} noValidate className="space-y-4">
              <FormError message={bulkErrors.form} />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Field label="Register number from" htmlFor="bulk-from" error={bulkErrors.registerNumberFrom}>
                  <input
                    id="bulk-from"
                    autoFocus
                    value={bulk.registerNumberFrom}
                    onChange={(e) => { setBulk((f) => ({ ...f, registerNumberFrom: digitsOnly(e.target.value) })); setBulkErrors({}); }}
                    placeholder="830123104001"
                    inputMode="numeric"
                    maxLength={12}
                    autoComplete="off"
                    disabled={bulkBusy}
                    className={inputClass(bulkErrors.registerNumberFrom)}
                  />
                </Field>
                <Field label="Register number to" htmlFor="bulk-to" error={bulkErrors.registerNumberTo}>
                  <input
                    id="bulk-to"
                    value={bulk.registerNumberTo}
                    onChange={(e) => { setBulk((f) => ({ ...f, registerNumberTo: digitsOnly(e.target.value) })); setBulkErrors({}); }}
                    placeholder="830123104060"
                    inputMode="numeric"
                    maxLength={12}
                    autoComplete="off"
                    disabled={bulkBusy}
                    className={inputClass(bulkErrors.registerNumberTo)}
                  />
                </Field>
                <Field label="Department" htmlFor="bulk-dept" error={bulkErrors.department}>
                  <select
                    id="bulk-dept"
                    value={bulk.department}
                    onChange={(e) => setBulk((f) => ({ ...f, department: e.target.value }))}
                    disabled={bulkBusy || noDepartments}
                    className={inputClass(bulkErrors.department)}
                  >
                    {noDepartments && <option value="">No departments</option>}
                    {departmentOptions(activeDepartments)}
                  </select>
                </Field>
                <Field label="Year of passing" htmlFor="bulk-year" error={bulkErrors.year} hint="The year this batch graduates">
                  <select
                    id="bulk-year"
                    value={bulk.year}
                    onChange={(e) => setBulk((f) => ({ ...f, year: e.target.value }))}
                    disabled={bulkBusy}
                    className={inputClass(bulkErrors.year)}
                  >
                    {YEARS.map((y) => <option key={y} value={y}>{y}</option>)}
                  </select>
                </Field>
              </div>

              <div className={`rounded-lg px-3 py-2.5 text-xs ${preview.error ? 'bg-red-50 text-red-700' : 'bg-gray-50 text-gray-600'}`} aria-live="polite">
                {preview.error ? (
                  preview.error
                ) : preview.numbers.length > 0 ? (
                  <>
                    Will create up to <strong className="text-gray-800">{preview.numbers.length}</strong> students:{' '}
                    <span className="font-mono">{preview.numbers[0]}</span> to{' '}
                    <span className="font-mono">{preview.numbers[preview.numbers.length - 1]}</span>. Register numbers that
                    already exist are skipped.
                  </>
                ) : (
                  `Enter the first and last register number. They must share the same prefix and length. Limit: ${MAX_BULK} per request.`
                )}
              </div>

              <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-1">
                <button type="button" onClick={closeAdd} disabled={bulkBusy} className="px-4 py-2 rounded-lg text-sm border border-gray-300 hover:bg-gray-50 disabled:opacity-50">
                  Cancel
                </button>
                <button type="submit" disabled={bulkBusy || Boolean(preview.error) || noDepartments} className="flex items-center justify-center gap-1.5 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700 font-medium disabled:opacity-60">
                  {bulkBusy && <Loader2 className="w-4 h-4 animate-spin" />}
                  {bulkBusy ? 'Adding… this can take a moment' : preview.numbers.length > 0 ? `Add ${preview.numbers.length} students` : 'Add students'}
                </button>
              </div>
            </form>
          )}
        </Modal>
      )}

      {/* ---------------------------------------------------------- Edit popup */}
      {editing && (
        <Modal title={`Edit ${editing.student.rollNo}`} onClose={() => setEditing(null)} locked={editing.saving} wide>
          {editing.loading ? (
            <div className="py-10 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-blue-600" /></div>
          ) : !editing.form ? (
            <p className="text-red-600 text-sm">{editing.apiError}</p>
          ) : (
            <form onSubmit={saveEdit} noValidate className="space-y-4">
              <FormError message={editing.apiError} />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Field label="Register number" htmlFor="edit-rn" hint="This is their login ID and cannot be changed here.">
                  <input id="edit-rn" value={editing.student.rollNo || ''} disabled className={inputClass(false)} />
                </Field>
                <Field label="Full name" htmlFor="edit-name" error={editing.errors.fullName}>
                  <input id="edit-name" value={editing.form.fullName} onChange={setEditField('fullName')} className={inputClass(editing.errors.fullName)} />
                </Field>
                <Field label="Email" htmlFor="edit-email" error={editing.errors.email}>
                  <input id="edit-email" type="email" value={editing.form.email} onChange={setEditField('email')} className={inputClass(editing.errors.email)} />
                </Field>
                <Field label="Department" htmlFor="edit-dept" error={editing.errors.department}>
                  <select id="edit-dept" value={editing.form.department} onChange={setEditField('department')} className={inputClass(editing.errors.department)}>
                    {!editing.form.department && <option value="">Select…</option>}
                    {editing.form.department && !departments.some((d) => d.code === editing.form.department) && (
                      <option value={editing.form.department}>{editing.form.department}</option>
                    )}
                    {departments.map((d) => (
                      // An inactive department can be kept but not newly chosen.
                      <option key={d.id} value={d.code} title={d.name} disabled={d.isActive === false && d.code !== editing.form.department}>
                        {d.code}{d.isActive === false ? ' (inactive)' : ''}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Year of passing" htmlFor="edit-year" error={editing.errors.year}>
                  <select id="edit-year" value={editing.form.year} onChange={setEditField('year')} className={inputClass(editing.errors.year)}>
                    <option value="">Not set</option>
                    {[...new Set([...YEARS, Number(editing.form.year) || null].filter(Boolean))].sort().map((y) => <option key={y} value={y}>{y}</option>)}
                  </select>
                </Field>
                <Field label="CGPA" htmlFor="edit-cgpa" error={editing.errors.cgpa} hint="0 to 10, up to two decimals">
                  <input id="edit-cgpa" inputMode="decimal" value={editing.form.cgpa} onChange={setEditField('cgpa')} className={inputClass(editing.errors.cgpa)} />
                </Field>
                <Field label="Total backlogs" htmlFor="edit-total" error={editing.errors.totalBacklogs}>
                  <input id="edit-total" inputMode="numeric" value={editing.form.totalBacklogs} onChange={setEditField('totalBacklogs')} className={inputClass(editing.errors.totalBacklogs)} />
                </Field>
                <Field label="Active backlogs" htmlFor="edit-active" error={editing.errors.activeBacklogs}>
                  <input id="edit-active" inputMode="numeric" value={editing.form.activeBacklogs} onChange={setEditField('activeBacklogs')} className={inputClass(editing.errors.activeBacklogs)} />
                </Field>
                <Field label="Placement status" htmlFor="edit-status">
                  <select id="edit-status" value={editing.form.placementStatus} onChange={setEditField('placementStatus')} className={inputClass(false)}>
                    {PLACEMENT_STATUSES.map((p) => <option key={p} value={p}>{p.charAt(0) + p.slice(1).toLowerCase()}</option>)}
                  </select>
                </Field>
                <Field label="Placed company" htmlFor="edit-company" error={editing.errors.placedCompanyId}>
                  <select id="edit-company" value={editing.form.placedCompanyId} onChange={setEditField('placedCompanyId')} className={inputClass(editing.errors.placedCompanyId)}>
                    <option value="">None</option>
                    {companies.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </Field>
                <Field label="Package (CTC)" htmlFor="edit-ctc" error={editing.errors.placedCtc} hint="Annual, in rupees">
                  <input id="edit-ctc" inputMode="decimal" value={editing.form.placedCtc} onChange={setEditField('placedCtc')} className={inputClass(editing.errors.placedCtc)} />
                </Field>
              </div>
              <Field label="Skills" htmlFor="edit-skills" error={editing.errors.skills} hint="Separate with commas, e.g. Java, React, SQL">
                <input id="edit-skills" value={editing.form.skills} onChange={setEditField('skills')} className={inputClass(editing.errors.skills)} />
              </Field>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setEditing(null)} disabled={editing.saving} className="px-4 py-2 rounded-lg text-sm border border-gray-300 hover:bg-gray-50">
                  Cancel
                </button>
                <button type="submit" disabled={editing.saving} className="flex items-center gap-1.5 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700 font-medium disabled:opacity-60">
                  {editing.saving && <Loader2 className="w-4 h-4 animate-spin" />}
                  {editing.saving ? 'Saving…' : 'Save changes'}
                </button>
              </div>
            </form>
          )}
        </Modal>
      )}

      {/* ---------------------------------------------------------- Student confirm popup */}
      {confirm && (
        <Modal title={CONFIRM_COPY[confirm.kind].title} onClose={() => setConfirm(null)} locked={Boolean(busyId)}>
          <p className="text-sm text-gray-600 mb-4">{CONFIRM_COPY[confirm.kind].body(confirm.student)}</p>
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
              className={`flex items-center gap-1.5 text-white px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50 ${CONFIRM_COPY[confirm.kind].tone}`}
            >
              {busyId && <Loader2 className="w-4 h-4 animate-spin" />}
              {CONFIRM_COPY[confirm.kind].button}
            </button>
          </div>
        </Modal>
      )}

      {/* ---------------------------------------------------------- Department form popup */}
      {deptModal && (
        <Modal
          title={deptModal.dept ? `Rename ${deptModal.dept.code}` : 'Add a department'}
          subtitle={deptModal.dept ? 'The code stays the same so existing students and job drives keep working.' : 'It will appear in every student form straight away.'}
          onClose={() => setDeptModal(null)}
          locked={deptModal.saving}
        >
          <form onSubmit={saveDepartment} noValidate className="space-y-4">
            <FormError message={deptModal.errors.form} />
            <Field
              label="Code"
              htmlFor="dept-code"
              error={deptModal.errors.code}
              hint={deptModal.dept ? 'Fixed once created.' : 'Short and unique, e.g. AIDS. 2 to 10 letters or digits. Saved in capitals.'}
            >
              <input
                id="dept-code"
                autoFocus={!deptModal.dept}
                value={deptModal.form.code}
                onChange={(e) => setDeptModal((cur) => ({ ...cur, form: { ...cur.form, code: e.target.value }, errors: {} }))}
                placeholder="e.g. AIDS"
                autoCapitalize="characters"
                autoComplete="off"
                disabled={deptModal.saving || Boolean(deptModal.dept)}
                className={inputClass(deptModal.errors.code)}
              />
            </Field>
            <Field label="Name" htmlFor="dept-name" error={deptModal.errors.name}>
              <input
                id="dept-name"
                autoFocus={Boolean(deptModal.dept)}
                value={deptModal.form.name}
                onChange={(e) => setDeptModal((cur) => ({ ...cur, form: { ...cur.form, name: e.target.value }, errors: {} }))}
                placeholder="e.g. Artificial Intelligence and Data Science"
                autoComplete="off"
                disabled={deptModal.saving}
                className={inputClass(deptModal.errors.name)}
              />
            </Field>
            <div className="flex justify-end gap-2 pt-1">
              <button type="button" onClick={() => setDeptModal(null)} disabled={deptModal.saving} className="px-4 py-2 rounded-lg text-sm border border-gray-300 hover:bg-gray-50">
                Cancel
              </button>
              <button type="submit" disabled={deptModal.saving} className="flex items-center gap-1.5 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700 font-medium disabled:opacity-60">
                {deptModal.saving && <Loader2 className="w-4 h-4 animate-spin" />}
                {deptModal.saving ? 'Saving…' : deptModal.dept ? 'Save name' : 'Add department'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* ---------------------------------------------------------- Department confirm popup */}
      {deptConfirm && (
        <Modal title={DEPT_CONFIRM_COPY[deptConfirm.kind].title} onClose={() => setDeptConfirm(null)} locked={deptBusy}>
          <p className="text-sm text-gray-600 mb-5">{DEPT_CONFIRM_COPY[deptConfirm.kind].body(deptConfirm.dept)}</p>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setDeptConfirm(null)} disabled={deptBusy} className="px-4 py-2 rounded-lg text-sm border border-gray-300 hover:bg-gray-50">
              Cancel
            </button>
            <button
              type="button"
              onClick={runDepartmentConfirm}
              disabled={deptBusy}
              className={`flex items-center gap-1.5 text-white px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50 ${DEPT_CONFIRM_COPY[deptConfirm.kind].tone}`}
            >
              {deptBusy && <Loader2 className="w-4 h-4 animate-spin" />}
              {DEPT_CONFIRM_COPY[deptConfirm.kind].button}
            </button>
          </div>
        </Modal>
      )}
    </main>
  );
}
