import axiosClient, { API_BASE_URL, TOKEN_KEY, LEGACY_TOKEN_KEY } from './axiosClient.js';

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

const getCurrentToken = () => {
  if (typeof window === 'undefined' || !window.localStorage) return null;
  return localStorage.getItem(TOKEN_KEY) || localStorage.getItem(LEGACY_TOKEN_KEY);
};

/**
 * Get resume inline view URL
 */
export const getResumeViewUrl = (studentId) => {
  const token = getCurrentToken();
  const tokenParam = token ? `&token=${encodeURIComponent(token)}` : '';
  return `${API_BASE_URL}/students/${studentId}/resume/download?download=false${tokenParam}`;
};

/**
 * Get resume attachment download URL
 */
export const getResumeDownloadUrl = (studentId) => {
  const token = getCurrentToken();
  const tokenParam = token ? `&token=${encodeURIComponent(token)}` : '';
  return `${API_BASE_URL}/students/${studentId}/resume/download?download=true${tokenParam}`;
};

/**
 * Download resume binary blob using authenticated Axios client.
 * GET /api/students/{studentId}/resume/download?download=true
 */
export const downloadResumeBlob = async (studentId) => {
  const response = await axiosClient.get(`/students/${studentId}/resume/download?download=true`, {
    responseType: 'blob',
  });
  return response;
};

/**
 * Trigger download of student resume in browser via authenticated blob fetch.
 */
export const downloadStudentResumeFile = async (studentId, defaultFileName = 'Resume.pdf') => {
  const response = await downloadResumeBlob(studentId);
  const blob = new Blob([response.data], {
    type: response.headers?.['content-type'] || 'application/pdf',
  });

  let fileName = defaultFileName;
  const disposition = response.headers?.['content-disposition'];
  if (disposition && disposition.indexOf('filename=') !== -1) {
    const filenameMatch = disposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
    if (filenameMatch && filenameMatch[1]) {
      fileName = filenameMatch[1].replace(/['"]/g, '').trim();
    }
  }

  const blobUrl = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = blobUrl;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => window.URL.revokeObjectURL(blobUrl), 1000);
  return true;
};

/**
 * Get file download URL by category and fileName
 */
export const getFileDownloadUrl = (category, fileName) => {
  const token = getCurrentToken();
  const tokenParam = token ? `?token=${encodeURIComponent(token)}` : '';
  return `${API_BASE_URL}/files/download/${category}/${fileName}${tokenParam}`;
};

/**
 * Get file inline view URL by category and fileName
 */
export const getFileViewUrl = (category, fileName) => {
  const token = getCurrentToken();
  const tokenParam = token ? `?token=${encodeURIComponent(token)}` : '';
  return `${API_BASE_URL}/files/view/${category}/${fileName}${tokenParam}`;
};

const fileService = {
  validateFile,
  formatFileSize,
  uploadResume,
  getResume,
  deleteResume,
  downloadResumeBlob,
  downloadStudentResumeFile,
  getResumeViewUrl,
  getResumeDownloadUrl,
  getFileDownloadUrl,
  getFileViewUrl,
};

export default fileService;
