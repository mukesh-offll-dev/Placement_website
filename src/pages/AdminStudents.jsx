import { useState, useEffect } from 'react';
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
  RefreshCw,
} from 'lucide-react';
import { getAllStudents } from '../services/api/adminService';

const DEPTS = [
  'All',
  'Computer Science (CSE)',
  'Electronics (ECE)',
  'Mechanical (MECH)',
  'Civil Engineering',
  'Electrical (EEE)',
  'Information Technology',
];

const profileBarColor = (p) => {
  if (p >= 90) return 'bg-green-500';
  if (p >= 80) return 'bg-blue-500';
  if (p >= 70) return 'bg-yellow-500';
  return 'bg-orange-400';
};

const statusBadge = (s) => {
  const map = {
    PLACED: 'bg-green-100 text-green-700',
    Placed: 'bg-green-100 text-green-700',
    ACTIVE: 'bg-blue-100 text-blue-700',
    Active: 'bg-blue-100 text-blue-700',
    PENDING: 'bg-yellow-100 text-yellow-700',
    Pending: 'bg-yellow-100 text-yellow-700',
    UNPLACED: 'bg-gray-100 text-gray-700',
  };
  return map[s] || 'bg-gray-100 text-gray-600';
};

const PAGE_SIZE = 5;

export default function AdminStudents() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [deptFilter, setDeptFilter] = useState('All');
  const [cgpaFilter, setCgpaFilter] = useState('All');
  const [page, setPage] = useState(1);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchStudents = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getAllStudents();
      const mapped = (Array.isArray(data) ? data : []).map((s) => ({
        id: s.id,
        name: s.fullName || 'Student',
        dept: s.department || (s.departmentCode ? `${s.departmentCode} Dept` : 'General'),
        cgpa: s.cgpa ? Number(s.cgpa) : 0,
        sem: s.semester ? `Sem ${s.semester}` : 'N/A',
        profile: s.profileCompletionPercent ?? 75,
        status: s.placementStatus || 'PENDING',
        email: s.email,
        rollNo: s.rollNo,
      }));
      setStudents(mapped);
    } catch (err) {
      setError(err.message || 'Failed to fetch registered students from backend.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStudents();
  }, []);

  const filtered = students.filter((s) => {
    const matchSearch =
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.dept.toLowerCase().includes(search.toLowerCase()) ||
      (s.rollNo && s.rollNo.toLowerCase().includes(search.toLowerCase()));
    const matchDept = deptFilter === 'All' || s.dept.toLowerCase().includes(deptFilter.toLowerCase());
    const matchCgpa = cgpaFilter === 'All' || s.cgpa >= parseFloat(cgpaFilter);
    return matchSearch && matchDept && matchCgpa;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const handleDelete = (id) => {
    if (window.confirm('Remove this student from the current view?')) {
      setStudents((prev) => prev.filter((s) => s.id !== id));
    }
  };

  const clearFilters = () => {
    setSearch('');
    setDeptFilter('All');
    setCgpaFilter('All');
    setPage(1);
  };

  // Stats calculation
  const totalCount = students.length;
  const placedCount = students.filter((s) => s.status === 'PLACED' || s.status === 'Placed').length;
  const pendingCount = students.filter((s) => s.status === 'PENDING' || s.status === 'Pending').length;

  return (
    <main className="flex-1 px-4 md:px-8 py-6 overflow-x-hidden">
      <h2 className="text-2xl font-bold mb-1 text-gray-900">Student Directory & Records</h2>
      <p className="text-gray-500 text-sm mb-6">
        View, search, and manage registered students in the GCES Placement Portal.
      </p>

      {/* Error state */}
      {error && (
        <div className="flex items-center justify-between p-4 bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl mb-6">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <span>{error}</span>
          </div>
          <button
            onClick={fetchStudents}
            className="flex items-center gap-1.5 bg-red-100 hover:bg-red-200 text-red-800 px-3 py-1.5 rounded-lg text-xs font-semibold transition"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Retry
          </button>
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
          <p className="text-gray-500 text-sm">Registered Students</p>
          <p className="text-3xl font-bold mt-1 text-gray-900">{totalCount}</p>
          <p className="text-blue-500 text-xs mt-1">Total active profiles</p>
        </div>
        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
          <p className="text-gray-500 text-sm">Placed Students</p>
          <p className="text-3xl font-bold mt-1 text-green-600">{placedCount}</p>
          <p className="text-green-600 text-xs mt-1">
            {totalCount > 0 ? `${Math.round((placedCount / totalCount) * 100)}% Placement Rate` : 'No data'}
          </p>
        </div>
        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
          <p className="text-gray-500 text-sm">Pending Verification</p>
          <p className="text-3xl font-bold mt-1 text-yellow-600">{pendingCount}</p>
          <p className="text-yellow-600 text-xs mt-1">Follow-up required</p>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 mb-4 flex flex-col md:flex-row md:items-center gap-3 flex-wrap">
        <span className="text-gray-500 text-sm shrink-0">Filters:</span>

        <select
          value={deptFilter}
          onChange={(e) => {
            setDeptFilter(e.target.value);
            setPage(1);
          }}
          className="border border-gray-300 px-3 py-1.5 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {DEPTS.map((d) => (
            <option key={d} value={d}>
              {d === 'All' ? 'Department: All' : d}
            </option>
          ))}
        </select>

        <select
          value={cgpaFilter}
          onChange={(e) => {
            setCgpaFilter(e.target.value);
            setPage(1);
          }}
          className="border border-gray-300 px-3 py-1.5 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="All">CGPA: All</option>
          <option value="9">CGPA ≥ 9.0</option>
          <option value="8">CGPA ≥ 8.0</option>
          <option value="7">CGPA ≥ 7.0</option>
        </select>

        {(deptFilter !== 'All' || cgpaFilter !== 'All' || search) && (
          <button onClick={clearFilters} className="text-blue-600 text-sm hover:underline">
            Clear all filters
          </button>
        )}

        <div className="md:ml-auto flex gap-2">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search by name, roll..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="border border-gray-300 pl-9 pr-4 py-1.5 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-52"
            />
          </div>
          <button
            onClick={() => {
              const csvContent =
                'data:text/csv;charset=utf-8,' +
                ['Name,Department,CGPA,Semester,Status']
                  .concat(students.map((s) => `"${s.name}","${s.dept}",${s.cgpa},"${s.sem}","${s.status}"`))
                  .join('\n');
              const encodedUri = encodeURI(csvContent);
              const link = document.createElement('a');
              link.setAttribute('href', encodedUri);
              link.setAttribute('download', 'students_directory.csv');
              document.body.appendChild(link);
              link.click();
              document.body.removeChild(link);
            }}
            className="flex items-center gap-1.5 bg-blue-600 text-white px-4 py-1.5 rounded-lg text-sm hover:bg-blue-700 transition shadow-sm font-medium"
          >
            <Download className="w-4 h-4" /> Export CSV
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-x-auto">
        <div className="min-w-[700px]">
          <div className="grid grid-cols-6 px-4 py-3 bg-gray-50 text-xs font-semibold text-gray-600 border-b">
            <div>Student Name</div>
            <div>Department</div>
            <div>CGPA</div>
            <div>Semester</div>
            <div>Profile Completion</div>
            <div>Actions</div>
          </div>

          {loading ? (
            <div className="py-12 flex flex-col items-center justify-center text-gray-500">
              <Loader2 className="w-6 h-6 animate-spin text-blue-600 mb-2" />
              <span className="text-xs">Loading students from backend...</span>
            </div>
          ) : paginated.length === 0 ? (
            <div className="py-12 text-center text-gray-400">
              {students.length === 0 ? 'No registered students found in backend database.' : 'No students matching the filter criteria.'}
            </div>
          ) : (
            paginated.map((s) => (
              <div
                key={s.id}
                className="grid grid-cols-6 px-4 py-3 border-b items-center hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <div className="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center font-bold text-blue-700 text-sm shrink-0">
                    {s.name[0]}
                  </div>
                  <div>
                    <p className="font-medium text-sm text-gray-900">{s.name}</p>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${statusBadge(s.status)}`}>
                      {s.status}
                    </span>
                  </div>
                </div>
                <div className="text-sm text-gray-600">{s.dept}</div>
                <div className="font-semibold text-sm">{s.cgpa > 0 ? s.cgpa : 'N/A'}</div>
                <div className="text-sm text-gray-700">{s.sem}</div>
                <div>
                  <div className="w-full bg-gray-200 h-2 rounded">
                    <div
                      className={`h-2 rounded ${profileBarColor(s.profile)}`}
                      style={{ width: `${s.profile}%` }}
                    />
                  </div>
                  <span className="text-xs text-gray-500 mt-0.5 block">{s.profile}%</span>
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={() => navigate(`/admin/students/${s.id}`)}
                    className="flex items-center gap-1 text-blue-600 hover:underline text-xs font-semibold"
                  >
                    <Eye className="w-3.5 h-3.5" /> View Profile
                  </button>
                  <button
                    onClick={() => handleDelete(s.id)}
                    className="flex items-center gap-1 text-red-500 hover:underline text-xs font-medium"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Remove
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Pagination */}
      {!loading && filtered.length > 0 && (
        <div className="flex justify-between items-center mt-4 text-sm text-gray-500">
          <p>
            Showing {Math.min((page - 1) * PAGE_SIZE + 1, filtered.length)}–
            {Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length} students
          </p>
          <div className="flex items-center gap-1">
            <button
              disabled={page === 1}
              onClick={() => setPage((p) => p - 1)}
              className="p-1.5 rounded hover:bg-gray-200 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => i + 1).map((p) => (
              <button
                key={p}
                onClick={() => setPage(p)}
                className={`w-8 h-8 rounded text-sm ${
                  page === p ? 'bg-blue-600 text-white font-bold' : 'hover:bg-gray-200'
                }`}
              >
                {p}
              </button>
            ))}
            <button
              disabled={page === totalPages}
              onClick={() => setPage((p) => p + 1)}
              className="p-1.5 rounded hover:bg-gray-200 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
