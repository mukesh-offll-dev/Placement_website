import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  FolderKanban,
  Link as LinkIcon,
  Github,
  Image as ImageIcon,
  Plus,
  X,
  Upload,
  ExternalLink,
} from 'lucide-react';

const TECH_SUGGESTIONS = [
  'React', 'Node.js', 'Python', 'Java', 'TypeScript', 'JavaScript',
  'MongoDB', 'PostgreSQL', 'AWS', 'Docker', 'Figma', 'Flutter',
  'Django', 'FastAPI', 'Express', 'TailwindCSS', 'Firebase',
];

export default function AddProjectPage() {
  const navigate = useNavigate();
  const mediaRef = useRef();

  const [form, setForm] = useState({
    title: '',
    description: '',
    techInput: '',
    tech: [],
    liveUrl: '',
    repoUrl: '',
    mediaPreview: null,
  });
  const [errors, setErrors] = useState({});
  const [submitted, setSubmitted] = useState(false);

  /* ── helpers ── */
  const handleChange = (field) => (e) =>
    setForm((f) => ({ ...f, [field]: e.target.value }));

  const addTech = (tag) => {
    const trimmed = tag.trim();
    if (trimmed && !form.tech.includes(trimmed)) {
      setForm((f) => ({ ...f, tech: [...f.tech, trimmed], techInput: '' }));
    }
  };

  const handleTechKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addTech(form.techInput);
    }
  };

  const removeTech = (tag) =>
    setForm((f) => ({ ...f, tech: f.tech.filter((t) => t !== tag) }));

  const handleMediaUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      setForm((f) => ({ ...f, mediaPreview: URL.createObjectURL(file) }));
    }
  };

  const validate = () => {
    const e = {};
    if (!form.title.trim()) e.title = 'Project title is required.';
    if (!form.description.trim()) e.description = 'A short description is required.';
    if (form.tech.length === 0) e.tech = 'Add at least one technology.';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validate()) return;

    const newProject = {
      title: form.title.trim(),
      desc: form.description.trim(),
      tech: form.tech,
      live: form.liveUrl.trim(),
      repo: form.repoUrl.trim(),
      media: form.mediaPreview,
    };

    navigate('/student/profile', { state: { newProject } });
  };

  /* ── progress indicator ── */
  const filledFields = [
    form.title.trim(),
    form.description.trim(),
    form.tech.length > 0,
    form.liveUrl.trim(),
    form.repoUrl.trim(),
    form.mediaPreview,
  ].filter(Boolean).length;
  const completionPct = Math.round((filledFields / 6) * 100);

  return (
    <main className="flex-1 max-w-5xl w-full mx-auto px-4 py-6 overflow-x-hidden">
      {/* Back */}
        <button
          onClick={() => navigate('/student/profile')}
          className="inline-flex items-center gap-1.5 text-blue-600 text-sm hover:underline mb-6"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Profile
        </button>

        {/* Page header */}
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-1">
            <div className="bg-blue-100 p-2.5 rounded-xl">
              <FolderKanban className="w-5 h-5 text-blue-600" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900">Add New Project</h1>
          </div>
          <p className="text-gray-500 text-sm pl-14">
            Showcase your work — fill in the details below to add it to your profile.
          </p>
        </div>

        <form onSubmit={handleSubmit} noValidate>
          <div className="grid lg:grid-cols-3 gap-6">

            {/* ── LEFT: form ── */}
            <div className="lg:col-span-2 space-y-5">

              {/* Project Title */}
              <div className="bg-white rounded-2xl shadow-sm p-6">
                <h2 className="font-semibold text-gray-900 mb-4">Project Details</h2>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Project Title <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. CloudScaler — Auto-scaling Platform"
                      value={form.title}
                      onChange={handleChange('title')}
                      className={`w-full px-4 py-2.5 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition ${
                        errors.title ? 'border-red-400 bg-red-50' : 'border-gray-300'
                      }`}
                    />
                    {errors.title && (
                      <p className="text-red-500 text-xs mt-1">{errors.title}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Description <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      rows={4}
                      placeholder="Briefly describe what this project does, the problem it solves, and your role in building it..."
                      value={form.description}
                      onChange={handleChange('description')}
                      className={`w-full px-4 py-2.5 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none transition ${
                        errors.description ? 'border-red-400 bg-red-50' : 'border-gray-300'
                      }`}
                    />
                    <div className="flex justify-between mt-1">
                      {errors.description ? (
                        <p className="text-red-500 text-xs">{errors.description}</p>
                      ) : (
                        <span />
                      )}
                      <span className="text-xs text-gray-400">
                        {form.description.length} / 500
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Technologies */}
              <div className="bg-white rounded-2xl shadow-sm p-6">
                <h2 className="font-semibold text-gray-900 mb-1">Technologies Used</h2>
                <p className="text-gray-400 text-xs mb-4">
                  Type a technology and press Enter or comma to add it.
                </p>

                {/* Tag input */}
                <div
                  className={`flex flex-wrap gap-2 px-3 py-2.5 border rounded-xl min-h-[48px] focus-within:ring-2 focus-within:ring-blue-500 transition ${
                    errors.tech ? 'border-red-400 bg-red-50' : 'border-gray-300'
                  }`}
                >
                  {form.tech.map((tag) => (
                    <span
                      key={tag}
                      className="flex items-center gap-1 bg-blue-100 text-blue-700 text-xs px-2.5 py-1 rounded-full"
                    >
                      {tag}
                      <button
                        type="button"
                        onClick={() => removeTech(tag)}
                        className="hover:text-red-500 transition-colors"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                  <input
                    type="text"
                    placeholder={form.tech.length === 0 ? 'React, Node.js, Python...' : ''}
                    value={form.techInput}
                    onChange={handleChange('techInput')}
                    onKeyDown={handleTechKeyDown}
                    onBlur={() => form.techInput.trim() && addTech(form.techInput)}
                    className="flex-1 min-w-[120px] outline-none text-sm bg-transparent"
                  />
                </div>
                {errors.tech && (
                  <p className="text-red-500 text-xs mt-1">{errors.tech}</p>
                )}

                {/* Suggestions */}
                <div className="flex flex-wrap gap-1.5 mt-3">
                  {TECH_SUGGESTIONS.filter((s) => !form.tech.includes(s)).slice(0, 10).map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => addTech(s)}
                      className="flex items-center gap-1 text-xs text-gray-500 border border-gray-200 px-2.5 py-1 rounded-full hover:bg-blue-50 hover:border-blue-300 hover:text-blue-600 transition-colors"
                    >
                      <Plus className="w-2.5 h-2.5" /> {s}
                    </button>
                  ))}
                </div>
              </div>

              {/* Links */}
              <div className="bg-white rounded-2xl shadow-sm p-6">
                <h2 className="font-semibold text-gray-900 mb-4">Project Links</h2>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Live URL
                    </label>
                    <div className="relative">
                      <ExternalLink className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input
                        type="url"
                        placeholder="https://yourproject.vercel.app"
                        value={form.liveUrl}
                        onChange={handleChange('liveUrl')}
                        className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      GitHub / Repository URL
                    </label>
                    <div className="relative">
                      <Github className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input
                        type="url"
                        placeholder="https://github.com/username/project"
                        value={form.repoUrl}
                        onChange={handleChange('repoUrl')}
                        className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Media */}
              <div className="bg-white rounded-2xl shadow-sm p-6">
                <h2 className="font-semibold text-gray-900 mb-1">Project Screenshot / Banner</h2>
                <p className="text-gray-400 text-xs mb-4">
                  Optional — upload a screenshot or banner image for your project.
                </p>

                {form.mediaPreview ? (
                  <div className="relative rounded-xl overflow-hidden border border-gray-200">
                    <img
                      src={form.mediaPreview}
                      alt="Project preview"
                      className="w-full h-48 object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => setForm((f) => ({ ...f, mediaPreview: null }))}
                      className="absolute top-2 right-2 bg-white rounded-full p-1 shadow hover:bg-red-50 transition-colors"
                    >
                      <X className="w-4 h-4 text-gray-600" />
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => mediaRef.current.click()}
                    className="w-full border-2 border-dashed border-gray-300 rounded-xl h-40 flex flex-col items-center justify-center gap-2 hover:border-blue-400 hover:bg-blue-50 transition-colors group"
                  >
                    <div className="bg-gray-100 group-hover:bg-blue-100 p-3 rounded-full transition-colors">
                      <Upload className="w-5 h-5 text-gray-400 group-hover:text-blue-600 transition-colors" />
                    </div>
                    <p className="text-sm text-gray-500 group-hover:text-blue-600 transition-colors font-medium">
                      Click to upload image
                    </p>
                    <p className="text-xs text-gray-400">PNG, JPG, WebP up to 5 MB</p>
                  </button>
                )}
                <input
                  type="file"
                  ref={mediaRef}
                  onChange={handleMediaUpload}
                  accept="image/*"
                  className="hidden"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pb-6">
                <button
                  type="submit"
                  className="flex-1 bg-blue-600 text-white py-3 rounded-xl font-semibold hover:bg-blue-700 transition-colors shadow-sm text-sm"
                >
                  Add Project to Profile
                </button>
                <button
                  type="button"
                  onClick={() => navigate('/student/profile')}
                  className="flex-1 border border-gray-300 text-gray-600 py-3 rounded-xl font-medium hover:bg-gray-50 transition-colors text-sm"
                >
                  Cancel
                </button>
              </div>
            </div>

            {/* ── RIGHT: live preview + tips ── */}
            <div className="space-y-5">

              {/* Form completion */}
              <div className="bg-white rounded-2xl shadow-sm p-5">
                <div className="flex justify-between text-sm font-medium mb-2">
                  <span className="text-gray-700">Form Completion</span>
                  <span className="text-blue-600">{completionPct}%</span>
                </div>
                <div className="w-full bg-gray-200 h-2 rounded">
                  <div
                    className="bg-blue-600 h-2 rounded transition-all duration-500"
                    style={{ width: `${completionPct}%` }}
                  />
                </div>
                <ul className="mt-3 space-y-1.5">
                  {[
                    { label: 'Title', done: !!form.title.trim() },
                    { label: 'Description', done: !!form.description.trim() },
                    { label: 'Technologies', done: form.tech.length > 0 },
                    { label: 'Live URL', done: !!form.liveUrl.trim() },
                    { label: 'Repo URL', done: !!form.repoUrl.trim() },
                    { label: 'Screenshot', done: !!form.mediaPreview },
                  ].map(({ label, done }) => (
                    <li key={label} className="flex items-center gap-2 text-xs">
                      <span
                        className={`w-4 h-4 rounded-full flex items-center justify-center text-white text-[10px] font-bold ${
                          done ? 'bg-green-500' : 'bg-gray-200'
                        }`}
                      >
                        {done ? '✓' : ''}
                      </span>
                      <span className={done ? 'text-gray-700' : 'text-gray-400'}>{label}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Live Preview Card */}
              {form.title && (
                <div className="bg-white rounded-2xl shadow-sm p-5">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">
                    Preview
                  </p>
                  {form.mediaPreview && (
                    <img
                      src={form.mediaPreview}
                      alt="Preview"
                      className="w-full h-28 object-cover rounded-xl mb-3"
                    />
                  )}
                  <p className="font-bold text-sm text-gray-900">{form.title}</p>
                  {form.description && (
                    <p className="text-xs text-gray-500 mt-1 leading-relaxed line-clamp-3">
                      {form.description}
                    </p>
                  )}
                  {form.tech.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-3">
                      {form.tech.map((t) => (
                        <span key={t} className="bg-gray-100 text-gray-600 text-xs px-2 py-0.5 rounded">
                          {t}
                        </span>
                      ))}
                    </div>
                  )}
                  {(form.liveUrl || form.repoUrl) && (
                    <div className="flex gap-3 mt-3">
                      {form.liveUrl && (
                        <span className="flex items-center gap-1 text-xs text-blue-600">
                          <ExternalLink className="w-3 h-3" /> Live
                        </span>
                      )}
                      {form.repoUrl && (
                        <span className="flex items-center gap-1 text-xs text-gray-600">
                          <Github className="w-3 h-3" /> Repo
                        </span>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Tips */}
              <div className="bg-blue-50 border border-blue-100 rounded-2xl p-5">
                <p className="text-xs font-semibold text-blue-700 mb-2">💡 Tips for a great project</p>
                <ul className="space-y-1.5 text-xs text-blue-600">
                  <li>• Keep the title concise and specific</li>
                  <li>• Mention the problem solved in your description</li>
                  <li>• Add a live demo link to stand out</li>
                  <li>• Include at least 3 technologies</li>
                  <li>• Upload a clean screenshot or banner</li>
                </ul>
              </div>
            </div>

          </div>
        </form>
      </main>
  );
}
