import { useCallback, useState } from 'react';
import { Link, Navigate, useSearchParams } from 'react-router-dom';
import { AlertCircle, Archive, ArrowLeft, Building2, Info, Loader2, Mail } from 'lucide-react';
import StudentManager from '../components/students/StudentManager';
import ArchiveBatchDialog from '../components/students/ArchiveBatchDialog';
import useDepartments from '../hooks/useDepartments';
import { useAuth } from '../context/AuthContext';
import { adminStudentApi } from '../services/api/studentManagementApi';
import { sendProfileReminders } from '../services/api/adminService';
import { toastError, toastSuccess } from '../utils/toast';
import { VERIFICATION_STATUSES } from '../utils/studentQuery';

/**
 * Admin / placement officer student management. The table, filters, bulk actions and forms live
 * in components/students (shared with the faculty portal); this page adds the admin-only extras:
 * profile reminders and batch archive. Departments moved to /admin/departments.
 */
export default function AdminManageStudents() {
  const [searchParams] = useSearchParams();
  const { role } = useAuth();
  const isAdmin = role === 'ADMIN';
  const { departments, active: activeDepartments, loading: departmentsLoading, reload: reloadDepartments } = useDepartments();
  const [reminding, setReminding] = useState(false);
  const [archiveOpen, setArchiveOpen] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  const onChanged = useCallback(() => reloadDepartments(), [reloadDepartments]);

  // The Departments tab became its own page; keep old links working.
  if (searchParams.get('tab') === 'departments') {
    return <Navigate to="/admin/departments" replace />;
  }

  const requestedVerification = searchParams.get('verification');
  const initialFilters = {
    lifecycle: ['ACTIVE', 'DISABLED', 'ARCHIVED', 'ALL'].includes(searchParams.get('lifecycle')) ? searchParams.get('lifecycle') : 'ACTIVE',
    verificationStatus: VERIFICATION_STATUSES.includes(requestedVerification) ? requestedVerification : '',
  };

  const handleReminders = async () => {
    if (reminding) return;
    setReminding(true);
    try {
      const result = await sendProfileReminders();
      const count = typeof result === 'number' ? result : Number(result?.data ?? result ?? 0);
      toastSuccess(count > 0 ? `${count} student(s) reminded to complete their profile.` : 'Nobody needs a reminder right now.');
    } catch (err) {
      toastError(err, err.message || 'Could not send reminders.');
    } finally {
      setReminding(false);
    }
  };

  const noDepartments = !departmentsLoading && activeDepartments.length === 0;

  return (
    <main className="flex-1 px-4 md:px-8 py-6 overflow-x-hidden">
      <Link to="/admin/students" className="inline-flex items-center gap-1 text-sm text-blue-600 hover:underline mb-3">
        <ArrowLeft className="w-4 h-4" /> Back to students
      </Link>
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-5">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-1">Manage Students</h2>
          <p className="text-gray-500 text-sm max-w-3xl">
            Add students, edit their records, and control their access. Select several rows to disable, enable,
            archive or delete them together.
          </p>
        </div>
        <div className="flex flex-wrap gap-2 shrink-0">
          {isAdmin && (
            <Link
              to="/admin/departments"
              className="flex items-center justify-center gap-1.5 border border-gray-300 bg-white text-gray-700 px-4 py-2 rounded-lg text-sm hover:bg-gray-50 font-medium"
            >
              <Building2 className="w-4 h-4" /> Departments
            </Link>
          )}
          <button
            type="button"
            onClick={handleReminders}
            disabled={reminding}
            className="flex items-center justify-center gap-1.5 border border-gray-300 bg-white text-gray-700 px-4 py-2 rounded-lg text-sm hover:bg-gray-50 transition font-medium disabled:opacity-60"
            title="Email students whose profile is incomplete"
          >
            {reminding ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />}
            Remind incomplete profiles
          </button>
        </div>
      </div>

      {noDepartments && (
        <div className="flex items-start gap-3 bg-yellow-50 border border-yellow-200 text-yellow-900 text-sm rounded-xl px-4 py-3 mb-4">
          <AlertCircle className="w-4 h-4 mt-0.5 shrink-0 text-yellow-600" />
          <p>
            There are no active departments yet, so students cannot be added.
            {isAdmin && <> <Link to="/admin/departments" className="underline font-medium">Add a department</Link> first.</>}
          </p>
        </div>
      )}

      <div className="flex items-start gap-3 bg-blue-50 border border-blue-100 text-blue-900 text-sm rounded-xl px-4 py-3 mb-5">
        <Info className="w-4 h-4 mt-0.5 shrink-0 text-blue-600" />
        <p>
          A new student signs in with their <strong>register number</strong> as both username and first password.
          Profile changes they make are reviewed by their department&apos;s faculty advisor before they become official.
        </p>
      </div>

      <StudentManager
        api={adminStudentApi}
        departments={departments}
        activeDepartments={activeDepartments}
        canRestore={isAdmin}
        initialFilters={initialFilters}
        reloadKey={reloadKey}
        onChanged={onChanged}
        toolbarExtra={isAdmin ? (
          <button
            type="button"
            onClick={() => setArchiveOpen(true)}
            className="flex items-center gap-1.5 border border-amber-300 text-amber-800 bg-white px-3 py-2 rounded-lg text-sm hover:bg-amber-50 font-medium"
          >
            <Archive className="w-4 h-4" /> Archive batch
          </button>
        ) : null}
      />

      {archiveOpen && (
        <ArchiveBatchDialog
          departments={departments}
          onClose={() => setArchiveOpen(false)}
          onDone={() => { setReloadKey((k) => k + 1); reloadDepartments(); }}
        />
      )}
    </main>
  );
}
