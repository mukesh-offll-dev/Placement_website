import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  Download,
  Eye,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Users,
  Award,
  Clock,
  RefreshCw,
  Mail,
  Phone,
} from 'lucide-react';
import { getStudents, deleteStudent, exportStudentsCsv } from '../services/api/adminService';

const DEPTS = [
  'All',
  'Computer Science (CSE)',
  'Electronics (ECE)',
  'Mechanical (MECH)',
  'Civil Engineering',
  'Electrical (EEE)',
  'Information Technology',
];

const STATUSES = ['All', 'ACTIVE', 'PLACED', 'PENDING', 'OPTED_OUT', 'INELIGIBLE'];

const profileBarColor = (p = 0) => {
  if (p >= 90) return 'bg-emerald-500';
  if (p >= 80) return 'bg-blue-500';
  if (p >= 70) return 'bg-amber-500';
  return 'bg-orange-400';
};

const statusBadge = (s) => {
  const norm = String(s || '').toUpperCase();
  const map = {
    PLACED: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
    ACTIVE: 'bg-blue-50 text-blue-700 border border-blue-200',
    PENDING: 'bg-amber-50 text-amber-700 border border-amber-200',
    OPTED_OUT: 'bg-gray-100 text-gray-700 border border-gray-200',
    INELIGIBLE: 'bg-red-50 text-red-700 border border-red-200',
  };
  return map[norm] || 'bg-gray-100 text-gray-600 border border-gray-200';
};

export default function AdminStudents() {
  const navigate = useNavigate();

  // Search & Filter state
  const [search, setSearch] = useState('');
  const [deptFilter, setDeptFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [cgpaFilter, setCgpaFilter] = useState('All');
  const [page, setPage] = useState(0); // 0-indexed for backend
  const [pageSize] = useState(10);

  // Data state
  const [students, setStudents] = useState([]);
  const [totalElements, setTotalElements] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [exporting, setExporting] = useState(false);

  // User action feedback
  const [actionFeedback, setActionFeedback] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

  // Load students from real backend
  const fetchStudents = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await getStudents({
        search: search.trim() || undefined,
        department: deptFilter !== 'All' ? deptFilter : undefined,
        status: statusFilter !== 'All' ? statusFilter : undefined,
        minCgpa: cgpaFilter !== 'All' ? cgpaFilter : undefined,
        page,
        size: pageSize,
        sortBy: 'createdAt',
        sortDir: 'desc',
      });

      if (response && response.content) {
        setStudents(response.content);
        setTotalElements(response.totalElements ?? response.content.length);
        setTotalPages(response.totalPages ?? 1);
      } else if (Array.isArray(response)) {
        setStudents(response);
        setTotalElements(response.length);
        setTotalPages(Math.ceil(response.length / pageSize));
      } else {
        setStudents([]);
        setTotalElements(0);
        setTotalPages(1);
      }
    } catch (err) {
      console.error('Error fetching students:', err);
      setError(err.message || 'Failed to load students from the backend server.');
    } finally {
      setLoading(false);
    }
  }, [search, deptFilter, statusFilter, cgpaFilter, page, pageSize]);

  useEffect(() => {
    fetchStudents();
  }, [fetchStudents]);

  // Handle student delete / deactivate
  const handleDelete = async (student) => {
    const confirmMsg = `Are you sure you want to deactivate student "${student.fullName}" (Roll: ${student.rollNo || 'N/A'})?`;
    if (!window.confirm(confirmMsg)) return;

    setDeletingId(student.id);
    setActionFeedback(null);
    try {
      await deleteStudent(student.id);
      setActionFeedback({
        type: 'success',
        message: `Student "${student.fullName}" was deactivated successfully.`,
      });
      // Refresh list from backend
      fetchStudents();
    } catch (err) {
      console.error('Failed to deactivate student:', err);
      setActionFeedback({
        type: 'error',
        message: err.message || 'Failed to deactivate student. Please try again.',
      });
    } finally {
      setDeletingId(null);
    }
  };

  // Handle CSV export
  const handleExport = async () => {
    try {
      setExporting(true);
      setActionFeedback(null);
      const blob = await exportStudentsCsv({
        search: search.trim() || undefined,
        department: deptFilter !== 'All' ? deptFilter : undefined,
        status: statusFilter !== 'All' ? statusFilter : undefined,
      });

      const url = window.URL.createObjectURL(new Blob([blob], { type: 'text/csv;charset=utf-8;' }));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `students_report_${new Date().toISOString().slice(0, 10)}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      setActionFeedback({
        type: 'success',
        message: 'Student report exported successfully as CSV.',
      });
    } catch (err) {
      console.error('Export failed:', err);
      setActionFeedback({
        type: 'error',
        message: err.message || 'Failed to export CSV report.',
      });
    } finally {
      setExporting(false);
    }
  };

  const clearFilters = () => {
    setSearch('');
    setDeptFilter('All');
    setStatusFilter('All');
    setCgpaFilter('All');
    setPage(0);
  };

  // Metrics from current loaded elements
  const activeCount = students.filter((s) => (s.placementStatus || '').toUpperCase() === 'ACTIVE').length;
  const placedCount = students.filter((s) => (s.placementStatus || '').toUpperCase() === 'PLACED').length;
  const pendingCount = students.filter((s) => (s.placementStatus || '').toUpperCase() === 'PENDING').length;

  return (
    <main className="flex-1 px-4 md:px-8 py-6 overflow-x-hidden">
      {/* Title & Refresh */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-gray-900">Student Management</h2>
          <p className="text-gray-500 text-sm mt-0.5">
            Search, filter, inspect, and manage student profiles loaded from the database.
          </p>
        </div>
        <button
          onClick={fetchStudents}
          disabled={loading}
          className="inline-flex items-center gap-2 bg-white hover:bg-gray-50 text-gray-700 text-xs font-semibold px-3.5 py-2 rounded-xl border border-gray-200 shadow-xs transition-colors self-start sm:self-auto disabled:opacity-60"
        >
          <RefreshCw className={`w-3.5 h-3.5 text-blue-600 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh List</span>
        </button>
      </div>

      {/* Action Feedback Banner */}
      {actionFeedback && (
        <div
          className={`flex items-center justify-between gap-3 p-3.5 rounded-xl mb-4 text-sm shadow-xs ${
            actionFeedback.type === 'success'
              ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
              : 'bg-red-50 border border-red-200 text-red-800'
          }`}
        >
          <div className="flex items-center gap-2">
            {actionFeedback.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
            )}
            <span>{actionFeedback.message}</span>
          </div>
          <button
            onClick={() => setActionFeedback(null)}
            className="text-xs font-semibold underline hover:no-underline"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Error Banner */}
      {error && (
        <div className="flex items-start justify-between gap-3 bg-red-50 border border-red-200 text-red-700 text-sm p-4 rounded-xl mb-6 shadow-xs">
          <div className="flex items-start gap-2.5">
            <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-red-800">Failed to load students</p>
              <p className="text-xs text-red-600 mt-0.5">{error}</p>
            </div>
          </div>
          <button
            onClick={fetchStudents}
            className="text-xs font-semibold bg-red-100 hover:bg-red-200 text-red-800 px-3 py-1.5 rounded-lg transition-colors shrink-0"
          >
            Retry
          </button>
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-xl p-5 shadow-xs border border-gray-100">
          <div className="flex items-center justify-between">
            <p className="text-gray-500 text-xs font-medium uppercase tracking-wider">
              Total In System
            </p>
            <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <p className="text-3xl font-extrabold text-gray-900 mt-2">{totalElements}</p>
          <p className="text-blue-600 text-xs font-medium mt-1">
            {activeCount} active in current view
          </p>
        </div>

        <div className="bg-white rounded-xl p-5 shadow-xs border border-gray-100">
          <div className="flex items-center justify-between">
            <p className="text-gray-500 text-xs font-medium uppercase tracking-wider">
              Placed Students
            </p>
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
              <Award className="w-4 h-4" />
            </div>
          </div>
          <p className="text-3xl font-extrabold text-emerald-600 mt-2">{placedCount}</p>
          <p className="text-emerald-700 text-xs font-medium mt-1">
            Confirmed campus offers
          </p>
        </div>

        <div className="bg-white rounded-xl p-5 shadow-xs border border-gray-100">
          <div className="flex items-center justify-between">
            <p className="text-gray-500 text-xs font-medium uppercase tracking-wider">
              Pending Verification
            </p>
            <div className="p-2 bg-amber-50 text-amber-600 rounded-lg">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <p className="text-3xl font-extrabold text-amber-600 mt-2">{pendingCount}</p>
          <p className="text-amber-700 text-xs font-medium mt-1">Profiles awaiting review</p>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white rounded-xl p-4 shadow-xs border border-gray-100 mb-4 flex flex-col md:flex-row md:items-center gap-3 flex-wrap">
        <span className="text-gray-500 text-xs font-semibold uppercase tracking-wider shrink-0">
          Filters:
        </span>

        {/* Department Filter */}
        <select
          value={deptFilter}
          onChange={(e) => {
            setDeptFilter(e.target.value);
            setPage(0);
          }}
          className="border border-gray-200 px-3 py-1.5 rounded-lg text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
        >
          {DEPTS.map((d) => (
            <option key={d} value={d}>
              {d === 'All' ? 'Department: All' : d}
            </option>
          ))}
        </select>

        {/* Status Filter */}
        <select
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value);
            setPage(0);
          }}
          className="border border-gray-200 px-3 py-1.5 rounded-lg text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
        >
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {s === 'All' ? 'Status: All' : `Status: ${s}`}
            </option>
          ))}
        </select>

        {/* CGPA Filter */}
        <select
          value={cgpaFilter}
          onChange={(e) => {
            setCgpaFilter(e.target.value);
            setPage(0);
          }}
          className="border border-gray-200 px-3 py-1.5 rounded-lg text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
        >
          <option value="All">CGPA: All</option>
          <option value="9">CGPA ≥ 9.0</option>
          <option value="8">CGPA ≥ 8.0</option>
          <option value="7">CGPA ≥ 7.0</option>
          <option value="6">CGPA ≥ 6.0</option>
        </select>

        {(deptFilter !== 'All' || statusFilter !== 'All' || cgpaFilter !== 'All' || search) && (
          <button
            onClick={clearFilters}
            className="text-blue-600 text-xs font-semibold hover:underline"
          >
            Clear all filters
          </button>
        )}

        <div className="md:ml-auto flex items-center gap-2 w-full md:w-auto">
          <div className="relative flex-1 md:w-56">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search name, roll, email..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(0);
              }}
              className="w-full border border-gray-200 pl-9 pr-3 py-1.5 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <button
            onClick={handleExport}
            disabled={exporting || loading}
            className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors disabled:opacity-60 shadow-xs shrink-0"
            title="Export filtered records as CSV"
          >
            {exporting ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Download className="w-3.5 h-3.5" />
            )}
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-xs border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[850px]">
            <thead>
              <tr className="bg-gray-50/80 text-[11px] font-semibold text-gray-500 uppercase tracking-wider border-b border-gray-200/80">
                <th className="py-3 px-4">Student &amp; Roll No</th>
                <th className="py-3 px-4">Department &amp; Batch</th>
                <th className="py-3 px-4">Contact</th>
                <th className="py-3 px-4">CGPA / Sem</th>
                <th className="py-3 px-4">Profile</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-xs">
              {loading ? (
                <tr>
                  <td colSpan="6" className="py-16 text-center text-gray-400">
                    <Loader2 className="w-6 h-6 animate-spin text-blue-600 mx-auto mb-2" />
                    <span>Loading student records from database...</span>
                  </td>
                </tr>
              ) : students.length === 0 ? (
                <tr>
                  <td colSpan="6" className="py-16 text-center text-gray-400">
                    <Users className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                    <p className="font-semibold text-gray-600">No students found</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {search || deptFilter !== 'All' || statusFilter !== 'All'
                        ? 'Try modifying your search or filter criteria.'
                        : 'No student accounts are currently registered in the database.'}
                    </p>
                  </td>
                </tr>
              ) : (
                students.map((s) => (
                  <tr
                    key={s.id}
                    className="hover:bg-gray-50/60 transition-colors group items-center"
                  >
                    {/* Name + Roll No */}
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-blue-50 border border-blue-100 flex items-center justify-center font-bold text-blue-700 text-xs shrink-0 shadow-xs">
                          {(s.fullName || 'S').charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900 text-sm">
                            {s.fullName || 'Unnamed'}
                          </p>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            {s.rollNo && (
                              <span className="font-mono text-[11px] text-gray-500">
                                {s.rollNo}
                              </span>
                            )}
                            <span
                              className={`text-[10px] px-2 py-0.2 rounded-full font-semibold ${statusBadge(
                                s.placementStatus
                              )}`}
                            >
                              {s.placementStatus || 'PENDING'}
                            </span>
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Department & Batch */}
                    <td className="py-3 px-4">
                      <p className="font-medium text-gray-800">
                        {s.department || s.departmentCode || 'N/A'}
                      </p>
                      <p className="text-gray-400 text-[11px] mt-0.5">
                        {s.degree || 'B.E'} • {s.batch || '2022-2026'}
                      </p>
                    </td>

                    {/* Contact */}
                    <td className="py-3 px-4 text-gray-600">
                      <div className="flex items-center gap-1.5 text-gray-700">
                        <Mail className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                        <span className="truncate max-w-[150px]" title={s.email}>
                          {s.email || 'No email'}
                        </span>
                      </div>
                      {s.phone && (
                        <div className="flex items-center gap-1.5 text-gray-500 text-[11px] mt-0.5">
                          <Phone className="w-3 h-3 text-gray-400 shrink-0" />
                          <span>{s.phone}</span>
                        </div>
                      )}
                    </td>

                    {/* CGPA / Sem */}
                    <td className="py-3 px-4">
                      <div className="font-bold text-gray-900 text-sm">
                        {s.cgpa != null ? Number(s.cgpa).toFixed(2) : '—'}
                      </div>
                      <div className="text-gray-400 text-[11px] mt-0.5">
                        Sem {s.semester ?? '—'}
                      </div>
                    </td>

                    {/* Profile completion */}
                    <td className="py-3 px-4">
                      <div className="w-24 bg-gray-100 h-2 rounded-full overflow-hidden">
                        <div
                          className={`h-2 rounded-full ${profileBarColor(
                            s.profileCompletionPercent ?? 0
                          )}`}
                          style={{
                            width: `${Math.min(s.profileCompletionPercent ?? 0, 100)}%`,
                          }}
                        />
                      </div>
                      <span className="text-[11px] text-gray-500 font-medium mt-1 block">
                        {s.profileCompletionPercent ?? 0}% completed
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => navigate(`/admin/students/${s.id}`)}
                          className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-colors"
                          title="View student profile"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>View</span>
                        </button>
                        <button
                          onClick={() => handleDelete(s)}
                          disabled={deletingId === s.id}
                          className="inline-flex items-center gap-1 text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-colors disabled:opacity-50"
                          title="Deactivate student account"
                        >
                          {deletingId === s.id ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Trash2 className="w-3.5 h-3.5" />
                          )}
                          <span>Delete</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-center gap-3 mt-4 text-xs text-gray-500">
        <p>
          Showing {students.length === 0 ? 0 : page * pageSize + 1}–
          {Math.min((page + 1) * pageSize, totalElements)} of {totalElements} registered students
        </p>
        <div className="flex items-center gap-1">
          <button
            disabled={page === 0 || loading}
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            className="p-1.5 rounded-lg hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            title="Previous page"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => i).map((p) => (
            <button
              key={p}
              onClick={() => setPage(p)}
              disabled={loading}
              className={`w-7 h-7 rounded-lg text-xs font-semibold transition-colors ${
                page === p
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              {p + 1}
            </button>
          ))}

          <button
            disabled={page >= totalPages - 1 || loading}
            onClick={() => setPage((p) => p + 1)}
            className="p-1.5 rounded-lg hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            title="Next page"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </main>
  );
}
