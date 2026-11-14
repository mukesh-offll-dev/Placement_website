import assert from 'node:assert/strict';
import { afterEach, test } from 'node:test';
import axiosClient from './axiosClient.js';
import { getAllStudents, addTimelineNote } from './adminService.js';

const originalGet = axiosClient.get;
const originalPost = axiosClient.post;

afterEach(() => {
  axiosClient.get = originalGet;
  axiosClient.post = originalPost;
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

test('addTimelineNote posts note to the admin application notes endpoint', async () => {
  const application = { id: 10, timeline: [{ id: 1, stageLabel: 'Admin Note', remarks: 'Good candidate' }] };

  axiosClient.post = async (url, payload) => {
    assert.equal(url, '/admin/applications/10/notes');
    assert.deepEqual(payload, { note: 'Good candidate' });
    return { data: application };
  };

  const result = await addTimelineNote(10, 'Good candidate');
  assert.deepEqual(result, application);
});

test('addTimelineNote propagates error on API failure', async () => {
  const error = new Error('Failed to add note');
  axiosClient.post = async () => Promise.reject(error);

  await assert.rejects(addTimelineNote(10, 'Some note'), /Failed to add note/);
});
