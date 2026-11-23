/**
 * Field-level comparison of two ProfileData objects (upgrade spec §3): the verified (official)
 * profile against the version a student proposed. Used by the faculty/admin review screen.
 *
 * Pure functions, no React, so it runs under `node --test`.
 */

/** Section metadata: ProfileData property, list or object, the fields shown and how a list item is named. */
export const DIFF_SECTIONS = Object.freeze([
  {
    key: 'PERSONAL',
    prop: 'personal',
    label: 'Personal details',
    kind: 'object',
    fields: [
      ['fullName', 'Full name'],
      ['phone', 'Phone'],
      ['address', 'Address'],
      ['about', 'About'],
      ['avatarUrl', 'Photo', 'file'],
      ['githubUrl', 'GitHub', 'url'],
      ['linkedinUrl', 'LinkedIn', 'url'],
      ['portfolioUrl', 'Portfolio', 'url'],
    ],
  },
  {
    key: 'ACADEMIC',
    prop: 'academic',
    label: 'Academic record',
    kind: 'object',
    fields: [
      ['cgpa', 'CGPA'],
      ['totalBacklogs', 'Total backlogs'],
      ['activeBacklogs', 'Active backlogs'],
      ['semester', 'Semester'],
    ],
  },
  {
    key: 'SKILLS',
    prop: 'skills',
    label: 'Skills',
    kind: 'list',
    fields: [
      ['skillName', 'Skill'],
      ['proficiency', 'Proficiency'],
    ],
    identity: (i) => String(i?.skillName || '').trim().toLowerCase(),
    title: (i) => i?.skillName || 'Skill',
  },
  {
    key: 'EDUCATION',
    prop: 'education',
    label: 'Education',
    kind: 'list',
    fields: [
      ['institutionName', 'Institution'],
      ['degree', 'Degree'],
      ['boardOrUniversity', 'Board / university'],
      ['startYear', 'Start year'],
      ['endYear', 'End year'],
      ['grade', 'Grade'],
      ['isCurrent', 'Currently studying'],
    ],
    identity: (i) => `${String(i?.institutionName || '').trim().toLowerCase()}|${String(i?.degree || '').trim().toLowerCase()}`,
    title: (i) => [i?.degree, i?.institutionName].filter(Boolean).join(' · ') || 'Education',
  },
  {
    key: 'EXPERIENCE',
    prop: 'experience',
    label: 'Internships & experience',
    kind: 'list',
    fields: [
      ['jobRole', 'Role'],
      ['company', 'Company'],
      ['experienceType', 'Type'],
      ['location', 'Location'],
      ['startDate', 'Start date'],
      ['endDate', 'End date'],
      ['isCurrent', 'Current'],
      ['description', 'Description'],
    ],
    identity: (i) => `${String(i?.jobRole || '').trim().toLowerCase()}|${String(i?.company || '').trim().toLowerCase()}`,
    title: (i) => [i?.jobRole, i?.company].filter(Boolean).join(' at ') || 'Experience',
  },
  {
    key: 'PROJECTS',
    prop: 'projects',
    label: 'Projects',
    kind: 'list',
    fields: [
      ['title', 'Title'],
      ['description', 'Description'],
      ['techStack', 'Tech stack'],
      ['liveUrl', 'Live URL', 'url'],
      ['repoUrl', 'Repository', 'url'],
      ['mediaUrl', 'Media', 'file'],
    ],
    identity: (i) => String(i?.title || '').trim().toLowerCase(),
    title: (i) => i?.title || 'Project',
  },
  {
    key: 'CERTIFICATIONS',
    prop: 'certifications',
    label: 'Certifications',
    kind: 'list',
    fields: [
      ['name', 'Name'],
      ['issuer', 'Issuer'],
      ['issueDate', 'Issued'],
      ['expiryDate', 'Expires'],
      ['credentialId', 'Credential ID'],
      ['credentialUrl', 'Credential URL', 'url'],
      ['fileUrl', 'Certificate file', 'file'],
    ],
    identity: (i) => `${String(i?.name || '').trim().toLowerCase()}|${String(i?.issuer || '').trim().toLowerCase()}`,
    title: (i) => i?.name || 'Certification',
  },
  {
    key: 'ACHIEVEMENTS',
    prop: 'achievements',
    label: 'Achievements',
    kind: 'list',
    fields: [
      ['title', 'Title'],
      ['description', 'Description'],
      ['achievedOn', 'Date'],
      ['fileUrl', 'Proof', 'file'],
    ],
    identity: (i) => String(i?.title || '').trim().toLowerCase(),
    title: (i) => i?.title || 'Achievement',
  },
  {
    key: 'RESUME',
    prop: 'resume',
    label: 'Resume',
    kind: 'object',
    fields: [
      ['fileName', 'File name'],
      ['resumeUrl', 'Resume', 'file'],
    ],
  },
  {
    key: 'DOCUMENTS',
    prop: 'documents',
    label: 'Supporting documents',
    kind: 'list',
    fields: [
      ['documentName', 'Name'],
      ['documentType', 'Type'],
      ['fileUrl', 'File', 'file'],
    ],
    identity: (i) => String(i?.fileUrl || i?.documentName || '').trim().toLowerCase(),
    title: (i) => i?.documentName || 'Document',
  },
]);

const SECTION_BY_KEY = Object.fromEntries(DIFF_SECTIONS.map((s) => [s.key, s]));

export const diffSectionLabel = (key) =>
  SECTION_BY_KEY[String(key || '').toUpperCase()]?.label
  || String(key || '').toLowerCase().replace(/_/g, ' ').replace(/^\w/, (c) => c.toUpperCase());

const NUMERIC = /^-?\d+(\.\d+)?$/;

/** Canonical form used for equality: blank is empty, "8.50" equals 8.5, lists compare in order. */
export const comparableValue = (value) => {
  if (value === null || value === undefined) return '';
  if (Array.isArray(value)) return value.map(comparableValue).filter((v) => v !== '').join('|');
  if (typeof value === 'number') return Number.isFinite(value) ? String(value) : '';
  if (typeof value === 'boolean') return value ? 'true' : '';
  const text = String(value).trim();
  if (NUMERIC.test(text)) return String(Number(text));
  return text;
};

export const valuesEqual = (a, b) => comparableValue(a) === comparableValue(b);

/** Human-readable form of a value for the comparison table. */
export const formatDiffValue = (value) => {
  if (value === null || value === undefined) return '—';
  if (Array.isArray(value)) return value.length ? value.join(', ') : '—';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  const text = String(value).trim();
  if (!text) return '—';
  if (/^[A-Z][A-Z_]+$/.test(text)) return text.charAt(0) + text.slice(1).toLowerCase().replace(/_/g, ' ');
  return text;
};

const diffFields = (fields, before, after) =>
  fields.map(([name, label, type]) => {
    const b = before ? before[name] : undefined;
    const a = after ? after[name] : undefined;
    return { name, label, type: type || 'text', before: b, after: a, changed: !valuesEqual(b, a) };
  });

const isEmptyObject = (fields, obj) => !obj || fields.every(([name]) => comparableValue(obj[name]) === '');

/**
 * Compares one list section. Items are paired by official row id first, then (for id-less new
 * items) by a natural key such as the skill name, so re-adding a removed skill reads as unchanged.
 *
 * @returns {{ items: Array<{status: 'added'|'removed'|'changed'|'unchanged', before, after, title, fields}>,
 *             counts: {added, removed, changed, unchanged} }}
 */
export const diffList = (section, beforeList, afterList) => {
  const before = Array.isArray(beforeList) ? beforeList : [];
  const after = Array.isArray(afterList) ? afterList : [];
  const usedBefore = new Set();
  const pairs = after.map((item) => ({ after: item, before: null }));

  // 1. Pair by id.
  pairs.forEach((p) => {
    if (p.after?.id == null) return;
    const idx = before.findIndex((b, i) => !usedBefore.has(i) && b?.id != null && String(b.id) === String(p.after.id));
    if (idx >= 0) {
      usedBefore.add(idx);
      p.before = before[idx];
    }
  });

  // 2. Pair the rest by natural key.
  if (section.identity) {
    pairs.forEach((p) => {
      if (p.before) return;
      const key = section.identity(p.after);
      if (!key || key === '|') return;
      const idx = before.findIndex((b, i) => !usedBefore.has(i) && section.identity(b) === key);
      if (idx >= 0) {
        usedBefore.add(idx);
        p.before = before[idx];
      }
    });
  }

  const counts = { added: 0, removed: 0, changed: 0, unchanged: 0 };
  const items = pairs.map((p) => {
    const fields = diffFields(section.fields, p.before, p.after);
    const status = !p.before ? 'added' : fields.some((f) => f.changed) ? 'changed' : 'unchanged';
    counts[status] += 1;
    return { status, before: p.before, after: p.after, title: section.title ? section.title(p.after) : '', fields };
  });

  before.forEach((b, i) => {
    if (usedBefore.has(i)) return;
    counts.removed += 1;
    items.push({
      status: 'removed',
      before: b,
      after: null,
      title: section.title ? section.title(b) : '',
      fields: diffFields(section.fields, b, null),
    });
  });

  return { items, counts };
};

/**
 * Compares one section of two ProfileData objects.
 * @returns {{ key, label, kind, changed: boolean, fields?, items?, counts? }}
 */
export const diffSection = (key, beforeData, afterData) => {
  const section = SECTION_BY_KEY[String(key || '').toUpperCase()];
  if (!section) return null;
  const before = beforeData ? beforeData[section.prop] : undefined;
  const after = afterData ? afterData[section.prop] : undefined;

  if (section.kind === 'object') {
    const fields = diffFields(section.fields, before, after);
    return {
      key: section.key,
      label: section.label,
      kind: 'object',
      changed: fields.some((f) => f.changed),
      empty: isEmptyObject(section.fields, before) && isEmptyObject(section.fields, after),
      fields,
    };
  }

  const { items, counts } = diffList(section, before, after);
  return {
    key: section.key,
    label: section.label,
    kind: 'list',
    changed: counts.added + counts.removed + counts.changed > 0,
    empty: items.length === 0,
    items,
    counts,
  };
};

/**
 * Every section compared, changed sections first (in the order the backend listed them).
 * @param {object} beforeData - verified profile (ProfileData)
 * @param {object} afterData - proposed profile (ProfileData)
 * @param {string[]} [changedSections] - the backend's list, used for ordering and as a hint
 */
export const diffProfile = (beforeData, afterData, changedSections = []) => {
  const flagged = (changedSections || []).map((s) => String(s).toUpperCase());
  const all = DIFF_SECTIONS.map((s) => {
    const d = diffSection(s.key, beforeData, afterData);
    return { ...d, flagged: flagged.includes(s.key), changed: d.changed || flagged.includes(s.key) };
  });
  const rank = (d) => (d.changed ? (flagged.includes(d.key) ? flagged.indexOf(d.key) : 50) : 100 + DIFF_SECTIONS.findIndex((s) => s.key === d.key));
  return all.sort((a, b) => rank(a) - rank(b));
};

/** True when the official profile moved on after the student submitted (base snapshot differs). */
export const officialChangedSinceSubmit = (base, current, sectionKeys = []) => {
  if (!base || !current) return false;
  const keys = sectionKeys.length ? sectionKeys : DIFF_SECTIONS.map((s) => s.key);
  return keys.some((k) => diffSection(k, base, current)?.changed);
};
