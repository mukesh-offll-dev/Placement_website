import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  buildBulkPayload,
  buildStudentListParams,
  chunkIds,
  lifecycleOf,
  mergeBulkResults,
  summarizeBulkResult,
} from './studentQuery.js';

test('buildStudentListParams drops blank and "All" filters', () => {
  assert.deepEqual(
    buildStudentListParams({ search: '  ', lifecycle: 'ACTIVE', verificationStatus: 'All', batch: '', page: 0, size: 20 }),
    { lifecycle: 'ACTIVE', page: 0, size: 20 }
  );
});

test('buildStudentListParams keeps valid filters and trims search', () => {
  assert.deepEqual(
    buildStudentListParams({ search: ' 8301 ', lifecycle: 'ARCHIVED', verificationStatus: 'PENDING', batch: '2026', department: 'CSE', page: 2, size: 10, sortBy: 'rollNo', sortDir: 'asc' }),
    { search: '8301', lifecycle: 'ARCHIVED', verificationStatus: 'PENDING', batch: '2026', department: 'CSE', page: 2, size: 10, sortBy: 'rollNo', sortDir: 'asc' }
  );
});

test('buildStudentListParams omits paging for the ids endpoint and ignores unknown values', () => {
  assert.deepEqual(
    buildStudentListParams({ lifecycle: 'BOGUS', verificationStatus: 'NOPE', page: 3, size: 10 }, { paged: false }),
    {}
  );
});

test('buildBulkPayload normalises ids, upper-cases the action and trims the reason', () => {
  assert.deepEqual(buildBulkPayload(['3', 1, 3, 'x', -2], 'archive', '  graduated  '), {
    studentIds: [3, 1],
    action: 'ARCHIVE',
    reason: 'graduated',
  });
  assert.deepEqual(buildBulkPayload([5], 'DELETE'), { studentIds: [5], action: 'DELETE' });
});

test('buildBulkPayload rejects bad input', () => {
  assert.throws(() => buildBulkPayload([1], 'PURGE'), /Unknown bulk action/);
  assert.throws(() => buildBulkPayload([], 'DISABLE'), /at least one/);
  assert.throws(() => buildBulkPayload(Array.from({ length: 1001 }, (_, i) => i + 1), 'DISABLE'), /At most 1000/);
});

test('chunkIds and mergeBulkResults combine large selections', () => {
  const ids = Array.from({ length: 2500 }, (_, i) => i + 1);
  const chunks = chunkIds(ids);
  assert.deepEqual(chunks.map((c) => c.length), [1000, 1000, 500]);
  const merged = mergeBulkResults([
    { requested: 2, succeeded: 1, skipped: 1, failed: [] },
    { requested: 1, succeeded: 0, skipped: 0, failed: [{ studentId: 9, reason: 'Not found' }] },
  ]);
  assert.deepEqual(merged, { requested: 3, succeeded: 1, skipped: 1, failed: [{ studentId: 9, reason: 'Not found' }] });
});

test('summarizeBulkResult reads naturally', () => {
  assert.equal(summarizeBulkResult('ARCHIVE', { succeeded: 12, skipped: 2, failed: [{}] }), '12 archived, 2 skipped, 1 failed');
  assert.equal(summarizeBulkResult('enable', { succeeded: 3, skipped: 0, failed: [] }), '3 enabled');
});

test('lifecycleOf falls back to isActive', () => {
  assert.equal(lifecycleOf({ lifecycleStatus: 'ARCHIVED' }), 'ARCHIVED');
  assert.equal(lifecycleOf({ isActive: false }), 'DISABLED');
  assert.equal(lifecycleOf({}), 'ACTIVE');
});

test('isBulkDeleteConfirmed accepts the count or DELETE', async () => {
  const { isBulkDeleteConfirmed } = await import('./studentQuery.js');
  assert.equal(isBulkDeleteConfirmed('12', 12), true);
  assert.equal(isBulkDeleteConfirmed(' delete ', 12), true);
  assert.equal(isBulkDeleteConfirmed('11', 12), false);
  assert.equal(isBulkDeleteConfirmed('', 0), false);
});

test('bulkActionsFor hides restore unless admin on the archived tab', async () => {
  const { bulkActionsFor } = await import('./studentQuery.js');
  assert.deepEqual(bulkActionsFor('ACTIVE'), ['DISABLE', 'ARCHIVE', 'DELETE']);
  assert.deepEqual(bulkActionsFor('DISABLED'), ['ENABLE', 'ARCHIVE', 'DELETE']);
  assert.deepEqual(bulkActionsFor('ARCHIVED'), ['DELETE']);
  assert.deepEqual(bulkActionsFor('ARCHIVED', { canRestore: true }), ['RESTORE', 'DELETE']);
  assert.deepEqual(bulkActionsFor('ALL', { canRestore: true }), ['DISABLE', 'ENABLE', 'ARCHIVE', 'DELETE']);
});
