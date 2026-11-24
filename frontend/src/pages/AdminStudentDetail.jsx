import { useState, useEffect } from 'react';
import { useParams, Link, useSearchParams } from 'react-router-dom';
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
  Layers,
  ExternalLink,
  GitBranch,
  Link2,
  Globe,
  ShieldCheck,
  Trophy,
  BadgeCheck,
  UserRound,
  Briefcase,
} from 'lucide-react';
import { getStudentById, getAllApplications } from '../services/api/adminService';
import { isPlaced, placementLabel, placementBadgeClass, formatCtc } from '../utils/placement';
import StudentApplicationsPanel from '../components/students/StudentApplicationsPanel';
import { LifecycleBadge, VerificationBadge } from '../components/students/StatusBadges';
import { formatDate, formatDateTime } from '../utils/dateFormat';
import EmptyState from '../components/EmptyState';
import { ProfileSkeleton } from '../components/Skeleton';
import { ProtectedFileLink } from '../components/ProtectedMedia';
import {
  getStudentResume,
  downloadStudentResumeFile,
  viewStudentResumeFile,
  formatFileSize,
} from '../services/fileUploadService';
import { toastError } from '../utils/toast';

const NOT_PROVIDED = 'Not provided';

const textOr = (value, fallback = NOT_PROVIDED) =>
  value !== null && value !== undefined && String(value).trim() !== '' ? String(value) : fallback;

const fetchStudentApplications = (studentId) => getAllApplications({ studentId });

/** Placement is a record, not a verification: Placed (company, CTC, date) or Not placed. */
function PlacementCard({ student, onShowApplications }) {
  const placed = isPlaced(student.status);
  const ctc = formatCtc(student.placedCtc);
  return (
    <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
      <h3 className="font-semibold text-sm text-gray-900 mb-3 flex items-center gap-1.5">
        <Award className="w-4 h-4 text-blue-600" /> Placement
      </h3>
      {placed ? (
        <div className="p-4 rounded-xl border bg-green-50 border-green-200">
          <p className="flex items-center gap-1.5 text-sm font-bold text-green-800">
            <CheckCircle2 className="w-4 h-4" /> Placed
          </p>
          <dl className="mt-3 space-y-1.5 text-xs">
            <div className="flex justify-between gap-3">
              <dt className="text-green-700/80">Company</dt>
              <dd className="font-semibold text-green-900 text-right">{student.placedCompanyName || 'Not recorded'}</dd>
            </div>
            {ctc && (
              <div className="flex justify-between gap-3">
                <dt className="text-green-700/80">CTC</dt>
                <dd className="font-semibold text-green-900">{ctc}</dd>
              </div>
            )}
            {student.placedOn && (
              <div className="flex justify-between gap-3">
                <dt className="text-green-700/80">Placed on</dt>
                <dd className="font-semibold text-green-900">{formatDate(student.placedOn)}</dd>
              </div>
            )}
          </dl>
        </div>
      ) : (
        <div className="p-4 rounded-xl border bg-gray-50 border-gray-200">
          <p className="text-sm font-bold text-gray-700">Not placed yet</p>
          <p className="text-xs text-gray-500 mt-1">
            Marked Placed automatically when one of this student&apos;s applications is set to Selected.
          </p>
        </div>
      )}
      {onShowApplications && (
        <button
          type="button"
          onClick={onShowApplications}
          className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-blue-600 hover:underline"
        >
          <Briefcase className="w-3.5 h-3.5" /> View applications
        </button>
      )}
    </div>
  );
}

const safeUrl = (url) => (typeof url === 'string' && /^https?:\/\//i.test(url.trim()) ? url.trim() : null);

/**
 * Official (verified) profile of one student. Never shows pending draft data: everything comes from
 * the student detail endpoint, which reads official tables only.
 *
 * Shared by /admin/students/:id and /faculty/students/:id (props override the data source and links).
 */
export default function AdminStudentDetail({
  fetchStudent = getStudentById,
  backTo = '/admin/students',
  backLabel = 'Back to Students',
  verificationsPath = '/admin/verifications',
  showVerificationLink = true,
  resumeFromEndpoint = true,
  // Admin / placement officer: this student's job applications. null hides the Applications tab.
  fetchApplications = fetchStudentApplications,
}) {
  const { id } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = fetchApplications && searchParams.get('tab') === 'applications' ? 'applications' : 'profile';
  const selectTab = (value) => setSearchParams(value === 'profile' ? {} : { tab: value }, { replace: true });
  // The route id is the student PROFILE id (GET /admin/students/{id} looks up the profile).
  const studentId = parseInt(id, 10);

  const [student, setStudent] = useState(null);
  const [loadingStudent, setLoadingStudent] = useState(true);
  const [resume, setResume] = useState(null);
  const [loadingResume, setLoadingResume] = useState(true);
  const [isDownloadingResume, setIsDownloadingResume] = useState(false);
  const [isOpeningResume, setIsOpeningResume] = useState(false);
  const [error, setError] = useState(null);

  // Resume endpoints are keyed by the viewed student's profile id, taken from the loaded record.
  const profileId = student?.id ?? null;

  const handleDownloadResume = async () => {
    if (!profileId) return;
    setIsDownloadingResume(true);
    try {
      await downloadStudentResumeFile(profileId, resume?.fileName || 'Resume.pdf');
    } catch (err) {
      toastError(err, 'Failed to download the resume.');
    } finally {
      setIsDownloadingResume(false);
    }
  };

  const handleViewResume = async () => {
    if (!profileId) return;
    setIsOpeningResume(true);
    try {
      await viewStudentResumeFile(profileId);
    } catch (err) {
      toastError(err, 'Could not open the resume.');
    } finally {
      setIsOpeningResume(false);
    }
  };

  useEffect(() => {
    let isMounted = true;

    const loadData = async () => {
      setLoadingStudent(true);
      setError(null);

      let loadedProfileId = null;
      try {
        const studentData = await fetchStudent(studentId);
        if (isMounted) {
          if (studentData) {
            loadedProfileId = studentData.id ?? null;
            const completion = Number(studentData.profileCompletionPercent);
            setStudent({
              id: studentData.id,
              name: studentData.fullName || 'Student',
              dept: studentData.department || studentData.departmentCode || null,
              cgpa: studentData.cgpa != null && studentData.cgpa !== '' ? Number(studentData.cgpa) : null,
              sem: studentData.semester ?? null,
              profile: Number.isFinite(completion) ? Math.min(Math.max(completion, 0), 100) : null,
              status: studentData.placementStatus || null,
              placedCompanyName: studentData.placedCompanyName || null,
              placedCtc: studentData.placedCtc ?? null,
              placedOn: studentData.placedOn || null,
              email: studentData.email || null,
              phone: studentData.phone || null,
              address: studentData.address || null,
              degree: studentData.degree || null,
              college: studentData.college || null,
              year: studentData.batch || null,
              rollNo: studentData.rollNo || null,
              activeBacklogs: studentData.activeBacklogs ?? null,
              about: studentData.about || null,
              skills: Array.isArray(studentData.skills)
                ? studentData.skills
                    .map((s) => (typeof s === 'string' ? s : s?.skillName || ''))
                    .filter((s) => s.trim())
                : [],
              projects: Array.isArray(studentData.projects) ? studentData.projects : [],
              certifications: Array.isArray(studentData.certifications) ? studentData.certifications : [],
              achievements: Array.isArray(studentData.achievements) ? studentData.achievements : [],
              lifecycleStatus: studentData.lifecycleStatus || (studentData.isActive === false ? 'DISABLED' : 'ACTIVE'),
              archivedAt: studentData.archivedAt || null,
              verificationStatus: studentData.profileVerificationStatus || null,
              verifiedAt: studentData.profileVerifiedAt || null,
              pendingVersionId: studentData.pendingVersionId ?? null,
              githubUrl: safeUrl(studentData.githubUrl),
              linkedinUrl: safeUrl(studentData.linkedinUrl),
              portfolioUrl: safeUrl(studentData.portfolioUrl),
              resumeUrl: studentData.resumeUrl || null,
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

      // Fetch resume metadata for this profile (only once the profile is known). Faculty read the
      // official resume through the detail's resumeUrl instead of the admin resume endpoints.
      if (!loadedProfileId || !resumeFromEndpoint) {
        if (isMounted) {
          setResume(null);
          setLoadingResume(false);
        }
        return;
      }
      setLoadingResume(true);
      try {
        const res = await getStudentResume(loadedProfileId);
        if (isMounted && res.success && res.data) {
          setResume({
            fileName: res.data.fileName || null,
            fileSize: res.data.fileSize,
            uploadedAt: res.data.uploadedAt,
            status: res.data.status || null,
          });
        } else if (isMounted) {
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
  }, [studentId, fetchStudent, resumeFromEndpoint]);

  if (loadingStudent) {
    return <ProfileSkeleton />;
  }

  if (error || !student) {
    return (
      <main className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          <EmptyState
            type="not-found"
            icon={GraduationCap}
            title={error || 'Student Profile Not Found'}
            description={`Unable to locate student records with ID "${studentId}" in the Placement Cell system.`}
            action={{
              label: backLabel,
              to: backTo,
              icon: ArrowLeft,
            }}
          />
        </div>
      </main>
    );
  }

  return (
    <main className="flex-1 px-4 md:px-8 py-6 overflow-x-hidden">
      <Link
        to={backTo}
        className="inline-flex items-center gap-1.5 text-blue-600 text-sm hover:underline mb-5 font-medium"
      >
        <ArrowLeft className="w-4 h-4" /> {backLabel}
      </Link>

      {fetchApplications && (
        <div role="tablist" aria-label="Student sections" className="flex gap-1 border-b border-gray-200 mb-5 overflow-x-auto">
          {[
            { value: 'profile', label: 'Profile', icon: UserRound },
            { value: 'applications', label: 'Applications', icon: Briefcase },
          ].map(({ value, label, icon: Icon }) => {
            const active = tab === value;
            return (
              <button
                key={value}
                type="button"
                role="tab"
                id={`tab-${value}`}
                aria-selected={active}
                aria-controls={`panel-${value}`}
                onClick={() => selectTab(value)}
                className={`px-4 py-2.5 text-sm font-semibold border-b-2 -mb-px flex items-center gap-2 whitespace-nowrap transition-colors ${
                  active ? 'border-blue-600 text-blue-700' : 'border-transparent text-gray-500 hover:text-gray-800'
                }`}
              >
                <Icon className="w-4 h-4" /> {label}
              </button>
            );
          })}
        </div>
      )}

      {tab === 'applications' ? (
        <section id="panel-applications" role="tabpanel" aria-labelledby="tab-applications">
          <StudentApplicationsPanel studentId={student.id} fetchApplications={fetchApplications} student={student} />
        </section>
      ) : (
      <div className="grid lg:grid-cols-3 gap-6" id="panel-profile" role="tabpanel" aria-labelledby="tab-profile">
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
                    <p className="text-gray-600 text-sm">{textOr(student.degree, 'Degree not provided')}</p>
                    <p className="text-gray-400 text-xs flex items-center gap-1 mt-0.5">
                      <GraduationCap className="w-3.5 h-3.5 text-blue-500" /> {textOr(student.college, 'College not provided')}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs px-2.5 py-1 rounded-full font-bold ${placementBadgeClass(student.status)}`}>
                      {isPlaced(student.status) && student.placedCompanyName
                        ? `Placed · ${student.placedCompanyName}`
                        : placementLabel(student.status)}
                    </span>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 mt-4 pt-3 border-t border-gray-100">
                  <LifecycleBadge status={student.lifecycleStatus} className="text-xs px-2.5 py-1" />
                  <VerificationBadge status={student.verificationStatus} className="text-xs px-2.5 py-1" />
                  <span className="text-xs bg-gray-100 text-gray-700 px-2.5 py-1 rounded-full font-medium">
                    Roll No: {textOr(student.rollNo)}
                  </span>
                  <span className="text-xs bg-blue-50 text-blue-700 px-2.5 py-1 rounded-full font-medium">
                    {textOr(student.dept, 'Department not provided')}
                  </span>
                  {student.cgpa !== null && (
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
                      {resume.fileName || 'Uploaded resume'}
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
                  <button
                    type="button"
                    onClick={handleViewResume}
                    disabled={isOpeningResume}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-700 bg-white hover:bg-gray-100 border border-gray-200 px-3 py-1.5 rounded-lg transition disabled:opacity-50"
                  >
                    {isOpeningResume ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Eye className="w-3.5 h-3.5" />} View
                  </button>
                  {profileId && (
                    <button
                      type="button"
                      onClick={handleDownloadResume}
                      disabled={isDownloadingResume}
                      className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 border border-blue-200 px-3 py-1.5 rounded-lg transition disabled:opacity-50"
                      title="Download Resume"
                    >
                      {isDownloadingResume ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" /> Downloading...
                        </>
                      ) : (
                        <>
                          <Download className="w-3.5 h-3.5" /> Download
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>
            ) : !resumeFromEndpoint && student.resumeUrl ? (
              <div className="border border-gray-200 rounded-xl p-4 bg-gray-50/70 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="bg-blue-100 p-2.5 rounded-xl text-blue-600"><FileText className="w-6 h-6" /></div>
                  <p className="font-semibold text-sm text-gray-900">Verified resume</p>
                </div>
                <ProtectedFileLink
                  url={student.resumeUrl}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-700 bg-white hover:bg-gray-100 border border-gray-200 px-3 py-1.5 rounded-lg"
                  title="Open resume"
                >
                  <Eye className="w-3.5 h-3.5" /> View
                </ProtectedFileLink>
              </div>
            ) : (
              <EmptyState
                type="empty"
                icon={FileText}
                title="No Resume Uploaded"
                description="The student has not yet uploaded a verified resume file."
                compact
                className="border-dashed border-gray-300 bg-gray-50/50"
              />
            )}
          </div>

          {/* Academic & Contact Details */}
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
            <h3 className="font-semibold text-lg text-gray-900 mb-3">Profile Information</h3>
            <div className="grid sm:grid-cols-2 gap-4 text-sm">
              <div className="space-y-2">
                <p className="flex items-center gap-2 text-gray-600">
                  <Mail className="w-4 h-4 text-blue-500 shrink-0" /> {textOr(student.email)}
                </p>
                <p className="flex items-center gap-2 text-gray-600">
                  <Phone className="w-4 h-4 text-blue-500 shrink-0" /> {textOr(student.phone)}
                </p>
                <p className="flex items-center gap-2 text-gray-600">
                  <MapPin className="w-4 h-4 text-blue-500 shrink-0" /> {textOr(student.address)}
                </p>
              </div>
              <div className="space-y-2">
                <p className="text-gray-600">
                  <span className="font-medium text-gray-700">Batch:</span> {textOr(student.year)}
                </p>
                <p className="text-gray-600">
                  <span className="font-medium text-gray-700">Department:</span> {textOr(student.dept)}
                </p>
                <p className="text-gray-600">
                  <span className="font-medium text-gray-700">CGPA:</span>{' '}
                  {student.cgpa !== null ? student.cgpa : NOT_PROVIDED}
                </p>
                <p className="text-gray-600">
                  <span className="font-medium text-gray-700">Active backlogs:</span>{' '}
                  {textOr(student.activeBacklogs)}
                </p>
              </div>
            </div>

            <div className="mt-4 pt-4 border-t border-gray-100">
              <p className="text-xs font-semibold text-gray-500 uppercase mb-1">About</p>
              <p className="text-sm text-gray-700 leading-relaxed">
                {student.about || <span className="text-gray-400">Not provided</span>}
              </p>
            </div>

            {(student.githubUrl || student.linkedinUrl || student.portfolioUrl) && (
              <div className="mt-4 pt-4 border-t border-gray-100">
                <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Links</p>
                <div className="flex flex-wrap gap-2">
                  {[
                    { url: student.githubUrl, label: 'GitHub', Icon: GitBranch },
                    { url: student.linkedinUrl, label: 'LinkedIn', Icon: Link2 },
                    { url: student.portfolioUrl, label: 'Portfolio', Icon: Globe },
                  ].filter((l) => l.url).map(({ url, label, Icon }) => (
                    <a key={label} href={url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-xs font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-100 px-2.5 py-1 rounded-full">
                      <Icon className="w-3.5 h-3.5" /> {label} <ExternalLink className="w-3 h-3" />
                    </a>
                  ))}
                </div>
              </div>
            )}

            <div className="mt-4 pt-4 border-t border-gray-100">
              <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Skills</p>
              {student.skills.length > 0 ? (
                <div className="flex flex-wrap gap-1.5">
                  {student.skills.map((skill) => (
                    <span key={skill} className="text-xs bg-blue-50 text-blue-700 px-2.5 py-1 rounded-full font-medium">
                      {skill}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-400">Not provided</p>
              )}
            </div>
          </div>

          {/* Student Projects Showcase */}
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-lg text-gray-900">Projects Showcase</h3>
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-purple-50 text-purple-700">
                {student.projects?.length || 0} Projects
              </span>
            </div>

            {student.projects && student.projects.length > 0 ? (
              <div className="space-y-3">
                {student.projects.map((proj) => (
                  <div
                    key={proj.id || proj.title}
                    className="border border-gray-100 rounded-xl p-4 bg-gray-50/50 hover:bg-gray-50 transition"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h4 className="font-bold text-sm text-gray-900">{proj.title}</h4>
                        <p className="text-xs text-gray-500 mt-1 leading-relaxed">{proj.description}</p>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        {proj.mediaUrl && (
                          <ProtectedFileLink
                            url={proj.mediaUrl}
                            className="text-purple-600 hover:text-purple-700 p-1 text-xs font-medium"
                            title="Open project media"
                          >
                            Media
                          </ProtectedFileLink>
                        )}
                        {proj.liveUrl && (
                          <a
                            href={proj.liveUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:text-blue-700 p-1"
                            title="View Live Project"
                          >
                            <ExternalLink className="w-4 h-4" />
                          </a>
                        )}
                      </div>
                    </div>
                    {Array.isArray(proj.techStack || proj.technologies) && (proj.techStack || proj.technologies).length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-2.5">
                        {(proj.techStack || proj.technologies).map((tech) => (
                          <span
                            key={tech}
                            className="text-[11px] bg-white border border-gray-200 text-gray-700 px-2 py-0.5 rounded-md font-medium"
                          >
                            {tech}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState
                type="empty"
                icon={Layers}
                title="No Projects Showcased"
                description="This student has not yet added any portfolio projects to their profile."
                compact
                className="border-dashed border-gray-200 bg-gray-50/50"
              />
            )}
          </div>

          {/* Certifications & achievements (official only) */}
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
            <h3 className="font-semibold text-lg text-gray-900 mb-3">Certifications</h3>
            {student.certifications.length > 0 ? (
              <ul className="space-y-2.5">
                {student.certifications.map((c, i) => (
                  <li key={c.id ?? i} className="border border-gray-100 rounded-xl p-3 bg-gray-50/50 flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-semibold text-sm text-gray-900 flex items-center gap-1.5"><BadgeCheck className="w-4 h-4 text-blue-600 shrink-0" /> {c.name}</p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {[c.issuer, c.issueDate && `Issued ${formatDate(c.issueDate)}`, c.expiryDate && `Expires ${formatDate(c.expiryDate)}`, c.credentialId && `ID ${c.credentialId}`].filter(Boolean).join(' · ')}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0 text-xs">
                      {safeUrl(c.credentialUrl) && (
                        <a href={safeUrl(c.credentialUrl)} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline inline-flex items-center gap-1">Verify <ExternalLink className="w-3 h-3" /></a>
                      )}
                      {c.fileUrl && <ProtectedFileLink url={c.fileUrl} className="text-blue-600 hover:underline">File</ProtectedFileLink>}
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-gray-400">No verified certifications.</p>
            )}

            <h3 className="font-semibold text-lg text-gray-900 mt-6 mb-3">Achievements</h3>
            {student.achievements.length > 0 ? (
              <ul className="space-y-2.5">
                {student.achievements.map((a, i) => (
                  <li key={a.id ?? i} className="border border-gray-100 rounded-xl p-3 bg-gray-50/50 flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-semibold text-sm text-gray-900 flex items-center gap-1.5"><Trophy className="w-4 h-4 text-amber-500 shrink-0" /> {a.title}</p>
                      {a.achievedOn && <p className="text-xs text-gray-500 mt-0.5">{formatDate(a.achievedOn)}</p>}
                      {a.description && <p className="text-xs text-gray-600 mt-1 leading-relaxed">{a.description}</p>}
                    </div>
                    {a.fileUrl && <ProtectedFileLink url={a.fileUrl} className="text-xs text-blue-600 hover:underline shrink-0">Proof</ProtectedFileLink>}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-gray-400">No verified achievements.</p>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-5">
          {/* Profile verification */}
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
            <h3 className="font-semibold text-sm text-gray-900 mb-3 flex items-center gap-1.5"><ShieldCheck className="w-4 h-4 text-blue-600" /> Profile verification</h3>
            <VerificationBadge status={student.verificationStatus} className="text-xs px-2.5 py-1" />
            {student.verifiedAt && <p className="text-xs text-gray-500 mt-2">Last verified {formatDateTime(student.verifiedAt)}</p>}
            {student.lifecycleStatus === 'ARCHIVED' && student.archivedAt && (
              <p className="text-xs text-amber-700 mt-2">Archived {formatDate(student.archivedAt)}</p>
            )}
            <p className="text-xs text-gray-500 mt-2">This page shows the official profile only. Changes waiting for review are not shown here.</p>
            {showVerificationLink && student.verificationStatus === 'PENDING' && (
              <Link
                to={student.pendingVersionId ? `${verificationsPath}/${student.pendingVersionId}` : `${verificationsPath}?search=${encodeURIComponent(student.rollNo || '')}`}
                className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-200 px-3 py-1.5 rounded-lg"
              >
                Review pending request <ExternalLink className="w-3.5 h-3.5" />
              </Link>
            )}
          </div>

          {/* Profile Completion */}
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
            <div className="flex justify-between text-sm font-semibold mb-2">
              <span className="text-gray-900">Profile Completion</span>
              <span className="text-blue-600">{student.profile !== null ? `${student.profile}%` : NOT_PROVIDED}</span>
            </div>
            {student.profile !== null && (
              <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
                <div
                  className="bg-blue-600 h-full rounded-full"
                  style={{ width: `${student.profile}%` }}
                />
              </div>
            )}
          </div>

          {/* Placement record */}
          <PlacementCard
            student={student}
            onShowApplications={fetchApplications ? () => selectTab('applications') : null}
          />
        </div>
      </div>
      )}
    </main>
  );
}
