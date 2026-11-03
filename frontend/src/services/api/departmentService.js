import axiosClient from './axiosClient.js';

/**
 * Department API Service
 * Maps to backend AdminDepartmentController (/api/admin/departments/**)
 */

/**
 * Every department, active or not, with how many students each has.
 * GET /api/admin/departments
 * @returns {Promise<Array<{ id: number, code: string, name: string, isActive: boolean, studentCount: number }>>}
 */
export const getDepartments = async () => {
  const response = await axiosClient.get('/admin/departments');
  return response.data;
};

/**
 * Add a department. The code is fixed once created.
 * POST /api/admin/departments
 * @param {{ code: string, name: string }} data
 */
export const createDepartment = async (data) => {
  const response = await axiosClient.post('/admin/departments', data);
  return response.data;
};

/**
 * Rename a department, or switch it on or off.
 * PUT /api/admin/departments/{id}
 * @param {number|string} id
 * @param {{ name?: string, isActive?: boolean }} data
 */
export const updateDepartment = async (id, data) => {
  const response = await axiosClient.put(`/admin/departments/${id}`, data);
  return response.data;
};

/**
 * Delete a department nothing refers to.
 * DELETE /api/admin/departments/{id}
 */
export const deleteDepartment = async (id) => {
  const response = await axiosClient.delete(`/admin/departments/${id}`);
  return response;
};

const departmentService = {
  getDepartments,
  createDepartment,
  updateDepartment,
  deleteDepartment,
};

export default departmentService;
