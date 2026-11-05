import assert from 'node:assert/strict';
import { afterEach, beforeEach, test, describe } from 'node:test';
import axiosClient, { TOKEN_KEY } from './axiosClient.js';
import {
  getResumeDownloadUrl,
  getResumeViewUrl,
  downloadResumeBlob,
  downloadStudentResumeFile,
} from './fileService.js';

describe('File & Resume Service Unit Tests', () => {
  const originalGet = axiosClient.get;

  beforeEach(() => {
    // Mock global window/localStorage/document
    global.window = {
      localStorage: {
        store: {},
        getItem(key) {
          return this.store[key] || null;
        },
        setItem(key, val) {
          this.store[key] = String(val);
        },
        removeItem(key) {
          delete this.store[key];
        },
      },
      URL: {
        createObjectURL() {
          return 'blob:http://localhost:5173/mock-blob-uuid';
        },
        revokeObjectURL() {},
      },
    };
    global.localStorage = global.window.localStorage;
    global.document = {
      body: {
        appendChild() {},
        removeChild() {},
      },
      createElement(tag) {
        return {
          tagName: tag,
          href: '',
          download: '',
          click() {},
        };
      },
    };
  });

  afterEach(() => {
    axiosClient.get = originalGet;
  });

  test('getResumeDownloadUrl appends token query param when user is signed in', () => {
    localStorage.setItem(TOKEN_KEY, 'test.jwt.token');
    const url = getResumeDownloadUrl(42);
    assert.match(url, /\/students\/42\/resume\/download\?download=true&token=test\.jwt\.token/);
  });

  test('getResumeViewUrl appends token query param when user is signed in', () => {
    localStorage.setItem(TOKEN_KEY, 'test.jwt.token');
    const url = getResumeViewUrl(42);
    assert.match(url, /\/students\/42\/resume\/download\?download=false&token=test\.jwt\.token/);
  });

  test('downloadResumeBlob issues authenticated GET request with blob responseType', async () => {
    let capturedUrl = null;
    let capturedConfig = null;

    axiosClient.get = async (url, config) => {
      capturedUrl = url;
      capturedConfig = config;
      return {
        data: Buffer.from('mock pdf'),
        headers: { 'content-type': 'application/pdf' },
      };
    };

    const res = await downloadResumeBlob(15);
    assert.equal(capturedUrl, '/students/15/resume/download?download=true');
    assert.equal(capturedConfig.responseType, 'blob');
    assert.ok(res.data);
  });

  test('downloadStudentResumeFile downloads file and extracts filename from header', async () => {
    let clickedDownload = null;

    global.document.createElement = () => {
      const el = {
        href: '',
        download: '',
        click() {
          clickedDownload = this.download;
        },
      };
      return el;
    };

    axiosClient.get = async () => ({
      data: new Uint8Array([1, 2, 3]),
      headers: {
        'content-type': 'application/pdf',
        'content-disposition': 'attachment; filename="Arun_Resume_2026.pdf"',
      },
    });

    const success = await downloadStudentResumeFile(10, 'fallback.pdf');
    assert.equal(success, true);
    assert.equal(clickedDownload, 'Arun_Resume_2026.pdf');
  });
});

