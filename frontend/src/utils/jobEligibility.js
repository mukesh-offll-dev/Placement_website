/**
 * Client-side mirror of the backend's JobEligibility check, used only to tell a student up
 * front whether they can apply. The server re-checks on submit and is the authority; when
 * this and JobEligibility.java disagree, the server's 400 message is what the student sees.
 *
 * A criterion the job leaves blank is not applied. A criterion the job sets but the profile
 * cannot answer (e.g. no CGPA on file) counts as not met, as on the server.
 */

const toNumber = (value) => {
  if (value === null || value === undefined || value === '') return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
};

const sameText = (a, b) =>
  String(a ?? '').trim().toLowerCase() === String(b ?? '').trim().toLowerCase();

/**
 * @param {Object|null} profile - StudentProfileResponse
 * @param {Object|null} job - JobResponse
 * @returns {string[]} reasons the student is not eligible; empty when eligible
 */
export function getIneligibilityReasons(profile, job) {
  if (!profile || !job) return [];
  const reasons = [];

  const minCgpa = toNumber(job.minCgpa);
  if (minCgpa !== null) {
    const cgpa = toNumber(profile.cgpa);
    if (cgpa === null) {
      reasons.push(`This job requires a minimum CGPA of ${minCgpa} and your profile has no CGPA on file`);
    } else if (cgpa < minCgpa) {
      reasons.push(`This job requires a minimum CGPA of ${minCgpa}`);
    }
  }

  if (job.backlogsAllowed === false) {
    const active = toNumber(profile.activeBacklogs);
    if (active !== null && active > 0) {
      reasons.push('This job does not allow active backlogs');
    }
  }

  const year = toNumber(job.graduationYear);
  if (year !== null) {
    const batch = String(profile.batch ?? '').trim();
    if (!batch || !batch.endsWith(String(year))) {
      reasons.push(`This job is only open to the ${year} graduating batch`);
    }
  }

  const departments = Array.isArray(job.eligibleDepartments) ? job.eligibleDepartments : [];
  if (departments.length > 0) {
    const code = profile.departmentCode;
    if (!code || !departments.some((d) => sameText(d, code))) {
      reasons.push('This job is not open to your department');
    }
  }

  const degrees = Array.isArray(job.eligibleDegrees) ? job.eligibleDegrees : [];
  if (degrees.length > 0) {
    // Mirrors JobEligibility.meetsDegree: "B.E" matches "B.E CSE" (whole value or
    // first word, ignoring case, dots and spaces).
    const normalizeDegree = (value) => String(value ?? '').replace(/[.\s]/g, '').toUpperCase();
    const degree = typeof profile.degree === 'string' ? profile.degree.trim() : '';
    const whole = normalizeDegree(degree);
    const firstWord = normalizeDegree(degree.split(/[\s\-/(,]+/)[0]);
    const matches = (d) => {
      const n = normalizeDegree(d);
      return n !== '' && (n === whole || n === firstWord);
    };
    if (!degree || !degrees.some(matches)) {
      reasons.push('This job is not open to your degree');
    }
  }

  return reasons;
}
