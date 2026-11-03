import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  validateJobDrive,
  buildJobPayload,
  jobResponseToForm,
  emptyJobDrive,
} from './jobDriveValidation.js';

const futureDate = (daysAhead = 30) => {
  const d = new Date();
  d.setDate(d.getDate() + daysAhead);
  return d.toISOString().slice(0, 10);
};

const validForm = (overrides = {}) => ({
  ...emptyJobDrive(),
  companyId: '1',
  jobRole: 'Software Engineer',
  jobType: 'FULL_TIME',
  applicationDeadline: futureDate(),
  ...overrides,
});

describe('Job drive validation', () => {
  it('accepts a minimal valid drive', () => {
    assert.deepEqual(validateJobDrive(validForm()), {});
  });

  it('requires the fields the backend marks NotNull or NotBlank', () => {
    const errors = validateJobDrive(emptyJobDrive());
    for (const field of ['companyId', 'jobRole', 'applicationDeadline']) {
      assert.ok(errors[field], `${field} should be required`);
    }
  });

  it('rejects a deadline in the past but accepts today', () => {
    const today = new Date().toISOString().slice(0, 10);
    assert.equal(validateJobDrive(validForm({ applicationDeadline: today })).applicationDeadline, undefined);

    const past = new Date();
    past.setDate(past.getDate() - 1);
    assert.ok(validateJobDrive(validForm({ applicationDeadline: past.toISOString().slice(0, 10) })).applicationDeadline);
  });

  it('keeps CGPA within 0 to 10 with at most two decimals', () => {
    assert.equal(validateJobDrive(validForm({ minCgpa: '7.55' })).minCgpa, undefined);
    assert.ok(validateJobDrive(validForm({ minCgpa: '10.01' })).minCgpa);
    assert.ok(validateJobDrive(validForm({ minCgpa: '-1' })).minCgpa);
    assert.ok(validateJobDrive(validForm({ minCgpa: '7.555' })).minCgpa);
    assert.ok(validateJobDrive(validForm({ minCgpa: 'abc' })).minCgpa);
  });

  it('requires at least one vacancy when a number is given', () => {
    assert.equal(validateJobDrive(validForm({ vacancies: '' })).vacancies, undefined, 'optional when blank');
    assert.equal(validateJobDrive(validForm({ vacancies: '1' })).vacancies, undefined);
    assert.ok(validateJobDrive(validForm({ vacancies: '0' })).vacancies);
    assert.ok(validateJobDrive(validForm({ vacancies: '2.5' })).vacancies);
  });

  it('enforces the backend length limits', () => {
    assert.ok(validateJobDrive(validForm({ jobRole: 'x'.repeat(151) })).jobRole);
    assert.ok(validateJobDrive(validForm({ jobDescription: 'x'.repeat(4001) })).jobDescription);
    assert.ok(validateJobDrive(validForm({ location: 'x'.repeat(121) })).location);
    assert.ok(validateJobDrive(validForm({ ctcText: 'x'.repeat(31) })).ctcText);
    assert.ok(validateJobDrive(validForm({ bond: 'x'.repeat(101) })).bond);
  });

  it('validates skills and requirements, including their element rules', () => {
    assert.equal(validateJobDrive(validForm({ skills: ['Java', 'React'] })).skills, undefined);
    assert.ok(validateJobDrive(validForm({ skills: ['Java', '  '] })).skills, 'blank entry rejected');
    assert.ok(validateJobDrive(validForm({ skills: ['x'.repeat(61)] })).skills);
    assert.ok(validateJobDrive(validForm({ skills: Array(51).fill('Java') })).skills);
    assert.ok(validateJobDrive(validForm({ requirements: ['x'.repeat(301)] })).requirements);
  });

  it('rejects graduation years outside 1950-2100', () => {
    assert.equal(validateJobDrive(validForm({ graduationYear: '2027' })).graduationYear, undefined);
    assert.ok(validateJobDrive(validForm({ graduationYear: '1949' })).graduationYear);
    assert.ok(validateJobDrive(validForm({ graduationYear: '2101' })).graduationYear);
  });

  it('rejects an unknown job type or status', () => {
    assert.ok(validateJobDrive(validForm({ jobType: 'PERMANENT' })).jobType);
    assert.ok(validateJobDrive(validForm({ status: 'OPEN' })).status);
  });
});

describe('Job drive payload', () => {
  it('sends null rather than empty strings for untouched optional fields', () => {
    const payload = buildJobPayload(validForm());

    // "" for a number or a date is a 400 from the backend.
    for (const field of ['jobDescription', 'location', 'ctcText', 'ctcValue', 'vacancies', 'bond', 'minCgpa', 'graduationYear']) {
      assert.equal(payload[field], null, `${field} should be null when blank`);
    }
  });

  it('converts numeric strings to numbers', () => {
    const payload = buildJobPayload(validForm({
      companyId: '3',
      ctcValue: '1200000.50',
      vacancies: '10',
      minCgpa: '7.5',
      graduationYear: '2027',
    }));

    assert.equal(payload.companyId, 3);
    assert.equal(payload.ctcValue, 1200000.5);
    assert.equal(payload.vacancies, 10);
    assert.equal(payload.minCgpa, 7.5);
    assert.equal(payload.graduationYear, 2027);
  });

  it('trims list entries and drops blanks', () => {
    const payload = buildJobPayload(validForm({ skills: [' Java ', '', '  ', 'React'] }));
    assert.deepEqual(payload.skills, ['Java', 'React']);
  });

  it('always sends a boolean for backlogsAllowed and defaults status to DRAFT', () => {
    const payload = buildJobPayload({ ...validForm(), backlogsAllowed: undefined, status: '' });
    assert.equal(payload.backlogsAllowed, false);
    assert.equal(payload.status, 'DRAFT');
  });

  it('asks for eligible students to be emailed by default, and sends false when unticked', () => {
    assert.equal(buildJobPayload(validForm()).notifyEligibleStudents, true);
    assert.equal(
      buildJobPayload(validForm({ notifyEligibleStudents: false })).notifyEligibleStudents,
      false
    );
  });
});

describe('Loading a drive into the form', () => {
  it('round-trips a JobResponse through the form shape', () => {
    const job = {
      company: { id: 4, name: 'Zoho' },
      jobRole: 'Full Stack Developer',
      jobType: 'FULL_TIME',
      ctcValue: 1000000,
      vacancies: 15,
      minCgpa: 7,
      graduationYear: 2027,
      applicationDeadline: futureDate(45),
      status: 'ACTIVE',
      skills: ['Java', 'React'],
      requirements: ['7.0+ CGPA'],
      backlogsAllowed: true,
    };

    const form = jobResponseToForm(job);
    assert.equal(form.companyId, '4', 'select values are strings');
    assert.equal(form.vacancies, '15');
    assert.equal(form.backlogsAllowed, true);
    assert.deepEqual(validateJobDrive(form), {}, 'a saved drive must re-validate');

    const payload = buildJobPayload(form);
    assert.equal(payload.companyId, 4);
    assert.equal(payload.vacancies, 15);
    assert.deepEqual(payload.skills, ['Java', 'React']);
  });

  it('falls back to an empty form when there is no job', () => {
    assert.deepEqual(jobResponseToForm(null), emptyJobDrive());
  });
});
