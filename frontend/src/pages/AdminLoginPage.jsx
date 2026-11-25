import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff, ShieldCheck, RefreshCw, AlertCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import LoadingSpinner from '../components/LoadingSpinner';
import AuthShell from '../components/AuthShell';
import { toastSuccess, toastError } from '../utils/toast';

function generateCaptcha() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  return Array.from({ length: 5 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}

export default function AdminLoginPage() {
  const navigate = useNavigate();
  const { login, isAuthenticated, role } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [captcha, setCaptcha] = useState(generateCaptcha());
  // Note: 'username' field accepts the admin's email address
  const [form, setForm] = useState({ username: '', password: '', captchaInput: '' });
  const [errors, setErrors] = useState({});
  const [apiError, setApiError] = useState('');
  const [loading, setLoading] = useState(false);

  // If already authenticated as ADMIN, redirect straight to dashboard
  useEffect(() => {
    if (isAuthenticated && (role === 'ADMIN' || role === 'PLACEMENT_OFFICER')) {
      navigate('/admin/dashboard', { replace: true });
    }
  }, [isAuthenticated, navigate, role]);

  const validate = () => {
    const e = {};
    if (!form.username.trim()) e.username = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(form.username.trim())) e.username = 'Enter a valid email address';
    if (!form.password) e.password = 'Password is required';
    if (form.captchaInput.toUpperCase() !== captcha) {
      e.captcha = 'CAPTCHA does not match';
      setCaptcha(generateCaptcha());
      setForm((f) => ({ ...f, captchaInput: '' }));
    }
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
        email: form.username.trim(),
        password: form.password,
        // Placement officers work from this portal too; sending 'ADMIN' alone
        // rejected them even though /admin/** grants them access.
        expectedRole: ['ADMIN', 'PLACEMENT_OFFICER'],
      });

      if (!result.success) {
        const errMsg = result.error?.startsWith('Unauthorized:')
          ? 'This login is for administrators and placement officers only. Students and faculty advisors have their own login pages below.'
          : result.error;
        setApiError(errMsg);
        toastError(errMsg);
        setCaptcha(generateCaptcha());
        setForm((f) => ({ ...f, captchaInput: '' }));
        return;
      }
      if (result.user?.passwordChangeRequired) {
        toastSuccess('Signed in. Please set a new password to continue.');
        navigate('/admin/change-password', { replace: true });
        return;
      }
      toastSuccess(`Welcome, ${result.user?.fullName || 'Administrator'}!`);
      navigate('/admin/dashboard', { replace: true });
    } catch (err) {
      const errMsg = err.message || 'Login failed. Please check your credentials.';
      setApiError(errMsg);
      toastError(err, 'Login failed. Please check your credentials.');
      setCaptcha(generateCaptcha());
      setForm((f) => ({ ...f, captchaInput: '' }));
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
    <AuthShell current="admin" audience="Institution">
        <div className="w-full max-w-md">
          <div className="flex justify-center mb-5">
            <div className="bg-blue-100 p-4 rounded-full">
              <ShieldCheck className="w-10 h-10 text-blue-700" />
            </div>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 text-center mb-1">Admin &amp; Placement Officer Login</h1>
          <p className="text-gray-500 text-center text-sm mb-6">
            Manage students, job drives and the full placement process
          </p>

          {/* API-level error banner */}
          {apiError && (
            <div className="flex items-start gap-2 bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg mb-4">
              <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span>{apiError}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="bg-white p-6 rounded-xl shadow space-y-4" noValidate>
            {/* Email (labelled as Username for admin familiarity) */}
            <div>
              <label htmlFor="admin-email" className="block text-sm font-medium text-gray-700 mb-1">
                Email
              </label>
              <input
                id="admin-email"
                type="email"
                autoComplete="username"
                placeholder="you@gce.edu.in"
                value={form.username}
                onChange={handleChange('username')}
                disabled={loading}
                className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm ${
                  errors.username ? 'border-red-400' : 'border-gray-300'
                } disabled:opacity-60`}
              />
              {errors.username && <p className="text-red-500 text-xs mt-1">{errors.username}</p>}
            </div>

            {/* Password */}
            <div>
              <div className="flex justify-between mb-1">
                <label htmlFor="admin-password" className="text-sm font-medium text-gray-700">Password</label>
                <span className="text-gray-400 text-xs">Forgot it? Ask the system administrator.</span>
              </div>
              <div className="relative">
                <input
                  id="admin-password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  placeholder="Enter password"
                  value={form.password}
                  onChange={handleChange('password')}
                  disabled={loading}
                  className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm pr-10 ${
                    errors.password ? 'border-red-400' : 'border-gray-300'
                  } disabled:opacity-60`}
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
              {errors.password && <p className="text-red-500 text-xs mt-1">{errors.password}</p>}
            </div>

            {/* CAPTCHA */}
            <div>
              <label htmlFor="admin-captcha" className="block text-sm font-medium text-gray-700 mb-1">Verification</label>
              <div className="flex items-center gap-2 mb-2">
                <div className="flex-1 bg-gray-200 py-2 text-center rounded font-mono font-bold tracking-[0.3em] text-gray-700 select-none">
                  {captcha}
                </div>
                <button
                  type="button"
                  onClick={() => { setCaptcha(generateCaptcha()); setForm((f) => ({ ...f, captchaInput: '' })); }}
                  className="bg-gray-200 p-2 rounded hover:bg-gray-300 transition-colors"
                  title="Refresh CAPTCHA"
                  aria-label="Show a new CAPTCHA"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
              </div>
              <input
                id="admin-captcha"
                type="text"
                placeholder="Enter CAPTCHA"
                value={form.captchaInput}
                onChange={handleChange('captchaInput')}
                maxLength={5}
                disabled={loading}
                className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm ${
                  errors.captcha ? 'border-red-400' : 'border-gray-300'
                } disabled:opacity-60`}
              />
              {errors.captcha && <p className="text-red-500 text-xs mt-1">{errors.captcha}</p>}
            </div>

            <button
              id="admin-login-btn"
              type="submit"
              disabled={loading}
              aria-busy={loading}
              className="w-full bg-blue-600 text-white py-2.5 rounded-lg hover:bg-blue-700 transition-colors font-semibold text-sm flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading ? (
                <LoadingSpinner size="sm" color="white" label="Signing in…" showLabel />
              ) : (
                'Login to Admin Panel'
              )}
            </button>
          </form>
        </div>
    </AuthShell>
  );
}
