import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  GraduationCap,
  Mail,
  Phone,
  MapPin,
  Pencil,
  Plus,
} from 'lucide-react';
import { apiRequest } from '../services/api';

const calcCompletion = (p) => {
  let filled = 0;
  const checks = [p.name, p.degree, p.about, p.contact?.phone, p.education?.length, p.projects?.length, p.experience?.length];
  checks.forEach((c) => { if (c) filled++; });
  return Math.floor((filled / checks.length) * 100);
};

export default function StudentProfile() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [saveError, setSaveError] = useState('');
  const [notice, setNotice] = useState('');
  const [saving, setSaving] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [editAbout, setEditAbout] = useState(false);
  const [aboutDraft, setAboutDraft] = useState('');

  useEffect(() => {
    let active = true;
    apiRequest('/students/me/profile')
      .then((response) => {
        if (active) {
          setProfile(response.data);
          setAboutDraft(response.data.about || '');
          setLoadError('');
        }
      })
      .catch((error) => {
        if (active) setLoadError(error.message || 'Unable to load your profile.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, [reloadKey]);

  const completion = profile ? calcCompletion(profile) : 0;

  const persistProfile = async (nextProfile, successMessage) => {
    setSaving(true);
    setSaveError('');
    setNotice('');
    try {
      const response = await apiRequest('/students/me/profile', {
        method: 'PUT',
        body: {
          name: nextProfile.name,
          degree: nextProfile.degree,
          college: nextProfile.college,
          rollNo: nextProfile.rollNo,
          phone: nextProfile.contact?.phone || '',
          address: nextProfile.contact?.address || '',
          about: nextProfile.about,
          skills: nextProfile.skills || [],
          education: nextProfile.education || [],
          experience: nextProfile.experience || [],
          projects: nextProfile.projects || [],
        },
      });
      setProfile(response.data);
      setAboutDraft(response.data.about || '');
      setNotice(successMessage);
      return true;
    } catch (error) {
      setSaveError(error.message || 'Unable to save your profile.');
      return false;
    } finally {
      setSaving(false);
    }
  };

  const saveAbout = async () => {
    if (await persistProfile({ ...profile, about: aboutDraft }, 'About section saved.')) {
      setEditAbout(false);
    }
  };

  const addSkill = async () => {
    const skill = prompt('Add a skill:');
    const trimmedSkill = skill?.trim();
    if (trimmedSkill && !profile.skills.includes(trimmedSkill)) {
      await persistProfile({ ...profile, skills: [...profile.skills, trimmedSkill] }, 'Skill added.');
    }
  };

  const removeSkill = async (skillToRemove) => {
    await persistProfile({
      ...profile,
      skills: profile.skills.filter((skill) => skill !== skillToRemove),
    }, 'Skill removed.');
  };

  if (loading) {
    return <main className="flex-1 px-4 md:px-8 py-6" role="status">Loading profile...</main>;
  }
  if (loadError || !profile) {
    return (
      <main className="flex-1 px-4 md:px-8 py-6" role="alert">
        <p className="text-red-600">{loadError || 'Profile data is unavailable.'}</p>
        <button onClick={() => { setLoading(true); setReloadKey((key) => key + 1); }} className="mt-3 text-blue-600 hover:underline">
          Retry
        </button>
      </main>
    );
  }


  return (
    <main className="flex-1 px-4 md:px-8 py-6 overflow-x-hidden">
      <h2 className="text-2xl font-bold text-gray-900 mb-1">My Profile</h2>
      <p className="text-gray-500 text-sm mb-6">Manage your academic and professional information.</p>
      {notice && <p role="status" className="mb-4 text-sm text-green-700">{notice}</p>}
      {saveError && <p role="alert" className="mb-4 text-sm text-red-600">{saveError}</p>}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* LEFT — Main Content */}
          <div className="lg:col-span-2 space-y-5">
            {/* Profile Card */}
            <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
              <div className="h-32 bg-gradient-to-r from-indigo-500 via-blue-500 to-purple-400" />
              <div className="p-5 relative">
                <div className="absolute -top-12 left-5">
                  <div className="w-24 h-24 rounded-full border-4 border-white bg-blue-600 overflow-hidden flex items-center justify-center">
                    <span className="text-white text-3xl font-bold">{profile.name?.[0] || profile.email?.[0] || 'S'}</span>
                  </div>
                </div>

                <div className="mt-14">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h2 className="text-xl font-bold">{profile.name || 'Complete your profile'}</h2>
                      <p className="text-gray-500 text-sm">{profile.degree || 'Degree not provided'}</p>
                      <p className="text-gray-400 text-xs flex items-center gap-1 mt-0.5">
                        <GraduationCap className="w-3.5 h-3.5" /> {profile.college || 'College not provided'}
                      </p>
                      <p className="text-gray-400 text-xs mt-0.5">Roll No: {profile.rollNo || 'Not provided'}</p>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2 mt-4">
                    {profile.skills.map((skill) => (
                      <button
                        key={skill}
                        type="button"
                        disabled={saving}
                        onClick={() => removeSkill(skill)}
                        className="bg-blue-600 text-white px-3 py-1 rounded-full text-xs cursor-pointer hover:bg-red-500 transition-colors disabled:opacity-50"
                        title={`Remove ${skill}`}
                      >
                        {skill} ×
                      </button>
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
                  <Phone className="w-4 h-4 text-blue-500" /> {profile.contact?.phone || 'Not provided'}
                </p>
                <p className="flex items-center gap-2 text-sm text-gray-600">
                  <Mail className="w-4 h-4 text-blue-500" /> {profile.contact?.email || profile.email}
                </p>
                <p className="flex items-center gap-2 text-sm text-gray-600">
                  <MapPin className="w-4 h-4 text-blue-500" /> {profile.contact?.address || 'Not provided'}
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
                    <button onClick={saveAbout} disabled={saving} className="bg-blue-600 text-white text-sm px-4 py-1.5 rounded-lg hover:bg-blue-700 disabled:opacity-50">
                      {saving ? 'Saving...' : 'Save'}
                    </button>
                    <button onClick={() => setEditAbout(false)} className="text-gray-500 text-sm px-4 py-1.5 rounded-lg hover:bg-gray-100">
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <p className="text-gray-600 text-sm leading-relaxed">{profile.about || 'No profile summary has been added yet.'}</p>
              )}
            </div>

            {/* Education */}
            <div className="bg-white p-5 rounded-2xl shadow-sm">
              <h3 className="font-semibold mb-3">Education</h3>
              <div className="space-y-4">
                {profile.education.length === 0 && <p className="text-sm text-gray-500">No education records have been added.</p>}
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
              {profile.experience.length === 0 && <p className="text-sm text-gray-500">No experience records have been added.</p>}
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
                {profile.projects.length === 0 && <p className="text-sm text-gray-500 sm:col-span-2">No projects have been added.</p>}
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
              <div className="bg-gray-50 border border-gray-200 text-gray-600 p-3 rounded-lg text-sm">
                <p className="font-medium">{profile.placementStatus?.replaceAll('_', ' ') || 'Status not set'}</p>
                <p className="text-xs mt-0.5">
                  {profile.openToOpportunities ? 'Open to opportunities' : 'Not open to opportunities'}
                </p>
              </div>
            </div>

            {/* Quick Stats */}
            <div className="bg-white p-5 rounded-xl shadow-sm">
              <h3 className="font-semibold text-sm mb-3">Quick Stats</h3>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Applications</span>
                  <span className="font-semibold">—</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Shortlisted</span>
                  <span className="font-semibold text-gray-500">—</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Interviews</span>
                  <span className="font-semibold text-gray-500">—</span>
                </div>
              </div>
              <p className="mt-3 text-xs text-gray-400">Application and interview APIs are not available.</p>
            </div>
          </div>
        </div>
      </main>
  );
}
