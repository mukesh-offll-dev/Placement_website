import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { AlertCircle, CheckCircle2, Circle, Eye, EyeOff, KeyRound, Loader2 } from 'lucide-react';
import AuthShell from '../components/AuthShell';
import { resetPassword } from '../services/authService.js';
import {
  getResetToken,
  loginPathAfterReset,
  resetPasswordChecks,
  validateResetForm,
} from '../utils/passwordReset';
import { toastSuccess } from '../utils/toast';

const EMPTY = { newPassword: '', confirmPassword: '' };

/**
 * /reset-password?token=...: the page the emailed link opens. Sets a new password; it does not sign
 * anyone in, it sends them to their sign-in page afterwards. An unusable link (missing, used,
 * expired) says so and offers a new one.
 */
export default function ResetPasswordPage() {
  const { search } = useLocation();
  const token = getResetToken(search);

  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [apiError, setApiError] = useState('');
  const [linkBroken, setLinkBroken] = useState(!token);
  const [show, setShow] = useState(false);
  const [saving, setSaving] = useState(false);
  const [doneRole, setDoneRole] = useState(undefined); // undefined = not done; null/role = done

  const checks = resetPasswordChecks(form.newPassword);
  const done = doneRole !== undefined;

  const onChange = (field) => (e) => {
    setForm((f) => ({ ...f, [field]: e.target.value }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: '' }));
    if (apiError) setApiError('');
  };

  const submit = async (e) => {
    e.preventDefault();
    if (saving) return;
    const found = validateResetForm(form);
    setErrors(found);
    if (Object.keys(found).length > 0) return;

    setSaving(true);
    try {
      const result = await resetPassword({ token, newPassword: form.newPassword });
      toastSuccess('Password updated.');
      setDoneRole(result.role);
    } catch (err) {
      const message = err?.message || 'Could not reset your password. Please try again.';
      setApiError(message);
      // The server answers 400 for a dead link and for a refused password alike; only the former
      // contains "reset link".
      if (/reset link/i.test(message)) setLinkBroken(true);
    } finally {
      setSaving(false);
    }
  };

  const inputClass = (field) =>
    `w-full px-3 py-2.5 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-60 ${
      errors[field] ? 'border-red-400' : 'border-gray-300'
    }`;

  return (
    <AuthShell current="institution" hideSwitcher>
      <div className="w-full max-w-md">
        <div className="flex justify-center mb-5">
          <div className="bg-blue-100 p-4 rounded-full">
            <KeyRound className="w-10 h-10 text-blue-700" />
          </div>
        </div>

        {done ? (
          <div className="bg-white p-6 rounded-xl shadow text-center space-y-4" role="status">
            <CheckCircle2 className="w-12 h-12 text-green-600 mx-auto" aria-hidden="true" />
            <h1 className="text-2xl font-bold text-gray-900">Password updated</h1>
            <p className="text-sm text-gray-600">Sign in with your new password. Any older sessions have been signed out.</p>
            <Link
              to={loginPathAfterReset(doneRole)}
              className="block w-full bg-blue-600 text-white py-2.5 rounded-lg hover:bg-blue-700 transition-colors font-semibold text-sm"
            >
              Go to sign in
            </Link>
          </div>
        ) : linkBroken ? (
          <div className="bg-white p-6 rounded-xl shadow text-center space-y-4" role="alert">
            <AlertCircle className="w-12 h-12 text-amber-500 mx-auto" aria-hidden="true" />
            <h1 className="text-2xl font-bold text-gray-900">This link cannot be used</h1>
            <p className="text-sm text-gray-600">
              {token
                ? 'It may have expired, or it has already been used. Reset links work once and last 30 minutes.'
                : 'The reset link is incomplete. Open the link from your email again, or request a new one.'}
            </p>
            <Link
              to="/forgot-password"
              className="block w-full bg-blue-600 text-white py-2.5 rounded-lg hover:bg-blue-700 transition-colors font-semibold text-sm"
            >
              Request a new link
            </Link>
          </div>
        ) : (
          <>
            <h1 className="text-2xl font-bold text-gray-900 text-center mb-1">Set a new password</h1>
            <p className="text-gray-500 text-center text-sm mb-6">Choose a password you have not used here before.</p>

            {apiError && (
              <div
                className="flex items-start gap-2 bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg mb-4"
                role="alert"
              >
                <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                <span>{apiError}</span>
              </div>
            )}

            <form onSubmit={submit} noValidate className="bg-white p-6 rounded-xl shadow space-y-4">
              <div>
                <label htmlFor="reset-new-password" className="block text-sm font-medium text-gray-700 mb-1">
                  New password
                </label>
                <div className="relative">
                  <input
                    id="reset-new-password"
                    type={show ? 'text' : 'password'}
                    autoComplete="new-password"
                    value={form.newPassword}
                    onChange={onChange('newPassword')}
                    disabled={saving}
                    className={`${inputClass('newPassword')} pr-10`}
                  />
                  <button
                    type="button"
                    onClick={() => setShow((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500"
                    aria-label={show ? 'Hide passwords' : 'Show passwords'}
                  >
                    {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {errors.newPassword && <p className="text-red-500 text-xs mt-1">{errors.newPassword}</p>}
                <ul className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-1">
                  {checks.map((c) => (
                    <li key={c.id} className={`flex items-center gap-1.5 text-xs ${c.ok ? 'text-green-700' : 'text-gray-500'}`}>
                      {c.ok ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Circle className="w-3.5 h-3.5" />}
                      {c.label}
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <label htmlFor="reset-confirm-password" className="block text-sm font-medium text-gray-700 mb-1">
                  Confirm new password
                </label>
                <input
                  id="reset-confirm-password"
                  type={show ? 'text' : 'password'}
                  autoComplete="new-password"
                  value={form.confirmPassword}
                  onChange={onChange('confirmPassword')}
                  disabled={saving}
                  className={inputClass('confirmPassword')}
                />
                {errors.confirmPassword && <p className="text-red-500 text-xs mt-1">{errors.confirmPassword}</p>}
              </div>

              <button
                type="submit"
                disabled={saving}
                aria-busy={saving}
                className="w-full bg-blue-600 text-white py-2.5 rounded-lg hover:bg-blue-700 transition-colors font-semibold text-sm flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                {saving ? 'Saving…' : 'Save new password'}
              </button>
            </form>
          </>
        )}
      </div>
    </AuthShell>
  );
}
