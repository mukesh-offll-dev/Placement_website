import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { getJobs, getJobById } from './jobService.js';
import axiosClient from './axiosClient.js';

describe('Empty States and Not Found API Verification', () => {
  it('handles empty jobs list from backend Page response properly', async () => {
    const originalGet = axiosClient.get;
    axiosClient.get = async () => ({
      data: { content: [], totalPages: 0, totalElements: 0 },
    });

    try {
      const result = await getJobs();
      assert.deepEqual(result.content, []);
      assert.equal(result.totalElements, 0);
    } finally {
      axiosClient.get = originalGet;
    }
  });

  it('handles empty jobs array response without crashing', async () => {
    const originalGet = axiosClient.get;
    axiosClient.get = async () => ({
      data: [],
    });

    try {
      const result = await getJobs();
      assert.deepEqual(result, []);
    } finally {
      axiosClient.get = originalGet;
    }
  });

  it('propagates 404 error when job id does not exist', async () => {
    const originalGet = axiosClient.get;
    const error404 = new Error('Job not found');
    error404.response = { status: 404, data: { message: 'Job not found' } };
    axiosClient.get = async () => Promise.reject(error404);

    try {
      await assert.rejects(
        async () => {
          await getJobById(99999);
        },
        (err) => {
          assert.equal(err.response?.status, 404);
          return true;
        }
      );
    } finally {
      axiosClient.get = originalGet;
    }
  });
});
