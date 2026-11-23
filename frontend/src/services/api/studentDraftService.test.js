import assert from 'node:assert/strict';
import { afterEach, test } from 'node:test';
import axiosClient from './axiosClient.js';
import {
  getDraft,
  saveDraft,
  discardDraft,
  submitDraft,
  withdrawDraft,
  getVerificationHistory,
  getVerification,
  uploadVerificationFile,
} from './studentDraftService.js';

const original = {
  get: axiosClient.get,
  post: axiosClient.post,
  put: axiosClient.put,
  delete: axiosClient.delete,
};

afterEach(() => {
  Object.assign(axiosClient, original);
});

test('getDraft reads the draft payload', async () => {
  axiosClient.get = async (url) => {
    assert.equal(url, '/student/profile/draft');
    return { success: true, data: { status: 'NONE', versionId: null } };
  };
  assert.deepEqual(await getDraft(), { status: 'NONE', versionId: null });
});

test('saveDraft PUTs {data} and only includes a non-blank note', async () => {
  const calls = [];
  axiosClient.put = async (url, body) => {
    calls.push([url, body]);
    return { data: { status: 'DRAFT' } };
  };
  await saveDraft({ personal: { fullName: 'A' } });
  await saveDraft({ personal: {} }, '  please check  ');
  await saveDraft({ personal: {} }, '   ');
  assert.deepEqual(calls, [
    ['/student/profile/draft', { data: { personal: { fullName: 'A' } } }],
    ['/student/profile/draft', { data: { personal: {} }, studentNote: 'please check' }],
    ['/student/profile/draft', { data: { personal: {} } }],
  ]);
});

test('discardDraft DELETEs the draft and resolves null', async () => {
  let called = null;
  axiosClient.delete = async (url) => {
    called = url;
    return { success: true, data: null };
  };
  assert.equal(await discardDraft(), null);
  assert.equal(called, '/student/profile/draft');
});

test('submitDraft and withdrawDraft POST to their endpoints', async () => {
  const calls = [];
  axiosClient.post = async (url, body) => {
    calls.push([url, body]);
    return { data: { status: url.endsWith('submit') ? 'PENDING' : 'DRAFT' } };
  };
  assert.equal((await submitDraft(' note ')).status, 'PENDING');
  assert.equal((await submitDraft()).status, 'PENDING');
  assert.equal((await withdrawDraft()).status, 'DRAFT');
  assert.deepEqual(calls, [
    ['/student/profile/draft/submit', { studentNote: 'note' }],
    ['/student/profile/draft/submit', {}],
    ['/student/profile/draft/withdraw', undefined],
  ]);
});

test('getVerificationHistory always returns an array', async () => {
  axiosClient.get = async () => ({ data: [{ id: 2 }, { id: 1 }] });
  assert.deepEqual(await getVerificationHistory(), [{ id: 2 }, { id: 1 }]);
  axiosClient.get = async () => ({ data: { content: [{ id: 3 }] } });
  assert.deepEqual(await getVerificationHistory(), [{ id: 3 }]);
  axiosClient.get = async () => ({ data: null });
  assert.deepEqual(await getVerificationHistory(), []);
});

test('getVerification requests one version by id', async () => {
  axiosClient.get = async (url) => {
    assert.equal(url, '/student/verifications/7');
    return { data: { id: 7, events: [] } };
  };
  assert.equal((await getVerification(7)).id, 7);
});

test('uploadVerificationFile sends multipart file + section and checks the result', async () => {
  let sent = null;
  axiosClient.post = async (url, body, config) => {
    sent = { url, body, config };
    return { data: { fileUrl: '/api/files/download/verification/x.pdf', fileName: 'x.pdf', size: 3 } };
  };
  const file = new Blob(['abc'], { type: 'application/pdf' });
  const result = await uploadVerificationFile(file, 'RESUME');
  assert.equal(result.fileUrl, '/api/files/download/verification/x.pdf');
  assert.equal(sent.url, '/student/verification/files');
  assert.ok(sent.body instanceof FormData);
  assert.equal(sent.body.get('section'), 'RESUME');
  assert.ok(sent.body.get('file'));
  assert.equal(sent.config.headers['Content-Type'], 'multipart/form-data');

  axiosClient.post = async () => ({ data: {} });
  await assert.rejects(() => uploadVerificationFile(file), /did not return/);
});

test('errors from the client propagate unchanged', async () => {
  const err = Object.assign(new Error('Withdraw your pending request before editing'), { status: 409 });
  axiosClient.put = async () => {
    throw err;
  };
  await assert.rejects(() => saveDraft({}), (e) => e === err);
});
