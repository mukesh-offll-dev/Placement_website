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
 * Add a department. The code is fixed once created. Optionally creates its faculty advisor
 * account at the same time ({ createFacultyAccount: true, facultyName, facultyEmail? }).
 * POST /api/admin/departments
 * @param {{ code: string, name: string, createFacultyAccount?: boolean, facultyName?: string, facultyEmail?: string }} data
 * @returns {Promise<{ department: object, faculty: object|null, temporaryPassword: string|null }>}
 */
export const createDepartment = async (data) => {
  const response = await axiosClient.post('/admin/departments', buildCreateDepartmentPayload(data));
  return normalizeCreateDepartmentResult(response?.data);
};

/** Request body for POST /admin/departments; faculty fields are sent only when asked for. */
export const buildCreateDepartmentPayload = (data = {}) => {
  const body = { code: String(data.code ?? '').trim(), name: String(data.name ?? '').trim() };
  if (data.createFacultyAccount) {
    body.createFacultyAccount = true;
    const name = String(data.facultyName ?? '').trim();
    const email = String(data.facultyEmail ?? '').trim();
    if (name) body.facultyName = name;
    if (email) body.facultyEmail = email;
  }
  return body;
};

/**
 * The create response is { department, faculty, temporaryPassword }; an older backend returned the
 * DepartmentResponse itself. Either way the caller gets the same shape.
 */
export const normalizeCreateDepartmentResult = (data) => {
  if (data && typeof data === 'object' && 'department' in data) {
    return {
      department: data.department || null,
      faculty: data.faculty || null,
      temporaryPassword: data.temporaryPassword || null,
    };
  }
  return { department: data || null, faculty: null, temporaryPassword: null };
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
