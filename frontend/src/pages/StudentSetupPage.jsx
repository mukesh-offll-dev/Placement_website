import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff, AlertCircle, CheckCircle2, Circle, LogOut } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { completeFirstLogin } from '../services/authService.js';
import LoadingSpinner from '../components/LoadingSpinner';
import BrandLogo from '../components/BrandLogo';
import { toastSuccess, toastError, toastInfo } from '../utils/toast';
import { passwordChecks, validateSetupForm } from '../utils/studentValidation';

/** Until the student sets their name, their profile name is the register number the admin created it with. */
const looksLikeRegisterNumber = (name) => /^[A-Z0-9][A-Z0-9/_-]{4,19}$/.test(String(name ?? ''));

/**
 * First-login setup. A student the placement cell created arrives here with their register number
 * as the password, and cannot reach anything else until they set a new password and give their
 * name, email and phone. The backend enforces this too; this page is the way through.
 */
export default function StudentSetupPage() {
  const navigate = useNavigate();
  const { user, applyAuthData, logout } = useAuth();

  const registerNumber = looksLikeRegisterNumber(user?.fullName) ? user.fullName : '';
  const [form, setForm] = useState({
    fullName: registerNumber ? '' : user?.fullName || '',
    email: user?.email || '',
    phone: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [errors, setErrors] = useState({});
  const [apiError, setApiError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [saving, setSaving] = useState(false);

  const checks = passwordChecks(form.newPassword, registerNumber);

  const handleChange = (field) => (e) => {
    setForm((f) => ({ ...f, [field]: e.target.value }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: '' }));
    if (apiError) setApiError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (saving) return;
    setApiError('');

    const found = validateSetupForm(form, registerNumber);
    setErrors(found);
    if (Object.keys(found).length > 0) return;

    setSaving(true);
    try {
      const authData = await completeFirstLogin({
        newPassword: form.newPassword,
        fullName: form.fullName.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
      });
      applyAuthData(authData);
      toastSuccess('You are all set! You can finish the rest of your profile any time.');
      navigate('/student/dashboard', { replace: true });
    } catch (err) {
      const message = err.message || 'Could not save your details. Please try again.';
      setApiError(message);
      toastError(err, 'Could not save your details. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = () => {
    logout();
    toastInfo('You have been signed out.');
    navigate('/student/login', { replace: true });
  };

  const inputClass = (field) =>
    `w-full px-3 py-2.5 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
      errors[field] ? 'border-red-400' : 'border-gray-300'
    } disabled:opacity-60`;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="flex items-center justify-between gap-3 px-6 py-4 bg-white shadow-sm">
        <div className="flex items-center gap-3">
          <BrandLogo className="h-12" />
          <div>
            <h1 className="font-bold text-lg leading-none">GCE Srirangam</h1>
            <p className="text-xs text-gray-500">Placement Cell</p>
          </div>
        </div>
        <button
          type="button"
          onClick={handleLogout}
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-red-600 transition-colors"
        >
          <LogOut className="w-4 h-4" /> Sign out
        </button>
      </header>

      <main className="flex-1 flex items-center justify-center px-4 py-10">
        <div className="w-full max-w-lg">
          <h2 className="text-2xl font-bold text-gray-900 text-center mb-1">Welcome! Set up your account</h2>
          <p className="text-gray-500 text-center text-sm mb-6">
            {registerNumber ? (
              <>
                You signed in with your register number <span className="font-semibold text-gray-700">{registerNumber}</span>.
                Choose a new password and tell us a little about yourself to continue.
              </>
            ) : (
              'Choose a new password and confirm your details to continue.'
            )}
          </p>

          {apiError && (
            <div className="flex items-start gap-2 bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg mb-4" role="alert">
              <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span>{apiError}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="bg-white p-6 rounded-xl shadow space-y-4" noValidate>
            <div>
              <label htmlFor="setup-name" className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
              <input
                id="setup-name"
                type="text"
                autoComplete="name"
                placeholder="e.g. Adithya Kumar"
                value={form.fullName}
                onChange={handleChange('fullName')}
                disabled={saving}
                className={inputClass('fullName')}
              />
              {errors.fullName && <p className="text-red-500 text-xs mt-1">{errors.fullName}</p>}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="setup-email" className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
                <input
                  id="setup-email"
                  type="email"
                  autoComplete="email"
                  placeholder="you@example.com"
                  value={form.email}
                  onChange={handleChange('email')}
                  disabled={saving}
                  className={inputClass('email')}
                />
                {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email}</p>}
              </div>
              <div>
                <label htmlFor="setup-phone" className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
                <input
                  id="setup-phone"
                  type="tel"
                  autoComplete="tel"
                  placeholder="e.g. 9876543210"
                  value={form.phone}
                  onChange={handleChange('phone')}
                  disabled={saving}
                  className={inputClass('phone')}
                />
                {errors.phone && <p className="text-red-500 text-xs mt-1">{errors.phone}</p>}
              </div>
            </div>

            <div>
              <label htmlFor="setup-password" className="block text-sm font-medium text-gray-700 mb-1">New Password</label>
              <div className="relative">
                <input
                  id="setup-password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  placeholder="Choose a new password"
                  value={form.newPassword}
                  onChange={handleChange('newPassword')}
                  disabled={saving}
                  className={`${inputClass('newPassword')} pr-10`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errors.newPassword && <p className="text-red-500 text-xs mt-1">{errors.newPassword}</p>}
              <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1 mt-2" aria-label="Password rules">
                {checks.map((c) => (
                  <li key={c.id} className={`flex items-center gap-1.5 text-xs ${c.ok ? 'text-green-600' : 'text-gray-400'}`}>
                    {c.ok ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Circle className="w-3.5 h-3.5" />}
                    {c.label}
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <label htmlFor="setup-confirm" className="block text-sm font-medium text-gray-700 mb-1">Confirm New Password</label>
              <input
                id="setup-confirm"
                type={showPassword ? 'text' : 'password'}
                autoComplete="new-password"
                placeholder="Re-enter the new password"
                value={form.confirmPassword}
                onChange={handleChange('confirmPassword')}
                disabled={saving}
                className={inputClass('confirmPassword')}
              />
              {errors.confirmPassword && <p className="text-red-500 text-xs mt-1">{errors.confirmPassword}</p>}
            </div>

            <button
              id="setup-submit"
              type="submit"
              disabled={saving}
              aria-busy={saving}
              className="w-full bg-blue-600 text-white py-2.5 rounded-lg hover:bg-blue-700 transition-colors font-semibold text-sm disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {saving ? <LoadingSpinner size="sm" color="white" label="Saving…" showLabel /> : 'Save and continue'}
            </button>
          </form>

          <p className="text-center text-xs text-gray-400 mt-4">
            You can add your CGPA, skills, resume and projects later from your profile.
          </p>
        </div>
      </main>
    </div>
  );
}
