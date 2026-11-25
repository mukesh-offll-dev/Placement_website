import { Check, XCircle, Undo2 } from 'lucide-react';
import { APPLICATION_PIPELINE, PIPELINE_LABELS, pipelineIndex } from '../utils/placement';

/**
 * Compact step tracker: Applied → Review → Shortlisted → Interview → Selected.
 * Rejected / withdrawn applications get a one-line note instead (the stage they stopped at
 * is in the timeline, not the list response, so the tracker would only be guessing).
 */
export default function ApplicationProgress({ status, viewer = 'student' }) {
  if (status === 'REJECTED' || status === 'WITHDRAWN') {
    const rejected = status === 'REJECTED';
    const Icon = rejected ? XCircle : Undo2;
    const staff = viewer === 'staff';
    return (
      <p className={`flex items-center gap-1.5 text-xs font-medium ${rejected ? 'text-rose-600' : 'text-gray-500'}`}>
        <Icon className="w-3.5 h-3.5" />
        {rejected
          ? staff ? 'Not selected for this drive.' : 'Not selected for this drive. Open the timeline for details.'
          : staff ? 'The student withdrew this application.' : 'You withdrew this application.'}
      </p>
    );
  }

  const reached = Math.max(pipelineIndex(status), 0);
  const selected = status === 'SELECTED';
  const stepNum = reached + 1;

  return (
    <div className="w-full" aria-label="Application progress">
      {/* Compact 5-segment bar matching Page 2 */}
      <div className="grid grid-cols-5 gap-1" aria-hidden="true">
        {APPLICATION_PIPELINE.map((step, index) => {
          const filled = index < stepNum;
          return (
            <span
              key={step}
              className={`h-1.5 rounded-[3px] transition-colors ${
                filled ? (selected ? 'bg-[#047857]' : 'bg-[#1D4ED8]') : 'bg-[#E2E8F0]'
              }`}
            />
          );
        })}
      </div>

      {/* Step labels */}
      <ol className="flex items-center justify-between gap-1 mt-2 overflow-x-auto no-scrollbar">
        {APPLICATION_PIPELINE.map((step, index) => {
          const done = index < reached || (selected && index === reached);
          const current = index === reached && !selected;
          return (
            <li
              key={step}
              aria-current={current ? 'step' : undefined}
              className={`inline-flex items-center gap-1 text-[11px] whitespace-nowrap ${
                current
                  ? 'text-[#1D4ED8] font-bold'
                  : done
                  ? selected
                    ? 'text-[#047857] font-semibold'
                    : 'text-[#0F172A] font-semibold'
                  : 'text-[#94A3B8] font-medium'
              }`}
            >
              {done && <Check className="w-3 h-3 shrink-0" strokeWidth={2.4} />}
              <span>{PIPELINE_LABELS[step]}</span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
