import {
  getStudentsPage,
  getStudentIds,
  getStudentById,
  provisionStudent,
  provisionStudentsBulk,
  updateStudent,
  deactivateStudent,
  reactivateStudent,
  resetStudentPassword,
  deleteStudent,
  bulkStudentAction,
  getAdminVerifications,
  getAdminVerificationSummary,
  getAdminVerification,
  approveAdminVerification,
  rejectAdminVerification,
} from './adminService.js';
import {
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
} from './facultyService.js';

/**
 * One interface over the admin and faculty student endpoints, so the shared student-management
 * and verification components take an `api` prop and do not care who is signed in.
 */

const payload = (r) => (r && typeof r === 'object' && !Array.isArray(r) && 'data' in r && !('content' in r) ? r.data : r);

export const adminStudentApi = Object.freeze({
  scope: 'admin',
  list: getStudentsPage,
  ids: getStudentIds,
  get: async (id) => payload(await getStudentById(id)),
  provision: provisionStudent,
  provisionBulk: provisionStudentsBulk,
  update: updateStudent,
  deactivate: deactivateStudent,
  reactivate: reactivateStudent,
  resetPassword: resetStudentPassword,
  remove: deleteStudent,
  bulk: bulkStudentAction,
  detailPath: (id) => `/admin/students/${id}`,
});

export const facultyStudentApi = Object.freeze({
  scope: 'faculty',
  list: getFacultyStudents,
  ids: getFacultyStudentIds,
  get: getFacultyStudentById,
  provision: provisionFacultyStudent,
  provisionBulk: provisionFacultyStudentsBulk,
  update: updateFacultyStudent,
  deactivate: deactivateFacultyStudent,
  reactivate: reactivateFacultyStudent,
  resetPassword: resetFacultyStudentPassword,
  remove: deleteFacultyStudent,
  bulk: bulkFacultyStudents,
  detailPath: (id) => `/faculty/students/${id}`,
});

export const adminVerificationApi = Object.freeze({
  scope: 'admin',
  list: getAdminVerifications,
  summary: getAdminVerificationSummary,
  get: getAdminVerification,
  approve: approveAdminVerification,
  reject: rejectAdminVerification,
  basePath: '/admin/verifications',
  studentPath: (id) => `/admin/students/${id}`,
});

export const facultyVerificationApi = Object.freeze({
  scope: 'faculty',
  list: getFacultyVerifications,
  summary: getFacultyVerificationSummary,
  get: getFacultyVerification,
  approve: approveFacultyVerification,
  reject: rejectFacultyVerification,
  basePath: '/faculty/verifications',
  studentPath: (id) => `/faculty/students/${id}`,
});
