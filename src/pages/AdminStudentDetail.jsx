import { useState, useEffect, useCallback } from 'react';
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
  CheckCircle2,
  Building2,
  Briefcase,
  FolderGit2,
  ExternalLink,
  ShieldCheck,
  Check,
} from 'lucide-react';
import { getStudentById, updateStudent } from '../services/api/adminService';
import {
  getStudentResume,
  getResumeViewUrl,
  getResumeDownloadUrl,
  formatFileSize,
} from '../services/fileUploadService';

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

export default function AdminStudentDetail() {
  const { id } = useParams();
  const [student, setStudent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Resume state
  const [resume, setResume] = useState(null);
  const [loadingResume, setLoadingResume] = useState(true);

  // Status edit state
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [statusFeedback, setStatusFeedback] = useState(null);

  // Load student details from real backend
  const fetchStudentData = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const data = await getStudentById(id);
      setStudent(data);
    } catch (err) {
      console.error('Failed to load student details:', err);
      setError(err.message || 'Student profile not found or server error.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchStudentData();
  }, [fetchStudentData]);

  // Load resume data
  useEffect(() => {
    if (!id) return;
    let isMounted = true;

    const loadResumeData = async () => {
      setLoadingResume(true);
      try {
        const res = await getStudentResume(id);
        if (isMounted && res.success && res.data) {
          setResume({
            fileName: res.data.fileName || 'Student_Resume.pdf',
            fileSize: res.data.fileSize,
            uploadedAt: res.data.uploadedAt,
            status: res.data.status,
            viewUrl: res.data.resumeUrl || getResumeViewUrl(id),
            downloadUrl: res.data.downloadUrl || getResumeDownloadUrl(id),
          });
          setLoadingResume(false);
          return;
        }
      } catch (e) {
        // Fallback check
      }

      // Check if student object already has resumeUrl
      if (isMounted) {
        if (student?.resumeUrl) {
          setResume({
            fileName: 'Student_Resume.pdf',
            viewUrl: student.resumeUrl,
            downloadUrl: getResumeDownloadUrl(id),
          });
        } else {
          setResume(null);
        }
        setLoadingResume(false);
      }
    };

    loadResumeData();

    return () => {
      isMounted = false;
    };
  }, [id, student?.resumeUrl]);

  // Handle status update
  const handleStatusChange = async (newStatus) => {
    if (!student || student.placementStatus === newStatus) return;
    setUpdatingStatus(true);
    setStatusFeedback(null);
    try {
      const updated = await updateStudent(student.id, {
        placementStatus: newStatus,
      });
      setStudent((prev) => ({
        ...prev,
        ...updated,
        placementStatus: newStatus,
      }));
      setStatusFeedback({
        type: 'success',
        message: `Placement status updated to "${newStatus}".`,
      });
    } catch (err) {
      console.error('Failed to update status:', err);
      setStatusFeedback({
        type: 'error',
        message: err.message || 'Failed to update status.',
      });
    } finally {
      setUpdatingStatus(false);
    }
  };

  if (loading) {
    return (
      <main className="flex-1 flex flex-col items-center justify-center p-16 text-gray-400">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600 mb-3" />
        <p className="text-sm font-medium">Loading student profile from backend...</p>
      </main>
    );
  }

  if (error || !student) {
    return (
      <main className="flex-1 flex items-center justify-center p-10">
        <div className="text-center text-gray-500 max-w-md">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-3" />
          <p className="text-xl font-bold text-gray-900 mb-2">Student Not Found</p>
          <p className="text-sm text-gray-500 mb-5">
            {error || 'The requested student profile could not be found or has been deactivated.'}
          </p>
          <Link
            to="/admin/students"
            className="inline-flex items-center gap-2 bg-blue-600 text-white text-xs font-semibold px-4 py-2 rounded-xl hover:bg-blue-700 transition-colors shadow-xs"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Students
          </Link>
        </div>
      </main>
    );
  }

  const skillsList = Array.isArray(student.skills)
    ? student.skills.map((s) => (typeof s === 'string' ? s : s.skillName || ''))
    : [];

  const projectsList = student.projects || [];
  const applicationsList = student.applications || [];

  return (
    <main className="flex-1 px-4 md:px-8 py-6 overflow-x-hidden">
      {/* Back button */}
      <div className="flex items-center justify-between mb-5">
        <Link
          to="/admin/students"
          className="inline-flex items-center gap-1.5 text-blue-600 hover:text-blue-700 text-xs font-semibold transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Student Management
        </Link>
        {student.rollNo && (
          <span className="font-mono text-xs bg-gray-100 text-gray-600 px-2.5 py-1 rounded-md font-semibold">
            Roll: {student.rollNo}
          </span>
        )}
      </div>

      {/* Feedback banner */}
      {statusFeedback && (
        <div
          className={`flex items-center justify-between gap-3 p-3 rounded-xl mb-4 text-xs font-medium ${
            statusFeedback.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
              : 'bg-red-50 text-red-800 border border-red-200'
          }`}
        >
          <div className="flex items-center gap-2">
            {statusFeedback.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
            )}
            <span>{statusFeedback.message}</span>
          </div>
          <button
            onClick={() => setStatusFeedback(null)}
            className="underline hover:no-underline text-[11px]"
          >
            Dismiss
          </button>
        </div>
      )}

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Left Column (2 Cols) */}
        <div className="lg:col-span-2 space-y-5">
          {/* Header Card */}
          <div className="bg-white rounded-2xl shadow-xs border border-gray-100 overflow-hidden">
            <div className="h-28 bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700" />
            <div className="p-6 relative">
              <div className="absolute -top-12 left-6">
                <div className="w-24 h-24 rounded-2xl border-4 border-white bg-blue-600 flex items-center justify-center text-white text-3xl font-bold shadow-md">
                  {(student.fullName || 'S').charAt(0).toUpperCase()}
                </div>
              </div>
              <div className="mt-14 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">{student.fullName}</h2>
                  <p className="text-gray-500 text-sm mt-0.5">
                    {student.degree || 'Degree Program'} • {student.department || 'Engineering'}
                  </p>
                  <p className="text-gray-400 text-xs flex items-center gap-1.5 mt-1.5">
                    <GraduationCap className="w-4 h-4 text-gray-500" />
                    <span>{student.college || 'GCE Srirangam'}</span>
                    {student.batch && <span>• Batch of {student.batch}</span>}
                  </p>
                </div>
                <div className="flex flex-col sm:items-end gap-1.5">
                  <span
                    className={`inline-block text-xs px-3 py-1 rounded-full font-semibold ${statusBadge(
                      student.placementStatus
                    )}`}
                  >
                    ● {student.placementStatus || 'PENDING'}
                  </span>
                  {student.placedCompanyName && (
                    <span className="text-xs font-semibold text-emerald-700 flex items-center gap-1">
                      <Building2 className="w-3.5 h-3.5" />
                      Placed at {student.placedCompanyName}
                    </span>
                  )}
                </div>
              </div>

              {/* Skills */}
              {skillsList.length > 0 && (
                <div className="mt-5 pt-4 border-t border-gray-100">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                    Verified Skills
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {skillsList.map((skill, idx) => (
                      <span
                        key={idx}
                        className="bg-blue-50 text-blue-700 border border-blue-200/60 text-xs font-medium px-2.5 py-1 rounded-lg"
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Resume Section */}
          <div className="bg-white p-6 rounded-2xl shadow-xs border border-gray-100">
            <h3 className="font-bold text-base text-gray-900 mb-3 flex items-center gap-2">
              <FileText className="w-4 h-4 text-blue-600" />
              Resume &amp; CV Document
            </h3>
            {loadingResume ? (
              <div className="flex items-center gap-2 text-xs text-gray-500 py-3">
                <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                <span>Checking resume records...</span>
              </div>
            ) : resume ? (
              <div className="border border-gray-200 rounded-xl p-4 bg-gray-50/50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="bg-blue-100 p-2.5 rounded-xl text-blue-600">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="font-semibold text-xs text-gray-900 break-all">
                      {resume.fileName}
                    </p>
                    <div className="flex flex-wrap items-center gap-2 text-[11px] text-gray-500 mt-0.5">
                      {resume.fileSize && <span>{formatFileSize(resume.fileSize)}</span>}
                      {resume.uploadedAt && (
                        <span>• Uploaded {new Date(resume.uploadedAt).toLocaleDateString()}</span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                  <a
                    href={resume.viewUrl || getResumeViewUrl(student.id)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 border border-blue-200 px-3 py-1.5 rounded-lg transition-colors shadow-xs"
                  >
                    <Eye className="w-3.5 h-3.5" /> View
                  </a>
                  <a
                    href={resume.downloadUrl || getResumeDownloadUrl(student.id)}
                    download={resume.fileName || 'Resume.pdf'}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 px-3 py-1.5 rounded-lg transition-colors shadow-xs"
                  >
                    <Download className="w-3.5 h-3.5" /> Download
                  </a>
                </div>
              </div>
            ) : (
              <div className="p-5 rounded-xl border border-dashed border-gray-200 text-center text-gray-500 bg-gray-50/50">
                <FileText className="w-8 h-8 text-gray-300 mx-auto mb-1.5" />
                <p className="text-xs font-medium text-gray-700">No resume document uploaded</p>
                <p className="text-[11px] text-gray-400 mt-0.5">
                  The student has not yet uploaded a resume to the portal.
                </p>
              </div>
            )}
          </div>

          {/* About / Bio */}
          {student.about && (
            <div className="bg-white p-6 rounded-2xl shadow-xs border border-gray-100">
              <h3 className="font-bold text-sm text-gray-900 mb-2">About / Candidate Summary</h3>
              <p className="text-gray-600 text-xs leading-relaxed">{student.about}</p>
            </div>
          )}

          {/* Student Projects */}
          {projectsList.length > 0 && (
            <div className="bg-white p-6 rounded-2xl shadow-xs border border-gray-100">
              <h3 className="font-bold text-sm text-gray-900 mb-3 flex items-center gap-2">
                <FolderGit2 className="w-4 h-4 text-blue-600" />
                Student Projects ({projectsList.length})
              </h3>
              <div className="space-y-3">
                {projectsList.map((proj) => (
                  <div
                    key={proj.id}
                    className="p-3.5 rounded-xl border border-gray-100 bg-gray-50/50 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-semibold text-xs text-gray-900">{proj.title}</p>
                      {proj.liveUrl && (
                        <a
                          href={proj.liveUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-[11px] text-blue-600 hover:underline flex items-center gap-1 shrink-0 font-medium"
                        >
                          Live Link <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                    </div>
                    {proj.description && (
                      <p className="text-gray-500 text-[11px] mt-1 line-clamp-2">
                        {proj.description}
                      </p>
                    )}
                    {proj.techStack && proj.techStack.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {proj.techStack.map((tech, i) => (
                          <span
                            key={i}
                            className="bg-gray-200/70 text-gray-700 text-[10px] px-2 py-0.5 rounded-md font-medium"
                          >
                            {tech}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Recent Job Applications */}
          {applicationsList.length > 0 && (
            <div className="bg-white p-6 rounded-2xl shadow-xs border border-gray-100">
              <h3 className="font-bold text-sm text-gray-900 mb-3 flex items-center gap-2">
                <Briefcase className="w-4 h-4 text-blue-600" />
                Job Applications ({applicationsList.length})
              </h3>
              <div className="space-y-2">
                {applicationsList.map((app) => (
                  <div
                    key={app.id}
                    className="p-3 rounded-xl border border-gray-100 flex items-center justify-between text-xs"
                  >
                    <div>
                      <p className="font-semibold text-gray-900">{app.company || 'Company'}</p>
                      <p className="text-gray-500 text-[11px] mt-0.5">{app.jobTitle || 'Role'}</p>
                    </div>
                    <span
                      className={`text-[10px] font-semibold px-2.5 py-0.5 rounded-full ${
                        app.status === 'SELECTED'
                          ? 'bg-emerald-50 text-emerald-700'
                          : app.status === 'SHORTLISTED'
                          ? 'bg-blue-50 text-blue-700'
                          : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {app.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Academic Details, Contact, Placement Action */}
        <div className="space-y-5">
          {/* Update Placement Status Action Card */}
          <div className="bg-white rounded-2xl p-5 shadow-xs border border-gray-100">
            <h3 className="font-bold text-sm text-gray-900 mb-2 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-blue-600" />
              Manage Placement Status
            </h3>
            <p className="text-[11px] text-gray-400 mb-3">
              Change the student&apos;s current status directly in the database.
            </p>
            <div className="grid grid-cols-2 gap-2">
              {['ACTIVE', 'PLACED', 'PENDING', 'OPTED_OUT'].map((status) => {
                const isSelected = student.placementStatus === status;
                return (
                  <button
                    key={status}
                    disabled={updatingStatus}
                    onClick={() => handleStatusChange(status)}
                    className={`py-2 px-2.5 rounded-xl text-xs font-semibold border text-center transition-colors flex items-center justify-center gap-1.5 ${
                      isSelected
                        ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                        : 'bg-gray-50 hover:bg-gray-100 text-gray-700 border-gray-200'
                    }`}
                  >
                    {isSelected && <Check className="w-3.5 h-3.5" />}
                    <span>{status}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Academic Details Card */}
          <div className="bg-white rounded-2xl p-5 shadow-xs border border-gray-100">
            <h3 className="font-bold text-sm text-gray-900 mb-3 flex items-center gap-1.5">
              <GraduationCap className="w-4 h-4 text-blue-600" />
              Academic Metrics
            </h3>
            <div className="space-y-2.5 text-xs">
              <div className="flex justify-between py-1 border-b border-gray-50">
                <span className="text-gray-400">Department</span>
                <span className="font-medium text-gray-900">{student.department || 'N/A'}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-gray-50">
                <span className="text-gray-400">CGPA</span>
                <span className="font-bold text-blue-600 text-sm">
                  {student.cgpa != null ? Number(student.cgpa).toFixed(2) : 'N/A'}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-gray-50">
                <span className="text-gray-400">Current Semester</span>
                <span className="font-medium text-gray-900">Semester {student.semester ?? '—'}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-gray-50">
                <span className="text-gray-400">Batch</span>
                <span className="font-medium text-gray-900">{student.batch || '2022-2026'}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-gray-50">
                <span className="text-gray-400">Active Backlogs</span>
                <span
                  className={`font-semibold ${
                    (student.activeBacklogs || 0) > 0 ? 'text-red-600' : 'text-emerald-600'
                  }`}
                >
                  {student.activeBacklogs ?? 0}
                </span>
              </div>
            </div>
          </div>

          {/* Contact Information Card */}
          <div className="bg-white rounded-2xl p-5 shadow-xs border border-gray-100">
            <h3 className="font-bold text-sm text-gray-900 mb-3">Contact Details</h3>
            <div className="space-y-2.5 text-xs text-gray-600">
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-blue-500 shrink-0" />
                <span className="truncate" title={student.email}>
                  {student.email || 'No email registered'}
                </span>
              </div>
              {student.phone && (
                <div className="flex items-center gap-2">
                  <Phone className="w-4 h-4 text-blue-500 shrink-0" />
                  <span>{student.phone}</span>
                </div>
              )}
              {student.address && (
                <div className="flex items-start gap-2">
                  <MapPin className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
                  <span>{student.address}</span>
                </div>
              )}
            </div>
          </div>

          {/* Placement Offer Card (if placed) */}
          {student.placedCompanyName && (
            <div className="bg-emerald-50/60 border border-emerald-200 rounded-2xl p-5 shadow-xs">
              <h3 className="font-bold text-sm text-emerald-900 mb-2 flex items-center gap-1.5">
                <Building2 className="w-4 h-4 text-emerald-700" />
                Placement Offer Details
              </h3>
              <p className="text-xs text-emerald-800 font-semibold">{student.placedCompanyName}</p>
              {student.placedCtc && (
                <p className="text-xs text-emerald-700 mt-1">
                  CTC Package: <span className="font-bold">{student.placedCtc} LPA</span>
                </p>
              )}
              {student.placedOn && (
                <p className="text-[11px] text-emerald-600 mt-1">
                  Offer Date: {new Date(student.placedOn).toLocaleDateString()}
                </p>
              )}
            </div>
          )}

          {/* Profile Completion */}
          <div className="bg-white rounded-2xl p-5 shadow-xs border border-gray-100">
            <h3 className="font-bold text-xs uppercase tracking-wider text-gray-400 mb-2">
              Profile Verification
            </h3>
            <div className="flex justify-between items-baseline text-xs mb-1">
              <span className="text-gray-500">Completion</span>
              <span className="font-bold text-blue-600">
                {student.profileCompletionPercent ?? 0}%
              </span>
            </div>
            <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all duration-700"
                style={{ width: `${Math.min(student.profileCompletionPercent ?? 0, 100)}%` }}
              />
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
