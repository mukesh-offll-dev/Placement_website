import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Clock,
  ExternalLink,
  FileText,
  Loader2,
  MessageSquare,
  Paperclip,
  RefreshCw,
  ShieldCheck,
  XCircle,
} from 'lucide-react';
import ProfileDiff from './ProfileDiff';
import { Modal } from '../students/Modal';
import { VerificationBadge } from '../students/StatusBadges';
import EmptyState from '../EmptyState';
import { ProfileSkeleton } from '../Skeleton';
import { ProtectedFileLink, ProtectedMediaPreview } from '../ProtectedMedia';
import { diffSectionLabel, officialChangedSinceSubmit } from '../../utils/profileDiff';
import { formatDateTime } from '../../utils/dateFormat';
import { toastError, toastSuccess } from '../../utils/toast';
import { formatFileSize } from '../../services/api/fileService';
import { notifyVerificationsChanged } from '../../hooks/usePendingVerifications';

const EVENT_META = {
  CREATED: { icon: FileText, cls: 'bg-gray-100 text-gray-600', label: 'Draft created' },
  SUBMITTED: { icon: Clock, cls: 'bg-amber-100 text-amber-700', label: 'Submitted for verification' },
  WITHDRAWN: { icon: RefreshCw, cls: 'bg-gray-100 text-gray-600', label: 'Withdrawn by student' },
  APPROVED: { icon: CheckCircle2, cls: 'bg-green-100 text-green-700', label: 'Approved' },
  REJECTED: { icon: XCircle, cls: 'bg-red-100 text-red-700', label: 'Rejected' },
  DISCARDED: { icon: XCircle, cls: 'bg-gray-100 text-gray-600', label: 'Discarded' },
};

const isImage = (ev) => /^image\//i.test(ev?.contentType || '') || /\.(png|jpe?g|webp|gif)$/i.test(ev?.fileName || ev?.fileUrl || '');

/**
 * Review screen for one verification request, shared by /faculty/verifications/:id and the admin
 * fallback /admin/verifications/:id. `api` is facultyVerificationApi or adminVerificationApi.
 */
export default function VerificationReview({ api, id }) {
  const navigate = useNavigate();
  const [state, setState] = useState({ key: null, detail: null, error: '' });
  const [tick, setTick] = useState(0);
  const [mode, setMode] = useState(null); // null | 'approve' | 'reject'
  const [comment, setComment] = useState('');
  const [sectionComments, setSectionComments] = useState({});
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState('');

  const key = `${id}:${tick}`;
  const loading = state.key !== key;

  useEffect(() => {
    let cancelled = false;
    api.get(id)
      .then((detail) => { if (!cancelled) setState({ key, detail, error: '' }); })
      .catch((err) => { if (!cancelled) setState({ key, detail: null, error: err.message || 'Could not load this request.' }); });
    return () => { cancelled = true; };
  }, [api, id, key]);

  const onSectionComment = useCallback((sectionKey, value) => {
    setSectionComments((prev) => ({ ...prev, [sectionKey]: value }));
  }, []);

  if (loading) return <ProfileSkeleton />;

  if (state.error || !state.detail) {
    return (
      <main className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          <EmptyState
            type="not-found"
            icon={ShieldCheck}
            title="Request not available"
            description={state.error || 'This verification request could not be found.'}
            action={{ label: 'Back to requests', to: api.basePath, icon: ArrowLeft }}
            secondaryAction={{ label: 'Retry', onClick: () => setTick((t) => t + 1), icon: RefreshCw }}
          />
        </div>
      </main>
    );
  }

  const d = state.detail;
  const pending = d.status === 'PENDING';
  const verified = d.current || d.base || {};
  const changedSections = Array.isArray(d.changedSections) ? d.changedSections : [];
  const movedOn = officialChangedSinceSubmit(d.base, d.current, changedSections);
  const evidence = Array.isArray(d.evidence) ? d.evidence : Array.isArray(d.proposed?.evidence) ? d.proposed.evidence : [];
  const events = Array.isArray(d.events) ? d.events : [];
  const commentTrim = comment.trim();
  const canConfirm = mode === 'approve' || (mode === 'reject' && commentTrim.length > 0);

  const startDecision = (next) => {
    setMode(next);
    setFormError('');
    if (next !== 'reject') setSectionComments({});
  };

  const decide = async () => {
    setBusy(true);
    setFormError('');
    try {
      if (mode === 'approve') {
        await api.approve(d.id, commentTrim);
        toastSuccess(`Approved ${d.studentName || d.rollNo || 'the request'}. The official profile is updated.`);
      } else {
        await api.reject(d.id, commentTrim, sectionComments);
        toastSuccess(`Rejected. ${d.studentName || 'The student'} has been notified with your comments.`);
      }
      notifyVerificationsChanged();
      navigate(api.basePath, { replace: true });
    } catch (err) {
      setConfirming(false);
      setFormError(err.message || 'The decision could not be saved.');
      toastError(err, 'The decision could not be saved.');
      // A 409 usually means the request was withdrawn or decided meanwhile: reload it.
      if (err?.status === 409) setTick((t) => t + 1);
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="flex-1 px-4 md:px-8 py-6 overflow-x-hidden">
      <Link to={api.basePath} className="inline-flex items-center gap-1.5 text-blue-600 text-sm hover:underline mb-4 font-medium">
        <ArrowLeft className="w-4 h-4" /> Back to requests
      </Link>

      {/* Student header */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 mb-5">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
          <div className="flex items-start gap-3 min-w-0">
            <div className="w-12 h-12 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-lg shrink-0">
              {(d.studentName || '?').charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <h2 className="text-xl font-bold text-gray-900 truncate">{d.studentName || 'Student'}</h2>
              <div className="flex flex-wrap items-center gap-2 mt-1 text-xs">
                {d.rollNo && <span className="font-mono bg-gray-100 text-gray-700 px-2 py-0.5 rounded">{d.rollNo}</span>}
                {d.departmentCode && <span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded font-semibold">{d.departmentCode}</span>}
                {d.batch && <span className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded">Batch {d.batch}</span>}
                <span className="text-gray-500">Request #{d.versionNumber ?? d.id}</span>
              </div>
            </div>
          </div>
          <div className="flex flex-col sm:items-end gap-1.5 shrink-0">
            <VerificationBadge status={d.status} className="text-xs px-2.5" />
            <p className="text-xs text-gray-500">Submitted {formatDateTime(d.submittedAt)}</p>
            {d.studentId && (
              <Link to={api.studentPath(d.studentId)} className="text-xs text-blue-600 hover:underline inline-flex items-center gap-1">
                Official profile <ExternalLink className="w-3 h-3" />
              </Link>
            )}
          </div>
        </div>
        {changedSections.length > 0 && (
          <div className="mt-4 pt-3 border-t border-gray-100 flex flex-wrap items-center gap-1.5">
            <span className="text-xs font-semibold text-gray-500 mr-1">Changed:</span>
            {changedSections.map((s) => (
              <span key={s} className="text-[11px] px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200 font-medium">{diffSectionLabel(s)}</span>
            ))}
          </div>
        )}
      </div>

      <div className="grid lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 space-y-5 min-w-0">
          {movedOn && pending && (
            <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 text-amber-900 text-sm rounded-xl px-4 py-3">
              <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0 text-amber-600" />
              <p>The official profile changed after this request was submitted. The comparison below is against the profile as it is now.</p>
            </div>
          )}

          {d.studentNote && (
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
              <h3 className="text-sm font-semibold text-gray-900 mb-1.5 flex items-center gap-1.5"><MessageSquare className="w-4 h-4 text-gray-400" /> Note from the student</h3>
              <p className="text-sm text-gray-700 whitespace-pre-wrap">{d.studentNote}</p>
            </div>
          )}

          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-semibold text-gray-900">Verified vs proposed</h3>
              <span className="hidden md:inline text-xs text-gray-500">
                <span className="text-red-700 line-through">removed</span> · <span className="text-green-700 font-medium">proposed</span>
              </span>
            </div>
            <ProfileDiff
              before={verified}
              after={d.proposed}
              changedSections={changedSections}
              existingComments={d.sectionComments || {}}
              commentsEditable={pending && mode === 'reject'}
              comments={sectionComments}
              onComment={onSectionComment}
            />
          </div>

          {/* Evidence */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
            <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-1.5"><Paperclip className="w-4 h-4 text-gray-400" /> Evidence</h3>
            {evidence.length === 0 ? (
              <p className="text-sm text-gray-400">No evidence files attached.</p>
            ) : (
              <ul className="grid sm:grid-cols-2 gap-3">
                {evidence.map((ev, i) => (
                  <li key={`${ev.fileUrl}-${i}`} className="border border-gray-200 rounded-lg overflow-hidden">
                    {isImage(ev) && (
                      <div className="h-32 bg-gray-50">
                        <ProtectedMediaPreview url={ev.fileUrl} alt={ev.fileName || 'Evidence'} />
                      </div>
                    )}
                    <div className="p-3 text-sm">
                      <ProtectedFileLink url={ev.fileUrl} className="font-medium text-blue-600 hover:underline break-all text-left inline-flex items-center gap-1.5" title="Open file">
                        <FileText className="w-4 h-4 shrink-0" /> {ev.fileName || 'Open file'}
                      </ProtectedFileLink>
                      <p className="text-xs text-gray-500 mt-1">
                        {[ev.section && diffSectionLabel(ev.section), ev.size ? formatFileSize(ev.size) : null].filter(Boolean).join(' · ')}
                      </p>
                      {ev.note && <p className="text-xs text-gray-600 mt-1 whitespace-pre-wrap">{ev.note}</p>}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* Decision + timeline */}
        <div className="space-y-5">
          {pending ? (
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 lg:sticky lg:top-20">
              <h3 className="text-sm font-semibold text-gray-900 mb-3">Decision</h3>
              <div className="grid grid-cols-2 gap-2 mb-3">
                <button
                  type="button"
                  onClick={() => startDecision('approve')}
                  aria-pressed={mode === 'approve'}
                  className={`flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-sm font-semibold border transition-colors ${
                    mode === 'approve' ? 'bg-green-600 border-green-600 text-white' : 'border-green-200 text-green-700 hover:bg-green-50'
                  }`}
                >
                  <CheckCircle2 className="w-4 h-4" /> Approve
                </button>
                <button
                  type="button"
                  onClick={() => startDecision('reject')}
                  aria-pressed={mode === 'reject'}
                  className={`flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-sm font-semibold border transition-colors ${
                    mode === 'reject' ? 'bg-red-600 border-red-600 text-white' : 'border-red-200 text-red-700 hover:bg-red-50'
                  }`}
                >
                  <XCircle className="w-4 h-4" /> Reject
                </button>
              </div>
              {mode && (
                <>
                  <label htmlFor="decision-comment" className="block text-xs font-semibold text-gray-700 mb-1">
                    {mode === 'reject' ? 'Reason for rejection (required)' : 'Comment for the student (optional)'}
                  </label>
                  <textarea
                    id="decision-comment"
                    rows={4}
                    maxLength={2000}
                    value={comment}
                    onChange={(e) => { setComment(e.target.value); setFormError(''); }}
                    placeholder={mode === 'reject' ? 'Explain what needs to be corrected.' : 'e.g. Verified against the marksheet.'}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <p className="text-[11px] text-gray-400 text-right">{comment.length}/2000</p>
                  {mode === 'reject' && (
                    <p className="text-xs text-gray-500 mt-1">You can also leave a comment on each changed section in the comparison.</p>
                  )}
                  {formError && <p className="text-xs text-red-600 mt-2" role="alert">{formError}</p>}
                  <button
                    type="button"
                    disabled={!canConfirm}
                    onClick={() => setConfirming(true)}
                    className={`w-full mt-3 px-3 py-2 rounded-lg text-sm font-semibold text-white disabled:opacity-50 ${
                      mode === 'approve' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'
                    }`}
                  >
                    {mode === 'approve' ? 'Approve changes…' : 'Reject request…'}
                  </button>
                </>
              )}
              {!mode && <p className="text-xs text-gray-500">Approving copies the changed sections into the official profile at once.</p>}
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
              <h3 className="text-sm font-semibold text-gray-900 mb-2">Outcome</h3>
              <VerificationBadge status={d.status} className="text-xs px-2.5" />
              {d.reviewerName && <p className="text-xs text-gray-500 mt-2">By {d.reviewerName} · {formatDateTime(d.reviewedAt)}</p>}
              {d.reviewComment && <p className="text-sm text-gray-700 mt-2 whitespace-pre-wrap">{d.reviewComment}</p>}
            </div>
          )}

          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">Timeline</h3>
            {events.length === 0 ? (
              <p className="text-sm text-gray-400">No events recorded.</p>
            ) : (
              <ol className="space-y-3">
                {events.map((ev, i) => {
                  const meta = EVENT_META[ev.action] || EVENT_META.CREATED;
                  const Icon = meta.icon;
                  return (
                    <li key={`${ev.action}-${ev.at}-${i}`} className="flex gap-3">
                      <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${meta.cls}`}><Icon className="w-3.5 h-3.5" /></div>
                      <div className="min-w-0">
                        <p className="text-sm text-gray-900 font-medium">{meta.label}</p>
                        <p className="text-xs text-gray-500">{[ev.actorName, formatDateTime(ev.at)].filter(Boolean).join(' · ')}</p>
                        {ev.comment && <p className="text-xs text-gray-700 mt-1 whitespace-pre-wrap">{ev.comment}</p>}
                      </div>
                    </li>
                  );
                })}
              </ol>
            )}
          </div>
        </div>
      </div>

      {confirming && (
        <Modal title={mode === 'approve' ? 'Approve these changes?' : 'Reject this request?'} onClose={() => !busy && setConfirming(false)} locked={busy}>
          <p className="text-sm text-gray-600 mb-5">
            {mode === 'approve'
              ? `The ${changedSections.length || ''} changed section${changedSections.length === 1 ? '' : 's'} will replace ${d.studentName || 'the student'}'s official profile immediately, and they will be notified.`
              : `${d.studentName || 'The student'} will be notified with your comment${Object.values(sectionComments).some((v) => v && v.trim()) ? 's' : ''} and can correct and resubmit.`}
          </p>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setConfirming(false)} disabled={busy} className="px-4 py-2 rounded-lg text-sm border border-gray-300 hover:bg-gray-50">Cancel</button>
            <button
              type="button"
              onClick={decide}
              disabled={busy}
              className={`flex items-center gap-1.5 text-white px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50 ${mode === 'approve' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}`}
            >
              {busy && <Loader2 className="w-4 h-4 animate-spin" />}
              {mode === 'approve' ? 'Approve' : 'Reject'}
            </button>
          </div>
        </Modal>
      )}
    </main>
  );
}
