/**
 * Shared helpers for job drive filtering and interview scheduling formatting.
 */

const HTTP_URL = /^https?:\/\/\S+$/i;

/**
 * Normalises a job's CTC value into LPA so filters work whether the API stores
 * rupees (e.g. 650000 -> 6.5) or lakh values (e.g. 6.5 -> 6.5).
 */
export function getCtcInLpa(job) {
  const raw = job?.raw || job;
  const numeric = Number(raw?.ctcValue);
  if (Number.isFinite(numeric) && numeric > 0) {
    return numeric >= 1000 ? numeric / 100000 : numeric;
  }
  const textMatch = String(job?.ctc || raw?.ctcText || '').match(/(\d+(?:\.\d+)?)/);
  if (!textMatch) return null;
  const parsed = Number(textMatch[1]);
  if (!Number.isFinite(parsed) || parsed <= 0) return null;
  return parsed >= 1000 ? parsed / 100000 : parsed;
}

/**
 * Formats an interview scheduling form into an ApplicationStatusUpdateRequest payload
 * compatible with PUT /api/admin/applications/{id}/status.
 */
export function buildInterviewStatusPayload({
  date,
  time,
  mode,
  round,
  meetingLink,
  venue,
  interviewer,
  instructions,
}) {
  const roundName = String(round || 'Interview').trim();
  const currentStage = (
    roundName.toLowerCase().includes('interview') ? roundName : `${roundName} Interview`
  ).slice(0, 80);

  const parts = [];
  if (date && time) parts.push(`${date} at ${time}`);
  else if (date) parts.push(date);
  else if (time) parts.push(`at ${time}`);

  if (mode === 'Online') {
    const link = String(meetingLink || '').trim();
    parts.push(link ? `Online (${link})` : 'Online');
  } else {
    const place = String(venue || '').trim();
    parts.push(place ? `Venue: ${place}` : 'Offline');
  }

  if (interviewer && String(interviewer).trim()) {
    parts.push(`Interviewer: ${String(interviewer).trim()}`);
  }
  if (instructions && String(instructions).trim()) {
    parts.push(String(instructions).trim());
  }

  const joined = parts.join(' · ');
  const remarks = joined.length > 255 ? `${joined.slice(0, 252)}...` : joined;

  return {
    status: 'INTERVIEW',
    currentStage,
    stageDate: date || undefined,
    remarks: remarks || undefined,
  };
}

/** yyyy-mm-dd in the browser's local time (what a date input produces). */
export function toLocalIsoDate(date = new Date()) {
  const pad = (n) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function toLocalTime(date) {
  const pad = (n) => String(n).padStart(2, '0');
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

const IN_PROGRESS = ['APPLIED', 'UNDER_REVIEW', 'SHORTLISTED', 'INTERVIEW'];

/**
 * Mirrors the server's rule for officer status changes (ApplicationService.isAllowedTransition),
 * so the stage dropdown only offers moves the server will accept.
 */
export function isAllowedStatusTransition(from, to) {
  if (!from || !to || to === 'WITHDRAWN' || from === 'WITHDRAWN') return false;
  if (from === to) return true;
  if (IN_PROGRESS.includes(from)) return to !== 'APPLIED';
  if (from === 'SELECTED') return to === 'REJECTED';
  if (from === 'REJECTED') return to === 'UNDER_REVIEW' || to === 'SHORTLISTED';
  return false;
}

/**
 * Validates the interview scheduling modal inputs. Returns a field-keyed error object.
 */
export function validateInterviewSchedule(form, now = new Date()) {
  const errors = {};
  if (!form?.date) errors.date = 'Select an interview date.';
  else if (form.date < toLocalIsoDate(now)) errors.date = 'The interview date cannot be in the past.';
  if (!form?.time) errors.time = 'Select an interview time.';
  else if (form?.date === toLocalIsoDate(now) && form.time < toLocalTime(now)) {
    errors.time = 'That time has already passed today.';
  }
  if (!form?.round || !String(form.round).trim()) errors.round = 'Select an interview round.';

  if (form?.mode === 'Online') {
    const link = String(form.meetingLink || '').trim();
    if (!link) errors.meetingLink = 'Enter the meeting link.';
    else if (!HTTP_URL.test(link)) errors.meetingLink = 'Enter a valid http:// or https:// URL.';
  } else if (form?.mode === 'Offline') {
    if (!String(form.venue || '').trim()) errors.venue = 'Enter the interview venue.';
  } else {
    errors.mode = 'Select Online or Offline mode.';
  }

  return errors;
}

/**
 * Returns a display badge descriptor for a job drive summary on admin application rows.
 */
export function getJobDriveStatusBadge(job) {
  if (!job) return null;
  if (job.expired) {
    return { label: 'Expired', classes: 'bg-amber-50 text-amber-700 border-amber-200' };
  }
  switch (String(job.status || '').toUpperCase()) {
    case 'ACTIVE':
      return { label: 'Open', classes: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
    case 'CLOSING_SOON':
      return { label: 'Closing Soon', classes: 'bg-amber-50 text-amber-700 border-amber-200' };
    case 'CLOSED':
      return { label: 'Closed', classes: 'bg-slate-100 text-slate-600 border-slate-200' };
    case 'DRAFT':
      return { label: 'Draft', classes: 'bg-slate-100 text-slate-600 border-slate-200' };
    default:
      return null;
  }
}

/** Whole days from today to a yyyy-mm-dd deadline (negative once it has passed); null without one. */
export function daysUntil(deadline, now = new Date()) {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(deadline || ''));
  if (!match) return null;
  const end = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.round((end - today) / 86400000);
}

/**
 * The closing line for a drive card: "Closes in 12 days", "Closes tomorrow", "Closes today" or "Closed".
 * tone: 'closed' | 'soon' (within 5 days) | 'open', for the colour of the chip.
 */
export function closingInfo(job, now = new Date()) {
  const status = String(job?.status || '').toUpperCase();
  const days = daysUntil(job?.applicationDeadline, now);
  if (job?.expired || status === 'CLOSED' || (days !== null && days < 0)) {
    return { text: 'Closed', tone: 'closed' };
  }
  if (status === 'DRAFT') return { text: 'Draft: not open yet', tone: 'closed' };
  if (days === null) return { text: 'No closing date', tone: 'open' };
  if (days === 0) return { text: 'Closes today', tone: 'soon' };
  if (days === 1) return { text: 'Closes tomorrow', tone: 'soon' };
  return { text: `Closes in ${days} days`, tone: days <= 5 ? 'soon' : 'open' };
}
