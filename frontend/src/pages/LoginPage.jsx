import { Link } from 'react-router-dom';
import { ShieldCheck, ArrowRight, UserCheck, GraduationCap } from 'lucide-react';
import AuthShell from '../components/AuthShell';

/**
 * /login: Institution sign-in. Faculty advisors and admins / placement officers pick their portal
 * here; students have their own page (/student/login), linked below.
 */
export default function LoginPage() {
  return (
    <AuthShell current="institution" audience="Institution">
      <div className="w-full max-w-3xl">
        <h1 className="text-3xl font-bold text-gray-900 mb-2 text-center">Institution Login</h1>
        <p className="text-gray-500 mb-8 text-center">Choose your role to sign in.</p>

        <div className="grid md:grid-cols-2 gap-6">
          <Link
            to="/faculty/login"
            className="group bg-white border border-gray-200 rounded-2xl p-8 flex flex-col items-center text-center shadow-sm hover:shadow-md hover:border-blue-300 transition-all"
          >
            <div className="bg-indigo-100 p-5 rounded-full mb-5">
              <UserCheck className="w-10 h-10 text-indigo-700" />
            </div>
            <h2 className="text-2xl font-bold mb-3 text-gray-900">Faculty Advisor</h2>
            <p className="text-gray-500 text-sm mb-8">Verify your department&apos;s student profiles.</p>
            <span className="mt-auto flex items-center gap-2 border-2 border-blue-600 text-blue-600 font-semibold px-6 py-3 rounded-lg group-hover:bg-blue-600 group-hover:text-white transition-colors w-full justify-center">
              Faculty Login <ArrowRight className="w-4 h-4" />
            </span>
          </Link>

          <Link
            to="/admin/login"
            className="group bg-white border border-gray-200 rounded-2xl p-8 flex flex-col items-center text-center shadow-sm hover:shadow-md hover:border-blue-300 transition-all"
          >
            <div className="bg-blue-100 p-5 rounded-full mb-5">
              <ShieldCheck className="w-10 h-10 text-blue-700" />
            </div>
            <h2 className="text-2xl font-bold mb-3 text-gray-900">Admin &amp; Placement Officer</h2>
            <p className="text-gray-500 text-sm mb-8">Manage students, job drives and applications.</p>
            <span className="mt-auto flex items-center gap-2 bg-blue-600 text-white font-semibold px-6 py-3 rounded-lg group-hover:bg-blue-700 transition-colors w-full justify-center">
              Admin Login <ArrowRight className="w-4 h-4" />
            </span>
          </Link>
        </div>

        <p className="mt-8 text-center text-sm text-gray-500">
          Are you a student?{' '}
          <Link to="/student/login" className="inline-flex items-center gap-1 font-semibold text-blue-600 hover:underline">
            <GraduationCap className="w-4 h-4" /> Student login
          </Link>
        </p>
      </div>
    </AuthShell>
  );
}
