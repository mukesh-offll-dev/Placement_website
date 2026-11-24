import { useEffect, useMemo, useRef, useState } from 'react';
import { CheckCircle2, Loader2 } from 'lucide-react';
import { Field, FormError, Modal } from './Modal';
import { inputClass } from './formStyles';
import { getCompanies } from '../../services/api/jobService';
import { toastSuccess } from '../../utils/toast';
import {
  MAX_BULK,
  digitsOnly,
  normalizeRegisterNumber,
  expandRegisterRange,
  validateProvisionForm,
  validateBulkForm,
  validateStudentEditForm,
  buildStudentEditPayload,
  yearFromBatch,
} from '../../utils/studentValidation';

const THIS_YEAR = new Date().getFullYear();
const YEARS = Array.from({ length: 9 }, (_, i) => THIS_YEAR - 2 + i);
const DEFAULT_YEAR = String(THIS_YEAR + 2);

/**
 * Department picker, or a read-only display when the department is fixed (faculty advisors can
 * only add students to their own department).
 */
function DepartmentInput({ id, value, onChange, departments, fixedDepartment, disabled, error }) {
  if (fixedDepartment) {
    return (
      <Field label="Department" htmlFor={id} hint="Students are added to your department.">
        <input id={id} value={`${fixedDepartment.code}${fixedDepartment.name ? ` · ${fixedDepartment.name}` : ''}`} disabled className={inputClass(false)} />
      </Field>
    );
  }
  const none = departments.length === 0;
  return (
    <Field label="Department" htmlFor={id} error={error}>
      <select id={id} value={value} onChange={onChange} disabled={disabled || none} className={inputClass(error)}>
        {none && <option value="">No departments</option>}
        {departments.map((d) => <option key={d.id} value={d.code} title={d.name}>{d.code}</option>)}
      </select>
    </Field>
  );
}

function YearSelect({ id, value, onChange, disabled, error }) {
  return (
    <Field label="Year of passing" htmlFor={id} error={error} hint="The year this batch graduates">
      <select id={id} value={value} onChange={onChange} disabled={disabled} className={inputClass(error)}>
        {YEARS.map((y) => <option key={y} value={y}>{y}</option>)}
      </select>
    </Field>
  );
}

/** Add one student from a register number. */
export function AddStudentModal({ api, departments = [], fixedDepartment = null, onClose, onAdded }) {
  const initialDept = fixedDepartment?.code || departments[0]?.code || '';
  const [form, setForm] = useState({ registerNumber: '', department: initialDept, year: DEFAULT_YEAR });
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const inputRef = useRef(null);
  const [refocus, setRefocus] = useState(0);
  const noDepartments = !fixedDepartment && departments.length === 0;

  useEffect(() => {
    if (refocus > 0) inputRef.current?.focus();
  }, [refocus]);

  const submit = async (e, keepOpen) => {
    e?.preventDefault();
    if (busy) return;
    const department = fixedDepartment?.code || form.department;
    const found = validateProvisionForm({ ...form, department });
    setErrors(found);
    if (Object.keys(found).length > 0) return;
    setBusy(true);
    try {
      const rn = normalizeRegisterNumber(form.registerNumber);
      await api.provision({ registerNumber: rn, department, year: Number(form.year) });
      toastSuccess(`Student ${rn} added. Their first password is their register number.`);
      onAdded?.();
      if (keepOpen) {
        setForm((f) => ({ ...f, registerNumber: '' }));
        setErrors({});
        setRefocus((t) => t + 1);
      } else {
        onClose();
      }
    } catch (err) {
      setErrors({ form: err.message || 'Could not add the student.' });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal title="Add a student" subtitle="Their first password will be their register number." onClose={onClose} locked={busy}>
      <form onSubmit={(e) => submit(e, false)} noValidate className="space-y-4">
        <FormError message={errors.form} />
        <Field label="Register number" htmlFor="single-rn" error={errors.registerNumber} hint="Exactly 12 digits, numbers only.">
          <input
            id="single-rn"
            ref={inputRef}
            autoFocus
            value={form.registerNumber}
            onChange={(e) => { setForm((f) => ({ ...f, registerNumber: digitsOnly(e.target.value) })); setErrors({}); }}
            placeholder="e.g. 830123104032"
            inputMode="numeric"
            maxLength={12}
            autoComplete="off"
            disabled={busy}
            className={inputClass(errors.registerNumber)}
          />
        </Field>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <DepartmentInput
            id="single-dept"
            value={form.department}
            onChange={(e) => setForm((f) => ({ ...f, department: e.target.value }))}
            departments={departments}
            fixedDepartment={fixedDepartment}
            disabled={busy}
            error={errors.department}
          />
          <YearSelect id="single-year" value={form.year} onChange={(e) => setForm((f) => ({ ...f, year: e.target.value }))} disabled={busy} error={errors.year} />
        </div>
        <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} disabled={busy} className="px-4 py-2 rounded-lg text-sm border border-gray-300 hover:bg-gray-50 disabled:opacity-50">Cancel</button>
          <button type="button" onClick={(e) => submit(e, true)} disabled={busy || noDepartments} className="px-4 py-2 rounded-lg text-sm border border-blue-600 text-blue-700 hover:bg-blue-50 font-medium disabled:opacity-50">
            Add &amp; add another
          </button>
          <button type="submit" disabled={busy || noDepartments} className="flex items-center justify-center gap-1.5 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700 font-medium disabled:opacity-60">
            {busy && <Loader2 className="w-4 h-4 animate-spin" />}
            {busy ? 'Adding…' : 'Add student'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

/** Add every student in a register number range. */
export function BulkAddModal({ api, departments = [], fixedDepartment = null, onClose, onAdded }) {
  const initialDept = fixedDepartment?.code || departments[0]?.code || '';
  const empty = { registerNumberFrom: '', registerNumberTo: '', department: initialDept, year: DEFAULT_YEAR };
  const [form, setForm] = useState(empty);
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);
  const noDepartments = !fixedDepartment && departments.length === 0;

  const preview = useMemo(() => expandRegisterRange(form.registerNumberFrom, form.registerNumberTo), [form.registerNumberFrom, form.registerNumberTo]);

  const submit = async (e) => {
    e?.preventDefault();
    if (busy) return;
    const department = fixedDepartment?.code || form.department;
    const found = validateBulkForm({ ...form, department });
    setErrors(found);
    if (Object.keys(found).length > 0) return;
    setBusy(true);
    try {
      const res = await api.provisionBulk({
        registerNumberFrom: normalizeRegisterNumber(form.registerNumberFrom),
        registerNumberTo: normalizeRegisterNumber(form.registerNumberTo),
        department,
        year: Number(form.year),
      });
      setResult(res);
      toastSuccess(`${res?.created ?? 0} student(s) added, ${res?.skipped ?? 0} already existed.`);
      onAdded?.();
    } catch (err) {
      setErrors({ form: err.message || 'Could not add the students.' });
    } finally {
      setBusy(false);
    }
  };

  if (result) {
    const skippedNumbers = Array.isArray(result.skippedRegisterNumbers) ? result.skippedRegisterNumbers : [];
    return (
      <Modal title="Students added" onClose={onClose}>
        <div className="space-y-4" role="status">
          <div className="flex items-center gap-3 bg-green-50 border border-green-200 rounded-xl px-4 py-3">
            <CheckCircle2 className="w-6 h-6 text-green-600 shrink-0" />
            <div>
              <p className="font-semibold text-green-900">{result.created ?? 0} student(s) added</p>
              <p className="text-xs text-green-800">
                {result.skipped > 0 ? `${result.skipped} already existed and were skipped.` : 'No register numbers were skipped.'}
              </p>
            </div>
          </div>
          {skippedNumbers.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-gray-700 mb-1">Skipped (already existed)</p>
              <p className="text-xs text-gray-500 bg-gray-50 border border-gray-200 rounded-lg p-2 max-h-24 overflow-y-auto break-words font-mono">
                {skippedNumbers.join(', ')}
              </p>
            </div>
          )}
          <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-1">
            <button type="button" onClick={() => { setResult(null); setForm(empty); setErrors({}); }} className="px-4 py-2 rounded-lg text-sm border border-gray-300 hover:bg-gray-50">
              Add another range
            </button>
            <button type="button" onClick={onClose} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700 font-medium">Done</button>
          </div>
        </div>
      </Modal>
    );
  }

  return (
    <Modal title="Add many students" subtitle="Every register number from the first to the last is created." onClose={onClose} locked={busy}>
      <form onSubmit={submit} noValidate className="space-y-4">
        <FormError message={errors.form} />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label="Register number from" htmlFor="bulk-from" error={errors.registerNumberFrom}>
            <input
              id="bulk-from"
              autoFocus
              value={form.registerNumberFrom}
              onChange={(e) => { setForm((f) => ({ ...f, registerNumberFrom: digitsOnly(e.target.value) })); setErrors({}); }}
              placeholder="830123104001"
              inputMode="numeric"
              maxLength={12}
              autoComplete="off"
              disabled={busy}
              className={inputClass(errors.registerNumberFrom)}
            />
          </Field>
          <Field label="Register number to" htmlFor="bulk-to" error={errors.registerNumberTo}>
            <input
              id="bulk-to"
              value={form.registerNumberTo}
              onChange={(e) => { setForm((f) => ({ ...f, registerNumberTo: digitsOnly(e.target.value) })); setErrors({}); }}
              placeholder="830123104060"
              inputMode="numeric"
              maxLength={12}
              autoComplete="off"
              disabled={busy}
              className={inputClass(errors.registerNumberTo)}
            />
          </Field>
          <DepartmentInput
            id="bulk-dept"
            value={form.department}
            onChange={(e) => setForm((f) => ({ ...f, department: e.target.value }))}
            departments={departments}
            fixedDepartment={fixedDepartment}
            disabled={busy}
            error={errors.department}
          />
          <YearSelect id="bulk-year" value={form.year} onChange={(e) => setForm((f) => ({ ...f, year: e.target.value }))} disabled={busy} error={errors.year} />
        </div>
        <div className={`rounded-lg px-3 py-2.5 text-xs ${preview.error ? 'bg-red-50 text-red-700' : 'bg-gray-50 text-gray-600'}`} aria-live="polite">
          {preview.error ? preview.error : preview.numbers.length > 0 ? (
            <>
              Will create up to <strong className="text-gray-800">{preview.numbers.length}</strong> students:{' '}
              <span className="font-mono">{preview.numbers[0]}</span> to{' '}
              <span className="font-mono">{preview.numbers[preview.numbers.length - 1]}</span>. Register numbers that already exist are skipped.
            </>
          ) : `Enter the first and last register number. They must share the same prefix and length. Limit: ${MAX_BULK} per request.`}
        </div>
        <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-1">
          <button type="button" onClick={onClose} disabled={busy} className="px-4 py-2 rounded-lg text-sm border border-gray-300 hover:bg-gray-50 disabled:opacity-50">Cancel</button>
          <button type="submit" disabled={busy || Boolean(preview.error) || noDepartments} className="flex items-center justify-center gap-1.5 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700 font-medium disabled:opacity-60">
            {busy && <Loader2 className="w-4 h-4 animate-spin" />}
            {busy ? 'Adding… this can take a moment' : preview.numbers.length > 0 ? `Add ${preview.numbers.length} students` : 'Add students'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

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

/**
 * Edit a student's admin-managed record. `showPlacement` adds the placement fields (admin only;
 * faculty edits keep whatever placement values the record already has).
 */
export function EditStudentModal({ api, student, departments = [], fixedDepartment = null, showPlacement = true, onClose, onSaved }) {
  const [state, setState] = useState({ form: null, errors: {}, loading: true, saving: false, apiError: '' });
  const [companies, setCompanies] = useState([]);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      api.get(student.id),
      showPlacement ? getCompanies().catch(() => []) : Promise.resolve([]),
    ])
      .then(([detail, companyList]) => {
        if (cancelled) return;
        setCompanies(Array.isArray(companyList) ? companyList : []);
        setState((s) => ({ ...s, form: toForm(detail || {}), loading: false }));
      })
      .catch((err) => {
        if (!cancelled) setState((s) => ({ ...s, loading: false, apiError: err.message || 'Could not load the student.' }));
      });
    return () => { cancelled = true; };
  }, [api, student.id, showPlacement]);

  const setField = (field) => (e) =>
    setState((cur) => ({ ...cur, form: { ...cur.form, [field]: e.target.value }, errors: { ...cur.errors, [field]: '' }, apiError: '' }));

  const save = async (e) => {
    e.preventDefault();
    if (state.saving || !state.form) return;
    const form = fixedDepartment ? { ...state.form, department: state.form.department || fixedDepartment.code } : state.form;
    const errors = validateStudentEditForm(form);
    if (Object.keys(errors).length > 0) {
      setState((cur) => ({ ...cur, errors }));
      return;
    }
    setState((cur) => ({ ...cur, saving: true, apiError: '' }));
    try {
      await api.update(student.id, buildStudentEditPayload(form));
      toastSuccess('Student updated.');
      onSaved?.();
      onClose();
    } catch (err) {
      setState((cur) => ({ ...cur, saving: false, apiError: err.message || 'Could not save the changes.' }));
    }
  };

  const { form, errors } = state;
  return (
    <Modal title={`Edit ${student.rollNo || 'student'}`} onClose={onClose} locked={state.saving} wide>
      {state.loading ? (
        <div className="py-10 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-blue-600" /></div>
      ) : !form ? (
        <p className="text-red-600 text-sm">{state.apiError}</p>
      ) : (
        <form onSubmit={save} noValidate className="space-y-4">
          <FormError message={state.apiError} />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="Register number" htmlFor="edit-rn" hint="This is their login ID and cannot be changed here.">
              <input id="edit-rn" value={student.rollNo || ''} disabled className={inputClass(false)} />
            </Field>
            <Field label="Full name" htmlFor="edit-name" error={errors.fullName}>
              <input id="edit-name" value={form.fullName} onChange={setField('fullName')} className={inputClass(errors.fullName)} />
            </Field>
            <Field label="Email" htmlFor="edit-email" error={errors.email}>
              <input id="edit-email" type="email" value={form.email} onChange={setField('email')} className={inputClass(errors.email)} />
            </Field>
            {fixedDepartment ? (
              <Field label="Department" htmlFor="edit-dept">
                <input id="edit-dept" value={form.department || fixedDepartment.code} disabled className={inputClass(false)} />
              </Field>
            ) : (
              <Field label="Department" htmlFor="edit-dept" error={errors.department}>
                <select id="edit-dept" value={form.department} onChange={setField('department')} className={inputClass(errors.department)}>
                  {!form.department && <option value="">Select…</option>}
                  {form.department && !departments.some((d) => d.code === form.department) && (
                    <option value={form.department}>{form.department}</option>
                  )}
                  {departments.map((d) => (
                    <option key={d.id} value={d.code} title={d.name} disabled={d.isActive === false && d.code !== form.department}>
                      {d.code}{d.isActive === false ? ' (inactive)' : ''}
                    </option>
                  ))}
                </select>
              </Field>
            )}
            <Field label="Year of passing" htmlFor="edit-year" error={errors.year}>
              <select id="edit-year" value={form.year} onChange={setField('year')} className={inputClass(errors.year)}>
                <option value="">Not set</option>
                {[...new Set([...YEARS, Number(form.year) || null].filter(Boolean))].sort().map((y) => <option key={y} value={y}>{y}</option>)}
              </select>
            </Field>
            <Field label="CGPA" htmlFor="edit-cgpa" error={errors.cgpa} hint="0 to 10, up to two decimals">
              <input id="edit-cgpa" inputMode="decimal" value={form.cgpa} onChange={setField('cgpa')} className={inputClass(errors.cgpa)} />
            </Field>
            <Field label="Total backlogs" htmlFor="edit-total" error={errors.totalBacklogs}>
              <input id="edit-total" inputMode="numeric" value={form.totalBacklogs} onChange={setField('totalBacklogs')} className={inputClass(errors.totalBacklogs)} />
            </Field>
            <Field label="Active backlogs" htmlFor="edit-active" error={errors.activeBacklogs}>
              <input id="edit-active" inputMode="numeric" value={form.activeBacklogs} onChange={setField('activeBacklogs')} className={inputClass(errors.activeBacklogs)} />
            </Field>
            {showPlacement && (
              <>
                <Field label="Placement" htmlFor="edit-status" hint="Set automatically when an application is marked Selected">
                  {/* Placed / Not placed only. "Not placed" keeps the stored non-placed value (or ACTIVE). */}
                  <select id="edit-status" value={form.placementStatus} onChange={setField('placementStatus')} className={inputClass(false)}>
                    <option value={form.placementStatus === 'PLACED' ? 'ACTIVE' : form.placementStatus}>Not placed</option>
                    <option value="PLACED">Placed</option>
                  </select>
                </Field>
                {form.placementStatus === 'PLACED' && (
                  <>
                    <Field label="Placed company" htmlFor="edit-company" error={errors.placedCompanyId}>
                      <select id="edit-company" value={form.placedCompanyId} onChange={setField('placedCompanyId')} className={inputClass(errors.placedCompanyId)}>
                        <option value="">Choose company</option>
                        {companies.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                      </select>
                    </Field>
                    <Field label="Package (CTC)" htmlFor="edit-ctc" error={errors.placedCtc} hint="Annual, in rupees">
                      <input id="edit-ctc" inputMode="decimal" value={form.placedCtc} onChange={setField('placedCtc')} className={inputClass(errors.placedCtc)} />
                    </Field>
                  </>
                )}
              </>
            )}
          </div>
          <Field label="Skills" htmlFor="edit-skills" error={errors.skills} hint="Separate with commas, e.g. Java, React, SQL">
            <input id="edit-skills" value={form.skills} onChange={setField('skills')} className={inputClass(errors.skills)} />
          </Field>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} disabled={state.saving} className="px-4 py-2 rounded-lg text-sm border border-gray-300 hover:bg-gray-50">Cancel</button>
            <button type="submit" disabled={state.saving} className="flex items-center gap-1.5 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700 font-medium disabled:opacity-60">
              {state.saving && <Loader2 className="w-4 h-4 animate-spin" />}
              {state.saving ? 'Saving…' : 'Save changes'}
            </button>
          </div>
        </form>
      )}
    </Modal>
  );
}
