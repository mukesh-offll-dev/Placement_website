import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  Briefcase,
  CalendarDays,
  Check,
  Circle,
  Clock3,
  MapPin,
  Undo2,
} from 'lucide-react';
import studentService from '../services/api/studentService.js';
import ApplicationProgress from '../components/ApplicationProgress';
import ConfirmDialog from '../components/ConfirmDialog';
import EmptyState from '../components/EmptyState';
import { toastError, toastSuccess } from '../utils/toast';

const STAGES = [
  { key: 'APPLIED', label: 'Applied' },
  { key: 'UNDER_REVIEW', label: 'Under Review' },
  { key: 'SHORTLISTED', label: 'Shortlisted' },
  { key: 'INTERVIEW', label: 'Interview' },
  { key: 'FINAL_DECISION', label: 'Final Decision' },
];

const STATUS_INDEX = {
  APPLIED: 0,
  UNDER_REVIEW: 1,
  SHORTLISTED: 2,
  INTERVIEW: 3,
  SELECTED: 4,
};

const getText = (value, fallback = '') =>
  typeof value === 'string' && value.trim() ? value.trim() : fallback;

const getCompanyName = (application) =>
  getText(application?.job?.company?.name, 'Company unavailable');

const formatDate = (value) => {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(date);
};

const stageIndexForLabel = (label) => {
  const text = String(label || '').toLowerCase();
  if (text.includes('appl')) return 0;
  if (text.includes('review')) return 1;
  if (text.includes('shortlist')) return 2;
  if (text.includes('interview') || text.includes('round')) return 3;
  if (text.includes('decision') || text.includes('select') || text.includes('reject')) return 4;
  return -1;
};

const getCurrentIndex = (application, timeline) => {
  if (Number.isInteger(STATUS_INDEX[application?.status])) {
    return STATUS_INDEX[application.status];
  }

  const fromCurrentStage = stageIndexForLabel(application?.currentStage);
  if (fromCurrentStage >= 0) return fromCurrentStage;

  const completedStages = timeline
    .filter((stage) => stage.status === 'DONE')
    .map((stage) => stageIndexForLabel(stage.stageLabel))
    .filter((index) => index >= 0);
  return completedStages.length ? Math.max(...completedStages) : 0;
};

const eventForStage = (timeline, stageIndex) =>
  timeline.find((event) => stageIndexForLabel(event.stageLabel) === stageIndex) || null;

const canWithdraw = (status) =>
  !['WITHDRAWN', 'REJECTED', 'SELECTED'].includes(status);

export default function ApplicationTimelinePage() {
  const { applicationId } = useParams();
  const [application, setApplication] = useState(null);
  const [loadState, setLoadState] = useState('loading');
  const [withdrawOpen, setWithdrawOpen] = useState(false);
  const [withdrawing, setWithdrawing] = useState(false);

  const loadApplication = useCallback(async (signal) => {
    setLoadState('loading');
    try {
      const result = await studentService.getMyApplication(applicationId, { signal });
      if (!signal?.aborted) {
        setApplication(result);
        setLoadState('success');
      }
    } catch (error) {
      if (signal?.aborted || error?.code === 'ERR_CANCELED') return;
      setLoadState('error');
    }
  }, [applicationId]);

  useEffect(() => {
    const controller = new AbortController();
    loadApplication(controller.signal);
    return () => controller.abort();
  }, [loadApplication]);

  const timeline = useMemo(() => {
    const items = Array.isArray(application?.timeline) ? [...application.timeline] : [];
    return items.sort((a, b) => {
      const aOrder = Number.isFinite(a?.displayOrder) ? a.displayOrder : Number.MAX_SAFE_INTEGER;
      const bOrder = Number.isFinite(b?.displayOrder) ? b.displayOrder : Number.MAX_SAFE_INTEGER;
      if (aOrder !== bOrder) return aOrder - bOrder;
      return String(a?.stageDate || a?.createdAt || '').localeCompare(
        String(b?.stageDate || b?.createdAt || '')
      );
    });
  }, [application?.timeline]);

  const currentIndex = application ? getCurrentIndex(application, timeline) : 0;
  const company = application?.job?.company;
  const companyName = getCompanyName(application);
  const jobRole = getText(application?.job?.jobRole, 'Role unavailable');
  const logo = getText(company?.shortName, companyName.slice(0, 2).toUpperCase());
  const logoColor = /^#(?:[\da-f]{3}|[\da-f]{4}|[\da-f]{6}|[\da-f]{8})$/i.test(
    company?.logoColor || ''
  ) ? company.logoColor : null;

  const confirmWithdraw = async () => {
    if (!application) return;
    setWithdrawing(true);
    try {
      const updated = await studentService.withdrawApplication(application.id);
      setApplication((current) => ({ ...current, ...(updated || {}), status: 'WITHDRAWN' }));
      setWithdrawOpen(false);
      toastSuccess('Application withdrawn.');
    } catch (error) {
      toastError(error, 'Could not withdraw this application. Please try again.');
    } finally {
      setWithdrawing(false);
    }
  };

  if (loadState === 'loading') {
    return (
      <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-8 md:px-8" role="status">
        <p className="text-sm font-medium text-slate-500">Loading application timeline…</p>
      </main>
    );
  }

  if (loadState === 'error' || !application) {
    return (
      <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-8 md:px-8">
        <EmptyState
          type="error"
          title="Unable to load application"
          description="The application timeline could not be loaded. Please try again."
          action={{ label: 'Retry', onClick: () => loadApplication() }}
          secondaryAction={{ label: 'Back to My Applications', to: '/student/applications' }}
        />
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-5 md:px-8 md:py-8">
      <Link
        to="/student/applications"
        className="mb-5 inline-flex min-h-10 items-center gap-2 rounded-xl text-sm font-bold text-[#3563E9] transition hover:text-[#2448B8]"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to My Applications
      </Link>

      <section className="overflow-hidden rounded-[24px] border border-[#ECEBFA] bg-white shadow-[0_8px_28px_rgba(32,36,58,0.06)]">
        <div className="bg-[#F4F2FF] p-5 sm:p-7">
          <div className="flex items-start gap-4">
            <div
              className={`relative flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-2xl font-extrabold ${
                logoColor ? 'text-white' : 'bg-white text-[#3563E9]'
              }`}
              style={logoColor ? { backgroundColor: logoColor } : undefined}
            >
              {logo}
              {company?.logoUrl && (
                <img
                  src={company.logoUrl}
                  alt={`${companyName} logo`}
                  className="absolute inset-0 h-full w-full rounded-2xl bg-white object-contain"
                  onError={(event) => { event.currentTarget.style.display = 'none'; }}
                />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-[#777B90]">{companyName}</p>
              <h1 className="mt-0.5 text-xl font-extrabold tracking-tight text-[#20243A] sm:text-2xl">
                {jobRole}
              </h1>
              <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-xs font-medium text-[#777B90]">
                <span className="inline-flex items-center gap-1.5">
                  <Briefcase className="h-3.5 w-3.5" />
                  {getText(application.job?.ctcText) ||
                    (application.job?.ctcValue != null
                      ? String(application.job.ctcValue)
                      : 'Package not disclosed')}
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <MapPin className="h-3.5 w-3.5" />
                  {getText(application.job?.location, 'Location unavailable')}
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <CalendarDays className="h-3.5 w-3.5" />
                  Applied {formatDate(application.appliedOn) || 'date unavailable'}
                </span>
                {application.id != null && (
                  <span className="inline-flex items-center gap-1.5">
                    <Circle className="h-3 w-3" />
                    Application #{application.id}
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className="mt-5 rounded-2xl bg-white/80 p-4">
            <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#777B90]">
              Current stage
            </p>
            <p className="mt-1 text-base font-extrabold text-[#20243A]">
              {getText(application.currentStage, STAGES[currentIndex]?.label || 'Stage unavailable')}
            </p>
            {application.status === 'SELECTED' && (
              <p className="mt-1 text-sm font-semibold text-emerald-700">Congratulations — selected</p>
            )}
            {application.status === 'REJECTED' && (
              <p className="mt-1 text-sm font-semibold text-rose-700">Final decision: not selected</p>
            )}
            {application.status === 'WITHDRAWN' && (
              <p className="mt-1 text-sm font-semibold text-slate-600">This application was withdrawn</p>
            )}
          </div>
        </div>

        <div className="p-5 sm:p-7">
          <div className="mb-6 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-extrabold text-[#20243A]">Application timeline</h2>
              <p className="mt-1 text-sm text-[#777B90]">Updates shared by your placement cell.</p>
            </div>
            {canWithdraw(application.status) && (
              <button
                type="button"
                onClick={() => setWithdrawOpen(true)}
                className="inline-flex min-h-10 shrink-0 items-center gap-1.5 rounded-xl border border-rose-200 px-3 text-xs font-bold text-rose-700 transition hover:bg-rose-50 sm:px-4 sm:text-sm"
              >
                <Undo2 className="h-4 w-4" />
                Withdraw
              </button>
            )}
          </div>

          <div className="space-y-0">
            {STAGES.map((stage, index) => {
              const event = eventForStage(timeline, index);
              const stageStatus = event?.status;
              const failed = stageStatus === 'FAILED';
              const completed = stageStatus === 'DONE' || (application.status === 'SELECTED' && index <= 4) ||
                (application.status !== 'REJECTED' && application.status !== 'WITHDRAWN' && index < currentIndex);
              const current = !completed && !failed && index === currentIndex;
              const skipped = stageStatus === 'SKIPPED';
              const markerClass = failed
                ? 'border-rose-500 bg-rose-50 text-rose-600'
                : completed
                  ? 'border-emerald-500 bg-emerald-500 text-white'
                  : current
                    ? 'border-[#3563E9] bg-[#EEF1FF] text-[#3563E9] ring-4 ring-[#E5E9FF]'
                    : skipped
                      ? 'border-slate-200 bg-slate-100 text-slate-400'
                      : 'border-slate-200 bg-white text-slate-400';
              const date = formatDate(event?.stageDate || event?.createdAt);

              return (
                <div className="flex gap-4" key={stage.key}>
                  <div className="flex w-8 shrink-0 flex-col items-center">
                    <span className={`z-10 flex h-8 w-8 items-center justify-center rounded-full border-2 ${markerClass}`}>
                      {completed ? <Check className="h-4 w-4" /> : <Clock3 className="h-4 w-4" />}
                    </span>
                    {index < STAGES.length - 1 && (
                      <span className={`my-1 min-h-10 w-0.5 flex-1 ${completed ? 'bg-emerald-300' : 'bg-slate-200'}`} />
                    )}
                  </div>
                  <div className="min-w-0 flex-1 pb-7">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className={`text-sm font-bold ${current ? 'text-[#3563E9]' : skipped ? 'text-slate-400' : 'text-[#20243A]'}`}>
                        {stage.label}
                      </h3>
                      {current && (
                        <span className="rounded-full bg-[#EEF1FF] px-2.5 py-1 text-[10px] font-bold text-[#3563E9]">
                          Current
                        </span>
                      )}
                      {failed && (
                        <span className="rounded-full bg-rose-50 px-2.5 py-1 text-[10px] font-bold text-rose-700">
                          Not cleared
                        </span>
                      )}
                    </div>
                    {date && <p className="mt-1 text-xs text-[#777B90]">{date}</p>}
                    {event?.remarks && (
                      <p className="mt-2 text-sm leading-relaxed text-[#60657B]">{event.remarks}</p>
                    )}
                    {!event && current && application.remarks && (
                      <p className="mt-2 text-sm leading-relaxed text-[#60657B]">{application.remarks}</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {timeline.length === 0 && (
            <p className="mt-1 text-xs text-[#777B90]">
              Dates and notes will appear here when the placement cell shares updates.
            </p>
          )}

          <div className="mt-2 rounded-2xl bg-[#F8F9FC] p-4">
            <p className="mb-3 text-xs font-bold uppercase tracking-[0.12em] text-[#777B90]">Progress overview</p>
            <ApplicationProgress status={application.status} />
          </div>
        </div>
      </section>

      <ConfirmDialog
        open={withdrawOpen}
        title="Withdraw application?"
        message={<>Withdraw your application for <strong>{jobRole}</strong> at <strong>{companyName}</strong>? This cannot be undone.</>}
        confirmLabel="Withdraw"
        busy={withdrawing}
        onConfirm={confirmWithdraw}
        onCancel={() => setWithdrawOpen(false)}
      />
    </main>
  );
}
