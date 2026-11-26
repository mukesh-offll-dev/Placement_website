import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  FileText,
  Info,
  RefreshCw,
  ShieldCheck,
  UserCheck,
  XCircle,
} from 'lucide-react';
import { getDraft, getVerification, getVerificationHistory, withdrawDraft } from '../services/api/studentDraftService';
import { getProfile } from '../services/api/studentService';
import { formatFileSize } from '../services/api/fileService';
import EmptyState from '../components/EmptyState';
import ConfirmDialog from '../components/ConfirmDialog';
import { ListRowSkeleton } from '../components/Skeleton';
import { ProtectedFileLink } from '../components/ProtectedMedia';
import VerificationStatusBadge from '../components/student/VerificationStatusBadge';
import SectionDiff from '../components/student/SectionDiff';
import { notifyVerificationChanged } from '../components/student/useVerificationStatus';
import { computeChangedSections, parseSectionList, sectionLabel } from '../utils/profileDraft';
import { toastError, toastSuccess } from '../utils/toast';

const formatDateTime = (value) => {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime())
    ? null
    : d.toLocaleString(undefined, { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
};

const formatShortDateTime = (value) => {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  const datePart = d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
  const timePart = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
  return `${datePart}, ${timePart}`;
};

const formatDateOnly = (value) => {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime())
    ? null
    : d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
};

const MOBILE_HISTORY_BADGE = {
  PENDING: { box: 'bg-[#FEF3C7] text-[#92400E]', label: 'Pending', labelCls: 'text-[#92400E]' },
  APPROVED: { box: 'bg-[#ECFDF5] text-[#059669]', label: 'Approved', labelCls: 'text-[#059669]' },
  REJECTED: { box: 'bg-red-50 text-red-600', label: 'Returned', labelCls: 'text-red-600' },
  WITHDRAWN: { box: 'bg-slate-100 text-[#475569]', label: 'Withdrawn', labelCls: 'text-[#64748B]' },
  DISCARDED: { box: 'bg-slate-100 text-[#64748B]', label: 'Discarded', labelCls: 'text-[#64748B]' },
};

const EVENT_LABELS = {
  CREATED: 'Draft created',
  SUBMITTED: 'Submitted for verification',
  WITHDRAWN: 'Withdrawn',
  APPROVED: 'Approved',
  REJECTED: 'Changes requested',
  DISCARDED: 'Discarded',
};

const EVENT_DOT = {
  APPROVED: 'bg-green-500',
  REJECTED: 'bg-red-500',
  SUBMITTED: 'bg-amber-500',
  WITHDRAWN: 'bg-gray-400',
  DISCARDED: 'bg-gray-400',
  CREATED: 'bg-blue-500',
};

function RequestDetail({ id, onBack }) {
  const [state, setState] = useState({ id: null, detail: null, error: null });

  const load = useCallback(
    (signal) =>
      getVerification(id, { signal })
        .then((detail) => setState({ id, detail, error: null }))
        .catch((err) => {
          if (err?.code === 'ERR_CANCELED') return;
          setState({ id, detail: null, error: err?.message || 'Could not load this request.' });
        }),
    [id]
  );

  useEffect(() => {
    const controller = new AbortController();
    load(controller.signal);
    return () => controller.abort();
  }, [load]);

  const loading = state.id !== id;
  const { detail, error } = state;

  const back = (
    <button type="button" onClick={onBack} className="inline-flex items-center gap-1.5 text-blue-600 text-sm hover:underline font-medium mb-4">
      <ArrowLeft className="w-4 h-4" /> All requests
    </button>
  );

  if (loading) {
    return (
      <div>
        {back}
        <ListRowSkeleton count={3} />
      </div>
    );
  }
  if (error || !detail) {
    return (
      <div>
        {back}
        <EmptyState
          type="error"
          title="Could not load the request"
          description={error || 'The request was not found.'}
          action={{ label: 'Try again', onClick: () => { setState({ id: null, detail: null, error: null }); load(); }, icon: RefreshCw }}
        />
      </div>
    );
  }

  const base = detail.base || detail.current;
  let sections = parseSectionList(detail.changedSections);
  if (!sections.length && detail.proposed) sections = computeChangedSections(detail.proposed, base);
  const sectionComments = detail.sectionComments && typeof detail.sectionComments === 'object' ? detail.sectionComments : {};
  const events = Array.isArray(detail.events) ? detail.events : [];
  const evidence = Array.isArray(detail.evidence) ? detail.evidence : Array.isArray(detail.proposed?.evidence) ? detail.proposed.evidence : [];

  return (
    <div className="space-y-5">
      {back}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 sm:p-6">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-lg font-bold text-gray-900">Request #{detail.versionNumber ?? detail.id}</h2>
          <VerificationStatusBadge status={detail.status} />
        </div>
        <dl className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
          <div>
            <dt className="text-xs text-gray-500">Submitted</dt>
            <dd className="font-medium text-gray-800">{formatDateTime(detail.submittedAt) || '—'}</dd>
          </div>
          <div>
            <dt className="text-xs text-gray-500">Reviewed</dt>
            <dd className="font-medium text-gray-800">{formatDateTime(detail.reviewedAt) || '—'}</dd>
          </div>
          <div>
            <dt className="text-xs text-gray-500">Reviewer</dt>
            <dd className="font-medium text-gray-800 flex items-center gap-1">
              {detail.reviewerName ? (
                <>
                  <UserCheck className="w-3.5 h-3.5 text-gray-400" aria-hidden="true" /> {detail.reviewerName}
                </>
              ) : (
                '—'
              )}
            </dd>
          </div>
        </dl>
        {detail.studentNote && (
          <p className="mt-4 text-sm p-3 rounded-xl bg-gray-50 border border-gray-200 text-gray-700 whitespace-pre-line">
            <span className="font-semibold">Your note:</span> {detail.studentNote}
          </p>
        )}
        {detail.reviewComment && (
          <p
            className={`mt-3 text-sm p-3 rounded-xl border whitespace-pre-line ${
              detail.status === 'REJECTED' ? 'bg-red-50 border-red-200 text-red-800' : 'bg-green-50 border-green-200 text-green-800'
            }`}
          >
            <span className="font-semibold">Reviewer comment:</span> {detail.reviewComment}
          </p>
        )}
        {detail.status === 'REJECTED' && (
          <Link to="/student/profile" className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-red-700 hover:underline">
            <Pencil className="w-3.5 h-3.5" /> Edit your profile and resubmit
          </Link>
        )}
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 sm:p-6">
        <h3 className="font-semibold text-gray-900 mb-1 flex items-center gap-2">
          <ClipboardList className="w-5 h-5 text-blue-600" aria-hidden="true" /> Changes in this request
        </h3>
        <p className="text-xs text-gray-500 mb-4">Compared with your verified profile at the time of submission.</p>
        {sections.length > 0 && detail.proposed ? (
          <div className="space-y-3">
            {sections.map((key) => (
              <SectionDiff key={key} sectionKey={key} before={base} after={detail.proposed} comment={sectionComments[key]} />
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-400 italic">No section changes recorded.</p>
        )}
      </div>

      {evidence.length > 0 && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 sm:p-6">
          <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <FileText className="w-5 h-5 text-gray-600" aria-hidden="true" /> Evidence
          </h3>
          <ul className="space-y-2">
            {evidence.map((ev, i) => (
              <li key={`${ev.fileUrl}-${i}`} className="text-sm border border-gray-200 rounded-xl p-3">
                <ProtectedFileLink url={ev.fileUrl} className="font-semibold text-blue-600 hover:underline break-all text-left">
                  {ev.fileName || 'Evidence file'}
                </ProtectedFileLink>
                <p className="text-[11px] text-gray-500">
                  {ev.section ? `For: ${sectionLabel(ev.section)}` : ''}
                  {ev.size ? ` · ${formatFileSize(ev.size)}` : ''}
                </p>
                {ev.note && <p className="text-xs text-gray-600 mt-1">{ev.note}</p>}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 sm:p-6">
        <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <History className="w-5 h-5 text-indigo-600" aria-hidden="true" /> Timeline
        </h3>
        {events.length ? (
          <ol className="relative border-l border-gray-200 ml-2 space-y-4">
            {events.map((ev, i) => (
              <li key={`${ev.action}-${ev.at}-${i}`} className="ml-4">
                <span className={`absolute -left-1.5 mt-1.5 w-3 h-3 rounded-full ring-2 ring-white ${EVENT_DOT[ev.action] || 'bg-gray-400'}`} aria-hidden="true" />
                <p className="text-sm font-semibold text-gray-900">{EVENT_LABELS[ev.action] || ev.action}</p>
                <p className="text-[11px] text-gray-500">
                  {formatDateTime(ev.at) || ''}
                  {ev.actorName ? ` · ${ev.actorName}` : ''}
                  {ev.actorRole ? ` (${String(ev.actorRole).toLowerCase().replace(/_/g, ' ')})` : ''}
                </p>
                {ev.comment && <p className="text-xs text-gray-700 mt-1 whitespace-pre-line">{ev.comment}</p>}
              </li>
            ))}
          </ol>
        ) : (
          <p className="text-sm text-gray-400 italic">No events recorded.</p>
        )}
      </div>
    </div>
  );
}

export default function StudentVerificationPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedId = searchParams.get('id');
  const [draft, setDraft] = useState(null);
  const [history, setHistory] = useState([]);
  const [profileDeptCode, setProfileDeptCode] = useState('');
  const [status, setStatus] = useState('loading');
  const [error, setError] = useState(null);
  const [confirmWithdraw, setConfirmWithdraw] = useState(false);
  const [withdrawing, setWithdrawing] = useState(false);

  const load = useCallback(async (signal) => {
    setStatus('loading');
    try {
      const [draftRes, historyRes, profileRes] = await Promise.allSettled([
        getDraft({ signal }),
        getVerificationHistory({ signal }),
        getProfile(),
      ]);
      if (signal?.aborted) return;
      if (historyRes.status === 'rejected') throw historyRes.reason;
      const nextDraft = draftRes.status === 'fulfilled' ? draftRes.value : null;
      setDraft(nextDraft);
      setHistory(historyRes.value);
      if (profileRes.status === 'fulfilled' && profileRes.value?.departmentCode) {
        setProfileDeptCode(profileRes.value.departmentCode);
      }
      if (nextDraft) notifyVerificationChanged(nextDraft);
      setStatus('ready');
    } catch (err) {
      if (err?.code === 'ERR_CANCELED') return;
      setError(err?.message || 'Could not load your verification history.');
      setStatus('error');
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    load(controller.signal);
    return () => controller.abort();
  }, [load]);

  const open = (id) => {
    setSearchParams({ id: String(id) });
    window.scrollTo({ top: 0 });
  };
  const back = () => setSearchParams({});

  const handleWithdraw = async () => {
    setWithdrawing(true);
    try {
      const updated = await withdrawDraft();
      notifyVerificationChanged(updated);
      setConfirmWithdraw(false);
      toastSuccess('Request withdrawn. You can edit your draft again.');
      await load();
    } catch (err) {
      toastError(err, 'Could not withdraw the request.');
    } finally {
      setWithdrawing(false);
    }
  };

  // Drafts are work in progress, not requests; history shows submitted versions.
  const requests = history.filter((v) => v && v.status !== 'DRAFT');
  const isPending = draft?.status === 'PENDING';
  const isRejected = draft?.status === 'REJECTED' || (!isPending && draft?.profileVerificationStatus === 'REJECTED');
  const isVerified = !isPending && !isRejected && draft?.profileVerificationStatus === 'VERIFIED';
  const pendingRequest = requests.find((r) => r.status === 'PENDING') || null;
  const latestRejectedRequest = requests.find((r) => r.status === 'REJECTED') || null;
  const latestRequest = requests[0] || null;
  const deptCode = pendingRequest?.departmentCode || latestRequest?.departmentCode || profileDeptCode || '';

  const draftSections = parseSectionList(draft?.changedSections);
  const pendingSections = parseSectionList(pendingRequest?.changedSections);
  const displaySections = isPending
    ? (draftSections.length ? draftSections : pendingSections)
    : draftSections;
  const seeChangesId = pendingRequest?.id || draft?.versionId || latestRequest?.id || null;
  const submittedStamp = formatShortDateTime(draft?.submittedAt || pendingRequest?.submittedAt);
  const rejectedFeedback = isRejected ? (draft?.reviewComment || latestRejectedRequest?.reviewComment) : null;

  return (
    <>
      {/* ── SCREENSHOT-MATCHED UI (Mobile-first & centered on desktop) ── */}
      <main className="flex-1 w-full max-w-[480px] md:max-w-[540px] mx-auto px-4 pt-4 md:py-6 pb-6 overflow-x-hidden">
        {/* Top Mobile Header: < Profile verification */}
        <div className="flex items-center gap-3 mb-4">
          <button
            type="button"
            onClick={() => (selectedId ? back() : navigate('/student/profile'))}
            aria-label={selectedId ? 'Back to profile verification' : 'Back to profile'}
            className="w-10 h-10 rounded-[14px] bg-white border border-[#E5E9F2] shadow-[0_1px_2px_rgba(15,23,42,0.05)] flex items-center justify-center text-[#0F172A] hover:bg-slate-50 active:scale-95 transition shrink-0 cursor-pointer"
          >
            <ChevronLeft className="w-5 h-5" strokeWidth={2} />
          </button>
          <h1 className="text-[20px] font-extrabold text-[#0F172A] tracking-tight truncate">
            {selectedId ? 'Request details' : 'Profile verification'}
          </h1>
        </div>

        {selectedId ? (
          <RequestDetail id={selectedId} onBack={back} />
        ) : status === 'loading' ? (
          <ListRowSkeleton count={4} />
        ) : status === 'error' ? (
          <EmptyState
            type="error"
            title="Could not load verification history"
            description={error}
            action={{ label: 'Try again', onClick: () => load(), icon: RefreshCw }}
          />
        ) : (
          <div className="space-y-5">
            {/* Main Review Status Card */}
            <section className="bg-white rounded-[22px] border border-[#E5E9F2] shadow-[0_1px_3px_rgba(15,23,42,0.04)] p-4.5">
              {/* Top Status Pill */}
              {isPending ? (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[12.5px] font-bold bg-[#FEF3C7] text-[#92400E]">
                  <Clock className="w-3.5 h-3.5" strokeWidth={2.2} />
                  Pending review
                </span>
              ) : isRejected ? (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[12.5px] font-bold bg-red-50 text-red-700 border border-red-200">
                  <XCircle className="w-3.5 h-3.5" strokeWidth={2.2} />
                  Changes requested
                </span>
              ) : isVerified ? (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[12.5px] font-bold bg-[#ECFDF5] text-[#047857]">
                  <CheckCircle2 className="w-3.5 h-3.5" strokeWidth={2.2} />
                  Verified
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[12.5px] font-bold bg-[#EFF6FF] text-[#1D4ED8]">
                  <ShieldCheck className="w-3.5 h-3.5" strokeWidth={2.2} />
                  Not submitted
                </span>
              )}

              <h2 className="text-[21px] font-extrabold text-[#0F172A] leading-snug mt-3">
                {isPending
                  ? 'Your changes are with your faculty advisor'
                  : isRejected
                  ? 'Your advisor requested changes'
                  : isVerified
                  ? 'Your profile is verified'
                  : 'Submit your profile for verification'}
              </h2>
              <p className="text-[13.5px] text-[#475569] leading-relaxed mt-1.5">
                {isPending
                  ? 'Recruiters and the placement cell keep seeing your last verified profile until these are approved.'
                  : isRejected
                  ? 'Fix the requested sections in your profile and submit a new verification request.'
                  : isVerified
                  ? 'Recruiters and the placement cell see your latest approved profile.'
                  : 'Recruiters and the placement cell see your profile once your faculty advisor approves it.'}
              </p>

              {/* 3-Step Status Progress Bar */}
              <div className="grid grid-cols-3 gap-2.5 mt-4">
                <div>
                  <div
                    className={`h-1.5 rounded-full ${
                      isPending || isRejected || isVerified || latestRequest ? 'bg-[#1D4ED8]' : 'bg-[#E2E8F0]'
                    }`}
                  />
                  <p className="text-[12px] font-bold text-[#0F172A] mt-2 leading-tight">Submitted</p>
                  <p className="text-[11px] text-[#64748B] mt-0.5 truncate">
                    {submittedStamp || (latestRequest ? formatShortDateTime(latestRequest.submittedAt) : 'Not yet')}
                  </p>
                </div>

                <div>
                  <div
                    className={`h-1.5 rounded-full ${
                      isPending
                        ? 'bg-[#F59E0B]'
                        : isRejected || isVerified
                        ? 'bg-[#1D4ED8]'
                        : 'bg-[#E2E8F0]'
                    }`}
                  />
                  <p
                    className={`text-[12px] font-bold mt-2 leading-tight ${
                      isPending ? 'text-[#92400E]' : 'text-[#0F172A]'
                    }`}
                  >
                    With advisor
                  </p>
                  <p className="text-[11px] text-[#64748B] mt-0.5 truncate">
                    {deptCode ? `${deptCode} advisor` : 'Faculty advisor'}
                  </p>
                </div>

                <div>
                  <div
                    className={`h-1.5 rounded-full ${
                      isVerified ? 'bg-[#059669]' : isRejected ? 'bg-red-500' : 'bg-[#E2E8F0]'
                    }`}
                  />
                  <p
                    className={`text-[12px] font-bold mt-2 leading-tight ${
                      isVerified ? 'text-[#059669]' : isRejected ? 'text-red-600' : 'text-[#64748B]'
                    }`}
                  >
                    Decision
                  </p>
                  <p className="text-[11px] text-[#64748B] mt-0.5 truncate">
                    {isVerified ? 'Approved' : isRejected ? 'Returned' : 'Approve or return'}
                  </p>
                </div>
              </div>

              {/* Submitted / Changed Sections Box */}
              {(isPending || displaySections.length > 0) && (
                <div className="bg-[#F8FAFC] border border-[#EEF2F6] rounded-[16px] p-3.5 mt-4">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-[#64748B] mb-2">
                    {isPending ? 'SECTIONS IN THIS REQUEST' : 'UNSUBMITTED DRAFT SECTIONS'}
                  </p>
                  {displaySections.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {displaySections.map((key) => (
                        <span
                          key={key}
                          className="inline-flex items-center bg-white border border-[#E2E8F2] text-[#0F172A] text-[12.5px] font-semibold px-3 py-1 rounded-full"
                        >
                          {sectionLabel(key)}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-[#64748B]">Profile submission under review</p>
                  )}
                </div>
              )}

              {/* Action Buttons */}
              {isPending ? (
                <div className="grid grid-cols-2 gap-2.5 mt-4">
                  <button
                    type="button"
                    onClick={() => setConfirmWithdraw(true)}
                    disabled={withdrawing || (draft?.lifecycleStatus && draft.lifecycleStatus !== 'ACTIVE')}
                    className="w-full py-3 px-3 rounded-[14px] border border-[#FCD34D] bg-white hover:bg-[#FFFBEB] text-[#92400E] text-[13.5px] font-bold transition disabled:opacity-50 cursor-pointer"
                  >
                    Withdraw request
                  </button>
                  <button
                    type="button"
                    onClick={() => seeChangesId && open(seeChangesId)}
                    disabled={!seeChangesId}
                    className="w-full py-3 px-3 rounded-[14px] bg-[#0B1528] hover:bg-[#1E293B] text-white text-[13.5px] font-bold transition disabled:opacity-50 cursor-pointer"
                  >
                    See my changes
                  </button>
                </div>
              ) : (
                <div className={`grid ${latestRequest ? 'grid-cols-2' : 'grid-cols-1'} gap-2.5 mt-4`}>
                  <Link
                    to="/student/profile"
                    className="w-full py-3 px-3 rounded-[14px] bg-[#0B1528] hover:bg-[#1E293B] text-white text-[13.5px] font-bold text-center transition"
                  >
                    {isRejected ? 'Fix in profile' : 'Edit profile'}
                  </Link>
                  {latestRequest && (
                    <button
                      type="button"
                      onClick={() => open(latestRequest.id)}
                      className="w-full py-3 px-3 rounded-[14px] border border-[#E2E8F2] bg-white hover:bg-slate-50 text-[#0F172A] text-[13.5px] font-bold transition cursor-pointer"
                    >
                      See my changes
                    </button>
                  )}
                </div>
              )}
            </section>

            {/* HISTORY Section */}
            <section aria-labelledby="mobile-history-title">
              <p
                id="mobile-history-title"
                className="text-[11px] font-bold uppercase tracking-wider text-[#64748B] mb-2.5 px-1"
              >
                HISTORY
              </p>
              {requests.length > 0 ? (
                <ul className="space-y-2.5">
                  {requests.map((item) => {
                    const sections = parseSectionList(item.changedSections);
                    const badgeStyle =
                      MOBILE_HISTORY_BADGE[String(item.status || '').toUpperCase()] ||
                      MOBILE_HISTORY_BADGE.WITHDRAWN;
                    const title =
                      sections.length > 0
                        ? sections.map(sectionLabel).join(', ')
                        : `Request #${item.versionNumber ?? item.id}`;
                    const dateStr = formatDateOnly(item.submittedAt);

                    return (
                      <li key={item.id}>
                        <button
                          type="button"
                          onClick={() => open(item.id)}
                          className="w-full bg-white rounded-[18px] border border-[#E5E9F2] shadow-[0_1px_2px_rgba(15,23,42,0.03)] p-3.5 flex items-center gap-3 text-left hover:bg-slate-50/70 active:scale-[0.995] transition cursor-pointer"
                        >
                          <span
                            className={`w-10 h-10 rounded-[12px] font-extrabold text-[13px] flex items-center justify-center shrink-0 ${badgeStyle.box}`}
                          >
                            #{item.versionNumber ?? item.id}
                          </span>
                          <div className="min-w-0 flex-1">
                            <p className="text-[14.5px] font-bold text-[#0F172A] truncate">{title}</p>
                            <p className="text-[12px] text-[#64748B] mt-0.5 truncate">
                              {dateStr ? `Submitted ${dateStr}` : 'Submitted'}
                            </p>
                          </div>
                          <span className="flex items-center gap-1.5 shrink-0">
                            <span className={`text-[13px] font-bold ${badgeStyle.labelCls}`}>
                              {badgeStyle.label}
                            </span>
                            <ChevronRight className="w-4 h-4 text-[#94A3B8]" />
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <div className="bg-white rounded-[18px] border border-[#E5E9F2] p-4 text-center">
                  <p className="text-sm font-semibold text-[#0F172A]">No verification requests yet</p>
                  <p className="text-xs text-[#64748B] mt-1">
                    Submitted profile requests and their outcomes will appear here.
                  </p>
                </div>
              )}
            </section>

            {/* Advisor Feedback Info Box */}
            <div
              className={`rounded-[18px] border p-4 flex items-start gap-3 ${
                rejectedFeedback
                  ? 'bg-red-50 border-red-200 text-red-900'
                  : 'bg-[#EFF6FF] border-[#DBEAFE] text-[#1E3A8A]'
              }`}
              role="note"
            >
              <Info
                className={`w-5 h-5 shrink-0 mt-0.5 ${
                  rejectedFeedback ? 'text-red-600' : 'text-[#1D4ED8]'
                }`}
                aria-hidden="true"
              />
              <div className="text-[13px] leading-relaxed min-w-0">
                {rejectedFeedback ? (
                  <>
                    <p className="font-bold">Advisor feedback</p>
                    <p className="mt-0.5 whitespace-pre-line break-words">{rejectedFeedback}</p>
                  </>
                ) : (
                  <p className="text-[#475569]">
                    If your advisor returns a request, their comment shows here. Fix it in your profile and submit again.
                  </p>
                )}
              </div>
            </div>
          </div>
        )}
      </main>

      <ConfirmDialog
        open={confirmWithdraw}
        title="Withdraw verification request?"
        message="Your advisor will no longer see this request. Your changes stay in a draft so you can edit and resubmit them."
        confirmLabel="Withdraw"
        busy={withdrawing}
        onConfirm={handleWithdraw}
        onCancel={() => setConfirmWithdraw(false)}
      />
    </>
  );
}
