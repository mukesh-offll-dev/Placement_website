import assert from 'node:assert/strict';
import { afterEach, test } from 'node:test';

// authService touches localStorage when storing a token.
const store = {};
globalThis.localStorage = globalThis.localStorage || {
  getItem: (k) => (k in store ? store[k] : null),
  setItem: (k, v) => { store[k] = String(v); },
  removeItem: (k) => { delete store[k]; },
  clear: () => Object.keys(store).forEach((k) => delete store[k]),
};

const { default: axiosClient } = await import('./axiosClient.js');
const {
  buildDecisionPayload,
  buildVerificationParams,
  bulkFacultyStudents,
  getFacultyStudentIds,
  getFacultyStudents,
  rejectFacultyVerification,
} = await import('./facultyService.js');
const {
  archiveBatch,
  buildFacultyPayload,
  bulkStudentAction,
  createFacultyAccount,
  getAuditLogs,
  previewArchiveBatch,
} = await import('./adminService.js');
const { buildCreateDepartmentPayload, normalizeCreateDepartmentResult } = await import('./departmentService.js');
const { changeStaffPassword } = await import('./authService.js');
const { adminStudentApi, facultyStudentApi, facultyVerificationApi } = await import('./studentManagementApi.js');

const original = { get: axiosClient.get, post: axiosClient.post };
afterEach(() => {
  axiosClient.get = original.get;
  axiosClient.post = original.post;
});

const capture = (method, response) => {
  const calls = [];
  axiosClient[method] = async (...args) => {
    calls.push(args);
    return response;
  };
  return calls;
};

test('faculty student list and ids use the shared filter builder', async () => {
  const calls = capture('get', { data: { content: [], totalElements: 0 } });
  await getFacultyStudents({ search: 'asha', lifecycle: 'ALL', verificationStatus: 'PENDING', page: 1, size: 20 });
  await getFacultyStudentIds({ search: 'asha', lifecycle: 'ARCHIVED', page: 4, size: 20 });
  assert.equal(calls[0][0], '/faculty/students');
  assert.deepEqual(calls[0][1].params, { search: 'asha', lifecycle: 'ALL', verificationStatus: 'PENDING', page: 1, size: 20 });
  assert.equal(calls[1][0], '/faculty/students/ids');
  assert.deepEqual(calls[1][1].params, { search: 'asha', lifecycle: 'ARCHIVED' });
});

test('bulk endpoints post the normalised payload and return the result', async () => {
  const result = { requested: 2, succeeded: 2, skipped: 0, failed: [] };
  const calls = capture('post', { data: result });
  assert.deepEqual(await bulkFacultyStudents(['4', 5], 'disable'), result);
  assert.deepEqual(await bulkStudentAction([7], 'RESTORE', ' back '), result);
  assert.deepEqual(calls[0].slice(0, 2), ['/faculty/students/bulk', { studentIds: [4, 5], action: 'DISABLE' }]);
  assert.deepEqual(calls[1].slice(0, 2), ['/admin/students/bulk', { studentIds: [7], action: 'RESTORE', reason: 'back' }]);
});

test('decision payloads: reject needs a comment, section comments are trimmed and upper-cased', () => {
  assert.throws(() => buildDecisionPayload('reject', { comment: '  ' }), /comment is required/);
  assert.deepEqual(buildDecisionPayload('approve', {}), {});
  assert.deepEqual(buildDecisionPayload('approve', { comment: ' ok ' }), { comment: 'ok' });
  assert.deepEqual(
    buildDecisionPayload('reject', { comment: 'Fix CGPA', sectionComments: { academic: ' wrong ', skills: '' } }),
    { comment: 'Fix CGPA', sectionComments: { ACADEMIC: 'wrong' } }
  );
});

test('rejectFacultyVerification refuses an empty comment before any request', async () => {
  const calls = capture('post', { data: null });
  await assert.rejects(rejectFacultyVerification(3, ''), /comment is required/);
  assert.equal(calls.length, 0);
});

test('buildVerificationParams keeps known statuses only', () => {
  assert.deepEqual(buildVerificationParams({ status: 'pending', search: ' x ', departmentCode: 'CSE', page: 0, size: 15 }), {
    status: 'PENDING', search: 'x', departmentCode: 'CSE', page: 0, size: 15,
  });
  assert.deepEqual(buildVerificationParams({ status: 'weird', departmentCode: 'All' }), {});
});

test('archive batch preview and submit', async () => {
  const getCalls = capture('get', { data: { count: 42, batch: '2026', departmentCode: 'CSE' } });
  assert.deepEqual(await previewArchiveBatch({ batch: ' 2026 ', departmentCode: 'CSE' }), { count: 42, batch: '2026', departmentCode: 'CSE' });
  assert.deepEqual(getCalls[0][1].params, { batch: '2026', departmentCode: 'CSE' });
  const postCalls = capture('post', { data: { requested: 42, succeeded: 42, skipped: 0, failed: [] } });
  await archiveBatch({ batch: '2026', departmentCode: '', reason: '' });
  assert.deepEqual(postCalls[0][1], { batch: '2026' });
});

test('faculty account payloads', async () => {
  assert.deepEqual(buildFacultyPayload({ fullName: ' Dr. A ', email: '', phone: ' 98 ', designation: '', departmentId: '3' }), {
    fullName: 'Dr. A', phone: '98', departmentId: 3,
  });
  assert.deepEqual(buildFacultyPayload({ fullName: 'B', departmentId: '' }, { replaceExisting: true }), {
    fullName: 'B', departmentId: null, replaceExisting: true,
  });
  const calls = capture('post', { data: { faculty: { id: 1 }, temporaryPassword: 'Xy7@abcdEFGH' } });
  const result = await createFacultyAccount({ fullName: 'C', departmentId: 2 });
  assert.equal(result.temporaryPassword, 'Xy7@abcdEFGH');
  assert.equal(calls[0][0], '/admin/faculty');
});

test('audit log params skip blank filters', async () => {
  const calls = capture('get', { data: { content: [] } });
  await getAuditLogs({ page: 2, size: 10, action: ' ', entityType: 'STUDENT' });
  assert.deepEqual(calls[0][1].params, { page: 2, size: 10, entityType: 'STUDENT' });
});

test('department create payload and result normalisation', () => {
  assert.deepEqual(buildCreateDepartmentPayload({ code: ' aids ', name: ' AI ', createFacultyAccount: false, facultyName: 'x' }), { code: 'aids', name: 'AI' });
  assert.deepEqual(
    buildCreateDepartmentPayload({ code: 'AIDS', name: 'AI', createFacultyAccount: true, facultyName: ' Dr X ', facultyEmail: '' }),
    { code: 'AIDS', name: 'AI', createFacultyAccount: true, facultyName: 'Dr X' }
  );
  assert.deepEqual(normalizeCreateDepartmentResult({ department: { id: 1 }, faculty: null, temporaryPassword: null }), { department: { id: 1 }, faculty: null, temporaryPassword: null });
  assert.deepEqual(normalizeCreateDepartmentResult({ id: 1, code: 'X' }), { department: { id: 1, code: 'X' }, faculty: null, temporaryPassword: null });
});

test('changeStaffPassword posts to /auth/change-password and stores the new token', async () => {
  localStorage.clear();
  const calls = capture('post', { data: { token: 'a.b.c', userId: 9, email: 'f@x.in', role: 'FACULTY_ADVISOR', passwordChangeRequired: false } });
  const data = await changeStaffPassword({ currentPassword: 'Temp@1234', newPassword: 'NewPass1' });
  assert.deepEqual(calls[0].slice(0, 2), ['/auth/change-password', { currentPassword: 'Temp@1234', newPassword: 'NewPass1' }]);
  assert.equal(data.role, 'FACULTY_ADVISOR');
  assert.equal(localStorage.getItem('placement_jwt'), 'a.b.c');
  assert.equal(JSON.parse(localStorage.getItem('placement_user')).passwordChangeRequired, false);
});

test('student and verification api adapters point at the right portals', () => {
  assert.equal(adminStudentApi.detailPath(5), '/admin/students/5');
  assert.equal(facultyStudentApi.detailPath(5), '/faculty/students/5');
  assert.equal(facultyVerificationApi.basePath, '/faculty/verifications');
  for (const api of [adminStudentApi, facultyStudentApi]) {
    for (const fn of ['list', 'ids', 'get', 'provision', 'provisionBulk', 'update', 'deactivate', 'reactivate', 'resetPassword', 'remove', 'bulk']) {
      assert.equal(typeof api[fn], 'function', `${api.scope}.${fn}`);
    }
  }
});
