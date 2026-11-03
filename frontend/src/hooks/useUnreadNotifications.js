import { useCallback, useEffect, useState } from 'react';
import notificationService from '../services/api/notificationService';

/** Fired by anything that changes read state, so the bell badge updates without waiting for the poll. */
export const NOTIFICATIONS_CHANGED = 'notifications:changed';

export const notifyNotificationsChanged = () => {
  window.dispatchEvent(new Event(NOTIFICATIONS_CHANGED));
};

const POLL_MS = 30000;

/**
 * Unread notification count for the signed-in user. Refreshes on an interval (paused while the
 * tab is hidden), when the tab regains focus, and whenever notifyNotificationsChanged() fires.
 */
export default function useUnreadNotifications() {
  const [count, setCount] = useState(0);

  const refresh = useCallback(async () => {
    try {
      const value = await notificationService.getUnreadCount();
      setCount(Number(value) || 0);
    } catch {
      // Keep the last known count: a failed poll should not make the badge flicker to zero.
    }
  }, []);

  useEffect(() => {
    const first = setTimeout(refresh, 0);
    const timer = setInterval(() => {
      if (!document.hidden) refresh();
    }, POLL_MS);
    window.addEventListener(NOTIFICATIONS_CHANGED, refresh);
    window.addEventListener('focus', refresh);
    return () => {
      clearTimeout(first);
      clearInterval(timer);
      window.removeEventListener(NOTIFICATIONS_CHANGED, refresh);
      window.removeEventListener('focus', refresh);
    };
  }, [refresh]);

  return { count, refresh };
}
