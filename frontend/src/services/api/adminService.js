import axiosClient from './axiosClient.js';
import { buildBulkPayload, buildStudentListParams } from '../../utils/studentQuery.js';
import { buildDecisionPayload, buildVerificationParams } from './facultyService.js';

/**
 * Admin API Service
 * Maps to backend:
 * - AdminDashboardController (/api/admin/dashboard/**)
 * - AdminStudentController   (/api/admin/students/**)
 * - AdminController          (/api/admin/**)
 */

/**
 * Get calculated placement & portal statistics for Admin Dashboard.
 * GET /api/admin/dashboard/stats
 * @returns {Promise<Object>} DashboardStatsDto
 */
export const getDashboardStats = async () => {
  const response = await axiosClient.get('/admin/dashboard/stats');
  return response.data;
};

/**
 * Get paginated students with search and filters.
 * GET /api/admin/students
 * @param {Object} params - { search, department, status, minCgpa, page, size, sortBy, sortDir }
 * @returns {Promise<Object>} PageResponse<StudentSummaryDto>
 */
export const getStudents = async (params = {}) => {
  const cleanParams = {};
  if (params.search) cleanParams.search = params.search;
  if (params.department && params.department !== 'All') cleanParams.department = params.department;
  if (params.status && params.status !== 'All') cleanParams.status = params.status;
  if (params.minCgpa && params.minCgpa !== 'All') cleanParams.minCgpa = params.minCgpa;
  if (params.page !== undefined) cleanParams.page = params.page;
  if (params.size !== undefined) cleanParams.size = params.size;
  if (params.sortBy) cleanParams.sortBy = params.sortBy;
  if (params.sortDir) cleanParams.sortDir = params.sortDir;

  const response = await axiosClient.get('/admin/students', { params: cleanParams });
  return response.data;
};

/**
 * Get all students (convenience wrapper for non-paginated requests).
 * GET /api/admin/students?size=100
 */
export const getAllStudents = async () => {
  const students = [];
  let page = 0;
  let totalPages = 1;

  while (page < totalPages) {
    const response = await axiosClient.get('/admin/students', {
      params: { page, size: 100 },
    });
    const result = response?.data !== undefined ? response.data : response;

    if (Array.isArray(result)) {
      return result;
    }

    if (
      !result ||
      !Array.isArray(result.content) ||
      !Number.isInteger(result.totalPages) ||
      result.totalPages < 0
    ) {
      throw new Error('The students response has an unexpected format.');
    }

    students.push(...result.content);
    totalPages = result.totalPages;
    page += 1;
  }

  return students;
};

/**
 * Get complete student details by ID.
 * GET /api/admin/students/{id}
 * @param {number|string} id
 * @returns {Promise<Object>} StudentDetailDto
 */
export const getStudentById = async (id) => {
  const response = await axiosClient.get(`/admin/students/${id}`);
  return response.data;
};

/**
 * Create a new student record and login.
 * POST /api/admin/students
 * @param {Object} studentData - CreateStudentRequest
 */
export const createStudent = async (studentData) => {
  const response = await axiosClient.post('/admin/students', studentData);
  return response.data;
};

/**
 * Update an existing student record.
 * PUT /api/admin/students/{id}
 * @param {number|string} id
 * @param {Object} studentData - UpdateStudentRequest
 */
export const updateStudent = async (id, studentData) => {
  const response = await axiosClient.put(`/admin/students/${id}`, studentData);
  return response.data;
};

/**
 * Soft delete / deactivate student record.
 * DELETE /api/admin/students/{id}
 * @param {number|string} id
 */
export const deleteStudent = async (id) => {
  const response = await axiosClient.delete(`/admin/students/${id}`);
  return response;
};

/**
 * Add one student from a register number, department and graduation year. The register number
 * becomes the initial password; the student sets their own details at first login.
 * POST /api/admin/students/provision
 * @param {{ registerNumber: string, department: string, year: number }} data
 */
export const provisionStudent = async (data) => {
  const response = await axiosClient.post('/admin/students/provision', data);
  return response.data;
};

/**
 * Add every student in a register number range. Existing numbers are skipped.
 * POST /api/admin/students/provision/bulk
 * @param {{ registerNumberFrom: string, registerNumberTo: string, department: string, year: number }} data
 * @returns {Promise<{ requested: number, created: number, skipped: number, createdRegisterNumbers: string[], skippedRegisterNumbers: string[] }>}
 */
export const provisionStudentsBulk = async (data) => {
  // Each account is hashed on the server, so a large range takes longer than the usual timeout.
  const response = await axiosClient.post('/admin/students/provision/bulk', data, { timeout: 120000 });
  return response.data;
};

/** PATCH /api/admin/students/{id}/deactivate: blocks sign-in until reactivated. */
export const deactivateStudent = async (id) => {
  const response = await axiosClient.patch(`/admin/students/${id}/deactivate`);
  return response.data;
};

/** PATCH /api/admin/students/{id}/reactivate */
export const reactivateStudent = async (id) => {
  const response = await axiosClient.patch(`/admin/students/${id}/reactivate`);
  return response.data;
};

/** POST /api/admin/students/{id}/reset-password: back to the register number, change forced. */
export const resetStudentPassword = async (id) => {
  const response = await axiosClient.post(`/admin/students/${id}/reset-password`);
  return response;
};

/** POST /api/admin/students/profile-reminders: sends the "complete your profile" reminder now. */
export const sendProfileReminders = async () => {
  const response = await axiosClient.post('/admin/students/profile-reminders');
  return response.data;
};

/**
 * Export student records as CSV file.
 * GET /api/admin/students/export
 * @param {Object} params - { search, department, status }
 * @returns {Promise<Blob>} the interceptor returns the body itself for a blob request
 */
export const exportStudentsCsv = async (params = {}) => {
  const cleanParams = {};
  if (params.search) cleanParams.search = params.search;
  if (params.department && params.department !== 'All') cleanParams.department = params.department;
  if (params.status && params.status !== 'All') cleanParams.status = params.status;

  const response = await axiosClient.get('/admin/students/export', {
    params: cleanParams,
    responseType: 'blob',
  });
  return response;
};

/**
 * Get paginated or filtered job applications for admin.
 * GET /api/admin/applications
 * @param {Object} params - { jobId, status, page, size }
 * @returns {Promise<Object>} Page<JobApplicationResponse>
 */
export const getApplications = async (params = {}) => {
  const cleanParams = {};
  if (params.jobId) cleanParams.jobId = params.jobId;
  if (params.status && params.status !== 'All') cleanParams.status = params.status;
  if (params.page !== undefined) cleanParams.page = params.page;
  if (params.size !== undefined) cleanParams.size = params.size;

  const response = await axiosClient.get('/admin/applications', { params: cleanParams });
  return response.data;
};

/**
 * Every application matching the filters, fetched page by page (the backend caps a page at
 * 100 rows, so a single request would silently drop the rest).
 * @param {Object} params - { jobId, status }
 * @returns {Promise<Array<Object>>}
 */
export const getAllApplications = async (params = {}) => {
  const applications = [];
  let page = 0;
  let totalPages = 1;

  while (page < totalPages) {
    const result = await getApplications({ ...params, page, size: 100 });

    if (Array.isArray(result)) {
      return result;
    }
    if (
      !result ||
      !Array.isArray(result.content) ||
      !Number.isInteger(result.totalPages) ||
      result.totalPages < 0
    ) {
      throw new Error('The applications response has an unexpected format.');
    }

    applications.push(...result.content);
    totalPages = result.totalPages;
    page += 1;
  }

  return applications;
};

/**
 * Get application details with timeline.
 * GET /api/admin/applications/{id}
 * @param {number|string} id
 * @returns {Promise<Object>} JobApplicationResponse
 */
export const getApplicationById = async (id) => {
  const response = await axiosClient.get(`/admin/applications/${id}`);
  return response.data;
};

/**
 * Update the status of a job application.
 * PUT /api/admin/applications/{id}/status
 * @param {number|string} id
 * @param {Object|string} statusData - { status, currentStage, remarks } or status string
 * @returns {Promise<Object>} Updated JobApplicationResponse
 */
export const updateApplicationStatus = async (id, statusData) => {
  const payload = typeof statusData === 'string' ? { status: statusData } : statusData;
  const response = await axiosClient.put(`/admin/applications/${id}/status`, payload);
  return response.data;
};

/**
 * Add an interview stage to application timeline.
 * POST /api/admin/applications/{id}/timeline
 * @param {number|string} id
 * @param {Object} timelineData - { stageLabel, stageDate, status, remarks }
 * @returns {Promise<Object>}
 */
export const addInterviewStage = async (id, timelineData) => {
  const response = await axiosClient.post(`/admin/applications/${id}/timeline`, timelineData);
  return response.data;
};

/** Alias of addInterviewStage: adds a stage or note to an application's timeline. */
export const addTimeline = addInterviewStage;

/**
 * Get authenticated admin info.
 * GET /api/admin/me
 */
export const getAdminInfo = async () => {
  const response = await axiosClient.get('/admin/me');
  return response?.data !== undefined ? response.data : response;
};

/**
 * Get authenticated admin dashboard statistics.
 * GET /api/admin/dashboard
 */
export const getAdminDashboard = async () => {
  const response = await axiosClient.get('/admin/dashboard');
  return response?.data !== undefined ? response.data : response;
};

/**
 * Get authenticated admin profile.
 * GET /api/admin/profile
 */
export const getAdminProfile = async () => {
  const response = await axiosClient.get('/admin/profile');
  return response?.data !== undefined ? response.data : response;
};

// ------------------------------------------------------------------ student lifecycle & bulk

const payloadOf = (response) =>
  (response && typeof response === 'object' && !Array.isArray(response) && 'data' in response ? response.data : response);

/**
 * One page of students for the management screen, filtered on the server.
 * GET /api/admin/students?search&department&lifecycle&verificationStatus&batch&page&size&sortBy&sortDir
 */
export const getStudentsPage = async (filters = {}) =>
  payloadOf(await axiosClient.get('/admin/students', { params: buildStudentListParams(filters) }));

/** GET /api/admin/students/ids (same filters) → every matching id, max 5000. */
export const getStudentIds = async (filters = {}) =>
  payloadOf(await axiosClient.get('/admin/students/ids', { params: buildStudentListParams(filters, { paged: false }) }));

/** POST /api/admin/students/bulk → {requested, succeeded, skipped, failed: [{studentId, reason}]} */
export const bulkStudentAction = async (ids, action, reason) =>
  payloadOf(await axiosClient.post('/admin/students/bulk', buildBulkPayload(ids, action, reason), { timeout: 120000 }));

/** GET /api/admin/students/archive-batch/preview?batch&departmentCode → {count, batch, departmentCode} (ADMIN) */
export const previewArchiveBatch = async ({ batch, departmentCode } = {}) => {
  const params = { batch: String(batch ?? '').trim() };
  if (departmentCode) params.departmentCode = departmentCode;
  return payloadOf(await axiosClient.get('/admin/students/archive-batch/preview', { params }));
};

/** POST /api/admin/students/archive-batch {batch, departmentCode?, reason?} → bulk result (ADMIN) */
export const archiveBatch = async ({ batch, departmentCode, reason } = {}) => {
  const body = { batch: String(batch ?? '').trim() };
  if (departmentCode) body.departmentCode = departmentCode;
  if (reason && String(reason).trim()) body.reason = String(reason).trim().slice(0, 255);
  return payloadOf(await axiosClient.post('/admin/students/archive-batch', body, { timeout: 120000 }));
};

// ------------------------------------------------------------------ faculty accounts (ADMIN)

/** Request body for creating/updating a faculty account; blank optional fields are left out. */
export const buildFacultyPayload = (form = {}, { replaceExisting = false } = {}) => {
  const text = (v) => (String(v ?? '').trim() === '' ? undefined : String(v).trim());
  const body = { fullName: text(form.fullName) };
  ['email', 'phone', 'designation'].forEach((k) => {
    const v = text(form[k]);
    if (v !== undefined) body[k] = v;
  });
  const dept = form.departmentId;
  body.departmentId = dept === '' || dept === undefined || dept === null ? null : Number(dept);
  if (replaceExisting) body.replaceExisting = true;
  return body;
};

export const getFacultyAccounts = async () => payloadOf(await axiosClient.get('/admin/faculty'));

/** POST /api/admin/faculty → {faculty, temporaryPassword} */
export const createFacultyAccount = async (form, options) =>
  payloadOf(await axiosClient.post('/admin/faculty', buildFacultyPayload(form, options)));

export const updateFacultyAccount = async (id, form, options) =>
  payloadOf(await axiosClient.put(`/admin/faculty/${id}`, buildFacultyPayload(form, options)));

export const disableFacultyAccount = async (id) => payloadOf(await axiosClient.patch(`/admin/faculty/${id}/disable`));
export const enableFacultyAccount = async (id) => payloadOf(await axiosClient.patch(`/admin/faculty/${id}/enable`));

/** POST /api/admin/faculty/{id}/reset-password → {faculty, temporaryPassword} */
export const resetFacultyPassword = async (id) =>
  payloadOf(await axiosClient.post(`/admin/faculty/${id}/reset-password`));

// ------------------------------------------------------------------ verifications (ADMIN fallback)

export const getAdminVerifications = async (filters = {}) =>
  payloadOf(await axiosClient.get('/admin/verifications', { params: buildVerificationParams(filters) }));

export const getAdminVerificationSummary = async () => payloadOf(await axiosClient.get('/admin/verifications/summary'));

export const getAdminVerification = async (id) => payloadOf(await axiosClient.get(`/admin/verifications/${id}`));

export const approveAdminVerification = async (id, comment) =>
  payloadOf(await axiosClient.post(`/admin/verifications/${id}/approve`, buildDecisionPayload('approve', { comment })));

export const rejectAdminVerification = async (id, comment, sectionComments) =>
  payloadOf(await axiosClient.post(`/admin/verifications/${id}/reject`, buildDecisionPayload('reject', { comment, sectionComments })));

// ------------------------------------------------------------------ audit log (ADMIN)

/** GET /api/admin/audit-logs?page&size&action&entityType → PagedResponse */
export const getAuditLogs = async ({ page = 0, size = 20, action, entityType } = {}) => {
  const params = { page, size };
  if (action && String(action).trim()) params.action = String(action).trim();
  if (entityType && String(entityType).trim()) params.entityType = String(entityType).trim();
  return payloadOf(await axiosClient.get('/admin/audit-logs', { params }));
};

const adminService = {
  getStudentsPage,
  getStudentIds,
  bulkStudentAction,
  previewArchiveBatch,
  archiveBatch,
  getFacultyAccounts,
  createFacultyAccount,
  updateFacultyAccount,
  disableFacultyAccount,
  enableFacultyAccount,
  resetFacultyPassword,
  getAdminVerifications,
  getAdminVerificationSummary,
  getAdminVerification,
  approveAdminVerification,
  rejectAdminVerification,
  getAuditLogs,
  getDashboardStats,
  getStudents,
  getAllStudents,
  getStudentById,
  createStudent,
  provisionStudent,
  provisionStudentsBulk,
  deactivateStudent,
  reactivateStudent,
  resetStudentPassword,
  sendProfileReminders,
  updateStudent,
  deleteStudent,
  exportStudentsCsv,
  getApplications,
  getAllApplications,
  getApplicationById,
  updateApplicationStatus,
  addInterviewStage,
  addTimeline,
  getAdminInfo,
  getAdminDashboard,
  getAdminProfile,
};

export default adminService;
