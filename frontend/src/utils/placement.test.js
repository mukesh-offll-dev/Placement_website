import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  isPlaced,
  placementLabel,
  formatCtc,
  placementSummary,
  applicationGroup,
  pipelineIndex,
  summarizeApplications,
} from './placement.js';

test('placement is only Placed or Not placed', () => {
  assert.equal(isPlaced('PLACED'), true);
  assert.equal(isPlaced('placed'), true);
  for (const s of ['PENDING', 'ACTIVE', 'BLOCKED', null, undefined, '']) {
    assert.equal(placementLabel(s), 'Not placed');
  }
  assert.equal(placementLabel('PLACED'), 'Placed');
});

test('formatCtc reads rupees and legacy lakh values', () => {
  assert.equal(formatCtc(2400000), '₹24 LPA');
  assert.equal(formatCtc('450000.00'), '₹4.5 LPA');
  assert.equal(formatCtc(12), '₹12 LPA');
  assert.equal(formatCtc(null), null);
  assert.equal(formatCtc(0), null);
  assert.equal(formatCtc('abc'), null);
});

test('placementSummary names the company', () => {
  assert.equal(placementSummary({ status: 'PLACED', companyName: 'Google', ctc: 2400000 }), 'Placed at Google · ₹24 LPA');
  assert.equal(placementSummary({ status: 'PLACED' }), 'Placed');
  assert.equal(placementSummary({ status: 'PENDING', companyName: 'Google' }), 'Not placed');
});

test('applications are grouped for the tracker', () => {
  assert.equal(applicationGroup('INTERVIEW'), 'IN_PROGRESS');
  assert.equal(applicationGroup('SELECTED'), 'OFFERS');
  assert.equal(applicationGroup('REJECTED'), 'CLOSED');
  assert.equal(applicationGroup('WITHDRAWN'), 'CLOSED');
  assert.equal(pipelineIndex('SHORTLISTED'), 2);
  assert.equal(pipelineIndex('REJECTED'), -1);
  assert.deepEqual(
    summarizeApplications([{ status: 'APPLIED' }, { status: 'INTERVIEW' }, { status: 'SELECTED' }, { status: 'REJECTED' }]),
    { total: 4, inProgress: 2, offers: 1, closed: 1, interviews: 1 }
  );
  assert.deepEqual(summarizeApplications(null), { total: 0, inProgress: 0, offers: 0, closed: 0, interviews: 0 });
});
