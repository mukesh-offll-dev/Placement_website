import { AlertCircle, MessageSquareWarning } from 'lucide-react';

/** Small "Changed" pill marking a section that differs from the verified profile. */
export function ChangedBadge({ className = '' }) {
  return (
    <span
      className={`inline-flex items-center text-[10px] font-bold uppercase tracking-wide text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full ${className}`}
      title="Differs from your verified profile"
    >
      Changed
    </span>
  );
}

/** Reviewer's comment for one section (shown after a rejection). */
export function ReviewerComment({ comment }) {
  if (!comment) return null;
  return (
    <div className="mb-4 flex items-start gap-2 p-3 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs" role="note">
      <MessageSquareWarning className="w-4 h-4 shrink-0 mt-0.5 text-red-600" aria-hidden="true" />
      <div>
        <p className="font-semibold">Reviewer comment</p>
        <p className="mt-0.5 whitespace-pre-line">{comment}</p>
      </div>
    </div>
  );
}

/**
 * Card for one profile section: title, optional "Changed" badge, reviewer comment,
 * validation messages and an action slot (e.g. an "Add" button).
 */
export default function SectionCard({
  id,
  icon: Icon,
  iconClass = 'text-blue-600',
  title,
  subtitle,
  changed = false,
  comment,
  errors,
  action,
  children,
  className = '',
}) {
  return (
    <section id={id} className={`bg-white p-4 sm:p-6 rounded-2xl shadow-sm border border-gray-100 scroll-mt-24 ${className}`} aria-labelledby={id ? `${id}-title` : undefined}>
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-4">
        <div className="min-w-0">
          <h3 id={id ? `${id}-title` : undefined} className="font-semibold text-lg text-gray-900 flex flex-wrap items-center gap-2">
            {Icon && <Icon className={`w-5 h-5 ${iconClass}`} aria-hidden="true" />}
            {title}
            {changed && <ChangedBadge />}
          </h3>
          {subtitle && <p className="text-gray-500 text-xs mt-0.5">{subtitle}</p>}
        </div>
        {action && <div className="flex flex-wrap items-center gap-2 shrink-0">{action}</div>}
      </div>
      <ReviewerComment comment={comment} />
      {Array.isArray(errors) && errors.length > 0 && (
        <ul className="mb-4 p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs space-y-1" role="alert">
          {errors.map((msg) => (
            <li key={msg} className="flex items-start gap-1.5">
              <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" aria-hidden="true" />
              {msg}
            </li>
          ))}
        </ul>
      )}
      {children}
    </section>
  );
}
