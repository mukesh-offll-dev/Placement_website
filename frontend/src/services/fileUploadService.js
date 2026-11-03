import {
  validateFile,
  formatFileSize,
  uploadResume as apiUploadResume,
  getResume as apiGetResume,
  deleteResume as apiDeleteResume,
  getResumeViewUrl,
  getResumeDownloadUrl,
} from './api/fileService.js';

import {
  uploadProjectMediaStandalone as apiUploadProjectMediaStandalone,
  uploadProjectMedia as apiUploadProjectMedia,
} from './api/projectService.js';

export { validateFile, formatFileSize, getResumeViewUrl, getResumeDownloadUrl };

/**
 * Upload student resume to backend
 */
export const uploadStudentResume = async (studentId, file) => {
  try {
    const data = await apiUploadResume(studentId, file);
    return { success: true, data, message: 'Resume uploaded successfully' };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

/**
 * Get student resume details from backend
 */
export const getStudentResume = async (studentId) => {
  try {
    const data = await apiGetResume(studentId);
    return { success: true, data };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

/**
 * Delete student resume from backend
 */
export const deleteStudentResume = async (studentId) => {
  try {
    const data = await apiDeleteResume(studentId);
    return { success: true, message: 'Resume deleted successfully', data };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

/**
 * Upload project media (standalone or when creating new project)
 */
export const uploadProjectMediaStandalone = async (file) => {
  try {
    const data = await apiUploadProjectMediaStandalone(file);
    return { success: true, data, message: 'Project media uploaded successfully' };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

/**
 * Upload and attach media to existing project
 */
export const uploadProjectMedia = async (projectId, file) => {
  try {
    const data = await apiUploadProjectMedia(projectId, file);
    return { success: true, data, message: 'Project media attached successfully' };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

const fileUploadService = {
  validateFile,
  formatFileSize,
  uploadStudentResume,
  getStudentResume,
  deleteStudentResume,
  uploadProjectMediaStandalone,
  uploadProjectMedia,
  getResumeViewUrl,
  getResumeDownloadUrl,
};

export default fileUploadService;
