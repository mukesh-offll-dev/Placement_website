import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { ArrowLeft, Briefcase, Loader2, Plus, X, AlertCircle } from 'lucide-react';

import jobService from '../services/api/jobService';
import { toastSuccess, toastError } from '../utils/toast';
import {
  EMPLOYMENT_TYPES,
  JOB_STATUSES,
  buildJobPayload,
  emptyJobDrive,
  jobResponseToForm,
  validateJobDrive,
} from '../utils/jobDriveValidation';

/** Shared field shell: label, control, error text, and the id/aria wiring. */
function Field({ id, label, required, error, hint, children }) {
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-gray-700 mb-1">
        {label}
        {required && <span className="text-red-600" aria-hidden="true"> *</span>}
      </label>
      {children}
      {hint && !error && <p className="text-xs text-gray-400 mt-1">{hint}</p>}
      {error && (
        <p id={`${id}-error`} role="alert" className="text-xs text-red-600 mt-1 flex items-center gap-1">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
          {error}
        </p>
      )}
    </div>
  );
}

const controlClasses = (hasError) =>
  `w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 ${
    hasError
      ? 'border-red-400 focus:ring-red-400'
      : 'border-gray-300 focus:ring-blue-500'
  }`;

/** Chip list used for both skills and requirements. */
function TagInput({ id, label, placeholder, maxLength, values, error, onChange }) {
  const [draft, setDraft] = useState('');

  const add = () => {
    const value = draft.trim();
    if (!value) return;
    if (values.some((v) => v.toLowerCase() === value.toLowerCase())) {
      setDraft('');
      return;
    }
    onChange([...values, value]);
    setDraft('');
  };

  return (
    <Field id={id} label={label} error={error} hint={`Press Enter to add. Max ${maxLength} characters each.`}>
      <div className="flex gap-2">
        <input
          id={id}
          type="text"
          value={draft}
          maxLength={maxLength}
          placeholder={placeholder}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              // Enter adds a chip; it must not submit the whole form.
              e.preventDefault();
              add();
            }
          }}
          className={controlClasses(Boolean(error))}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${id}-error` : undefined}
        />
        <button
          type="button"
          onClick={add}
          className="px-3 py-2 rounded-lg border border-gray-300 text-sm hover:bg-gray-50 shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span className="sr-only">Add {label}</span>
        </button>
      </div>
      {values.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-2">
          {values.map((value, index) => (
            <span
              key={`${value}-${index}`}
              className="inline-flex items-center gap-1 bg-blue-50 text-blue-700 text-xs px-2.5 py-1 rounded-full"
            >
              {value}
              <button
                type="button"
                onClick={() => onChange(values.filter((_, i) => i !== index))}
                className="hover:text-blue-900"
              >
                <X className="w-3 h-3" />
                <span className="sr-only">Remove {value}</span>
              </button>
            </span>
          ))}
        </div>
      )}
    </Field>
  );
}

/**
 * Create or edit a job drive.
 *
 * Mounted at /admin/jobs/new and /admin/jobs/:id/edit — the presence of :id is
 * what puts it in edit mode.
 */
export default function AdminJobDriveForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = Boolean(id);

  const [form, setForm] = useState(emptyJobDrive);
  const [errors, setErrors] = useState({});
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState(null);
  const [addingCompany, setAddingCompany] = useState(false);
  const [newCompany, setNewCompany] = useState('');
  const [savingCompany, setSavingCompany] = useState(false);

  /** Adds the recruiter and selects it, so the drive can be posted in one pass. */
  const handleAddCompany = async () => {
    const name = newCompany.trim();
    if (!name || savingCompany) return;

    setSavingCompany(true);
    try {
      const created = await jobService.createCompany({ name });
      setCompanies((prev) => [...prev, created].sort((a, b) => a.name.localeCompare(b.name)));
      setForm((prev) => ({ ...prev, companyId: String(created.id) }));
      setErrors((prev) => ({ ...prev, companyId: undefined }));
      setNewCompany('');
      setAddingCompany(false);
      toastSuccess(`${created.name} added.`);
    } catch (err) {
      toastError(err.message || 'Could not add the company.');
    } finally {
      setSavingCompany(false);
    }
  };

  useEffect(() => {
    const controller = new AbortController();

    const load = async () => {
      try {
        const [companyList, job] = await Promise.all([
          jobService.getCompanies({ signal: controller.signal }),
          isEdit ? jobService.getAdminJobById(id, { signal: controller.signal }) : Promise.resolve(null),
        ]);

        if (controller.signal.aborted) return;
        setCompanies(Array.isArray(companyList) ? companyList : []);
        if (job) setForm(jobResponseToForm(job));
      } catch (err) {
        if (controller.signal.aborted) return;
        setLoadError(err.message || 'Could not load the form.');
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    };

    load();
    return () => controller.abort();
  }, [id, isEdit]);

  const setField = useCallback((field) => (event) => {
    const value =
      event?.target?.type === 'checkbox' ? event.target.checked : event?.target?.value;
    setForm((prev) => ({ ...prev, [field]: value }));
    // Clear the message as soon as the field is touched; it is re-checked on submit.
    setErrors((prev) => (prev[field] ? { ...prev, [field]: undefined } : prev));
  }, []);

  const setList = useCallback((field) => (values) => {
    setForm((prev) => ({ ...prev, [field]: values }));
    setErrors((prev) => (prev[field] ? { ...prev, [field]: undefined } : prev));
  }, []);

  const companyOptions = useMemo(
    () => companies.map((c) => ({ value: String(c.id), label: c.name })),
    [companies]
  );

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (saving) return;

    const found = validateJobDrive(form);
    setErrors(found);
    if (Object.keys(found).length > 0) {
      // Move focus to the first problem so the message is announced and visible.
      const firstField = Object.keys(found)[0];
      document.getElementById(firstField)?.focus();
      toastError('Please correct the highlighted fields.');
      return;
    }

    setSaving(true);
    try {
      const payload = buildJobPayload(form);
      const alertsRequested = payload.notifyEligibleStudents && payload.status === 'ACTIVE';
      if (isEdit) {
        await jobService.updateJob(id, payload);
        toastSuccess('Job drive updated.');
      } else {
        await jobService.createJob(payload);
        toastSuccess(
          alertsRequested
            ? 'Job drive posted. Eligible students are being emailed.'
            : 'Job drive posted.'
        );
      }
      navigate('/admin/jobs');
    } catch (err) {
      // Field messages from the backend win over the generic banner.
      const fieldErrors = err?.validationErrors;
      if (fieldErrors && typeof fieldErrors === 'object' && !Array.isArray(fieldErrors)) {
        setErrors(fieldErrors);
      }
      toastError(err.message || 'Could not save the job drive.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <main className="flex-1 px-4 md:px-8 py-12 flex flex-col items-center justify-center min-h-[50vh]">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin mb-3" />
        <p className="text-gray-500 text-sm">Loading the job drive form…</p>
      </main>
    );
  }

  return (
    <main className="flex-1 px-4 md:px-8 py-6 overflow-x-hidden">
      <Link to="/admin/jobs" className="inline-flex items-center gap-1.5 text-blue-600 text-sm hover:underline mb-5">
        <ArrowLeft className="w-4 h-4" /> Back to Job Drives
      </Link>

      <div className="flex items-center gap-2 mb-1">
        <Briefcase className="w-5 h-5 text-blue-600" />
        <h2 className="text-2xl font-bold text-gray-900">
          {isEdit ? 'Edit Job Drive' : 'Post a Job Drive'}
        </h2>
      </div>
      <p className="text-gray-500 text-sm mb-6">
        Fields marked <span className="text-red-600">*</span> are required. Save as a draft to keep it hidden from students.
      </p>

      {loadError && (
        <div role="alert" className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg p-3 mb-5">
          {loadError}
        </div>
      )}

      <form onSubmit={handleSubmit} noValidate className="max-w-3xl space-y-6">
        <section className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 space-y-4">
          <h3 className="font-semibold text-sm text-gray-900">The role</h3>

          <Field
            id="companyId"
            label="Company"
            required
            error={errors.companyId}
            hint={companyOptions.length === 0 ? 'No companies on file yet — add the recruiter below.' : undefined}
          >
            <div className="flex gap-2">
              <select
                id="companyId"
                value={form.companyId}
                onChange={setField('companyId')}
                className={controlClasses(Boolean(errors.companyId))}
                aria-invalid={Boolean(errors.companyId)}
                aria-describedby={errors.companyId ? 'companyId-error' : undefined}
              >
                <option value="">
                  {companyOptions.length === 0 ? 'No companies yet' : 'Select a company…'}
                </option>
                {companyOptions.map((c) => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => setAddingCompany((v) => !v)}
                className="px-3 py-2 rounded-lg border border-gray-300 text-sm hover:bg-gray-50 shrink-0 whitespace-nowrap"
              >
                {addingCompany ? 'Cancel' : '+ New'}
              </button>
            </div>
          </Field>

          {addingCompany && (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 space-y-2">
              <label htmlFor="newCompanyName" className="block text-sm font-medium text-gray-700">
                New company name
              </label>
              <div className="flex gap-2">
                <input
                  id="newCompanyName"
                  type="text"
                  maxLength={150}
                  value={newCompany}
                  onChange={(e) => setNewCompany(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddCompany();
                    }
                  }}
                  placeholder="e.g. Infosys"
                  className={controlClasses(false)}
                />
                <button
                  type="button"
                  onClick={handleAddCompany}
                  disabled={savingCompany || !newCompany.trim()}
                  className="px-3 py-2 rounded-lg bg-blue-600 text-white text-sm hover:bg-blue-700 disabled:opacity-60 shrink-0 inline-flex items-center gap-1.5"
                >
                  {savingCompany && <Loader2 className="w-4 h-4 animate-spin" />}
                  Add
                </button>
              </div>
            </div>
          )}

          <Field id="jobRole" label="Job role" required error={errors.jobRole}>
            <input
              id="jobRole"
              type="text"
              maxLength={150}
              value={form.jobRole}
              onChange={setField('jobRole')}
              placeholder="e.g. Software Development Engineer"
              className={controlClasses(Boolean(errors.jobRole))}
              aria-invalid={Boolean(errors.jobRole)}
              aria-describedby={errors.jobRole ? 'jobRole-error' : undefined}
            />
          </Field>

          <div className="grid sm:grid-cols-2 gap-4">
            <Field id="jobType" label="Job type" required error={errors.jobType}>
              <select
                id="jobType"
                value={form.jobType}
                onChange={setField('jobType')}
                className={controlClasses(Boolean(errors.jobType))}
              >
                {EMPLOYMENT_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </Field>

            <Field id="location" label="Location" error={errors.location}>
              <input
                id="location"
                type="text"
                maxLength={120}
                value={form.location}
                onChange={setField('location')}
                placeholder="e.g. Bangalore"
                className={controlClasses(Boolean(errors.location))}
              />
            </Field>
          </div>

          <Field id="jobDescription" label="Description" error={errors.jobDescription}
            hint={`${form.jobDescription.length} / 4000 characters`}>
            <textarea
              id="jobDescription"
              rows={5}
              maxLength={4000}
              value={form.jobDescription}
              onChange={setField('jobDescription')}
              placeholder="What the role involves, the team, the selection process…"
              className={controlClasses(Boolean(errors.jobDescription))}
            />
          </Field>
        </section>

        <section className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 space-y-4">
          <h3 className="font-semibold text-sm text-gray-900">Package and openings</h3>

          <div className="grid sm:grid-cols-2 gap-4">
            <Field id="ctcText" label="CTC label" error={errors.ctcText} hint="Shown on the job card, e.g. 12 LPA">
              <input
                id="ctcText"
                type="text"
                maxLength={30}
                value={form.ctcText}
                onChange={setField('ctcText')}
                placeholder="12 LPA"
                className={controlClasses(Boolean(errors.ctcText))}
              />
            </Field>

            <Field id="ctcValue" label="CTC amount" error={errors.ctcValue} hint="Numeric, used for sorting">
              <input
                id="ctcValue"
                type="number"
                min="0"
                step="0.01"
                value={form.ctcValue}
                onChange={setField('ctcValue')}
                placeholder="1200000"
                className={controlClasses(Boolean(errors.ctcValue))}
              />
            </Field>

            <Field id="vacancies" label="Vacancies" error={errors.vacancies}>
              <input
                id="vacancies"
                type="number"
                min="1"
                step="1"
                value={form.vacancies}
                onChange={setField('vacancies')}
                placeholder="10"
                className={controlClasses(Boolean(errors.vacancies))}
              />
            </Field>

            <Field id="bond" label="Bond" error={errors.bond} hint="Leave empty if there is none">
              <input
                id="bond"
                type="text"
                maxLength={100}
                value={form.bond}
                onChange={setField('bond')}
                placeholder="e.g. 1 year service agreement"
                className={controlClasses(Boolean(errors.bond))}
              />
            </Field>
          </div>
        </section>

        <section className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 space-y-4">
          <h3 className="font-semibold text-sm text-gray-900">Eligibility</h3>

          <div className="grid sm:grid-cols-2 gap-4">
            <Field id="minCgpa" label="Minimum CGPA" error={errors.minCgpa} hint="0.00 to 10.00">
              <input
                id="minCgpa"
                type="number"
                min="0"
                max="10"
                step="0.01"
                value={form.minCgpa}
                onChange={setField('minCgpa')}
                placeholder="7.5"
                className={controlClasses(Boolean(errors.minCgpa))}
              />
            </Field>

            <Field id="graduationYear" label="Graduation year" error={errors.graduationYear}>
              <input
                id="graduationYear"
                type="number"
                min="1950"
                max="2100"
                step="1"
                value={form.graduationYear}
                onChange={setField('graduationYear')}
                placeholder="2027"
                className={controlClasses(Boolean(errors.graduationYear))}
              />
            </Field>
          </div>

          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input
              id="backlogsAllowed"
              type="checkbox"
              checked={form.backlogsAllowed}
              onChange={setField('backlogsAllowed')}
              className="w-4 h-4 rounded border-gray-300"
            />
            Students with active backlogs may apply
          </label>

          <TagInput
            id="skills"
            label="Skills"
            placeholder="e.g. Java"
            maxLength={60}
            values={form.skills}
            error={errors.skills}
            onChange={setList('skills')}
          />

          <TagInput
            id="requirements"
            label="Requirements"
            placeholder="e.g. No active backlogs"
            maxLength={300}
            values={form.requirements}
            error={errors.requirements}
            onChange={setList('requirements')}
          />
        </section>

        <section className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 space-y-4">
          <h3 className="font-semibold text-sm text-gray-900">Publishing</h3>

          <div className="grid sm:grid-cols-2 gap-4">
            <Field id="applicationDeadline" label="Application deadline" required error={errors.applicationDeadline}>
              <input
                id="applicationDeadline"
                type="date"
                value={form.applicationDeadline}
                onChange={setField('applicationDeadline')}
                className={controlClasses(Boolean(errors.applicationDeadline))}
                aria-invalid={Boolean(errors.applicationDeadline)}
                aria-describedby={errors.applicationDeadline ? 'applicationDeadline-error' : undefined}
              />
            </Field>

            <Field id="status" label="Status" error={errors.status}>
              <select
                id="status"
                value={form.status}
                onChange={setField('status')}
                className={controlClasses(Boolean(errors.status))}
              >
                {JOB_STATUSES.map((s) => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
            </Field>
          </div>

          <label className="flex items-start gap-2 text-sm text-gray-700">
            <input
              id="notifyEligibleStudents"
              type="checkbox"
              checked={form.notifyEligibleStudents}
              onChange={setField('notifyEligibleStudents')}
              className="w-4 h-4 mt-0.5 rounded border-gray-300"
            />
            <span>
              Email eligible students when this drive goes live
              <span className="block text-xs text-gray-400 mt-0.5">
                Sent only while the status is Active, to students who meet the CGPA, backlog and batch criteria above.
                A saved draft is emailed once, when you later set it to Active.
              </span>
            </span>
          </label>
        </section>

        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={saving}
            className="bg-blue-600 text-white text-sm font-semibold px-5 py-2.5 rounded-lg hover:bg-blue-700 transition disabled:opacity-60 disabled:cursor-not-allowed inline-flex items-center gap-2"
          >
            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
            {isEdit ? 'Save changes' : 'Post job drive'}
          </button>
          <button
            type="button"
            onClick={() => navigate('/admin/jobs')}
            className="text-sm text-gray-600 px-4 py-2.5 rounded-lg border border-gray-300 hover:bg-gray-50"
          >
            Cancel
          </button>
        </div>
      </form>
    </main>
  );
}
