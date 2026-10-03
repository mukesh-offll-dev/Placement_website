import axiosClient, { API_BASE_URL } from './axiosClient.js';

/**
 * File & Resume Service
 * Maps to backend:
 * - StudentResumeController (/api/students/{studentId}/resume/**)
 * - FileDownloadController (/api/files/**)
 */

/**
 * Validate a file before upload
 */
export const validateFile = (file, allowedExtensions, maxSizeBytes) => {
  if (!file) {
    return { valid: false, error: 'No file selected.' };
  }

  const ext = file.name.split('.').pop()?.toLowerCase();
  if (!ext || !allowedExtensions.map((e) => e.toLowerCase()).includes(ext)) {
    return {
      valid: false,
      error: `Invalid file format (.${ext}). Allowed formats: ${allowedExtensions.map((e) => `.${e}`).join(', ')}`,
    };
  }

  if (file.size > maxSizeBytes) {
    const maxMb = Math.round(maxSizeBytes / (1024 * 1024));
    return {
      valid: false,
      error: `File size (${(file.size / (1024 * 1024)).toFixed(1)}MB) exceeds maximum allowed size of ${maxMb}MB.`,
    };
  }

  return { valid: true, error: null };
};

/**
 * Format bytes to readable string (e.g. 2.4 MB)
 */
export const formatFileSize = (bytes) => {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
};

/**
 * Upload student resume to backend
 * POST /api/students/{studentId}/resume
 */
export const uploadResume = async (studentId, file) => {
  const formData = new FormData();
  formData.append('file', file);

  const response = await axiosClient.post(`/students/${studentId}/resume`, formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return response.data;
};

/**
 * Get student resume details from backend
 * GET /api/students/{studentId}/resume
 */
export const getResume = async (studentId) => {
  const response = await axiosClient.get(`/students/${studentId}/resume`);
  return response.data;
};

/**
 * Delete student resume from backend
 * DELETE /api/students/{studentId}/resume
 */
export const deleteResume = async (studentId) => {
  const response = await axiosClient.delete(`/students/${studentId}/resume`);
  return response.data;
};

/**
 * Get resume inline view URL
 */
export const getResumeViewUrl = (studentId) =>
  `${API_BASE_URL}/students/${studentId}/resume/download?download=false`;

/**
 * Get resume attachment download URL
 */
export const getResumeDownloadUrl = (studentId) =>
  `${API_BASE_URL}/students/${studentId}/resume/download?download=true`;

/**
 * Get file download URL by category and fileName
 */
export const getFileDownloadUrl = (category, fileName) =>
  `${API_BASE_URL}/files/download/${category}/${fileName}`;

/**
 * Get file inline view URL by category and fileName
 */
export const getFileViewUrl = (category, fileName) =>
  `${API_BASE_URL}/files/view/${category}/${fileName}`;

const fileService = {
  validateFile,
  formatFileSize,
  uploadResume,
  getResume,
  deleteResume,
  getResumeViewUrl,
  getResumeDownloadUrl,
  getFileDownloadUrl,
  getFileViewUrl,
};

export default fileService;
