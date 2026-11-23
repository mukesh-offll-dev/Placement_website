import {
  validateEducation,
  validateExperience,
  validateProject,
  validateCertification,
  validateAchievement,
  validateDocument,
  EXPERIENCE_TYPES,
  DOCUMENT_TYPES,
  enumLabel,
  toNumberOrNull,
} from '../../utils/profileDraft.js';

const options = (values) => values.map((v) => ({ value: v, label: enumLabel(v) }));
const blankToNull = (v) => (typeof v === 'string' && !v.trim() ? null : typeof v === 'string' ? v.trim() : v);

/**
 * Form definitions for the list sections edited through ItemEditorModal.
 * Each: title, empty item, fields, validate(form) → errors, toItem(form) → draft item.
 */
export const ITEM_FORMS = {
  EDUCATION: {
    noun: 'Education',
    empty: { institutionName: '', degree: '', boardOrUniversity: '', startYear: '', endYear: '', grade: '', isCurrent: false },
    fields: [
      { name: 'institutionName', label: 'Institution name', required: true, placeholder: 'e.g. Government College of Engineering, Srirangam' },
      { name: 'degree', label: 'Degree / course', required: true, placeholder: 'e.g. B.E. Computer Science and Engineering' },
      { name: 'boardOrUniversity', label: 'Board or university', placeholder: 'e.g. Anna University / State Board' },
      { name: 'startYear', label: 'Start year', type: 'number', required: true, min: 1950, max: 2100, half: true },
      { name: 'endYear', label: 'End year', type: 'number', min: 1950, max: 2100, half: true, disabledWhen: (f) => f.isCurrent },
      { name: 'isCurrent', label: 'Currently studying here', type: 'checkbox', clears: 'endYear' },
      { name: 'grade', label: 'Grade / CGPA / percentage', placeholder: 'e.g. 8.75 CGPA or 85%' },
    ],
    validate: validateEducation,
    toItem: (f) => ({
      institutionName: f.institutionName.trim(),
      degree: f.degree.trim(),
      boardOrUniversity: blankToNull(f.boardOrUniversity),
      startYear: toNumberOrNull(f.startYear),
      endYear: f.isCurrent ? null : toNumberOrNull(f.endYear),
      grade: blankToNull(f.grade),
      isCurrent: Boolean(f.isCurrent),
    }),
  },
  EXPERIENCE: {
    noun: 'Internship / experience',
    empty: { jobRole: '', company: '', experienceType: 'INTERNSHIP', location: '', startDate: '', endDate: '', isCurrent: false, description: '' },
    fields: [
      { name: 'jobRole', label: 'Role / position', required: true, placeholder: 'e.g. Software Development Intern' },
      { name: 'company', label: 'Company / organisation', required: true },
      { name: 'experienceType', label: 'Type', type: 'select', options: options(EXPERIENCE_TYPES), half: true },
      { name: 'location', label: 'Location', placeholder: 'e.g. Chennai, Remote', half: true },
      { name: 'startDate', label: 'Start date', type: 'date', required: true, half: true },
      { name: 'endDate', label: 'End date', type: 'date', half: true, disabledWhen: (f) => f.isCurrent },
      { name: 'isCurrent', label: 'I currently work / intern here', type: 'checkbox', clears: 'endDate' },
      { name: 'description', label: 'Description / responsibilities', type: 'textarea', maxLength: 2000 },
    ],
    validate: validateExperience,
    toItem: (f) => ({
      jobRole: f.jobRole.trim(),
      company: f.company.trim(),
      experienceType: f.experienceType || 'INTERNSHIP',
      location: blankToNull(f.location),
      startDate: f.startDate || null,
      endDate: f.isCurrent ? null : f.endDate || null,
      isCurrent: Boolean(f.isCurrent),
      description: blankToNull(f.description),
    }),
  },
  PROJECTS: {
    noun: 'Project',
    empty: { title: '', description: '', liveUrl: '', repoUrl: '', mediaUrl: null, techStack: [] },
    fields: [
      { name: 'title', label: 'Project title', required: true },
      { name: 'description', label: 'Description', type: 'textarea', maxLength: 2000 },
      { name: 'techStack', label: 'Technologies', type: 'tags', hint: 'Press Enter or comma to add a technology.' },
      { name: 'liveUrl', label: 'Live demo URL', type: 'url', placeholder: 'https://', half: true },
      { name: 'repoUrl', label: 'Repository URL', type: 'url', placeholder: 'https://github.com/…', half: true },
      { name: 'mediaUrl', label: 'Screenshot or media', type: 'file', section: 'PROJECTS', nameField: '_mediaName' },
    ],
    validate: validateProject,
    toItem: (f) => ({
      title: f.title.trim(),
      description: blankToNull(f.description),
      liveUrl: blankToNull(f.liveUrl),
      repoUrl: blankToNull(f.repoUrl),
      mediaUrl: f.mediaUrl || null,
      techStack: Array.isArray(f.techStack) ? f.techStack : [],
    }),
  },
  CERTIFICATIONS: {
    noun: 'Certification',
    empty: { name: '', issuer: '', issueDate: '', expiryDate: '', credentialId: '', credentialUrl: '', fileUrl: null },
    fields: [
      { name: 'name', label: 'Certification name', required: true, placeholder: 'e.g. AWS Certified Cloud Practitioner' },
      { name: 'issuer', label: 'Issued by', placeholder: 'e.g. Amazon Web Services' },
      { name: 'issueDate', label: 'Issue date', type: 'date', half: true },
      { name: 'expiryDate', label: 'Expiry date', type: 'date', half: true },
      { name: 'credentialId', label: 'Credential ID', half: true },
      { name: 'credentialUrl', label: 'Credential URL', type: 'url', placeholder: 'https://', half: true },
      { name: 'fileUrl', label: 'Certificate file', type: 'file', section: 'CERTIFICATIONS', nameField: '_fileName' },
    ],
    validate: validateCertification,
    toItem: (f) => ({
      name: f.name.trim(),
      issuer: blankToNull(f.issuer),
      issueDate: f.issueDate || null,
      expiryDate: f.expiryDate || null,
      credentialId: blankToNull(f.credentialId),
      credentialUrl: blankToNull(f.credentialUrl),
      fileUrl: f.fileUrl || null,
    }),
  },
  ACHIEVEMENTS: {
    noun: 'Achievement',
    empty: { title: '', description: '', achievedOn: '', fileUrl: null },
    fields: [
      { name: 'title', label: 'Title', required: true, placeholder: 'e.g. Winner, Smart India Hackathon 2025' },
      { name: 'achievedOn', label: 'Date', type: 'date' },
      { name: 'description', label: 'Description', type: 'textarea', maxLength: 2000 },
      { name: 'fileUrl', label: 'Proof (certificate, photo)', type: 'file', section: 'ACHIEVEMENTS', nameField: '_fileName' },
    ],
    validate: validateAchievement,
    toItem: (f) => ({
      title: f.title.trim(),
      description: blankToNull(f.description),
      achievedOn: f.achievedOn || null,
      fileUrl: f.fileUrl || null,
    }),
  },
  DOCUMENTS: {
    noun: 'Supporting document',
    empty: { documentName: '', documentType: 'MARKSHEET', fileUrl: null, fileSize: null },
    fields: [
      { name: 'documentName', label: 'Document name', required: true, placeholder: 'e.g. Semester 5 marksheet' },
      { name: 'documentType', label: 'Type', type: 'select', options: options(DOCUMENT_TYPES) },
      { name: 'fileUrl', label: 'File', type: 'file', section: 'DOCUMENTS', required: true, nameField: '_fileName', sizeField: 'fileSize' },
    ],
    validate: validateDocument,
    toItem: (f) => ({
      documentName: f.documentName.trim(),
      documentType: f.documentType,
      fileUrl: f.fileUrl || null,
      fileSize: f.fileSize ?? null,
    }),
  },
};

/** Form state for an existing item (null/undefined → ''), keeping its id. */
export const formFromItem = (key, item) => {
  const def = ITEM_FORMS[key];
  const form = { ...def.empty };
  Object.keys(def.empty).forEach((k) => {
    const v = item?.[k];
    if (v === null || v === undefined) return;
    form[k] = Array.isArray(v) ? [...v] : typeof v === 'boolean' ? v : typeof v === 'number' ? String(v) : v;
  });
  return form;
};

/** Display name of a stored file from its URL. */
export const fileNameFromUrl = (url) => {
  if (!url || typeof url !== 'string') return null;
  const last = url.split('?')[0].split('/').filter(Boolean).pop();
  try {
    return last ? decodeURIComponent(last) : null;
  } catch {
    return last || null;
  }
};
