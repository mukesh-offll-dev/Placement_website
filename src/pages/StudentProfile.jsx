import { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  GraduationCap,
  Mail,
  Phone,
  MapPin,
  Pencil,
  Plus,
} from 'lucide-react';

const initProfile = {
  name: 'Alex Harrison',
  degree: 'B.E Computer Science and Engineering',
  college: 'Government College of Engineering, Srirangam',
  rollNo: '220CSE001',
  skills: ['Python', 'Java', 'React', 'Node.js'],
  image: null,
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
    },
    {
      title: 'SecureAuth',
      desc: 'Blockchain-based identity and access management system designed for secure, decentralized authentication.',
      tech: ['Solidity', 'React', 'Node.js'],
    },
  ],
};

const calcCompletion = (p) => {
  let filled = 0;
  const checks = [p.about, p.contact.email, p.education.length, p.projects.length, p.experience.length];
  checks.forEach((c) => { if (c) filled++; });
  return Math.floor((filled / checks.length) * 100);
};

export default function StudentProfile() {
  const fileRef = useRef();
  const navigate = useNavigate();
  const location = useLocation();
  const [profile, setProfile] = useState(initProfile);
  const [editAbout, setEditAbout] = useState(false);
  const [aboutDraft, setAboutDraft] = useState(profile.about);

  // Pick up a project returned from AddProjectPage via router state
  useEffect(() => {
    if (location.state?.newProject) {
      setProfile((p) => ({ ...p, projects: [...p.projects, location.state.newProject] }));
      // Clear the state so a back-navigation doesn't re-add it
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
      <p className="text-gray-500 text-sm mb-6">Manage your academic and professional information.</p>

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
                <button onClick={() => { setAboutDraft(profile.about); setEditAbout(true); }} className="text-gray-400 hover:text-blue-600">
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
                    <p className="font-semibold text-sm mb-1 text-gray-900">{proj.title}</p>
                    <p className="text-gray-500 text-xs mb-3 leading-relaxed">{proj.desc}</p>
                    <div className="flex flex-wrap gap-1 mb-2">
                      {proj.tech && proj.tech.map((t) => (
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
                <div
                  className="bg-blue-600 h-2 rounded transition-all duration-500"
                  style={{ width: `${completion}%` }}
                />
              </div>
              {completion < 100 && (
                <p className="text-xs text-gray-400 mt-2">Complete your profile to increase visibility.</p>
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
