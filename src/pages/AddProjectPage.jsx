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
import { createProject } from '../services/api/projectService';

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
  'Django', 'FastAPI', 'Express', 'TailwindCSS', 'Firebase', 'Spring Boot',
];

const ALLOWED_MEDIA_EXTENSIONS = ['jpg', 'jpeg', 'png', 'webp', 'pdf'];

const isValidUrl = (string) => {
  if (!string) return true;
  try {
    const url = new URL(string);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
};

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
  const [isSubmitting, setIsSubmitting] = useState(false);

  /* ── helpers ── */
  const handleChange = (field) => (e) => {
    setForm((f) => ({ ...f, [field]: e.target.value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: '' }));
    }
  };

  const addTech = (tag) => {
    const trimmed = tag.trim();
    if (trimmed && !form.tech.includes(trimmed)) {
      setForm((f) => ({ ...f, tech: [...f.tech, trimmed], techInput: '' }));
      if (errors.tech) {
        setErrors((prev) => ({ ...prev, tech: '' }));
      }
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
      const uploadedUrl = res.data.fileUrl || res.data.downloadUrl;
      setForm((f) => ({
        ...f,
        mediaPreview: isPdf ? 'pdf' : localUrl,
        mediaUrl: uploadedUrl,
        mediaFileName: file.name,
        mediaFileType: isPdf ? 'pdf' : 'image',
        mediaFileSize: file.size,
      }));
      setMediaUploadStatus({
        type: 'success',
        text: `Uploaded "${file.name}" to server successfully!`,
      });
    } else {
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
        text: `File attached: "${file.name}"`,
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
    if (!form.title.trim()) {
      e.title = 'Project title is required.';
    } else if (form.title.trim().length > 150) {
      e.title = 'Project title cannot exceed 150 characters.';
    }

    if (!form.description.trim()) {
      e.description = 'A project description is required.';
    } else if (form.description.trim().length > 2000) {
      e.description = 'Description cannot exceed 2000 characters.';
    }

    if (form.tech.length === 0) {
      e.tech = 'Add at least one technology stack item.';
    }

    if (form.liveUrl.trim() && !isValidUrl(form.liveUrl.trim())) {
      e.liveUrl = 'Please enter a valid URL starting with http:// or https://';
    }

    if (form.repoUrl.trim() && !isValidUrl(form.repoUrl.trim())) {
      e.repoUrl = 'Please enter a valid repository URL starting with http:// or https://';
    }

    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setIsSubmitting(true);
    setErrors({});

    const projectPayload = {
      title: form.title.trim(),
      description: form.description.trim(),
      liveUrl: form.liveUrl.trim() || null,
      repoUrl: form.repoUrl.trim() || null,
      mediaUrl: form.mediaUrl || null,
      techStack: form.tech,
    };

    try {
      await createProject(projectPayload);
      navigate('/student/profile', {
        state: {
          message: `Project "${form.title.trim()}" added to your profile showcase!`,
        },
      });
    } catch (err) {
      setErrors({
        submit: err.message || 'Failed to create project on backend. Please check details.',
      });
      setIsSubmitting(false);
    }
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
      {/* Back button */}
      <button
        onClick={() => navigate('/student/profile')}
        className="inline-flex items-center gap-1.5 text-blue-600 text-sm hover:underline mb-6 font-medium"
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
          Showcase your engineering work — fill in the details below to add it to your placement profile.
        </p>
      </div>

      {/* Submission error alert */}
      {errors.submit && (
        <div className="flex items-start gap-2.5 p-4 rounded-xl mb-6 text-sm bg-red-50 border border-red-200 text-red-800">
          <AlertCircle className="w-5 h-5 shrink-0 text-red-600 mt-0.5" />
          <div className="flex-1 font-medium">{errors.submit}</div>
          <button
            onClick={() => setErrors((e) => ({ ...e, submit: null }))}
            className="text-gray-400 hover:text-gray-600 font-bold"
          >
            ✕
          </button>
        </div>
      )}

      <form onSubmit={handleSubmit} noValidate>
        <div className="grid lg:grid-cols-3 gap-6">

          {/* ── LEFT: form ── */}
          <div className="lg:col-span-2 space-y-5">

            {/* Project Title & Description */}
            <div className="bg-white rounded-2xl shadow-sm p-6 border border-gray-100">
              <h2 className="font-semibold text-gray-900 mb-4">Project Details</h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Project Title <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. CloudScaler — Intelligent Resource Auto-Scaling"
                    value={form.title}
                    onChange={handleChange('title')}
                    disabled={isSubmitting}
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
                    placeholder="Describe the problem solved, your architectural approach, features built, and the impact..."
                    value={form.description}
                    onChange={handleChange('description')}
                    disabled={isSubmitting}
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
                      {form.description.length} / 2000
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Technologies */}
            <div className="bg-white rounded-2xl shadow-sm p-6 border border-gray-100">
              <h2 className="font-semibold text-gray-900 mb-1">Technologies Used <span className="text-red-500">*</span></h2>
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
                    className="flex items-center gap-1 bg-blue-100 text-blue-700 text-xs px-2.5 py-1 rounded-full font-medium"
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
                  placeholder={form.tech.length === 0 ? 'Type a technology and press Enter...' : 'Add more...'}
                  value={form.techInput}
                  onChange={handleChange('techInput')}
                  onKeyDown={handleTechKeyDown}
                  disabled={isSubmitting}
                  className="flex-1 min-w-[120px] text-sm focus:outline-none bg-transparent"
                />
              </div>
              {errors.tech && (
                <p className="text-red-500 text-xs mt-1">{errors.tech}</p>
              )}

              {/* Suggested tags */}
              <div className="mt-3">
                <p className="text-xs text-gray-400 mb-2">Suggested tags:</p>
                <div className="flex flex-wrap gap-1.5">
                  {TECH_SUGGESTIONS.filter((t) => !form.tech.includes(t)).slice(0, 10).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => addTech(t)}
                      disabled={isSubmitting}
                      className="text-xs bg-gray-100 hover:bg-blue-50 hover:text-blue-600 text-gray-600 px-2.5 py-1 rounded-full transition-colors flex items-center gap-1"
                    >
                      <Plus className="w-2.5 h-2.5" /> {t}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Links */}
            <div className="bg-white rounded-2xl shadow-sm p-6 border border-gray-100">
              <h2 className="font-semibold text-gray-900 mb-1">Project Links</h2>
              <p className="text-gray-400 text-xs mb-4">
                Add links to where recruiters can test or view the source code.
              </p>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Live Demo URL
                  </label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400">
                      <ExternalLink className="w-4 h-4" />
                    </span>
                    <input
                      type="url"
                      placeholder="https://myproject.vercel.app"
                      value={form.liveUrl}
                      onChange={handleChange('liveUrl')}
                      disabled={isSubmitting}
                      className={`w-full pl-10 pr-4 py-2.5 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition ${
                        errors.liveUrl ? 'border-red-400 bg-red-50' : 'border-gray-300'
                      }`}
                    />
                  </div>
                  {errors.liveUrl && (
                    <p className="text-red-500 text-xs mt-1">{errors.liveUrl}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Source Code / Repository URL
                  </label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400">
                      <Github className="w-4 h-4" />
                    </span>
                    <input
                      type="url"
                      placeholder="https://github.com/username/project"
                      value={form.repoUrl}
                      onChange={handleChange('repoUrl')}
                      disabled={isSubmitting}
                      className={`w-full pl-10 pr-4 py-2.5 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition ${
                        errors.repoUrl ? 'border-red-400 bg-red-50' : 'border-gray-300'
                      }`}
                    />
                  </div>
                  {errors.repoUrl && (
                    <p className="text-red-500 text-xs mt-1">{errors.repoUrl}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Media Upload */}
            <div className="bg-white rounded-2xl shadow-sm p-6 border border-gray-100">
              <div className="flex items-center justify-between mb-1">
                <h2 className="font-semibold text-gray-900">Project Screenshot or Media</h2>
                <span className="text-xs text-gray-400 font-normal">Optional</span>
              </div>
              <p className="text-gray-400 text-xs mb-4">
                Upload a preview banner, architecture diagram, or PDF documentation (Max 10MB).
              </p>

              {mediaUploadStatus && (
                <div
                  className={`flex items-center gap-2 p-3 rounded-xl mb-3 text-xs ${
                    mediaUploadStatus.type === 'error'
                      ? 'bg-red-50 text-red-600 border border-red-200'
                      : 'bg-green-50 text-green-700 border border-green-200'
                  }`}
                >
                  {mediaUploadStatus.type === 'error' ? (
                    <AlertCircle className="w-4 h-4 shrink-0" />
                  ) : (
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                  )}
                  <span>{mediaUploadStatus.text}</span>
                </div>
              )}

              {form.mediaPreview ? (
                <div className="relative border border-gray-200 rounded-xl overflow-hidden bg-gray-50 p-3 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {form.mediaFileType === 'pdf' || form.mediaPreview === 'pdf' ? (
                      <div className="bg-red-100 p-2.5 rounded-lg text-red-600">
                        <FileText className="w-6 h-6" />
                      </div>
                    ) : (
                      <img
                        src={form.mediaPreview}
                        alt="Project media preview"
                        className="w-16 h-16 object-cover rounded-lg border border-gray-200"
                      />
                    )}
                    <div>
                      <p className="text-sm font-semibold text-gray-800 break-all">
                        {form.mediaFileName || 'Project Media File'}
                      </p>
                      {form.mediaFileSize && (
                        <p className="text-xs text-gray-400 mt-0.5">
                          {formatFileSize(form.mediaFileSize)}
                        </p>
                      )}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={removeMedia}
                    disabled={isSubmitting}
                    className="p-1.5 hover:bg-red-50 text-gray-400 hover:text-red-500 rounded-lg transition"
                    title="Remove media"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  disabled={uploadingMedia || isSubmitting}
                  onClick={() => mediaRef.current?.click()}
                  className="w-full border-2 border-dashed border-gray-300 rounded-xl h-40 flex flex-col items-center justify-center gap-2 hover:border-blue-400 hover:bg-blue-50/40 transition group disabled:opacity-60"
                >
                  <div className="bg-gray-100 group-hover:bg-blue-100 p-3 rounded-full transition">
                    {uploadingMedia ? (
                      <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />
                    ) : (
                      <Upload className="w-5 h-5 text-gray-400 group-hover:text-blue-600 transition" />
                    )}
                  </div>
                  <p className="text-sm text-gray-500 group-hover:text-blue-600 transition font-medium">
                    {uploadingMedia ? 'Uploading media to server...' : 'Click to upload project media file'}
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
                disabled={isSubmitting || uploadingMedia}
                className="flex-1 bg-blue-600 text-white py-3 rounded-xl font-semibold hover:bg-blue-700 transition shadow-sm text-sm disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> Saving Project...
                  </>
                ) : (
                  'Add Project to Profile'
                )}
              </button>
              <button
                type="button"
                onClick={() => navigate('/student/profile')}
                disabled={isSubmitting}
                className="flex-1 border border-gray-300 text-gray-600 py-3 rounded-xl font-medium hover:bg-gray-50 transition text-sm"
              >
                Cancel
              </button>
            </div>
          </div>

          {/* ── RIGHT: Live Preview & Tips ── */}
          <div className="space-y-5">

            {/* Form Completion */}
            <div className="bg-white rounded-2xl shadow-sm p-5 border border-gray-100">
              <div className="flex justify-between text-sm font-semibold mb-2">
                <span className="text-gray-700">Form Completion</span>
                <span className="text-blue-600">{completionPct}%</span>
              </div>
              <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
                <div
                  className="bg-blue-600 h-full rounded-full transition-all duration-500"
                  style={{ width: `${completionPct}%` }}
                />
              </div>
              <ul className="mt-4 space-y-2">
                {[
                  { label: 'Project Title', done: !!form.title.trim() },
                  { label: 'Description', done: !!form.description.trim() },
                  { label: 'Tech Stack (at least 1)', done: form.tech.length > 0 },
                  { label: 'Live Demo URL', done: !!form.liveUrl.trim() },
                  { label: 'Repository URL', done: !!form.repoUrl.trim() },
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
                    <span className={done ? 'text-gray-700 font-medium' : 'text-gray-400'}>{label}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Live Preview Card */}
            {form.title && (
              <div className="bg-white rounded-2xl shadow-sm p-5 border border-gray-100">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">
                  Card Preview
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
                      <span key={t} className="bg-blue-50 text-blue-700 text-[11px] px-2 py-0.5 rounded font-medium">
                        {t}
                      </span>
                    ))}
                  </div>
                )}
                {(form.liveUrl || form.repoUrl) && (
                  <div className="flex gap-3 mt-3 pt-2 border-t border-gray-100">
                    {form.liveUrl && (
                      <span className="flex items-center gap-1 text-xs text-blue-600 font-medium">
                        <ExternalLink className="w-3 h-3" /> Live Demo
                      </span>
                    )}
                    {form.repoUrl && (
                      <span className="flex items-center gap-1 text-xs text-gray-600 font-medium">
                        <Github className="w-3 h-3" /> Repo
                      </span>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Tips Card */}
            <div className="bg-blue-50/70 border border-blue-200 rounded-2xl p-5">
              <p className="text-xs font-bold text-blue-900 mb-2">💡 Tips for a strong showcase</p>
              <ul className="space-y-1.5 text-xs text-blue-800">
                <li>• Keep the title clear and outcome-oriented</li>
                <li>• Emphasize your personal contribution and tech choices</li>
                <li>• Providing a public GitHub repository link builds credibility</li>
                <li>• Add architecture diagrams or UI screenshots when possible</li>
              </ul>
            </div>
          </div>

        </div>
      </form>
    </main>
  );
}
