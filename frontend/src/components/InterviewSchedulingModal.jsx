import { useState } from 'react';
import { Calendar, Clock, Video, MapPin, User, FileText, X, Loader2, AlertCircle } from 'lucide-react';
import { validateInterviewSchedule, toLocalIsoDate } from '../utils/jobFilterUtils';

const INITIAL_FORM = {
  date: '',
  time: '',
  mode: 'Online',
  round: 'Technical',
  meetingLink: '',
  venue: '',
  interviewer: '',
  instructions: '',
};

/**
 * Modal shown when an officer moves an application to INTERVIEW, capturing
 * date, time, mode/venue/link, round, and optional remarks for the student.
 */
export default function InterviewSchedulingModal({
  isOpen,
  application,
  busy = false,
  submitError = '',
  onClose,
  onConfirm,
}) {
  const [form, setForm] = useState(INITIAL_FORM);
  const [errors, setErrors] = useState({});

  if (!isOpen || !application) return null;

  const studentName = application.student?.fullName || application.studentName || 'Student';
  const registerNo = application.student?.rollNo || application.registerNumber || '—';
  const companyName = application.job?.company?.name || application.companyName || 'Company';
  const jobRole = application.job?.jobRole || application.jobRole || 'Role';

  const updateField = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (errors[key]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const validationErrors = validateInterviewSchedule(form);
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }
    onConfirm?.(form);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
      aria-labelledby="schedule-interview-title"
    >
      <div className="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] flex flex-col shadow-2xl border border-gray-100 overflow-hidden">
        <div className="p-5 border-b border-purple-100 bg-purple-50/70 flex items-start gap-3.5">
          <div className="p-2 rounded-xl bg-purple-100 text-purple-700 shrink-0">
            <Calendar className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 id="schedule-interview-title" className="font-bold text-base text-gray-900">
              Schedule Interview
            </h3>
            <p className="text-xs text-gray-600 mt-0.5 truncate">
              {studentName} ({registerNo}) · {companyName} — {jobRole}
            </p>
          </div>
          <button
            type="button"
            onClick={() => !busy && onClose?.()}
            disabled={busy}
            className="text-gray-400 hover:text-gray-600 p-1 rounded-lg disabled:opacity-50"
            aria-label="Close schedule interview modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 space-y-4" noValidate>
          {submitError && (
            <div role="alert" className="flex items-start gap-2 text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-xl px-3 py-2.5">
              <AlertCircle className="w-4 h-4 mt-px shrink-0" />
              <span>{submitError}</span>
            </div>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label htmlFor="interview-date" className="block text-xs font-semibold text-gray-700 mb-1">
                Interview Date <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <Calendar className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  id="interview-date"
                  type="date"
                  min={toLocalIsoDate()}
                  value={form.date}
                  onChange={(e) => updateField('date', e.target.value)}
                  className="w-full text-xs pl-9 pr-3 py-2.5 bg-gray-50 focus:bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-600 focus:outline-none"
                />
              </div>
              {errors.date && <p className="text-[11px] text-rose-600 mt-1">{errors.date}</p>}
            </div>

            <div>
              <label htmlFor="interview-time" className="block text-xs font-semibold text-gray-700 mb-1">
                Interview Time <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <Clock className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  id="interview-time"
                  type="time"
                  value={form.time}
                  onChange={(e) => updateField('time', e.target.value)}
                  className="w-full text-xs pl-9 pr-3 py-2.5 bg-gray-50 focus:bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-600 focus:outline-none"
                />
              </div>
              {errors.time && <p className="text-[11px] text-rose-600 mt-1">{errors.time}</p>}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label htmlFor="interview-mode" className="block text-xs font-semibold text-gray-700 mb-1">
                Mode <span className="text-rose-500">*</span>
              </label>
              <select
                id="interview-mode"
                value={form.mode}
                onChange={(e) => updateField('mode', e.target.value)}
                className="w-full text-xs px-3 py-2.5 bg-gray-50 focus:bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-600 focus:outline-none"
              >
                <option value="Online">Online</option>
                <option value="Offline">Offline</option>
              </select>
            </div>

            <div>
              <label htmlFor="interview-round" className="block text-xs font-semibold text-gray-700 mb-1">
                Interview Round <span className="text-rose-500">*</span>
              </label>
              <select
                id="interview-round"
                value={form.round}
                onChange={(e) => updateField('round', e.target.value)}
                className="w-full text-xs px-3 py-2.5 bg-gray-50 focus:bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-600 focus:outline-none"
              >
                <option value="Technical">Technical</option>
                <option value="HR">HR</option>
                <option value="Final">Final</option>
                <option value="Other">Other</option>
              </select>
              {errors.round && <p className="text-[11px] text-rose-600 mt-1">{errors.round}</p>}
            </div>
          </div>

          {form.mode === 'Online' ? (
            <div>
              <label htmlFor="interview-link" className="block text-xs font-semibold text-gray-700 mb-1">
                Meeting Link <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <Video className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  id="interview-link"
                  type="url"
                  placeholder="https://meet.google.com/..."
                  value={form.meetingLink}
                  onChange={(e) => updateField('meetingLink', e.target.value)}
                  className="w-full text-xs pl-9 pr-3 py-2.5 bg-gray-50 focus:bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-600 focus:outline-none"
                />
              </div>
              {errors.meetingLink && (
                <p className="text-[11px] text-rose-600 mt-1">{errors.meetingLink}</p>
              )}
            </div>
          ) : (
            <div>
              <label htmlFor="interview-venue" className="block text-xs font-semibold text-gray-700 mb-1">
                Venue <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <MapPin className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  id="interview-venue"
                  type="text"
                  placeholder="e.g. Placement Seminar Hall, Main Block"
                  value={form.venue}
                  onChange={(e) => updateField('venue', e.target.value)}
                  className="w-full text-xs pl-9 pr-3 py-2.5 bg-gray-50 focus:bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-600 focus:outline-none"
                />
              </div>
              {errors.venue && <p className="text-[11px] text-rose-600 mt-1">{errors.venue}</p>}
            </div>
          )}

          <div>
            <label htmlFor="interview-interviewer" className="block text-xs font-semibold text-gray-700 mb-1">
              Interviewer Name (optional)
            </label>
            <div className="relative">
              <User className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                id="interview-interviewer"
                type="text"
                placeholder="e.g. Panel A / HR Lead"
                value={form.interviewer}
                onChange={(e) => updateField('interviewer', e.target.value)}
                className="w-full text-xs pl-9 pr-3 py-2.5 bg-gray-50 focus:bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-600 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label htmlFor="interview-instructions" className="block text-xs font-semibold text-gray-700 mb-1">
              Remarks / Instructions (optional)
            </label>
            <div className="relative">
              <FileText className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-3 pointer-events-none" />
              <textarea
                id="interview-instructions"
                rows={2}
                maxLength={180}
                placeholder="Shared with the student on their timeline and notification."
                value={form.instructions}
                onChange={(e) => updateField('instructions', e.target.value)}
                className="w-full text-xs pl-9 pr-3 py-2.5 bg-gray-50 focus:bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-600 focus:outline-none"
              />
            </div>
          </div>

          <div className="pt-2 border-t border-gray-100 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={() => onClose?.()}
              disabled={busy}
              className="px-4 py-2 text-xs font-semibold text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-xl transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={busy}
              className="px-4 py-2 text-xs font-bold text-white bg-purple-600 hover:bg-purple-700 rounded-xl shadow-xs transition-colors inline-flex items-center gap-1.5 disabled:opacity-60"
            >
              {busy && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              <span>Confirm Interview</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
