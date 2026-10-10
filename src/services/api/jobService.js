import axiosClient from './axiosClient.js';

/**
 * Job API Service
 * Maps to backend:
 * - JobController (/api/jobs/**)
 * - AdminJobController (/api/admin/jobs/**)
 */

/**
 * Fetch open jobs for students/public.
 * GET /api/jobs
 *
 * @param {Object} [params] - Query parameters { page, size }
 * @param {Object} [options] - Axios request options (e.g. signal for AbortController)
 * @returns {Promise<Object>} Spring Page object or jobs array
 */
export const getJobs = async (params = {}, options = {}) => {
  const response = await axiosClient.get('/jobs', {
    params,
    ...options,
  });
  return response.data;
};

/**
 * Fetch all jobs for placement officers/admin.
 * GET /api/admin/jobs
 *
 * @param {Object} [params] - Query parameters { page, size }
 * @param {Object} [options] - Axios request options (e.g. signal for AbortController)
 * @returns {Promise<Object>} Spring Page object or jobs array
 */
export const getAdminJobs = async (params = {}, options = {}) => {
  const response = await axiosClient.get('/admin/jobs', {
    params,
    ...options,
  });
  return response.data;
};

/**
 * Fetch public job details by ID.
 * GET /api/jobs/{id}
 *
 * @param {number|string} id - Job ID
 * @param {Object} [options] - Axios request options
 * @returns {Promise<Object>} JobResponse object
 */
export const getJobById = async (id, options = {}) => {
  const response = await axiosClient.get(`/jobs/${id}`, options);
  return response.data;
};

const jobService = {
  getJobs,
  getAdminJobs,
  getJobById,
};

export default jobService;
