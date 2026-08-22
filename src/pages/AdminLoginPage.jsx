import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Landmark, Eye, EyeOff, Info, Mail, ShieldCheck, RefreshCw } from 'lucide-react';

function generateCaptcha() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  return Array.from({ length: 5 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}

export default function AdminLoginPage() {
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [captcha, setCaptcha] = useState(generateCaptcha());
  const [form, setForm] = useState({ username: '', password: '', captchaInput: '' });
  const [errors, setErrors] = useState({});

  const validate = () => {
    const e = {};
    if (!form.username.trim()) e.username = 'Username is required';
    if (!form.password) e.password = 'Password is required';
    if (form.captchaInput.toUpperCase() !== captcha) {
      e.captcha = 'CAPTCHA does not match';
      setCaptcha(generateCaptcha());
      setForm((f) => ({ ...f, captchaInput: '' }));
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (validate()) {
      navigate('/admin/dashboard');
    }
  };

  const handleChange = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      {/* Header */}
      <header className="flex justify-between items-center px-6 py-4 bg-white shadow">
        <Link to="/" className="flex items-center gap-2">
          <div className="text-blue-700">
            <Landmark className="w-6 h-6" />
          </div>
          <div>
            <h1 className="font-bold text-base leading-none">GCE Srirangam</h1>
            <p className="text-xs text-gray-500">Placement Cell</p>
          </div>
        </Link>
        <Link
          to="/login"
          className="bg-blue-600 text-white text-sm px-4 py-2 rounded hover:bg-blue-700 transition-colors"
        >
          Login Portal
        </Link>
      </header>

      {/* Main */}
      <main className="flex-1 flex items-center justify-center px-4 py-10">
        <div className="w-full max-w-md">
          <h2 className="text-2xl font-bold text-gray-900 text-center mb-1">Admin Portal Login</h2>
          <p className="text-gray-500 text-center text-sm mb-6">
            Secure access for placement administrators
          </p>

          <form onSubmit={handleSubmit} className="bg-white p-6 rounded-xl shadow space-y-4" noValidate>
            {/* Username */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Username</label>
              <input
                type="text"
                placeholder="Enter username"
                value={form.username}
                onChange={handleChange('username')}
                className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm ${
                  errors.username ? 'border-red-400' : 'border-gray-300'
                }`}
              />
              {errors.username && <p className="text-red-500 text-xs mt-1">{errors.username}</p>}
            </div>

            {/* Password */}
            <div>
              <div className="flex justify-between mb-1">
                <label className="text-sm font-medium text-gray-700">Password</label>
                <button type="button" className="text-blue-600 text-xs hover:underline">
                  Forgot?
                </button>
              </div>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter password"
                  value={form.password}
                  onChange={handleChange('password')}
                  className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm pr-10 ${
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

            {/* CAPTCHA */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Verification</label>
              <div className="flex items-center gap-2 mb-2">
                <div className="flex-1 bg-gray-200 py-2 text-center rounded font-mono font-bold tracking-[0.3em] text-gray-700 select-none">
                  {captcha}
                </div>
                <button
                  type="button"
                  onClick={() => setCaptcha(generateCaptcha())}
                  className="bg-gray-200 p-2 rounded hover:bg-gray-300 transition-colors"
                  title="Refresh CAPTCHA"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
              </div>
              <input
                type="text"
                placeholder="Enter CAPTCHA"
                value={form.captchaInput}
                onChange={handleChange('captchaInput')}
                maxLength={5}
                className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm ${
                  errors.captcha ? 'border-red-400' : 'border-gray-300'
                }`}
              />
              {errors.captcha && <p className="text-red-500 text-xs mt-1">{errors.captcha}</p>}
            </div>

            <button
              type="submit"
              className="w-full bg-blue-600 text-white py-2.5 rounded-lg hover:bg-blue-700 transition-colors font-semibold text-sm flex items-center justify-center gap-2"
            >
              LOGIN TO ADMIN PANEL →
            </button>
          </form>
        </div>
      </main>

      {/* Footer */}
      <footer className="pb-6">
        <div className="flex items-center justify-center gap-4 mb-4">
          <div className="h-px bg-gray-300 w-24" />
          <span className="text-xs text-gray-400 tracking-wide">Help &amp; Support</span>
          <div className="h-px bg-gray-300 w-24" />
        </div>
        <div className="flex justify-center gap-10 text-gray-500 text-sm mb-5">
          <button className="flex items-center gap-1.5 hover:text-blue-600 transition-colors">
            <Info className="w-4 h-4" /> Manual
          </button>
          <button className="flex items-center gap-1.5 hover:text-blue-600 transition-colors">
            <Mail className="w-4 h-4" /> Support
          </button>
          <button className="flex items-center gap-1.5 hover:text-blue-600 transition-colors">
            <ShieldCheck className="w-4 h-4" /> Privacy
          </button>
        </div>
        <div className="border-t border-gray-200 pt-4 text-center text-xs text-gray-400">
          © 2026 GCE Srirangam Placement Cell · All rights reserved
        </div>
      </footer>
    </div>
  );
}
