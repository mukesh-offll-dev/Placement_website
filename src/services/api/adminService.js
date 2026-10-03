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
  return response.data;
};

/**
 * Get summary list of all registered students.
 * GET /api/admin/students
 */
export const getAllStudents = async () => {
  const response = await axiosClient.get('/admin/students');
  return response.data;
};

const adminService = {
  getAdminInfo,
  getAllStudents,
};

export default adminService;
