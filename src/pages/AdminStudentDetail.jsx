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
  AlertCircle,
  Building2,
  CheckCircle2,
  Award,
} from 'lucide-react';
import { getStudentById } from '../services/api/adminService';
import {
  getStudentResume,
  getResumeViewUrl,
  getResumeDownloadUrl,
  formatFileSize,
} from '../services/fileUploadService';

export default function AdminStudentDetail() {
  const { id } = useParams();
  const studentId = parseInt(id, 10);

  const [student, setStudent] = useState(null);
  const [loadingStudent, setLoadingStudent] = useState(true);
  const [resume, setResume] = useState(null);
  const [loadingResume, setLoadingResume] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let isMounted = true;

    const loadData = async () => {
      setLoadingStudent(true);
      setError(null);

      try {
        const studentData = await getStudentById(studentId);
        if (isMounted) {
          if (studentData) {
            setStudent({
              id: studentData.id,
              name: studentData.fullName || 'Student',
              dept: studentData.department || (studentData.departmentCode ? `${studentData.departmentCode} Dept` : 'General'),
              cgpa: studentData.cgpa ? Number(studentData.cgpa) : null,
              sem: studentData.semester || 'N/A',
              profile: studentData.profileCompletionPercent ?? 75,
              status: studentData.placementStatus || 'PENDING',
              email: studentData.email,
              phone: studentData.phone || 'Not provided',
              address: studentData.address || 'Not provided',
              degree: studentData.degree || 'B.E Engineering',
              college: studentData.college || 'Government College of Engineering, Srirangam',
              year: studentData.batch || '2022-2026',
              rollNo: studentData.rollNo || 'N/A',
              about: studentData.about || 'Student has not filled their summary yet.',
              skills: ['Computer Science', 'Technical Problem Solving'],
            });
          } else {
            setError('Student profile not found in backend records.');
          }
        }
      } catch (err) {
        if (isMounted) {
          setError(err.message || 'Error loading student profile.');
        }
      } finally {
        if (isMounted) {
          setLoadingStudent(false);
        }
      }

      // Fetch resume
      setLoadingResume(true);
      try {
        const res = await getStudentResume(studentId);
        if (isMounted && res.success && res.data) {
          setResume({
            fileName: res.data.fileName || 'Student_Resume.pdf',
            fileSize: res.data.fileSize,
            uploadedAt: res.data.uploadedAt,
            status: res.data.status || 'VERIFIED',
            viewUrl: res.data.downloadUrl || res.data.resumeUrl || getResumeViewUrl(studentId),
            downloadUrl: res.data.downloadUrl || getResumeDownloadUrl(studentId),
          });
        } else {
          setResume(null);
        }
      } catch {
        if (isMounted) setResume(null);
      } finally {
        if (isMounted) setLoadingResume(false);
      }
    };

    if (studentId) {
      loadData();
    }

    return () => {
      isMounted = false;
    };
  }, [studentId]);

  if (loadingStudent) {
    return (
      <main className="flex-1 flex flex-col items-center justify-center p-12">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin mb-3" />
        <p className="text-gray-500 text-sm">Loading student profile from backend...</p>
      </main>
    );
  }

  if (error || !student) {
    return (
      <main className="flex-1 flex items-center justify-center p-10">
        <div className="text-center text-gray-500 max-w-sm">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-3" />
          <p className="text-xl font-semibold mb-2 text-gray-800">
            {error || 'Student not found'}
          </p>
          <p className="text-xs text-gray-400 mb-5">
            Unable to locate student with ID {studentId} in the Placement Cell system.
          </p>
          <Link
            to="/admin/students"
            className="inline-flex items-center gap-1.5 bg-blue-600 text-white text-xs font-semibold px-4 py-2 rounded-xl hover:bg-blue-700 transition"
          >
            ← Back to Students Directory
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="flex-1 px-4 md:px-8 py-6 overflow-x-hidden">
      <Link
        to="/admin/students"
        className="inline-flex items-center gap-1.5 text-blue-600 text-sm hover:underline mb-5 font-medium"
      >
        <ArrowLeft className="w-4 h-4" /> Back to Students
      </Link>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-5">
          {/* Profile Header */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="h-28 bg-gradient-to-r from-blue-600 to-indigo-600" />
            <div className="p-5 relative">
              <div className="absolute -top-12 left-5">
                <div className="w-20 h-20 rounded-full border-4 border-white bg-blue-600 flex items-center justify-center text-white text-2xl font-bold shadow-md">
                  {student.name[0]}
                </div>
              </div>
              <div className="mt-10">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">{student.name}</h2>
                    <p className="text-gray-600 text-sm">{student.degree}</p>
                    <p className="text-gray-400 text-xs flex items-center gap-1 mt-0.5">
                      <GraduationCap className="w-3.5 h-3.5 text-blue-500" /> {student.college}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-xs px-2.5 py-1 rounded-full font-bold uppercase tracking-wider ${
                        student.status === 'PLACED' || student.status === 'Placed'
                          ? 'bg-green-100 text-green-700'
                          : 'bg-blue-100 text-blue-700'
                      }`}
                    >
                      {student.status}
                    </span>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 mt-4 pt-3 border-t border-gray-100">
                  <span className="text-xs bg-gray-100 text-gray-700 px-2.5 py-1 rounded-full font-medium">
                    Roll No: {student.rollNo}
                  </span>
                  <span className="text-xs bg-blue-50 text-blue-700 px-2.5 py-1 rounded-full font-medium">
                    {student.dept}
                  </span>
                  {student.cgpa && (
                    <span className="text-xs bg-green-50 text-green-700 px-2.5 py-1 rounded-full font-medium">
                      CGPA: {student.cgpa}
                    </span>
                  )}
                  {student.sem && (
                    <span className="text-xs bg-purple-50 text-purple-700 px-2.5 py-1 rounded-full font-medium">
                      Sem: {student.sem}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Resume Section */}
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
            <h3 className="font-semibold text-lg text-gray-900 mb-3">Student Resume</h3>
            {loadingResume ? (
              <div className="flex items-center gap-2 text-sm text-gray-500 py-3">
                <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                <span>Loading resume details from backend...</span>
              </div>
            ) : resume ? (
              <div className="border border-gray-200 rounded-xl p-4 bg-gray-50/70 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="bg-blue-100 p-2.5 rounded-xl text-blue-600">
                    <FileText className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="font-semibold text-sm text-gray-900 break-all">
                      {resume.fileName}
                    </p>
                    <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500 mt-0.5">
                      {resume.fileSize && <span>{formatFileSize(resume.fileSize)}</span>}
                      {resume.fileSize && resume.uploadedAt && <span>•</span>}
                      {resume.uploadedAt && (
                        <span>Uploaded {new Date(resume.uploadedAt).toLocaleDateString()}</span>
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
                  {resume.viewUrl && (
                    <a
                      href={resume.viewUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-700 bg-white hover:bg-gray-100 border border-gray-200 px-3 py-1.5 rounded-lg transition"
                    >
                      <Eye className="w-3.5 h-3.5" /> View
                    </a>
                  )}
                  {resume.downloadUrl && (
                    <a
                      href={resume.downloadUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 border border-blue-200 px-3 py-1.5 rounded-lg transition"
                    >
                      <Download className="w-3.5 h-3.5" /> Download
                    </a>
                  )}
                </div>
              </div>
            ) : (
              <div className="border border-dashed border-gray-300 rounded-xl p-6 text-center bg-gray-50/50">
                <FileText className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                <p className="text-sm font-medium text-gray-600">No Resume Uploaded</p>
                <p className="text-xs text-gray-400 mt-0.5">
                  The student has not yet uploaded a resume file.
                </p>
              </div>
            )}
          </div>

          {/* Academic & Contact Details */}
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
            <h3 className="font-semibold text-lg text-gray-900 mb-3">Profile Information</h3>
            <div className="grid sm:grid-cols-2 gap-4 text-sm">
              <div className="space-y-2">
                <p className="flex items-center gap-2 text-gray-600">
                  <Mail className="w-4 h-4 text-blue-500 shrink-0" /> {student.email}
                </p>
                <p className="flex items-center gap-2 text-gray-600">
                  <Phone className="w-4 h-4 text-blue-500 shrink-0" /> {student.phone}
                </p>
                <p className="flex items-center gap-2 text-gray-600">
                  <MapPin className="w-4 h-4 text-blue-500 shrink-0" /> {student.address}
                </p>
              </div>
              <div className="space-y-2">
                <p className="text-gray-600">
                  <span className="font-medium text-gray-700">Batch:</span> {student.year}
                </p>
                <p className="text-gray-600">
                  <span className="font-medium text-gray-700">Department:</span> {student.dept}
                </p>
                <p className="text-gray-600">
                  <span className="font-medium text-gray-700">CGPA:</span>{' '}
                  {student.cgpa !== null ? student.cgpa : 'N/A'}
                </p>
              </div>
            </div>

            <div className="mt-4 pt-4 border-t border-gray-100">
              <p className="text-xs font-semibold text-gray-500 uppercase mb-1">About</p>
              <p className="text-sm text-gray-700 leading-relaxed">{student.about}</p>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-5">
          {/* Profile Completion */}
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
            <div className="flex justify-between text-sm font-semibold mb-2">
              <span className="text-gray-900">Profile Completion</span>
              <span className="text-blue-600">{student.profile}%</span>
            </div>
            <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
              <div
                className="bg-blue-600 h-full rounded-full"
                style={{ width: `${student.profile}%` }}
              />
            </div>
          </div>

          {/* Placement Status */}
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
            <h3 className="font-semibold text-sm text-gray-900 mb-3">Placement Verification</h3>
            <div
              className={`p-3 rounded-xl border ${
                student.status === 'PLACED' || student.status === 'Placed'
                  ? 'bg-green-50 border-green-200 text-green-800'
                  : 'bg-blue-50 border-blue-200 text-blue-800'
              }`}
            >
              <div className="flex items-center gap-2 font-bold text-sm">
                <Award className="w-4 h-4" />
                <span>{student.status}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
