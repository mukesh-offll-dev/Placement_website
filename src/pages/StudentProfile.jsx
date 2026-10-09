import { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  GraduationCap,
  Mail,
  Phone,
  MapPin,
  Pencil,
  Plus,
  FileText,
  Upload,
  Download,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Layers,
  Sparkles,
  ExternalLink,
  RefreshCw,
  X,
  Award,
} from 'lucide-react';
import {
  getProfile,
  updateProfile,
  createProfile,
  getStudentDashboard,
} from '../services/api/studentService';
import {
  getAllProjects,
  deleteProject,
} from '../services/api/projectService';
import {
  uploadStudentResume,
  getStudentResume,
  deleteStudentResume,
  getResumeViewUrl,
  getResumeDownloadUrl,
  validateFile,
  formatFileSize,
} from '../services/fileUploadService';
import { getUser } from '../services/authService';

export default function StudentProfile() {
  const resumeFileRef = useRef(null);
  const navigate = useNavigate();
  const location = useLocation();

  // Authentication & Profile state
  const currentUser = getUser();
  const [profile, setProfile] = useState(null);
  const [projects, setProjects] = useState([]);
  const [dashboardStats, setDashboardStats] = useState(null);
  const [resumeData, setResumeData] = useState(null);

  // Loading & message states
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(null);
  const [notification, setNotification] = useState(null);

  // Edit "About" inline state
  const [editAbout, setEditAbout] = useState(false);
  const [aboutDraft, setAboutDraft] = useState('');
  const [savingAbout, setSavingAbout] = useState(false);

  // Edit full details modal state
  const [showEditModal, setShowEditModal] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [editForm, setEditForm] = useState({
    fullName: '',
    rollNo: '',
    email: '',
    phone: '',
    address: '',
    college: '',
    degree: '',
    department: '',
    departmentCode: '',
    batch: '',
    semester: '',
    cgpa: '',
    totalBacklogs: '',
    activeBacklogs: '',
    isOpenToOpportunities: true,
  });
  const [modalErrors, setModalErrors] = useState({});

  // Resume states
  const [resumeUploading, setResumeUploading] = useState(false);
  const [resumeMessage, setResumeMessage] = useState(null);

  // Project action state
  const [deletingProjectId, setDeletingProjectId] = useState(null);

  // Local skills state
  const [skillsList, setSkillsList] = useState([]);

  // Check for notification passed from navigation
  useEffect(() => {
    if (location.state?.message) {
      setNotification({
        type: 'success',
        text: location.state.message,
      });
      window.history.replaceState({}, '');
    }
  }, [location.state]);

  // Load all profile, project, and resume data from backend
  const loadProfileData = useCallback(async () => {
    setLoading(true);
    setFetchError(null);

    try {
      let profileResult = null;
      let isNewProfile = false;

      try {
        profileResult = await getProfile();
      } catch (err) {
        if (err.status === 404) {
          isNewProfile = true;
          profileResult = {
            id: currentUser?.userId || null,
            fullName: currentUser?.fullName || '',
            email: currentUser?.email || '',
            rollNo: currentUser?.rollNo || '',
            phone: '',
            address: '',
            about: '',
            college: 'Government College of Engineering, Srirangam',
            degree: 'B.E Computer Science and Engineering',
            department: 'Computer Science and Engineering',
            departmentCode: 'CSE',
            batch: '2022-2026',
            semester: 7,
            cgpa: null,
            totalBacklogs: 0,
            activeBacklogs: 0,
            isOpenToOpportunities: true,
            skills: [],
            education: [],
            experience: [],
            projects: [],
          };
        } else {
          throw err;
        }
      }

      setProfile(profileResult);
      setAboutDraft(profileResult.about || '');

      // Populate skills
      if (Array.isArray(profileResult.skills)) {
        setSkillsList(
          profileResult.skills.map((s) => (typeof s === 'string' ? s : s.skillName || ''))
        );
      } else {
        setSkillsList([]);
      }

      // Populate edit form
      setEditForm({
        fullName: profileResult.fullName || currentUser?.fullName || '',
        rollNo: profileResult.rollNo || '',
        email: profileResult.email || currentUser?.email || '',
        phone: profileResult.phone || '',
        address: profileResult.address || '',
        college: profileResult.college || 'Government College of Engineering, Srirangam',
        degree: profileResult.degree || 'B.E Computer Science and Engineering',
        department: profileResult.department || 'Computer Science and Engineering',
        departmentCode: profileResult.departmentCode || 'CSE',
        batch: profileResult.batch || '2022-2026',
        semester: profileResult.semester ?? '',
        cgpa: profileResult.cgpa ?? '',
        totalBacklogs: profileResult.totalBacklogs ?? 0,
        activeBacklogs: profileResult.activeBacklogs ?? 0,
        isOpenToOpportunities: profileResult.isOpenToOpportunities ?? true,
      });

      // 2. Fetch projects
      try {
        const projectList = await getAllProjects();
        if (Array.isArray(projectList)) {
          setProjects(projectList);
        } else if (profileResult.projects && Array.isArray(profileResult.projects)) {
          setProjects(profileResult.projects);
        } else {
          setProjects([]);
        }
      } catch {
        if (profileResult.projects && Array.isArray(profileResult.projects)) {
          setProjects(profileResult.projects);
        } else {
          setProjects([]);
        }
      }

      // 3. Fetch resume details
      const studentId = profileResult.id || currentUser?.userId;
      if (studentId) {
        try {
          const res = await getStudentResume(studentId);
          if (res.success && res.data) {
            setResumeData(res.data);
          } else if (profileResult.resumeUrl) {
            setResumeData({
              fileName: 'Uploaded_Resume.pdf',
              url: profileResult.resumeUrl,
              downloadUrl: getResumeDownloadUrl(studentId),
              status: 'VERIFIED',
            });
          } else {
            setResumeData(null);
          }
        } catch {
          if (profileResult.resumeUrl) {
            setResumeData({
              fileName: 'Uploaded_Resume.pdf',
              url: profileResult.resumeUrl,
              downloadUrl: getResumeDownloadUrl(studentId),
              status: 'VERIFIED',
            });
          }
        }
      }

      // 4. Fetch dashboard stats
      try {
        const stats = await getStudentDashboard();
        setDashboardStats(stats);
      } catch {
        // Non-critical stats
      }

      if (isNewProfile) {
        setNotification({
          type: 'info',
          text: 'Welcome! Your student profile has been initialized. Fill in your academic and contact details to complete it.',
        });
      }
    } catch (err) {
      setFetchError(err.message || 'Unable to load profile data from the server.');
    } finally {
      setLoading(false);
    }
  }, [currentUser?.userId, currentUser?.email, currentUser?.fullName, currentUser?.rollNo]);

  useEffect(() => {
    loadProfileData();
  }, [loadProfileData]);

  // Calculate completion percentage
  const calculateCompletion = () => {
    if (!profile) return 0;
    if (profile.profileCompletionPercent) return profile.profileCompletionPercent;

    let score = 0;
    if (profile.fullName) score += 15;
    if (profile.email) score += 10;
    if (profile.phone) score += 10;
    if (profile.address) score += 5;
    if (profile.about) score += 15;
    if (resumeData || profile.resumeUrl) score += 20;
    if (profile.cgpa) score += 10;
    if (skillsList.length > 0) score += 5;
    if (projects.length > 0) score += 10;
    return Math.min(score, 100);
  };

  const completionPct = calculateCompletion();

  // Save inline "About"
  const handleSaveAbout = async () => {
    if (aboutDraft.length > 2000) {
      alert('About description cannot exceed 2000 characters.');
      return;
    }

    setSavingAbout(true);
    setNotification(null);

    const payload = {
      fullName: profile.fullName || currentUser?.fullName || 'Student',
      rollNo: profile.rollNo || null,
      email: profile.email || currentUser?.email,
      phone: profile.phone || null,
      address: profile.address || null,
      about: aboutDraft.trim(),
      avatarUrl: profile.avatarUrl || null,
      resumeUrl: profile.resumeUrl || null,
      college: profile.college || null,
      degree: profile.degree || null,
      department: profile.department || null,
      departmentCode: profile.departmentCode || null,
      batch: profile.batch || null,
      semester: profile.semester ? Number(profile.semester) : null,
      cgpa: profile.cgpa ? Number(profile.cgpa) : null,
      totalBacklogs: profile.totalBacklogs ?? 0,
      activeBacklogs: profile.activeBacklogs ?? 0,
      isOpenToOpportunities: profile.isOpenToOpportunities ?? true,
    };

    try {
      let updated;
      try {
        updated = await updateProfile(payload);
      } catch (err) {
        if (err.status === 404) {
          updated = await createProfile(payload);
        } else {
          throw err;
        }
      }

      setProfile((prev) => ({ ...prev, ...(updated || payload), about: aboutDraft.trim() }));
      setEditAbout(false);
      setNotification({
        type: 'success',
        text: 'About section updated successfully!',
      });
    } catch (err) {
      setNotification({
        type: 'error',
        text: err.message || 'Failed to update About section.',
      });
    } finally {
      setSavingAbout(false);
    }
  };

  // Validate and Save Full Profile Modal
  const validateModal = () => {
    const errs = {};
    if (!editForm.fullName.trim()) errs.fullName = 'Full name is required';
    if (!editForm.email.trim()) errs.email = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(editForm.email)) errs.email = 'Enter a valid email address';

    if (editForm.phone && !/^[+0-9][0-9 ()-]{6,19}$/.test(editForm.phone)) {
      errs.phone = 'Invalid phone number format';
    }

    if (editForm.cgpa !== '' && editForm.cgpa !== null) {
      const num = parseFloat(editForm.cgpa);
      if (isNaN(num) || num < 0 || num > 10) {
        errs.cgpa = 'CGPA must be between 0.00 and 10.00';
      }
    }

    if (editForm.semester !== '' && editForm.semester !== null) {
      const sem = parseInt(editForm.semester, 10);
      if (isNaN(sem) || sem < 1 || sem > 10) {
        errs.semester = 'Semester must be between 1 and 10';
      }
    }

    setModalErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSaveModal = async (e) => {
    e.preventDefault();
    if (!validateModal()) return;

    setSavingProfile(true);
    setNotification(null);

    const payload = {
      fullName: editForm.fullName.trim(),
      rollNo: editForm.rollNo.trim() || null,
      email: editForm.email.trim(),
      phone: editForm.phone.trim() || null,
      address: editForm.address.trim() || null,
      about: profile?.about || null,
      avatarUrl: profile?.avatarUrl || null,
      resumeUrl: profile?.resumeUrl || null,
      college: editForm.college.trim() || null,
      degree: editForm.degree.trim() || null,
      department: editForm.department.trim() || null,
      departmentCode: editForm.departmentCode.trim() || null,
      batch: editForm.batch.trim() || null,
      semester: editForm.semester !== '' ? Number(editForm.semester) : null,
      cgpa: editForm.cgpa !== '' ? Number(editForm.cgpa) : null,
      totalBacklogs: editForm.totalBacklogs !== '' ? Number(editForm.totalBacklogs) : 0,
      activeBacklogs: editForm.activeBacklogs !== '' ? Number(editForm.activeBacklogs) : 0,
      isOpenToOpportunities: Boolean(editForm.isOpenToOpportunities),
    };

    try {
      let updated;
      try {
        updated = await updateProfile(payload);
      } catch (err) {
        if (err.status === 404) {
          updated = await createProfile(payload);
        } else {
          throw err;
        }
      }

      setProfile((prev) => ({ ...prev, ...(updated || payload) }));
      setShowEditModal(false);
      setNotification({
        type: 'success',
        text: 'Profile details saved successfully!',
      });
    } catch (err) {
      setModalErrors({
        submit: err.message || 'Failed to save profile. Please check the values.',
      });
    } finally {
      setSavingProfile(false);
    }
  };

  // Upload Resume handler
  const handleResumeUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validation = validateFile(file, ['pdf', 'doc', 'docx'], 10 * 1024 * 1024);
    if (!validation.valid) {
      setResumeMessage({ type: 'error', text: validation.error });
      if (resumeFileRef.current) resumeFileRef.current.value = '';
      return;
    }

    setResumeUploading(true);
    setResumeMessage(null);

    const studentId = profile?.id || currentUser?.userId || 1;
    const res = await uploadStudentResume(studentId, file);

    setResumeUploading(false);

    if (res.success && res.data) {
      const newResume = {
        documentId: res.data.documentId,
        fileName: res.data.fileName || file.name,
        url: res.data.downloadUrl || res.data.resumeUrl || getResumeViewUrl(studentId),
        downloadUrl: res.data.downloadUrl || getResumeDownloadUrl(studentId),
        fileSize: res.data.fileSize || file.size,
        uploadedAt: res.data.uploadedAt || new Date().toISOString(),
        status: res.data.status || 'VERIFIED',
      };
      setResumeData(newResume);
      setProfile((p) => ({ ...p, resumeUrl: newResume.url }));
      setResumeMessage({
        type: 'success',
        text: 'Resume uploaded successfully to the backend!',
      });
    } else {
      setResumeMessage({
        type: 'error',
        text: res.error || 'Failed to upload resume. Please verify the file and try again.',
      });
    }

    if (resumeFileRef.current) {
      resumeFileRef.current.value = '';
    }
  };

  // Delete Resume handler
  const handleResumeDelete = async () => {
    if (!window.confirm('Are you sure you want to delete your uploaded resume?')) {
      return;
    }

    const studentId = profile?.id || currentUser?.userId || 1;
    const res = await deleteStudentResume(studentId);

    if (res.success) {
      setResumeData(null);
      setProfile((p) => ({ ...p, resumeUrl: null }));
      setResumeMessage({
        type: 'success',
        text: 'Resume deleted successfully.',
      });
    } else {
      setResumeMessage({
        type: 'error',
        text: res.error || 'Failed to delete resume.',
      });
    }
  };

  // Delete Project handler
  const handleDeleteProject = async (projectId) => {
    if (!window.confirm('Are you sure you want to delete this project from your profile?')) {
      return;
    }

    setDeletingProjectId(projectId);
    try {
      await deleteProject(projectId);
      setProjects((prev) => prev.filter((p) => p.id !== projectId));
      setNotification({
        type: 'success',
        text: 'Project deleted successfully.',
      });
    } catch (err) {
      setNotification({
        type: 'error',
        text: err.message || 'Failed to delete project.',
      });
    } finally {
      setDeletingProjectId(null);
    }
  };

  // Skill management
  const addSkill = () => {
    const skill = prompt('Enter a new skill name:');
    if (skill && skill.trim()) {
      const trimmed = skill.trim();
      if (!skillsList.includes(trimmed)) {
        setSkillsList((prev) => [...prev, trimmed]);
      }
    }
  };

  const removeSkill = (index) => {
    setSkillsList((prev) => prev.filter((_, i) => i !== index));
  };

  // Loading state
  if (loading) {
    return (
      <main className="flex-1 px-4 md:px-8 py-12 flex flex-col items-center justify-center min-h-[60vh]">
        <Loader2 className="w-10 h-10 text-blue-600 animate-spin mb-4" />
        <p className="text-gray-600 font-medium">Loading your profile from server...</p>
        <p className="text-gray-400 text-xs mt-1">Connecting to Placement Cell API</p>
      </main>
    );
  }

  // Error state with Retry
  if (fetchError && !profile) {
    return (
      <main className="flex-1 px-4 md:px-8 py-12 flex flex-col items-center justify-center min-h-[60vh]">
        <div className="bg-red-50 border border-red-200 rounded-2xl p-8 max-w-md text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-3" />
          <h3 className="text-lg font-bold text-gray-900 mb-1">Failed to Load Profile</h3>
          <p className="text-sm text-gray-600 mb-5">{fetchError}</p>
          <button
            onClick={loadProfileData}
            className="inline-flex items-center gap-2 bg-blue-600 text-white font-semibold text-sm px-5 py-2.5 rounded-xl hover:bg-blue-700 transition"
          >
            <RefreshCw className="w-4 h-4" /> Try Again
          </button>
        </div>
      </main>
    );
  }

  const studentName = profile.fullName || currentUser?.fullName || 'Student User';
  const studentEmail = profile.email || currentUser?.email || 'N/A';
  const studentRoll = profile.rollNo || 'Not Assigned';
  const studentDegree = profile.degree || 'Degree Not Set';
  const studentCollege = profile.college || 'GCE Srirangam';
  const studentDept = profile.department || 'Department Not Set';

  return (
    <main className="flex-1 px-4 md:px-8 py-6 overflow-x-hidden">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Student Profile</h1>
          <p className="text-gray-500 text-sm">
            Manage your academic credentials, verified resume, and project showcase.
          </p>
        </div>
        <button
          onClick={() => {
            setModalErrors({});
            setShowEditModal(true);
          }}
          className="inline-flex items-center gap-2 bg-blue-600 text-white text-sm font-semibold px-4 py-2 rounded-xl hover:bg-blue-700 transition shadow-sm w-fit"
        >
          <Pencil className="w-4 h-4" /> Edit Profile Details
        </button>
      </div>

      {/* Global Notification Banner */}
      {notification && (
        <div
          className={`flex items-start gap-2.5 p-4 rounded-xl mb-6 text-sm ${
            notification.type === 'success'
              ? 'bg-green-50 border border-green-200 text-green-800'
              : notification.type === 'error'
              ? 'bg-red-50 border border-red-200 text-red-800'
              : 'bg-blue-50 border border-blue-200 text-blue-800'
          }`}
        >
          {notification.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 shrink-0 text-green-600" />
          ) : notification.type === 'error' ? (
            <AlertCircle className="w-5 h-5 shrink-0 text-red-600" />
          ) : (
            <Sparkles className="w-5 h-5 shrink-0 text-blue-600" />
          )}
          <div className="flex-1 font-medium">{notification.text}</div>
          <button
            onClick={() => setNotification(null)}
            className="text-gray-400 hover:text-gray-600 font-bold"
          >
            ✕
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ── LEFT: Main Content ── */}
        <div className="lg:col-span-2 space-y-6">

          {/* Profile Card Header */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="h-32 bg-gradient-to-r from-blue-600 via-indigo-600 to-sky-500 relative" />
            <div className="p-6 relative">
              <div className="absolute -top-12 left-6">
                <div className="w-24 h-24 rounded-full border-4 border-white bg-blue-600 overflow-hidden flex items-center justify-center text-white text-3xl font-bold shadow-md">
                  {profile.avatarUrl ? (
                    <img
                      src={profile.avatarUrl}
                      alt={studentName}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    studentName.charAt(0).toUpperCase()
                  )}
                </div>
              </div>

              <div className="mt-14">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">{studentName}</h2>
                    <p className="text-gray-600 text-sm mt-0.5">{studentDegree}</p>
                    <p className="text-gray-400 text-xs flex items-center gap-1 mt-1">
                      <GraduationCap className="w-3.5 h-3.5 text-blue-500" /> {studentCollege}
                    </p>
                    <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500 mt-2">
                      <span className="bg-gray-100 px-2.5 py-0.5 rounded-full font-medium text-gray-700">
                        Roll: {studentRoll}
                      </span>
                      {profile.departmentCode && (
                        <span className="bg-blue-50 text-blue-700 px-2.5 py-0.5 rounded-full font-medium">
                          Dept: {profile.departmentCode}
                        </span>
                      )}
                      {profile.cgpa && (
                        <span className="bg-green-50 text-green-700 px-2.5 py-0.5 rounded-full font-medium">
                          CGPA: {profile.cgpa}
                        </span>
                      )}
                      {profile.semester && (
                        <span className="bg-purple-50 text-purple-700 px-2.5 py-0.5 rounded-full font-medium">
                          Sem: {profile.semester}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Skills tags */}
                <div className="mt-5 pt-4 border-t border-gray-100">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Technical Skills
                    </p>
                    <span className="text-xs text-gray-400">Click a tag to remove</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {skillsList.map((skill, i) => (
                      <span
                        key={i}
                        onClick={() => removeSkill(i)}
                        className="bg-blue-50 text-blue-700 hover:bg-red-50 hover:text-red-700 border border-blue-200 hover:border-red-200 px-3 py-1 rounded-full text-xs font-medium cursor-pointer transition"
                        title="Click to remove"
                      >
                        {skill} ✕
                      </span>
                    ))}
                    <button
                      onClick={addSkill}
                      className="border border-dashed border-blue-500 text-blue-600 hover:bg-blue-50 px-3 py-1 rounded-full text-xs font-medium transition flex items-center gap-1"
                    >
                      <Plus className="w-3 h-3" /> Add Skill
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Resume Section */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
            <div className="flex justify-between items-center mb-4">
              <div>
                <h3 className="font-semibold text-lg text-gray-900">Resume & Documentation</h3>
                <p className="text-gray-500 text-xs mt-0.5">
                  Uploaded resumes are evaluated by recruiters during placement drives (PDF, DOC, DOCX up to 10MB).
                </p>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="file"
                  ref={resumeFileRef}
                  onChange={handleResumeUpload}
                  accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                  className="hidden"
                />
                <button
                  type="button"
                  disabled={resumeUploading}
                  onClick={() => resumeFileRef.current?.click()}
                  className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-semibold px-3.5 py-2 rounded-xl transition flex items-center gap-1.5 shadow-sm"
                >
                  {resumeUploading ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" /> Uploading...
                    </>
                  ) : (
                    <>
                      <Upload className="w-3.5 h-3.5" />{' '}
                      {resumeData ? 'Update Resume' : 'Upload Resume'}
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Resume Upload Status Banner */}
            {resumeMessage && (
              <div
                className={`flex items-start gap-2 p-3 rounded-xl mb-4 text-xs ${
                  resumeMessage.type === 'success'
                    ? 'bg-green-50 border border-green-200 text-green-700'
                    : 'bg-red-50 border border-red-200 text-red-700'
                }`}
              >
                {resumeMessage.type === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-green-600 mt-0.5" />
                ) : (
                  <AlertCircle className="w-4 h-4 shrink-0 text-red-600 mt-0.5" />
                )}
                <div className="flex-1">{resumeMessage.text}</div>
                <button
                  onClick={() => setResumeMessage(null)}
                  className="text-gray-400 hover:text-gray-600 font-bold"
                >
                  ✕
                </button>
              </div>
            )}

            {/* Resume Display Card */}
            {resumeData ? (
              <div className="border border-gray-200 rounded-xl p-4 bg-gray-50/70 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="bg-blue-100 p-2.5 rounded-xl text-blue-600 shrink-0">
                    <FileText className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="font-semibold text-sm text-gray-900 break-all">
                      {resumeData.fileName || 'Student_Resume.pdf'}
                    </p>
                    <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500 mt-0.5">
                      {resumeData.fileSize && <span>{formatFileSize(resumeData.fileSize)}</span>}
                      {resumeData.fileSize && <span>•</span>}
                      <span>
                        Uploaded{' '}
                        {resumeData.uploadedAt
                          ? new Date(resumeData.uploadedAt).toLocaleDateString()
                          : 'Recently'}
                      </span>
                      {resumeData.status && (
                        <>
                          <span>•</span>
                          <span
                            className={`px-2 py-0.5 rounded-full font-medium text-[10px] ${
                              resumeData.status === 'VERIFIED'
                                ? 'bg-green-100 text-green-700'
                                : resumeData.status === 'REJECTED'
                                ? 'bg-red-100 text-red-700'
                                : 'bg-yellow-100 text-yellow-700'
                            }`}
                          >
                            {resumeData.status}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                  {resumeData.downloadUrl || resumeData.url ? (
                    <a
                      href={resumeData.downloadUrl || resumeData.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 border border-blue-200 px-3 py-1.5 rounded-lg transition"
                    >
                      <Download className="w-3.5 h-3.5" /> Download
                    </a>
                  ) : null}
                  <button
                    type="button"
                    onClick={handleResumeDelete}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-red-600 hover:bg-red-50 border border-red-200 px-2.5 py-1.5 rounded-lg transition"
                    title="Remove Resume"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ) : (
              <div
                onClick={() => resumeFileRef.current?.click()}
                className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center hover:border-blue-400 hover:bg-blue-50/30 transition cursor-pointer"
              >
                <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                <p className="text-sm font-semibold text-gray-700">No resume uploaded yet</p>
                <p className="text-xs text-gray-400 mt-1">
                  Click to upload your resume (PDF, DOC, DOCX up to 10MB)
                </p>
              </div>
            )}
          </div>

          {/* About Section */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
            <div className="flex justify-between items-center mb-3">
              <h3 className="font-semibold text-lg text-gray-900">About Me</h3>
              {!editAbout && (
                <button
                  onClick={() => {
                    setAboutDraft(profile.about || '');
                    setEditAbout(true);
                  }}
                  className="text-gray-400 hover:text-blue-600 p-1 rounded-lg hover:bg-gray-50 transition"
                  title="Edit About description"
                >
                  <Pencil className="w-4 h-4" />
                </button>
              )}
            </div>

            {editAbout ? (
              <div className="space-y-3">
                <textarea
                  value={aboutDraft}
                  onChange={(e) => setAboutDraft(e.target.value)}
                  rows={4}
                  maxLength={2000}
                  placeholder="Share a concise professional summary highlighting your career goals, key strengths, and areas of expertise..."
                  className="w-full border border-gray-300 rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-400">
                    {aboutDraft.length} / 2000 characters
                  </span>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setEditAbout(false)}
                      disabled={savingAbout}
                      className="text-gray-600 text-xs px-3.5 py-1.5 rounded-lg hover:bg-gray-100 transition"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSaveAbout}
                      disabled={savingAbout}
                      className="bg-blue-600 text-white text-xs font-semibold px-4 py-1.5 rounded-lg hover:bg-blue-700 transition flex items-center gap-1.5 disabled:opacity-50"
                    >
                      {savingAbout && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                      Save
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-gray-600 text-sm leading-relaxed whitespace-pre-line">
                {profile.about || (
                  <span className="text-gray-400 italic">
                    No summary provided yet. Click the edit icon to share your professional background with recruiters.
                  </span>
                )}
              </p>
            )}
          </div>

          {/* Contact Details Card */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
            <h3 className="font-semibold text-lg text-gray-900 mb-4">Contact Information</h3>
            <div className="grid sm:grid-cols-3 gap-4">
              <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-xl">
                <Phone className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs text-gray-400 uppercase font-semibold">Phone</p>
                  <p className="text-sm font-medium text-gray-800 break-all">
                    {profile.phone || 'Not provided'}
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-xl">
                <Mail className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs text-gray-400 uppercase font-semibold">Email</p>
                  <p className="text-sm font-medium text-gray-800 break-all">
                    {studentEmail}
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-xl">
                <MapPin className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs text-gray-400 uppercase font-semibold">Location / Address</p>
                  <p className="text-sm font-medium text-gray-800 break-all">
                    {profile.address || 'Not provided'}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Academic Records Card */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
            <h3 className="font-semibold text-lg text-gray-900 mb-4">Academic Overview</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
              <div className="p-3 bg-blue-50/60 rounded-xl">
                <p className="text-xs text-gray-500 font-medium">Department</p>
                <p className="text-sm font-bold text-blue-900 mt-1">{studentDept}</p>
              </div>
              <div className="p-3 bg-green-50/60 rounded-xl">
                <p className="text-xs text-gray-500 font-medium">Current CGPA</p>
                <p className="text-sm font-bold text-green-900 mt-1">{profile.cgpa ? `${profile.cgpa} / 10` : 'N/A'}</p>
              </div>
              <div className="p-3 bg-purple-50/60 rounded-xl">
                <p className="text-xs text-gray-500 font-medium">Semester</p>
                <p className="text-sm font-bold text-purple-900 mt-1">{profile.semester ? `Semester ${profile.semester}` : 'N/A'}</p>
              </div>
              <div className="p-3 bg-amber-50/60 rounded-xl">
                <p className="text-xs text-gray-500 font-medium">Active Backlogs</p>
                <p className="text-sm font-bold text-amber-900 mt-1">{profile.activeBacklogs ?? 0}</p>
              </div>
            </div>
          </div>

          {/* Projects Showcase */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
            <div className="flex justify-between items-center mb-4">
              <div>
                <h3 className="font-semibold text-lg text-gray-900">Projects Showcase</h3>
                <p className="text-gray-500 text-xs mt-0.5">
                  Portfolio projects visible to placement recruiters.
                </p>
              </div>
              <button
                onClick={() => navigate('/student/add-project')}
                className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-3.5 py-2 rounded-xl transition flex items-center gap-1.5 shadow-sm"
              >
                <Plus className="w-3.5 h-3.5" /> Add Project
              </button>
            </div>

            {projects.length > 0 ? (
              <div className="grid sm:grid-cols-2 gap-4">
                {projects.map((proj) => {
                  const techList = Array.isArray(proj.techStack)
                    ? proj.techStack
                    : Array.isArray(proj.tech)
                    ? proj.tech
                    : [];

                  return (
                    <div
                      key={proj.id}
                      className="border border-gray-200 rounded-xl p-4 hover:shadow-md transition flex flex-col justify-between bg-white"
                    >
                      <div>
                        {proj.mediaUrl && (
                          <div className="mb-3 rounded-lg overflow-hidden border border-gray-100 h-32 bg-gray-100">
                            {proj.mediaUrl.toLowerCase().endsWith('.pdf') ? (
                              <div className="w-full h-full flex items-center justify-center bg-gray-50 text-gray-500 text-xs gap-1.5">
                                <FileText className="w-5 h-5 text-red-500" /> PDF Attachment
                              </div>
                            ) : (
                              <img
                                src={proj.mediaUrl}
                                alt={proj.title}
                                className="w-full h-full object-cover"
                              />
                            )}
                          </div>
                        )}

                        <div className="flex items-start justify-between gap-2">
                          <h4 className="font-bold text-sm text-gray-900">{proj.title}</h4>
                          <button
                            onClick={() => handleDeleteProject(proj.id)}
                            disabled={deletingProjectId === proj.id}
                            className="text-gray-400 hover:text-red-500 p-1 transition"
                            title="Delete Project"
                          >
                            {deletingProjectId === proj.id ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <Trash2 className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>

                        <p className="text-gray-600 text-xs mt-1.5 mb-3 leading-relaxed line-clamp-3">
                          {proj.description || proj.desc}
                        </p>

                        {techList.length > 0 && (
                          <div className="flex flex-wrap gap-1 mb-3">
                            {techList.map((t, idx) => (
                              <span
                                key={idx}
                                className="bg-blue-50 text-blue-700 text-[11px] px-2 py-0.5 rounded font-medium"
                              >
                                {t}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-3 pt-3 border-t border-gray-100 text-xs">
                        {proj.liveUrl && (
                          <a
                            href={proj.liveUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:underline flex items-center gap-1 font-medium"
                          >
                            <ExternalLink className="w-3 h-3" /> Live
                          </a>
                        )}
                        {proj.repoUrl && (
                          <a
                            href={proj.repoUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-gray-600 hover:underline flex items-center gap-1 font-medium"
                          >
                            <ExternalLink className="w-3 h-3" /> Code
                          </a>
                        )}
                        {proj.mediaUrl && (
                          <a
                            href={proj.mediaUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-purple-600 hover:underline flex items-center gap-1 font-medium"
                          >
                            Media
                          </a>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="border border-dashed border-gray-200 rounded-xl p-8 text-center bg-gray-50/50">
                <Layers className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                <p className="text-sm font-semibold text-gray-700">No projects added yet</p>
                <p className="text-xs text-gray-400 mt-1 mb-4">
                  Add projects to showcase your practical knowledge to visiting companies.
                </p>
                <button
                  onClick={() => navigate('/student/add-project')}
                  className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-4 py-2 rounded-xl transition inline-flex items-center gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" /> Add First Project
                </button>
              </div>
            )}
          </div>
        </div>

        {/* ── RIGHT: Sidebar Widgets ── */}
        <div className="space-y-6">

          {/* Profile Completion Widget */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
            <div className="flex justify-between text-sm font-semibold mb-2">
              <span className="text-gray-900">Profile Completion</span>
              <span className="text-blue-600">{completionPct}%</span>
            </div>
            <div className="w-full bg-gray-100 h-2.5 rounded-full overflow-hidden">
              <div
                className="bg-blue-600 h-full rounded-full transition-all duration-500"
                style={{ width: `${completionPct}%` }}
              />
            </div>
            {completionPct < 100 && (
              <p className="text-xs text-gray-400 mt-2">
                Keep your details updated and upload your resume to reach 100% eligibility.
              </p>
            )}
          </div>

          {/* Placement Status Widget */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
            <h3 className="font-semibold text-sm text-gray-900 mb-3">Placement Status</h3>
            <div
              className={`p-4 rounded-xl border ${
                profile.placementStatus === 'PLACED'
                  ? 'bg-green-50 border-green-200 text-green-800'
                  : 'bg-blue-50 border-blue-200 text-blue-800'
              }`}
            >
              <div className="flex items-center gap-2 font-bold text-sm">
                <Award className="w-4 h-4" />
                {profile.placementStatus === 'PLACED'
                  ? 'Placed'
                  : profile.isOpenToOpportunities
                  ? 'Open to Opportunities'
                  : 'Inactive'}
              </div>
              <p className="text-xs mt-1 opacity-90">
                {profile.placementStatus === 'PLACED'
                  ? `Placed with ${profile.placedCompany?.name || 'Company'} (${profile.placedCtc || ''} LPA)`
                  : 'Eligible for active campus drives for ' + (profile.batch || 'current batch')}
              </p>
            </div>
          </div>

          {/* Placement Statistics Widget */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
            <h3 className="font-semibold text-sm text-gray-900 mb-3">Activity Summary</h3>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between py-1.5 border-b border-gray-100">
                <span className="text-gray-500">Applied Jobs</span>
                <span className="font-bold text-gray-800">
                  {dashboardStats?.appliedJobsCount ?? 0}
                </span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-gray-100">
                <span className="text-gray-500">Active Campus Drives</span>
                <span className="font-bold text-blue-600">
                  {dashboardStats?.activeJobsCount ?? 0}
                </span>
              </div>
              <div className="flex justify-between py-1.5">
                <span className="text-gray-500">Projects Showcased</span>
                <span className="font-bold text-purple-600">{projects.length}</span>
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* ── Edit Profile Modal ── */}
      {showEditModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full p-6 my-8 border border-gray-100">
            <div className="flex items-center justify-between pb-4 border-b border-gray-100 mb-4">
              <h2 className="text-xl font-bold text-gray-900">Edit Profile Details</h2>
              <button
                onClick={() => setShowEditModal(false)}
                className="text-gray-400 hover:text-gray-600 font-bold p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {modalErrors.submit && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{modalErrors.submit}</span>
              </div>
            )}

            <form onSubmit={handleSaveModal} className="space-y-4">
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Full Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={editForm.fullName}
                    onChange={(e) => setEditForm({ ...editForm, fullName: e.target.value })}
                    className="w-full px-3 py-2 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  {modalErrors.fullName && (
                    <p className="text-red-500 text-xs mt-1">{modalErrors.fullName}</p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Roll Number
                  </label>
                  <input
                    type="text"
                    value={editForm.rollNo}
                    onChange={(e) => setEditForm({ ...editForm, rollNo: e.target.value })}
                    className="w-full px-3 py-2 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Email Address <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    value={editForm.email}
                    onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                    className="w-full px-3 py-2 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  {modalErrors.email && (
                    <p className="text-red-500 text-xs mt-1">{modalErrors.email}</p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Phone Number
                  </label>
                  <input
                    type="text"
                    placeholder="+91 98765 43210"
                    value={editForm.phone}
                    onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                    className="w-full px-3 py-2 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  {modalErrors.phone && (
                    <p className="text-red-500 text-xs mt-1">{modalErrors.phone}</p>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Residential Address
                </label>
                <input
                  type="text"
                  placeholder="City, State"
                  value={editForm.address}
                  onChange={(e) => setEditForm({ ...editForm, address: e.target.value })}
                  className="w-full px-3 py-2 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">College</label>
                  <input
                    type="text"
                    value={editForm.college}
                    onChange={(e) => setEditForm({ ...editForm, college: e.target.value })}
                    className="w-full px-3 py-2 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Degree</label>
                  <input
                    type="text"
                    placeholder="e.g. B.E Computer Science and Engineering"
                    value={editForm.degree}
                    onChange={(e) => setEditForm({ ...editForm, degree: e.target.value })}
                    className="w-full px-3 py-2 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="grid sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Department Code
                  </label>
                  <input
                    type="text"
                    placeholder="CSE"
                    value={editForm.departmentCode}
                    onChange={(e) => setEditForm({ ...editForm, departmentCode: e.target.value })}
                    className="w-full px-3 py-2 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Semester (1-10)</label>
                  <input
                    type="number"
                    min="1"
                    max="10"
                    value={editForm.semester}
                    onChange={(e) => setEditForm({ ...editForm, semester: e.target.value })}
                    className="w-full px-3 py-2 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  {modalErrors.semester && (
                    <p className="text-red-500 text-xs mt-1">{modalErrors.semester}</p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    CGPA (0 - 10)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    max="10"
                    placeholder="8.50"
                    value={editForm.cgpa}
                    onChange={(e) => setEditForm({ ...editForm, cgpa: e.target.value })}
                    className="w-full px-3 py-2 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  {modalErrors.cgpa && (
                    <p className="text-red-500 text-xs mt-1">{modalErrors.cgpa}</p>
                  )}
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Batch
                  </label>
                  <input
                    type="text"
                    placeholder="2022-2026"
                    value={editForm.batch}
                    onChange={(e) => setEditForm({ ...editForm, batch: e.target.value })}
                    className="w-full px-3 py-2 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Active Backlogs
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={editForm.activeBacklogs}
                    onChange={(e) => setEditForm({ ...editForm, activeBacklogs: e.target.value })}
                    className="w-full px-3 py-2 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="open-opportunities"
                  checked={editForm.isOpenToOpportunities}
                  onChange={(e) =>
                    setEditForm({ ...editForm, isOpenToOpportunities: e.target.checked })
                  }
                  className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4"
                />
                <label htmlFor="open-opportunities" className="text-xs text-gray-700 font-medium">
                  I am actively seeking placement & internship opportunities
                </label>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  disabled={savingProfile}
                  className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-xl transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingProfile}
                  className="px-5 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition flex items-center gap-2 disabled:opacity-50"
                >
                  {savingProfile && <Loader2 className="w-4 h-4 animate-spin" />}
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}
