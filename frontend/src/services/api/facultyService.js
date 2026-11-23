import axiosClient from './axiosClient.js';
import { buildBulkPayload, buildStudentListParams } from '../../utils/studentQuery.js';

/**
 * Faculty advisor API (/api/faculty/**). Every query is scoped by the backend to the advisor's own
 * department; the department is never sent from here except where a request body requires it.
 */

const unwrap = (response) => (response && typeof response === 'object' && 'data' in response ? response.data : response);

/** GET /faculty/me → {id, userId, fullName, email, phone, designation, department: {id, code, name}|null} */
export const getFacultyMe = async () => unwrap(await axiosClient.get('/faculty/me'));

/** GET /faculty/dashboard */
export const getFacultyDashboard = async () => unwrap(await axiosClient.get('/faculty/dashboard'));

// ------------------------------------------------------------------ students

/** GET /faculty/students → PagedResponse<StudentSummaryDto> */
export const getFacultyStudents = async (filters = {}) =>
  unwrap(await axiosClient.get('/faculty/students', { params: buildStudentListParams(filters) }));

/** GET /faculty/students/ids → number[] (max 5000), same filters as the list */
export const getFacultyStudentIds = async (filters = {}) =>
  unwrap(await axiosClient.get('/faculty/students/ids', { params: buildStudentListParams(filters, { paged: false }) }));

/** GET /faculty/students/{id} → StudentDetailDto */
export const getFacultyStudentById = async (id) => unwrap(await axiosClient.get(`/faculty/students/${id}`));

/** POST /faculty/students/provision ({ registerNumber, department, year }; the backend forces the department) */
export const provisionFacultyStudent = async (data) =>
  unwrap(await axiosClient.post('/faculty/students/provision', data));

/** POST /faculty/students/provision/bulk */
export const provisionFacultyStudentsBulk = async (data) =>
  unwrap(await axiosClient.post('/faculty/students/provision/bulk', data, { timeout: 120000 }));

/** PUT /faculty/students/{id} (department ignored by the backend) */
export const updateFacultyStudent = async (id, data) =>
  unwrap(await axiosClient.put(`/faculty/students/${id}`, data));

export const deactivateFacultyStudent = async (id) =>
  unwrap(await axiosClient.patch(`/faculty/students/${id}/deactivate`));

export const reactivateFacultyStudent = async (id) =>
  unwrap(await axiosClient.patch(`/faculty/students/${id}/reactivate`));

export const resetFacultyStudentPassword = async (id) =>
  unwrap(await axiosClient.post(`/faculty/students/${id}/reset-password`));

export const deleteFacultyStudent = async (id) =>
  unwrap(await axiosClient.delete(`/faculty/students/${id}`));

/** POST /faculty/students/bulk → {requested, succeeded, skipped, failed: [{studentId, reason}]} */
export const bulkFacultyStudents = async (ids, action, reason) =>
  unwrap(await axiosClient.post('/faculty/students/bulk', buildBulkPayload(ids, action, reason), { timeout: 120000 }));

// ------------------------------------------------------------------ verifications

/** Query params for verification lists (shared with the admin fallback). */
export const buildVerificationParams = ({ status, search, departmentCode, page, size } = {}) => {
  const params = {};
  const s = String(status || '').toUpperCase();
  if (['PENDING', 'APPROVED', 'REJECTED', 'ALL'].includes(s)) params.status = s;
  if (search && String(search).trim()) params.search = String(search).trim();
  if (departmentCode && departmentCode !== 'All') params.departmentCode = departmentCode;
  if (Number.isInteger(page) && page >= 0) params.page = page;
  if (Number.isInteger(size) && size > 0) params.size = size;
  return params;
};

/** Body for an approve/reject decision; reject requires a comment (1..2000 chars). */
export const buildDecisionPayload = (decision, { comment, sectionComments } = {}) => {
  const text = String(comment ?? '').trim();
  if (decision === 'reject') {
    if (!text) throw new Error('A comment is required to reject a request.');
    if (text.length > 2000) throw new Error('The comment can be at most 2000 characters.');
    const sections = {};
    Object.entries(sectionComments || {}).forEach(([key, value]) => {
      const v = String(value ?? '').trim();
      if (v) sections[String(key).toUpperCase()] = v.slice(0, 2000);
    });
    return Object.keys(sections).length ? { comment: text, sectionComments: sections } : { comment: text };
  }
  if (text.length > 2000) throw new Error('The comment can be at most 2000 characters.');
  return text ? { comment: text } : {};
};

export const getFacultyVerifications = async (filters = {}) =>
  unwrap(await axiosClient.get('/faculty/verifications', { params: buildVerificationParams(filters) }));

export const getFacultyVerificationSummary = async () =>
  unwrap(await axiosClient.get('/faculty/verifications/summary'));

export const getFacultyVerification = async (id) =>
  unwrap(await axiosClient.get(`/faculty/verifications/${id}`));

export const approveFacultyVerification = async (id, comment) =>
  unwrap(await axiosClient.post(`/faculty/verifications/${id}/approve`, buildDecisionPayload('approve', { comment })));

export const rejectFacultyVerification = async (id, comment, sectionComments) =>
  unwrap(await axiosClient.post(`/faculty/verifications/${id}/reject`, buildDecisionPayload('reject', { comment, sectionComments })));

const facultyService = {
  getFacultyMe,
  getFacultyDashboard,
  getFacultyStudents,
  getFacultyStudentIds,
  getFacultyStudentById,
  provisionFacultyStudent,
  provisionFacultyStudentsBulk,
  updateFacultyStudent,
  deactivateFacultyStudent,
  reactivateFacultyStudent,
  resetFacultyStudentPassword,
  deleteFacultyStudent,
  bulkFacultyStudents,
  getFacultyVerifications,
  getFacultyVerificationSummary,
  getFacultyVerification,
  approveFacultyVerification,
  rejectFacultyVerification,
};

export default facultyService;
