import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertCircle, CheckCircle2, Circle, Eye, EyeOff, KeyRound, Loader2, LogOut } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import BrandLogo from '../components/BrandLogo';
import { changeStaffPassword } from '../services/authService.js';
import { passwordChecks, validateChangePasswordForm } from '../utils/studentValidation';
import { homePathForRole, loginPathForRole, roleLabel } from '../utils/roles';
import { toastError, toastSuccess } from '../utils/toast';

const EMPTY = { currentPassword: '', newPassword: '', confirmPassword: '' };

/**
 * Change-password page for admins, placement officers and faculty advisors. Mandatory while the
 * account still has a temporary password (the route guard keeps them here), optional otherwise.
 * POST /auth/change-password returns a fresh token, adopted through applyAuthData like setup does.
 */
export default function StaffChangePasswordPage() {
  const navigate = useNavigate();
  const { user, role, applyAuthData, logout } = useAuth();
  const forced = Boolean(user?.passwordChangeRequired);
  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [apiError, setApiError] = useState('');
  const [saving, setSaving] = useState(false);
  const [show, setShow] = useState(false);

  // Staff have no register number: drop that rule from the checklist.
  const checks = passwordChecks(form.newPassword).filter((c) => c.id !== 'different');

  const onChange = (field) => (e) => {
    setForm((f) => ({ ...f, [field]: e.target.value }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: '' }));
    if (apiError) setApiError('');
  };

  const submit = async (e) => {
    e.preventDefault();
    if (saving) return;
    const found = validateChangePasswordForm(form);
    setErrors(found);
    if (Object.keys(found).length > 0) return;

    setSaving(true);
    try {
      const authData = await changeStaffPassword({
        currentPassword: form.currentPassword,
        newPassword: form.newPassword,
      });
      applyAuthData({ ...authData, passwordChangeRequired: false });
      toastSuccess('Password changed.');
      navigate(homePathForRole(authData?.role || role), { replace: true });
    } catch (err) {
      const message = err?.message || 'Could not change your password.';
      setApiError(message);
      toastError(err, message);
    } finally {
      setSaving(false);
    }
  };

  const signOut = () => {
    const target = loginPathForRole(role);
    logout();
    navigate(target, { replace: true });
  };

  const inputClass = (field) =>
    `w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-60 ${
      errors[field] ? 'border-red-400' : 'border-gray-300'
    }`;

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      <header className="flex justify-between items-center px-4 sm:px-6 py-4 bg-white shadow">
        <div className="flex items-center gap-3">
          <BrandLogo className="h-10" />
          <div>
            <h1 className="font-bold text-base leading-none">GCE Srirangam</h1>
            <p className="text-xs text-gray-500">{roleLabel(role)} portal</p>
          </div>
        </div>
        <button
          type="button"
          onClick={signOut}
          className="inline-flex items-center gap-1.5 text-sm text-gray-600 hover:text-red-600 px-3 py-2 rounded-lg hover:bg-red-50"
        >
          <LogOut className="w-4 h-4" /> Sign out
        </button>
      </header>

      <main className="flex-1 flex items-center justify-center px-4 py-10">
        <div className="w-full max-w-md">
          <div className="flex justify-center mb-3">
            <div className="w-12 h-12 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center">
              <KeyRound className="w-6 h-6" />
            </div>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 text-center mb-1">
            {forced ? 'Set a new password' : 'Change password'}
          </h2>
          <p className="text-gray-500 text-center text-sm mb-6">
            {forced
              ? 'You signed in with a temporary password. Choose your own password to continue.'
              : `Signed in as ${user?.email || ''}`}
          </p>

          {apiError && (
            <div className="flex items-start gap-2 bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg mb-4" role="alert">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              <span>{apiError}</span>
            </div>
          )}

          <form onSubmit={submit} noValidate className="bg-white p-6 rounded-xl shadow space-y-4">
            <div>
              <label htmlFor="current-password" className="block text-sm font-medium text-gray-700 mb-1">
                {forced ? 'Temporary password' : 'Current password'}
              </label>
              <input
                id="current-password"
                type={show ? 'text' : 'password'}
                autoComplete="current-password"
                value={form.currentPassword}
                onChange={onChange('currentPassword')}
                disabled={saving}
                className={inputClass('currentPassword')}
              />
              {errors.currentPassword && <p className="text-red-500 text-xs mt-1">{errors.currentPassword}</p>}
            </div>

            <div>
              <label htmlFor="new-password" className="block text-sm font-medium text-gray-700 mb-1">New password</label>
              <div className="relative">
                <input
                  id="new-password"
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
              <label htmlFor="confirm-password" className="block text-sm font-medium text-gray-700 mb-1">Confirm new password</label>
              <input
                id="confirm-password"
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
              className="w-full bg-blue-600 text-white py-2.5 rounded-lg hover:bg-blue-700 transition-colors font-semibold text-sm flex items-center justify-center gap-2 disabled:opacity-60"
            >
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              {saving ? 'Saving…' : 'Save new password'}
            </button>
            {!forced && (
              <button
                type="button"
                onClick={() => navigate(homePathForRole(role))}
                className="w-full text-sm text-gray-600 hover:text-gray-900"
              >
                Cancel
              </button>
            )}
          </form>
        </div>
      </main>
    </div>
  );
}
