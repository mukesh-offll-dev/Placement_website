import { useOutletContext, useSearchParams } from 'react-router-dom';
import { Info } from 'lucide-react';
import StudentManager from '../components/students/StudentManager';
import { facultyStudentApi } from '../services/api/studentManagementApi';
import { LIFECYCLE_TABS, VERIFICATION_STATUSES } from '../utils/studentQuery';

/** The advisor's own department's students (the backend scopes every call). */
export default function FacultyStudents() {
  const { department, facultyLoaded } = useOutletContext() || {};
  const [searchParams] = useSearchParams();
  const lifecycle = searchParams.get('lifecycle');
  const verification = searchParams.get('verification');
  const initialFilters = {
    lifecycle: LIFECYCLE_TABS.some((t) => t.value === lifecycle) ? lifecycle : 'ACTIVE',
    verificationStatus: VERIFICATION_STATUSES.includes(verification) ? verification : '',
  };

  return (
    <main className="flex-1 px-4 md:px-8 py-6 overflow-x-hidden">
      <div className="mb-5">
        <h2 className="text-2xl font-bold text-gray-900 mb-1">Students</h2>
        <p className="text-gray-500 text-sm max-w-3xl">
          {department ? `${department.code} · ${department.name}. ` : ''}
          Add students, edit their records and manage access. Select several rows for bulk actions.
        </p>
      </div>

      <div className="flex items-start gap-3 bg-blue-50 border border-blue-100 text-blue-900 text-sm rounded-xl px-4 py-3 mb-5">
        <Info className="w-4 h-4 mt-0.5 shrink-0 text-blue-600" />
        <p>
          New students sign in with their <strong>register number</strong> as username and first password. Restoring
          archived students is done by the placement cell administrator.
        </p>
      </div>

      {facultyLoaded && department && (
        <StudentManager
          key={`${initialFilters.lifecycle}-${initialFilters.verificationStatus}`}
          api={facultyStudentApi}
          fixedDepartment={department}
          canRestore={false}
          showPlacement={false}
          initialFilters={initialFilters}
        />
      )}
    </main>
  );
}
