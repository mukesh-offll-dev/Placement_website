import assert from 'node:assert/strict';
import { afterEach, test } from 'node:test';
import axiosClient from './axiosClient.js';
import { getAllStudents } from './adminService.js';

const originalGet = axiosClient.get;

afterEach(() => {
  axiosClient.get = originalGet;
});

test('getAllStudents collects every page from the admin students endpoint', async () => {
  const requestedPages = [];
  const pages = [
    { content: [{ id: 1 }], totalPages: 2 },
    { content: [{ id: 2 }], totalPages: 2 },
  ];

  axiosClient.get = async (url, config) => {
    assert.equal(url, '/admin/students');
    requestedPages.push(config.params);
    return { data: pages[config.params.page] };
  };

  assert.deepEqual(await getAllStudents(), [{ id: 1 }, { id: 2 }]);
  assert.deepEqual(requestedPages, [
    { page: 0, size: 100 },
    { page: 1, size: 100 },
  ]);
});

test('getAllStudents rejects an unexpected paginated response', async () => {
  axiosClient.get = async () => ({ data: { results: [] } });

  await assert.rejects(getAllStudents(), /unexpected format/);
});
