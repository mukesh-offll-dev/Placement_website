import { useCallback, useEffect, useState } from 'react';

/** Fired after a decision so sidebar badges refresh without waiting for the poll. */
export const VERIFICATIONS_CHANGED = 'verifications:changed';

export const notifyVerificationsChanged = () => {
  if (typeof window !== 'undefined') window.dispatchEvent(new Event(VERIFICATIONS_CHANGED));
};

const POLL_MS = 60000;

/**
 * Pending verification count from a summary endpoint ({pending, approved, rejected}).
 * `fetchSummary` must be stable (a module function); pass null to disable.
 */
export default function usePendingVerifications(fetchSummary) {
  const [count, setCount] = useState(0);

  const refresh = useCallback(async () => {
    if (!fetchSummary) return;
    try {
      const data = await fetchSummary();
      setCount(Number(data?.pending) || 0);
    } catch {
      // Keep the last known value.
    }
  }, [fetchSummary]);

  useEffect(() => {
    if (!fetchSummary) return undefined;
    const first = setTimeout(refresh, 0);
    const timer = setInterval(() => {
      if (!document.hidden) refresh();
    }, POLL_MS);
    window.addEventListener(VERIFICATIONS_CHANGED, refresh);
    window.addEventListener('focus', refresh);
    return () => {
      clearTimeout(first);
      clearInterval(timer);
      window.removeEventListener(VERIFICATIONS_CHANGED, refresh);
      window.removeEventListener('focus', refresh);
    };
  }, [fetchSummary, refresh]);

  return { count, refresh };
}
