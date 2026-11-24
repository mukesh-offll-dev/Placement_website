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

  return (
    <ol className="flex items-center w-full" aria-label="Application progress">
      {APPLICATION_PIPELINE.map((step, index) => {
        const done = index < reached || (selected && index === reached);
        const current = index === reached && !selected;
        const isLast = index === APPLICATION_PIPELINE.length - 1;

        let dot = 'bg-white border-2 border-gray-200 text-gray-400';
        if (done) dot = selected ? 'bg-emerald-600 text-white' : 'bg-blue-600 text-white';
        if (current) dot = 'bg-blue-600 text-white ring-4 ring-blue-100';

        return (
          <li key={step} className={`flex items-center ${isLast ? '' : 'flex-1'}`} aria-current={current ? 'step' : undefined}>
            <div className="flex flex-col items-center gap-1 min-w-[3.25rem]">
              <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${dot}`}>
                {done ? <Check className="w-3.5 h-3.5" /> : index + 1}
              </span>
              <span className={`text-[10px] sm:text-[11px] font-medium whitespace-nowrap ${done || current ? 'text-gray-800' : 'text-gray-400'}`}>
                {PIPELINE_LABELS[step]}
              </span>
            </div>
            {!isLast && (
              <span className={`flex-1 h-0.5 -mt-4 mx-1 rounded ${index < reached ? (selected ? 'bg-emerald-600' : 'bg-blue-600') : 'bg-gray-200'}`} />
            )}
          </li>
        );
      })}
    </ol>
  );
}
