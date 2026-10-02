import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  FolderKanban,
  Link as LinkIcon,
  Image as ImageIcon,
  Plus,
  X,
  Upload,
  ExternalLink,
  FileText,
  Loader2,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import {
  uploadProjectMediaStandalone,
  validateFile,
  formatFileSize,
} from '../services/fileUploadService';

const Github = ({ className = 'w-4 h-4' }) => (
  <svg
    className={className}
    fill="currentColor"
    viewBox="0 0 24 24"
    aria-hidden="true"
  >
    <path
      fillRule="evenodd"
      d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
      clipRule="evenodd"
    />
  </svg>
);

const TECH_SUGGESTIONS = [
  'React', 'Node.js', 'Python', 'Java', 'TypeScript', 'JavaScript',
  'MongoDB', 'PostgreSQL', 'AWS', 'Docker', 'Figma', 'Flutter',
  'Django', 'FastAPI', 'Express', 'TailwindCSS', 'Firebase',
];

const ALLOWED_MEDIA_EXTENSIONS = ['jpg', 'jpeg', 'png', 'webp', 'pdf'];

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
    mediaUrl: null,
    mediaFileName: '',
    mediaFileType: '',
    mediaFileSize: null,
  });

  const [errors, setErrors] = useState({});
  const [uploadingMedia, setUploadingMedia] = useState(false);
  const [mediaUploadStatus, setMediaUploadStatus] = useState(null);

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

  const handleMediaUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate media format (JPG, JPEG, PNG, WEBP, PDF) and size (10MB)
    const validation = validateFile(file, ALLOWED_MEDIA_EXTENSIONS, 10 * 1024 * 1024);
    if (!validation.valid) {
      setMediaUploadStatus({ type: 'error', text: validation.error });
      if (mediaRef.current) mediaRef.current.value = '';
      return;
    }

    const isPdf = file.name.toLowerCase().endsWith('.pdf');
    const localUrl = URL.createObjectURL(file);

    setUploadingMedia(true);
    setMediaUploadStatus(null);

    // Call backend upload endpoint
    const res = await uploadProjectMediaStandalone(file);

    setUploadingMedia(false);

    if (res.success && res.data) {
      setForm((f) => ({
        ...f,
        mediaPreview: isPdf ? 'pdf' : localUrl,
        mediaUrl: res.data.fileUrl || res.data.downloadUrl,
        mediaFileName: file.name,
        mediaFileType: isPdf ? 'pdf' : 'image',
        mediaFileSize: file.size,
      }));
      setMediaUploadStatus({
        type: 'success',
        text: `Uploaded "${file.name}" successfully!`,
      });
    } else {
      // Graceful fallback for local display
      setForm((f) => ({
        ...f,
        mediaPreview: isPdf ? 'pdf' : localUrl,
        mediaUrl: localUrl,
        mediaFileName: file.name,
        mediaFileType: isPdf ? 'pdf' : 'image',
        mediaFileSize: file.size,
      }));
      setMediaUploadStatus({
        type: 'success',
        text: `File selected: "${file.name}"`,
      });
    }

    if (mediaRef.current) {
      mediaRef.current.value = '';
    }
  };

  const removeMedia = () => {
    setForm((f) => ({
      ...f,
      mediaPreview: null,
      mediaUrl: null,
      mediaFileName: '',
      mediaFileType: '',
      mediaFileSize: null,
    }));
    setMediaUploadStatus(null);
    if (mediaRef.current) {
      mediaRef.current.value = '';
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
      media: form.mediaUrl || form.mediaPreview,
      mediaFileName: form.mediaFileName,
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

            {/* Project Title & Description */}
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

            {/* Media Upload */}
            <div className="bg-white rounded-2xl shadow-sm p-6">
              <div className="flex justify-between items-center mb-1">
                <h2 className="font-semibold text-gray-900">Project Screenshot / Media Banner</h2>
                {uploadingMedia && (
                  <span className="flex items-center gap-1 text-xs text-blue-600 font-medium">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" /> Uploading media...
                  </span>
                )}
              </div>
              <p className="text-gray-400 text-xs mb-4">
                Upload a screenshot, demo image, or document (JPG, PNG, WebP, PDF up to 10MB).
              </p>

              {/* Status banner */}
              {mediaUploadStatus && (
                <div
                  className={`flex items-start gap-2 p-3 rounded-xl mb-4 text-xs ${
                    mediaUploadStatus.type === 'success'
                      ? 'bg-green-50 border border-green-200 text-green-700'
                      : 'bg-red-50 border border-red-200 text-red-700'
                  }`}
                >
                  {mediaUploadStatus.type === 'success' ? (
                    <CheckCircle2 className="w-4 h-4 shrink-0 text-green-600" />
                  ) : (
                    <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
                  )}
                  <div className="flex-1">{mediaUploadStatus.text}</div>
                  <button
                    type="button"
                    onClick={() => setMediaUploadStatus(null)}
                    className="text-gray-400 hover:text-gray-600 text-xs font-bold"
                  >
                    ✕
                  </button>
                </div>
              )}

              {form.mediaPreview ? (
                <div className="relative rounded-xl overflow-hidden border border-gray-200 bg-gray-50">
                  {form.mediaFileType === 'pdf' || form.mediaPreview === 'pdf' ? (
                    <div className="h-44 flex flex-col items-center justify-center gap-2 p-4 text-center">
                      <FileText className="w-12 h-12 text-red-500" />
                      <p className="text-sm font-semibold text-gray-800">{form.mediaFileName || 'PDF Document Attached'}</p>
                      {form.mediaFileSize && (
                        <p className="text-xs text-gray-500">{formatFileSize(form.mediaFileSize)}</p>
                      )}
                    </div>
                  ) : (
                    <img
                      src={form.mediaPreview}
                      alt="Project preview"
                      className="w-full h-48 object-cover"
                    />
                  )}
                  <div className="absolute top-2 right-2 flex gap-1">
                    <button
                      type="button"
                      onClick={() => mediaRef.current?.click()}
                      className="bg-white/90 backdrop-blur-sm rounded-lg px-2.5 py-1 shadow text-xs font-medium text-gray-700 hover:bg-white transition-colors flex items-center gap-1"
                    >
                      <Upload className="w-3 h-3" /> Change
                    </button>
                    <button
                      type="button"
                      onClick={removeMedia}
                      className="bg-white/90 backdrop-blur-sm rounded-full p-1.5 shadow hover:bg-red-50 text-gray-600 hover:text-red-600 transition-colors"
                      title="Remove file"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  disabled={uploadingMedia}
                  onClick={() => mediaRef.current?.click()}
                  className="w-full border-2 border-dashed border-gray-300 rounded-xl h-40 flex flex-col items-center justify-center gap-2 hover:border-blue-400 hover:bg-blue-50/50 transition-colors group disabled:opacity-60"
                >
                  <div className="bg-gray-100 group-hover:bg-blue-100 p-3 rounded-full transition-colors">
                    {uploadingMedia ? (
                      <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />
                    ) : (
                      <Upload className="w-5 h-5 text-gray-400 group-hover:text-blue-600 transition-colors" />
                    )}
                  </div>
                  <p className="text-sm text-gray-500 group-hover:text-blue-600 transition-colors font-medium">
                    {uploadingMedia ? 'Uploading media...' : 'Click or browse to upload project media'}
                  </p>
                  <p className="text-xs text-gray-400">PNG, JPG, JPEG, WebP, PDF up to 10 MB</p>
                </button>
              )}
              <input
                type="file"
                ref={mediaRef}
                onChange={handleMediaUpload}
                accept=".jpg,.jpeg,.png,.webp,.pdf,image/jpeg,image/png,image/webp,application/pdf"
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
                  { label: 'Screenshot / Media', done: !!form.mediaPreview },
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
                  form.mediaFileType === 'pdf' || form.mediaPreview === 'pdf' ? (
                    <div className="w-full h-24 bg-gray-100 rounded-xl mb-3 flex items-center justify-center gap-2 text-xs text-gray-600">
                      <FileText className="w-5 h-5 text-red-500" /> Attached PDF
                    </div>
                  ) : (
                    <img
                      src={form.mediaPreview}
                      alt="Preview"
                      className="w-full h-28 object-cover rounded-xl mb-3"
                    />
                  )
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
                <li>• Upload a clean screenshot or project banner</li>
              </ul>
            </div>
          </div>

        </div>
      </form>
    </main>
  );
}
