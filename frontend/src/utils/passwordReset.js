import { passwordChecks } from './studentValidation.js';
import { loginPathForRole } from './roles.js';

/**
 * Pure helpers for the forgot / reset password pages, kept out of the components so they can be
 * tested without a browser.
 */

const EMAIL = /^\S+@\S+\.\S+$/;
// The backend looks a register number up exactly as typed (trimmed, upper-cased); this only filters typos.
const REGISTER_NUMBER = /^[A-Za-z0-9-]{6,30}$/;

/** ?role= on the forgot-password page decides who the "back to sign in" link and the hint are for. */
const ROLE_PARAM_LOGIN = {
  student: '/student/login',
  faculty: '/faculty/login',
  admin: '/admin/login',
};

/** Sign-in page for a ?role= value; the institution chooser when it is missing or unknown. */
export const loginPathForRoleParam = (role) =>
  ROLE_PARAM_LOGIN[String(role || '').toLowerCase()] || '/login';

/** Whether the forgot-password form should accept a register number (students and the generic page). */
export const acceptsRegisterNumber = (role) => {
  const r = String(role || '').toLowerCase();
  return r === 'student' || !ROLE_PARAM_LOGIN[r];
};

/** The sign-in page for the role the server reports after a successful reset (e.g. FACULTY_ADVISOR). */
export const loginPathAfterReset = (serverRole) => (serverRole ? loginPathForRole(serverRole) : '/login');

/** Error text for the forgot-password field, or '' when it is fine. */
export const validateForgotIdentifier = (identifier, { allowRegisterNumber = true } = {}) => {
  const value = String(identifier || '').trim();
  if (!value) return allowRegisterNumber ? 'Enter your email address or register number' : 'Enter your email address';
  if (value.length > 150) return 'That is too long';
  if (value.includes('@')) return EMAIL.test(value) ? '' : 'Enter a valid email address';
  if (!allowRegisterNumber) return 'Enter a valid email address';
  return REGISTER_NUMBER.test(value) ? '' : 'Enter a valid email address or your register number';
};

/** The password rules shown as a live checklist (the register-number rule is enforced by the server). */
export const resetPasswordChecks = (password) =>
  passwordChecks(String(password || '')).filter((check) => check.id !== 'different');

/** Field errors for the new-password form; an empty object means it can be submitted. */
export const validateResetForm = ({ newPassword = '', confirmPassword = '' } = {}) => {
  const errors = {};
  if (!newPassword) errors.newPassword = 'New password is required';
  else if (resetPasswordChecks(newPassword).some((check) => !check.ok)) {
    errors.newPassword = 'The password does not meet all the rules below';
  } else if (new TextEncoder().encode(newPassword).length > 72) {
    errors.newPassword = 'Password cannot be longer than 72 bytes';
  }

  if (!confirmPassword) errors.confirmPassword = 'Confirm your new password';
  else if (confirmPassword !== newPassword) errors.confirmPassword = 'Passwords do not match';
  return errors;
};

/** The token in a reset link's query string ("?token=..."), or '' when it is absent. */
export const getResetToken = (search) => {
  try {
    return (new URLSearchParams(search || '').get('token') || '').trim();
  } catch {
    return '';
  }
};
