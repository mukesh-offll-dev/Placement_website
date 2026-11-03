/**
 * Validation and formatting for student management and first-login setup.
 *
 * These mirror the backend rules (StudentIdentity, StudentSetupRequest) so a form can say what is
 * wrong before a request is sent. The backend enforces every rule again; nothing here is a security
 * boundary.
 */

export const MAX_BULK = 100;
// Departments are not listed here: they come from the backend (see useDepartments), so a department
// an admin adds appears in every form without a code change.
const DEPARTMENT_CODE = /^[A-Za-z][A-Za-z0-9]{1,9}$/;

export const REGISTER_NUMBER_LENGTH = 12;
const REGISTER_NUMBER = /^\d{12}$/;
const TRAILING_DIGITS = /^(.*?)(\d+)$/;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE = /^\+?[0-9 ()-]{10,20}$/;
const PLACEHOLDER_DOMAIN = '@pending.gces.local';
const COURSE_YEARS = 4;

/** Trimmed and uppercase, the form the backend stores. */
export const normalizeRegisterNumber = (value) => String(value ?? '').trim().toUpperCase();

/** Keeps only digits (at most 12), for register number inputs: typing or pasting a letter is dropped. */
export const digitsOnly = (value) => String(value ?? '').replace(/\D/g, '').slice(0, REGISTER_NUMBER_LENGTH);

/** Returns an error message, or '' when the register number is acceptable. */
export const registerNumberError = (value) => {
  const rn = normalizeRegisterNumber(value);
  if (!rn) return 'Register number is required';
  if (!REGISTER_NUMBER.test(rn)) return 'Register number must be exactly 12 digits, for example 830123104032';
  return '';
};

export const batchForYear = (year) => (year ? `${Number(year) - COURSE_YEARS}-${Number(year)}` : '');

/** The graduation year of a batch such as "2022-2026", or '' when there is none. */
export const yearFromBatch = (batch) => {
  const match = /(\d{4})\s*$/.exec(String(batch ?? ''));
  return match ? match[1] : '';
};

const yearError = (year) => {
  const n = Number(year);
  if (!year && year !== 0) return 'Year is required';
  if (!Number.isInteger(n) || n < 2000 || n > 2100) return 'Year must be between 2000 and 2100';
  return '';
};

/**
 * Every register number from `from` to `to`, or an error string. Same rules as the backend:
 * same prefix and digit length, forwards, and at most MAX_BULK.
 * @returns {{ numbers: string[], error: string }}
 */
export const expandRegisterRange = (from, to) => {
  const start = normalizeRegisterNumber(from);
  const end = normalizeRegisterNumber(to);
  if (!start || !end) return { numbers: [], error: '' };

  const startError = registerNumberError(start);
  if (startError) return { numbers: [], error: `'From': ${startError}` };
  const endError = registerNumberError(end);
  if (endError) return { numbers: [], error: `'To': ${endError}` };

  const a = TRAILING_DIGITS.exec(start);
  const b = TRAILING_DIGITS.exec(end);
  if (!a || !b) return { numbers: [], error: 'Register numbers must end in digits so a range can be generated' };
  if (a[1] !== b[1] || a[2].length !== b[2].length) {
    return { numbers: [], error: 'Both register numbers must match except for the final digits (same prefix and length)' };
  }
  if (a[2].length > 15) return { numbers: [], error: 'The numeric part is too long for a range' };

  const first = Number(a[2]);
  const last = Number(b[2]);
  if (first > last) return { numbers: [], error: "'From' must not be after 'To'" };
  if (last - first + 1 > MAX_BULK) return { numbers: [], error: `A range can create at most ${MAX_BULK} students at a time` };

  const numbers = [];
  for (let n = first; n <= last; n += 1) numbers.push(a[1] + String(n).padStart(a[2].length, '0'));
  return { numbers, error: '' };
};

/** A new department: a short unique code and a readable name. */
export const validateDepartmentForm = (form, existing = []) => {
  const errors = {};
  const code = String(form.code ?? '').trim();
  const name = String(form.name ?? '').trim();

  if (!code) errors.code = 'Code is required';
  else if (!DEPARTMENT_CODE.test(code)) errors.code = '2 to 10 letters or digits, starting with a letter';
  else if (existing.some((d) => d.code.toUpperCase() === code.toUpperCase())) errors.code = `${code.toUpperCase()} already exists`;

  if (!name) errors.name = 'Name is required';
  else if (name.length < 3) errors.name = 'Name must be at least 3 characters';
  else if (name.length > 100) errors.name = 'Name cannot exceed 100 characters';
  else if (existing.some((d) => d.name.toLowerCase() === name.toLowerCase() && d.id !== form.id)) errors.name = 'A department with this name already exists';
  return errors;
};

/** Errors keyed by field; an empty object means the form can be sent. */
export const validateProvisionForm = (form) => {
  const errors = {};
  const rn = registerNumberError(form.registerNumber);
  if (rn) errors.registerNumber = rn;
  if (!String(form.department ?? '').trim()) errors.department = 'Select a department';
  const year = yearError(form.year);
  if (year) errors.year = year;
  return errors;
};

export const validateBulkForm = (form) => {
  const errors = {};
  if (!normalizeRegisterNumber(form.registerNumberFrom)) errors.registerNumberFrom = 'Required';
  if (!normalizeRegisterNumber(form.registerNumberTo)) errors.registerNumberTo = 'Required';
  if (!errors.registerNumberFrom && !errors.registerNumberTo) {
    const { error } = expandRegisterRange(form.registerNumberFrom, form.registerNumberTo);
    if (error) errors.registerNumberTo = error;
  }
  if (!String(form.department ?? '').trim()) errors.department = 'Select a department';
  const year = yearError(form.year);
  if (year) errors.year = year;
  return errors;
};

/** Password rules as a checklist, so the setup form can show which are met. */
export const passwordChecks = (password, registerNumber = '') => [
  { id: 'length', label: 'At least 8 characters', ok: password.length >= 8 },
  { id: 'upper', label: 'An uppercase letter', ok: /[A-Z]/.test(password) },
  { id: 'lower', label: 'A lowercase letter', ok: /[a-z]/.test(password) },
  { id: 'digit', label: 'A digit', ok: /\d/.test(password) },
  {
    id: 'different',
    label: 'Not your register number',
    ok: !registerNumber || password.toLowerCase() !== String(registerNumber).toLowerCase(),
  },
];

export const validateSetupForm = (form, registerNumber = '') => {
  const errors = {};
  if (!form.fullName.trim()) errors.fullName = 'Full name is required';
  else if (form.fullName.trim().length > 120) errors.fullName = 'Name cannot exceed 120 characters';

  const email = form.email.trim();
  if (!email) errors.email = 'Email is required';
  else if (!EMAIL.test(email)) errors.email = 'Enter a valid email address';
  else if (email.toLowerCase().endsWith(PLACEHOLDER_DOMAIN)) errors.email = 'Enter your own email address';

  const phone = form.phone.trim();
  if (!phone) errors.phone = 'Phone number is required';
  else if (!PHONE.test(phone)) errors.phone = 'Enter a valid phone number (10 to 20 digits)';

  if (!form.newPassword) errors.newPassword = 'New password is required';
  else if (passwordChecks(form.newPassword, registerNumber).some((c) => !c.ok)) {
    errors.newPassword = 'The password does not meet all the rules below';
  } else if (new TextEncoder().encode(form.newPassword).length > 72) {
    errors.newPassword = 'Password cannot be longer than 72 bytes';
  }

  if (!form.confirmPassword) errors.confirmPassword = 'Confirm your new password';
  else if (form.confirmPassword !== form.newPassword) errors.confirmPassword = 'Passwords do not match';
  return errors;
};

const decimalError = (value, label, min, max, maxDecimals = 2) => {
  if (value === '' || value == null) return '';
  const text = String(value).trim();
  if (!/^-?\d+(\.\d+)?$/.test(text)) return `${label} must be a number`;
  const n = Number(text);
  if (n < min || n > max) return `${label} must be between ${min} and ${max}`;
  const decimals = (text.split('.')[1] || '').length;
  if (decimals > maxDecimals) return `${label} can have at most ${maxDecimals} decimal places`;
  return '';
};

const countError = (value, label) => {
  if (value === '' || value == null) return '';
  const text = String(value).trim();
  if (!/^\d+$/.test(text)) return `${label} must be a whole number`;
  return '';
};

/** Admin edit of a student's profile. */
export const validateStudentEditForm = (form) => {
  const errors = {};
  if (!String(form.fullName ?? '').trim()) errors.fullName = 'Name is required';
  else if (form.fullName.trim().length > 120) errors.fullName = 'Name cannot exceed 120 characters';

  const email = String(form.email ?? '').trim();
  if (email) {
    if (!EMAIL.test(email)) errors.email = 'Enter a valid email address';
    else if (email.toLowerCase().endsWith(PLACEHOLDER_DOMAIN)) errors.email = "Enter the student's real email address";
  }

  if (!String(form.department ?? '').trim()) errors.department = 'Select a department';
  if (form.year !== '' && form.year != null) {
    const err = yearError(form.year);
    if (err) errors.year = err;
  }

  const cgpa = decimalError(form.cgpa, 'CGPA', 0, 10);
  if (cgpa) errors.cgpa = cgpa;
  const total = countError(form.totalBacklogs, 'Total backlogs');
  if (total) errors.totalBacklogs = total;
  const active = countError(form.activeBacklogs, 'Active backlogs');
  if (active) errors.activeBacklogs = active;
  if (!total && !active && form.totalBacklogs !== '' && form.activeBacklogs !== ''
    && Number(form.activeBacklogs) > Number(form.totalBacklogs)) {
    errors.activeBacklogs = 'Active backlogs cannot be more than total backlogs';
  }

  const ctc = decimalError(form.placedCtc, 'Package', 0, 1e9);
  if (ctc) errors.placedCtc = ctc;
  if (form.placementStatus === 'PLACED' && !form.placedCompanyId) errors.placedCompanyId = 'Choose the company';

  const skills = parseSkills(form.skills);
  if (skills.some((s) => s.length > 60)) errors.skills = 'Each skill can be at most 60 characters';
  if (skills.length > 50) errors.skills = 'At most 50 skills';
  return errors;
};

/** "Java, React ,, SQL" becomes ["Java", "React", "SQL"]. */
export const parseSkills = (text) =>
  Array.from(new Set(String(text ?? '').split(',').map((s) => s.trim()).filter(Boolean)));

/** The request body for an admin edit: blanks become null so the backend leaves those fields alone. */
export const buildStudentEditPayload = (form) => {
  const text = (v) => (String(v ?? '').trim() === '' ? undefined : String(v).trim());
  const number = (v) => (String(v ?? '').trim() === '' ? undefined : Number(v));
  const payload = {
    fullName: text(form.fullName),
    email: text(form.email),
    department: text(form.department),
    cgpa: number(form.cgpa),
    totalBacklogs: number(form.totalBacklogs),
    activeBacklogs: number(form.activeBacklogs),
    placementStatus: form.placementStatus || undefined,
    placedCompanyId: form.placedCompanyId ? Number(form.placedCompanyId) : undefined,
    placedCtc: number(form.placedCtc),
    skills: parseSkills(form.skills),
  };
  if (form.year) payload.year = Number(form.year);
  return payload;
};
