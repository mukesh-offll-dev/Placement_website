import assert from 'node:assert/strict';
import { afterEach, test } from 'node:test';
import axiosClient from './axiosClient.js';
import { getMyApplication, getMyApplications } from './studentService.js';

const originalGet = axiosClient.get;

afterEach(() => {
  axiosClient.get = originalGet;
});

test('getMyApplications requests every page from the authenticated student endpoint', async () => {
  const requestedPages = [];
  const pages = [
    {
      content: [{ id: 1 }],
      totalPages: 2,
    },
    {
      content: [{ id: 2 }],
      totalPages: 2,
    },
  ];

  axiosClient.get = async (url, config) => {
    assert.equal(url, '/student/applications');
    requestedPages.push(config.params);
    return { data: pages[config.params.page] };
  };

  const applications = await getMyApplications();

  assert.deepEqual(applications, [{ id: 1 }, { id: 2 }]);
  assert.deepEqual(requestedPages, [
    { page: 0, size: 100 },
    { page: 1, size: 100 },
  ]);
});

test('getMyApplications returns an empty list for an empty backend page', async () => {
  axiosClient.get = async () => ({
    data: { content: [], totalPages: 0 },
  });

  assert.deepEqual(await getMyApplications(), []);
});

test('getMyApplications rejects an unexpected page response', async () => {
  axiosClient.get = async () => ({
    data: { results: [] },
  });

  await assert.rejects(getMyApplications(), /unexpected format/);
});

test("getMyApplication requests the authenticated student's application detail", async () => {
  const timeline = [{ id: 9, stageLabel: 'Application Submitted', status: 'DONE' }];
  axiosClient.get = async (url) => {
    assert.equal(url, '/student/applications/42');
    return {
      data: { id: 42, timeline },
    };
  };

  assert.deepEqual(await getMyApplication(42), { id: 42, timeline });
});
