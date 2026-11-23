import { useEffect, useState } from 'react';
import { AlertCircle, CheckCircle2, Circle, Eye, EyeOff, KeyRound, Loader2, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { changePassword } from '../services/authService.js';
import { passwordChecks, validateChangePasswordForm } from '../utils/studentValidation';
import { toastError, toastSuccess } from '../utils/toast';

const EMPTY = { currentPassword: '', newPassword: '', confirmPassword: '' };

/**
 * Lets a signed-in student replace their password. The server returns a fresh token, which is
 * stored by authService.changePassword and adopted by the auth context, exactly as first-login
 * setup does.
 *
 * @param {{ open: boolean, onClose: () => void, registerNumber?: string }} props
 */
export default function ChangePasswordModal({ open, onClose, registerNumber = '' }) {
  const { applyAuthData } = useAuth();
  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [apiError, setApiError] = useState('');
  const [saving, setSaving] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => e.key === 'Escape' && !saving && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, saving, onClose]);

  if (!open) return null;

  const checks = passwordChecks(form.newPassword, registerNumber);

  const handleChange = (field) => (e) => {
    setForm((f) => ({ ...f, [field]: e.target.value }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: '' }));
    if (apiError) setApiError('');
  };

  const close = () => {
    if (saving) return;
    setForm(EMPTY);
    setErrors({});
    setApiError('');
    onClose();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (saving) return;

    const found = validateChangePasswordForm(form, registerNumber);
    setErrors(found);
    if (Object.keys(found).length > 0) return;

    setSaving(true);
    setApiError('');
    try {
      const authData = await changePassword({
        currentPassword: form.currentPassword,
        newPassword: form.newPassword,
      });
      applyAuthData(authData);
      toastSuccess('Password changed successfully.');
      setForm(EMPTY);
      onClose();
    } catch (err) {
      const message = err?.message || 'Could not change your password. Please try again.';
      setApiError(message);
      toastError(err, 'Could not change your password. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const inputClass = (field) =>
    `w-full px-3 py-2 border rounded-xl text-sm focus:outline-none focus:ring-2 ${
      errors[field] ? 'border-red-400 focus:ring-red-400' : 'border-gray-300 focus:ring-blue-500'
    }`;

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto" role="dialog" aria-modal="true" aria-label="Change password">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 my-8 border border-gray-100">
        <div className="flex items-center justify-between pb-4 border-b border-gray-100 mb-4">
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <KeyRound className="w-5 h-5 text-blue-600" /> Change Password
          </h2>
          <button type="button" onClick={close} disabled={saving} className="text-gray-400 hover:text-gray-600 p-1" aria-label="Close">
            <X className="w-5 h-5" />
          </button>
        </div>

        {apiError && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-center gap-2" role="alert">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{apiError}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate className="space-y-4">
          <div>
            <label htmlFor="cp-current" className="block text-xs font-semibold text-gray-700 mb-1">
              Current password <span className="text-red-500">*</span>
            </label>
            <input
              id="cp-current"
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              value={form.currentPassword}
              onChange={handleChange('currentPassword')}
              className={inputClass('currentPassword')}
            />
            {errors.currentPassword && <p className="text-red-500 text-xs mt-1">{errors.currentPassword}</p>}
          </div>

          <div>
            <label htmlFor="cp-new" className="block text-xs font-semibold text-gray-700 mb-1">
              New password <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <input
                id="cp-new"
                type={showPassword ? 'text' : 'password'}
                autoComplete="new-password"
                value={form.newPassword}
                onChange={handleChange('newPassword')}
                className={`${inputClass('newPassword')} pr-10`}
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                aria-label={showPassword ? 'Hide passwords' : 'Show passwords'}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {errors.newPassword && <p className="text-red-500 text-xs mt-1">{errors.newPassword}</p>}
            <ul className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-1">
              {checks.map((c) => (
                <li key={c.id} className={`flex items-center gap-1.5 text-xs ${c.ok ? 'text-green-600' : 'text-gray-400'}`}>
                  {c.ok ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Circle className="w-3.5 h-3.5" />}
                  {c.label}
                </li>
              ))}
            </ul>
          </div>

          <div>
            <label htmlFor="cp-confirm" className="block text-xs font-semibold text-gray-700 mb-1">
              Confirm new password <span className="text-red-500">*</span>
            </label>
            <input
              id="cp-confirm"
              type={showPassword ? 'text' : 'password'}
              autoComplete="new-password"
              value={form.confirmPassword}
              onChange={handleChange('confirmPassword')}
              className={inputClass('confirmPassword')}
            />
            {errors.confirmPassword && <p className="text-red-500 text-xs mt-1">{errors.confirmPassword}</p>}
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
            <button
              type="button"
              onClick={close}
              disabled={saving}
              className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-xl transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition flex items-center gap-2 disabled:opacity-50"
            >
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              Change Password
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
