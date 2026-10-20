import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

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

const { isAuthenticated, storeAuth } = await import('./authService.js');
const { TOKEN_KEY, USER_KEY } = await import('./axiosClient.js');

/** Builds a token in the shape TokenProvider issues: header.payload.signature, HS256. */
const makeJwt = (claims, { secondsFromNow = 3600 } = {}) => {
  const enc = (obj) => Buffer.from(JSON.stringify(obj)).toString('base64url');
  const payload = { exp: Math.floor(Date.now() / 1000) + secondsFromNow, ...claims };
  return `${enc({ alg: 'HS256', typ: 'JWT' })}.${enc(payload)}.signature`;
};

/**
 * isAuthenticated decides whether the app considers anyone signed in, so a format
 * mismatch here logs every user out. It reads the JWT that TokenProvider issues and
 * cross-checks the stored user against the token's claims.
 */
describe('Session validity', () => {
  beforeEach(() => localStorage.clear());

  it('accepts the JWT shape the backend actually issues', () => {
    storeAuth({
      token: makeJwt({ sub: 's@gces.edu', uid: 7, role: 'STUDENT' }),
      userId: 7,
      email: 's@gces.edu',
      role: 'STUDENT',
      fullName: 'Test Student',
    });

    assert.equal(isAuthenticated(), true);
  });

  it('rejects an expired token', () => {
    storeAuth({
      token: makeJwt({ sub: 's@gces.edu', uid: 7, role: 'STUDENT' }, { secondsFromNow: -60 }),
      userId: 7,
      email: 's@gces.edu',
      role: 'STUDENT',
    });

    assert.equal(isAuthenticated(), false);
  });

  it('rejects a token that is not a three-part JWT', () => {
    // The shape an earlier custom provider used: base64(payload).signature
    const legacy = `${Buffer.from('7:s@gces.edu:STUDENT:' + (Date.now() + 10000)).toString('base64url')}.sig`;
    localStorage.setItem(TOKEN_KEY, legacy);
    localStorage.setItem(USER_KEY, JSON.stringify({ userId: 7, email: 's@gces.edu', role: 'STUDENT' }));

    assert.equal(isAuthenticated(), false);
  });

  it('rejects a stored user whose role was edited to disagree with the token', () => {
    const token = makeJwt({ sub: 's@gces.edu', uid: 7, role: 'STUDENT' });
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(USER_KEY, JSON.stringify({ userId: 7, email: 's@gces.edu', role: 'ADMIN' }));

    assert.equal(isAuthenticated(), false, 'editing the stored role must not grant admin pages');
  });

  it('rejects a stored user belonging to a different account', () => {
    const token = makeJwt({ sub: 's@gces.edu', uid: 7, role: 'STUDENT' });
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(USER_KEY, JSON.stringify({ userId: 99, email: 'other@gces.edu', role: 'STUDENT' }));

    assert.equal(isAuthenticated(), false);
  });

  it('accepts a stored user that simply omits the id', () => {
    // refreshUser and older writes may not carry userId; that is not a forgery.
    const token = makeJwt({ sub: 's@gces.edu', uid: 7, role: 'STUDENT' });
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(USER_KEY, JSON.stringify({ email: 's@gces.edu', role: 'STUDENT' }));

    assert.equal(isAuthenticated(), true);
  });

  it('is false with no session at all', () => {
    assert.equal(isAuthenticated(), false);
  });
});
