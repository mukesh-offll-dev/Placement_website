import { Link } from 'react-router-dom';
import { FileText } from 'lucide-react';

export default function StudentApplicationsPage() {
  return (
    <main className="flex-1 px-4 md:px-8 py-6 overflow-x-hidden">
      <h2 className="text-2xl font-bold text-gray-900 mb-1">My Applications</h2>
      <p className="text-gray-500 text-sm mb-6">
        Application tracking will appear here when the backend supports student applications.
      </p>
      <section className="bg-white rounded-xl p-12 text-center text-gray-500 shadow-sm">
        <FileText className="w-10 h-10 mx-auto mb-3 text-gray-300" />
        <p className="font-medium">No application API is available.</p>
        <p className="mt-2 text-sm">No application status or interview data is being shown.</p>
        <Link to="/student/jobs" className="text-sm text-blue-600 hover:underline mt-4 inline-block">
          View job drives
        </Link>
      </section>
    </main>
  );
}