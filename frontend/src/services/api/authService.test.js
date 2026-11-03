import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

// Mock localStorage for Node test environment
const mockStorage = {};
globalThis.localStorage = {
  getItem: (key) => mockStorage[key] || null,
  setItem: (key, val) => { mockStorage[key] = String(val); },
  removeItem: (key) => { delete mockStorage[key]; },
  clear: () => { Object.keys(mockStorage).forEach(k => delete mockStorage[k]); },
};

// Polyfill atob if not present
if (typeof globalThis.atob === 'undefined') {
  globalThis.atob = (str) => Buffer.from(str, 'base64').toString('binary');
}

import {
  clearAuth,
  getToken,
  getUser,
  isAuthenticated,
  getRole,
  login,
} from './authService.js';
import axiosClient, { TOKEN_KEY, USER_KEY } from './axiosClient.js';

describe('Frontend Authentication Service & Credentials Verification', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('rejects login when unknown email returns 401 BadCredentials and does not store token', async () => {
    // Simulate axiosClient rejection for unknown email
    const originalPost = axiosClient.post;
    const error401 = new Error('Invalid email or password');
    error401.status = 401;
    axiosClient.post = async () => Promise.reject(error401);

    try {
      await assert.rejects(
        async () => {
          await login({
            email: 'unregistered@gces.edu.np',
            password: 'RandomPassword123!',
            expectedRole: 'ADMIN',
          });
        },
        {
          message: 'Invalid email or password',
        }
      );

      // Verify no token or user was stored in localStorage
      assert.strictEqual(getToken(), null);
      assert.strictEqual(getUser(), null);
      assert.strictEqual(isAuthenticated(), false);
      assert.strictEqual(getRole(), null);
    } finally {
      axiosClient.post = originalPost;
    }
  });

  it('rejects login when incorrect password returns 401 and clears any existing credentials', async () => {
    // Set a dummy stale token first to test that failure wipes it
    localStorage.setItem(TOKEN_KEY, 'stale-token');

    const originalPost = axiosClient.post;
    const error401 = new Error('Invalid email or password');
    error401.status = 401;
    axiosClient.post = async () => Promise.reject(error401);

    try {
      await assert.rejects(
        async () => {
          await login({
            email: 'admin@gce.edu.in',
            password: 'wrong-password',
            expectedRole: 'ADMIN',
          });
        },
        {
          message: 'Invalid email or password',
        }
      );

      // Verify credentials were not saved and stale token was not retained
      assert.strictEqual(getToken(), null);
      assert.strictEqual(getUser(), null);
      assert.strictEqual(isAuthenticated(), false);
    } finally {
      axiosClient.post = originalPost;
    }
  });

  it('rejects login if backend response lacks a valid token', async () => {
    const originalPost = axiosClient.post;
    // Backend returns empty data or missing token
    axiosClient.post = async () => ({ success: true, data: { userId: 1, role: 'ADMIN' } });

    try {
      await assert.rejects(
        async () => {
          await login({
            email: 'admin@gce.edu.in',
            password: 'secret',
            expectedRole: 'ADMIN',
          });
        },
        {
          message: /Authentication failed: No token received from server/,
        }
      );

      assert.strictEqual(getToken(), null);
      assert.strictEqual(isAuthenticated(), false);
    } finally {
      axiosClient.post = originalPost;
    }
  });

  it('successfully stores auth and resolves user details on valid response with token', async () => {
    // Create a mock JWT with future expiry
    const futureExp = Math.floor(Date.now() / 1000) + 3600;
    const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64');
    const payload = Buffer.from(JSON.stringify({ sub: 'admin@gce.edu.in', role: 'ADMIN', exp: futureExp })).toString('base64');
    const mockJwt = `${header}.${payload}.signature`;

    const originalPost = axiosClient.post;
    axiosClient.post = async () => ({
      data: {
        token: mockJwt,
        type: 'Bearer',
        userId: 1,
        email: 'admin@gce.edu.in',
        role: 'ADMIN',
        fullName: 'Placement Admin',
      },
    });

    try {
      const user = await login({
        email: 'admin@gce.edu.in',
        password: 'ValidPassword123',
        expectedRole: 'ADMIN',
      });

      assert.ok(user);
      assert.strictEqual(user.token, mockJwt);
      assert.strictEqual(user.role, 'ADMIN');
      assert.strictEqual(getToken(), mockJwt);
      assert.strictEqual(getUser().role, 'ADMIN');
      assert.strictEqual(isAuthenticated(), true);
      assert.strictEqual(getRole(), 'ADMIN');
    } finally {
      axiosClient.post = originalPost;
    }
  });

  it('clearAuth removes all stored credentials', () => {
    localStorage.setItem(TOKEN_KEY, 'dummy.jwt.token');
    localStorage.setItem(USER_KEY, JSON.stringify({ role: 'ADMIN' }));

    clearAuth();

    assert.strictEqual(getToken(), null);
    assert.strictEqual(getUser(), null);
    assert.strictEqual(isAuthenticated(), false);
    assert.strictEqual(getRole(), null);
  });

  it('simulates AdminLoginPage submission with invalid credentials: error banner set, navigate never called', async () => {
    let navigatedPath = null;
    const navigate = (path) => { navigatedPath = path; };
    let apiError = '';
    const setApiError = (msg) => { apiError = msg; };

    // Simulate 401 BadCredentials from server
    const originalPost = axiosClient.post;
    const error401 = new Error('Invalid email or password');
    error401.status = 401;
    axiosClient.post = async () => Promise.reject(error401);

    try {
      // Simulate AdminLoginPage handleSubmit
      try {
        const user = await login({
          email: 'random@unknown.com',
          password: 'wrongpassword',
          expectedRole: 'ADMIN',
        });
        if (!user || !user.token || user.role !== 'ADMIN') {
          clearAuth();
          setApiError('This portal is for administrators only.');
          return;
        }
        navigate('/admin/dashboard');
      } catch (err) {
        clearAuth();
        setApiError(err.message || 'Login failed.');
      }

      // Assert navigate was NEVER called
      assert.strictEqual(navigatedPath, null, 'navigate must NOT be called on invalid credentials');
      assert.strictEqual(apiError, 'Invalid email or password');
      assert.strictEqual(getToken(), null);
    } finally {
      axiosClient.post = originalPost;
    }
  });

  it('simulates StudentLoginPage submission with invalid credentials: error banner set, navigate never called', async () => {
    let navigatedPath = null;
    const navigate = (path) => { navigatedPath = path; };
    let apiError = '';
    const setApiError = (msg) => { apiError = msg; };

    // Simulate 401 BadCredentials from server
    const originalPost = axiosClient.post;
    const error401 = new Error('Invalid email or password');
    error401.status = 401;
    axiosClient.post = async () => Promise.reject(error401);

    try {
      // Simulate StudentLoginPage handleSubmit
      try {
        const user = await login({
          email: 'fake.student@unknown.com',
          password: 'wrongpassword',
          expectedRole: 'STUDENT',
        });
        if (!user || !user.token || user.role !== 'STUDENT') {
          clearAuth();
          setApiError('This login portal is for students only.');
          return;
        }
        navigate('/student/dashboard');
      } catch (err) {
        clearAuth();
        setApiError(err.message || 'Login failed.');
      }

      // Assert navigate was NEVER called
      assert.strictEqual(navigatedPath, null, 'navigate must NOT be called on invalid credentials');
      assert.strictEqual(apiError, 'Invalid email or password');
      assert.strictEqual(getToken(), null);
    } finally {
      axiosClient.post = originalPost;
    }
  });

  it('simulates student trying to login via Admin portal: role mismatch prevents admin navigation', async () => {
    let navigatedPath = null;
    const navigate = (path) => { navigatedPath = path; };
    let apiError = '';
    const setApiError = (msg) => { apiError = msg; };

    const futureExp = Math.floor(Date.now() / 1000) + 3600;
    const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64');
    const payload = Buffer.from(JSON.stringify({ sub: 'student@gce.edu.in', role: 'STUDENT', exp: futureExp })).toString('base64');
    const studentJwt = `${header}.${payload}.signature`;

    // Backend returned a STUDENT user
    const originalPost = axiosClient.post;
    axiosClient.post = async () => ({
      data: {
        token: studentJwt,
        type: 'Bearer',
        userId: 9,
        email: 'student@gce.edu.in',
        role: 'STUDENT',
        fullName: 'Student User',
      },
    });

    try {
      try {
        const user = await login({
          email: 'student@gce.edu.in',
          password: 'Password123',
          expectedRole: 'ADMIN',
        });
        if (!user || !user.token || user.role !== 'ADMIN') {
          clearAuth();
          setApiError('This portal is for administrators only. Please use the Student Login.');
          return;
        }
        navigate('/admin/dashboard');
      } catch (err) {
        clearAuth();
        setApiError(err.message || 'Login failed.');
      }

      // Assert navigate to admin dashboard was blocked
      assert.strictEqual(navigatedPath, null);
      assert.strictEqual(apiError, 'This portal is for administrators only. Please use the Student Login.');
      assert.strictEqual(getToken(), null);
    } finally {
      axiosClient.post = originalPost;
    }
  });
});
