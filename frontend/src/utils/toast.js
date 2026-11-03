/**
 * Centralized toast notification utility for the Placement Cell Management System.
 *
 * Wraps react-hot-toast to provide:
 * - Consistent success / error / info / warning notifications
 * - Friendly network-error messages
 * - Safe extraction of backend error messages (no stack traces / secrets)
 * - Duplicate-suppression guard (avoids showing the same message twice in rapid succession)
 */

import toast from 'react-hot-toast';

// ── de-duplication guard ────────────────────────────────────────────────────────
const _recentMessages = new Map(); // message -> timeout id

const _dedup = (message, durationMs = 4000) => {
  if (!message) return false;
  if (_recentMessages.has(message)) return true; // already showing
  const tid = setTimeout(() => _recentMessages.delete(message), durationMs);
  _recentMessages.set(message, tid);
  return false;
};

// ── shared toast options ────────────────────────────────────────────────────────
const BASE_OPTS = {
  duration: 4000,
  position: 'top-right',
  style: {
    fontFamily:
      "'Inter', 'Outfit', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    fontSize: '14px',
    maxWidth: '400px',
    borderRadius: '12px',
    padding: '12px 16px',
    boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
  },
};

const SUCCESS_OPTS = {
  ...BASE_OPTS,
  style: {
    ...BASE_OPTS.style,
    background: '#f0fdf4',
    color: '#14532d',
    border: '1px solid #bbf7d0',
  },
  iconTheme: { primary: '#16a34a', secondary: '#f0fdf4' },
};

const ERROR_OPTS = {
  ...BASE_OPTS,
  duration: 5000,
  style: {
    ...BASE_OPTS.style,
    background: '#fef2f2',
    color: '#7f1d1d',
    border: '1px solid #fecaca',
  },
  iconTheme: { primary: '#dc2626', secondary: '#fef2f2' },
};

const LOADING_OPTS = {
  ...BASE_OPTS,
  duration: Infinity,
  style: {
    ...BASE_OPTS.style,
    background: '#eff6ff',
    color: '#1e3a5f',
    border: '1px solid #bfdbfe',
  },
};

const INFO_OPTS = {
  ...BASE_OPTS,
  style: {
    ...BASE_OPTS.style,
    background: '#eff6ff',
    color: '#1e3a5f',
    border: '1px solid #bfdbfe',
  },
  icon: 'ℹ️',
};

const WARNING_OPTS = {
  ...BASE_OPTS,
  style: {
    ...BASE_OPTS.style,
    background: '#fffbeb',
    color: '#78350f',
    border: '1px solid #fde68a',
  },
  icon: '⚠️',
};

// ── public API ──────────────────────────────────────────────────────────────────

/**
 * Show a success toast.
 * @param {string} message
 */
export const toastSuccess = (message) => {
  if (_dedup(message)) return;
  toast.success(message, SUCCESS_OPTS);
};

/**
 * Extract a safe, human-readable error message from an Axios / API error
 * or any thrown value, then show it as an error toast.
 *
 * @param {unknown} err  The caught error
 * @param {string} [fallback='An unexpected error occurred. Please try again.']
 */
export const toastError = (err, fallback = 'An unexpected error occurred. Please try again.') => {
  let message = fallback;

  if (typeof err === 'string') {
    message = err || fallback;
  } else if (err instanceof Error || (err && typeof err === 'object')) {
    // Prefer the structured message already prepared by axiosClient.js
    const raw = err.message || err.error || '';

    // Never expose stack traces or internal Spring Boot exception class names
    const isSafe =
      raw &&
      raw.length < 500 &&
      !raw.includes('Exception') &&
      !raw.includes('NullPointer') &&
      !raw.includes('at org.') &&
      !raw.includes('at java.') &&
      !raw.includes('stack trace');

    if (isSafe) {
      message = raw;
    }

    // Friendly override for network / server unavailable errors
    if (err.isNetworkError || err.status === 0) {
      message = 'Unable to connect to the server. Please check your internet connection and try again.';
    }
  }

  if (_dedup(message, 5000)) return;
  toast.error(message, ERROR_OPTS);
};

/**
 * Show an informational toast.
 * @param {string} message
 */
export const toastInfo = (message) => {
  if (_dedup(message)) return;
  toast(message, INFO_OPTS);
};

/**
 * Show a warning toast.
 * @param {string} message
 */
export const toastWarning = (message) => {
  if (_dedup(message)) return;
  toast(message, WARNING_OPTS);
};

/**
 * Show a loading toast that you later resolve with toastSuccess/toastError.
 * Returns the toast id so you can dismiss it.
 *
 * Usage:
 *   const id = toastLoading('Uploading...');
 *   try { ... toastSuccess('Done!'); }
 *   catch { toastError(err); }
 *   finally { toast.dismiss(id); }
 *
 * @param {string} message
 * @returns {string} toast id
 */
export const toastLoading = (message) => toast.loading(message, LOADING_OPTS);

/**
 * Dismiss a toast by id (e.g. a loading toast).
 * @param {string} [id]
 */
export const toastDismiss = (id) => toast.dismiss(id);

/**
 * Re-export the raw toast instance for advanced usage (promise, custom, etc.)
 */
export { toast };
