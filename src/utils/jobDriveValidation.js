/**
 * Validation for the admin job drive form.
 *
 * These rules mirror JobRequest on the backend field for field. The server is
 * still the authority — this only means a mistake is caught before a round trip,
 * and the message appears next to the field instead of as one banner. When a
 * rule changes in JobRequest.java, change it here too.
 */

export const EMPLOYMENT_TYPES = [
  { value: 'FULL_TIME', label: 'Full time' },
  { value: 'PART_TIME', label: 'Part time' },
  { value: 'INTERNSHIP', label: 'Internship' },
  { value: 'CONTRACT', label: 'Contract' },
];

export const JOB_STATUSES = [
  { value: 'DRAFT', label: 'Draft — not visible to students' },
  { value: 'ACTIVE', label: 'Active — open for applications' },
  { value: 'CLOSING_SOON', label: 'Closing soon' },
  { value: 'CLOSED', label: 'Closed' },
];

export const MAX_SKILLS = 50;
export const MAX_REQUIREMENTS = 50;

export const emptyJobDrive = () => ({
  companyId: '',
  jobRole: '',
  jobDescription: '',
  jobType: 'FULL_TIME',
  location: '',
  ctcText: '',
  ctcValue: '',
  vacancies: '',
  bond: '',
  minCgpa: '',
  backlogsAllowed: false,
  graduationYear: '',
  applicationDeadline: '',
  status: 'DRAFT',
  skills: [],
  requirements: [],
});

const isBlank = (value) => value == null || String(value).trim() === '';

/** Today at midnight, so a deadline of today is still in the future. */
const startOfToday = () => {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return now;
};

/**
 * Parses a decimal field. Returns { ok, value } so "not a number" is told apart
 * from a legitimately absent optional field.
 */
const parseDecimal = (raw) => {
  if (isBlank(raw)) return { ok: true, value: null };
  const value = Number(String(raw).trim());
  if (!Number.isFinite(value)) return { ok: false, value: null };
  return { ok: true, value };
};

const decimalPlaces = (raw) => {
  const [, fraction = ''] = String(raw).trim().split('.');
  return fraction.length;
};

/**
 * Validates the form state.
 *
 * @param {Object} form - the shape emptyJobDrive() returns
 * @returns {Object} field name -> message, empty when the form is valid
 */
export function validateJobDrive(form = {}) {
  const errors = {};

  if (isBlank(form.companyId)) {
    errors.companyId = 'Select the company running this drive';
  }

  if (isBlank(form.jobRole)) {
    errors.jobRole = 'Job role is required';
  } else if (form.jobRole.trim().length > 150) {
    errors.jobRole = 'Job role cannot exceed 150 characters';
  }

  if (!isBlank(form.jobDescription) && form.jobDescription.trim().length > 4000) {
    errors.jobDescription = 'Description cannot exceed 4000 characters';
  }

  if (isBlank(form.jobType)) {
    errors.jobType = 'Job type is required';
  } else if (!EMPLOYMENT_TYPES.some((t) => t.value === form.jobType)) {
    errors.jobType = 'Choose a valid job type';
  }

  if (!isBlank(form.location) && form.location.trim().length > 120) {
    errors.location = 'Location cannot exceed 120 characters';
  }

  if (!isBlank(form.ctcText) && form.ctcText.trim().length > 30) {
    errors.ctcText = 'Keep the CTC label under 30 characters, e.g. "12 LPA"';
  }

  const ctc = parseDecimal(form.ctcValue);
  if (!ctc.ok) {
    errors.ctcValue = 'Enter the CTC as a number, e.g. 1200000';
  } else if (ctc.value !== null) {
    if (ctc.value < 0) {
      errors.ctcValue = 'CTC cannot be negative';
    } else if (decimalPlaces(form.ctcValue) > 2) {
      errors.ctcValue = 'CTC can have at most 2 decimal places';
    } else if (Math.trunc(ctc.value).toString().length > 10) {
      errors.ctcValue = 'CTC is unrealistically large';
    }
  }

  if (!isBlank(form.vacancies)) {
    const vacancies = Number(form.vacancies);
    if (!Number.isInteger(vacancies)) {
      errors.vacancies = 'Vacancies must be a whole number';
    } else if (vacancies < 1) {
      errors.vacancies = 'There must be at least one vacancy';
    }
  }

  if (!isBlank(form.bond) && form.bond.trim().length > 100) {
    errors.bond = 'Bond details cannot exceed 100 characters';
  }

  const cgpa = parseDecimal(form.minCgpa);
  if (!cgpa.ok) {
    errors.minCgpa = 'Enter the minimum CGPA as a number, e.g. 7.5';
  } else if (cgpa.value !== null) {
    if (cgpa.value < 0) {
      errors.minCgpa = 'CGPA cannot be negative';
    } else if (cgpa.value > 10) {
      errors.minCgpa = 'CGPA cannot exceed 10.00';
    } else if (decimalPlaces(form.minCgpa) > 2) {
      errors.minCgpa = 'CGPA can have at most 2 decimal places';
    }
  }

  if (!isBlank(form.graduationYear)) {
    const year = Number(form.graduationYear);
    if (!Number.isInteger(year)) {
      errors.graduationYear = 'Graduation year must be a whole number';
    } else if (year < 1950 || year > 2100) {
      errors.graduationYear = 'Enter a graduation year between 1950 and 2100';
    }
  }

  if (isBlank(form.applicationDeadline)) {
    errors.applicationDeadline = 'Application deadline is required';
  } else {
    const deadline = new Date(`${form.applicationDeadline}T00:00:00`);
    if (Number.isNaN(deadline.getTime())) {
      errors.applicationDeadline = 'Enter a valid date';
    } else if (deadline < startOfToday()) {
      // Not a backend rule, but a drive that closed before it opened helps nobody.
      errors.applicationDeadline = 'Deadline cannot be in the past';
    }
  }

  if (!isBlank(form.status) && !JOB_STATUSES.some((s) => s.value === form.status)) {
    errors.status = 'Choose a valid status';
  }

  const skills = Array.isArray(form.skills) ? form.skills : [];
  if (skills.length > MAX_SKILLS) {
    errors.skills = `A drive cannot list more than ${MAX_SKILLS} skills`;
  } else if (skills.some((s) => isBlank(s))) {
    errors.skills = 'Remove the blank skill entries';
  } else if (skills.some((s) => s.trim().length > 60)) {
    errors.skills = 'Each skill must be 60 characters or fewer';
  }

  const requirements = Array.isArray(form.requirements) ? form.requirements : [];
  if (requirements.length > MAX_REQUIREMENTS) {
    errors.requirements = `A drive cannot list more than ${MAX_REQUIREMENTS} requirements`;
  } else if (requirements.some((r) => isBlank(r))) {
    errors.requirements = 'Remove the blank requirement entries';
  } else if (requirements.some((r) => r.trim().length > 300)) {
    errors.requirements = 'Each requirement must be 300 characters or fewer';
  }

  return errors;
}

/**
 * Converts form state into a JobRequest body.
 *
 * Inputs hold "" for untouched fields; sending that for a number or an enum is a
 * 400 from the backend, so optional blanks become null and numeric strings become
 * numbers.
 */
export function buildJobPayload(form) {
  const text = (value) => (isBlank(value) ? null : String(value).trim());
  const number = (value) => (isBlank(value) ? null : Number(String(value).trim()));

  return {
    companyId: number(form.companyId),
    jobRole: text(form.jobRole),
    jobDescription: text(form.jobDescription),
    jobType: form.jobType,
    location: text(form.location),
    ctcText: text(form.ctcText),
    ctcValue: number(form.ctcValue),
    vacancies: number(form.vacancies),
    bond: text(form.bond),
    minCgpa: number(form.minCgpa),
    backlogsAllowed: Boolean(form.backlogsAllowed),
    graduationYear: number(form.graduationYear),
    applicationDeadline: text(form.applicationDeadline),
    status: form.status || 'DRAFT',
    skills: (form.skills || []).map((s) => s.trim()).filter(Boolean),
    requirements: (form.requirements || []).map((r) => r.trim()).filter(Boolean),
  };
}

/** Maps a JobResponse back onto the form shape, for the edit screen. */
export function jobResponseToForm(job) {
  if (!job) return emptyJobDrive();
  return {
    ...emptyJobDrive(),
    companyId: job.company?.id != null ? String(job.company.id) : '',
    jobRole: job.jobRole ?? '',
    jobDescription: job.jobDescription ?? '',
    jobType: job.jobType ?? 'FULL_TIME',
    location: job.location ?? '',
    ctcText: job.ctcText ?? '',
    ctcValue: job.ctcValue != null ? String(job.ctcValue) : '',
    vacancies: job.vacancies != null ? String(job.vacancies) : '',
    bond: job.bond ?? '',
    minCgpa: job.minCgpa != null ? String(job.minCgpa) : '',
    backlogsAllowed: Boolean(job.backlogsAllowed),
    graduationYear: job.graduationYear != null ? String(job.graduationYear) : '',
    applicationDeadline: job.applicationDeadline ?? '',
    status: job.status ?? 'DRAFT',
    skills: Array.isArray(job.skills) ? [...job.skills] : [],
    requirements: Array.isArray(job.requirements) ? [...job.requirements] : [],
  };
}
