/**
 * Pure helpers for the student profile DRAFT (the versions model in the upgrade spec, §3).
 *
 * A student never edits the official profile directly: they edit a ProfileData draft, save it
 * (PUT /student/profile/draft) and submit it for verification. These helpers normalise the
 * draft the server returns, compare it section by section with the official (verified)
 * profile, and validate it with the same rules the backend enforces, so most mistakes are
 * caught before a request is made.
 *
 * No React, no network: everything here runs under `node --test`.
 */

/** Section keys exactly as the backend reports them in changedSections / sectionComments. */
export const SECTION_KEYS = [
  'PERSONAL',
  'ACADEMIC',
  'SKILLS',
  'EDUCATION',
  'EXPERIENCE',
  'PROJECTS',
  'CERTIFICATIONS',
  'ACHIEVEMENTS',
  'RESUME',
  'DOCUMENTS',
];

/** ProfileData property holding each section. */
export const SECTION_FIELDS = {
  PERSONAL: 'personal',
  ACADEMIC: 'academic',
  SKILLS: 'skills',
  EDUCATION: 'education',
  EXPERIENCE: 'experience',
  PROJECTS: 'projects',
  CERTIFICATIONS: 'certifications',
  ACHIEVEMENTS: 'achievements',
  RESUME: 'resume',
  DOCUMENTS: 'documents',
};

export const SECTION_LABELS = {
  PERSONAL: 'Personal details',
  ACADEMIC: 'Academic record',
  SKILLS: 'Skills',
  EDUCATION: 'Education',
  EXPERIENCE: 'Internships & experience',
  PROJECTS: 'Projects',
  CERTIFICATIONS: 'Certifications',
  ACHIEVEMENTS: 'Achievements',
  RESUME: 'Resume',
  DOCUMENTS: 'Supporting documents',
  EVIDENCE: 'Evidence',
};

export const sectionLabel = (key) =>
  SECTION_LABELS[String(key || '').toUpperCase()] ||
  String(key || '')
    .toLowerCase()
    .replace(/_/g, ' ')
    .replace(/^\w/, (c) => c.toUpperCase());

export const MAX_ITEMS = 50;
export const SKILL_PROFICIENCIES = ['BEGINNER', 'INTERMEDIATE', 'ADVANCED'];
export const EXPERIENCE_TYPES = ['INTERNSHIP', 'FULL_TIME', 'PART_TIME', 'FREELANCE'];
export const DOCUMENT_TYPES = ['MARKSHEET', 'CERTIFICATE', 'ID_PROOF', 'OTHER'];

export const EMPTY_PERSONAL = {
  fullName: '',
  phone: '',
  address: '',
  about: '',
  avatarUrl: null,
  githubUrl: '',
  linkedinUrl: '',
  portfolioUrl: '',
};

export const EMPTY_ACADEMIC = {
  cgpa: null,
  totalBacklogs: null,
  activeBacklogs: null,
  semester: null,
};

export const EMPTY_RESUME = { resumeUrl: null, fileName: null };

const isPlainObject = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
const asArray = (v) => (Array.isArray(v) ? v.filter((item) => item !== null && item !== undefined) : []);
const str = (v) => (v === null || v === undefined ? '' : String(v));

/** Number or null; accepts numeric strings ("8.50"), rejects blanks and garbage. */
export const toNumberOrNull = (v) => {
  if (v === null || v === undefined) return null;
  if (typeof v === 'number') return Number.isFinite(v) ? v : null;
  const s = String(v).trim();
  if (!s) return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
};

const normaliseSkill = (s) =>
  typeof s === 'string'
    ? { id: null, skillName: s, proficiency: 'INTERMEDIATE' }
    : { ...s, id: s.id ?? null, skillName: str(s.skillName), proficiency: s.proficiency || 'INTERMEDIATE' };

const normaliseProject = (p) => ({
  ...p,
  id: p.id ?? null,
  title: str(p.title),
  description: str(p.description),
  liveUrl: p.liveUrl || '',
  repoUrl: p.repoUrl || '',
  mediaUrl: p.mediaUrl || null,
  techStack: asArray(p.techStack).map(String),
});

/**
 * Fill in every ProfileData key so the UI can read nested fields without guards.
 * Unknown extra keys are kept (forward compatibility with the backend).
 */
export const normalizeProfileData = (raw) => {
  const d = isPlainObject(raw) ? raw : {};
  return {
    ...d,
    personal: { ...EMPTY_PERSONAL, ...(isPlainObject(d.personal) ? d.personal : {}) },
    academic: { ...EMPTY_ACADEMIC, ...(isPlainObject(d.academic) ? d.academic : {}) },
    skills: asArray(d.skills).map(normaliseSkill),
    education: asArray(d.education).map((e) => ({ ...e, id: e.id ?? null })),
    experience: asArray(d.experience).map((e) => ({ ...e, id: e.id ?? null })),
    projects: asArray(d.projects).map(normaliseProject),
    certifications: asArray(d.certifications).map((c) => ({ ...c, id: c.id ?? null })),
    achievements: asArray(d.achievements).map((a) => ({ ...a, id: a.id ?? null })),
    resume: { ...EMPTY_RESUME, ...(isPlainObject(d.resume) ? d.resume : {}) },
    documents: asArray(d.documents).map((doc) => ({ ...doc, id: doc.id ?? null })),
    evidence: asArray(d.evidence),
  };
};

/**
 * Comparable form of a value: blanks (null, undefined, '', whitespace) collapse to null,
 * strings are trimmed, numeric strings become numbers, client-only keys (prefixed "_")
 * are dropped and object keys are sorted. Two values with equal canonical JSON are
 * "the same" for change detection.
 */
export const canonical = (value) => {
  if (value === null || value === undefined) return null;
  if (typeof value === 'string') {
    const s = value.trim();
    if (!s) return null;
    return /^-?\d+(\.\d+)?$/.test(s) ? Number(s) : s;
  }
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  // An unset flag (isCurrent missing) means the same as false.
  if (typeof value === 'boolean') return value || null;
  if (Array.isArray(value)) return value.map(canonical);
  if (isPlainObject(value)) {
    const out = {};
    Object.keys(value)
      .filter((k) => !k.startsWith('_'))
      .sort()
      .forEach((k) => {
        const c = canonical(value[k]);
        // Missing and blank are the same thing.
        if (c !== null && !(Array.isArray(c) && c.length === 0)) out[k] = c;
      });
    return out;
  }
  return value;
};

const sameValue = (a, b) => JSON.stringify(canonical(a)) === JSON.stringify(canonical(b));

/** Section value used for comparison. Resume compares by file only, not display name. */
const sectionValue = (data, key) => {
  const v = data?.[SECTION_FIELDS[key]];
  if (key === 'RESUME') return { resumeUrl: v?.resumeUrl ?? null };
  if (key === 'PERSONAL' || key === 'ACADEMIC') return v ?? {};
  return v ?? [];
};

/** True when one section differs between two ProfileData objects. */
export const sectionDiffers = (key, a, b) => !sameValue(sectionValue(a, key), sectionValue(b, key));

/** Section keys whose content differs between `data` (draft) and `official`. */
export const computeChangedSections = (data, official) => {
  const a = normalizeProfileData(data);
  const b = normalizeProfileData(official);
  return SECTION_KEYS.filter((key) => sectionDiffers(key, a, b));
};

/** True when two whole ProfileData objects (including evidence) are equivalent. */
export const profileDataEqual = (a, b) => sameValue(normalizeProfileData(a), normalizeProfileData(b));

/** Strip client-only keys ("_key" etc.) recursively before sending the draft to the server. */
export const toDraftPayload = (data) => {
  const strip = (v) => {
    if (Array.isArray(v)) return v.map(strip);
    if (isPlainObject(v)) {
      const out = {};
      Object.keys(v).forEach((k) => {
        if (!k.startsWith('_')) out[k] = strip(v[k]);
      });
      return out;
    }
    return v;
  };
  return strip(normalizeProfileData(data));
};

// ── validation ───────────────────────────────────────────────────────────────────

/** http(s) URL check; blank is allowed (optional fields). */
export const isHttpUrl = (value) => {
  const s = str(value).trim();
  if (!s) return true;
  try {
    const url = new URL(s);
    return (url.protocol === 'http:' || url.protocol === 'https:') && Boolean(url.hostname);
  } catch {
    return false;
  }
};

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
export const isIsoDate = (value) => {
  const s = str(value).trim();
  if (!ISO_DATE.test(s)) return false;
  const d = new Date(`${s}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s;
};

const tooLong = (value, max) => str(value).trim().length > max;
const blank = (value) => !str(value).trim();
const YEAR_MIN = 1950;
const YEAR_MAX = 2100;
const PHONE = /^[+0-9][0-9 ()-]{6,19}$/;

export const validatePersonal = (p = {}) => {
  const e = {};
  if (blank(p.fullName)) e.fullName = 'Full name is required.';
  else if (tooLong(p.fullName, 120)) e.fullName = 'Full name cannot exceed 120 characters.';
  if (!blank(p.phone) && !PHONE.test(str(p.phone).trim())) e.phone = 'Enter a valid phone number.';
  if (tooLong(p.address, 255)) e.address = 'Address cannot exceed 255 characters.';
  if (tooLong(p.about, 2000)) e.about = 'About cannot exceed 2000 characters.';
  [
    ['githubUrl', 'GitHub URL'],
    ['linkedinUrl', 'LinkedIn URL'],
    ['portfolioUrl', 'Portfolio URL'],
  ].forEach(([field, label]) => {
    if (!isHttpUrl(p[field])) e[field] = `${label} must start with http:// or https://.`;
    else if (tooLong(p[field], 255)) e[field] = `${label} cannot exceed 255 characters.`;
  });
  return e;
};

export const validateAcademic = (a = {}) => {
  const e = {};
  const cgpaRaw = str(a.cgpa).trim();
  if (cgpaRaw) {
    const cgpa = toNumberOrNull(cgpaRaw);
    if (cgpa === null || cgpa < 0 || cgpa > 10) e.cgpa = 'CGPA must be between 0 and 10.';
    else if (!/^\d{1,2}(\.\d{1,2})?$/.test(cgpaRaw)) e.cgpa = 'CGPA can have at most two decimal places.';
  }
  const intField = (field, label) => {
    const raw = str(a[field]).trim();
    if (!raw) return null;
    const n = toNumberOrNull(raw);
    if (n === null || !Number.isInteger(n) || n < 0) {
      e[field] = `${label} must be a whole number of 0 or more.`;
      return null;
    }
    if (n > 99) {
      e[field] = `${label} cannot exceed 99.`;
      return null;
    }
    return n;
  };
  const total = intField('totalBacklogs', 'Total backlogs');
  const active = intField('activeBacklogs', 'Active backlogs');
  if (total !== null && active !== null && active > total) {
    e.activeBacklogs = 'Active backlogs cannot exceed total backlogs.';
  }
  const semRaw = str(a.semester).trim();
  if (semRaw) {
    const sem = toNumberOrNull(semRaw);
    if (sem === null || !Number.isInteger(sem) || sem < 1 || sem > 8) e.semester = 'Semester must be between 1 and 8.';
  }
  return e;
};

export const validateSkill = (s = {}) => {
  const e = {};
  if (blank(s.skillName)) e.skillName = 'Skill name is required.';
  else if (tooLong(s.skillName, 60)) e.skillName = 'Skill name cannot exceed 60 characters.';
  if (s.proficiency && !SKILL_PROFICIENCIES.includes(s.proficiency)) e.proficiency = 'Choose a proficiency level.';
  return e;
};

export const validateEducation = (ed = {}) => {
  const e = {};
  if (blank(ed.institutionName)) e.institutionName = 'Institution name is required.';
  else if (tooLong(ed.institutionName, 150)) e.institutionName = 'Institution name cannot exceed 150 characters.';
  if (blank(ed.degree)) e.degree = 'Degree is required.';
  else if (tooLong(ed.degree, 120)) e.degree = 'Degree cannot exceed 120 characters.';
  if (tooLong(ed.boardOrUniversity, 150)) e.boardOrUniversity = 'Board or university cannot exceed 150 characters.';
  if (tooLong(ed.grade, 30)) e.grade = 'Grade cannot exceed 30 characters.';
  const start = toNumberOrNull(ed.startYear);
  if (blank(ed.startYear)) e.startYear = 'Start year is required.';
  else if (start === null || !Number.isInteger(start) || start < YEAR_MIN || start > YEAR_MAX) {
    e.startYear = `Start year must be between ${YEAR_MIN} and ${YEAR_MAX}.`;
  }
  if (!ed.isCurrent && !blank(ed.endYear)) {
    const end = toNumberOrNull(ed.endYear);
    if (end === null || !Number.isInteger(end) || end < YEAR_MIN || end > YEAR_MAX) {
      e.endYear = `End year must be between ${YEAR_MIN} and ${YEAR_MAX}.`;
    } else if (!e.startYear && end < start) {
      e.endYear = 'End year cannot be earlier than the start year.';
    }
  }
  return e;
};

export const validateExperience = (ex = {}) => {
  const e = {};
  if (blank(ex.jobRole)) e.jobRole = 'Role is required.';
  else if (tooLong(ex.jobRole, 120)) e.jobRole = 'Role cannot exceed 120 characters.';
  if (blank(ex.company)) e.company = 'Company is required.';
  else if (tooLong(ex.company, 150)) e.company = 'Company cannot exceed 150 characters.';
  if (ex.experienceType && !EXPERIENCE_TYPES.includes(ex.experienceType)) e.experienceType = 'Choose a valid type.';
  if (tooLong(ex.location, 120)) e.location = 'Location cannot exceed 120 characters.';
  if (blank(ex.startDate)) e.startDate = 'Start date is required.';
  else if (!isIsoDate(ex.startDate)) e.startDate = 'Enter a valid start date.';
  if (!ex.isCurrent && !blank(ex.endDate)) {
    if (!isIsoDate(ex.endDate)) e.endDate = 'Enter a valid end date.';
    else if (!e.startDate && str(ex.endDate) < str(ex.startDate)) e.endDate = 'End date cannot be earlier than the start date.';
  }
  if (tooLong(ex.description, 2000)) e.description = 'Description cannot exceed 2000 characters.';
  return e;
};

export const validateProject = (p = {}) => {
  const e = {};
  if (blank(p.title)) e.title = 'Project title is required.';
  else if (tooLong(p.title, 150)) e.title = 'Project title cannot exceed 150 characters.';
  if (tooLong(p.description, 2000)) e.description = 'Description cannot exceed 2000 characters.';
  if (!isHttpUrl(p.liveUrl)) e.liveUrl = 'Live URL must start with http:// or https://.';
  else if (tooLong(p.liveUrl, 1000)) e.liveUrl = 'Live URL is too long.';
  if (!isHttpUrl(p.repoUrl)) e.repoUrl = 'Repository URL must start with http:// or https://.';
  else if (tooLong(p.repoUrl, 1000)) e.repoUrl = 'Repository URL is too long.';
  const tech = asArray(p.techStack);
  if (tech.length > 30) e.techStack = 'Use at most 30 technologies.';
  else if (tech.some((t) => tooLong(t, 60))) e.techStack = 'Each technology can be at most 60 characters.';
  return e;
};

export const validateCertification = (c = {}) => {
  const e = {};
  if (blank(c.name)) e.name = 'Certification name is required.';
  else if (tooLong(c.name, 150)) e.name = 'Certification name cannot exceed 150 characters.';
  if (tooLong(c.issuer, 150)) e.issuer = 'Issuer cannot exceed 150 characters.';
  if (!blank(c.issueDate) && !isIsoDate(c.issueDate)) e.issueDate = 'Enter a valid issue date.';
  if (!blank(c.expiryDate)) {
    if (!isIsoDate(c.expiryDate)) e.expiryDate = 'Enter a valid expiry date.';
    else if (!blank(c.issueDate) && !e.issueDate && str(c.expiryDate) < str(c.issueDate)) {
      e.expiryDate = 'Expiry date cannot be before the issue date.';
    }
  }
  if (tooLong(c.credentialId, 100)) e.credentialId = 'Credential ID cannot exceed 100 characters.';
  if (!isHttpUrl(c.credentialUrl)) e.credentialUrl = 'Credential URL must start with http:// or https://.';
  else if (tooLong(c.credentialUrl, 1000)) e.credentialUrl = 'Credential URL is too long.';
  return e;
};

export const validateAchievement = (a = {}) => {
  const e = {};
  if (blank(a.title)) e.title = 'Title is required.';
  else if (tooLong(a.title, 150)) e.title = 'Title cannot exceed 150 characters.';
  if (tooLong(a.description, 2000)) e.description = 'Description cannot exceed 2000 characters.';
  if (!blank(a.achievedOn) && !isIsoDate(a.achievedOn)) e.achievedOn = 'Enter a valid date.';
  return e;
};

export const validateDocument = (d = {}) => {
  const e = {};
  if (blank(d.documentName)) e.documentName = 'Document name is required.';
  else if (tooLong(d.documentName, 150)) e.documentName = 'Document name cannot exceed 150 characters.';
  if (!DOCUMENT_TYPES.includes(d.documentType)) e.documentType = 'Choose a document type.';
  if (blank(d.fileUrl)) e.fileUrl = 'Upload the document file.';
  return e;
};

const LIST_RULES = {
  SKILLS: { validate: validateSkill, name: (s) => s.skillName || 'Skill', dupKey: (s) => str(s.skillName).trim().toLowerCase(), dupMsg: 'Skill names must be unique' },
  EDUCATION: { validate: validateEducation, name: (e) => e.institutionName || 'Education entry' },
  EXPERIENCE: { validate: validateExperience, name: (e) => e.jobRole || 'Experience entry' },
  PROJECTS: { validate: validateProject, name: (p) => p.title || 'Project', dupKey: (p) => str(p.title).trim().toLowerCase(), dupMsg: 'Project titles must be unique' },
  CERTIFICATIONS: { validate: validateCertification, name: (c) => c.name || 'Certification' },
  ACHIEVEMENTS: { validate: validateAchievement, name: (a) => a.title || 'Achievement' },
  DOCUMENTS: { validate: validateDocument, name: (d) => d.documentName || 'Document' },
};

/**
 * Validate a whole ProfileData draft.
 * @returns {Object<string, string[]>} messages per section key; empty object when valid.
 */
export const validateProfileData = (raw) => {
  const data = normalizeProfileData(raw);
  const errors = {};
  const push = (key, msg) => {
    (errors[key] = errors[key] || []).push(msg);
  };

  Object.values(validatePersonal(data.personal)).forEach((m) => push('PERSONAL', m));
  Object.values(validateAcademic(data.academic)).forEach((m) => push('ACADEMIC', m));

  Object.entries(LIST_RULES).forEach(([key, rule]) => {
    const list = data[SECTION_FIELDS[key]];
    if (list.length > MAX_ITEMS) push(key, `At most ${MAX_ITEMS} entries are allowed.`);
    list.forEach((item) => {
      const itemErrors = Object.values(rule.validate(item));
      if (itemErrors.length) push(key, `${rule.name(item)}: ${itemErrors[0]}`);
    });
    if (rule.dupKey) {
      const seen = new Set();
      const dups = new Set();
      list.forEach((item) => {
        const k = rule.dupKey(item);
        if (!k) return;
        if (seen.has(k)) dups.add(k);
        seen.add(k);
      });
      if (dups.size) push(key, `${rule.dupMsg} (${[...dups].join(', ')}).`);
    }
  });

  if (data.evidence.length > MAX_ITEMS) push('DOCUMENTS', `At most ${MAX_ITEMS} evidence files are allowed.`);
  return errors;
};

/** Flatten validateProfileData output into "Section: message" lines. */
export const flattenErrors = (errors) =>
  Object.entries(errors || {}).flatMap(([key, msgs]) => msgs.map((m) => `${sectionLabel(key)}: ${m}`));

// ── status helpers ───────────────────────────────────────────────────────────────

/** True when the student may change the draft right now. */
export const isDraftEditable = (draft) =>
  Boolean(draft) &&
  draft.canEdit !== false &&
  draft.status !== 'PENDING' &&
  (!draft.lifecycleStatus || draft.lifecycleStatus === 'ACTIVE');

/** Section keys from the server (array or comma list), trimmed and uppercased. */
export const parseSectionList = (value) => {
  if (Array.isArray(value)) return value.map((s) => String(s).trim().toUpperCase()).filter(Boolean);
  if (typeof value === 'string') return value.split(',').map((s) => s.trim().toUpperCase()).filter(Boolean);
  return [];
};

/**
 * Which banner the profile page shows.
 * @returns {'PENDING'|'REJECTED'|'CHANGES'|'VERIFIED'|'NOT_SUBMITTED'}
 */
export const deriveBannerState = (draft, { hasUnsavedChanges = false, changedSections = [] } = {}) => {
  if (!draft) return 'NOT_SUBMITTED';
  if (draft.status === 'PENDING') return 'PENDING';
  if (draft.status === 'REJECTED' && !hasUnsavedChanges) return 'REJECTED';
  if (hasUnsavedChanges || changedSections.length > 0) return 'CHANGES';
  if (draft.profileVerificationStatus === 'VERIFIED') return 'VERIFIED';
  return 'NOT_SUBMITTED';
};

/** Generates a stable client-only key for list items that have no id yet. */
let keySeq = 0;
export const newItemKey = () => {
  keySeq += 1;
  return `new-${Date.now().toString(36)}-${keySeq}`;
};

/** React key for a list item: official id, or the client key. */
export const itemKey = (item, index) =>
  item?.id != null ? `id-${item.id}` : item?._key || `idx-${index}`;

// ── comparison (old vs new) for the verification history ────────────────────────

export const FIELD_LABELS = {
  fullName: 'Full name',
  phone: 'Phone',
  address: 'Address',
  about: 'About',
  avatarUrl: 'Photo',
  githubUrl: 'GitHub',
  linkedinUrl: 'LinkedIn',
  portfolioUrl: 'Portfolio',
  cgpa: 'CGPA',
  totalBacklogs: 'Total backlogs',
  activeBacklogs: 'Active backlogs',
  semester: 'Semester',
  skillName: 'Skill',
  proficiency: 'Proficiency',
  institutionName: 'Institution',
  degree: 'Degree',
  boardOrUniversity: 'Board / university',
  startYear: 'Start year',
  endYear: 'End year',
  grade: 'Grade',
  isCurrent: 'Current',
  jobRole: 'Role',
  company: 'Company',
  experienceType: 'Type',
  location: 'Location',
  startDate: 'Start date',
  endDate: 'End date',
  description: 'Description',
  title: 'Title',
  liveUrl: 'Live URL',
  repoUrl: 'Repository URL',
  mediaUrl: 'Media',
  techStack: 'Tech stack',
  name: 'Name',
  issuer: 'Issuer',
  issueDate: 'Issue date',
  expiryDate: 'Expiry date',
  credentialId: 'Credential ID',
  credentialUrl: 'Credential URL',
  fileUrl: 'File',
  achievedOn: 'Date',
  resumeUrl: 'Resume file',
  fileName: 'File name',
  documentName: 'Document',
  documentType: 'Document type',
  fileSize: 'File size',
};

export const fieldLabel = (field) =>
  FIELD_LABELS[field] || String(field).replace(/([A-Z])/g, ' $1').replace(/^\w/, (c) => c.toUpperCase());

/** Fields whose value is a stored file reference (rendered as a link, not text). */
export const FILE_FIELDS = new Set(['avatarUrl', 'mediaUrl', 'fileUrl', 'resumeUrl']);

/** Human-readable label for one list item. */
export const itemLabel = (key, item = {}) => {
  switch (key) {
    case 'SKILLS':
      return str(item.skillName) || 'Skill';
    case 'EDUCATION':
      return [item.degree, item.institutionName].filter(Boolean).join(' — ') || 'Education entry';
    case 'EXPERIENCE':
      return [item.jobRole, item.company].filter(Boolean).join(' at ') || 'Experience entry';
    case 'PROJECTS':
      return str(item.title) || 'Project';
    case 'CERTIFICATIONS':
      return str(item.name) || 'Certification';
    case 'ACHIEVEMENTS':
      return str(item.title) || 'Achievement';
    case 'DOCUMENTS':
      return str(item.documentName) || 'Document';
    default:
      return 'Item';
  }
};

const lower = (v) => str(v).trim().toLowerCase();
const IDENTITY = {
  SKILLS: (i) => lower(i.skillName),
  EDUCATION: (i) => `${lower(i.institutionName)}|${lower(i.degree)}`,
  EXPERIENCE: (i) => `${lower(i.jobRole)}|${lower(i.company)}`,
  PROJECTS: (i) => lower(i.title),
  CERTIFICATIONS: (i) => lower(i.name),
  ACHIEVEMENTS: (i) => lower(i.title),
  DOCUMENTS: (i) => lower(i.documentName),
};

const fieldChanges = (before = {}, after = {}) => {
  const keys = [...new Set([...Object.keys(before || {}), ...Object.keys(after || {})])].filter(
    (k) => !k.startsWith('_') && k !== 'id'
  );
  return keys
    .filter((k) => !sameValue(before?.[k], after?.[k]))
    .map((k) => ({ field: k, label: fieldLabel(k), before: before?.[k] ?? null, after: after?.[k] ?? null }));
};

/**
 * Compare one section of two ProfileData objects for display.
 * Object sections → {kind:'fields', rows:[{field,label,before,after,changed}]}.
 * List sections → {kind:'list', added, removed, updated:[{label, changes}], unchanged}.
 */
export const diffSection = (key, beforeData, afterData) => {
  const before = normalizeProfileData(beforeData);
  const after = normalizeProfileData(afterData);
  const field = SECTION_FIELDS[key];
  if (!field) return { kind: 'fields', rows: [] };

  if (key === 'PERSONAL' || key === 'ACADEMIC' || key === 'RESUME') {
    const b = before[field];
    const a = after[field];
    const keys = [...new Set([...Object.keys(b), ...Object.keys(a)])].filter((k) => !k.startsWith('_'));
    return {
      kind: 'fields',
      rows: keys.map((k) => ({
        field: k,
        label: fieldLabel(k),
        before: b[k] ?? null,
        after: a[k] ?? null,
        changed: !sameValue(b[k], a[k]),
      })),
    };
  }

  const identity = IDENTITY[key] || (() => '');
  const oldItems = before[field].map((item) => ({ item, used: false }));
  const added = [];
  const updated = [];
  let unchanged = 0;

  after[field].forEach((item) => {
    let match = null;
    if (item.id != null) {
      match = oldItems.find((o) => !o.used && o.item.id != null && String(o.item.id) === String(item.id));
    }
    if (!match) {
      const k = identity(item);
      if (k && k !== '|') match = oldItems.find((o) => !o.used && identity(o.item) === k);
    }
    if (!match) {
      added.push({ label: itemLabel(key, item), item });
      return;
    }
    match.used = true;
    const changes = fieldChanges(match.item, item);
    if (changes.length) updated.push({ label: itemLabel(key, item), changes });
    else unchanged += 1;
  });

  const removed = oldItems.filter((o) => !o.used).map((o) => ({ label: itemLabel(key, o.item), item: o.item }));
  return { kind: 'list', added, removed, updated, unchanged };
};

const ENUM_VALUE = /^(BEGINNER|INTERMEDIATE|ADVANCED|INTERNSHIP|FULL_TIME|PART_TIME|FREELANCE|MARKSHEET|CERTIFICATE|ID_PROOF|OTHER)$/;

/** Display string for a scalar/array value in comparisons. */
export const formatValue = (value) => {
  if (value === null || value === undefined || (typeof value === 'string' && !value.trim())) return '—';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (Array.isArray(value)) return value.length ? value.map((v) => formatValue(v)).join(', ') : '—';
  if (typeof value === 'object') return JSON.stringify(value);
  const s = String(value);
  return ENUM_VALUE.test(s) ? s.charAt(0) + s.slice(1).toLowerCase().replace(/_/g, ' ') : s;
};

/** "FULL_TIME" → "Full time" for enum options in forms. */
export const enumLabel = (value) => formatValue(value);
