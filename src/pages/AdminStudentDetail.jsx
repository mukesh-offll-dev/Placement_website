import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ArrowLeft,
  GraduationCap,
  Mail,
  Phone,
  MapPin,
  FileText,
  Eye,
  Download,
  Loader2,
} from 'lucide-react';
import {
  getStudentResume,
  getResumeViewUrl,
  getResumeDownloadUrl,
  formatFileSize,
} from '../services/fileUploadService';

const STUDENTS_DB = {
  1: {
    id: 1,
    name: 'Adithya K',
    dept: 'Computer Science (CSE)',
    cgpa: 8.92,
    sem: 7,
    profile: 95,
    status: 'Placed',
    email: 'adithya.k@gce.edu.in',
    phone: '+91 98765 00001',
    address: 'Trichy',
    degree: 'B.E CSE',
    college: 'GCE Srirangam',
    year: '2022-2026',
    about: 'Passionate full-stack developer with expertise in React and Node.js.',
    skills: ['React', 'Node.js', 'Python', 'AWS'],
    company: 'Google',
    ctc: '24 LPA',
  },
  2: {
    id: 2,
    name: 'Priya M',
    dept: 'Electronics (ECE)',
    cgpa: 7.5,
    sem: 7,
    profile: 100,
    status: 'Active',
    email: 'priya.m@gce.edu.in',
    phone: '+91 98765 00002',
    address: 'Chennai',
    degree: 'B.E ECE',
    college: 'GCE Srirangam',
    year: '2022-2026',
    about: 'Electronics and embedded systems enthusiast with VLSI design experience.',
    skills: ['VLSI', 'Embedded C', 'MATLAB'],
    company: null,
    ctc: null,
  },
  3: {
    id: 3,
    name: 'Rahul S',
    dept: 'Mechanical (MECH)',
    cgpa: 8.1,
    sem: 5,
    profile: 65,
    status: 'Pending',
    email: 'rahul.s@gce.edu.in',
    phone: '+91 98765 00003',
    address: 'Coimbatore',
    degree: 'B.E MECH',
    college: 'GCE Srirangam',
    year: '2023-2027',
    about: 'Mechanical engineering student interested in automotive and robotics.',
    skills: ['AutoCAD', 'SolidWorks', 'ANSYS'],
    company: null,
    ctc: null,
  },
};

export default function AdminStudentDetail() {
  const { id } = useParams();
  const studentId = parseInt(id);
  const student = STUDENTS_DB[studentId];

  const [resume, setResume] = useState(null);
  const [loadingResume, setLoadingResume] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const loadResumeData = async () => {
      setLoadingResume(true);

      // 1. Try to fetch from backend API
      const res = await getStudentResume(studentId);
      if (isMounted && res.success && res.data) {
        setResume({
          fileName: res.data.fileName || 'Student_Resume.pdf',
          fileSize: res.data.fileSize,
          uploadedAt: res.data.uploadedAt,
          status: res.data.status,
          viewUrl: res.data.resumeUrl || getResumeViewUrl(studentId),
          downloadUrl: res.data.downloadUrl || getResumeDownloadUrl(studentId),
        });
        setLoadingResume(false);
        return;
      }

      // 2. Check localStorage cache
      const cached = localStorage.getItem(`student_resume_${studentId}`);
      if (isMounted) {
        if (cached) {
          try {
            const parsed = JSON.parse(cached);
            setResume({
              fileName: parsed.fileName || 'Student_Resume.pdf',
              fileSize: parsed.fileSize,
              uploadedAt: parsed.uploadedAt,
              status: parsed.status,
              viewUrl: parsed.url || getResumeViewUrl(studentId),
              downloadUrl: getResumeDownloadUrl(studentId),
            });
          } catch {
            setResume(null);
          }
        } else if (studentId === 1) {
          // Default mock resume for student 1 if neither backend nor localStorage has updated
          setResume({
            fileName: 'Adithya_K_Resume.pdf',
            fileSize: 1450000,
            uploadedAt: '2026-09-10T14:30:00Z',
            status: 'VERIFIED',
            viewUrl: getResumeViewUrl(studentId),
            downloadUrl: getResumeDownloadUrl(studentId),
          });
        } else {
          setResume(null);
        }
        setLoadingResume(false);
      }
    };

    if (studentId) {
      loadResumeData();
    }
    return () => {
      isMounted = false;
    };
  }, [studentId]);

  if (!student) {
    return (
      <main className="flex-1 flex items-center justify-center p-10">
        <div className="text-center text-gray-500">
          <p className="text-xl font-semibold mb-3">Student not found</p>
          <Link to="/admin/students" className="text-blue-600 hover:underline">
            ← Back to Students
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="flex-1 px-4 md:px-8 py-6 overflow-x-hidden">
      <Link
        to="/admin/students"
        className="inline-flex items-center gap-1.5 text-blue-600 text-sm hover:underline mb-5"
      >
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
                    <span
                      key={s}
                      className="bg-blue-100 text-blue-700 text-xs px-3 py-1 rounded-full"
                    >
                      {s}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Resume Section */}
          <div className="bg-white p-5 rounded-2xl shadow-sm">
            <h3 className="font-semibold text-lg text-gray-900 mb-3">Resume</h3>
            {loadingResume ? (
              <div className="flex items-center gap-2 text-sm text-gray-500 py-3">
                <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                <span>Loading resume details...</span>
              </div>
            ) : resume ? (
              <div className="border border-gray-200 rounded-xl p-4 bg-gray-50/50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="bg-blue-100 p-2.5 rounded-xl text-blue-600">
                    <FileText className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="font-semibold text-sm text-gray-900 break-all">
                      {resume.fileName}
                    </p>
                    <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500 mt-0.5">
                      {resume.fileSize && (
                        <span>{formatFileSize(resume.fileSize)}</span>
                      )}
                      {resume.fileSize && resume.uploadedAt && <span>•</span>}
                      {resume.uploadedAt && (
                        <span>
                          Uploaded{' '}
                          {new Date(resume.uploadedAt).toLocaleDateString()}
                        </span>
                      )}
                      {resume.status && (
                        <>
                          <span>•</span>
                          <span
                            className={`px-2 py-0.5 rounded-full font-medium text-[10px] ${
                              resume.status === 'VERIFIED'
                                ? 'bg-green-100 text-green-700'
                                : resume.status === 'REJECTED'
                                ? 'bg-red-100 text-red-700'
                                : 'bg-yellow-100 text-yellow-700'
                            }`}
                          >
                            {resume.status}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                  <a
                    href={resume.viewUrl || getResumeViewUrl(studentId)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 border border-blue-200 px-3.5 py-2 rounded-lg transition-colors shadow-sm"
                  >
                    <Eye className="w-3.5 h-3.5" /> View Resume
                  </a>
                  <a
                    href={resume.downloadUrl || getResumeDownloadUrl(studentId)}
                    download={resume.fileName || 'Resume.pdf'}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 px-3.5 py-2 rounded-lg transition-colors shadow-sm"
                  >
                    <Download className="w-3.5 h-3.5" /> Download Resume
                  </a>
                </div>
              </div>
            ) : (
              <div className="p-4 rounded-xl border border-dashed border-gray-200 text-center text-gray-500 bg-gray-50/40">
                <p className="text-sm font-medium text-gray-700">No resume uploaded</p>
                <p className="text-xs text-gray-400 mt-0.5">
                  The student has not uploaded a resume yet.
                </p>
              </div>
            )}
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
              <p className="flex items-center gap-2 text-sm text-gray-600">
                <Mail className="w-4 h-4 text-blue-500" /> {student.email}
              </p>
              <p className="flex items-center gap-2 text-sm text-gray-600">
                <Phone className="w-4 h-4 text-blue-500" /> {student.phone}
              </p>
              <p className="flex items-center gap-2 text-sm text-gray-600">
                <MapPin className="w-4 h-4 text-blue-500" /> {student.address}
              </p>
            </div>
          </div>
        </div>

        {/* Right */}
        <div className="space-y-4">
          <div className="bg-white rounded-xl p-5 shadow-sm">
            <h3 className="font-semibold text-sm mb-3">Academic Details</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Department</span>
                <span className="font-medium">{student.dept}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">CGPA</span>
                <span className="font-semibold text-blue-600">{student.cgpa}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Semester</span>
                <span className="font-medium">{student.sem}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Batch</span>
                <span className="font-medium">{student.year}</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-5 shadow-sm">
            <h3 className="font-semibold text-sm mb-3">Placement Status</h3>
            <span
              className={`text-sm px-3 py-1 rounded-full ${
                student.status === 'Placed'
                  ? 'bg-green-100 text-green-700'
                  : student.status === 'Active'
                  ? 'bg-blue-100 text-blue-700'
                  : 'bg-yellow-100 text-yellow-700'
              }`}
            >
              {student.status}
            </span>
            {student.company && (
              <div className="mt-3 text-sm">
                <p className="text-gray-500">
                  Placed at:{' '}
                  <span className="font-semibold text-gray-900">
                    {student.company}
                  </span>
                </p>
                <p className="text-gray-500">
                  CTC:{' '}
                  <span className="font-semibold text-green-600">
                    {student.ctc}
                  </span>
                </p>
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
              <div
                className="bg-blue-600 h-2 rounded"
                style={{ width: `${student.profile}%` }}
              />
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
