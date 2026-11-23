import { useCallback, useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft,
  ChevronRight,
  ClipboardList,
  FileText,
  History,
  Pencil,
  RefreshCw,
  ShieldCheck,
  UserCheck,
} from 'lucide-react';
import { getDraft, getVerification, getVerificationHistory } from '../services/api/studentDraftService';
import { formatFileSize } from '../services/api/fileService';
import EmptyState from '../components/EmptyState';
import { ListRowSkeleton } from '../components/Skeleton';
import { ProtectedFileLink } from '../components/ProtectedMedia';
import VerificationStatusBadge from '../components/student/VerificationStatusBadge';
import SectionDiff from '../components/student/SectionDiff';
import { computeChangedSections, parseSectionList, sectionLabel } from '../utils/profileDraft';

const formatDateTime = (value) => {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime())
    ? null
    : d.toLocaleString(undefined, { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
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

const CURRENT_TEXT = {
  VERIFIED: 'Your profile is verified. Recruiters and the placement cell see the approved version.',
  PENDING: 'Your latest changes are waiting for your faculty advisor’s review.',
  REJECTED: 'Your advisor asked for changes. Open the request below to read the comments, then edit your profile and resubmit.',
  NOT_SUBMITTED: 'You have not submitted your profile for verification yet.',
};

function CurrentStatusCard({ draft }) {
  const profileStatus = draft?.status === 'PENDING' ? 'PENDING' : draft?.profileVerificationStatus || 'NOT_SUBMITTED';
  const changed = parseSectionList(draft?.changedSections);
  const hasDraftChanges = draft && draft.status !== 'PENDING' && changed.length > 0;
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 sm:p-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="bg-blue-100 text-blue-600 p-2.5 rounded-xl shrink-0">
            <ShieldCheck className="w-5 h-5" aria-hidden="true" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="font-semibold text-gray-900">Current status</h2>
              <VerificationStatusBadge status={profileStatus} />
            </div>
            <p className="text-sm text-gray-600 mt-1">{CURRENT_TEXT[profileStatus] || CURRENT_TEXT.NOT_SUBMITTED}</p>
            {draft?.status === 'PENDING' && formatDateTime(draft.submittedAt) && (
              <p className="text-xs text-gray-500 mt-1">Submitted {formatDateTime(draft.submittedAt)}</p>
            )}
            {hasDraftChanges && (
              <p className="text-xs text-blue-700 mt-1">
                Your draft has unsubmitted changes in: {changed.map(sectionLabel).join(', ')}.
              </p>
            )}
            {draft?.lifecycleStatus && draft.lifecycleStatus !== 'ACTIVE' && (
              <p className="text-xs text-gray-600 mt-1 font-medium">
                Your account is {draft.lifecycleStatus === 'ARCHIVED' ? 'archived' : 'disabled'}; you can view history but cannot submit changes.
              </p>
            )}
          </div>
        </div>
        <Link
          to="/student/profile"
          className="inline-flex items-center justify-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-4 py-2 rounded-xl transition shadow-sm shrink-0"
        >
          <Pencil className="w-3.5 h-3.5" />
          {draft?.status === 'PENDING' ? 'View profile' : 'Edit profile'}
        </Link>
      </div>
    </div>
  );
}

function RequestRow({ item, onOpen }) {
  const sections = parseSectionList(item.changedSections);
  return (
    <li>
      <button
        type="button"
        onClick={() => onOpen(item.id)}
        className="w-full text-left p-4 hover:bg-gray-50 transition flex items-start justify-between gap-3"
      >
        <div className="min-w-0 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-semibold text-sm text-gray-900">Request #{item.versionNumber ?? item.id}</span>
            <VerificationStatusBadge status={item.status} />
          </div>
          {sections.length > 0 && (
            <p className="text-xs text-gray-600">
              <span className="text-gray-400">Sections:</span> {sections.map(sectionLabel).join(', ')}
            </p>
          )}
          <p className="text-[11px] text-gray-500 flex flex-wrap gap-x-3">
            {formatDateTime(item.submittedAt) && <span>Submitted {formatDateTime(item.submittedAt)}</span>}
            {formatDateTime(item.reviewedAt) && (
              <span>
                Reviewed {formatDateTime(item.reviewedAt)}
                {item.reviewerName ? ` by ${item.reviewerName}` : ''}
              </span>
            )}
          </p>
          {item.reviewComment && (
            <p className="text-xs text-gray-700 line-clamp-2">
              <span className="text-gray-400">Comment:</span> {item.reviewComment}
            </p>
          )}
        </div>
        <ChevronRight className="w-4 h-4 text-gray-400 shrink-0 mt-1" aria-hidden="true" />
      </button>
    </li>
  );
}

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
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedId = searchParams.get('id');
  const [draft, setDraft] = useState(null);
  const [history, setHistory] = useState([]);
  const [status, setStatus] = useState('loading');
  const [error, setError] = useState(null);

  const load = useCallback(async (signal) => {
    setStatus('loading');
    try {
      const [draftRes, historyRes] = await Promise.allSettled([getDraft({ signal }), getVerificationHistory({ signal })]);
      if (signal?.aborted) return;
      if (historyRes.status === 'rejected') throw historyRes.reason;
      setDraft(draftRes.status === 'fulfilled' ? draftRes.value : null);
      setHistory(historyRes.value);
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

  // Drafts are work in progress, not requests; history shows submitted versions.
  const requests = history.filter((v) => v && v.status !== 'DRAFT');

  return (
    <main className="flex-1 px-4 md:px-8 py-6 overflow-x-hidden max-w-5xl w-full">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Profile Verification</h1>
        <p className="text-gray-500 text-sm">
          Your faculty advisor verifies profile changes before recruiters and the placement cell see them.
        </p>
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
        <div className="space-y-6">
          <CurrentStatusCard draft={draft} />
          <section className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden" aria-labelledby="requests-title">
            <div className="px-4 sm:px-6 py-4 border-b border-gray-100">
              <h2 id="requests-title" className="font-semibold text-gray-900 flex items-center gap-2">
                <History className="w-5 h-5 text-indigo-600" aria-hidden="true" /> Past requests
              </h2>
            </div>
            {requests.length ? (
              <ul className="divide-y divide-gray-100">
                {requests.map((item) => (
                  <RequestRow key={item.id} item={item} onOpen={open} />
                ))}
              </ul>
            ) : (
              <div className="p-4 sm:p-6">
                <EmptyState
                  type="empty"
                  icon={ClipboardList}
                  title="No verification requests yet"
                  description="When you submit your profile for verification, each request and its outcome appears here."
                  action={{ label: 'Go to my profile', to: '/student/profile', icon: Pencil }}
                  compact
                />
              </div>
            )}
          </section>
        </div>
      )}
    </main>
  );
}
