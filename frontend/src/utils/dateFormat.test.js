import assert from 'node:assert/strict';
import { test } from 'node:test';
import { formatDate, formatDateTime, timeAgo } from './dateFormat.js';

test('timeAgo buckets recent times', () => {
  const now = Date.parse('2026-01-10T12:00:00Z');
  assert.equal(timeAgo('2026-01-10T11:59:40Z', now), 'Just now');
  assert.equal(timeAgo('2026-01-10T11:30:00Z', now), '30m ago');
  assert.equal(timeAgo('2026-01-10T09:00:00Z', now), '3h ago');
  assert.equal(timeAgo('2026-01-08T12:00:00Z', now), '2d ago');
  assert.equal(timeAgo(null, now), '');
  assert.equal(timeAgo('not a date', now), '');
});

test('formatDate and formatDateTime fall back for blanks', () => {
  assert.equal(formatDate(null), '—');
  assert.equal(formatDateTime(undefined, 'Never'), 'Never');
  assert.equal(formatDate('garbage'), 'garbage');
});
