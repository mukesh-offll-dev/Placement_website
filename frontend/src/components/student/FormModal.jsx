import { useEffect, useId } from 'react';
import { AlertCircle, Loader2, X } from 'lucide-react';

/**
 * Modal dialog with a form, in the profile page's visual style. Escape and the backdrop
 * close it unless `busy`.
 */
export default function FormModal({
  open,
  title,
  icon: Icon,
  iconClass = 'text-blue-600',
  onClose,
  onSubmit,
  submitLabel = 'Save',
  busy = false,
  error,
  size = 'max-w-lg',
  submitDisabled = false,
  children,
}) {
  const titleId = useId();

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => e.key === 'Escape' && !busy && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, busy, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-start sm:items-center justify-center p-3 sm:p-4 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && !busy) onClose();
      }}
    >
      <div className={`bg-white rounded-2xl shadow-2xl ${size} w-full p-5 sm:p-6 my-6 border border-gray-100`}>
        <div className="flex items-center justify-between pb-4 border-b border-gray-100 mb-4 gap-3">
          <h2 id={titleId} className="text-lg sm:text-xl font-bold text-gray-900 flex items-center gap-2">
            {Icon && <Icon className={`w-5 h-5 ${iconClass}`} aria-hidden="true" />}
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="text-gray-400 hover:text-gray-600 p-1 rounded-lg disabled:opacity-40"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-start gap-2" role="alert">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <form
          noValidate
          onSubmit={(e) => {
            e.preventDefault();
            if (!busy) onSubmit();
          }}
          className="space-y-4"
        >
          {children}
          <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 sm:gap-3 pt-4 border-t border-gray-100">
            <button
              type="button"
              onClick={onClose}
              disabled={busy}
              className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-xl transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={busy || submitDisabled}
              className="px-5 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {busy && <Loader2 className="w-4 h-4 animate-spin" />}
              {submitLabel}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
