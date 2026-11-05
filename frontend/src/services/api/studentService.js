import axiosClient from './axiosClient.js';

const APPLICATIONS_PAGE_SIZE = 100;

/**
 * Student API Service
 * Maps to backend:
 * - StudentController (/api/student/me, /api/student/dashboard)
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
 * Submit an application for the authenticated student.
 * POST /api/student/applications
 */
export const submitApplication = async (applicationData) => {
  const response = await axiosClient.post('/student/applications', applicationData);
  return response?.data !== undefined ? response.data : response;
};

/**
 * Get authenticated student's profile summary.
 * GET /api/student/me
 */
export const getMyProfileSummary = async () => {
  const response = await axiosClient.get('/student/me');
  return response?.data !== undefined ? response.data : response;
};

/**
 * Get authenticated student's dashboard statistics.
 * GET /api/student/dashboard
 */
export const getStudentDashboard = async () => {
  const response = await axiosClient.get('/student/dashboard');
  return response?.data !== undefined ? response.data : response;
};

/**
 * Get authenticated student's detailed profile.
 * GET /api/student/profile
 */
export const getProfile = async () => {
  const response = await axiosClient.get('/student/profile');
  return response?.data !== undefined ? response.data : response;
};

/**
 * Create profile for authenticated student.
 * POST /api/student/profile
 * @param {Object} profileData - StudentProfileRequest
 */
export const createProfile = async (profileData) => {
  const response = await axiosClient.post('/student/profile', profileData);
  return response?.data !== undefined ? response.data : response;
};

/**
 * Update profile for authenticated student.
 * PUT /api/student/profile
 * @param {Object} profileData - StudentProfileRequest
 */
export const updateProfile = async (profileData) => {
  const response = await axiosClient.put('/student/profile', profileData);
  return response?.data !== undefined ? response.data : response;
};

/**
 * Retrieve skills for authenticated student.
 * GET /api/student/profile/skills
 */
export const getSkills = async () => {
  const response = await axiosClient.get('/student/profile/skills');
  return response?.data !== undefined ? response.data : response;
};

/**
 * Replace all skills for authenticated student.
 * PUT /api/student/profile/skills
 * @param {Array<string>} skills
 */
export const updateSkills = async (skills) => {
  const response = await axiosClient.put('/student/profile/skills', skills);
  return response?.data !== undefined ? response.data : response;
};

/**
 * Add a single skill for authenticated student.
 * POST /api/student/profile/skills
 * @param {string|{skillName: string, proficiency?: string}} skillData
 */
export const addSkill = async (skillData) => {
  const payload = typeof skillData === 'string' ? { skillName: skillData } : skillData;
  const response = await axiosClient.post('/student/profile/skills', payload);
  return response?.data !== undefined ? response.data : response;
};

/**
 * Update an existing skill for authenticated student.
 * PUT /api/student/profile/skills/{skillId}
 * @param {number|string} skillId
 * @param {string|{skillName: string, proficiency?: string}} skillData
 */
export const updateSkill = async (skillId, skillData) => {
  const payload = typeof skillData === 'string' ? { skillName: skillData } : skillData;
  const response = await axiosClient.put(`/student/profile/skills/${skillId}`, payload);
  return response?.data !== undefined ? response.data : response;
};

/**
 * Delete a skill for authenticated student.
 * DELETE /api/student/profile/skills/{skillId}
 * @param {number|string} skillId
 */
export const deleteSkill = async (skillId) => {
  const response = await axiosClient.delete(`/student/profile/skills/${skillId}`);
  return response?.data !== undefined ? response.data : response;
};

/**
 * Retrieve education history for authenticated student.
 * GET /api/student/education
 */
export const getEducation = async () => {
  const response = await axiosClient.get('/student/education');
  return response?.data !== undefined ? response.data : response;
};

/**
 * Add an education record for authenticated student.
 * POST /api/student/education
 * @param {Object} educationData
 */
export const addEducation = async (educationData) => {
  const response = await axiosClient.post('/student/education', educationData);
  return response?.data !== undefined ? response.data : response;
};

/**
 * Update an education record for authenticated student.
 * PUT /api/student/education/{educationId}
 * @param {number|string} educationId
 * @param {Object} educationData
 */
export const updateEducation = async (educationId, educationData) => {
  const response = await axiosClient.put(`/student/education/${educationId}`, educationData);
  return response?.data !== undefined ? response.data : response;
};

/**
 * Delete an education record for authenticated student.
 * DELETE /api/student/education/{educationId}
 * @param {number|string} educationId
 */
export const deleteEducation = async (educationId) => {
  const response = await axiosClient.delete(`/student/education/${educationId}`);
  return response?.data !== undefined ? response.data : response;
};

/**
 * Retrieve internship/experience history for authenticated student.
 * GET /api/student/experience
 */
export const getExperience = async () => {
  const response = await axiosClient.get('/student/experience');
  return response?.data !== undefined ? response.data : response;
};

/**
 * Add an internship/experience record for authenticated student.
 * POST /api/student/experience
 * @param {Object} experienceData
 */
export const addExperience = async (experienceData) => {
  const response = await axiosClient.post('/student/experience', experienceData);
  return response?.data !== undefined ? response.data : response;
};

/**
 * Update an internship/experience record for authenticated student.
 * PUT /api/student/experience/{experienceId}
 * @param {number|string} experienceId
 * @param {Object} experienceData
 */
export const updateExperience = async (experienceId, experienceData) => {
  const response = await axiosClient.put(`/student/experience/${experienceId}`, experienceData);
  return response?.data !== undefined ? response.data : response;
};

/**
 * Delete an internship/experience record for authenticated student.
 * DELETE /api/student/experience/{experienceId}
 * @param {number|string} experienceId
 */
export const deleteExperience = async (experienceId) => {
  const response = await axiosClient.delete(`/student/experience/${experienceId}`);
  return response?.data !== undefined ? response.data : response;
};

const studentService = {
  getMyApplications,
  getMyApplication,
  submitApplication,
  getMyProfileSummary,
  getStudentDashboard,
  getProfile,
  createProfile,
  updateProfile,
  getSkills,
  updateSkills,
  addSkill,
  updateSkill,
  deleteSkill,
  getEducation,
  addEducation,
  updateEducation,
  deleteEducation,
  getExperience,
  addExperience,
  updateExperience,
  deleteExperience,
};

export default studentService;
