/**
 * Placement record helpers. Placement is a plain record, not a verification:
 * a student is either Placed (with company, CTC and date) or Not placed.
 */

export const isPlaced = (status) => String(status || '').toUpperCase() === 'PLACED';

export const placementLabel = (status) => (isPlaced(status) ? 'Placed' : 'Not placed');

/** Tailwind classes for the placement pill. */
export const placementBadgeClass = (status) =>
  isPlaced(status) ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600';

/**
 * CTC as "₹24 LPA". The backend stores rupees (2400000.00); small numbers are taken as
 * already being in lakhs so old records still read correctly.
 */
export const formatCtc = (value) => {
  const n = Number(value);
  if (value === null || value === undefined || value === '' || !Number.isFinite(n) || n <= 0) return null;
  const lakhs = n >= 1000 ? n / 100000 : n;
  const rounded = Math.round(lakhs * 100) / 100;
  return `₹${rounded} LPA`;
};

/** "Placed at Google · ₹24 LPA" or "Not placed". */
export const placementSummary = ({ status, companyName, ctc } = {}) => {
  if (!isPlaced(status)) return 'Not placed';
  const parts = [companyName ? `Placed at ${companyName}` : 'Placed'];
  const ctcText = formatCtc(ctc);
  if (ctcText) parts.push(ctcText);
  return parts.join(' · ');
};

// ---- Application tracking ------------------------------------------------------------

/** The normal path of an application, used for the progress tracker. */
export const APPLICATION_PIPELINE = ['APPLIED', 'UNDER_REVIEW', 'SHORTLISTED', 'INTERVIEW', 'SELECTED'];

export const PIPELINE_LABELS = {
  APPLIED: 'Applied',
  UNDER_REVIEW: 'Review',
  SHORTLISTED: 'Shortlisted',
  INTERVIEW: 'Interview',
  SELECTED: 'Selected',
};

const IN_PROGRESS = new Set(['APPLIED', 'UNDER_REVIEW', 'SHORTLISTED', 'INTERVIEW']);

/** Which tracker group an application status belongs to. */
export const applicationGroup = (status) => {
  if (IN_PROGRESS.has(status)) return 'IN_PROGRESS';
  if (status === 'SELECTED') return 'OFFERS';
  if (status === 'REJECTED' || status === 'WITHDRAWN') return 'CLOSED';
  return 'IN_PROGRESS';
};

/** Index of the status on the pipeline (-1 for rejected / withdrawn / unknown). */
export const pipelineIndex = (status) => APPLICATION_PIPELINE.indexOf(status);

/** Counts for the tracker tabs and summary tiles. */
export const summarizeApplications = (applications = []) => {
  const list = Array.isArray(applications) ? applications : [];
  const summary = { total: list.length, inProgress: 0, offers: 0, closed: 0, interviews: 0 };
  for (const app of list) {
    const group = applicationGroup(app?.status);
    if (group === 'IN_PROGRESS') summary.inProgress += 1;
    else if (group === 'OFFERS') summary.offers += 1;
    else summary.closed += 1;
    if (app?.status === 'INTERVIEW') summary.interviews += 1;
  }
  return summary;
};
