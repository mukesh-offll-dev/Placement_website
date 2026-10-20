import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

// Mock localStorage for the Node test environment.
const mockStorage = {};
globalThis.localStorage = {
  getItem: (key) => mockStorage[key] ?? null,
  setItem: (key, val) => { mockStorage[key] = String(val); },
  removeItem: (key) => { delete mockStorage[key]; },
  clear: () => { Object.keys(mockStorage).forEach((k) => delete mockStorage[k]); },
};

if (typeof globalThis.atob === 'undefined') {
  globalThis.atob = (str) => Buffer.from(str, 'base64').toString('binary');
}

// Capture dispatched CustomEvents without a DOM.
const dispatched = [];
globalThis.CustomEvent = class CustomEvent {
  constructor(type, init) {
    this.type = type;
    this.detail = init?.detail;
  }
};
globalThis.window = {
  dispatchEvent: (event) => { dispatched.push(event); return true; },
};

const {
  default: axiosClient,
  TOKEN_KEY,
  USER_KEY,
  LEGACY_TOKEN_KEY,
  LEGACY_USER_KEY,
  resetAuthRedirectGuard,
} = await import('./axiosClient.js');

/** Drives the response interceptor's error handler directly. */
const rejectWith = (status, data, url) => {
  const handler = axiosClient.interceptors.response.handlers[0].rejected;
  const error = new Error(`HTTP ${status}`);
  error.response = { status, data };
  error.config = { url };
  return handler(error);
};

/**
 * These cover the 401 branch of the response interceptor, which decides whether a
 * user is signed out and which login page they land on. The branch merges two
 * designs — per-status messages, and role-aware redirect handling — so the pieces
 * that could be dropped when they are recombined are asserted explicitly.
 */
describe('axiosClient response interceptor', () => {
  beforeEach(() => {
    localStorage.clear();
    dispatched.length = 0;
    resetAuthRedirectGuard();
  });

  it('carries the role on auth:unauthorized so the redirect picks the right login page', async () => {
    localStorage.setItem(USER_KEY, JSON.stringify({ email: 'a@gces.edu', role: 'ADMIN' }));
    localStorage.setItem(TOKEN_KEY, 'tok');

    await assert.rejects(() => rejectWith(401, { message: 'Unauthorized' }, '/student/profile'));

    assert.equal(dispatched.length, 1);
    assert.equal(dispatched[0].type, 'auth:unauthorized');
    assert.equal(dispatched[0].detail.role, 'ADMIN', 'an admin must not be sent to the student login');
  });

  it('falls back to the role claim inside the token when no stored user exists', async () => {
    const payload = Buffer.from(JSON.stringify({ sub: 's@gces.edu', role: 'STUDENT' })).toString('base64url');
    localStorage.setItem(TOKEN_KEY, `header.${payload}.sig`);

    await assert.rejects(() => rejectWith(401, {}, '/student/profile'));

    assert.equal(dispatched[0].detail.role, 'STUDENT');
  });

  it('clears both current and legacy credential keys', async () => {
    localStorage.setItem(TOKEN_KEY, 'tok');
    localStorage.setItem(USER_KEY, JSON.stringify({ role: 'STUDENT' }));
    localStorage.setItem(LEGACY_TOKEN_KEY, 'old-tok');
    localStorage.setItem(LEGACY_USER_KEY, JSON.stringify({ role: 'STUDENT' }));

    await assert.rejects(() => rejectWith(401, {}, '/student/profile'));

    for (const key of [TOKEN_KEY, USER_KEY, LEGACY_TOKEN_KEY, LEGACY_USER_KEY]) {
      assert.equal(localStorage.getItem(key), null, `${key} should be cleared`);
    }
  });

  it('dispatches once for a burst of parallel 401s', async () => {
    localStorage.setItem(TOKEN_KEY, 'tok');

    await Promise.allSettled([
      rejectWith(401, {}, '/student/profile'),
      rejectWith(401, {}, '/student/applications'),
      rejectWith(401, {}, '/notifications'),
    ]);

    assert.equal(dispatched.length, 1, 'the redirect guard should collapse the burst');
  });

  it('leaves an active session intact when a sign-in attempt is rejected', async () => {
    localStorage.setItem(TOKEN_KEY, 'existing');
    localStorage.setItem(USER_KEY, JSON.stringify({ role: 'ADMIN' }));

    for (const url of ['/auth/login', '/admin/login', '/auth/register/student']) {
      localStorage.setItem(TOKEN_KEY, 'existing');
      dispatched.length = 0;

      await assert.rejects(() => rejectWith(401, { message: 'Invalid email or password' }, url));

      assert.equal(localStorage.getItem(TOKEN_KEY), 'existing', `${url} must not wipe the session`);
      assert.equal(dispatched.length, 0, `${url} must not trigger a redirect`);
    }
  });

  it('surfaces field-level validation messages on 400', async () => {
    await assert.rejects(
      () => rejectWith(400, { message: 'Validation failed', data: { email: 'Email must be a valid address' } }, '/auth/login'),
      (err) => {
        assert.match(err.message, /Email must be a valid address/);
        return true;
      }
    );
  });

  it('does not leak server internals to the user', async () => {
    await assert.rejects(
      () => rejectWith(500, { message: 'org.hibernate.exception.SQLGrammarException: bad column' }, '/jobs'),
      (err) => {
        assert.doesNotMatch(err.message, /hibernate|SQL/i);
        return true;
      }
    );
  });
});
