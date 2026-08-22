import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Download, Eye, Trash2, ChevronLeft, ChevronRight } from 'lucide-react';
import Navbar from '../components/Navbar';
import AdminSidebar from '../components/AdminSidebar';

const ALL_STUDENTS = [
  { id: 1, name: 'Adithya K', dept: 'Computer Science (CSE)', cgpa: 8.92, sem: 7, profile: 95, status: 'Placed' },
  { id: 2, name: 'Priya M', dept: 'Electronics (ECE)', cgpa: 7.5, sem: 7, profile: 100, status: 'Active' },
  { id: 3, name: 'Rahul S', dept: 'Mechanical (MECH)', cgpa: 8.1, sem: 5, profile: 65, status: 'Pending' },
  { id: 4, name: 'Sneha R', dept: 'Civil Engineering', cgpa: 7.85, sem: 7, profile: 85, status: 'Active' },
  { id: 5, name: 'Vijay T', dept: 'Electrical (EEE)', cgpa: 9.1, sem: 7, profile: 100, status: 'Placed' },
  { id: 6, name: 'Arun P', dept: 'Computer Science (CSE)', cgpa: 8.3, sem: 7, profile: 78, status: 'Active' },
  { id: 7, name: 'Kavitha L', dept: 'Electronics (ECE)', cgpa: 7.2, sem: 5, profile: 60, status: 'Pending' },
  { id: 8, name: 'Surya V', dept: 'Information Technology', cgpa: 8.7, sem: 7, profile: 90, status: 'Active' },
];

const DEPTS = ['All', 'Computer Science (CSE)', 'Electronics (ECE)', 'Mechanical (MECH)', 'Civil Engineering', 'Electrical (EEE)', 'Information Technology'];

const profileBarColor = (p) => {
  if (p >= 90) return 'bg-green-500';
  if (p >= 80) return 'bg-blue-500';
  if (p >= 70) return 'bg-yellow-500';
  return 'bg-orange-400';
};

const statusBadge = (s) => {
  const map = {
    Placed: 'bg-green-100 text-green-700',
    Active: 'bg-blue-100 text-blue-700',
    Pending: 'bg-yellow-100 text-yellow-700',
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
  const [students, setStudents] = useState(ALL_STUDENTS);

  const filtered = students.filter((s) => {
    const matchSearch = s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.dept.toLowerCase().includes(search.toLowerCase());
    const matchDept = deptFilter === 'All' || s.dept === deptFilter;
    const matchCgpa = cgpaFilter === 'All' || s.cgpa >= parseFloat(cgpaFilter);
    return matchSearch && matchDept && matchCgpa;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const handleDelete = (id) => {
    if (window.confirm('Delete this student?')) {
      setStudents((prev) => prev.filter((s) => s.id !== id));
    }
  };

  const clearFilters = () => {
    setSearch('');
    setDeptFilter('All');
    setCgpaFilter('All');
    setPage(1);
  };

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      <Navbar variant="admin" />

      <div className="flex flex-1">
        <AdminSidebar />

        <main className="flex-1 px-4 md:px-8 py-6 overflow-x-hidden">
          <h2 className="text-2xl font-bold mb-1">Student Management</h2>
          <p className="text-gray-500 text-sm mb-6">
            View, search, and manage all registered students.
          </p>

          {/* Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
            <div className="bg-white rounded-xl p-5 shadow-sm">
              <p className="text-gray-500 text-sm">Eligible Students</p>
              <p className="text-3xl font-bold mt-1">342</p>
              <p className="text-green-500 text-xs mt-1">↑ 12 from last cycle</p>
            </div>
            <div className="bg-white rounded-xl p-5 shadow-sm">
              <p className="text-gray-500 text-sm">Placed Students</p>
              <p className="text-3xl font-bold mt-1">128</p>
              <p className="text-blue-500 text-xs mt-1">37.4% Success Rate</p>
            </div>
            <div className="bg-white rounded-xl p-5 shadow-sm">
              <p className="text-gray-500 text-sm">Pending Profiles</p>
              <p className="text-3xl font-bold mt-1">56</p>
              <p className="text-yellow-500 text-xs mt-1">Follow-up required</p>
            </div>
          </div>

          {/* Filter Bar */}
          <div className="bg-white rounded-xl p-4 shadow-sm mb-4 flex flex-col md:flex-row md:items-center gap-3 flex-wrap">
            <span className="text-gray-500 text-sm shrink-0">Filters:</span>

            <select
              value={deptFilter}
              onChange={(e) => { setDeptFilter(e.target.value); setPage(1); }}
              className="border border-gray-300 px-3 py-1.5 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {DEPTS.map((d) => (
                <option key={d} value={d}>{d === 'All' ? 'Department: All' : d}</option>
              ))}
            </select>

            <select
              value={cgpaFilter}
              onChange={(e) => { setCgpaFilter(e.target.value); setPage(1); }}
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
                  placeholder="Search students..."
                  value={search}
                  onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                  className="border border-gray-300 pl-9 pr-4 py-1.5 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-48"
                />
              </div>
              <button className="flex items-center gap-1.5 bg-blue-600 text-white px-4 py-1.5 rounded-lg text-sm hover:bg-blue-700 transition-colors">
                <Download className="w-4 h-4" /> Export CSV
              </button>
            </div>
          </div>

          {/* Table */}
          <div className="bg-white rounded-xl shadow-sm overflow-x-auto">
            <div className="min-w-[700px]">
              <div className="grid grid-cols-6 px-4 py-3 bg-gray-50 text-xs font-semibold text-gray-600 border-b">
                <div>Student Name</div>
                <div>Department</div>
                <div>CGPA</div>
                <div>Semester</div>
                <div>Profile Completion</div>
                <div>Actions</div>
              </div>

              {paginated.length === 0 ? (
                <div className="py-12 text-center text-gray-400">No students found.</div>
              ) : (
                paginated.map((s) => (
                  <div key={s.id} className="grid grid-cols-6 px-4 py-3 border-b items-center hover:bg-gray-50 transition-colors">
                    <div className="flex items-center gap-2">
                      <div className="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center font-bold text-blue-700 text-sm shrink-0">
                        {s.name[0]}
                      </div>
                      <div>
                        <p className="font-medium text-sm">{s.name}</p>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${statusBadge(s.status)}`}>
                          {s.status}
                        </span>
                      </div>
                    </div>
                    <div className="text-sm text-gray-600">{s.dept}</div>
                    <div className="font-semibold text-sm">{s.cgpa}</div>
                    <div className="text-sm">{s.sem}</div>
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
                        className="flex items-center gap-1 text-blue-600 hover:underline text-xs"
                      >
                        <Eye className="w-3.5 h-3.5" /> View
                      </button>
                      <button
                        onClick={() => handleDelete(s.id)}
                        className="flex items-center gap-1 text-red-500 hover:underline text-xs"
                      >
                        <Trash2 className="w-3.5 h-3.5" /> Delete
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Pagination */}
          <div className="flex justify-between items-center mt-4 text-sm text-gray-500">
            <p>
              Showing {Math.min((page - 1) * PAGE_SIZE + 1, filtered.length)}–{Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length} students
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
                  className={`w-8 h-8 rounded text-sm ${page === p ? 'bg-blue-600 text-white' : 'hover:bg-gray-200'}`}
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
        </main>
      </div>
    </div>
  );
}
