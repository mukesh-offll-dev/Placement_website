/**
 * Role helpers shared by the route guard, the 401 listener and the login pages, so every place
 * agrees on where each role signs in, lands and changes a forced password.
 */

export const ROLES = Object.freeze({
  STUDENT: 'STUDENT',
  ADMIN: 'ADMIN',
  PLACEMENT_OFFICER: 'PLACEMENT_OFFICER',
  FACULTY_ADVISOR: 'FACULTY_ADVISOR',
});

/** Roles that work from the admin portal (/admin/**). */
export const ADMIN_PORTAL_ROLES = Object.freeze([ROLES.ADMIN, ROLES.PLACEMENT_OFFICER]);

/** Every non-student role: these sign in with email + password and can be forced to change it. */
export const STAFF_ROLES = Object.freeze([ROLES.ADMIN, ROLES.PLACEMENT_OFFICER, ROLES.FACULTY_ADVISOR]);

export const isStaffRole = (role) => STAFF_ROLES.includes(role);
export const isAdminPortalRole = (role) => ADMIN_PORTAL_ROLES.includes(role);
export const isFacultyRole = (role) => role === ROLES.FACULTY_ADVISOR;

/** Where a signed-out user of this role signs in again. */
export const loginPathForRole = (role) => {
  if (isAdminPortalRole(role)) return '/admin/login';
  if (isFacultyRole(role)) return '/faculty/login';
  if (role === ROLES.STUDENT) return '/student/login';
  return '/login';
};

/** The landing page after sign-in. */
export const homePathForRole = (role) => {
  if (isAdminPortalRole(role)) return '/admin/dashboard';
  if (isFacultyRole(role)) return '/faculty/dashboard';
  if (role === ROLES.STUDENT) return '/student/dashboard';
  return '/';
};

/** The forced change-password page for a staff role (students use first-login setup instead). */
export const changePasswordPathForRole = (role) => {
  if (isFacultyRole(role)) return '/faculty/change-password';
  if (isAdminPortalRole(role)) return '/admin/change-password';
  return null;
};

/** The default login page for a guard that admits these roles. */
export const loginPathForAllowedRoles = (roles = []) => {
  if (roles.some(isAdminPortalRole)) return '/admin/login';
  if (roles.includes(ROLES.FACULTY_ADVISOR)) return '/faculty/login';
  if (roles.includes(ROLES.STUDENT)) return '/student/login';
  return '/login';
};

export const roleLabel = (role) => ({
  ADMIN: 'Admin',
  PLACEMENT_OFFICER: 'Placement Officer',
  FACULTY_ADVISOR: 'Faculty Advisor',
  STUDENT: 'Student',
}[role] || role || 'User');
