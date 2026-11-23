import { useCallback, useEffect, useState } from 'react';
import {
  Ban,
  Building2,
  KeyRound,
  Loader2,
  Pencil,
  Plus,
  Power,
  RefreshCw,
  Trash2,
  UserCheck,
  UserPlus,
} from 'lucide-react';
import ActionsCell from '../components/students/ActionsCell';
import { Field, FormError, Modal } from '../components/students/Modal';
import { inputClass } from '../components/students/formStyles';
import OneTimePasswordModal from '../components/OneTimePasswordModal';
import EmptyState from '../components/EmptyState';
import { TableSkeleton } from '../components/Skeleton';
import useDepartments from '../hooks/useDepartments';
import { createDepartment, deleteDepartment, updateDepartment } from '../services/api/departmentService';
import {
  createFacultyAccount,
  disableFacultyAccount,
  enableFacultyAccount,
  getFacultyAccounts,
  resetFacultyPassword,
  updateFacultyAccount,
} from '../services/api/adminService';
import { validateDepartmentForm } from '../utils/studentValidation';
import { toastError, toastSuccess } from '../utils/toast';

const DEPT_GRID = { gridTemplateColumns: '0.7fr 2fr 1.8fr 0.7fr 0.8fr 132px' };
const FACULTY_GRID = { gridTemplateColumns: '1.8fr 1fr 1fr 1fr 132px' };
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const formatDateTime = (value) => {
  if (!value) return 'Never';
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? String(value) : d.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
};

const emptyFaculty = { fullName: '', email: '', phone: '', designation: '', departmentId: '' };

const validateFacultyForm = (form) => {
  const errors = {};
  const name = form.fullName.trim();
  if (!name) errors.fullName = 'Name is required';
  else if (name.length > 150) errors.fullName = 'Name cannot exceed 150 characters';
  if (form.email.trim() && !EMAIL.test(form.email.trim())) errors.email = 'Enter a valid email address';
  if (form.phone.trim() && !/^\+?[0-9 ()-]{6,20}$/.test(form.phone.trim())) errors.phone = 'Enter a valid phone number';
  if (form.designation.trim().length > 100) errors.designation = 'At most 100 characters';
  return errors;
};

/**
 * Admin: departments and their faculty advisor accounts. One advisor per department; temporary
 * passwords are shown once, straight from the create/reset response.
 */
export default function AdminDepartmentsPage() {
  const { departments, loading: departmentsLoading, error: departmentsError, reload: reloadDepartments } = useDepartments();
  const [faculty, setFaculty] = useState({ loaded: false, list: [], error: '' });
  const [facultyTick, setFacultyTick] = useState(0);

  const [deptModal, setDeptModal] = useState(null); // { dept, form, errors, saving }
  const [deptConfirm, setDeptConfirm] = useState(null); // { kind, dept }
  const [deptBusy, setDeptBusy] = useState(false);

  const [facultyModal, setFacultyModal] = useState(null); // { account, form, errors, saving }
  const [replacePrompt, setReplacePrompt] = useState(null); // { message }
  const [facultyConfirm, setFacultyConfirm] = useState(null); // { kind, account }
  const [facultyBusy, setFacultyBusy] = useState(false);

  const [oneTime, setOneTime] = useState(null); // { password, account, title }

  useEffect(() => {
    let cancelled = false;
    getFacultyAccounts()
      .then((list) => { if (!cancelled) setFaculty({ loaded: true, list: Array.isArray(list) ? list : [], error: '' }); })
      .catch((err) => { if (!cancelled) setFaculty({ loaded: true, list: [], error: err.message || 'Could not load faculty accounts.' }); });
    return () => { cancelled = true; };
  }, [facultyTick]);

  const reloadAll = useCallback(() => {
    reloadDepartments();
    setFacultyTick((t) => t + 1);
  }, [reloadDepartments]);

  // ------------------------------------------------------------ departments

  const openDepartmentForm = (dept = null) =>
    setDeptModal({
      dept,
      form: { code: dept?.code || '', name: dept?.name || '', createFacultyAccount: false, facultyName: '', facultyEmail: '' },
      errors: {},
      saving: false,
    });

  const setDeptField = (field) => (e) => {
    const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    setDeptModal((cur) => ({ ...cur, form: { ...cur.form, [field]: value }, errors: {} }));
  };

  const saveDepartment = async (e) => {
    e.preventDefault();
    if (!deptModal || deptModal.saving) return;
    const { dept, form } = deptModal;
    const others = dept ? departments.filter((d) => d.id !== dept.id) : departments;
    const errors = validateDepartmentForm({ ...form, id: dept?.id }, others);
    if (!dept && form.createFacultyAccount) {
      if (!form.facultyName.trim()) errors.facultyName = 'Name is required for the advisor account';
      if (form.facultyEmail.trim() && !EMAIL.test(form.facultyEmail.trim())) errors.facultyEmail = 'Enter a valid email address';
    }
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
        const result = await createDepartment(form);
        toastSuccess(`Department ${form.code.trim().toUpperCase()} added.`);
        if (result.temporaryPassword) {
          setOneTime({ password: result.temporaryPassword, account: result.faculty, title: 'Faculty advisor account created' });
        }
      }
      setDeptModal(null);
      reloadAll();
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
      reloadAll();
    } catch (err) {
      // A refused delete (409) explains why: students or job drives still use the code.
      setDeptConfirm((cur) => (cur ? { ...cur, error: err.message || 'The action could not be completed.' } : cur));
    } finally {
      setDeptBusy(false);
    }
  };

  const DEPT_COPY = {
    deactivate: {
      title: 'Deactivate department?',
      body: (d) => `${d.code} will no longer appear when adding students. Students already in it stay in it, and its faculty advisor stays assigned.`,
      button: 'Deactivate',
      tone: 'bg-gray-700 hover:bg-gray-800',
    },
    activate: {
      title: 'Activate department?',
      body: (d) => `${d.code} will be available again when adding students.`,
      button: 'Activate',
      tone: 'bg-blue-600 hover:bg-blue-700',
    },
    delete: {
      title: 'Delete department?',
      body: (d) => `${d.code} (${d.name}) will be removed and its faculty advisor account disabled. This is refused if any student or job drive uses it; deactivate it instead to keep history.`,
      button: 'Delete department',
      tone: 'bg-red-600 hover:bg-red-700',
    },
  };

  // ------------------------------------------------------------ faculty

  const openFacultyForm = (account = null, departmentId = '') =>
    setFacultyModal({
      account,
      form: account
        ? {
            fullName: account.fullName || '',
            email: account.email || '',
            phone: account.phone || '',
            designation: account.designation || '',
            departmentId: account.department?.id ? String(account.department.id) : '',
          }
        : { ...emptyFaculty, departmentId: departmentId ? String(departmentId) : '' },
      errors: {},
      saving: false,
    });

  const setFacultyField = (field) => (e) =>
    setFacultyModal((cur) => ({ ...cur, form: { ...cur.form, [field]: e.target.value }, errors: {} }));

  const saveFaculty = async (e, replaceExisting = false) => {
    e?.preventDefault();
    if (!facultyModal || (facultyModal.saving && !replaceExisting)) return;
    const { account, form } = facultyModal;
    const errors = validateFacultyForm(form);
    if (Object.keys(errors).length > 0) {
      setFacultyModal((cur) => ({ ...cur, errors }));
      return;
    }
    setFacultyModal((cur) => ({ ...cur, saving: true, errors: {} }));
    try {
      if (account) {
        await updateFacultyAccount(account.id, form, { replaceExisting });
        toastSuccess(`${form.fullName.trim()} updated.`);
      } else {
        const result = await createFacultyAccount(form, { replaceExisting });
        toastSuccess('Faculty account created.');
        if (result?.temporaryPassword) {
          setOneTime({ password: result.temporaryPassword, account: result.faculty, title: 'Faculty account created' });
        }
      }
      setFacultyModal(null);
      setReplacePrompt(null);
      reloadAll();
    } catch (err) {
      if (err?.status === 409 && form.departmentId && !replaceExisting) {
        // The department already has an advisor: ask before replacing them.
        setFacultyModal((cur) => ({ ...cur, saving: false }));
        setReplacePrompt({ message: err.message });
        return;
      }
      setReplacePrompt(null);
      setFacultyModal((cur) => ({ ...cur, saving: false, errors: { form: err.message || 'Could not save the faculty account.' } }));
    }
  };

  const runFacultyConfirm = async () => {
    if (!facultyConfirm || facultyBusy) return;
    const { kind, account } = facultyConfirm;
    setFacultyBusy(true);
    try {
      if (kind === 'disable') {
        await disableFacultyAccount(account.id);
        toastSuccess(`${account.fullName} disabled.`);
      }
      if (kind === 'enable') {
        await enableFacultyAccount(account.id);
        toastSuccess(`${account.fullName} enabled.`);
      }
      if (kind === 'reset') {
        const result = await resetFacultyPassword(account.id);
        if (result?.temporaryPassword) {
          setOneTime({ password: result.temporaryPassword, account: result.faculty || account, title: 'Password reset' });
        }
        toastSuccess(`Password for ${account.fullName} reset.`);
      }
      setFacultyConfirm(null);
      reloadAll();
    } catch (err) {
      toastError(err, err.message || 'The action could not be completed.');
    } finally {
      setFacultyBusy(false);
    }
  };

  const FACULTY_COPY = {
    disable: {
      title: 'Disable faculty account?',
      body: (a) => `${a.fullName} will be signed out and unable to sign in. Verification requests from ${a.department?.code || 'their department'} then go to admins.`,
      button: 'Disable',
      tone: 'bg-gray-700 hover:bg-gray-800',
    },
    enable: {
      title: 'Enable faculty account?',
      body: (a) => `${a.fullName} will be able to sign in again.`,
      button: 'Enable',
      tone: 'bg-green-600 hover:bg-green-700',
    },
    reset: {
      title: 'Reset password?',
      body: (a) => `A new temporary password is generated for ${a.fullName} and shown once. They must change it at their next sign-in.`,
      button: 'Reset password',
      tone: 'bg-blue-600 hover:bg-blue-700',
    },
  };

  // ------------------------------------------------------------ render

  return (
    <main className="flex-1 px-4 md:px-8 py-6 overflow-x-hidden">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-1">Departments &amp; Faculty</h2>
          <p className="text-gray-500 text-sm max-w-3xl">
            Departments appear in every student form. Each department can have one faculty advisor, who verifies its
            students&apos; profile changes.
          </p>
        </div>
        <button type="button" onClick={reloadAll} className="flex items-center justify-center gap-1.5 border border-gray-300 bg-white px-3 py-2 rounded-lg text-sm hover:bg-gray-50 shrink-0">
          <RefreshCw className="w-4 h-4" /> Refresh
        </button>
      </div>

      {/* Departments */}
      <section className="mb-10" aria-labelledby="departments-heading">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-3">
          <h3 id="departments-heading" className="font-semibold text-gray-900 flex items-center gap-2">
            <Building2 className="w-4 h-4 text-gray-500" /> Departments
            {!departmentsLoading && <span className="text-[11px] px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-600">{departments.length}</span>}
          </h3>
          <button type="button" onClick={() => openDepartmentForm()} className="flex items-center justify-center gap-1.5 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700 font-medium">
            <Plus className="w-4 h-4" /> Add department
          </button>
        </div>
        {departmentsError && <FormError message={departmentsError} />}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-x-auto">
          <div className="min-w-[760px]">
            <div style={DEPT_GRID} className="grid gap-3 px-4 py-3 bg-gray-50 text-xs font-semibold text-gray-600 border-b border-gray-200">
              <div>Code</div>
              <div>Name</div>
              <div>Faculty advisor</div>
              <div>Students</div>
              <div>Status</div>
              <div className="text-right sticky right-0 bg-gray-50">Actions</div>
            </div>
            {departmentsLoading ? (
              <TableSkeleton rows={4} cols={5} className="shadow-none rounded-none" />
            ) : departments.length === 0 ? (
              <div className="p-4">
                <EmptyState type="empty" icon={Building2} title="No departments yet" description="Add the departments your college offers." action={{ label: 'Add department', onClick: () => openDepartmentForm(), icon: Plus }} compact />
              </div>
            ) : (
              departments.map((d) => {
                const advisor = d.facultyAdvisor;
                return (
                  <div key={d.id} style={DEPT_GRID} className="group grid gap-3 px-4 py-3 border-b border-gray-100 last:border-b-0 items-center text-sm hover:bg-gray-50">
                    <div><span className="inline-block font-semibold text-xs px-2 py-1 rounded-md bg-gray-100 text-gray-800">{d.code}</span></div>
                    <div className="text-gray-800 min-w-0 truncate" title={d.name}>{d.name}</div>
                    <div className="min-w-0">
                      {advisor ? (
                        <>
                          <p className="truncate text-gray-900 font-medium flex items-center gap-1.5">
                            {advisor.fullName}
                            {advisor.active === false && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-600 font-semibold">Disabled</span>}
                          </p>
                          {advisor.email && <p className="text-xs text-gray-400 truncate">{advisor.email}</p>}
                        </>
                      ) : (
                        <button type="button" onClick={() => openFacultyForm(null, d.id)} className="text-xs text-blue-600 hover:underline font-medium inline-flex items-center gap-1">
                          <UserPlus className="w-3.5 h-3.5" /> Assign advisor
                        </button>
                      )}
                    </div>
                    <div className="text-gray-600">{d.studentCount ?? '—'}</div>
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
                        { key: 'delete', label: 'Delete', icon: Trash2, tone: 'danger', separatorBefore: true, onClick: () => setDeptConfirm({ kind: 'delete', dept: d }) },
                      ]}
                    />
                  </div>
                );
              })
            )}
          </div>
        </div>
      </section>

      {/* Faculty accounts */}
      <section aria-labelledby="faculty-heading">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-3">
          <h3 id="faculty-heading" className="font-semibold text-gray-900 flex items-center gap-2">
            <UserCheck className="w-4 h-4 text-gray-500" /> Faculty advisor accounts
            {faculty.loaded && <span className="text-[11px] px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-600">{faculty.list.length}</span>}
          </h3>
          <button type="button" onClick={() => openFacultyForm()} className="flex items-center justify-center gap-1.5 border border-blue-600 text-blue-700 px-4 py-2 rounded-lg text-sm hover:bg-blue-50 font-medium">
            <UserPlus className="w-4 h-4" /> Add faculty account
          </button>
        </div>
        {faculty.error && <div className="mb-3"><FormError message={faculty.error} /></div>}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-x-auto">
          <div className="min-w-[720px]">
            <div style={FACULTY_GRID} className="grid gap-3 px-4 py-3 bg-gray-50 text-xs font-semibold text-gray-600 border-b border-gray-200">
              <div>Name</div>
              <div>Department</div>
              <div>Status</div>
              <div>Last sign-in</div>
              <div className="text-right sticky right-0 bg-gray-50">Actions</div>
            </div>
            {!faculty.loaded ? (
              <TableSkeleton rows={3} cols={4} className="shadow-none rounded-none" />
            ) : faculty.list.length === 0 ? (
              <div className="p-4">
                <EmptyState type="empty" icon={UserCheck} title="No faculty accounts" description="Create an advisor account for each department so profile changes can be verified." compact />
              </div>
            ) : (
              faculty.list.map((a) => (
                <div key={a.id} style={FACULTY_GRID} className="group grid gap-3 px-4 py-3 border-b border-gray-100 last:border-b-0 items-center text-sm hover:bg-gray-50">
                  <div className="min-w-0">
                    <p className="truncate font-medium text-gray-900">{a.fullName}</p>
                    <p className="text-xs text-gray-400 truncate">{a.email}{a.designation ? ` · ${a.designation}` : ''}</p>
                  </div>
                  <div>
                    {a.department ? (
                      <span className="inline-block font-semibold text-xs px-2 py-1 rounded-md bg-gray-100 text-gray-800" title={a.department.name}>{a.department.code}</span>
                    ) : <span className="text-xs text-gray-400">Unassigned</span>}
                  </div>
                  <div className="flex flex-wrap gap-1">
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${a.active === false ? 'bg-gray-100 text-gray-600' : 'bg-green-100 text-green-700'}`}>
                      {a.active === false ? 'Disabled' : 'Active'}
                    </span>
                    {a.mustChangePassword && <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold bg-amber-100 text-amber-700">Temp password</span>}
                  </div>
                  <div className="text-xs text-gray-500">{formatDateTime(a.lastLoginAt)}</div>
                  <ActionsCell
                    sticky
                    label={a.fullName}
                    busy={facultyBusy && facultyConfirm?.account?.id === a.id}
                    primary={{ label: 'Edit', icon: Pencil, onClick: () => openFacultyForm(a) }}
                    items={[
                      a.active === false
                        ? { key: 'enable', label: 'Enable', icon: Power, tone: 'good', onClick: () => setFacultyConfirm({ kind: 'enable', account: a }) }
                        : { key: 'disable', label: 'Disable', icon: Ban, tone: 'warn', onClick: () => setFacultyConfirm({ kind: 'disable', account: a }) },
                      { key: 'reset', label: 'Reset password', icon: KeyRound, onClick: () => setFacultyConfirm({ kind: 'reset', account: a }) },
                    ]}
                  />
                </div>
              ))
            )}
          </div>
        </div>
      </section>

      {/* Department form */}
      {deptModal && (
        <Modal
          title={deptModal.dept ? `Rename ${deptModal.dept.code}` : 'Add a department'}
          subtitle={deptModal.dept ? 'The code stays the same so existing students and job drives keep working.' : 'It will appear in every student form straight away.'}
          onClose={() => setDeptModal(null)}
          locked={deptModal.saving}
        >
          <form onSubmit={saveDepartment} noValidate className="space-y-4">
            <FormError message={deptModal.errors.form} />
            <Field label="Code" htmlFor="dept-code" error={deptModal.errors.code} hint={deptModal.dept ? 'Fixed once created.' : 'Short and unique, e.g. AIDS. 2 to 10 letters or digits.'}>
              <input id="dept-code" autoFocus={!deptModal.dept} value={deptModal.form.code} onChange={setDeptField('code')} placeholder="e.g. AIDS" autoComplete="off" disabled={deptModal.saving || Boolean(deptModal.dept)} className={inputClass(deptModal.errors.code)} />
            </Field>
            <Field label="Name" htmlFor="dept-name" error={deptModal.errors.name}>
              <input id="dept-name" autoFocus={Boolean(deptModal.dept)} value={deptModal.form.name} onChange={setDeptField('name')} placeholder="e.g. Artificial Intelligence and Data Science" autoComplete="off" disabled={deptModal.saving} className={inputClass(deptModal.errors.name)} />
            </Field>
            {!deptModal.dept && (
              <div className="border border-gray-200 rounded-lg p-3 space-y-3">
                <label className="flex items-center gap-2 text-sm text-gray-800 font-medium">
                  <input type="checkbox" checked={deptModal.form.createFacultyAccount} onChange={setDeptField('createFacultyAccount')} disabled={deptModal.saving} className="w-4 h-4 rounded border-gray-300 text-blue-600" />
                  Create faculty advisor account
                </label>
                {deptModal.form.createFacultyAccount && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <Field label="Advisor name" htmlFor="dept-fac-name" error={deptModal.errors.facultyName}>
                      <input id="dept-fac-name" value={deptModal.form.facultyName} onChange={setDeptField('facultyName')} disabled={deptModal.saving} className={inputClass(deptModal.errors.facultyName)} />
                    </Field>
                    <Field label="Email (optional)" htmlFor="dept-fac-email" error={deptModal.errors.facultyEmail} hint="Left blank, a sign-in address is generated.">
                      <input id="dept-fac-email" type="email" value={deptModal.form.facultyEmail} onChange={setDeptField('facultyEmail')} disabled={deptModal.saving} className={inputClass(deptModal.errors.facultyEmail)} />
                    </Field>
                  </div>
                )}
              </div>
            )}
            <div className="flex justify-end gap-2 pt-1">
              <button type="button" onClick={() => setDeptModal(null)} disabled={deptModal.saving} className="px-4 py-2 rounded-lg text-sm border border-gray-300 hover:bg-gray-50">Cancel</button>
              <button type="submit" disabled={deptModal.saving} className="flex items-center gap-1.5 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700 font-medium disabled:opacity-60">
                {deptModal.saving && <Loader2 className="w-4 h-4 animate-spin" />}
                {deptModal.saving ? 'Saving…' : deptModal.dept ? 'Save name' : 'Add department'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Department confirm */}
      {deptConfirm && (
        <Modal title={DEPT_COPY[deptConfirm.kind].title} onClose={() => setDeptConfirm(null)} locked={deptBusy}>
          <p className="text-sm text-gray-600 mb-4">{DEPT_COPY[deptConfirm.kind].body(deptConfirm.dept)}</p>
          {deptConfirm.error && <div className="mb-4"><FormError message={deptConfirm.error} /></div>}
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setDeptConfirm(null)} disabled={deptBusy} className="px-4 py-2 rounded-lg text-sm border border-gray-300 hover:bg-gray-50">
              {deptConfirm.error ? 'Close' : 'Cancel'}
            </button>
            {!deptConfirm.error && (
              <button type="button" onClick={runDepartmentConfirm} disabled={deptBusy} className={`flex items-center gap-1.5 text-white px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50 ${DEPT_COPY[deptConfirm.kind].tone}`}>
                {deptBusy && <Loader2 className="w-4 h-4 animate-spin" />}
                {DEPT_COPY[deptConfirm.kind].button}
              </button>
            )}
          </div>
        </Modal>
      )}

      {/* Faculty form */}
      {facultyModal && !replacePrompt && (
        <Modal
          title={facultyModal.account ? `Edit ${facultyModal.account.fullName}` : 'Add faculty account'}
          subtitle={facultyModal.account ? undefined : 'A temporary password is generated and shown once.'}
          onClose={() => setFacultyModal(null)}
          locked={facultyModal.saving}
        >
          <form onSubmit={(e) => saveFaculty(e, false)} noValidate className="space-y-4">
            <FormError message={facultyModal.errors.form} />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label="Full name" htmlFor="fac-name" error={facultyModal.errors.fullName}>
                <input id="fac-name" autoFocus value={facultyModal.form.fullName} onChange={setFacultyField('fullName')} disabled={facultyModal.saving} className={inputClass(facultyModal.errors.fullName)} />
              </Field>
              <Field label={facultyModal.account ? 'Email' : 'Email (optional)'} htmlFor="fac-email" error={facultyModal.errors.email} hint={facultyModal.account ? undefined : 'Left blank, a sign-in address is generated.'}>
                <input id="fac-email" type="email" value={facultyModal.form.email} onChange={setFacultyField('email')} disabled={facultyModal.saving} className={inputClass(facultyModal.errors.email)} />
              </Field>
              <Field label="Phone (optional)" htmlFor="fac-phone" error={facultyModal.errors.phone}>
                <input id="fac-phone" value={facultyModal.form.phone} onChange={setFacultyField('phone')} disabled={facultyModal.saving} className={inputClass(facultyModal.errors.phone)} />
              </Field>
              <Field label="Designation (optional)" htmlFor="fac-designation" error={facultyModal.errors.designation}>
                <input id="fac-designation" value={facultyModal.form.designation} onChange={setFacultyField('designation')} placeholder="e.g. Assistant Professor" disabled={facultyModal.saving} className={inputClass(facultyModal.errors.designation)} />
              </Field>
              <Field label="Department" htmlFor="fac-dept" hint="One advisor per department.">
                <select id="fac-dept" value={facultyModal.form.departmentId} onChange={setFacultyField('departmentId')} disabled={facultyModal.saving} className={inputClass(false)}>
                  <option value="">Not assigned</option>
                  {departments.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.code} · {d.name}{d.facultyAdvisor && d.facultyAdvisor.id !== facultyModal.account?.id ? ` (advisor: ${d.facultyAdvisor.fullName})` : ''}
                    </option>
                  ))}
                </select>
              </Field>
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <button type="button" onClick={() => setFacultyModal(null)} disabled={facultyModal.saving} className="px-4 py-2 rounded-lg text-sm border border-gray-300 hover:bg-gray-50">Cancel</button>
              <button type="submit" disabled={facultyModal.saving} className="flex items-center gap-1.5 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700 font-medium disabled:opacity-60">
                {facultyModal.saving && <Loader2 className="w-4 h-4 animate-spin" />}
                {facultyModal.saving ? 'Saving…' : facultyModal.account ? 'Save changes' : 'Create account'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Replace existing advisor */}
      {facultyModal && replacePrompt && (
        <Modal title="Replace the current advisor?" onClose={() => setReplacePrompt(null)} locked={facultyModal.saving}>
          <p className="text-sm text-gray-600 mb-2">{replacePrompt.message || 'This department already has a faculty advisor.'}</p>
          <p className="text-sm text-gray-600 mb-5">If you continue, the current advisor is unassigned from the department and this account takes over.</p>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setReplacePrompt(null)} disabled={facultyModal.saving} className="px-4 py-2 rounded-lg text-sm border border-gray-300 hover:bg-gray-50">Back</button>
            <button type="button" onClick={() => saveFaculty(null, true)} disabled={facultyModal.saving} className="flex items-center gap-1.5 bg-amber-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-amber-700 font-medium disabled:opacity-60">
              {facultyModal.saving && <Loader2 className="w-4 h-4 animate-spin" />} Replace advisor
            </button>
          </div>
        </Modal>
      )}

      {/* Faculty confirm */}
      {facultyConfirm && (
        <Modal title={FACULTY_COPY[facultyConfirm.kind].title} onClose={() => setFacultyConfirm(null)} locked={facultyBusy}>
          <p className="text-sm text-gray-600 mb-5">{FACULTY_COPY[facultyConfirm.kind].body(facultyConfirm.account)}</p>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setFacultyConfirm(null)} disabled={facultyBusy} className="px-4 py-2 rounded-lg text-sm border border-gray-300 hover:bg-gray-50">Cancel</button>
            <button type="button" onClick={runFacultyConfirm} disabled={facultyBusy} className={`flex items-center gap-1.5 text-white px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50 ${FACULTY_COPY[facultyConfirm.kind].tone}`}>
              {facultyBusy && <Loader2 className="w-4 h-4 animate-spin" />}
              {FACULTY_COPY[facultyConfirm.kind].button}
            </button>
          </div>
        </Modal>
      )}

      <OneTimePasswordModal
        open={Boolean(oneTime)}
        password={oneTime?.password}
        account={oneTime?.account}
        title={oneTime?.title}
        onClose={() => setOneTime(null)}
      />
    </main>
  );
}
