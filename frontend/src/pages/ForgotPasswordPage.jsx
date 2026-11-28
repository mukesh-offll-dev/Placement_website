import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { AlertCircle, ArrowLeft, CheckCircle2, KeyRound, Mail } from 'lucide-react';
import AuthShell from '../components/AuthShell';
import LoadingSpinner from '../components/LoadingSpinner';
import { requestPasswordReset } from '../services/authService.js';
import { acceptsRegisterNumber, loginPathForRoleParam, validateForgotIdentifier } from '../utils/passwordReset';

/**
 * /forgot-password?role=student|faculty|admin: asks for a reset link by email. The answer is the
 * same for every input (the server never says whether an account exists), so this page never does either.
 */
export default function ForgotPasswordPage() {
  const [params] = useSearchParams();
  const role = params.get('role');
  const allowRegisterNumber = acceptsRegisterNumber(role);
  const backTo = loginPathForRoleParam(role);

  const [identifier, setIdentifier] = useState('');
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (loading) return;
    const problem = validateForgotIdentifier(identifier, { allowRegisterNumber });
    setError(problem);
    if (problem) return;

    setLoading(true);
    try {
      await requestPasswordReset(identifier);
      setSent(true);
    } catch (err) {
      setError(err?.message || 'Could not send the reset link. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const label = allowRegisterNumber ? 'Email address or register number' : 'Email address';

  return (
    <AuthShell current="institution" hideSwitcher>
      <div className="w-full max-w-md">
        <div className="flex justify-center mb-5">
          <div className="bg-blue-100 p-4 rounded-full">
            <KeyRound className="w-10 h-10 text-blue-700" />
          </div>
        </div>
        <h1 className="text-2xl font-bold text-gray-900 text-center mb-1">Forgot password?</h1>

        {sent ? (
          <div className="mt-6 bg-white p-6 rounded-xl shadow space-y-4" role="status">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="w-6 h-6 text-green-600 shrink-0" aria-hidden="true" />
              <div>
                <p className="font-semibold text-gray-900">Check your email</p>
                <p className="text-sm text-gray-600 mt-1">
                  If an account matches, we have sent a link to reset the password. It works once and expires in 30
                  minutes. Look in spam if you do not see it.
                </p>
              </div>
            </div>
            <p className="text-xs text-gray-500 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2">
              Nothing arrived? Students who have not signed in yet have no email on file, and some accounts cannot
              receive email. Contact the placement cell and they will reset it for you.
            </p>
            <div className="flex flex-col sm:flex-row gap-2">
              <button
                type="button"
                onClick={() => setSent(false)}
                className="flex-1 border border-gray-300 text-gray-700 py-2.5 rounded-lg hover:bg-gray-50 transition-colors text-sm font-semibold"
              >
                Try another address
              </button>
              <Link
                to={backTo}
                className="flex-1 bg-blue-600 text-white py-2.5 rounded-lg hover:bg-blue-700 transition-colors text-sm font-semibold text-center"
              >
                Back to sign in
              </Link>
            </div>
          </div>
        ) : (
          <>
            <p className="text-gray-500 text-center text-sm mb-6">
              Enter the {allowRegisterNumber ? 'email address on your account or your register number' : 'email address on your account'}. We will email you a link to set a new password.
            </p>

            {error && (
              <div
                className="flex items-start gap-2 bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg mb-4"
                role="alert"
              >
                <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={submit} noValidate className="bg-white p-6 rounded-xl shadow space-y-4">
              <div>
                <label htmlFor="forgot-identifier" className="block text-sm font-medium text-gray-700 mb-1">
                  {label}
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" aria-hidden="true" />
                  <input
                    id="forgot-identifier"
                    type="text"
                    inputMode="email"
                    autoComplete="username"
                    autoCapitalize="none"
                    value={identifier}
                    onChange={(e) => {
                      setIdentifier(e.target.value);
                      if (error) setError('');
                    }}
                    disabled={loading}
                    className={`w-full pl-9 pr-3 py-2.5 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-60 ${
                      error ? 'border-red-400' : 'border-gray-300'
                    }`}
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                aria-busy={loading}
                className="w-full bg-blue-600 text-white py-2.5 rounded-lg hover:bg-blue-700 transition-colors font-semibold text-sm flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {loading ? <LoadingSpinner size="sm" color="white" label="Sending…" showLabel /> : 'Send reset link'}
              </button>
            </form>

            <p className="mt-5 text-center text-sm">
              <Link to={backTo} className="inline-flex items-center gap-1.5 text-gray-600 hover:text-blue-700 font-medium">
                <ArrowLeft className="w-4 h-4" /> Back to sign in
              </Link>
            </p>
          </>
        )}
      </div>
    </AuthShell>
  );
}
