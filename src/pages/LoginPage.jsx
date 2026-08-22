import { Link } from 'react-router-dom';
import { GraduationCap, ShieldCheck, ArrowRight } from 'lucide-react';

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="flex items-center gap-3 px-6 py-4 bg-white shadow-sm">
        <div className="bg-blue-100 p-2 rounded-xl">
          <GraduationCap className="w-7 h-7 text-blue-700" />
        </div>
        <div>
          <h1 className="font-bold text-lg leading-none">GCE Srirangam</h1>
          <p className="text-xs text-gray-500">Placement Cell</p>
        </div>
      </header>

      {/* Main */}
      <main className="flex-1 flex flex-col items-center justify-center px-4 py-10">
        <h2 className="text-3xl font-bold text-gray-900 mb-2 text-center">Welcome Back</h2>
        <p className="text-gray-500 mb-10 text-center">
          Select your role to access the placement portal
        </p>

        <div className="grid md:grid-cols-2 gap-6 w-full max-w-3xl">
          {/* Student Card */}
          <div className="bg-blue-50 border border-blue-200 rounded-2xl p-8 flex flex-col items-center text-center shadow-sm hover:shadow-md transition-shadow">
            <div className="bg-green-100 p-5 rounded-full mb-5">
              <GraduationCap className="w-10 h-10 text-green-700" />
            </div>
            <h3 className="text-2xl font-bold mb-3 text-gray-900">Student Portal</h3>
            <p className="text-gray-500 text-sm leading-relaxed mb-8">
              Access your placement dashboard, apply for upcoming companies, and track your
              recruitment progress in real-time.
            </p>
            <Link
              to="/student/login"
              className="flex items-center gap-2 bg-blue-600 text-white font-semibold px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors w-full justify-center"
            >
              Student Login <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          {/* Admin Card */}
          <div className="bg-gray-50 border border-gray-200 rounded-2xl p-8 flex flex-col items-center text-center shadow-sm hover:shadow-md transition-shadow">
            <div className="bg-blue-100 p-5 rounded-full mb-5">
              <ShieldCheck className="w-10 h-10 text-blue-700" />
            </div>
            <h3 className="text-2xl font-bold mb-3 text-gray-900">Admin Portal</h3>
            <p className="text-gray-500 text-sm leading-relaxed mb-8">
              Manage student records, coordinate with campus recruiters, and oversee the complete
              placement lifecycle.
            </p>
            <Link
              to="/admin/login"
              className="flex items-center gap-2 border-2 border-blue-600 text-blue-600 font-semibold px-6 py-3 rounded-lg hover:bg-blue-600 hover:text-white transition-colors w-full justify-center"
            >
              Admin Login <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </main>

      {/* Footer strip */}
      <footer className="flex justify-between items-center px-6 py-4 text-xs text-gray-400 border-t border-gray-200 bg-white flex-wrap gap-2">
        <span className="font-semibold text-gray-600">GCE Srirangam &nbsp;|&nbsp; Placement Cell</span>
        <div className="flex gap-5">
          <a href="#" className="hover:text-gray-600 transition-colors">Privacy Policy</a>
          <a href="#" className="hover:text-gray-600 transition-colors">Terms of Service</a>
          <a href="#" className="hover:text-gray-600 transition-colors">Help Desk</a>
        </div>
        <span>© 2026 GCE Srirangam · All rights reserved</span>
      </footer>
    </div>
  );
}
