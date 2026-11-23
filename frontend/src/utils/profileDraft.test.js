import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  SECTION_KEYS,
  normalizeProfileData,
  canonical,
  computeChangedSections,
  profileDataEqual,
  toDraftPayload,
  isHttpUrl,
  isIsoDate,
  validatePersonal,
  validateAcademic,
  validateEducation,
  validateExperience,
  validateProject,
  validateCertification,
  validateDocument,
  validateProfileData,
  flattenErrors,
  isDraftEditable,
  parseSectionList,
  deriveBannerState,
  sectionLabel,
  MAX_ITEMS,
  diffSection,
  formatValue,
  itemLabel,
} from './profileDraft.js';

const official = () =>
  normalizeProfileData({
    personal: { fullName: 'Asha', phone: '9876543210', githubUrl: 'https://github.com/asha' },
    academic: { cgpa: 8.5, totalBacklogs: 1, activeBacklogs: 0, semester: 6 },
    skills: [{ id: 1, skillName: 'Java', proficiency: 'ADVANCED' }],
    education: [{ id: 3, institutionName: 'GCE', degree: 'B.E.', startYear: 2021, isCurrent: true }],
    resume: { resumeUrl: '/api/files/download/resumes/a.pdf', fileName: 'a.pdf' },
  });

describe('normalizeProfileData', () => {
  it('fills every section for empty input', () => {
    const d = normalizeProfileData(null);
    for (const key of ['skills', 'education', 'experience', 'projects', 'certifications', 'achievements', 'documents', 'evidence']) {
      assert.deepEqual(d[key], []);
    }
    assert.equal(d.personal.fullName, '');
    assert.equal(d.academic.cgpa, null);
    assert.deepEqual(d.resume, { resumeUrl: null, fileName: null });
  });

  it('accepts plain-string skills and defaults proficiency', () => {
    const d = normalizeProfileData({ skills: ['React', null] });
    assert.deepEqual(d.skills, [{ id: null, skillName: 'React', proficiency: 'INTERMEDIATE' }]);
  });
});

describe('canonical / change detection', () => {
  it('treats blanks, numeric strings and false flags as equivalent', () => {
    assert.deepEqual(canonical({ a: '', b: ' 8.50 ', c: false, _key: 'x', d: [] }), { b: 8.5 });
  });

  it('reports no changes for an identical copy', () => {
    assert.deepEqual(computeChangedSections(official(), official()), []);
  });

  it('detects changed sections only', () => {
    const draft = official();
    draft.academic.cgpa = '8.75';
    draft.skills.push({ skillName: 'React', proficiency: 'BEGINNER', _key: 'n1' });
    draft.certifications.push({ name: 'AWS CCP' });
    assert.deepEqual(computeChangedSections(draft, official()), ['ACADEMIC', 'SKILLS', 'CERTIFICATIONS']);
  });

  it('ignores the display name of an unchanged resume file', () => {
    const draft = official();
    draft.resume.fileName = 'renamed.pdf';
    assert.deepEqual(computeChangedSections(draft, official()), []);
    draft.resume = { resumeUrl: '/api/files/download/verification/b.pdf', fileName: 'b.pdf' };
    assert.deepEqual(computeChangedSections(draft, official()), ['RESUME']);
  });

  it('profileDataEqual includes evidence', () => {
    const draft = official();
    assert.ok(profileDataEqual(draft, official()));
    draft.evidence.push({ section: 'ACADEMIC', fileUrl: '/api/files/x.pdf' });
    assert.ok(!profileDataEqual(draft, official()));
  });

  it('toDraftPayload strips client-only keys', () => {
    const draft = official();
    draft.skills.push({ skillName: 'Go', _key: 'k' });
    const payload = toDraftPayload(draft);
    assert.equal(payload.skills[1]._key, undefined);
    assert.equal(payload.skills[1].skillName, 'Go');
  });
});

describe('field validators', () => {
  it('URLs must be http/https', () => {
    assert.ok(isHttpUrl(''));
    assert.ok(isHttpUrl('https://x.dev'));
    assert.ok(!isHttpUrl('javascript:alert(1)'));
    assert.ok(!isHttpUrl('ftp://x.dev'));
    assert.ok(!isHttpUrl('github.com/me'));
  });

  it('dates must be real ISO dates', () => {
    assert.ok(isIsoDate('2024-02-29'));
    assert.ok(!isIsoDate('2023-02-29'));
    assert.ok(!isIsoDate('12/01/2024'));
  });

  it('personal: name required, links checked', () => {
    const e = validatePersonal({ fullName: ' ', linkedinUrl: 'linkedin.com/in/x', phone: 'abc' });
    assert.ok(e.fullName);
    assert.ok(e.linkedinUrl);
    assert.ok(e.phone);
    assert.deepEqual(validatePersonal({ fullName: 'A', githubUrl: 'https://github.com/a' }), {});
  });

  it('academic: cgpa range and decimals, backlogs relation, semester', () => {
    assert.ok(validateAcademic({ cgpa: '10.5' }).cgpa);
    assert.ok(validateAcademic({ cgpa: '8.555' }).cgpa);
    assert.ok(validateAcademic({ cgpa: '-1' }).cgpa);
    assert.deepEqual(validateAcademic({ cgpa: '8.55', totalBacklogs: 2, activeBacklogs: 1, semester: '5' }), {});
    assert.ok(validateAcademic({ totalBacklogs: 1, activeBacklogs: 2 }).activeBacklogs);
    assert.ok(validateAcademic({ totalBacklogs: 1.5 }).totalBacklogs);
    assert.ok(validateAcademic({ semester: 9 }).semester);
  });

  it('education: years in range and ordered', () => {
    assert.ok(validateEducation({ institutionName: 'X', degree: 'Y' }).startYear);
    assert.ok(validateEducation({ institutionName: 'X', degree: 'Y', startYear: 2022, endYear: 2020 }).endYear);
    assert.ok(validateEducation({ institutionName: 'X', degree: 'Y', startYear: 1900 }).startYear);
    assert.deepEqual(validateEducation({ institutionName: 'X', degree: 'Y', startYear: 2020, endYear: 2024 }), {});
  });

  it('experience: start date required, end after start', () => {
    assert.ok(validateExperience({ jobRole: 'Intern', company: 'Z' }).startDate);
    assert.ok(validateExperience({ jobRole: 'Intern', company: 'Z', startDate: '2024-05-01', endDate: '2024-04-01' }).endDate);
    assert.deepEqual(validateExperience({ jobRole: 'Intern', company: 'Z', startDate: '2024-05-01', endDate: '2024-07-01' }), {});
  });

  it('project, certification, document', () => {
    assert.ok(validateProject({ title: '' }).title);
    assert.ok(validateProject({ title: 'P', repoUrl: 'git@github.com:a/b' }).repoUrl);
    assert.ok(validateCertification({ name: 'C', issueDate: '2024-05-01', expiryDate: '2023-01-01' }).expiryDate);
    assert.ok(validateCertification({ name: 'C', credentialUrl: 'nope' }).credentialUrl);
    assert.deepEqual(validateCertification({ name: 'C', issueDate: '2024-05-01' }), {});
    assert.ok(validateDocument({ documentName: 'Marks', documentType: 'BAD', fileUrl: '/api/x' }).documentType);
    assert.ok(validateDocument({ documentName: 'Marks', documentType: 'MARKSHEET' }).fileUrl);
  });
});

describe('validateProfileData', () => {
  it('is empty for a valid draft', () => {
    assert.deepEqual(validateProfileData(official()), {});
  });

  it('flags duplicates, over-long lists and item errors per section', () => {
    const d = official();
    d.skills.push({ skillName: 'java' });
    d.projects = [{ title: 'Portal' }, { title: ' portal ' }];
    d.achievements = Array.from({ length: MAX_ITEMS + 1 }, (_, i) => ({ title: `A${i}` }));
    d.experience = [{ jobRole: 'Intern', company: '' , startDate: '2024-01-01' }];
    const errors = validateProfileData(d);
    assert.match(errors.SKILLS[0], /unique/);
    assert.match(errors.PROJECTS[0], /unique/);
    assert.match(errors.ACHIEVEMENTS[0], /At most 50/);
    assert.match(errors.EXPERIENCE[0], /^Intern: Company is required/);
    assert.ok(flattenErrors(errors).every((line) => line.includes(': ')));
  });
});

describe('status helpers', () => {
  it('isDraftEditable', () => {
    assert.ok(isDraftEditable({ status: 'DRAFT', canEdit: true, lifecycleStatus: 'ACTIVE' }));
    assert.ok(isDraftEditable({ status: 'NONE' }));
    assert.ok(!isDraftEditable({ status: 'PENDING', canEdit: true, lifecycleStatus: 'ACTIVE' }));
    assert.ok(!isDraftEditable({ status: 'DRAFT', canEdit: false, lifecycleStatus: 'ACTIVE' }));
    assert.ok(!isDraftEditable({ status: 'DRAFT', canEdit: true, lifecycleStatus: 'ARCHIVED' }));
    assert.ok(!isDraftEditable(null));
  });

  it('parseSectionList accepts arrays and comma lists', () => {
    assert.deepEqual(parseSectionList('skills, ACADEMIC,'), ['SKILLS', 'ACADEMIC']);
    assert.deepEqual(parseSectionList(['resume']), ['RESUME']);
    assert.deepEqual(parseSectionList(null), []);
  });

  it('deriveBannerState', () => {
    assert.equal(deriveBannerState({ status: 'PENDING' }), 'PENDING');
    assert.equal(deriveBannerState({ status: 'REJECTED' }), 'REJECTED');
    assert.equal(deriveBannerState({ status: 'REJECTED' }, { hasUnsavedChanges: true }), 'CHANGES');
    assert.equal(deriveBannerState({ status: 'DRAFT', profileVerificationStatus: 'VERIFIED' }, { changedSections: ['SKILLS'] }), 'CHANGES');
    assert.equal(deriveBannerState({ status: 'NONE', profileVerificationStatus: 'VERIFIED' }), 'VERIFIED');
    assert.equal(deriveBannerState({ status: 'NONE', profileVerificationStatus: 'NOT_SUBMITTED' }), 'NOT_SUBMITTED');
  });

  it('diffSection lists changed fields of an object section', () => {
    const before = official();
    const after = official();
    after.academic.cgpa = 8.9;
    const d = diffSection('ACADEMIC', before, after);
    assert.equal(d.kind, 'fields');
    const cgpa = d.rows.find((r) => r.field === 'cgpa');
    assert.deepEqual([cgpa.before, cgpa.after, cgpa.changed], [8.5, 8.9, true]);
    assert.equal(d.rows.find((r) => r.field === 'semester').changed, false);
  });

  it('diffSection matches list items by id, then identity', () => {
    const before = official();
    before.skills.push({ id: 2, skillName: 'SQL', proficiency: 'BEGINNER' });
    const after = official();
    after.skills = [
      { id: 1, skillName: 'Java', proficiency: 'INTERMEDIATE' },
      { skillName: 'React', proficiency: 'ADVANCED' },
    ];
    const d = diffSection('SKILLS', before, after);
    assert.equal(d.kind, 'list');
    assert.deepEqual(d.added.map((a) => a.label), ['React']);
    assert.deepEqual(d.removed.map((r) => r.label), ['SQL']);
    assert.equal(d.updated[0].label, 'Java');
    assert.deepEqual(d.updated[0].changes.map((c) => c.field), ['proficiency']);
    assert.equal(d.unchanged, 0);
  });

  it('formats values for display', () => {
    assert.equal(formatValue(null), '—');
    assert.equal(formatValue(true), 'Yes');
    assert.equal(formatValue(['a', 'b']), 'a, b');
    assert.equal(formatValue('FULL_TIME'), 'Full time');
    assert.equal(itemLabel('EXPERIENCE', { jobRole: 'Intern', company: 'Zoho' }), 'Intern at Zoho');
  });

  it('every section has a label', () => {
    for (const key of SECTION_KEYS) assert.notEqual(sectionLabel(key), key);
    assert.equal(sectionLabel('SOMETHING_NEW'), 'Something new');
  });
});
