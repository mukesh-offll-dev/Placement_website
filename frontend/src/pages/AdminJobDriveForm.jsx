import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { ArrowLeft, Briefcase, Loader2, Plus, X, AlertCircle, Check, ImagePlus, Trash2 } from 'lucide-react';

import jobService from '../services/api/jobService';
import useDepartments from '../hooks/useDepartments';
import { toastSuccess, toastError, toastInfo } from '../utils/toast';
import {
  EMPLOYMENT_TYPES,
  JOB_STATUSES,
  LOGO_TYPES,
  MAX_LOGO_BYTES,
  MAX_PERKS,
  MAX_RESPONSIBILITIES,
  MAX_ROUNDS,
  MAX_REQUIREMENTS,
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

/** Card with a numbered heading, so the long form reads as clear steps. */
function Step({ number, title, subtitle, children }) {
  return (
    <section className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 space-y-4">
      <div className="flex items-start gap-3">
        <span className="w-6 h-6 rounded-full bg-blue-600 text-white text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
          {number}
        </span>
        <div>
          <h3 className="font-semibold text-gray-900 leading-tight">{title}</h3>
          {subtitle && <p className="text-xs text-gray-500 mt-0.5">{subtitle}</p>}
        </div>
      </div>
      {children}
    </section>
  );
}

/** Chip list for short items (skills). */
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
    <Field id={id} label={label} error={error} hint="Type a skill and press Enter or the + button.">
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
 * A list the officer builds row by row with "+ Add field": responsibilities, requirements, perks,
 * interview rounds. Blank rows are ignored when saving.
 */
function ListEditor({ id, label, hint, placeholder, maxLength, maxItems, values, error, onChange, numbered = false }) {
  const pendingFocus = useRef(false);

  useEffect(() => {
    if (pendingFocus.current) {
      pendingFocus.current = false;
      document.getElementById(`${id}-${values.length - 1}`)?.focus();
    }
  }, [id, values.length]);

  const add = () => {
    if (values.length >= maxItems) return;
    pendingFocus.current = true;
    onChange([...values, '']);
  };
  const update = (index, value) => onChange(values.map((v, i) => (i === index ? value : v)));
  const remove = (index) => onChange(values.filter((_, i) => i !== index));

  return (
    <div id={id} tabIndex={-1} className="outline-none">
      <div className="flex items-center justify-between gap-2 mb-1">
        <p className="text-sm font-medium text-gray-700">{label}</p>
        <button
          type="button"
          onClick={add}
          disabled={values.length >= maxItems}
          className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-800 disabled:opacity-40"
        >
          <Plus className="w-3.5 h-3.5" /> Add field
        </button>
      </div>
      {values.length === 0 ? (
        <button
          type="button"
          onClick={add}
          className="w-full text-left text-xs text-gray-400 border border-dashed border-gray-300 rounded-lg px-3 py-2.5 hover:border-blue-300 hover:text-blue-600"
        >
          {hint || `None yet. Click to add the first ${label.toLowerCase()} entry.`}
        </button>
      ) : (
        <ul className="space-y-2">
          {values.map((value, index) => (
            <li key={index} className="flex items-center gap-2">
              {numbered && (
                <span className="w-6 h-6 rounded-full bg-gray-100 text-gray-600 text-xs font-semibold flex items-center justify-center shrink-0">
                  {index + 1}
                </span>
              )}
              <input
                id={`${id}-${index}`}
                type="text"
                value={value}
                maxLength={maxLength}
                placeholder={placeholder}
                aria-label={`${label} ${index + 1}`}
                onChange={(e) => update(index, e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    // Enter adds the next row; it must not submit the whole form.
                    e.preventDefault();
                    if (value.trim()) add();
                  }
                }}
                className={controlClasses(Boolean(error))}
              />
              <button
                type="button"
                onClick={() => remove(index)}
                className="p-2 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 shrink-0"
                aria-label={`Remove ${label} ${index + 1}`}
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </li>
          ))}
        </ul>
      )}
      {error && (
        <p role="alert" className="text-xs text-red-600 mt-1 flex items-center gap-1">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" /> {error}
        </p>
      )}
    </div>
  );
}

/** Optional company logo: image only, 2 MB max, with a preview. Uploaded as soon as it is chosen. */
function LogoUploader({ currentUrl, form, setForm }) {
  const [uploading, setUploading] = useState(false);
  const [localPreview, setLocalPreview] = useState(null);
  const [problem, setProblem] = useState('');

  useEffect(() => () => localPreview && URL.revokeObjectURL(localPreview), [localPreview]);

  const shown = form.removeLogo ? null : localPreview || form.companyLogoUrl || currentUrl || null;

  const choose = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (!LOGO_TYPES.includes(file.type)) {
      setProblem('Choose a PNG, JPG or WebP image.');
      return;
    }
    if (file.size > MAX_LOGO_BYTES) {
      setProblem('The logo must be 2 MB or smaller.');
      return;
    }
    setProblem('');
    setUploading(true);
    setLocalPreview(URL.createObjectURL(file));
    try {
      const uploaded = await jobService.uploadCompanyLogo(file);
      if (!uploaded?.logoUrl) throw new Error('The server did not return the logo.');
      setForm((prev) => ({ ...prev, companyLogoUrl: uploaded.logoUrl, removeLogo: false }));
      toastSuccess('Logo uploaded. It is saved with the drive.');
    } catch (err) {
      setLocalPreview(null);
      setProblem(err?.message || 'Could not upload the logo.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div>
      <p className="text-sm font-medium text-gray-700 mb-1">Company logo <span className="text-gray-400 font-normal">(optional)</span></p>
      <div className="flex items-center gap-3">
        <div className="w-16 h-16 rounded-xl border border-gray-200 bg-gray-50 flex items-center justify-center overflow-hidden shrink-0">
          {uploading ? (
            <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />
          ) : shown ? (
            <img src={shown} alt="Company logo preview" className="w-full h-full object-contain bg-white" />
          ) : (
            <ImagePlus className="w-6 h-6 text-gray-300" />
          )}
        </div>
        <div className="space-y-1.5">
          <div className="flex flex-wrap gap-2">
            <label className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-lg border border-gray-300 hover:bg-gray-50 cursor-pointer">
              <ImagePlus className="w-3.5 h-3.5" /> {shown ? 'Change logo' : 'Upload logo'}
              <input type="file" accept="image/png,image/jpeg,image/webp" className="sr-only" onChange={choose} disabled={uploading} />
            </label>
            {shown && (
              <button
                type="button"
                onClick={() => {
                  setLocalPreview(null);
                  setForm((prev) => ({ ...prev, companyLogoUrl: '', removeLogo: true }));
                }}
                className="text-xs font-semibold px-3 py-2 rounded-lg text-red-600 hover:bg-red-50"
              >
                Remove
              </button>
            )}
          </div>
          <p className="text-[11px] text-gray-400">PNG, JPG or WebP, up to 2 MB. Shown to students on this company&apos;s drives.</p>
        </div>
      </div>
      {problem && (
        <p role="alert" className="text-xs text-red-600 mt-1.5 flex items-center gap-1">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" /> {problem}
        </p>
      )}
    </div>
  );
}

/** Toggle chip used by the department picker. */
function ChoiceChip({ label, title, selected, onToggle }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={selected}
      title={title}
      className={`inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full border transition-colors ${
        selected
          ? 'bg-blue-600 border-blue-600 text-white'
          : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
      }`}
    >
      {selected && <Check className="w-3 h-3" />}
      {label}
    </button>
  );
}

const normalizeName = (name) => String(name ?? '').trim().toLowerCase();

const sortCompanies = (list) =>
  [...list].sort((a, b) => String(a.name ?? '').localeCompare(String(b.name ?? ''), undefined, { sensitivity: 'base' }));

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
  const { active: activeDepartments, loading: departmentsLoading, error: departmentsError } = useDepartments();

  const selectCompany = (company) => {
    // A different company has its own logo: drop any logo picked for the previous one.
    setForm((prev) => ({ ...prev, companyId: String(company.id), companyLogoUrl: '', removeLogo: false }));
    setErrors((prev) => ({ ...prev, companyId: undefined }));
    setNewCompany('');
    setAddingCompany(false);
  };

  /** Adds the recruiter and selects it, so the drive can be posted in one pass. */
  const handleAddCompany = async () => {
    const name = newCompany.trim();
    if (!name || savingCompany) return;

    // Already on file (names are unique case-insensitively): just pick it.
    const existing = companies.find((c) => normalizeName(c.name) === normalizeName(name));
    if (existing) {
      selectCompany(existing);
      toastInfo(`${existing.name} is already on file and has been selected.`);
      return;
    }

    setSavingCompany(true);
    try {
      // The backend answers 200 with the existing company when the name is taken
      // (e.g. someone else added it meanwhile), 201 with a new one otherwise.
      const created = await jobService.createCompany({ name });
      if (!created || created.id == null) {
        throw new Error('The server did not return the company.');
      }
      const alreadyListed = companies.some(
        (c) => String(c.id) === String(created.id) || normalizeName(c.name) === normalizeName(created.name)
      );
      setCompanies((prev) =>
        prev.some((c) => String(c.id) === String(created.id))
          ? prev
          : sortCompanies([...prev, created])
      );
      selectCompany(created);
      toastSuccess(alreadyListed ? `${created.name} selected.` : `${created.name} added.`);
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
  const selectedCompany = useMemo(
    () => companies.find((c) => String(c.id) === String(form.companyId)) || null,
    [companies, form.companyId]
  );

  const toggleListValue = (field, value) => {
    setForm((prev) => {
      const current = Array.isArray(prev[field]) ? prev[field] : [];
      const exists = current.some((v) => normalizeName(v) === normalizeName(value));
      return {
        ...prev,
        [field]: exists
          ? current.filter((v) => normalizeName(v) !== normalizeName(value))
          : [...current, value],
      };
    });
    setErrors((prev) => (prev[field] ? { ...prev, [field]: undefined } : prev));
  };

  // Department codes already on the drive that are no longer active still show, so editing
  // an old drive does not silently drop them.
  const departmentChoices = useMemo(() => {
    const choices = activeDepartments.map((d) => ({ code: d.code, name: d.name }));
    form.eligibleDepartments.forEach((code) => {
      if (!choices.some((c) => normalizeName(c.code) === normalizeName(code))) {
        choices.push({ code, name: `${code} (inactive)` });
      }
    });
    return choices;
  }, [activeDepartments, form.eligibleDepartments]);

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
            ? 'Job drive posted. Eligible students are being notified.'
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
      <Link to="/admin/jobs" className="inline-flex items-center gap-1.5 text-blue-600 text-sm hover:underline mb-4">
        <ArrowLeft className="w-4 h-4" /> Back to Job Drives
      </Link>

      <div className="flex items-center gap-2 mb-1">
        <Briefcase className="w-6 h-6 text-blue-600" />
        <h2 className="text-2xl font-bold text-gray-900">
          {isEdit ? 'Edit job drive' : 'Post a new job drive'}
        </h2>
      </div>
      <p className="text-gray-500 text-sm mb-5">
        {isEdit ? 'Update the details students see.' : 'Fill in the role, package and eligibility. Students who qualify are notified when it goes live.'}
        {' '}Fields marked <span className="text-red-600">*</span> are required.
      </p>

      {loadError && (
        <div role="alert" className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg p-3 mb-5">
          {loadError}
        </div>
      )}

      <form onSubmit={handleSubmit} noValidate className="max-w-6xl">
        <div className="grid lg:grid-cols-2 gap-5 items-start">
          {/* Left column: who and what */}
          <div className="space-y-5">
            <Step number={1} title="Role details" subtitle="Company, position and what it involves">
              <Field
                id="companyId"
                label="Company"
                required
                error={errors.companyId}
                hint={companyOptions.length === 0 ? 'No companies on file yet. Add the recruiter below.' : undefined}
              >
                <div className="flex gap-2">
                  <select
                    id="companyId"
                    value={form.companyId}
                    onChange={(e) => {
                      const company = companies.find((c) => String(c.id) === e.target.value);
                      if (company) selectCompany(company);
                      else setForm((prev) => ({ ...prev, companyId: '', companyLogoUrl: '', removeLogo: false }));
                    }}
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

              {form.companyId && (
                <LogoUploader currentUrl={selectedCompany?.logoUrl || null} form={form} setForm={setForm} />
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
                  rows={4}
                  maxLength={4000}
                  value={form.jobDescription}
                  onChange={setField('jobDescription')}
                  placeholder="What the role involves and the team students will join"
                  className={controlClasses(Boolean(errors.jobDescription))}
                />
              </Field>
            </Step>

            <Step number={2} title="Package and openings" subtitle="What students will earn and how many are needed">
              <div className="grid sm:grid-cols-2 gap-4">
                <Field id="ctcValue" label="CTC per year (₹)" required error={errors.ctcValue} hint="Enter rupees, e.g. 1200000 for 12 LPA">
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

                <Field id="ctcText" label="CTC label" error={errors.ctcText} hint="Optional. Left empty it is worked out for you, e.g. 12 LPA">
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
            </Step>

            <Step number={3} title="Who can apply" subtitle="Students who do not meet these cannot apply">
              <div className="grid sm:grid-cols-2 gap-4">
                <Field id="minCgpa" label="Minimum CGPA" required error={errors.minCgpa} hint="0 to 10. Use 0 for no cut-off">
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

                <Field id="graduationYear" label="Graduation year" error={errors.graduationYear} hint="Optional">
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

              <div>
                <p className="block text-sm font-medium text-gray-700 mb-1" id="eligibleDepartments-label">
                  Eligible departments
                </p>
                <div
                  id="eligibleDepartments"
                  tabIndex={-1}
                  role="group"
                  aria-labelledby="eligibleDepartments-label"
                  className="flex flex-wrap gap-2"
                >
                  {departmentsLoading ? (
                    <span className="text-xs text-gray-400 inline-flex items-center gap-1">
                      <Loader2 className="w-3 h-3 animate-spin" /> Loading departments…
                    </span>
                  ) : departmentChoices.length === 0 ? (
                    <span className="text-xs text-gray-400">
                      {departmentsError || 'No departments set up yet.'}
                    </span>
                  ) : (
                    departmentChoices.map((d) => (
                      <ChoiceChip
                        key={d.code}
                        label={d.code}
                        title={d.name}
                        selected={form.eligibleDepartments.some((v) => normalizeName(v) === normalizeName(d.code))}
                        onToggle={() => toggleListValue('eligibleDepartments', d.code)}
                      />
                    ))
                  )}
                </div>
                {errors.eligibleDepartments ? (
                  <p id="eligibleDepartments-error" role="alert" className="text-xs text-red-600 mt-1 flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    {errors.eligibleDepartments}
                  </p>
                ) : (
                  <p className="text-xs text-gray-400 mt-1">
                    {form.eligibleDepartments.length === 0
                      ? 'None selected: open to every department.'
                      : `Only ${form.eligibleDepartments.join(', ')} students can apply.`}
                  </p>
                )}
              </div>
            </Step>
          </div>

          {/* Right column: details, process, publishing */}
          <div className="space-y-5">
            <Step number={4} title="What students should know" subtitle="Add as many rows as you need with + Add field">
              <ListEditor
                id="responsibilities"
                label="Responsibilities"
                placeholder="e.g. Build and test REST APIs"
                maxLength={300}
                maxItems={MAX_RESPONSIBILITIES}
                values={form.responsibilities}
                error={errors.responsibilities}
                onChange={setList('responsibilities')}
              />

              <TagInput
                id="skills"
                label="Skills"
                placeholder="e.g. Java"
                maxLength={60}
                values={form.skills}
                error={errors.skills}
                onChange={setList('skills')}
              />

              <ListEditor
                id="requirements"
                label="Requirements"
                placeholder="e.g. No active backlogs"
                maxLength={300}
                maxItems={MAX_REQUIREMENTS}
                values={form.requirements}
                error={errors.requirements}
                onChange={setList('requirements')}
              />

              <ListEditor
                id="perks"
                label="Perks and benefits"
                placeholder="e.g. Health insurance"
                maxLength={150}
                maxItems={MAX_PERKS}
                values={form.perks}
                error={errors.perks}
                onChange={setList('perks')}
              />
            </Step>

            <Step number={5} title="Selection process" subtitle="The rounds students will go through, in order">
              <ListEditor
                id="selectionRounds"
                label="Rounds"
                hint="None yet. Add rounds such as Online test, Technical interview, HR."
                placeholder="e.g. Technical interview"
                maxLength={120}
                maxItems={MAX_ROUNDS}
                values={form.selectionRounds}
                error={errors.selectionRounds}
                onChange={setList('selectionRounds')}
                numbered
              />
            </Step>

            <Step number={6} title="Publishing" subtitle="When applications close and who is told">
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
                  Notify eligible students when this drive goes live (in-app and email)
                  <span className="block text-xs text-gray-400 mt-0.5">
                    Sent only while the status is Active, to students who meet the CGPA, backlog, batch and department rules above.
                  </span>
                </span>
              </label>
            </Step>
          </div>
        </div>

        <div className="sticky bottom-0 -mx-4 md:-mx-8 mt-6 px-4 md:px-8 py-3 bg-white/95 backdrop-blur border-t border-gray-200 flex items-center gap-3">
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
