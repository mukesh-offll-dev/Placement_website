import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  acceptsRegisterNumber,
  getResetToken,
  loginPathAfterReset,
  loginPathForRoleParam,
  resetPasswordChecks,
  validateForgotIdentifier,
  validateResetForm,
} from './passwordReset.js';

describe('Forgot password helpers', () => {
  it('maps ?role= to its sign-in page and falls back to the chooser', () => {
    assert.equal(loginPathForRoleParam('student'), '/student/login');
    assert.equal(loginPathForRoleParam('FACULTY'), '/faculty/login');
    assert.equal(loginPathForRoleParam('admin'), '/admin/login');
    assert.equal(loginPathForRoleParam('hacker'), '/login');
    assert.equal(loginPathForRoleParam(undefined), '/login');
  });

  it('accepts a register number only for students and the generic page', () => {
    assert.equal(acceptsRegisterNumber('student'), true);
    assert.equal(acceptsRegisterNumber(undefined), true);
    assert.equal(acceptsRegisterNumber('faculty'), false);
    assert.equal(acceptsRegisterNumber('admin'), false);
  });

  it('sends the user to the right sign-in page after a reset', () => {
    assert.equal(loginPathAfterReset('STUDENT'), '/student/login');
    assert.equal(loginPathAfterReset('FACULTY_ADVISOR'), '/faculty/login');
    assert.equal(loginPathAfterReset('PLACEMENT_OFFICER'), '/admin/login');
    assert.equal(loginPathAfterReset(null), '/login');
  });

  it('validates the forgot-password field', () => {
    assert.match(validateForgotIdentifier('  '), /Enter your email address or register number/);
    assert.equal(validateForgotIdentifier('officer@gces.edu'), '');
    assert.equal(validateForgotIdentifier('912822104001'), '');
    assert.match(validateForgotIdentifier('not an email@'), /valid email/);
    assert.match(validateForgotIdentifier('abc'), /valid email address or your register number/);
    // Staff pages do not take a register number.
    assert.match(validateForgotIdentifier('912822104001', { allowRegisterNumber: false }), /valid email/);
    assert.match(validateForgotIdentifier('', { allowRegisterNumber: false }), /Enter your email address$/);
    assert.match(validateForgotIdentifier('a'.repeat(160) + '@x.io'), /too long/);
  });

  it('checks the password rules the server enforces (without the register-number rule)', () => {
    const checks = resetPasswordChecks('Abcdef12');
    assert.deepEqual(checks.map((c) => c.id), ['length', 'upper', 'lower', 'digit']);
    assert.ok(checks.every((c) => c.ok));
    assert.ok(resetPasswordChecks('abc').some((c) => !c.ok));
  });

  it('validates the new-password form', () => {
    assert.deepEqual(validateResetForm({ newPassword: 'Abcdef12', confirmPassword: 'Abcdef12' }), {});
    assert.ok(validateResetForm({ newPassword: '', confirmPassword: '' }).newPassword);
    assert.match(validateResetForm({ newPassword: 'weak', confirmPassword: 'weak' }).newPassword, /rules/);
    assert.equal(validateResetForm({ newPassword: 'Abcdef12', confirmPassword: 'Abcdef13' }).confirmPassword, 'Passwords do not match');
    assert.ok(validateResetForm({ newPassword: 'Abcdef12', confirmPassword: '' }).confirmPassword);
    // 40 three-byte characters pass the character rules but exceed bcrypt's 72 bytes.
    assert.match(validateResetForm({ newPassword: `Aa1${'€'.repeat(40)}`, confirmPassword: `Aa1${'€'.repeat(40)}` }).newPassword, /72 bytes/);
  });

  it('reads the token from the link', () => {
    assert.equal(getResetToken('?token=abc_DEF-123'), 'abc_DEF-123');
    assert.equal(getResetToken('?token=%20spaced%20'), 'spaced');
    assert.equal(getResetToken('?other=1'), '');
    assert.equal(getResetToken(''), '');
    assert.equal(getResetToken(undefined), '');
  });
});
