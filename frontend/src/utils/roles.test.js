import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  changePasswordPathForRole,
  homePathForRole,
  isStaffRole,
  loginPathForAllowedRoles,
  loginPathForRole,
} from './roles.js';

test('loginPathForRole sends each role to its own sign-in page', () => {
  assert.equal(loginPathForRole('ADMIN'), '/admin/login');
  assert.equal(loginPathForRole('PLACEMENT_OFFICER'), '/admin/login');
  assert.equal(loginPathForRole('FACULTY_ADVISOR'), '/faculty/login');
  assert.equal(loginPathForRole('STUDENT'), '/student/login');
  assert.equal(loginPathForRole(null), '/login');
});

test('homePathForRole picks the portal dashboard', () => {
  assert.equal(homePathForRole('FACULTY_ADVISOR'), '/faculty/dashboard');
  assert.equal(homePathForRole('PLACEMENT_OFFICER'), '/admin/dashboard');
  assert.equal(homePathForRole('STUDENT'), '/student/dashboard');
  assert.equal(homePathForRole(undefined), '/');
});

test('changePasswordPathForRole covers staff only', () => {
  assert.equal(changePasswordPathForRole('FACULTY_ADVISOR'), '/faculty/change-password');
  assert.equal(changePasswordPathForRole('ADMIN'), '/admin/change-password');
  assert.equal(changePasswordPathForRole('PLACEMENT_OFFICER'), '/admin/change-password');
  assert.equal(changePasswordPathForRole('STUDENT'), null);
});

test('isStaffRole and loginPathForAllowedRoles', () => {
  assert.equal(isStaffRole('FACULTY_ADVISOR'), true);
  assert.equal(isStaffRole('STUDENT'), false);
  assert.equal(loginPathForAllowedRoles(['FACULTY_ADVISOR']), '/faculty/login');
  assert.equal(loginPathForAllowedRoles(['ADMIN', 'PLACEMENT_OFFICER']), '/admin/login');
  assert.equal(loginPathForAllowedRoles(['STUDENT']), '/student/login');
  assert.equal(loginPathForAllowedRoles([]), '/login');
});
