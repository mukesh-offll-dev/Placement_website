import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, AlertCircle, CreditCard, Lock, ArrowRight, Info, ArrowLeft } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import LoadingSpinner from '../components/LoadingSpinner';
import BrandLogo from '../components/BrandLogo';
import { toastSuccess, toastError } from '../utils/toast';
import { normalizeRegisterNumber } from '../utils/studentValidation';

export default function StudentLoginPage() {
  const navigate = useNavigate();
  const { login, isAuthenticated, role } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [focusedField, setFocusedField] = useState(null);
  const [form, setForm] = useState({ registerNumber: '', password: '' });
  const [errors, setErrors] = useState({});
  const [apiError, setApiError] = useState('');
  const [loading, setLoading] = useState(false);

  // If already authenticated as STUDENT, redirect straight to dashboard
  useEffect(() => {
    if (isAuthenticated && role === 'STUDENT') {
      // ProtectedRoute sends a student who still has to finish setup on to /student/setup.
      navigate('/student/dashboard', { replace: true });
    }
  }, [isAuthenticated, navigate, role]);

  const validate = () => {
    const e = {};
    if (!form.registerNumber.trim()) e.registerNumber = 'Register number is required';
    if (!form.password) e.password = 'Password is required';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (loading) return;
    setApiError('');
    if (!validate()) return;

    setLoading(true);
    try {
      const result = await login({
        registerNumber: normalizeRegisterNumber(form.registerNumber),
        password: form.password,
        expectedRole: 'STUDENT',
      });

      if (!result.success) {
        const errMsg = result.error?.startsWith('Unauthorized:')
          ? 'This login is for students only. Faculty and admins: use Institution login.'
          : result.error;
        setApiError(errMsg);
        toastError(errMsg);
        return;
      }
      // First login: the account still has its initial password, so finish setup before anything else.
      if (result.user?.setupRequired) {
        toastSuccess('Welcome! Please set a new password and complete your details.');
        navigate('/student/setup', { replace: true });
        return;
      }
      toastSuccess(`Welcome back, ${result.user?.fullName || 'Student'}!`);
      navigate('/student/dashboard', { replace: true });
    } catch (err) {
      const errMsg = err.message || 'Login failed. Please check your credentials.';
      setApiError(errMsg);
      toastError(err, 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field) => (e) => {
    setForm((f) => ({ ...f, [field]: e.target.value }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: '' }));
    if (apiError) setApiError('');
  };

  return (
    <div
      className="min-h-screen w-full flex flex-col md:items-center md:justify-center bg-[#0F2A6B] md:bg-[#0A1F52] md:p-6 overflow-x-hidden"
      style={{ fontFamily: "'Plus Jakarta Sans', ui-sans-serif, system-ui, sans-serif" }}
    >
      <div className="w-full flex-1 md:flex-initial md:max-w-[430px] flex flex-col bg-[#0F2A6B] md:rounded-[32px] md:shadow-2xl relative overflow-hidden">
        {/* Decorative gold arc matching Page 1 */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-[90px] -top-[70px] w-[300px] h-[300px] rounded-full border-[46px] border-[#F5B301]/16"
        />

        {/* Hero Section */}
        <div className="px-6 sm:px-7 pt-10 sm:pt-12 pb-7 text-white relative z-10">
          <div className="flex items-center justify-between">
            <div className="w-[72px] h-[72px] sm:w-[76px] sm:h-[76px] rounded-[22px] bg-white flex items-center justify-center shadow-sm">
              <BrandLogo className="w-[56px] h-[48px] sm:w-[60px] sm:h-[52px]" />
            </div>
            <Link
              to="/"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#C7D2FE] hover:text-white bg-white/10 hover:bg-white/15 px-3 py-2 rounded-full transition-colors min-h-[36px]"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Home
            </Link>
          </div>

          <p className="mt-6 text-[13px] font-bold tracking-[1.6px] text-[#F5B301] uppercase">
            GCE SRIRANGAM
          </p>
          <h1 className="mt-1.5 text-[28px] sm:text-[30px] leading-[1.15] font-extrabold tracking-[-0.5px] text-white">
            Your placement journey, in your pocket.
          </h1>
        </div>

        {/* White Bottom Sheet Form */}
        <form
          onSubmit={handleSubmit}
          noValidate
          className="flex-1 bg-white rounded-t-[32px] px-5 sm:px-6 pt-7 pb-6 flex flex-col gap-4 relative z-10"
        >
          <h2 className="text-[20px] font-extrabold text-[#0F172A] tracking-tight">
            Student sign in
          </h2>

          {/* API-level error banner */}
          {apiError && (
            <div
              role="alert"
              className="flex items-start gap-2.5 bg-red-50 border border-red-200 text-red-700 text-[13px] font-medium px-3.5 py-3 rounded-[16px]"
            >
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              <span>{apiError}</span>
            </div>
          )}

          {/* Register Number */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="student-register-number" className="text-[13px] font-semibold text-[#334155]">
              Register number
            </label>
            <div
              className={`flex items-center gap-2.5 h-[54px] rounded-[16px] border-[1.5px] px-3.5 transition-all ${
                errors.registerNumber
                  ? 'border-red-400 bg-red-50/40'
                  : focusedField === 'registerNumber'
                  ? 'border-[#1D4ED8] bg-[#F8FAFF] shadow-[0_0_0_4px_rgba(29,78,216,0.10)]'
                  : 'border-[#E2E8F0] bg-white'
              }`}
            >
              <CreditCard
                className={`w-5 h-5 shrink-0 transition-colors ${
                  errors.registerNumber
                    ? 'text-red-500'
                    : focusedField === 'registerNumber'
                    ? 'text-[#1D4ED8]'
                    : 'text-[#64748B]'
                }`}
                aria-hidden="true"
              />
              <input
                id="student-register-number"
                type="text"
                inputMode="text"
                autoComplete="username"
                autoCapitalize="characters"
                value={form.registerNumber}
                onChange={handleChange('registerNumber')}
                onFocus={() => setFocusedField('registerNumber')}
                onBlur={() => setFocusedField(null)}
                disabled={loading}
                className="flex-1 min-w-0 border-0 bg-transparent text-[16px] font-semibold tracking-[0.5px] text-[#0F172A] placeholder:text-[#94A3B8] placeholder:font-normal outline-none disabled:opacity-60"
              />
            </div>
            {errors.registerNumber && (
              <p className="text-red-500 text-xs font-medium">{errors.registerNumber}</p>
            )}
          </div>

          {/* Password */}
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <label htmlFor="student-password" className="text-[13px] font-semibold text-[#334155]">
                Password
              </label>
              <Link
                to="/forgot-password?role=student"
                className="text-[13px] font-semibold text-[#1D4ED8] hover:text-[#1E3A8A] transition-colors"
              >
                Forgot password?
              </Link>
            </div>
            <div
              className={`flex items-center gap-2.5 h-[54px] rounded-[16px] border-[1.5px] pl-3.5 pr-1.5 transition-all ${
                errors.password
                  ? 'border-red-400 bg-red-50/40'
                  : focusedField === 'password'
                  ? 'border-[#1D4ED8] bg-[#F8FAFF] shadow-[0_0_0_4px_rgba(29,78,216,0.10)]'
                  : 'border-[#E2E8F0] bg-white'
              }`}
            >
              <Lock
                className={`w-5 h-5 shrink-0 transition-colors ${
                  errors.password
                    ? 'text-red-500'
                    : focusedField === 'password'
                    ? 'text-[#1D4ED8]'
                    : 'text-[#64748B]'
                }`}
                aria-hidden="true"
              />
              <input
                id="student-password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                value={form.password}
                onChange={handleChange('password')}
                onFocus={() => setFocusedField('password')}
                onBlur={() => setFocusedField(null)}
                disabled={loading}
                className="flex-1 min-w-0 border-0 bg-transparent text-[16px] text-[#0F172A] placeholder:text-[#94A3B8] outline-none disabled:opacity-60"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                className="w-11 h-11 rounded-xl flex items-center justify-center text-[#64748B] hover:text-[#0F172A] hover:bg-slate-100 transition-colors shrink-0"
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
            {errors.password && (
              <p className="text-red-500 text-xs font-medium">{errors.password}</p>
            )}
          </div>

          {/* Primary CTA */}
          <button
            id="student-login-btn"
            type="submit"
            disabled={loading}
            aria-busy={loading}
            className="h-[56px] rounded-[18px] bg-[#1D4ED8] hover:bg-[#1E3A8A] active:scale-[0.99] text-white text-[16px] font-bold flex items-center justify-center gap-2 mt-1 transition-all shadow-sm disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
          >
            {loading ? (
              <LoadingSpinner size="sm" color="white" label="Signing in…" showLabel />
            ) : (
              <>
                <span>Sign in</span>
                <ArrowRight className="w-[18px] h-[18px]" aria-hidden="true" />
              </>
            )}
          </button>

          {/* First time here info card */}
          <div className="flex gap-3 p-3.5 rounded-[16px] bg-[#F1F5FF]">
            <Info className="w-5 h-5 text-[#1D4ED8] shrink-0 mt-0.5" aria-hidden="true" />
            <p className="text-[13px] text-[#334155] leading-[1.5]">
              <strong className="text-[#0F172A]">First time?</strong> Your password is your register number.
              You will set your own next.
            </p>
          </div>

          {/* Staff sign in link */}
          <p className="mt-auto pt-2 text-center text-[13px] text-[#475569]">
            Faculty or placement staff?{' '}
            <Link to="/login" className="font-bold text-[#1D4ED8] hover:text-[#1E3A8A] transition-colors">
              Institution login
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
