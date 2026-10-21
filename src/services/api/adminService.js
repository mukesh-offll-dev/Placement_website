import axiosClient from './axiosClient.js';

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
  const response = await axiosClient.get('/admin/students', { params: { size: 100 } });
  return response.data;
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
 * Export student records as CSV file.
 * GET /api/admin/students/export
 * @param {Object} params - { search, department, status }
 * @returns {Promise<Blob>}
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

/**
 * Get admin profile details.
 * GET /api/admin/profile
 */
const adminService = {
  getDashboardStats,
  getStudents,
  getAllStudents,
  getStudentById,
  createStudent,
  updateStudent,
  deleteStudent,
  exportStudentsCsv,
  getApplications,
  getApplicationById,
  updateApplicationStatus,
  addInterviewStage,
  getAdminInfo,
  getAdminDashboard,
  getAdminProfile,
};

export default adminService;
