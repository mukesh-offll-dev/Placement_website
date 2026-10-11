import axiosClient from './axiosClient.js';

/**
 * Admin API Service
 * Maps to backend AdminController (/api/admin/**)
 */

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
 * Get summary list of all registered students.
 * GET /api/admin/students
 */
export const getAllStudents = async () => {
  const response = await axiosClient.get('/admin/students');
  return response?.data !== undefined ? response.data : response;
};

/**
 * Get student summary by ID from registered students list.
 * @param {number|string} studentId
 */
export const getStudentById = async (studentId) => {
  const students = await getAllStudents();
  const idNum = Number(studentId);
  return (Array.isArray(students) ? students : []).find((s) => s.id === idNum) || null;
};

const adminService = {
  getAdminInfo,
  getAdminDashboard,
  getAdminProfile,
  getAllStudents,
  getStudentById,
};

export default adminService;
