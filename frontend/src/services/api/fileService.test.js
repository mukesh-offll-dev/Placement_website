import assert from 'node:assert/strict';
import { afterEach, beforeEach, test, describe } from 'node:test';
import axiosClient, { TOKEN_KEY } from './axiosClient.js';
import * as fileService from './fileService.js';
import {
  toApiPath,
  parseContentDispositionFileName,
  fetchFileBlob,
  downloadResumeBlob,
  downloadStudentResumeFile,
  openProtectedFile,
} from './fileService.js';

/**
 * These drive the real axiosClient, interceptors included, by swapping only its adapter
 * (the layer that would hit the network). The old tests stubbed axiosClient.get and
 * returned a full axios response, which hid that the response interceptor unwraps the
 * body: the download code then read `response.data` off a Blob and saved "undefined".
 */
describe('File & Resume Service', () => {
  const originalAdapter = axiosClient.defaults.adapter;
  let requests;
  let saved;

  const respondWith = (body, headers = {}, status = 200) => {
    axiosClient.defaults.adapter = async (config) => {
      requests.push(config);
      return { data: body, status, statusText: 'OK', headers, config, request: {} };
    };
  };

  beforeEach(() => {
    requests = [];
    saved = { blob: null, name: null, revoked: [] };

    const store = {};
    global.localStorage = {
      getItem: (key) => (key in store ? store[key] : null),
      setItem: (key, val) => { store[key] = String(val); },
      removeItem: (key) => { delete store[key]; },
    };
    global.window = {
      localStorage: global.localStorage,
      URL: {
        createObjectURL(blob) {
          saved.blob = blob;
          return 'blob:http://localhost:5173/mock-blob-uuid';
        },
        revokeObjectURL(url) {
          saved.revoked.push(url);
        },
      },
      open: () => null,
    };
    global.document = {
      body: { appendChild() {}, removeChild() {} },
      createElement(tag) {
        return {
          tagName: tag,
          href: '',
          download: '',
          click() {
            saved.name = this.download;
          },
        };
      },
    };
  });

  afterEach(() => {
    axiosClient.defaults.adapter = originalAdapter;
  });

  test('no URL-building helper puts the JWT in a query string any more', () => {
    for (const name of ['getResumeViewUrl', 'getResumeDownloadUrl', 'getFileDownloadUrl', 'getFileViewUrl']) {
      assert.equal(fileService[name], undefined, `${name} should have been removed`);
    }
  });

  test('resume download sends the token in the Authorization header, never in the URL', async () => {
    localStorage.setItem(TOKEN_KEY, 'test.jwt.token');
    respondWith(new Blob(['%PDF'], { type: 'application/pdf' }), { 'content-type': 'application/pdf' });

    await downloadResumeBlob(15);

    assert.equal(requests.length, 1);
    const [config] = requests;
    assert.equal(config.url, '/students/15/resume/download');
    assert.deepEqual(config.params, { download: true });
    assert.equal(config.responseType, 'blob');
    assert.equal(config.headers.Authorization, 'Bearer test.jwt.token');
    assert.doesNotMatch(config.url, /token/);
    assert.ok(!('token' in (config.params || {})));
    assert.notEqual(config.withCredentials, true);
  });

  test('downloadStudentResumeFile saves the real blob under the server file name', async () => {
    const pdf = new Blob(['%PDF-1.7 real bytes'], { type: 'application/pdf' });
    respondWith(pdf, {
      'content-type': 'application/pdf',
      'content-disposition': 'attachment; filename="Arun_Resume_2026.pdf"',
    });

    const ok = await downloadStudentResumeFile(10, 'fallback.pdf');

    assert.equal(ok, true);
    assert.equal(saved.name, 'Arun_Resume_2026.pdf');
    assert.ok(saved.blob instanceof Blob);
    assert.equal(await saved.blob.text(), '%PDF-1.7 real bytes');
    assert.notEqual(await saved.blob.text(), 'undefined');
  });

  test('downloadStudentResumeFile falls back to the default name without content-disposition', async () => {
    respondWith(new Blob(['x'], { type: 'application/pdf' }), { 'content-type': 'application/pdf' });
    await downloadStudentResumeFile(10, 'fallback.pdf');
    assert.equal(saved.name, 'fallback.pdf');
  });

  test('rawResponse flag returns the whole response; without it the interceptor returns the body', async () => {
    const body = new Blob(['csv'], { type: 'text/csv' });
    respondWith(body, { 'content-type': 'text/csv' });

    const unwrapped = await axiosClient.get('/admin/students/export', { responseType: 'blob' });
    assert.equal(unwrapped, body);

    const raw = await axiosClient.get('/admin/students/export', { responseType: 'blob', rawResponse: true });
    assert.equal(raw.data, body);
    assert.equal(raw.headers['content-type'], 'text/csv');
  });

  test('fetchFileBlob turns backend file URLs into API paths and refuses foreign hosts', async () => {
    respondWith(new Blob(['img'], { type: 'image/png' }), { 'content-type': 'image/png' });
    const { blob, contentType } = await fetchFileBlob('/api/files/download/projects/a.png');
    assert.equal(requests[0].url, '/files/download/projects/a.png');
    assert.equal(contentType, 'image/png');
    assert.equal(await blob.text(), 'img');

    await assert.rejects(() => fetchFileBlob('https://evil.example.com/steal'));
    assert.equal(requests.length, 1);
  });

  test('a failed blob request surfaces the JSON error message from the server', async () => {
    axiosClient.defaults.adapter = async (config) => {
      const error = new Error('Request failed with status code 404');
      error.config = config;
      error.response = {
        status: 404,
        data: new Blob([JSON.stringify({ success: false, message: 'No resume uploaded yet' })], {
          type: 'application/json',
        }),
        headers: {},
        config,
      };
      throw error;
    };

    await assert.rejects(() => downloadStudentResumeFile(3), (err) => {
      assert.equal(err.status, 404);
      assert.equal(err.message, 'No resume uploaded yet');
      return true;
    });
  });

  test('openProtectedFile closes the pre-opened tab when the fetch fails', async () => {
    let closed = false;
    global.window.open = () => ({ location: {}, close() { closed = true; } });
    axiosClient.defaults.adapter = async (config) => {
      const error = new Error('boom');
      error.config = config;
      error.response = { status: 500, data: null, headers: {}, config };
      throw error;
    };
    await assert.rejects(() => openProtectedFile('/students/1/resume/download'));
    assert.equal(closed, true);
  });

  test('toApiPath and parseContentDispositionFileName', () => {
    assert.equal(toApiPath('/api/projects/3/media/download'), '/projects/3/media/download');
    assert.equal(toApiPath('/students/3/resume/download'), '/students/3/resume/download');
    assert.equal(toApiPath('blob:http://x/y'), null);
    assert.equal(toApiPath('https://github.com/x'), null);
    assert.equal(toApiPath(null), null);
    assert.equal(parseContentDispositionFileName('inline; filename="a b.pdf"'), 'a b.pdf');
    assert.equal(parseContentDispositionFileName("attachment; filename*=UTF-8''r%C3%A9sum%C3%A9.pdf"), 'résumé.pdf');
    assert.equal(parseContentDispositionFileName(undefined), null);
  });
});
