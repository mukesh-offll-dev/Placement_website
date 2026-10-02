const API_BASE_URL = '/api';

/**
 * File validation helper
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
 * Format bytes to readable string
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
 */
export const uploadStudentResume = async (studentId, file) => {
  const formData = new FormData();
  formData.append('file', file);

  try {
    const response = await fetch(`${API_BASE_URL}/students/${studentId}/resume`, {
      method: 'POST',
      body: formData,
    });

    const result = await response.json();
    if (!response.ok) {
      throw new Error(result.message || 'Failed to upload resume');
    }
    return { success: true, data: result.data, message: result.message };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

/**
 * Get student resume details from backend
 */
export const getStudentResume = async (studentId) => {
  try {
    const response = await fetch(`${API_BASE_URL}/students/${studentId}/resume`);
    const result = await response.json();
    if (!response.ok) {
      throw new Error(result.message || 'Resume not found');
    }
    return { success: true, data: result.data };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

/**
 * Delete student resume from backend
 */
export const deleteStudentResume = async (studentId) => {
  try {
    const response = await fetch(`${API_BASE_URL}/students/${studentId}/resume`, {
      method: 'DELETE',
    });
    const result = await response.json();
    if (!response.ok) {
      throw new Error(result.message || 'Failed to delete resume');
    }
    return { success: true, message: result.message };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

/**
 * Upload project media (standalone or when creating new project)
 */
export const uploadProjectMediaStandalone = async (file) => {
  const formData = new FormData();
  formData.append('file', file);

  try {
    const response = await fetch(`${API_BASE_URL}/projects/media/upload`, {
      method: 'POST',
      body: formData,
    });

    const result = await response.json();
    if (!response.ok) {
      throw new Error(result.message || 'Failed to upload project media');
    }
    return { success: true, data: result.data, message: result.message };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

/**
 * Upload and attach media to existing project
 */
export const uploadProjectMedia = async (projectId, file) => {
  const formData = new FormData();
  formData.append('file', file);

  try {
    const response = await fetch(`${API_BASE_URL}/projects/${projectId}/media`, {
      method: 'POST',
      body: formData,
    });

    const result = await response.json();
    if (!response.ok) {
      throw new Error(result.message || 'Failed to upload project media');
    }
    return { success: true, data: result.data, message: result.message };
  } catch (error) {
    return { success: false, error: error.message };
  }
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


