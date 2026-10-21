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

/**
 * Fetch a single job for the admin edit form.
 * GET /api/admin/jobs/{id}
 */
export const getAdminJobById = async (id, options = {}) => {
  const response = await axiosClient.get(`/admin/jobs/${id}`, options);
  return response.data;
};

/**
 * Companies available to attach a drive to.
 * GET /api/admin/companies
 */
export const getCompanies = async (options = {}) => {
  const response = await axiosClient.get('/admin/companies', options);
  return response.data;
};

/**
 * Add a recruiter that is not on file yet.
 * POST /api/admin/companies
 *
 * A drive requires a company, so without this the form is a dead end on a
 * database that has none.
 */
export const createCompany = async (company, options = {}) => {
  const response = await axiosClient.post('/admin/companies', company, options);
  return response.data;
};

/**
 * Post a new job drive.
 * POST /api/admin/jobs
 *
 * @param {Object} job - JobRequest payload; build it with buildJobPayload so the
 *   empty strings the form holds become nulls the backend accepts.
 */
export const createJob = async (job, options = {}) => {
  const response = await axiosClient.post('/admin/jobs', job, options);
  return response.data;
};

/**
 * Update an existing drive.
 * PUT /api/admin/jobs/{id}
 */
export const updateJob = async (id, job, options = {}) => {
  const response = await axiosClient.put(`/admin/jobs/${id}`, job, options);
  return response.data;
};

/**
 * Soft-delete a drive.
 * DELETE /api/admin/jobs/{id}
 */
export const deleteJob = async (id, options = {}) => {
  const response = await axiosClient.delete(`/admin/jobs/${id}`, options);
  return response.data;
};

const jobService = {
  getJobs,
  getAdminJobs,
  getJobById,
  getAdminJobById,
  getCompanies,
  createCompany,
  createJob,
  updateJob,
  deleteJob,
};

export default jobService;
