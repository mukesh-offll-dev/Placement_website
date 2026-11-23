import { useEffect, useState } from 'react';
import { getDraft } from '../../services/api/studentDraftService';

/** Window event the profile/verification pages fire after a draft status change. */
export const VERIFICATION_CHANGED_EVENT = 'student-verification:changed';

/** Tell listeners (the sidebar badge) that the draft status changed. */
export const notifyVerificationChanged = (draft) => {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(VERIFICATION_CHANGED_EVENT, { detail: draft || null }));
};

/**
 * Current draft status for the student layout: fetched once on mount and refreshed whenever
 * a page announces a change. Failure is silent (the badge is a convenience).
 * @returns {{ status: string|null, profileVerificationStatus: string|null }}
 */
export default function useVerificationStatus() {
  const [state, setState] = useState({ status: null, profileVerificationStatus: null });

  useEffect(() => {
    const controller = new AbortController();
    const apply = (draft) => {
      if (!draft || typeof draft !== 'object') return;
      setState({
        status: draft.status || null,
        profileVerificationStatus: draft.profileVerificationStatus || null,
      });
    };
    getDraft({ signal: controller.signal })
      .then(apply)
      .catch(() => {});

    const onChange = (e) => {
      if (e.detail) apply(e.detail);
      else getDraft().then(apply).catch(() => {});
    };
    window.addEventListener(VERIFICATION_CHANGED_EVENT, onChange);
    return () => {
      controller.abort();
      window.removeEventListener(VERIFICATION_CHANGED_EVENT, onChange);
    };
  }, []);

  return state;
}
