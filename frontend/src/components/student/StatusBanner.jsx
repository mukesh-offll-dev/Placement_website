import { Link } from 'react-router-dom';
import { CheckCircle2, CircleDashed, Clock, FilePen, Loader2, Undo2, XCircle } from 'lucide-react';
import { sectionLabel } from '../../utils/profileDraft';

const formatDate = (value) => {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime())
    ? null
    : d.toLocaleString(undefined, { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
};

const CONFIG = {
  VERIFIED: {
    cls: 'bg-[#ECFDF5] border-[#A7F3D0] text-[#0F172A]',
    icon: CheckCircle2,
    iconCls: 'text-[#047857]',
    title: 'Profile verified',
  },
  NOT_SUBMITTED: {
    cls: 'bg-[#F1F5FF] border-[#C7D2FE] text-[#0F172A]',
    icon: CircleDashed,
    iconCls: 'text-[#1D4ED8]',
    title: 'Not submitted for verification',
  },
  CHANGES: {
    cls: 'bg-[#F1F5FF] border-[#C7D2FE] text-[#0F172A]',
    icon: FilePen,
    iconCls: 'text-[#1D4ED8]',
    title: 'Your draft has changes that are not yet verified',
  },
  PENDING: {
    cls: 'bg-yellow-50 border-yellow-200 text-[#0F172A]',
    icon: Clock,
    iconCls: 'text-yellow-700',
    title: 'Profile under review',
  },
  REJECTED: {
    cls: 'bg-red-50 border-red-200 text-[#0F172A]',
    icon: XCircle,
    iconCls: 'text-red-600',
    title: 'Changes requested by your faculty advisor',
  },
};

/**
 * Verification status banner at the top of the profile page.
 * `state` comes from deriveBannerState().
 */
export default function StatusBanner({
  state,
  draft,
  changedSections = [],
  hasUnsavedChanges = false,
  verifiedAt,
  onWithdraw,
  withdrawing = false,
  onEditRejected,
}) {
  const cfg = CONFIG[state] || CONFIG.NOT_SUBMITTED;
  const Icon = cfg.icon;
  const submittedAt = formatDate(draft?.submittedAt);

  let body = null;
  if (state === 'VERIFIED') {
    body = (
      <p>
        Your profile matches what your faculty advisor approved{verifiedAt ? ` on ${formatDate(verifiedAt)}` : ''}. Any edits
        you make are kept in a draft until you submit them for verification.
      </p>
    );
  } else if (state === 'NOT_SUBMITTED') {
    body = (
      <p>
        Recruiters and the placement cell only see verified information. Edit your profile below, then submit it for
        verification.
      </p>
    );
  } else if (state === 'CHANGES') {
    body = (
      <>
        <p>
          {hasUnsavedChanges ? 'You have unsaved edits. ' : 'Your draft is saved. '}
          Submit it for verification so your advisor can review it; until then the verified version stays in use.
        </p>
        {changedSections.length > 0 && (
          <p className="mt-1">
            <span className="font-semibold">Changed sections:</span> {changedSections.map(sectionLabel).join(', ')}
          </p>
        )}
      </>
    );
  } else if (state === 'PENDING') {
    body = (
      <>
        <p>
          Submitted{submittedAt ? ` on ${submittedAt}` : ''}. Editing is locked while the request is under review. Withdraw it
          if you need to make further changes.
        </p>
        {changedSections.length > 0 && (
          <p className="mt-1">
            <span className="font-semibold">Sections under review:</span> {changedSections.map(sectionLabel).join(', ')}
          </p>
        )}
      </>
    );
  } else if (state === 'REJECTED') {
    body = (
      <>
        {draft?.reviewComment ? (
          <p className="whitespace-pre-line">
            <span className="font-semibold">Reviewer comment:</span> {draft.reviewComment}
          </p>
        ) : (
          <p>Your last request was not approved.</p>
        )}
        <p className="mt-1">Comments on specific sections are shown next to those sections below. Correct them and resubmit.</p>
      </>
    );
  }

  return (
    <div className={`flex flex-col sm:flex-row sm:items-start gap-3 p-4 rounded-2xl border mb-6 text-sm ${cfg.cls}`} role="status">
      <Icon className={`w-5 h-5 shrink-0 ${cfg.iconCls}`} aria-hidden="true" />
      <div className="flex-1 min-w-0 space-y-0.5">
        <p className="font-bold">{cfg.title}</p>
        <div className="text-xs sm:text-sm opacity-90">{body}</div>
        <Link to="/student/verification" className="inline-block mt-1 text-xs font-semibold underline underline-offset-2">
          View verification history
        </Link>
      </div>
      {state === 'PENDING' && onWithdraw && (
        <button
          type="button"
          onClick={onWithdraw}
          disabled={withdrawing}
          className="inline-flex items-center justify-center gap-1.5 bg-white text-amber-800 border border-amber-300 hover:bg-amber-100 text-xs font-semibold px-3.5 py-2 rounded-xl transition disabled:opacity-50 shrink-0"
        >
          {withdrawing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Undo2 className="w-3.5 h-3.5" />}
          Withdraw request
        </button>
      )}
      {state === 'REJECTED' && onEditRejected && (
        <button
          type="button"
          onClick={onEditRejected}
          className="inline-flex items-center justify-center gap-1.5 bg-white text-red-700 border border-red-300 hover:bg-red-100 text-xs font-semibold px-3.5 py-2 rounded-xl transition shrink-0"
        >
          <FilePen className="w-3.5 h-3.5" /> Edit and resubmit
        </button>
      )}
    </div>
  );
}
