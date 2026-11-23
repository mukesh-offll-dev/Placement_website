import { CheckCircle2, Clock, FilePen, Undo2, XCircle, CircleDashed, Trash2 } from 'lucide-react';

const STYLES = {
  VERIFIED: { label: 'Verified', cls: 'bg-green-50 text-green-700 border-green-200', icon: CheckCircle2 },
  APPROVED: { label: 'Approved', cls: 'bg-green-50 text-green-700 border-green-200', icon: CheckCircle2 },
  PENDING: { label: 'Pending review', cls: 'bg-amber-50 text-amber-700 border-amber-200', icon: Clock },
  REJECTED: { label: 'Changes requested', cls: 'bg-red-50 text-red-700 border-red-200', icon: XCircle },
  DRAFT: { label: 'Draft', cls: 'bg-blue-50 text-blue-700 border-blue-200', icon: FilePen },
  WITHDRAWN: { label: 'Withdrawn', cls: 'bg-gray-100 text-gray-600 border-gray-200', icon: Undo2 },
  DISCARDED: { label: 'Discarded', cls: 'bg-gray-100 text-gray-500 border-gray-200', icon: Trash2 },
  NOT_SUBMITTED: { label: 'Not submitted', cls: 'bg-gray-100 text-gray-600 border-gray-200', icon: CircleDashed },
  NONE: { label: 'Not submitted', cls: 'bg-gray-100 text-gray-600 border-gray-200', icon: CircleDashed },
};

/**
 * Small pill for a profile verification status (profile-level VERIFIED/PENDING/... or a
 * version-level DRAFT/PENDING/APPROVED/REJECTED/WITHDRAWN/DISCARDED).
 */
export default function VerificationStatusBadge({ status, className = '' }) {
  const key = String(status || 'NONE').toUpperCase();
  const style = STYLES[key] || {
    label: key.charAt(0) + key.slice(1).toLowerCase().replace(/_/g, ' '),
    cls: 'bg-gray-100 text-gray-600 border-gray-200',
    icon: CircleDashed,
  };
  const Icon = style.icon;
  return (
    <span
      className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full border whitespace-nowrap ${style.cls} ${className}`}
    >
      <Icon className="w-3 h-3" aria-hidden="true" />
      {style.label}
    </span>
  );
}
