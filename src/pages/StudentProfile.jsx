import { useState, useRef, useEffect } from 'react';
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
} from 'lucide-react';
import {
  uploadStudentResume,
  deleteStudentResume,
  validateFile,
  formatFileSize,
} from '../services/fileUploadService';

const initProfile = {
  id: 1,
  name: 'Alex Harrison',
  degree: 'B.E Computer Science and Engineering',
  college: 'Government College of Engineering, Srirangam',
  rollNo: '220CSE001',
  skills: ['Python', 'Java', 'React', 'Node.js'],
  image: null,
  resume: {
    fileName: 'Alex_Harrison_Resume.pdf',
    url: '/api/students/1/resume/download',
    fileSize: 1450000,
    uploadedAt: '2026-09-10T14:30:00Z',
    status: 'VERIFIED',
  },
  about:
    'Aspiring Software Engineer with a strong foundation in full-stack development and cloud technologies. Passionate about building scalable, high-performance applications that solve real-world problems.',
  contact: {
    phone: '+91 98765 43210',
    email: 'alex.harrison@gce.edu.in',
    address: 'Srirangam, Trichy',
  },
  experience: [
    {
      role: 'Software Engineer Intern',
      company: 'Tech Innovation Lab',
      duration: 'May 2025 – Aug 2025',
      description: 'Improved system latency by 20% through cache optimization.',
    },
  ],
  education: [
    {
      college: 'GCE Srirangam',
      degree: 'B.E Computer Science and Engineering',
      year: '2022 – 2026',
      grade: '8.9',
    },
    {
      college: 'CBSE Higher Secondary',
      degree: 'Class XII (Science)',
      year: '2021 – 2022',
      grade: '92%',
    },
  ],
  projects: [
    {
      title: 'CloudScaler',
      desc: 'Intelligent cloud resource optimization platform that dynamically scales infrastructure based on real-time usage.',
      tech: ['AWS', 'Python', 'Docker'],
      live: 'https://cloudscaler.vercel.app',
      repo: 'https://github.com/alex/cloudscaler',
      media: null,
    },
    {
      title: 'SecureAuth',
      desc: 'Blockchain-based identity and access management system designed for secure, decentralized authentication.',
      tech: ['Solidity', 'React', 'Node.js'],
      live: null,
      repo: 'https://github.com/alex/secureauth',
      media: null,
    },
  ],
};

const calcCompletion = (p) => {
  let filled = 0;
  const checks = [
    p.about,
    p.contact?.email,
    p.education?.length,
    p.projects?.length,
    p.experience?.length,
    p.resume?.fileName,
  ];
  checks.forEach((c) => {
    if (c) filled++;
  });
  return Math.floor((filled / checks.length) * 100);
};

export default function StudentProfile() {
  const fileRef = useRef();
  const resumeFileRef = useRef();
  const navigate = useNavigate();
  const location = useLocation();

  const [profile, setProfile] = useState(() => {
    if (location.state?.newProject) {
      return { ...initProfile, projects: [...initProfile.projects, location.state.newProject] };
    }
    return initProfile;
  });
  const [editAbout, setEditAbout] = useState(false);
  const [aboutDraft, setAboutDraft] = useState(profile.about);

  const [resumeUploading, setResumeUploading] = useState(false);
  const [resumeMessage, setResumeMessage] = useState(null);

  // Clear navigation state once consumed
  useEffect(() => {
    if (location.state?.newProject) {
      window.history.replaceState({}, '');
    }
  }, [location.state]);


  const completion = calcCompletion(profile);

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setProfile((p) => ({ ...p, image: url }));
    }
  };

  const handleResumeUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type (PDF, DOC, DOCX) and size (10MB max)
    const validation = validateFile(file, ['pdf', 'doc', 'docx'], 10 * 1024 * 1024);
    if (!validation.valid) {
      setResumeMessage({ type: 'error', text: validation.error });
      if (resumeFileRef.current) resumeFileRef.current.value = '';
      return;
    }

    setResumeUploading(true);
    setResumeMessage(null);

    const studentId = profile.id || 1;
    const res = await uploadStudentResume(studentId, file);

    setResumeUploading(false);

    if (res.success && res.data) {
      const resumeData = {
        documentId: res.data.documentId,
        fileName: res.data.fileName || file.name,
        url: res.data.downloadUrl || res.data.resumeUrl,
        fileSize: res.data.fileSize || file.size,
        uploadedAt: res.data.uploadedAt || new Date().toISOString(),
        status: res.data.status || 'PENDING',
      };
      setProfile((p) => ({ ...p, resume: resumeData }));
      localStorage.setItem(`student_resume_${studentId}`, JSON.stringify(resumeData));
      setResumeMessage({
        type: 'success',
        text: 'Resume uploaded successfully! Your profile has been updated.',
      });
    } else {
      // Graceful fallback for local display if backend API is offline
      const localUrl = URL.createObjectURL(file);
      const resumeData = {
        fileName: file.name,
        url: localUrl,
        fileSize: file.size,
        uploadedAt: new Date().toISOString(),
        status: 'PENDING',
      };
      setProfile((p) => ({ ...p, resume: resumeData }));
      localStorage.setItem(`student_resume_${studentId}`, JSON.stringify(resumeData));
      setResumeMessage({
        type: res.error ? 'error' : 'success',
        text: res.error ? `${res.error} (Saved locally)` : 'Resume updated.',
      });
    }

    if (resumeFileRef.current) {
      resumeFileRef.current.value = '';
    }
  };

  const handleResumeDelete = async () => {
    if (!window.confirm('Are you sure you want to remove your uploaded resume?')) {
      return;
    }

    const studentId = profile.id || 1;
    await deleteStudentResume(studentId);
    localStorage.removeItem(`student_resume_${studentId}`);

    setProfile((p) => ({ ...p, resume: null }));
    setResumeMessage({
      type: 'success',
      text: 'Resume removed successfully.',
    });
  };


  const saveAbout = () => {
    setProfile((p) => ({ ...p, about: aboutDraft }));
    setEditAbout(false);
  };

  const addSkill = () => {
    const skill = prompt('Add a skill:');
    if (skill && skill.trim()) {
      setProfile((p) => ({ ...p, skills: [...p.skills, skill.trim()] }));
    }
  };

  const removeSkill = (idx) => {
    setProfile((p) => ({ ...p, skills: p.skills.filter((_, i) => i !== idx) }));
  };

  return (
    <main className="flex-1 px-4 md:px-8 py-6 overflow-x-hidden">
      <h2 className="text-2xl font-bold text-gray-900 mb-1">My Profile</h2>
      <p className="text-gray-500 text-sm mb-6">Manage your academic, resume, and professional information.</p>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* LEFT — Main Content */}
        <div className="lg:col-span-2 space-y-5">
          {/* Profile Card */}
          <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
            <div className="h-32 bg-gradient-to-r from-indigo-500 via-blue-500 to-purple-400" />
            <div className="p-5 relative">
              <div
                className="absolute -top-12 left-5 cursor-pointer"
                onClick={() => fileRef.current.click()}
              >
                <div className="w-24 h-24 rounded-full border-4 border-white bg-blue-600 overflow-hidden flex items-center justify-center">
                  {profile.image ? (
                    <img src={profile.image} alt="avatar" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-white text-3xl font-bold">{profile.name[0]}</span>
                  )}
                </div>
                <input type="file" ref={fileRef} onChange={handleImageUpload} className="hidden" accept="image/*" />
              </div>

              <div className="mt-14">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h2 className="text-xl font-bold">{profile.name}</h2>
                    <p className="text-gray-500 text-sm">{profile.degree}</p>
                    <p className="text-gray-400 text-xs flex items-center gap-1 mt-0.5">
                      <GraduationCap className="w-3.5 h-3.5" /> {profile.college}
                    </p>
                    <p className="text-gray-400 text-xs mt-0.5">Roll No: {profile.rollNo}</p>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 mt-4">
                  {profile.skills.map((skill, i) => (
                    <span
                      key={i}
                      onClick={() => removeSkill(i)}
                      className="bg-blue-600 text-white px-3 py-1 rounded-full text-xs cursor-pointer hover:bg-red-500 transition-colors"
                      title="Click to remove"
                    >
                      {skill}
                    </span>
                  ))}
                  <button
                    onClick={addSkill}
                    className="border border-blue-600 text-blue-600 px-3 py-1 rounded-full text-xs hover:bg-blue-50 transition-colors flex items-center gap-1"
                  >
                    <Plus className="w-3 h-3" /> Add Skill
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Resume Upload Section */}
          <div className="bg-white p-5 rounded-2xl shadow-sm">
            <div className="flex justify-between items-center mb-3">
              <div>
                <h3 className="font-semibold text-lg text-gray-900">Resume</h3>
                <p className="text-gray-500 text-xs">Upload your resume in PDF, DOC, or DOCX format (Max 10MB).</p>
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
                  className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-semibold px-3.5 py-2 rounded-lg transition-colors flex items-center gap-1.5 shadow-sm"
                >
                  {resumeUploading ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" /> Uploading...
                    </>
                  ) : (
                    <>
                      <Upload className="w-3.5 h-3.5" /> {profile.resume ? 'Update Resume' : 'Upload Resume'}
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Resume Upload Status Message */}
            {resumeMessage && (
              <div
                className={`flex items-start gap-2 p-3 rounded-xl mb-4 text-xs ${
                  resumeMessage.type === 'success'
                    ? 'bg-green-50 border border-green-200 text-green-700'
                    : 'bg-red-50 border border-red-200 text-red-700'
                }`}
              >
                {resumeMessage.type === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-green-600" />
                ) : (
                  <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
                )}
                <div className="flex-1">{resumeMessage.text}</div>
                <button
                  onClick={() => setResumeMessage(null)}
                  className="text-gray-400 hover:text-gray-600 text-xs font-bold"
                >
                  ✕
                </button>
              </div>
            )}

            {/* Current Resume Display */}
            {profile.resume ? (
              <div className="border border-gray-200 rounded-xl p-4 bg-gray-50/50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="bg-blue-100 p-2.5 rounded-xl text-blue-600">
                    <FileText className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="font-semibold text-sm text-gray-900 break-all">{profile.resume.fileName}</p>
                    <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500 mt-0.5">
                      <span>{formatFileSize(profile.resume.fileSize)}</span>
                      <span>•</span>
                      <span>
                        Uploaded {profile.resume.uploadedAt ? new Date(profile.resume.uploadedAt).toLocaleDateString() : 'Recently'}
                      </span>
                      {profile.resume.status && (
                        <>
                          <span>•</span>
                          <span
                            className={`px-2 py-0.5 rounded-full font-medium text-[10px] ${
                              profile.resume.status === 'VERIFIED'
                                ? 'bg-green-100 text-green-700'
                                : profile.resume.status === 'REJECTED'
                                ? 'bg-red-100 text-red-700'
                                : 'bg-yellow-100 text-yellow-700'
                            }`}
                          >
                            {profile.resume.status}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                  {profile.resume.url && (
                    <a
                      href={profile.resume.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 border border-blue-200 px-3 py-1.5 rounded-lg transition-colors"
                    >
                      <Download className="w-3.5 h-3.5" /> View / Download
                    </a>
                  )}
                  <button
                    type="button"
                    onClick={handleResumeDelete}
                    className="inline-flex items-center gap-1 text-xs font-medium text-red-600 hover:bg-red-50 border border-red-200 px-2.5 py-1.5 rounded-lg transition-colors"
                    title="Remove Resume"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ) : (
              <div
                onClick={() => resumeFileRef.current?.click()}
                className="border-2 border-dashed border-gray-300 rounded-xl p-6 text-center hover:border-blue-400 hover:bg-blue-50/40 transition-colors cursor-pointer"
              >
                <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                <p className="text-sm font-medium text-gray-700">No resume uploaded yet</p>
                <p className="text-xs text-gray-400 mt-1">Click to browse and upload your latest resume (PDF, DOC, DOCX up to 10MB)</p>
              </div>
            )}
          </div>

          {/* Contact */}
          <div className="bg-white p-5 rounded-2xl shadow-sm">
            <h3 className="font-semibold mb-3">Contact Information</h3>
            <div className="space-y-2">
              <p className="flex items-center gap-2 text-sm text-gray-600">
                <Phone className="w-4 h-4 text-blue-500" /> {profile.contact.phone}
              </p>
              <p className="flex items-center gap-2 text-sm text-gray-600">
                <Mail className="w-4 h-4 text-blue-500" /> {profile.contact.email}
              </p>
              <p className="flex items-center gap-2 text-sm text-gray-600">
                <MapPin className="w-4 h-4 text-blue-500" /> {profile.contact.address}
              </p>
            </div>
          </div>

          {/* About */}
          <div className="bg-white p-5 rounded-2xl shadow-sm">
            <div className="flex justify-between items-center mb-3">
              <h3 className="font-semibold">About</h3>
              <button
                onClick={() => {
                  setAboutDraft(profile.about);
                  setEditAbout(true);
                }}
                className="text-gray-400 hover:text-blue-600"
              >
                <Pencil className="w-4 h-4" />
              </button>
            </div>
            {editAbout ? (
              <div>
                <textarea
                  value={aboutDraft}
                  onChange={(e) => setAboutDraft(e.target.value)}
                  rows={4}
                  className="w-full border rounded-lg p-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
                <div className="flex gap-2 mt-2">
                  <button onClick={saveAbout} className="bg-blue-600 text-white text-sm px-4 py-1.5 rounded-lg hover:bg-blue-700">
                    Save
                  </button>
                  <button onClick={() => setEditAbout(false)} className="text-gray-500 text-sm px-4 py-1.5 rounded-lg hover:bg-gray-100">
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <p className="text-gray-600 text-sm leading-relaxed">{profile.about}</p>
            )}
          </div>

          {/* Education */}
          <div className="bg-white p-5 rounded-2xl shadow-sm">
            <h3 className="font-semibold mb-3">Education</h3>
            <div className="space-y-4">
              {profile.education.map((edu, i) => (
                <div key={i} className="border-l-2 border-blue-200 pl-4">
                  <p className="font-semibold text-sm">{edu.college}</p>
                  <p className="text-gray-500 text-sm">{edu.degree}</p>
                  <p className="text-xs text-gray-400">{edu.year} &nbsp;·&nbsp; Grade: {edu.grade}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Experience */}
          <div className="bg-white p-5 rounded-2xl shadow-sm">
            <h3 className="font-semibold mb-3">Experience</h3>
            {profile.experience.map((exp, i) => (
              <div key={i} className="border-l-2 border-green-200 pl-4">
                <p className="font-semibold text-sm">{exp.role}</p>
                <p className="text-gray-500 text-sm">{exp.company} &nbsp;·&nbsp; {exp.duration}</p>
                <p className="text-gray-600 text-xs mt-1">{exp.description}</p>
              </div>
            ))}
          </div>

          {/* Projects */}
          <div className="bg-white p-5 rounded-2xl shadow-sm">
            <div className="flex justify-between items-center mb-3">
              <div>
                <h3 className="font-semibold text-lg">Projects</h3>
                <p className="text-gray-500 text-xs">Showcase your technical excellence.</p>
              </div>
              <button
                onClick={() => navigate('/student/add-project')}
                className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" /> Add Project
              </button>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              {profile.projects.map((proj, i) => (
                <div key={i} className="border border-gray-200 rounded-xl p-4 hover:shadow-sm transition-shadow">
                  {proj.media && (
                    <div className="mb-3 rounded-lg overflow-hidden border border-gray-100 h-32 bg-gray-100">
                      {proj.media.endsWith?.('.pdf') ? (
                        <div className="w-full h-full flex items-center justify-center bg-gray-50 text-gray-500 text-xs gap-1.5">
                          <FileText className="w-5 h-5 text-red-500" /> PDF Attachment
                        </div>
                      ) : (
                        <img src={proj.media} alt={proj.title} className="w-full h-full object-cover" />
                      )}
                    </div>
                  )}
                  <p className="font-semibold text-sm mb-1 text-gray-900">{proj.title}</p>
                  <p className="text-gray-500 text-xs mb-3 leading-relaxed">{proj.desc}</p>
                  <div className="flex flex-wrap gap-1 mb-2">
                    {proj.tech &&
                      proj.tech.map((t) => (
                        <span key={t} className="bg-blue-50 text-blue-700 text-xs px-2 py-0.5 rounded font-medium">
                          {t}
                        </span>
                      ))}
                  </div>
                  {(proj.live || proj.repo || proj.media) && (
                    <div className="flex gap-3 pt-2 text-xs border-t border-gray-100 mt-2">
                      {proj.live && (
                        <a href={proj.live} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                          Live Demo
                        </a>
                      )}
                      {proj.repo && (
                        <a href={proj.repo} target="_blank" rel="noopener noreferrer" className="text-gray-600 hover:underline">
                          Repository
                        </a>
                      )}
                      {proj.media && (
                        <a href={proj.media} target="_blank" rel="noopener noreferrer" className="text-purple-600 hover:underline">
                          Media Demo
                        </a>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* RIGHT — Sidebar */}
        <div className="space-y-4">
          {/* Profile Completion */}
          <div className="bg-white p-5 rounded-xl shadow-sm">
            <div className="flex justify-between text-sm font-medium mb-2">
              <span>Profile Completion</span>
              <span className="text-blue-600">{completion}%</span>
            </div>
            <div className="w-full bg-gray-200 h-2 rounded">
              <div className="bg-blue-600 h-2 rounded transition-all duration-500" style={{ width: `${completion}%` }} />
            </div>
            {completion < 100 && <p className="text-xs text-gray-400 mt-2">Complete your profile and upload resume to increase visibility.</p>}
          </div>

          {/* Resume Quick Widget */}
          <div className="bg-white p-5 rounded-xl shadow-sm">
            <h3 className="font-semibold text-sm mb-3">Resume Status</h3>
            {profile.resume ? (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-xs text-green-700 bg-green-50 p-2.5 rounded-lg border border-green-200">
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-green-600" />
                  <span className="font-medium truncate">{profile.resume.fileName}</span>
                </div>
                <a
                  href={profile.resume.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full inline-flex items-center justify-center gap-1.5 text-xs text-blue-600 bg-blue-50 hover:bg-blue-100 p-2 rounded-lg font-medium transition-colors"
                >
                  <Download className="w-3.5 h-3.5" /> Download Resume
                </a>
              </div>
            ) : (
              <div className="text-center py-2">
                <p className="text-xs text-gray-500 mb-2">No resume uploaded</p>
                <button
                  type="button"
                  onClick={() => resumeFileRef.current?.click()}
                  className="w-full inline-flex items-center justify-center gap-1 text-xs text-white bg-blue-600 hover:bg-blue-700 p-2 rounded-lg font-medium transition-colors"
                >
                  <Upload className="w-3.5 h-3.5" /> Upload Now
                </button>
              </div>
            )}
          </div>

          {/* Placement Status */}
          <div className="bg-white p-5 rounded-xl shadow-sm">
            <h3 className="font-semibold text-sm mb-3">Placement Status</h3>
            <div className="bg-green-50 border border-green-200 text-green-700 p-3 rounded-lg text-sm">
              <p className="font-medium">✔ Open to Opportunities</p>
              <p className="text-xs text-green-600 mt-0.5">Actively seeking for 2026 batch</p>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="bg-white p-5 rounded-xl shadow-sm">
            <h3 className="font-semibold text-sm mb-3">Quick Stats</h3>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Applications</span>
                <span className="font-semibold">4</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Shortlisted</span>
                <span className="font-semibold text-green-600">2</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Interviews</span>
                <span className="font-semibold text-blue-600">1</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
