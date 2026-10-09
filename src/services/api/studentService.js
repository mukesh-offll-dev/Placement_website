import axiosClient from './axiosClient.js';

const APPLICATIONS_PAGE_SIZE = 100;

/**
 * Student API Service
 * Maps to backend:
 * - StudentController (/api/student/me)
 * - StudentProfileController (/api/student/profile)
 * - StudentApplicationController (/api/student/applications)
 */

const getApplicationPage = async (page, signal) => {
  const response = await axiosClient.get('/student/applications', {
    params: { page, size: APPLICATIONS_PAGE_SIZE },
    signal,
  });
  const result = response?.data;

  if (
    !result ||
    !Array.isArray(result.content) ||
    !Number.isInteger(result.totalPages) ||
    result.totalPages < 0 ||
    result.content.some(
      (application) =>
        !application ||
        typeof application !== 'object' ||
        ((typeof application.id !== 'number' || !Number.isFinite(application.id)) &&
          !(typeof application.id === 'string' && application.id.length > 0))
    )
  ) {
    throw new Error('The applications response has an unexpected format.');
  }

  return result;
};

/**
 * Retrieve every application belonging to the authenticated student.
 * GET /api/student/applications?page={page}&size=100
 */
export const getMyApplications = async ({ signal } = {}) => {
  const applications = [];
  let page = 0;
  let totalPages = 1;

  while (page < totalPages) {
    const result = await getApplicationPage(page, signal);
    applications.push(...result.content);
    totalPages = result.totalPages;
    page += 1;
  }

  return applications;
};

/**
 * Retrieve one of the authenticated student's applications, including its timeline.
 * GET /api/student/applications/{applicationId}
 */
export const getMyApplication = async (applicationId, { signal } = {}) => {
  const response = await axiosClient.get(`/student/applications/${applicationId}`, { signal });
  const application = response?.data;

  if (
    !application ||
    typeof application !== 'object' ||
    !Array.isArray(application.timeline) ||
    application.timeline.some((stage) => !stage || typeof stage !== 'object')
  ) {
    throw new Error('The application detail response has an unexpected format.');
  }

  return application;
};

/**
 * Get authenticated student's profile summary.
 * GET /api/student/me
 */
export const getMyProfileSummary = async () => {
  const response = await axiosClient.get('/student/me');
  return response.data;
};

/**
 * Get authenticated student's detailed profile.
 * GET /api/student/profile
 */
export const getProfile = async () => {
  const response = await axiosClient.get('/student/profile');
  return response.data;
};

/**
 * Create profile for authenticated student.
 * POST /api/student/profile
 * @param {Object} profileData - StudentProfileRequest
 */
export const createProfile = async (profileData) => {
  const response = await axiosClient.post('/student/profile', profileData);
  return response.data;
};

/**
 * Update profile for authenticated student.
 * PUT /api/student/profile
 * @param {Object} profileData - StudentProfileRequest
 */
export const updateProfile = async (profileData) => {
  const response = await axiosClient.put('/student/profile', profileData);
  return response.data;
};

const studentService = {
  getMyApplications,
  getMyApplication,
  getMyProfileSummary,
  getProfile,
  createProfile,
  updateProfile,
};

export default studentService;
