import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, GraduationCap, Mail, Phone, MapPin } from 'lucide-react';

const STUDENTS_DB = {
  1: { id: 1, name: 'Adithya K', dept: 'Computer Science (CSE)', cgpa: 8.92, sem: 7, profile: 95, status: 'Placed', email: 'adithya.k@gce.edu.in', phone: '+91 98765 00001', address: 'Trichy', degree: 'B.E CSE', college: 'GCE Srirangam', year: '2022-2026', about: 'Passionate full-stack developer with expertise in React and Node.js.', skills: ['React', 'Node.js', 'Python', 'AWS'], company: 'Google', ctc: '24 LPA' },
  2: { id: 2, name: 'Priya M', dept: 'Electronics (ECE)', cgpa: 7.5, sem: 7, profile: 100, status: 'Active', email: 'priya.m@gce.edu.in', phone: '+91 98765 00002', address: 'Chennai', degree: 'B.E ECE', college: 'GCE Srirangam', year: '2022-2026', about: 'Electronics and embedded systems enthusiast with VLSI design experience.', skills: ['VLSI', 'Embedded C', 'MATLAB'], company: null, ctc: null },
  3: { id: 3, name: 'Rahul S', dept: 'Mechanical (MECH)', cgpa: 8.1, sem: 5, profile: 65, status: 'Pending', email: 'rahul.s@gce.edu.in', phone: '+91 98765 00003', address: 'Coimbatore', degree: 'B.E MECH', college: 'GCE Srirangam', year: '2023-2027', about: 'Mechanical engineering student interested in automotive and robotics.', skills: ['AutoCAD', 'SolidWorks', 'ANSYS'], company: null, ctc: null },
};

export default function AdminStudentDetail() {
  const { id } = useParams();
  const student = STUDENTS_DB[parseInt(id)];

  if (!student) {
    return (
      <main className="flex-1 flex items-center justify-center p-10">
        <div className="text-center text-gray-500">
          <p className="text-xl font-semibold mb-3">Student not found</p>
          <Link to="/admin/students" className="text-blue-600 hover:underline">← Back to Students</Link>
        </div>
      </main>
    );
  }

  return (
    <main className="flex-1 px-4 md:px-8 py-6 overflow-x-hidden">
      <Link to="/admin/students" className="inline-flex items-center gap-1.5 text-blue-600 text-sm hover:underline mb-5">
        <ArrowLeft className="w-4 h-4" /> Back to Students
      </Link>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-5">
          {/* Profile Header */}
          <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
            <div className="h-24 bg-gradient-to-r from-blue-500 to-indigo-400" />
            <div className="p-5 relative">
              <div className="absolute -top-10 left-5">
                <div className="w-20 h-20 rounded-full border-4 border-white bg-blue-600 flex items-center justify-center text-white text-2xl font-bold">
                  {student.name[0]}
                </div>
              </div>
              <div className="mt-12">
                <h2 className="text-xl font-bold">{student.name}</h2>
                <p className="text-gray-500 text-sm">{student.degree}</p>
                <p className="text-gray-400 text-xs flex items-center gap-1 mt-0.5">
                  <GraduationCap className="w-3.5 h-3.5" /> {student.college}
                </p>
                <div className="flex flex-wrap gap-2 mt-3">
                  {student.skills.map((s) => (
                    <span key={s} className="bg-blue-100 text-blue-700 text-xs px-3 py-1 rounded-full">{s}</span>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* About */}
          <div className="bg-white p-5 rounded-2xl shadow-sm">
            <h3 className="font-semibold mb-2">About</h3>
            <p className="text-gray-600 text-sm">{student.about}</p>
          </div>

          {/* Contact */}
          <div className="bg-white p-5 rounded-2xl shadow-sm">
            <h3 className="font-semibold mb-3">Contact Information</h3>
            <div className="space-y-2">
              <p className="flex items-center gap-2 text-sm text-gray-600"><Mail className="w-4 h-4 text-blue-500" /> {student.email}</p>
              <p className="flex items-center gap-2 text-sm text-gray-600"><Phone className="w-4 h-4 text-blue-500" /> {student.phone}</p>
              <p className="flex items-center gap-2 text-sm text-gray-600"><MapPin className="w-4 h-4 text-blue-500" /> {student.address}</p>
            </div>
          </div>
        </div>

        {/* Right */}
        <div className="space-y-4">
          <div className="bg-white rounded-xl p-5 shadow-sm">
            <h3 className="font-semibold text-sm mb-3">Academic Details</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-gray-500">Department</span><span className="font-medium">{student.dept}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">CGPA</span><span className="font-semibold text-blue-600">{student.cgpa}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Semester</span><span className="font-medium">{student.sem}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Batch</span><span className="font-medium">{student.year}</span></div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-5 shadow-sm">
            <h3 className="font-semibold text-sm mb-3">Placement Status</h3>
            <span className={`text-sm px-3 py-1 rounded-full ${student.status === 'Placed' ? 'bg-green-100 text-green-700' : student.status === 'Active' ? 'bg-blue-100 text-blue-700' : 'bg-yellow-100 text-yellow-700'}`}>
              {student.status}
            </span>
            {student.company && (
              <div className="mt-3 text-sm">
                <p className="text-gray-500">Placed at: <span className="font-semibold text-gray-900">{student.company}</span></p>
                <p className="text-gray-500">CTC: <span className="font-semibold text-green-600">{student.ctc}</span></p>
              </div>
            )}
          </div>

          <div className="bg-white rounded-xl p-5 shadow-sm">
            <h3 className="font-semibold text-sm mb-3">Profile Completion</h3>
            <div className="flex justify-between text-sm mb-1">
              <span className="text-gray-500">Completion</span>
              <span className="text-blue-600 font-medium">{student.profile}%</span>
            </div>
            <div className="w-full bg-gray-200 h-2 rounded">
              <div className="bg-blue-600 h-2 rounded" style={{ width: `${student.profile}%` }} />
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
