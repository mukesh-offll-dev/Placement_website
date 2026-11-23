import axiosClient from './axiosClient.js';

/**
 * Student profile draft & verification service (upgrade spec §3 and §8).
 *
 * The student edits a DRAFT copy of their profile and submits it for verification by their
 * department's faculty advisor; the official profile changes only when a verifier approves.
 *
 * Endpoints (all under /api, data = payload inside ApiResponse):
 * - GET    /student/profile/draft
 * - PUT    /student/profile/draft            {data, studentNote?}
 * - DELETE /student/profile/draft
 * - POST   /student/profile/draft/submit     {studentNote?}
 * - POST   /student/profile/draft/withdraw
 * - GET    /student/verifications
 * - GET    /student/verifications/{id}
 * - POST   /student/verification/files       multipart file, section?
 */

const unwrap = (response) => (response && response.data !== undefined ? response.data : response ?? null);

/** Current working draft (or a not-yet-saved draft built from official data). */
export const getDraft = async ({ signal } = {}) =>
  unwrap(await axiosClient.get('/student/profile/draft', { signal }));

/**
 * Save the draft.
 * @param {Object} data - ProfileData
 * @param {string} [studentNote]
 */
export const saveDraft = async (data, studentNote) => {
  const body = { data };
  if (studentNote !== undefined && studentNote !== null && String(studentNote).trim()) {
    body.studentNote = String(studentNote).trim();
  }
  return unwrap(await axiosClient.put('/student/profile/draft', body));
};

/** Discard the working DRAFT. Resolves to null. */
export const discardDraft = async () => {
  await axiosClient.delete('/student/profile/draft');
  return null;
};

/** Submit the saved draft for verification (DRAFT → PENDING). */
export const submitDraft = async (studentNote) => {
  const note = typeof studentNote === 'string' ? studentNote.trim() : '';
  return unwrap(await axiosClient.post('/student/profile/draft/submit', note ? { studentNote: note } : {}));
};

/** Withdraw a pending request; the server returns a fresh DRAFT copy. */
export const withdrawDraft = async () => unwrap(await axiosClient.post('/student/profile/draft/withdraw'));

/** The student's verification requests, newest first. */
export const getVerificationHistory = async ({ signal } = {}) => {
  const data = unwrap(await axiosClient.get('/student/verifications', { signal }));
  if (Array.isArray(data)) return data;
  if (data && Array.isArray(data.content)) return data.content;
  return [];
};

/** One verification request with its proposed/base/current data and event timeline. */
export const getVerification = async (id, { signal } = {}) =>
  unwrap(await axiosClient.get(`/student/verifications/${encodeURIComponent(id)}`, { signal }));

/**
 * Upload a file referenced from the draft (resume, certificate, achievement proof,
 * supporting document, project media, evidence).
 * @param {File|Blob} file
 * @param {string} [section] - section key, e.g. "RESUME"
 * @returns {Promise<{fileUrl: string, fileName: string, contentType: string, size: number}>}
 */
export const uploadVerificationFile = async (file, section) => {
  const formData = new FormData();
  formData.append('file', file);
  if (section) formData.append('section', section);
  const data = unwrap(
    await axiosClient.post('/student/verification/files', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      // Uploads can take longer than the default 15 s on a slow connection.
      timeout: 60000,
    })
  );
  if (!data || typeof data.fileUrl !== 'string' || !data.fileUrl) {
    throw new Error('The server did not return the uploaded file.');
  }
  return data;
};

const studentDraftService = {
  getDraft,
  saveDraft,
  discardDraft,
  submitDraft,
  withdrawDraft,
  getVerificationHistory,
  getVerification,
  uploadVerificationFile,
};

export default studentDraftService;
