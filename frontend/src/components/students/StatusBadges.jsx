import { LIFECYCLE_BADGES, VERIFICATION_BADGES, badgeFor } from '../../utils/studentQuery';

const base = 'inline-flex items-center text-[10px] px-2 py-0.5 rounded-full font-semibold whitespace-nowrap';

/** ACTIVE green, DISABLED gray, ARCHIVED amber. */
export function LifecycleBadge({ status, className = '' }) {
  const b = badgeFor(LIFECYCLE_BADGES, status || 'ACTIVE');
  return <span className={`${base} ${b.cls} ${className}`}>{b.label}</span>;
}

/** Profile verification / version status: PENDING amber, VERIFIED/APPROVED green, REJECTED red, others gray. */
export function VerificationBadge({ status, className = '' }) {
  const b = badgeFor(VERIFICATION_BADGES, status || 'NOT_SUBMITTED');
  return <span className={`${base} ${b.cls} ${className}`}>{b.label}</span>;
}
