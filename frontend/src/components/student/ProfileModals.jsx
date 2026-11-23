import { useState } from 'react';
import { GraduationCap, User } from 'lucide-react';
import FormModal from './FormModal';
import { TextField, SelectField, ReadOnlyField } from './FormFields';
import { validatePersonal, validateAcademic, toNumberOrNull } from '../../utils/profileDraft';

/** Shown next to the fields only the placement cell can change. */
const ADMIN_MANAGED_HINT = 'Managed by the placement cell — contact them to correct it.';

const s = (v) => (v === null || v === undefined ? '' : String(v));
const trimOrNull = (v) => (s(v).trim() ? s(v).trim() : null);

/**
 * Edit the PERSONAL section of the draft (about is edited inline on the page). Admin-managed
 * values are shown read-only. Mount with a key so it starts from the current draft.
 */
export function PersonalDetailsModal({ personal, managed, onSave, onClose }) {
  const [form, setForm] = useState(() => ({
    fullName: s(personal?.fullName),
    phone: s(personal?.phone),
    address: s(personal?.address),
    githubUrl: s(personal?.githubUrl),
    linkedinUrl: s(personal?.linkedinUrl),
    portfolioUrl: s(personal?.portfolioUrl),
  }));
  const [errors, setErrors] = useState({});
  const set = (k) => (v) => {
    setForm((f) => ({ ...f, [k]: v }));
    if (errors[k]) setErrors((e) => ({ ...e, [k]: undefined }));
  };

  const submit = () => {
    const errs = validatePersonal(form);
    setErrors(errs);
    if (Object.keys(errs).length) return;
    onSave({
      ...personal,
      fullName: form.fullName.trim(),
      phone: trimOrNull(form.phone),
      address: trimOrNull(form.address),
      githubUrl: trimOrNull(form.githubUrl),
      linkedinUrl: trimOrNull(form.linkedinUrl),
      portfolioUrl: trimOrNull(form.portfolioUrl),
    });
  };

  return (
    <FormModal open title="Edit personal details" icon={User} onClose={onClose} onSubmit={submit} submitLabel="Update draft" size="max-w-2xl">
      <div className="grid sm:grid-cols-2 gap-4">
        <TextField label="Full name" required value={form.fullName} onChange={set('fullName')} error={errors.fullName} maxLength={120} autoComplete="name" />
        <ReadOnlyField label="Register number" value={managed.rollNo} />
        <ReadOnlyField label="Email address" value={managed.email} />
        <TextField label="Phone number" value={form.phone} onChange={set('phone')} error={errors.phone} placeholder="+91 98765 43210" autoComplete="tel" type="tel" />
      </div>
      <TextField label="Residential address" value={form.address} onChange={set('address')} error={errors.address} placeholder="City, State" maxLength={255} />
      <div className="grid sm:grid-cols-3 gap-4">
        <TextField label="GitHub URL" type="url" value={form.githubUrl} onChange={set('githubUrl')} error={errors.githubUrl} placeholder="https://github.com/…" />
        <TextField label="LinkedIn URL" type="url" value={form.linkedinUrl} onChange={set('linkedinUrl')} error={errors.linkedinUrl} placeholder="https://linkedin.com/in/…" />
        <TextField label="Portfolio URL" type="url" value={form.portfolioUrl} onChange={set('portfolioUrl')} error={errors.portfolioUrl} placeholder="https://" />
      </div>
      <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <ReadOnlyField label="Department" value={managed.department} />
          <ReadOnlyField label="Batch" value={managed.batch} />
          <ReadOnlyField label="Degree" value={managed.degree} />
        </div>
        <p className="text-[11px] text-gray-500 mt-3">Register number, email, department, batch and degree: {ADMIN_MANAGED_HINT}</p>
      </div>
    </FormModal>
  );
}

/** Edit the ACADEMIC section of the draft: CGPA, backlogs, semester. */
export function AcademicModal({ academic, managed, onSave, onClose }) {
  const [form, setForm] = useState(() => ({
    cgpa: s(academic?.cgpa),
    totalBacklogs: s(academic?.totalBacklogs),
    activeBacklogs: s(academic?.activeBacklogs),
    semester: s(academic?.semester),
  }));
  const [errors, setErrors] = useState({});
  const set = (k) => (v) => {
    setForm((f) => ({ ...f, [k]: v }));
    if (errors[k]) setErrors((e) => ({ ...e, [k]: undefined }));
  };

  const submit = () => {
    const errs = validateAcademic(form);
    setErrors(errs);
    if (Object.keys(errs).length) return;
    onSave({
      ...academic,
      cgpa: toNumberOrNull(form.cgpa),
      totalBacklogs: toNumberOrNull(form.totalBacklogs),
      activeBacklogs: toNumberOrNull(form.activeBacklogs),
      semester: toNumberOrNull(form.semester),
    });
  };

  return (
    <FormModal open title="Edit academic record" icon={GraduationCap} onClose={onClose} onSubmit={submit} submitLabel="Update draft">
      <div className="grid sm:grid-cols-2 gap-4">
        <TextField
          label="CGPA (0–10)"
          type="number"
          inputMode="decimal"
          step="0.01"
          min="0"
          max="10"
          value={form.cgpa}
          onChange={set('cgpa')}
          error={errors.cgpa}
          hint="Up to two decimal places, e.g. 8.25"
        />
        <SelectField
          label="Current semester"
          value={form.semester}
          onChange={set('semester')}
          error={errors.semester}
          placeholder="Select semester"
          options={[1, 2, 3, 4, 5, 6, 7, 8].map((n) => ({ value: String(n), label: `Semester ${n}` }))}
        />
        <TextField label="Total backlogs (history)" type="number" min="0" step="1" value={form.totalBacklogs} onChange={set('totalBacklogs')} error={errors.totalBacklogs} />
        <TextField label="Active backlogs" type="number" min="0" step="1" value={form.activeBacklogs} onChange={set('activeBacklogs')} error={errors.activeBacklogs} hint="Cannot exceed total backlogs." />
      </div>
      <p className="text-[11px] text-gray-500">
        Your advisor checks these against your marksheets — attach them under Supporting documents or Evidence.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <ReadOnlyField label="Department" value={managed.department} />
        <ReadOnlyField label="Batch" value={managed.batch} />
        <ReadOnlyField label="Degree" value={managed.degree} />
      </div>
      <p className="text-[11px] text-gray-500">{ADMIN_MANAGED_HINT}</p>
    </FormModal>
  );
}
