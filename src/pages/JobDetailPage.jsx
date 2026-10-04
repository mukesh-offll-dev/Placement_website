import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Briefcase } from 'lucide-react';

export default function JobDetailPage() {
  const navigate = useNavigate();

  return (
    <main className="flex-1 px-4 md:px-8 py-6 overflow-x-hidden">
      <button
        type="button"
        onClick={() => navigate('/student/jobs')}
        className="inline-flex items-center gap-1.5 text-blue-600 text-sm hover:underline mb-5"
      >
        <ArrowLeft className="w-4 h-4" /> Back to Job Drives
      </button>
      <section className="bg-white rounded-xl p-10 text-center shadow-sm">
        <Briefcase className="w-10 h-10 mx-auto mb-3 text-gray-300" />
        <h1 className="text-xl font-semibold text-gray-900">Job details unavailable</h1>
        <p className="mt-2 text-sm text-gray-500">
          The backend does not currently provide job details or application submission. No application has been created.
        </p>
      </section>
    </main>
  );
}