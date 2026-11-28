import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  getCtcInLpa,
  buildInterviewStatusPayload,
  validateInterviewSchedule,
  getJobDriveStatusBadge,
} from './jobFilterUtils.js';

describe('getCtcInLpa', () => {
  it('converts rupee ctcValue to LPA and keeps small lakh values as-is', () => {
    assert.equal(getCtcInLpa({ raw: { ctcValue: 650000 } }), 6.5);
    assert.equal(getCtcInLpa({ raw: { ctcValue: 12 } }), 12);
    assert.equal(getCtcInLpa({ ctc: '8.5 LPA' }), 8.5);
    assert.equal(getCtcInLpa({ ctc: 'Not Disclosed' }), null);
  });
});

describe('buildInterviewStatusPayload', () => {
  it('builds an INTERVIEW payload with stageDate and truncated remarks within 255 chars', () => {
    const payload = buildInterviewStatusPayload({
      date: '2026-12-10',
      time: '10:30',
      mode: 'Online',
      round: 'Technical',
      meetingLink: 'https://meet.example.com/room',
      interviewer: 'Dr. Anand',
      instructions: 'A'.repeat(260),
    });

    assert.equal(payload.status, 'INTERVIEW');
    assert.equal(payload.currentStage, 'Technical Interview');
    assert.equal(payload.stageDate, '2026-12-10');
    assert.ok(payload.remarks.length <= 255);
    assert.ok(payload.remarks.includes('2026-12-10 at 10:30'));
    assert.ok(payload.remarks.includes('https://meet.example.com/room'));
  });
});

describe('validateInterviewSchedule', () => {
  it('requires meetingLink for Online mode and venue for Offline mode', () => {
    const onlineErrors = validateInterviewSchedule({
      date: '2026-12-10',
      time: '10:30',
      mode: 'Online',
      round: 'Technical',
      meetingLink: 'not-a-url',
    });
    assert.ok(onlineErrors.meetingLink);

    const offlineErrors = validateInterviewSchedule({
      date: '2026-12-10',
      time: '10:30',
      mode: 'Offline',
      round: 'HR',
      venue: '',
    });
    assert.ok(offlineErrors.venue);

    const valid = validateInterviewSchedule({
      date: '2026-12-10',
      time: '10:30',
      mode: 'Offline',
      round: 'HR',
      venue: 'Placement Hall 2',
    });
    assert.deepEqual(valid, {});
  });
});

describe('getJobDriveStatusBadge', () => {
  it('distinguishes expired, open, closing soon, and closed jobs', () => {
    assert.equal(getJobDriveStatusBadge({ status: 'ACTIVE', expired: true }).label, 'Expired');
    assert.equal(getJobDriveStatusBadge({ status: 'ACTIVE', expired: false }).label, 'Open');
    assert.equal(getJobDriveStatusBadge({ status: 'CLOSING_SOON', expired: false }).label, 'Closing Soon');
    assert.equal(getJobDriveStatusBadge({ status: 'CLOSED', expired: false }).label, 'Closed');
  });
});

import { isAllowedStatusTransition, toLocalIsoDate } from './jobFilterUtils.js';

describe('Interview scheduling rules', () => {
  it('rejects a date or time already in the past', () => {
    const now = new Date(2026, 10, 28, 15, 30);
    const base = { date: '2026-11-28', time: '16:00', mode: 'Offline', round: 'HR', venue: 'Hall' };
    assert.deepEqual(validateInterviewSchedule(base, now), {});
    assert.ok(validateInterviewSchedule({ ...base, date: '2026-11-27' }, now).date);
    assert.ok(validateInterviewSchedule({ ...base, time: '09:00' }, now).time);
    assert.deepEqual(validateInterviewSchedule({ ...base, date: '2026-11-29', time: '09:00' }, now), {});
    assert.equal(toLocalIsoDate(now), '2026-11-28');
  });

  it('only offers status moves the server accepts', () => {
    assert.equal(isAllowedStatusTransition('SHORTLISTED', 'INTERVIEW'), true);
    assert.equal(isAllowedStatusTransition('REJECTED', 'INTERVIEW'), false);
    assert.equal(isAllowedStatusTransition('REJECTED', 'SHORTLISTED'), true);
    assert.equal(isAllowedStatusTransition('SELECTED', 'REJECTED'), true);
    assert.equal(isAllowedStatusTransition('SELECTED', 'INTERVIEW'), false);
    assert.equal(isAllowedStatusTransition('INTERVIEW', 'APPLIED'), false);
    assert.equal(isAllowedStatusTransition('WITHDRAWN', 'SHORTLISTED'), false);
  });
});

import { closingInfo, daysUntil } from './jobFilterUtils.js';

describe('Drive closing label', () => {
  const now = new Date(2026, 10, 28, 9, 0);
  it('counts days to the deadline', () => {
    assert.equal(daysUntil('2026-12-10', now), 12);
    assert.equal(daysUntil('2026-11-28', now), 0);
    assert.equal(daysUntil('2026-11-20', now), -8);
    assert.equal(daysUntil(null, now), null);
  });
  it('words it for each case', () => {
    assert.deepEqual(closingInfo({ status: 'ACTIVE', applicationDeadline: '2026-12-10' }, now), { text: 'Closes in 12 days', tone: 'open' });
    assert.deepEqual(closingInfo({ status: 'ACTIVE', applicationDeadline: '2026-12-02' }, now), { text: 'Closes in 4 days', tone: 'soon' });
    assert.equal(closingInfo({ status: 'ACTIVE', applicationDeadline: '2026-11-29' }, now).text, 'Closes tomorrow');
    assert.equal(closingInfo({ status: 'ACTIVE', applicationDeadline: '2026-11-28' }, now).text, 'Closes today');
    assert.equal(closingInfo({ status: 'CLOSED', applicationDeadline: '2026-12-30' }, now).text, 'Closed');
    assert.equal(closingInfo({ status: 'ACTIVE', applicationDeadline: '2026-11-01' }, now).text, 'Closed');
    assert.equal(closingInfo({ status: 'ACTIVE', expired: true, applicationDeadline: '2026-12-30' }, now).tone, 'closed');
  });
});
