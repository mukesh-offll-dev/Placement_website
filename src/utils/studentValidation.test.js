import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  MAX_BULK,
  normalizeRegisterNumber,
  registerNumberError,
  batchForYear,
  yearFromBatch,
  expandRegisterRange,
  validateProvisionForm,
  validateBulkForm,
  passwordChecks,
  validateSetupForm,
  validateStudentEditForm,
  validateDepartmentForm,
  parseSkills,
  buildStudentEditPayload,
} from './studentValidation.js';

describe('register numbers', () => {
  it('are trimmed and uppercased', () => {
    assert.equal(normalizeRegisterNumber('  cs-2022-01 '), 'CS-2022-01');
    assert.equal(normalizeRegisterNumber(null), '');
  });

  it('must be exactly 12 digits', () => {
    assert.ok(registerNumberError(''));
    assert.ok(registerNumberError('83012310403'));
    assert.ok(registerNumberError('8301231040321'));
    assert.ok(registerNumberError('83012310403A'));
    assert.ok(registerNumberError('8301 2310 4032'));
    assert.equal(registerNumberError(' 811521104001 '), '');
    assert.equal(registerNumberError('830123104032'), '');
  });

  it('give the batch and graduation year', () => {
    assert.equal(batchForYear(2026), '2022-2026');
    assert.equal(batchForYear(''), '');
    assert.equal(yearFromBatch('2022-2026'), '2026');
    assert.equal(yearFromBatch(null), '');
  });
});

describe('register number ranges', () => {
  it('run from the first to the last, keeping leading zeros', () => {
    assert.deepEqual(expandRegisterRange('811521104001', '811521104003').numbers,
      ['811521104001', '811521104002', '811521104003']);
    assert.deepEqual(expandRegisterRange('830123104009', '830123104011').numbers, ['830123104009', '830123104010', '830123104011']);
  });

  it('wait quietly until both ends are filled in', () => {
    assert.deepEqual(expandRegisterRange('', '830123104011'), { numbers: [], error: '' });
  });

  it('explain what is wrong with a bad range', () => {
    // Purely numeric numbers differing in the middle span far more than the cap allows.
    assert.match(expandRegisterRange('811521104001', '811621104005').error, /at most/i);
    assert.match(expandRegisterRange('830123104001', '83012310405').error, /12 digits/i);
    assert.match(expandRegisterRange('830123104010', '830123104005').error, /after/i);
    assert.match(expandRegisterRange('ABCDEFGHIJKL', 'ABCDEFGHIJKZ').error, /digits/i);
    assert.match(expandRegisterRange('830123104001', '830123104101').error, /at most/i);
    assert.equal(expandRegisterRange('830123104001', '830123104100').numbers.length, MAX_BULK);
  });
});

describe('add student forms', () => {
  it('require a valid register number, department and year', () => {
    assert.deepEqual(Object.keys(validateProvisionForm({ registerNumber: '', department: '', year: '' })).sort(),
      ['department', 'registerNumber', 'year']);
    assert.deepEqual(validateProvisionForm({ registerNumber: '811521104001', department: 'Civil Engineering', year: '2026' }), {});
    assert.ok(validateProvisionForm({ registerNumber: '811521104001', department: 'Civil Engineering', year: '1850' }).year);
  });

  it('check the bulk range as well as the other fields', () => {
    const ok = { registerNumberFrom: '830123104001', registerNumberTo: '830123104040', department: 'Electronics (ECE)', year: 2026 };
    assert.deepEqual(validateBulkForm(ok), {});
    assert.ok(validateBulkForm({ ...ok, registerNumberTo: '830123104000' }).registerNumberTo);
    assert.ok(validateBulkForm({ ...ok, registerNumberFrom: '' }).registerNumberFrom);
  });
});

describe('department form', () => {
  const existing = [
    { id: 1, code: 'CSE', name: 'Computer Science and Engineering' },
    { id: 2, code: 'MCT', name: 'Mechatronics Engineering' },
  ];

  it('accepts a new code and name', () => {
    assert.deepEqual(validateDepartmentForm({ code: 'aids', name: 'Artificial Intelligence and Data Science' }, existing), {});
  });

  it('requires both, and a well-formed code', () => {
    assert.deepEqual(Object.keys(validateDepartmentForm({ code: '', name: '' }, existing)).sort(), ['code', 'name']);
    assert.ok(validateDepartmentForm({ code: '1AB', name: 'Starts With Digit' }, existing).code);
    assert.ok(validateDepartmentForm({ code: 'A', name: 'Too Short Code' }, existing).code);
    assert.ok(validateDepartmentForm({ code: 'TOOLONGCODE1', name: 'Too Long Code' }, existing).code);
    assert.ok(validateDepartmentForm({ code: 'AB-1', name: 'Has A Dash' }, existing).code);
    assert.ok(validateDepartmentForm({ code: 'XY', name: 'ab' }, existing).name);
  });

  it('refuses a code or name that already exists, ignoring case', () => {
    assert.match(validateDepartmentForm({ code: 'cse', name: 'Something Else' }, existing).code, /already exists/);
    assert.ok(validateDepartmentForm({ code: 'NEW', name: 'mechatronics engineering' }, existing).name);
  });

  it('lets a department keep its own name when renaming', () => {
    assert.deepEqual(validateDepartmentForm({ id: 2, code: 'MCT', name: 'Mechatronics Engineering' }, existing.filter((d) => d.id !== 2)), {});
  });
});

describe('first-login setup form', () => {
  const valid = {
    fullName: 'Asha Rao', email: 'asha@example.com', phone: '9876543210',
    newPassword: 'NewPass@2026', confirmPassword: 'NewPass@2026',
  };

  it('accepts a complete form', () => {
    assert.deepEqual(validateSetupForm(valid, '811521104001'), {});
  });

  it('lists which password rules are met', () => {
    const checks = passwordChecks('abc', '811521104001');
    assert.equal(checks.find((c) => c.id === 'length').ok, false);
    assert.equal(checks.find((c) => c.id === 'lower').ok, true);
    assert.equal(checks.find((c) => c.id === 'upper').ok, false);
    assert.equal(passwordChecks('Abcdefg1', '').every((c) => c.ok), true);
  });

  it('refuses the register number as the new password, in any case', () => {
    const errors = validateSetupForm({ ...valid, newPassword: '830123104001', confirmPassword: '830123104001' }, '830123104001');
    assert.ok(errors.newPassword);
  });

  it('checks every field', () => {
    const errors = validateSetupForm({ fullName: '', email: 'nope', phone: '12', newPassword: 'weak', confirmPassword: 'other' });
    assert.deepEqual(Object.keys(errors).sort(), ['confirmPassword', 'email', 'fullName', 'newPassword', 'phone']);
    assert.ok(validateSetupForm({ ...valid, email: 'x@pending.gces.local' }).email);
    assert.ok(validateSetupForm({ ...valid, confirmPassword: 'Different@2026' }).confirmPassword);
  });
});

describe('admin edit form', () => {
  const valid = {
    fullName: 'Asha Rao', email: 'asha@example.com', department: 'Information Technology', year: '2026',
    cgpa: '8.5', totalBacklogs: '2', activeBacklogs: '1', placementStatus: 'ACTIVE',
    placedCompanyId: '', placedCtc: '', skills: 'Java, React',
  };

  it('accepts a valid profile', () => {
    assert.deepEqual(validateStudentEditForm(valid), {});
  });

  it('keeps CGPA within 0 to 10 with at most two decimals', () => {
    assert.ok(validateStudentEditForm({ ...valid, cgpa: '10.5' }).cgpa);
    assert.ok(validateStudentEditForm({ ...valid, cgpa: '-1' }).cgpa);
    assert.ok(validateStudentEditForm({ ...valid, cgpa: '8.555' }).cgpa);
    assert.ok(validateStudentEditForm({ ...valid, cgpa: 'abc' }).cgpa);
    assert.deepEqual(validateStudentEditForm({ ...valid, cgpa: '' }), {});
  });

  it('keeps active backlogs within total backlogs', () => {
    assert.ok(validateStudentEditForm({ ...valid, totalBacklogs: '1', activeBacklogs: '3' }).activeBacklogs);
    assert.ok(validateStudentEditForm({ ...valid, activeBacklogs: '-1' }).activeBacklogs);
    assert.ok(validateStudentEditForm({ ...valid, activeBacklogs: '1.5' }).activeBacklogs);
  });

  it('asks for the company when the student is placed', () => {
    assert.ok(validateStudentEditForm({ ...valid, placementStatus: 'PLACED' }).placedCompanyId);
    assert.deepEqual(validateStudentEditForm({ ...valid, placementStatus: 'PLACED', placedCompanyId: '4', placedCtc: '1200000' }), {});
  });

  it('rejects the stand-in email and a bad year', () => {
    assert.ok(validateStudentEditForm({ ...valid, email: 'a@pending.gces.local' }).email);
    assert.ok(validateStudentEditForm({ ...valid, year: '1700' }).year);
  });

  it('parses skills, dropping blanks and duplicates', () => {
    assert.deepEqual(parseSkills(' Java, React ,, Java, SQL '), ['Java', 'React', 'SQL']);
    assert.deepEqual(parseSkills(''), []);
  });

  it('builds a payload that leaves blank fields out', () => {
    const payload = buildStudentEditPayload({ ...valid, cgpa: '', placementStatus: 'PLACED', placedCompanyId: '4', placedCtc: '800000' });
    assert.equal(payload.fullName, 'Asha Rao');
    assert.equal(payload.year, 2026);
    assert.equal(payload.cgpa, undefined);
    assert.equal(payload.placedCompanyId, 4);
    assert.equal(payload.placedCtc, 800000);
    assert.deepEqual(payload.skills, ['Java', 'React']);
  });
});
