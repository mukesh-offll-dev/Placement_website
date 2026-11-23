/**
 * Request builders and labels for student management (admin and faculty share them), kept free of
 * React so they can be unit tested.
 */

export const LIFECYCLE_TABS = Object.freeze([
  { value: 'ACTIVE', label: 'Active' },
  { value: 'DISABLED', label: 'Disabled' },
  { value: 'ARCHIVED', label: 'Archived' },
  { value: 'ALL', label: 'All' },
]);

export const VERIFICATION_STATUSES = Object.freeze(['PENDING', 'VERIFIED', 'REJECTED', 'NOT_SUBMITTED']);

export const BULK_ACTIONS = Object.freeze(['DELETE', 'DISABLE', 'ENABLE', 'ARCHIVE', 'RESTORE']);
export const MAX_BULK_IDS = 1000;
export const MAX_SELECT_ALL = 5000;

const LIFECYCLE_VALUES = ['ACTIVE', 'DISABLED', 'ARCHIVED', 'ALL'];

const present = (v) => v !== undefined && v !== null && String(v).trim() !== '' && v !== 'All' && v !== 'ALL_STATUSES';

/**
 * Query parameters for GET /admin/students, /faculty/students and their /ids variants.
 * Blank or "All" filters are left out so the backend applies its defaults.
 *
 * @param {{ search?, lifecycle?, verificationStatus?, batch?, department?, page?, size?, sortBy?, sortDir? }} filters
 * @param {{ paged?: boolean }} [options] - false for the /ids endpoint (no page/size/sort)
 */
export const buildStudentListParams = (filters = {}, { paged = true } = {}) => {
  const params = {};
  if (present(filters.search)) params.search = String(filters.search).trim();
  if (filters.lifecycle && LIFECYCLE_VALUES.includes(filters.lifecycle)) params.lifecycle = filters.lifecycle;
  if (present(filters.verificationStatus) && VERIFICATION_STATUSES.includes(filters.verificationStatus)) {
    params.verificationStatus = filters.verificationStatus;
  }
  if (present(filters.batch)) params.batch = String(filters.batch).trim();
  if (present(filters.department)) params.department = String(filters.department).trim();
  if (paged) {
    if (Number.isInteger(filters.page) && filters.page >= 0) params.page = filters.page;
    if (Number.isInteger(filters.size) && filters.size > 0) params.size = filters.size;
    if (filters.sortBy) params.sortBy = filters.sortBy;
    if (filters.sortDir) params.sortDir = filters.sortDir;
  }
  return params;
};

/**
 * Body for POST /admin/students/bulk and /faculty/students/bulk. Throws on input the backend would
 * refuse, so the caller can show the problem without a round trip.
 *
 * @param {Array<number|string>} ids
 * @param {string} action
 * @param {string} [reason]
 */
export const buildBulkPayload = (ids, action, reason) => {
  const act = String(action || '').toUpperCase();
  if (!BULK_ACTIONS.includes(act)) throw new Error(`Unknown bulk action: ${action}`);
  const studentIds = Array.from(new Set((ids || []).map(Number).filter((n) => Number.isInteger(n) && n > 0)));
  if (studentIds.length === 0) throw new Error('Select at least one student.');
  if (studentIds.length > MAX_BULK_IDS) throw new Error(`At most ${MAX_BULK_IDS} students per action.`);
  const payload = { studentIds, action: act };
  const text = String(reason ?? '').trim();
  if (text) payload.reason = text.slice(0, 255);
  return payload;
};

/** Splits a large selection into backend-sized chunks (1000 ids each). */
export const chunkIds = (ids, size = MAX_BULK_IDS) => {
  const chunks = [];
  for (let i = 0; i < ids.length; i += size) chunks.push(ids.slice(i, i + size));
  return chunks;
};

/** Adds bulk results from several chunks into one {requested, succeeded, skipped, failed}. */
export const mergeBulkResults = (results) =>
  (results || []).reduce(
    (acc, r) => ({
      requested: acc.requested + (Number(r?.requested) || 0),
      succeeded: acc.succeeded + (Number(r?.succeeded) || 0),
      skipped: acc.skipped + (Number(r?.skipped) || 0),
      failed: acc.failed.concat(Array.isArray(r?.failed) ? r.failed : []),
    }),
    { requested: 0, succeeded: 0, skipped: 0, failed: [] }
  );

const PAST = { DELETE: 'deleted', DISABLE: 'disabled', ENABLE: 'enabled', ARCHIVE: 'archived', RESTORE: 'restored' };

/** "12 archived, 2 skipped, 1 failed" for the result toast. */
export const summarizeBulkResult = (action, result) => {
  const r = result || {};
  const parts = [`${Number(r.succeeded) || 0} ${PAST[String(action).toUpperCase()] || 'updated'}`];
  if (Number(r.skipped) > 0) parts.push(`${r.skipped} skipped`);
  const failed = Array.isArray(r.failed) ? r.failed.length : Number(r.failed) || 0;
  if (failed > 0) parts.push(`${failed} failed`);
  return parts.join(', ');
};

/** Lifecycle of a StudentSummaryDto, falling back to isActive for rows from an older backend. */
export const lifecycleOf = (student) => {
  if (student?.lifecycleStatus) return student.lifecycleStatus;
  return student?.isActive === false ? 'DISABLED' : 'ACTIVE';
};

export const LIFECYCLE_BADGES = Object.freeze({
  ACTIVE: { label: 'Active', cls: 'bg-green-100 text-green-700' },
  DISABLED: { label: 'Disabled', cls: 'bg-gray-100 text-gray-600' },
  ARCHIVED: { label: 'Archived', cls: 'bg-amber-100 text-amber-700' },
});

export const VERIFICATION_BADGES = Object.freeze({
  PENDING: { label: 'Pending', cls: 'bg-amber-100 text-amber-700' },
  VERIFIED: { label: 'Verified', cls: 'bg-green-100 text-green-700' },
  REJECTED: { label: 'Rejected', cls: 'bg-red-100 text-red-700' },
  NOT_SUBMITTED: { label: 'Not submitted', cls: 'bg-gray-100 text-gray-600' },
  APPROVED: { label: 'Approved', cls: 'bg-green-100 text-green-700' },
  WITHDRAWN: { label: 'Withdrawn', cls: 'bg-gray-100 text-gray-600' },
  DISCARDED: { label: 'Discarded', cls: 'bg-gray-100 text-gray-600' },
  DRAFT: { label: 'Draft', cls: 'bg-blue-100 text-blue-700' },
});

export const badgeFor = (map, value) =>
  map[value] || { label: value ? String(value).replace(/_/g, ' ').toLowerCase() : '—', cls: 'bg-gray-100 text-gray-600' };

/** A bulk delete is confirmed by typing the number of selected students or the word DELETE. */
export const isBulkDeleteConfirmed = (typed, count) => {
  const t = String(typed ?? '').trim();
  return t.toUpperCase() === 'DELETE' || (t !== '' && Number(t) === Number(count));
};

/** Which bulk actions to offer for a lifecycle tab and role (RESTORE: ADMIN, archived tab only). */
export const bulkActionsFor = (lifecycle, { canRestore = false } = {}) => {
  const actions = [];
  if (lifecycle !== 'DISABLED') actions.push('DISABLE');
  if (lifecycle !== 'ACTIVE') actions.push('ENABLE');
  if (lifecycle !== 'ARCHIVED') actions.push('ARCHIVE');
  if (canRestore && lifecycle === 'ARCHIVED') actions.push('RESTORE');
  actions.push('DELETE');
  return lifecycle === 'ARCHIVED' ? actions.filter((a) => a !== 'ENABLE' && a !== 'DISABLE') : actions;
};
