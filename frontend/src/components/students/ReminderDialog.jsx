import { useEffect, useState } from 'react';
import { Bell, Loader2, Mail, X, AlertCircle } from 'lucide-react';
import { previewProfileReminders, sendProfileReminders } from '../../services/api/adminService';
import { toastError, toastSuccess } from '../../utils/toast';

/**
 * "Remind incomplete profiles": shows how many students a reminder would reach (and who, with what
 * is missing) before anything is sent. Each student gets an in-app notification and an email, and
 * nobody is reminded more than once a week.
 */
export default function ReminderDialog({ onClose }) {
  const [state, setState] = useState({ status: 'loading', data: null, message: '' });
  const [sending, setSending] = useState(false);

  useEffect(() => {
    let active = true;
    previewProfileReminders()
      .then((data) => active && setState({ status: 'ready', data, message: '' }))
      .catch((err) => active && setState({ status: 'error', data: null, message: err?.message || 'Could not load the reminder list.' }));
    return () => {
      active = false;
    };
  }, []);

  const count = state.data?.count ?? 0;

  const send = async () => {
    setSending(true);
    try {
      const result = await sendProfileReminders();
      const sent = typeof result === 'number' ? result : Number(result?.data ?? result ?? 0);
      toastSuccess(sent > 0 ? `${sent} student${sent === 1 ? '' : 's'} reminded to complete their profile.` : 'Nobody needed a reminder.');
      onClose();
    } catch (err) {
      toastError(err, err?.message || 'Could not send the reminders.');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50" role="dialog" aria-modal="true" aria-labelledby="reminder-title">
      <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        <div className="flex items-start justify-between gap-3 px-5 py-4 border-b border-gray-100">
          <div className="flex items-start gap-3">
            <span className="p-2 rounded-xl bg-blue-50 text-blue-600"><Bell className="w-5 h-5" /></span>
            <div>
              <h3 id="reminder-title" className="font-bold text-lg text-gray-900">Remind incomplete profiles</h3>
              <p className="text-xs text-gray-500 mt-0.5">Each student gets a notification and an email listing what is missing.</p>
            </div>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-5 py-4 overflow-y-auto">
          {state.status === 'loading' && (
            <p className="flex items-center gap-2 text-sm text-gray-500 py-6 justify-center" role="status">
              <Loader2 className="w-4 h-4 animate-spin" /> Counting students…
            </p>
          )}

          {state.status === 'error' && (
            <p role="alert" className="flex items-start gap-2 text-sm text-red-700 bg-red-50 border border-red-200 rounded-xl px-3 py-2.5">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" /> {state.message}
            </p>
          )}

          {state.status === 'ready' && (
            <>
              <div className="text-center bg-gray-50 rounded-xl py-4 mb-4">
                <p className="text-4xl font-bold text-gray-900">{count}</p>
                <p className="text-sm text-gray-500">
                  {count === 1 ? 'student will be reminded' : 'students will be reminded'}
                </p>
              </div>

              {count === 0 ? (
                <p className="text-sm text-gray-500 text-center">
                  Everyone with an incomplete profile was already reminded this week, or all profiles are complete.
                </p>
              ) : (
                <>
                  <ul className="divide-y divide-gray-100 border border-gray-200 rounded-xl">
                    {state.data.students.map((s) => (
                      <li key={s.registerNumber} className="px-3 py-2.5 text-sm">
                        <p className="font-medium text-gray-900">
                          {s.name || s.registerNumber}{' '}
                          <span className="text-xs font-normal text-gray-400">{s.registerNumber}</span>
                        </p>
                        <p className="text-xs text-gray-500">
                          {s.completionPercent}% complete · missing {s.missing.join(', ')}
                        </p>
                      </li>
                    ))}
                  </ul>
                  {count > state.data.students.length && (
                    <p className="text-xs text-gray-400 mt-2 text-center">
                      and {count - state.data.students.length} more
                    </p>
                  )}
                </>
              )}
            </>
          )}
        </div>

        <div className="px-5 py-3 border-t border-gray-100 flex justify-end gap-2 bg-gray-50/60">
          <button type="button" onClick={onClose} disabled={sending} className="px-4 py-2 rounded-lg text-sm border border-gray-300 hover:bg-white disabled:opacity-50">
            Cancel
          </button>
          <button
            type="button"
            onClick={send}
            disabled={sending || state.status !== 'ready' || count === 0}
            className="inline-flex items-center gap-1.5 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />}
            {count > 0 ? `Send to ${count} student${count === 1 ? '' : 's'}` : 'Send reminders'}
          </button>
        </div>
      </div>
    </div>
  );
}
