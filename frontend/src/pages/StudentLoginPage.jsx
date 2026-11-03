import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { GraduationCap, Eye, EyeOff, AlertCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import LoadingSpinner from '../components/LoadingSpinner';
import BrandLogo from '../components/BrandLogo';
import { toastSuccess, toastError } from '../utils/toast';
import { normalizeRegisterNumber } from '../utils/studentValidation';

export default function StudentLoginPage() {
  const navigate = useNavigate();
  const { login, isAuthenticated, role } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
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
          ? 'This login portal is for students only. Please use the Admin Login.'
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
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="flex items-center gap-3 px-6 py-4 bg-white shadow-sm">
        <BrandLogo className="h-12" />
        <div>
          <h1 className="font-bold text-lg leading-none">GCE Srirangam</h1>
          <p className="text-xs text-gray-500">Placement Cell</p>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center px-4 py-10">
        <div className="w-full max-w-md">
          <div className="flex justify-center mb-5">
            <div className="bg-green-100 p-4 rounded-full">
              <GraduationCap className="w-10 h-10 text-green-700" />
            </div>
          </div>

          <h2 className="text-2xl font-bold text-gray-900 text-center mb-1">Student Login</h2>
          <p className="text-gray-500 text-center text-sm mb-7">
            Access your placement dashboard and track your progress
          </p>

          {/* API-level error banner */}
          {apiError && (
            <div className="flex items-start gap-2 bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg mb-4">
              <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span>{apiError}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="bg-white p-6 rounded-xl shadow space-y-4" noValidate>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Register Number</label>
              <input
                id="student-register-number"
                type="text"
                autoComplete="username"
                autoCapitalize="characters"
                placeholder="e.g. 811521104001"
                value={form.registerNumber}
                onChange={handleChange('registerNumber')}
                disabled={loading}
                className={`w-full px-3 py-2.5 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.registerNumber ? 'border-red-400' : 'border-gray-300'
                } disabled:opacity-60`}
              />
              {errors.registerNumber && <p className="text-red-500 text-xs mt-1">{errors.registerNumber}</p>}
              <p className="text-gray-400 text-xs mt-1">
                First time? Your initial password is your register number.
              </p>
            </div>

            <div>
              <div className="flex justify-between mb-1">
                <label className="text-sm font-medium text-gray-700">Password</label>
                <span className="text-gray-400 text-xs">Forgot it? Ask the placement cell to reset it.</span>
              </div>
              <div className="relative">
                <input
                  id="student-password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter password"
                  value={form.password}
                  onChange={handleChange('password')}
                  disabled={loading}
                  className={`w-full px-3 py-2.5 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 pr-10 ${
                    errors.password ? 'border-red-400' : 'border-gray-300'
                  } disabled:opacity-60`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errors.password && <p className="text-red-500 text-xs mt-1">{errors.password}</p>}
            </div>

            <button
              id="student-login-btn"
              type="submit"
              disabled={loading}
              aria-busy={loading}
              className="w-full bg-blue-600 text-white py-2.5 rounded-lg hover:bg-blue-700 transition-colors font-semibold text-sm disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <LoadingSpinner size="sm" color="white" label="Signing in…" showLabel />
              ) : (
                'Login to Student Portal'
              )}
            </button>
          </form>

          <div className="mt-5 space-y-2 text-center text-sm">
            <p className="text-gray-500">
              Accounts are created by the placement cell. Contact them if you cannot sign in.
            </p>
            <p className="text-gray-500">
              Not a student?{' '}
              <Link to="/login" className="text-gray-600 hover:underline">
                Go back
              </Link>
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
