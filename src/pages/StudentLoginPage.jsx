import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { GraduationCap, Eye, EyeOff, AlertCircle } from 'lucide-react';
import { login, clearAuth, isAuthenticated, getRole } from '../services/authService';

export default function StudentLoginPage() {
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [form, setForm] = useState({ email: '', password: '' });
  const [errors, setErrors] = useState({});
  const [apiError, setApiError] = useState('');
  const [loading, setLoading] = useState(false);

  // If already authenticated as STUDENT, redirect straight to dashboard
  useEffect(() => {
    if (isAuthenticated() && getRole() === 'STUDENT') {
      navigate('/student/dashboard', { replace: true });
    }
  }, [navigate]);

  const validate = () => {
    const e = {};
    if (!form.email.trim()) e.email = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(form.email.trim())) e.email = 'Invalid email address';
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
      const user = await login({
        email: form.email.trim(),
        password: form.password,
        expectedRole: 'STUDENT',
      });

      if (!user || !user.token || user.role !== 'STUDENT') {
        clearAuth();
        setApiError('This login portal is for students only. Please use the Admin Login.');
        return;
      }
      navigate('/student/dashboard', { replace: true });
    } catch (err) {
      clearAuth();
      setApiError(err.message || 'Login failed. Please check your credentials.');
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
        <div className="bg-blue-100 p-2 rounded-xl">
          <GraduationCap className="w-7 h-7 text-blue-700" />
        </div>
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
              <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
              <input
                id="student-email"
                type="email"
                placeholder="student@gce.edu.in"
                value={form.email}
                onChange={handleChange('email')}
                disabled={loading}
                className={`w-full px-3 py-2.5 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.email ? 'border-red-400' : 'border-gray-300'
                } disabled:opacity-60`}
              />
              {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email}</p>}
            </div>

            <div>
              <div className="flex justify-between mb-1">
                <label className="text-sm font-medium text-gray-700">Password</label>
                <button type="button" className="text-blue-600 text-xs hover:underline">
                  Forgot password?
                </button>
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
              className="w-full bg-blue-600 text-white py-2.5 rounded-lg hover:bg-blue-700 transition-colors font-semibold text-sm disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                  </svg>
                  Signing in…
                </span>
              ) : (
                'Login to Student Portal'
              )}
            </button>
          </form>

          <div className="mt-5 space-y-2 text-center text-sm">
            <p className="text-gray-500">
              Don't have an account?{' '}
              <Link to="/student/register" className="text-blue-600 hover:underline font-semibold">
                Register here
              </Link>
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
