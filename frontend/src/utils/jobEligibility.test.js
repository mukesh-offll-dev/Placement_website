import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { getIneligibilityReasons } from './jobEligibility.js';

const profile = {
  cgpa: 8.2,
  activeBacklogs: 0,
  batch: '2022-2026',
  departmentCode: 'CSE',
  degree: 'B.E CSE',
};

describe('getIneligibilityReasons', () => {
  it('is empty when the job sets no criteria', () => {
    assert.deepEqual(getIneligibilityReasons(profile, {}), []);
  });

  it('treats empty department/degree lists as open to all', () => {
    assert.deepEqual(
      getIneligibilityReasons(profile, { eligibleDepartments: [], eligibleDegrees: [] }),
      []
    );
  });

  it('flags each unmet criterion', () => {
    const reasons = getIneligibilityReasons(
      { ...profile, cgpa: 6.5, activeBacklogs: 2 },
      {
        minCgpa: 7,
        backlogsAllowed: false,
        graduationYear: 2027,
        eligibleDepartments: ['ECE'],
        eligibleDegrees: ['MBA'],
      }
    );
    assert.equal(reasons.length, 5);
  });

  it('matches department and degree case-insensitively', () => {
    assert.deepEqual(
      getIneligibilityReasons(profile, { eligibleDepartments: ['cse'], eligibleDegrees: ['b.e cse'] }),
      []
    );
  });

  it('counts a missing CGPA as not met when the job sets one', () => {
    assert.equal(getIneligibilityReasons({ ...profile, cgpa: null }, { minCgpa: 6 }).length, 1);
  });
});
