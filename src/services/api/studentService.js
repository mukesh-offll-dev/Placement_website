import axiosClient from './axiosClient.js';

/**
 * Student API Service
 * Maps to backend:
 * - StudentController (/api/student/me, /api/student/dashboard)
 * - StudentProfileController (/api/student/profile)
 */

/**
 * Get authenticated student's profile summary.
 * GET /api/student/me
 */
export const getMyProfileSummary = async () => {
  const response = await axiosClient.get('/student/me');
  return response?.data !== undefined ? response.data : response;
};

/**
 * Get authenticated student's dashboard statistics.
 * GET /api/student/dashboard
 */
export const getStudentDashboard = async () => {
  const response = await axiosClient.get('/student/dashboard');
  return response?.data !== undefined ? response.data : response;
};

/**
 * Get authenticated student's detailed profile.
 * GET /api/student/profile
 */
export const getProfile = async () => {
  const response = await axiosClient.get('/student/profile');
  return response?.data !== undefined ? response.data : response;
};

/**
 * Create profile for authenticated student.
 * POST /api/student/profile
 * @param {Object} profileData - StudentProfileRequest
 */
export const createProfile = async (profileData) => {
  const response = await axiosClient.post('/student/profile', profileData);
  return response?.data !== undefined ? response.data : response;
};

/**
 * Update profile for authenticated student.
 * PUT /api/student/profile
 * @param {Object} profileData - StudentProfileRequest
 */
export const updateProfile = async (profileData) => {
  const response = await axiosClient.put('/student/profile', profileData);
  return response?.data !== undefined ? response.data : response;
};

const studentService = {
  getMyProfileSummary,
  getStudentDashboard,
  getProfile,
  createProfile,
  updateProfile,
};

export default studentService;
