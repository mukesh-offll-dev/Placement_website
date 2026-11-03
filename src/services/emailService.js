/**
 * EmailJS email service for placement notifications.
 *
 * Sends through the existing EmailJS template, which must use these variables:
 *   {{to_email}}  {{to_name}}  {{subject}}  {{message}}
 * and have its "To Email" field set to {{to_email}}.
 *
 * Configuration comes from frontend environment variables (see .env.example):
 *   VITE_EMAILJS_SERVICE_ID, VITE_EMAILJS_TEMPLATE_ID, VITE_EMAILJS_PUBLIC_KEY
 *
 * Email is a best-effort extra on top of the in-app notification, so nothing here ever
 * throws: every function resolves to { ok, ... } and the caller's flow is never blocked.
 */

const env = (typeof import.meta !== 'undefined' && import.meta.env) || {};

export const EMAIL_CONFIG = {
  serviceId: env.VITE_EMAILJS_SERVICE_ID || '',
  templateId: env.VITE_EMAILJS_TEMPLATE_ID || '',
  publicKey: env.VITE_EMAILJS_PUBLIC_KEY || '',
};

const SEND_TIMEOUT_MS = 15000;
/** The same message to the same person is not sent again within this window. */
const DUPLICATE_WINDOW_MS = 60000;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Loaded on first send so the SDK stays out of the initial bundle and out of unit tests. */
const sendWithEmailJs = async (serviceId, templateId, params, publicKey) => {
  const { default: emailjs } = await import('@emailjs/browser');
  return emailjs.send(serviceId, templateId, params, { publicKey });
};

const describeError = (err) => {
  // EmailJS rejects with { status, text }; anything else is a plain Error.
  const status = err?.status;
  const text = err?.text || err?.message;
  if (status === 429) return 'Email limit reached. Please try again later.';
  if (status === 400 || status === 412) return 'Email service rejected the request. Check the EmailJS template and keys.';
  if (status === 403) return 'Email service is not allowed from this site. Check the EmailJS allowed origins.';
  return text || 'Could not send the email.';
};

/**
 * Creates a sender. Exported so tests can inject a fake transport and clock; the app uses
 * the shared instance below.
 */
export const createEmailService = ({
  config = EMAIL_CONFIG,
  send = sendWithEmailJs,
  now = () => Date.now(),
  timeoutMs = SEND_TIMEOUT_MS,
  duplicateWindowMs = DUPLICATE_WINDOW_MS,
} = {}) => {
  const inFlight = new Set();
  const recentlySent = new Map(); // key -> time sent

  const isConfigured = () => Boolean(config.serviceId && config.templateId && config.publicKey);

  const forgetOldEntries = () => {
    const cutoff = now() - duplicateWindowMs;
    for (const [key, at] of recentlySent) {
      if (at < cutoff) recentlySent.delete(key);
    }
  };

  /**
   * @param {{ toEmail: string, toName?: string, subject: string, message: string }} mail
   * @returns {Promise<{ ok: boolean, skipped?: 'not-configured'|'duplicate'|'invalid', error?: string }>}
   */
  const sendEmail = async ({ toEmail, toName, subject, message } = {}) => {
    if (!isConfigured()) {
      return { ok: false, skipped: 'not-configured' };
    }
    const to = String(toEmail || '').trim();
    if (!EMAIL_PATTERN.test(to) || !String(subject || '').trim() || !String(message || '').trim()) {
      return { ok: false, skipped: 'invalid', error: 'A recipient, subject and message are required.' };
    }

    const key = `${to.toLowerCase()}|${subject}|${message}`;
    forgetOldEntries();
    if (inFlight.has(key) || recentlySent.has(key)) {
      return { ok: false, skipped: 'duplicate' };
    }

    inFlight.add(key);
    let timer;
    try {
      const params = {
        to_email: to,
        to_name: String(toName || '').trim() || 'Student',
        // Headers must be one line; the body may have line breaks.
        subject: String(subject).replace(/[\r\n]+/g, ' ').trim(),
        message: String(message),
      };
      const timeout = new Promise((_, reject) => {
        timer = setTimeout(() => reject(new Error('The email service took too long to respond.')), timeoutMs);
      });
      await Promise.race([send(config.serviceId, config.templateId, params, config.publicKey), timeout]);
      recentlySent.set(key, now());
      return { ok: true };
    } catch (err) {
      // Not recorded as sent, so a later retry is allowed.
      return { ok: false, error: describeError(err) };
    } finally {
      clearTimeout(timer);
      inFlight.delete(key);
    }
  };

  /** Fire-and-forget wrapper for UI flows: logs a failure, never throws, never blocks. */
  const sendEmailQuietly = (mail) =>
    sendEmail(mail).then((result) => {
      if (!result.ok && result.skipped !== 'not-configured' && result.skipped !== 'duplicate') {
        console.warn('[email] notification not sent:', result.error || result.skipped);
      }
      return result;
    });

  return { sendEmail, sendEmailQuietly, isConfigured };
};

const defaultService = createEmailService();

export const isEmailConfigured = defaultService.isConfigured;
export const sendEmail = defaultService.sendEmail;
export const sendEmailQuietly = defaultService.sendEmailQuietly;

const STATUS_WORDING = {
  UNDER_REVIEW: 'is now under review',
  SHORTLISTED: 'has been shortlisted',
  INTERVIEW: 'has moved to the interview stage',
  SELECTED: 'has been selected. Congratulations!',
  REJECTED: 'was not selected this time',
  APPLIED: 'has been submitted',
};

const describeJob = (job) => {
  const role = job?.jobRole || job?.role || 'the position';
  const company = job?.company?.name || (typeof job?.company === 'string' ? job.company : '');
  return company ? `${role} at ${company}` : role;
};

/** Email the student when the placement cell changes the status of their application. */
export const notifyApplicationStatusChange = ({ student, job, status, remarks }) => {
  const label = describeJob(job);
  const wording = STATUS_WORDING[status] || `is now ${String(status || '').toLowerCase().replace(/_/g, ' ')}`;
  const lines = [`Your application for ${label} ${wording}.`];
  if (remarks && String(remarks).trim()) {
    lines.push('', `Note from the placement cell: ${String(remarks).trim()}`);
  }
  lines.push('', 'Sign in to the placement portal to see the full details.', '', 'GCE Srirangam Placement Cell');
  return sendEmailQuietly({
    toEmail: student?.email,
    toName: student?.fullName,
    subject: `Application update: ${label}`,
    message: lines.join('\n'),
  });
};

/** Email the student a confirmation after they submit an application. */
export const notifyApplicationSubmitted = ({ user, job }) => {
  const label = describeJob(job);
  return sendEmailQuietly({
    toEmail: user?.email,
    toName: user?.fullName,
    subject: `Application submitted: ${label}`,
    message: [
      `Your application for ${label} has been submitted.`,
      "We'll email you as it moves through the selection stages.",
      '',
      'GCE Srirangam Placement Cell',
    ].join('\n'),
  });
};
