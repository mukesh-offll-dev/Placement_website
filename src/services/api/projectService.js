import axiosClient, { API_BASE_URL } from './axiosClient.js';

/**
 * Student Project & Project Media Service
 * Maps to backend:
 * - StudentProjectController (/api/student/projects/**)
 * - ProjectMediaController (/api/projects/**)
 */

/**
 * Retrieve all projects for the authenticated student.
 * GET /api/student/projects
 */
export const getAllProjects = async () => {
  const response = await axiosClient.get('/student/projects');
  return response?.data !== undefined ? response.data : response;
};

/**
 * Retrieve a specific project by ID.
 * GET /api/student/projects/{projectId}
 */
export const getProjectById = async (projectId) => {
  const response = await axiosClient.get(`/student/projects/${projectId}`);
  return response?.data !== undefined ? response.data : response;
};

/**
 * Create a new student project.
 * POST /api/student/projects
 * @param {Object} projectData - StudentProjectRequest
 */
export const createProject = async (projectData) => {
  const response = await axiosClient.post('/student/projects', projectData);
  return response?.data !== undefined ? response.data : response;
};

/**
 * Update an existing student project.
 * PUT /api/student/projects/{projectId}
 * @param {number|string} projectId
 * @param {Object} projectData - StudentProjectRequest
 */
export const updateProject = async (projectId, projectData) => {
  const response = await axiosClient.put(`/student/projects/${projectId}`, projectData);
  return response?.data !== undefined ? response.data : response;
};

/**
 * Delete a student project.
 * DELETE /api/student/projects/{projectId}
 * @param {number|string} projectId
 */
export const deleteProject = async (projectId) => {
  const response = await axiosClient.delete(`/student/projects/${projectId}`);
  return response?.data !== undefined ? response.data : response;
};

/**
 * Upload project media standalone (e.g. before project creation).
 * POST /api/projects/media/upload
 * @param {File} file
 */
export const uploadProjectMediaStandalone = async (file) => {
  const formData = new FormData();
  formData.append('file', file);

  const response = await axiosClient.post('/projects/media/upload', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return response?.data !== undefined ? response.data : response;
};

/**
 * Upload media and attach to an existing project.
 * POST /api/projects/{projectId}/media
 * @param {number|string} projectId
 * @param {File} file
 */
export const uploadProjectMedia = async (projectId, file) => {
  const formData = new FormData();
  formData.append('file', file);

  const response = await axiosClient.post(`/projects/${projectId}/media`, formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return response?.data !== undefined ? response.data : response;
};

/**
 * Get project media metadata.
 * GET /api/projects/{projectId}/media
 * @param {number|string} projectId
 */
export const getProjectMedia = async (projectId) => {
  const response = await axiosClient.get(`/projects/${projectId}/media`);
  return response?.data !== undefined ? response.data : response;
};

/**
 * Delete media attached to a project.
 * DELETE /api/projects/{projectId}/media
 * @param {number|string} projectId
 */
export const deleteProjectMedia = async (projectId) => {
  const response = await axiosClient.delete(`/projects/${projectId}/media`);
  return response?.data !== undefined ? response.data : response;
};

/**
 * Helper to get project media download/stream URL.
 * GET /api/projects/{projectId}/media/download
 */
export const getProjectMediaUrl = (projectId) => {
  return `${API_BASE_URL}/projects/${projectId}/media/download`;
};

const projectService = {
  getAllProjects,
  getProjectById,
  createProject,
  updateProject,
  deleteProject,
  uploadProjectMediaStandalone,
  uploadProjectMedia,
  getProjectMedia,
  deleteProjectMedia,
  getProjectMediaUrl,
};

export default projectService;
