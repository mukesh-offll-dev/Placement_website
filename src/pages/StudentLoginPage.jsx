import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { GraduationCap, Eye, EyeOff } from 'lucide-react';

export default function StudentLoginPage() {
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [form, setForm] = useState({ email: '', password: '' });
  const [errors, setErrors] = useState({});

  const validate = () => {
    const e = {};
    if (!form.email.trim()) e.email = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(form.email)) e.email = 'Invalid email address';
    if (!form.password) e.password = 'Password is required';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (validate()) {
      navigate('/student/dashboard');
    }
  };

  const handleChange = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

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

          <form onSubmit={handleSubmit} className="bg-white p-6 rounded-xl shadow space-y-4" noValidate>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
              <input
                type="email"
                placeholder="student@gce.edu.in"
                value={form.email}
                onChange={handleChange('email')}
                className={`w-full px-3 py-2.5 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.email ? 'border-red-400' : 'border-gray-300'
                }`}
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
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter password"
                  value={form.password}
                  onChange={handleChange('password')}
                  className={`w-full px-3 py-2.5 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 pr-10 ${
                    errors.password ? 'border-red-400' : 'border-gray-300'
                  }`}
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
              type="submit"
              className="w-full bg-blue-600 text-white py-2.5 rounded-lg hover:bg-blue-700 transition-colors font-semibold text-sm"
            >
              Login to Student Portal
            </button>
          </form>

          <p className="text-center text-sm text-gray-500 mt-5">
            Not a student?{' '}
            <Link to="/login" className="text-blue-600 hover:underline">
              Go back
            </Link>
          </p>
        </div>
      </main>
    </div>
  );
}
