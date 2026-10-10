import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { getJobs, getAdminJobs, getJobById } from './jobService.js';
import axiosClient from './axiosClient.js';

describe('Frontend Job API Service Verification', () => {
  it('getJobs sends GET request to /jobs with params and returns response.data', async () => {
    const originalGet = axiosClient.get;
    let capturedUrl = null;
    let capturedConfig = null;

    const mockResponse = {
      success: true,
      message: 'Success',
      data: {
        content: [
          {
            id: 101,
            company: { name: 'Tech Mahindra', shortName: 'TM' },
            jobRole: 'Full Stack Engineer',
            location: 'Bangalore',
            ctcText: '15 LPA',
            status: 'ACTIVE',
            applicationDeadline: '2026-12-01',
          },
        ],
        totalElements: 1,
        totalPages: 1,
      },
    };

    axiosClient.get = async (url, config) => {
      capturedUrl = url;
      capturedConfig = config;
      return mockResponse;
    };

    try {
      const result = await getJobs({ page: 0, size: 20 });
      assert.strictEqual(capturedUrl, '/jobs');
      assert.deepStrictEqual(capturedConfig.params, { page: 0, size: 20 });
      assert.deepStrictEqual(result, mockResponse.data);
      assert.strictEqual(result.content.length, 1);
      assert.strictEqual(result.content[0].id, 101);
    } finally {
      axiosClient.get = originalGet;
    }
  });

  it('getAdminJobs sends GET request to /admin/jobs and returns response.data', async () => {
    const originalGet = axiosClient.get;
    let capturedUrl = null;

    const mockResponse = {
      success: true,
      data: {
        content: [
          { id: 202, jobRole: 'DevOps Engineer' },
        ],
      },
    };

    axiosClient.get = async (url) => {
      capturedUrl = url;
      return mockResponse;
    };

    try {
      const result = await getAdminJobs({ page: 1, size: 10 });
      assert.strictEqual(capturedUrl, '/admin/jobs');
      assert.deepStrictEqual(result, mockResponse.data);
    } finally {
      axiosClient.get = originalGet;
    }
  });

  it('getJobById sends GET request to /jobs/:id and returns JobResponse', async () => {
    const originalGet = axiosClient.get;
    let capturedUrl = null;

    const mockResponse = {
      success: true,
      data: {
        id: 42,
        jobRole: 'Data Scientist',
        company: { name: 'Nvidia' },
      },
    };

    axiosClient.get = async (url) => {
      capturedUrl = url;
      return mockResponse;
    };

    try {
      const result = await getJobById(42);
      assert.strictEqual(capturedUrl, '/jobs/42');
      assert.deepStrictEqual(result, mockResponse.data);
      assert.strictEqual(result.id, 42);
    } finally {
      axiosClient.get = originalGet;
    }
  });

  it('propagates API errors properly and does not silently swallow or fake success', async () => {
    const originalGet = axiosClient.get;
    const networkError = new Error('Network error: Unable to connect to server');
    networkError.status = 0;

    axiosClient.get = async () => Promise.reject(networkError);

    try {
      await assert.rejects(
        async () => {
          await getJobs();
        },
        {
          message: 'Network error: Unable to connect to server',
        }
      );
    } finally {
      axiosClient.get = originalGet;
    }
  });
});
