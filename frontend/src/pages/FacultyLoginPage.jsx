import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertCircle, Eye, EyeOff, Info, UserCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import LoadingSpinner from '../components/LoadingSpinner';
import AuthShell from '../components/AuthShell';
import { toastError, toastSuccess } from '../utils/toast';

/**
 * Sign-in for faculty advisors: email + password through POST /auth/login. Any other role is
 * refused here with a pointer to its own login page.
 */
export default function FacultyLoginPage() {
  const navigate = useNavigate();
  const { login, isAuthenticated, role } = useAuth();
  const [form, setForm] = useState({ email: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState({});
  const [apiError, setApiError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isAuthenticated && role === 'FACULTY_ADVISOR') {
      navigate('/faculty/dashboard', { replace: true });
    }
  }, [isAuthenticated, role, navigate]);

  const validate = () => {
    const e = {};
    if (!form.email.trim()) e.email = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(form.email.trim())) e.email = 'Enter a valid email address';
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
        email: form.email.trim(),
        password: form.password,
        expectedRole: 'FACULTY_ADVISOR',
      });
      if (!result.success) {
        const msg = result.error?.startsWith('Unauthorized:')
          ? 'This login is for faculty advisors only. Administrators and placement officers use the Admin login; students use the Student login (links below).'
          : result.error;
        setApiError(msg);
        toastError(msg);
        return;
      }
      if (result.user?.passwordChangeRequired) {
        toastSuccess('Signed in. Please set a new password to continue.');
        navigate('/faculty/change-password', { replace: true });
        return;
      }
      toastSuccess(`Welcome, ${result.user?.fullName || 'Faculty Advisor'}!`);
      navigate('/faculty/dashboard', { replace: true });
    } catch (err) {
      const msg = err.message || 'Login failed. Please check your credentials.';
      setApiError(msg);
      toastError(err, msg);
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
    <AuthShell current="faculty" audience="Institution">
        <div className="w-full max-w-md">
          <div className="flex justify-center mb-5">
            <div className="bg-indigo-100 p-4 rounded-full">
              <UserCheck className="w-10 h-10 text-indigo-700" />
            </div>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 text-center mb-1">Faculty Advisor Login</h1>
          <p className="text-gray-500 text-center text-sm mb-6">
            Review your department&apos;s student profiles and verification requests
          </p>

          {apiError && (
            <div className="flex items-start gap-2 bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg mb-4" role="alert">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              <span>{apiError}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="bg-white p-6 rounded-xl shadow space-y-4" noValidate>
            <div>
              <label htmlFor="faculty-email" className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input
                id="faculty-email"
                type="email"
                autoComplete="username"
                placeholder="you@gce.edu.in"
                value={form.email}
                onChange={handleChange('email')}
                disabled={loading}
                className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm ${
                  errors.email ? 'border-red-400' : 'border-gray-300'
                } disabled:opacity-60`}
              />
              {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email}</p>}
            </div>

            <div>
              <label htmlFor="faculty-password" className="block text-sm font-medium text-gray-700 mb-1">Password</label>
              <div className="relative">
                <input
                  id="faculty-password"
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

            <p className="flex items-start gap-2 text-xs text-gray-500 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2">
              <Info className="w-3.5 h-3.5 mt-0.5 shrink-0" />
              First time here? Sign in with the temporary password the placement cell gave you. You will be asked to choose your own.
            </p>

            <button
              id="faculty-login-btn"
              type="submit"
              disabled={loading}
              aria-busy={loading}
              className="w-full bg-blue-600 text-white py-2.5 rounded-lg hover:bg-blue-700 transition-colors font-semibold text-sm flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading ? <LoadingSpinner size="sm" color="white" label="Signing in…" showLabel /> : 'Login to Faculty Portal'}
            </button>
          </form>
        </div>
    </AuthShell>
  );
}
