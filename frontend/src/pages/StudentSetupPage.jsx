import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff, AlertCircle, CheckCircle2, Circle, LogOut, ArrowRight } from 'lucide-react';
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
    `w-full h-[50px] px-3.5 border-[1.5px] rounded-[16px] text-[15px] text-[#0F172A] placeholder:text-[#94A3B8] focus:outline-none focus:border-[#1D4ED8] focus:bg-[#F8FAFF] focus:shadow-[0_0_0_4px_rgba(29,78,216,0.10)] transition-all ${
      errors[field] ? 'border-red-400 bg-red-50/40' : 'border-[#E2E8F0] bg-white'
    } disabled:opacity-60`;

  return (
    <div
      className="min-h-screen bg-[#0F2A6B] md:bg-[#0A1F52] flex flex-col md:items-center md:justify-center md:p-6 overflow-x-hidden"
      style={{ fontFamily: "'Plus Jakarta Sans', ui-sans-serif, system-ui, sans-serif" }}
    >
      <div className="w-full flex-1 md:flex-initial md:max-w-[520px] flex flex-col bg-[#0F2A6B] md:rounded-[32px] md:shadow-2xl relative overflow-hidden">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-[90px] -top-[70px] w-[280px] h-[280px] rounded-full border-[44px] border-[#F5B301]/16"
        />

        {/* Navy Top Header */}
        <header className="px-6 pt-8 pb-6 text-white relative z-10">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-14 h-14 rounded-[18px] bg-white flex items-center justify-center shadow-sm shrink-0">
                <BrandLogo className="w-11 h-9" />
              </div>
              <div>
                <p className="text-[11px] font-bold tracking-[1.4px] text-[#F5B301] uppercase">GCE SRIRANGAM</p>
                <p className="text-sm font-bold text-white leading-tight">First-time account setup</p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleLogout}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#C7D2FE] hover:text-white bg-white/10 hover:bg-white/15 px-3 py-2 rounded-full transition-colors min-h-[38px]"
            >
              <LogOut className="w-3.5 h-3.5" /> Sign out
            </button>
          </div>
          <h1 className="mt-5 text-[24px] sm:text-[26px] font-extrabold leading-tight tracking-tight">
            Welcome! Set up your account
          </h1>
          <p className="mt-1.5 text-[13px] text-[#C7D2FE] leading-relaxed">
            {registerNumber ? (
              <>
                Signed in with register number <span className="font-bold text-white">{registerNumber}</span>. Choose a new password and confirm your contact details to continue.
              </>
            ) : (
              'Choose a new password and confirm your details to continue.'
            )}
          </p>
        </header>

        {/* White Sheet Form */}
        <form
          onSubmit={handleSubmit}
          className="flex-1 bg-white rounded-t-[32px] px-5 sm:px-7 pt-7 pb-6 flex flex-col gap-4 relative z-10"
          noValidate
        >
          {apiError && (
            <div className="flex items-start gap-2.5 bg-red-50 border border-red-200 text-red-700 text-[13px] font-medium px-3.5 py-3 rounded-[16px]" role="alert">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              <span>{apiError}</span>
            </div>
          )}

          <div>
            <label htmlFor="setup-name" className="block text-[13px] font-semibold text-[#334155] mb-1.5">Full Name</label>
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
            {errors.fullName && <p className="text-red-500 text-xs font-medium mt-1">{errors.fullName}</p>}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label htmlFor="setup-email" className="block text-[13px] font-semibold text-[#334155] mb-1.5">Email Address</label>
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
              {errors.email && <p className="text-red-500 text-xs font-medium mt-1">{errors.email}</p>}
            </div>
            <div>
              <label htmlFor="setup-phone" className="block text-[13px] font-semibold text-[#334155] mb-1.5">Phone Number</label>
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
              {errors.phone && <p className="text-red-500 text-xs font-medium mt-1">{errors.phone}</p>}
            </div>
          </div>

          <div>
            <label htmlFor="setup-password" className="block text-[13px] font-semibold text-[#334155] mb-1.5">New Password</label>
            <div className="relative">
              <input
                id="setup-password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="new-password"
                placeholder="Choose a new password"
                value={form.newPassword}
                onChange={handleChange('newPassword')}
                disabled={saving}
                className={`${inputClass('newPassword')} pr-12`}
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-1.5 top-1/2 -translate-y-1/2 w-10 h-10 rounded-xl flex items-center justify-center text-[#64748B] hover:text-[#0F172A] hover:bg-slate-100 transition-colors"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {errors.newPassword && <p className="text-red-500 text-xs font-medium mt-1">{errors.newPassword}</p>}
            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1.5 mt-2.5 p-3 rounded-[14px] bg-[#F8FAFF] border border-[#E2E8F0]" aria-label="Password rules">
              {checks.map((c) => (
                <li key={c.id} className={`flex items-center gap-1.5 text-xs font-medium ${c.ok ? 'text-[#047857]' : 'text-[#64748B]'}`}>
                  {c.ok ? <CheckCircle2 className="w-3.5 h-3.5 shrink-0" /> : <Circle className="w-3.5 h-3.5 shrink-0" />}
                  {c.label}
                </li>
              ))}
            </ul>
          </div>

          <div>
            <label htmlFor="setup-confirm" className="block text-[13px] font-semibold text-[#334155] mb-1.5">Confirm New Password</label>
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
            {errors.confirmPassword && <p className="text-red-500 text-xs font-medium mt-1">{errors.confirmPassword}</p>}
          </div>

          <button
            id="setup-submit"
            type="submit"
            disabled={saving}
            aria-busy={saving}
            className="h-[56px] w-full bg-[#1D4ED8] hover:bg-[#1E3A8A] text-white rounded-[18px] transition-colors font-bold text-[15px] disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-1 cursor-pointer"
          >
            {saving ? (
              <LoadingSpinner size="sm" color="white" label="Saving…" showLabel />
            ) : (
              <>
                <span>Save and continue</span>
                <ArrowRight className="w-4 h-4" aria-hidden="true" />
              </>
            )}
          </button>

          <p className="text-center text-xs text-[#64748B] mt-1">
            You can add your CGPA, skills, resume and projects later from your profile.
          </p>
        </form>
      </div>
    </div>
  );
}
