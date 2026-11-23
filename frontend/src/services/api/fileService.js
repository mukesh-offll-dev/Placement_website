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
 * Files are served only to a request carrying the JWT in its Authorization header, so a
 * plain <a href> or <img src> can no longer open them. Everything below fetches the file
 * through axiosClient as a Blob and hands the page an object URL instead.
 */

/**
 * Turn a URL the backend returned ("/api/files/download/...") or a bare API path
 * ("/students/4/resume/download") into a path relative to axiosClient's baseURL.
 * Returns null for anything that is not one of our API paths (e.g. an external link),
 * so the token is never sent to another host.
 */
export const toApiPath = (url) => {
  if (!url || typeof url !== 'string') return null;
  const trimmed = url.trim();
  if (/^(blob:|data:)/i.test(trimmed)) return null;

  const base = String(API_BASE_URL || '/api').replace(/\/+$/, '');
  if (base && trimmed.startsWith(`${base}/`)) return trimmed.slice(base.length);
  if (trimmed.startsWith('/api/')) return trimmed.slice('/api'.length);
  if (/^https?:\/\//i.test(trimmed)) return null;
  return trimmed.startsWith('/') ? trimmed : null;
};

/** True for a URL that points at the backend and therefore needs an authenticated fetch. */
export const isApiFileUrl = (url) => toApiPath(url) !== null;

/** Pull the file name out of a Content-Disposition header, if it carries one. */
export const parseContentDispositionFileName = (disposition) => {
  if (!disposition || typeof disposition !== 'string') return null;
  const star = disposition.match(/filename\*\s*=\s*(?:UTF-8'')?([^;\n]+)/i);
  if (star && star[1]) {
    try {
      return decodeURIComponent(star[1].trim().replace(/['"]/g, ''));
    } catch {
      // fall through to the plain filename parameter
    }
  }
  const plain = disposition.match(/filename\s*=\s*((['"]).*?\2|[^;\n]*)/i);
  if (plain && plain[1]) {
    const name = plain[1].replace(/['"]/g, '').trim();
    return name || null;
  }
  return null;
};

/**
 * Fetch a protected file as a Blob, with the headers that describe it.
 * @param {string} pathOrUrl - API path or backend-returned URL
 * @param {{ params?: Object, signal?: AbortSignal }} [options]
 * @returns {Promise<{ blob: Blob, fileName: string|null, contentType: string }>}
 */
export const fetchFileBlob = async (pathOrUrl, { params, signal } = {}) => {
  const path = toApiPath(pathOrUrl);
  if (!path) {
    throw new Error('This file is not stored on the placement portal.');
  }
  const response = await axiosClient.get(path, {
    params,
    signal,
    responseType: 'blob',
    rawResponse: true,
  });
  const headers = response?.headers || {};
  const contentType = headers['content-type'] || 'application/octet-stream';
  const body = response?.data;
  if (body === undefined || body === null) {
    throw new Error('The server did not return a file.');
  }
  const blob = typeof Blob !== 'undefined' && body instanceof Blob && body.type
    ? body
    : new Blob([body], { type: contentType });
  return {
    blob,
    fileName: parseContentDispositionFileName(headers['content-disposition']),
    contentType,
  };
};

const getUrlApi = () => (typeof window !== 'undefined' && window.URL) || URL;

/** Save a Blob to disk through a temporary object URL. */
const saveBlob = (blob, fileName) => {
  const urlApi = getUrlApi();
  const blobUrl = urlApi.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = blobUrl;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => urlApi.revokeObjectURL(blobUrl), 1000);
};

/**
 * Download a protected file to disk.
 * @returns {Promise<string>} the file name used
 */
export const downloadProtectedFile = async (pathOrUrl, defaultFileName = 'download', options = {}) => {
  const { blob, fileName } = await fetchFileBlob(pathOrUrl, options);
  const name = fileName || defaultFileName;
  saveBlob(blob, name);
  return name;
};

/**
 * Open a protected file in a new tab (PDF/image preview).
 * The tab is opened before the request so the browser treats it as a user-initiated popup;
 * if the fetch fails it is closed again and the error is rethrown for the caller to show.
 */
export const openProtectedFile = async (pathOrUrl, options = {}) => {
  const popup = typeof window !== 'undefined' && window.open ? window.open('', '_blank') : null;
  try {
    const { blob } = await fetchFileBlob(pathOrUrl, options);
    const urlApi = getUrlApi();
    const blobUrl = urlApi.createObjectURL(blob);
    if (popup) {
      popup.location.href = blobUrl;
    } else if (typeof window !== 'undefined' && window.open) {
      window.open(blobUrl, '_blank');
    }
    // The tab holds its own reference once it has loaded; free ours after a minute.
    setTimeout(() => urlApi.revokeObjectURL(blobUrl), 60000);
    return true;
  } catch (err) {
    if (popup) popup.close();
    throw err;
  }
};

/** API path of a student's resume file. `studentId` is the student PROFILE id. */
export const getResumeFilePath = (studentId) => `/students/${studentId}/resume/download`;

/**
 * Download resume binary using the authenticated Axios client.
 * GET /api/students/{studentId}/resume/download?download=true
 */
export const downloadResumeBlob = async (studentId, options = {}) =>
  fetchFileBlob(getResumeFilePath(studentId), { ...options, params: { download: true } });

/**
 * Trigger download of student resume in browser via authenticated blob fetch.
 */
export const downloadStudentResumeFile = async (studentId, defaultFileName = 'Resume.pdf') => {
  const { blob, fileName } = await downloadResumeBlob(studentId);
  saveBlob(blob, fileName || defaultFileName);
  return true;
};

/** Open a student's resume inline in a new tab. */
export const viewStudentResumeFile = async (studentId) =>
  openProtectedFile(getResumeFilePath(studentId), { params: { download: false } });

/** API path for a stored file, by category and file name. */
export const getFileDownloadPath = (category, fileName) =>
  `/files/download/${encodeURIComponent(category)}/${encodeURIComponent(fileName)}`;

export const getFileViewPath = (category, fileName) =>
  `/files/view/${encodeURIComponent(category)}/${encodeURIComponent(fileName)}`;

const fileService = {
  validateFile,
  formatFileSize,
  uploadResume,
  getResume,
  deleteResume,
  toApiPath,
  isApiFileUrl,
  parseContentDispositionFileName,
  fetchFileBlob,
  downloadProtectedFile,
  openProtectedFile,
  getResumeFilePath,
  downloadResumeBlob,
  downloadStudentResumeFile,
  viewStudentResumeFile,
  getFileDownloadPath,
  getFileViewPath,
};

export default fileService;
