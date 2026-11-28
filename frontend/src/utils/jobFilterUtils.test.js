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
