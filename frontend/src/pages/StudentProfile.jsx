import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  AlertCircle,
  Award,
  BadgeCheck,
  Briefcase,
  Check,
  CheckCircle2,
  ChevronRight,
  Eye,
  EyeOff,
  FileText,
  FolderOpen,
  GraduationCap,
  KeyRound,
  Layers,
  Link as LinkIcon,
  Loader2,
  Lock,
  Mail,
  MapPin,
  Paperclip,
  Pencil,
  Phone,
  Plus,
  RefreshCw,
  RotateCcw,
  Save,
  Send,
  Settings,
  ShieldCheck,
  Sparkles,
  Trash2,
  Trophy,
  X,
  ExternalLink,
} from 'lucide-react';
import { getProfile, updateProfile } from '../services/api/studentService';
import {
  discardDraft,
  getDraft,
  saveDraft,
  submitDraft,
  withdrawDraft,
} from '../services/api/studentDraftService';
import { formatFileSize } from '../services/api/fileService';
import { getUser } from '../services/authService';
import EmptyState from '../components/EmptyState';
import ConfirmDialog from '../components/ConfirmDialog';
import ChangePasswordModal from '../components/ChangePasswordModal';
import { ProtectedMediaPreview, ProtectedFileLink } from '../components/ProtectedMedia';
import { ProfileSkeleton } from '../components/Skeleton';
import SectionCard from '../components/student/SectionCard';
import FormModal from '../components/student/FormModal';
import { TextAreaField, SelectField } from '../components/student/FormFields';
import ItemEditorModal from '../components/student/ItemEditorModal';
import VerificationFileField from '../components/student/VerificationFileField';
import { PersonalDetailsModal, AcademicModal } from '../components/student/ProfileModals';
import {
  AchievementItem,
  CertificationItem,
  DocumentItem,
  EducationItem,
  ExperienceItem,
  ItemActions,
  ProjectItem,
} from '../components/student/DraftItems';
import { notifyVerificationChanged } from '../components/student/useVerificationStatus';
import {
  MAX_ITEMS,
  SECTION_FIELDS,
  SECTION_KEYS,
  SKILL_PROFICIENCIES,
  computeChangedSections,
  deriveBannerState,
  enumLabel,
  flattenErrors,
  isDraftEditable,
  itemKey,
  itemLabel,
  newItemKey,
  normalizeProfileData,
  parseSectionList,
  profileDataEqual,
  sectionLabel,
  toDraftPayload,
  validateProfileData,
  validateSkill,
} from '../utils/profileDraft';
import { toastError, toastInfo, toastSuccess } from '../utils/toast';
import { formatCtc } from '../utils/placement';

const formatPlacedDate = (value) => {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime())
    ? null
    : d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
};

const MOBILE_PROFILE_ROWS = [
  { key: 'PERSONAL', label: 'Personal & contact', kind: 'status' },
  { key: 'ACADEMIC', label: 'Academic details', kind: 'status' },
  { key: 'SKILLS', label: 'Skills', kind: 'list' },
  { key: 'EDUCATION', label: 'Education', kind: 'list' },
  { key: 'PROJECTS', label: 'Projects', kind: 'list' },
  { key: 'EXPERIENCE', label: 'Internships & experience', kind: 'list' },
  { key: 'CERTIFICATIONS', label: 'Certifications', kind: 'list' },
  { key: 'ACHIEVEMENTS', label: 'Achievements', kind: 'list' },
  { key: 'RESUME_DOCS', label: 'Resume & documents', kind: 'resume_docs' },
];

const displayValue = (value) =>
  value !== null && value !== undefined && String(value).trim() !== '' ? String(value) : 'Not provided';

const LIST_SECTIONS = {
  EDUCATION: { Item: EducationItem, icon: GraduationCap, iconClass: 'text-blue-600', title: 'Education & Qualifications', subtitle: 'Academic qualifications, degrees, and school history.', addLabel: 'Add Education', empty: 'No education entries yet', emptyText: 'Add your degree and school history so your advisor and recruiters can see your background.' },
  EXPERIENCE: { Item: ExperienceItem, icon: Briefcase, iconClass: 'text-indigo-600', title: 'Internships & Work Experience', subtitle: 'Internships, industrial training, and employment history.', addLabel: 'Add Internship', empty: 'No internships or experience yet', emptyText: 'Add internships, summer training, or research experience to stand out to companies.' },
  CERTIFICATIONS: { Item: CertificationItem, icon: BadgeCheck, iconClass: 'text-emerald-600', title: 'Certifications', subtitle: 'Professional and online certifications. Attach the certificate so your advisor can verify it.', addLabel: 'Add Certification', empty: 'No certifications yet', emptyText: 'Add certifications such as cloud, language or vendor courses, with the certificate file.' },
  ACHIEVEMENTS: { Item: AchievementItem, icon: Trophy, iconClass: 'text-amber-600', title: 'Achievements', subtitle: 'Hackathons, competitions, awards, publications.', addLabel: 'Add Achievement', empty: 'No achievements yet', emptyText: 'Add hackathon wins, awards or publications, with proof if you have it.' },
  DOCUMENTS: { Item: DocumentItem, icon: FolderOpen, iconClass: 'text-sky-600', title: 'Supporting Documents', subtitle: 'Marksheets, certificates and ID proof that back up your profile.', addLabel: 'Add Document', empty: 'No supporting documents yet', emptyText: 'Upload marksheets or certificates that prove your CGPA, backlogs and qualifications.' },
};

const EVIDENCE_SECTIONS = SECTION_KEYS.filter((k) => k !== 'DOCUMENTS');

export default function StudentProfile() {
  const navigate = useNavigate();
  const location = useLocation();
  const currentUser = getUser();

  // Server state
  const [draft, setDraft] = useState(null); // GET /student/profile/draft response
  const [profile, setProfile] = useState(null); // official GET /student/profile (admin-managed fields)

  // Local working copy of the draft and the last saved copy
  const [data, setData] = useState(() => normalizeProfileData(null));
  const [savedData, setSavedData] = useState(() => normalizeProfileData(null));

  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(null);
  const [notification, setNotification] = useState(null);
  const [viewOfficial, setViewOfficial] = useState(false);
  const [showValidation, setShowValidation] = useState(false);

  // Dialogs
  const [modal, setModal] = useState(null); // {type:'personal'|'academic'|'item'|'submit', sectionKey?, index?}
  const [modalSeq, setModalSeq] = useState(0);
  const [confirm, setConfirm] = useState(null); // 'discard' | 'withdraw'
  const [submitNote, setSubmitNote] = useState('');
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [mobileSection, setMobileSection] = useState(null);
  const [mobileSettingsOpen, setMobileSettingsOpen] = useState(false);

  // Busy flags
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [discarding, setDiscarding] = useState(false);
  const [withdrawing, setWithdrawing] = useState(false);
  const [savingPreference, setSavingPreference] = useState(false);

  // Inline editors
  const [editAbout, setEditAbout] = useState(false);
  const [aboutDraft, setAboutDraft] = useState('');
  const [skillInput, setSkillInput] = useState('');
  const [skillLevel, setSkillLevel] = useState('INTERMEDIATE');
  const [evidenceSection, setEvidenceSection] = useState('ACADEMIC');
  const [evidenceNote, setEvidenceNote] = useState('');

  useEffect(() => {
    if (location.state?.message) {
      setNotification({ type: 'success', text: location.state.message });
      window.history.replaceState({}, '');
    }
  }, [location.state]);

  const applyDraft = useCallback((resp) => {
    const normalised = normalizeProfileData(resp?.data);
    setDraft(resp || null);
    setData(normalised);
    setSavedData(normalised);
    setShowValidation(false);
    notifyVerificationChanged(resp);
  }, []);

  const loadAll = useCallback(async () => {
    setLoading(true);
    setFetchError(null);
    try {
      const [draftRes, profileRes] = await Promise.allSettled([
        getDraft(),
        getProfile(),
      ]);
      if (draftRes.status === 'rejected') throw draftRes.reason;
      applyDraft(draftRes.value);
      setProfile(profileRes.status === 'fulfilled' ? profileRes.value : null);
    } catch (err) {
      setFetchError(err?.message || 'Unable to load your profile from the server.');
    } finally {
      setLoading(false);
    }
  }, [applyDraft]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  // ── derived state ────────────────────────────────────────────────────────────
  const official = useMemo(() => normalizeProfileData(draft?.official), [draft]);
  const hasUnsavedChanges = useMemo(() => !profileDataEqual(data, savedData), [data, savedData]);
  const changedSections = useMemo(() => {
    if (!hasUnsavedChanges && Array.isArray(draft?.changedSections)) return parseSectionList(draft.changedSections);
    return computeChangedSections(data, official);
  }, [hasUnsavedChanges, draft, data, official]);
  const validationErrors = useMemo(() => (showValidation ? validateProfileData(data) : {}), [showValidation, data]);

  const canEditDraft = isDraftEditable(draft);
  const editable = canEditDraft && !viewOfficial;
  const isPending = draft?.status === 'PENDING';
  const lifecycle = draft?.lifecycleStatus || 'ACTIVE';
  const displayData = viewOfficial ? official : data;
  const sectionComments = draft?.sectionComments && typeof draft.sectionComments === 'object' ? draft.sectionComments : {};
  const bannerState = deriveBannerState(draft, { hasUnsavedChanges, changedSections });
  const canDiscard = editable && (hasUnsavedChanges || (draft?.status === 'DRAFT' && draft?.versionId != null));

  // Warn before leaving the page with unsaved edits.
  useEffect(() => {
    if (!hasUnsavedChanges) return undefined;
    const handler = (e) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [hasUnsavedChanges]);

  const sectionProps = (key) => ({
    changed: !viewOfficial && changedSections.includes(key),
    comment: !viewOfficial && !isPending ? sectionComments[key] : undefined,
    errors: validationErrors[key],
  });

  // ── local draft mutations ────────────────────────────────────────────────────
  const setSection = (field, value) => setData((d) => ({ ...d, [field]: value }));

  const openModal = (m) => {
    setModalSeq((n) => n + 1);
    setModal(m);
  };
  const closeModal = () => setModal(null);

  const saveListItem = (sectionKey, index, item) => {
    const field = SECTION_FIELDS[sectionKey];
    const list = data[field];
    if (sectionKey === 'PROJECTS') {
      const title = item.title.trim().toLowerCase();
      if (list.some((p, i) => i !== index && String(p.title || '').trim().toLowerCase() === title)) {
        toastError('You already have a project with this title.');
        return;
      }
    }
    if (index === null || index === undefined) {
      if (list.length >= MAX_ITEMS) {
        toastError(`You can add at most ${MAX_ITEMS} entries to ${sectionLabel(sectionKey).toLowerCase()}.`);
        return;
      }
      setSection(field, [...list, { ...item, id: null, _key: newItemKey() }]);
    } else {
      setSection(
        field,
        list.map((old, i) => (i === index ? { ...old, ...item, id: old.id ?? null, _key: old._key } : old))
      );
    }
    closeModal();
  };

  const removeListItem = (sectionKey, index) => {
    const field = SECTION_FIELDS[sectionKey];
    const removed = data[field][index];
    setSection(field, data[field].filter((_, i) => i !== index));
    toastInfo(`"${itemLabel(sectionKey, removed)}" removed from your draft. Save the draft to keep this change.`);
  };

  const addSkill = (e) => {
    e.preventDefault();
    const name = skillInput.trim();
    const errs = validateSkill({ skillName: name, proficiency: skillLevel });
    if (errs.skillName) {
      toastError(errs.skillName);
      return;
    }
    if (data.skills.some((s) => String(s.skillName).trim().toLowerCase() === name.toLowerCase())) {
      toastError(`"${name}" is already in your skills.`);
      return;
    }
    if (data.skills.length >= MAX_ITEMS) {
      toastError(`You can add at most ${MAX_ITEMS} skills.`);
      return;
    }
    setSection('skills', [...data.skills, { id: null, skillName: name, proficiency: skillLevel, _key: newItemKey() }]);
    setSkillInput('');
  };

  const removeSkill = (index) => setSection('skills', data.skills.filter((_, i) => i !== index));

  const saveAbout = () => {
    if (aboutDraft.length > 2000) {
      toastError('About cannot exceed 2000 characters.');
      return;
    }
    setSection('personal', { ...data.personal, about: aboutDraft.trim() || null });
    setEditAbout(false);
  };

  // ── server actions ───────────────────────────────────────────────────────────
  const checkValid = () => {
    const errors = validateProfileData(data);
    const lines = flattenErrors(errors);
    if (lines.length) {
      setShowValidation(true);
      toastError(
        lines.length === 1 ? lines[0] : `Please fix ${lines.length} problems first (marked in the sections below).`
      );
      return false;
    }
    return true;
  };

  const handleServerError = async (err, fallback) => {
    toastError(err, fallback);
    // A 409 means the draft changed state elsewhere (e.g. submitted in another tab): reload it.
    if (err?.status === 409 || err?.status === 403) {
      try {
        applyDraft(await getDraft());
      } catch {
        // keep the current view
      }
    }
  };

  const handleSaveDraft = async () => {
    if (!checkValid()) return;
    setSaving(true);
    try {
      applyDraft(await saveDraft(toDraftPayload(data)));
      toastSuccess('Draft saved. Submit it for verification when you are ready.');
    } catch (err) {
      await handleServerError(err, 'Could not save your draft. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const openSubmit = () => {
    if (!checkValid()) return;
    if (changedSections.length === 0) {
      toastInfo('Nothing to submit — your draft matches your verified profile.');
      return;
    }
    setSubmitNote('');
    openModal({ type: 'submit' });
  };

  const handleSubmit = async () => {
    if (submitNote.length > 1000) {
      toastError('The note to your advisor cannot exceed 1000 characters.');
      return;
    }
    setSubmitting(true);
    try {
      const needsSave =
        hasUnsavedChanges || draft?.versionId == null || draft?.status === 'REJECTED' || draft?.status === 'NONE';
      if (needsSave) {
        applyDraft(await saveDraft(toDraftPayload(data)));
      }
      applyDraft(await submitDraft(submitNote));
      closeModal();
      setViewOfficial(false);
      toastSuccess('Submitted for verification. Your faculty advisor has been notified.');
    } catch (err) {
      await handleServerError(err, 'Could not submit your profile for verification.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDiscard = async () => {
    setDiscarding(true);
    try {
      if (draft?.status === 'DRAFT' && draft?.versionId != null) {
        await discardDraft();
        applyDraft(await getDraft());
        toastSuccess('Draft discarded. Your profile shows the verified version again.');
      } else {
        setData(savedData);
        setShowValidation(false);
        toastSuccess('Unsaved changes discarded.');
      }
      setConfirm(null);
    } catch (err) {
      await handleServerError(err, 'Could not discard the draft.');
    } finally {
      setDiscarding(false);
    }
  };

  const handleWithdraw = async () => {
    setWithdrawing(true);
    try {
      applyDraft(await withdrawDraft());
      setConfirm(null);
      toastSuccess('Request withdrawn. You can edit your draft again.');
    } catch (err) {
      await handleServerError(err, 'Could not withdraw the request.');
    } finally {
      setWithdrawing(false);
    }
  };

  // "Open to opportunities" is a preference, applied immediately (not verified).
  const handleToggleOpportunities = async () => {
    if (!profile) return;
    const next = !(profile.isOpenToOpportunities ?? true);
    setSavingPreference(true);
    try {
      const payload = {
        fullName: profile.fullName || currentUser?.fullName || 'Student',
        email: profile.email || currentUser?.email,
        phone: profile.phone || null,
        address: profile.address || null,
        about: profile.about || null,
        avatarUrl: profile.avatarUrl || null,
        resumeUrl: profile.resumeUrl || null,
        college: profile.college || null,
        semester: profile.semester ? Number(profile.semester) : null,
        isOpenToOpportunities: next,
        skills: Array.isArray(profile.skills)
          ? profile.skills.map((s) => (typeof s === 'string' ? s : s?.skillName)).filter(Boolean)
          : [],
      };
      const updated = await updateProfile(payload);
      setProfile((p) => ({ ...p, ...(updated && typeof updated === 'object' ? updated : {}), isOpenToOpportunities: next }));
      toastSuccess(next ? 'You are now marked as open to opportunities.' : 'You are no longer marked as open to opportunities.');
    } catch (err) {
      toastError(err, 'Could not update your preference.');
    } finally {
      setSavingPreference(false);
    }
  };

  // ── render ───────────────────────────────────────────────────────────────────
  if (loading) return <ProfileSkeleton />;

  if (fetchError && !draft) {
    return (
      <main className="flex-1 px-4 md:px-8 py-12 flex flex-col items-center justify-center min-h-[60vh]">
        <div className="w-full max-w-md">
          <EmptyState
            type="error"
            title="Failed to Load Profile"
            description={fetchError}
            action={{ label: 'Try Again', onClick: loadAll, icon: RefreshCw }}
          />
        </div>
      </main>
    );
  }

  const personal = displayData.personal;
  const academic = displayData.academic;
  const managed = {
    rollNo: profile?.rollNo,
    email: profile?.email || currentUser?.email,
    department: profile?.department || profile?.departmentCode,
    batch: profile?.batch,
    degree: profile?.degree,
  };
  const studentName = personal.fullName || profile?.fullName || currentUser?.fullName || 'Student';
  const completionPct = profile?.profileCompletionPercent ?? 0;
  const openToOpportunities = profile?.isOpenToOpportunities ?? true;

  const listSection = (key) => {
    const cfg = LIST_SECTIONS[key];
    const field = SECTION_FIELDS[key];
    const list = displayData[field];
    const { Item } = cfg;
    return (
      <SectionCard
        key={key}
        id={`section-${key.toLowerCase()}`}
        icon={cfg.icon}
        iconClass={cfg.iconClass}
        title={cfg.title}
        subtitle={cfg.subtitle}
        {...sectionProps(key)}
        action={
          editable && (
            <button
              type="button"
              onClick={() => openModal({ type: 'item', sectionKey: key, index: null })}
              className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-3.5 py-2 rounded-xl transition flex items-center gap-1.5 shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" /> {cfg.addLabel}
            </button>
          )
        }
      >
        {list.length > 0 ? (
          <div className="space-y-3">
            {list.map((item, index) => (
              <Item
                key={itemKey(item, index)}
                item={item}
                actions={
                  <ItemActions
                    editable={editable}
                    label={itemLabel(key, item)}
                    onEdit={() => openModal({ type: 'item', sectionKey: key, index })}
                    onRemove={() => removeListItem(key, index)}
                  />
                }
              />
            ))}
          </div>
        ) : (
          <EmptyState
            type="empty"
            icon={cfg.icon}
            title={cfg.empty}
            description={editable ? cfg.emptyText : undefined}
            action={editable ? { label: cfg.addLabel, onClick: () => openModal({ type: 'item', sectionKey: key, index: null }), icon: Plus } : undefined}
            compact
            className="bg-gray-50/50 border-dashed border-gray-200"
          />
        )}
      </SectionCard>
    );
  };

  const editingItem =
    modal?.type === 'item' && modal.index !== null && modal.index !== undefined
      ? data[SECTION_FIELDS[modal.sectionKey]][modal.index]
      : null;

  const isPlaced = profile?.placementStatus === 'PLACED';
  const placedCtcLabel = formatCtc(profile?.placedCtc);
  const placedDateLabel = formatPlacedDate(profile?.placedOn);
  const placedSubline = [placedCtcLabel, placedDateLabel].filter(Boolean).join(' · ');
  const headerSubline = [
    managed.degree || managed.department || 'Department not assigned',
    academic.semester != null ? `Sem ${academic.semester}` : null,
    managed.batch ? `Batch ${String(managed.batch).replace('-', '–')}` : null,
  ]
    .filter(Boolean)
    .join(' · ');

  const renderMobileRowBadge = (row) => {
    if (row.kind === 'resume_docs') {
      const isRowChanged =
        !viewOfficial && (changedSections.includes('RESUME') || changedSections.includes('DOCUMENTS'));
      const hasAnyDoc = Boolean(displayData.resume?.resumeUrl) || displayData.documents.length > 0;
      if (isRowChanged) {
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[12px] font-semibold bg-[#FEF3C7] text-[#92400E]">
            {isPending ? 'In review' : 'Changed'}
          </span>
        );
      }
      if (!hasAnyDoc && lifecycle === 'ACTIVE' && !viewOfficial) {
        return <span className="text-[13.5px] font-bold text-[#1D4ED8]">Add</span>;
      }
      if (draft?.profileVerificationStatus === 'VERIFIED' || isPending) {
        return <span className="text-[13.5px] font-semibold text-[#059669]">Verified</span>;
      }
      const totalDocs = displayData.documents.length + (displayData.resume?.resumeUrl ? 1 : 0);
      return <span className="text-[14px] font-medium text-[#64748B]">{totalDocs}</span>;
    }

    const isRowChanged = !viewOfficial && changedSections.includes(row.key);
    if (isRowChanged) {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[12px] font-semibold bg-[#FEF3C7] text-[#92400E]">
          {isPending ? 'In review' : 'Changed'}
        </span>
      );
    }

    if (row.kind === 'status') {
      if (draft?.profileVerificationStatus === 'VERIFIED' || isPending) {
        return <span className="text-[13.5px] font-semibold text-[#059669]">Verified</span>;
      }
      return <span className="text-[13.5px] font-semibold text-[#1D4ED8]">{editable ? 'Edit' : 'View'}</span>;
    }

    const count = displayData[SECTION_FIELDS[row.key]]?.length ?? 0;
    if (count === 0 && lifecycle === 'ACTIVE' && !viewOfficial) {
      return <span className="text-[13.5px] font-bold text-[#1D4ED8]">Add</span>;
    }
    return <span className="text-[14px] font-medium text-[#64748B]">{count}</span>;
  };

  const activeMobileRow = MOBILE_PROFILE_ROWS.find((r) => r.key === mobileSection) || null;

  return (
    <>
      {/* ── SCREENSHOT-MATCHED UI (Mobile-first & centered on desktop) ── */}
      <main className="flex-1 w-full max-w-[480px] md:max-w-3xl mx-auto pb-6 md:py-5 md:px-6 overflow-x-hidden">
        {/* Deep Navy Hero Header */}
        <div className="bg-[#0F2A6B] rounded-b-[28px] md:rounded-[28px] px-4 pt-5 pb-16 text-white relative overflow-hidden">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -right-12 -top-12 w-40 h-40 rounded-full border-[24px] border-white/[0.04]"
          />
          <div className="flex items-center justify-between gap-3 relative z-10">
            <h1 className="text-[20px] font-extrabold tracking-tight text-white">My profile</h1>
            <button
              type="button"
              onClick={() => setMobileSettingsOpen(true)}
              aria-label="Profile settings"
              className="w-10 h-10 rounded-[14px] bg-white/12 hover:bg-white/20 text-white flex items-center justify-center transition cursor-pointer"
            >
              <Settings className="w-[19px] h-[19px]" strokeWidth={1.8} />
            </button>
          </div>

          <div className="flex items-center gap-3.5 mt-4 relative z-10">
            <div className="w-[66px] h-[66px] rounded-full bg-[#F5B301] text-[#0F172A] border-2 border-[#FDE68A]/45 flex items-center justify-center text-[26px] font-extrabold shrink-0 overflow-hidden shadow-xs">
              {personal.avatarUrl ? (
                <ProtectedMediaPreview url={personal.avatarUrl} alt={studentName} />
              ) : (
                studentName.charAt(0).toUpperCase()
              )}
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="text-[20px] font-extrabold text-white leading-tight truncate">{studentName}</h2>
              <p className="text-[12.5px] text-white/85 font-medium mt-1 truncate">{headerSubline}</p>
              <p className="text-[12px] text-white/75 mt-0.5 truncate">
                Reg. no. {managed.rollNo || 'Not Assigned'}
              </p>
            </div>
          </div>
        </div>

        {/* Floating Stats Card: CGPA / Backlogs / Complete */}
        <div className="-mt-10 mx-4 bg-white rounded-[22px] shadow-[0_8px_24px_rgba(15,23,42,0.08)] border border-[#E5E9F2]/80 grid grid-cols-3 divide-x divide-[#EEF2F6] py-3.5 px-2 relative z-10 text-center">
          <div className="px-2 min-w-0">
            <p className="text-[22px] font-extrabold text-[#0F172A] leading-tight tabular-nums">
              {academic.cgpa != null ? academic.cgpa : '—'}
            </p>
            <p className="text-[11.5px] text-[#64748B] font-medium mt-0.5">CGPA</p>
          </div>
          <div className="px-2 min-w-0">
            <p className="text-[22px] font-extrabold text-[#0F172A] leading-tight tabular-nums">
              {academic.activeBacklogs ?? 0}
            </p>
            <p className="text-[11.5px] text-[#64748B] font-medium mt-0.5">Backlogs</p>
          </div>
          <div className="px-2 min-w-0">
            <p className="text-[22px] font-extrabold text-[#1D4ED8] leading-tight tabular-nums">
              {completionPct}%
            </p>
            <p className="text-[11.5px] text-[#64748B] font-medium mt-0.5">Complete</p>
          </div>
        </div>

        {/* Notifications, Lifecycle & Review Status Card */}
        <div className="px-4 mt-4 space-y-3">
          {notification && (
            <div
              className={`flex items-start gap-2.5 p-3.5 rounded-[16px] text-xs ${
                notification.type === 'success'
                  ? 'bg-green-50 border border-green-200 text-green-800'
                  : 'bg-blue-50 border border-blue-200 text-blue-800'
              }`}
            >
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
              <div className="flex-1 font-medium">{notification.text}</div>
              <button
                type="button"
                onClick={() => setNotification(null)}
                className="text-gray-400 hover:text-gray-600"
                aria-label="Dismiss"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {viewOfficial && (
            <div className="flex items-center justify-between gap-2 bg-[#ECFDF5] border border-[#A7F3D0] rounded-[16px] px-3.5 py-2.5 text-xs text-[#065F46]">
              <span className="font-semibold flex items-center gap-1.5">
                <BadgeCheck className="w-4 h-4 shrink-0" /> Viewing verified profile
              </span>
              <button
                type="button"
                onClick={() => setViewOfficial(false)}
                className="font-bold underline underline-offset-2 shrink-0"
              >
                Back to draft
              </button>
            </div>
          )}

          {lifecycle !== 'ACTIVE' ? (
            <div className="flex items-start gap-3 bg-gray-100 border border-gray-300 rounded-[18px] px-4 py-3.5 text-xs text-gray-800" role="note">
              <Lock className="w-4 h-4 shrink-0 mt-0.5 text-gray-500" />
              <p>
                <span className="font-bold">
                  Account {lifecycle === 'ARCHIVED' ? 'archived' : 'disabled'}.
                </span>{' '}
                Your profile is read-only. Contact the placement cell if this is a mistake.
              </p>
            </div>
          ) : bannerState === 'PENDING' ? (
            <Link
              to="/student/verification"
              className="flex items-center gap-3 bg-[#FFF8E6] border border-[#FCD9A0] rounded-[18px] px-4 py-3.5 active:scale-[0.99] transition"
            >
              <Lock className="w-5 h-5 text-[#92400E] shrink-0" strokeWidth={1.9} />
              <div className="flex-1 min-w-0">
                <p className="text-[14px] font-bold text-[#0F172A] leading-snug">
                  Editing locked while under review
                </p>
                <p className="text-[12.5px] text-[#92400E] mt-0.5 leading-snug">
                  Withdraw the request to make more changes
                </p>
              </div>
              <ChevronRight className="w-4 h-4 text-[#92400E] shrink-0" />
            </Link>
          ) : bannerState === 'REJECTED' ? (
            <Link
              to="/student/verification"
              className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-[18px] px-4 py-3.5 active:scale-[0.99] transition"
            >
              <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-[14px] font-bold text-[#0F172A] leading-snug">
                  Changes requested by advisor
                </p>
                <p className="text-[12.5px] text-red-700 mt-0.5 leading-snug line-clamp-2">
                  {draft?.reviewComment || 'Open verification to read comments, edit and resubmit.'}
                </p>
              </div>
              <ChevronRight className="w-4 h-4 text-red-600 shrink-0" />
            </Link>
          ) : bannerState === 'CHANGES' ? (
            <div className="bg-[#EFF6FF] border border-[#BFDBFE] rounded-[18px] px-4 py-3.5 space-y-2.5">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-[14px] font-bold text-[#0F172A] leading-snug">
                    {hasUnsavedChanges ? 'Unsaved draft changes' : 'Draft ready to submit'}
                  </p>
                  <p className="text-[12px] text-[#1E40AF] mt-0.5 leading-snug">
                    {changedSections.length > 0
                      ? `Updated: ${changedSections.map(sectionLabel).join(', ')}`
                      : 'Save your draft and submit to your faculty advisor.'}
                  </p>
                </div>
                <Link
                  to="/student/verification"
                  className="text-[11.5px] font-bold text-[#1D4ED8] shrink-0 underline underline-offset-2"
                >
                  History
                </Link>
              </div>
              {canEditDraft && !viewOfficial && (
                <div className="flex items-center gap-2">
                  {hasUnsavedChanges && (
                    <button
                      type="button"
                      onClick={handleSaveDraft}
                      disabled={saving}
                      className="flex-1 inline-flex items-center justify-center gap-1.5 bg-white border border-[#93C5FD] text-[#1D4ED8] text-[12.5px] font-bold py-2 px-3 rounded-[12px] disabled:opacity-50"
                    >
                      {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                      Save draft
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={openSubmit}
                    disabled={submitting || saving}
                    className="flex-1 inline-flex items-center justify-center gap-1.5 bg-[#1D4ED8] text-white text-[12.5px] font-bold py-2 px-3 rounded-[12px] disabled:opacity-50"
                  >
                    <Send className="w-3.5 h-3.5" /> Submit for review
                  </button>
                </div>
              )}
            </div>
          ) : bannerState === 'VERIFIED' ? (
            <Link
              to="/student/verification"
              className="flex items-center gap-3 bg-[#ECFDF5] border border-[#A7F3D0] rounded-[18px] px-4 py-3.5 active:scale-[0.99] transition"
            >
              <CheckCircle2 className="w-5 h-5 text-[#059669] shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-[14px] font-bold text-[#0F172A] leading-snug">Profile verified</p>
                <p className="text-[12px] text-[#047857] mt-0.5 leading-snug">
                  Tap a section below to edit or view verification history
                </p>
              </div>
              <ChevronRight className="w-4 h-4 text-[#059669] shrink-0" />
            </Link>
          ) : (
            <Link
              to="/student/verification"
              className="flex items-center gap-3 bg-white border border-[#E5E9F2] rounded-[18px] px-4 py-3.5 active:scale-[0.99] transition"
            >
              <ShieldCheck className="w-5 h-5 text-[#1D4ED8] shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-[14px] font-bold text-[#0F172A] leading-snug">
                  Not submitted for verification
                </p>
                <p className="text-[12px] text-[#64748B] mt-0.5 leading-snug">
                  Edit your profile sections below and submit for review
                </p>
              </div>
              <ChevronRight className="w-4 h-4 text-[#94A3B8] shrink-0" />
            </Link>
          )}
        </div>

        {/* Placement + Open to Opportunities Card */}
        <div className="mx-4 mt-3.5 bg-white rounded-[20px] border border-[#E5E9F2] shadow-[0_1px_2px_rgba(15,23,42,0.04)] divide-y divide-[#F1F5F9]">
          <div className="p-4 flex items-center gap-3.5">
            <div
              className={`w-11 h-11 rounded-[14px] flex items-center justify-center shrink-0 ${
                isPlaced ? 'bg-[#ECFDF5] text-[#059669]' : 'bg-[#EFF6FF] text-[#1D4ED8]'
              }`}
            >
              <Award className="w-5 h-5" strokeWidth={1.9} />
            </div>
            <div className="min-w-0 flex-1">
              <p className={`text-[15px] font-bold leading-snug ${isPlaced ? 'text-[#065F46]' : 'text-[#0F172A]'}`}>
                {isPlaced
                  ? profile?.placedCompany?.name
                    ? `Placed at ${profile.placedCompany.name}`
                    : 'Placed'
                  : 'Not placed yet'}
              </p>
              <p className="text-[13px] text-[#64748B] mt-0.5 truncate">
                {isPlaced
                  ? placedSubline || 'Placement recorded by cell'
                  : openToOpportunities
                  ? 'Open to active campus drives'
                  : 'Not seeking opportunities right now'}
              </p>
            </div>
          </div>

          <div className="p-4 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[14px] font-bold text-[#0F172A] leading-snug">
                {isPlaced ? 'Open to more opportunities' : 'Open to opportunities'}
              </p>
              <p className="text-[12px] text-[#64748B] mt-0.5">Get alerts for new drives</p>
            </div>
            <button
              type="button"
              role="checkbox"
              aria-checked={openToOpportunities}
              aria-label="Open to more opportunities"
              onClick={handleToggleOpportunities}
              disabled={!profile || savingPreference || lifecycle !== 'ACTIVE'}
              className={`w-6 h-6 rounded-[7px] border-2 flex items-center justify-center shrink-0 transition cursor-pointer disabled:opacity-50 ${
                openToOpportunities
                  ? 'bg-[#1D4ED8] border-[#1D4ED8] text-white'
                  : 'bg-white border-[#94A3B8] text-transparent'
              }`}
            >
              {savingPreference ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin text-current" />
              ) : (
                <Check className="w-3.5 h-3.5" strokeWidth={3} />
              )}
            </button>
          </div>
        </div>

        {/* PROFILE SECTIONS List */}
        <section className="mx-4 mt-5" aria-label="Profile sections">
          <p className="text-[11px] font-bold uppercase tracking-wider text-[#64748B] mb-2.5 px-1">
            PROFILE SECTIONS
          </p>
          <div className="bg-white rounded-[20px] border border-[#E5E9F2] shadow-[0_1px_2px_rgba(15,23,42,0.04)] divide-y divide-[#F1F5F9] overflow-hidden">
            {MOBILE_PROFILE_ROWS.map((row) => (
              <button
                key={row.key}
                type="button"
                onClick={() => setMobileSection(row.key)}
                className="w-full px-4 py-3.5 flex items-center justify-between gap-3 text-left hover:bg-slate-50/70 active:bg-slate-100/70 transition-colors min-h-[52px] cursor-pointer"
              >
                <span className="text-[15px] font-semibold text-[#0F172A] truncate">{row.label}</span>
                <span className="flex items-center gap-2 shrink-0">
                  {renderMobileRowBadge(row)}
                  <ChevronRight className="w-4 h-4 text-[#94A3B8]" />
                </span>
              </button>
            ))}
          </div>
        </section>

        {/* Change password card (matches bottom card in Screenshot 2) */}
        <div className="mx-4 mt-3">
          <button
            type="button"
            onClick={() => setShowChangePassword(true)}
            className="w-full bg-white rounded-[20px] border border-[#E5E9F2] shadow-[0_1px_2px_rgba(15,23,42,0.04)] px-4 py-3.5 flex items-center justify-between gap-3 text-left hover:bg-slate-50/70 active:bg-slate-100/70 transition-colors min-h-[52px] cursor-pointer"
          >
            <span className="text-[15px] font-semibold text-[#0F172A]">Change password</span>
            <ChevronRight className="w-4 h-4 text-[#94A3B8]" />
          </button>
        </div>
      </main>

      {/* Settings Sheet / Modal */}
      {mobileSettingsOpen && (
        <div
          className="fixed inset-0 z-40 flex flex-col justify-end md:items-center md:justify-center md:p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Profile settings"
        >
          <div
            className="absolute inset-0 bg-black/45 backdrop-blur-[1px]"
            onClick={() => setMobileSettingsOpen(false)}
          />
          <div className="relative bg-white rounded-t-[24px] md:rounded-[24px] md:w-full md:max-w-md shadow-2xl p-5 space-y-2 pb-[calc(20px+env(safe-area-inset-bottom))] md:pb-5">
            <div className="flex items-center justify-between pb-2 border-b border-gray-100">
              <h3 className="text-[16px] font-extrabold text-[#0F172A]">Profile options</h3>
              <button
                type="button"
                onClick={() => setMobileSettingsOpen(false)}
                className="p-1.5 rounded-xl text-gray-400 hover:bg-gray-100"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <button
              type="button"
              onClick={() => {
                setViewOfficial((v) => !v);
                setMobileSettingsOpen(false);
              }}
              className="w-full flex items-center justify-between px-3.5 py-3 rounded-[14px] hover:bg-slate-50 text-sm font-semibold text-[#0F172A]"
            >
              <span className="flex items-center gap-2.5">
                {viewOfficial ? <EyeOff className="w-4 h-4 text-[#1D4ED8]" /> : <Eye className="w-4 h-4 text-[#1D4ED8]" />}
                {viewOfficial ? 'Back to my draft' : 'View verified version'}
              </span>
              <ChevronRight className="w-4 h-4 text-[#94A3B8]" />
            </button>
            <Link
              to="/student/verification"
              onClick={() => setMobileSettingsOpen(false)}
              className="w-full flex items-center justify-between px-3.5 py-3 rounded-[14px] hover:bg-slate-50 text-sm font-semibold text-[#0F172A]"
            >
              <span className="flex items-center gap-2.5">
                <ShieldCheck className="w-4 h-4 text-[#1D4ED8]" />
                Profile verification &amp; history
              </span>
              <ChevronRight className="w-4 h-4 text-[#94A3B8]" />
            </Link>
            <button
              type="button"
              onClick={() => {
                setMobileSettingsOpen(false);
                setShowChangePassword(true);
              }}
              className="w-full flex items-center justify-between px-3.5 py-3 rounded-[14px] hover:bg-slate-50 text-sm font-semibold text-[#0F172A]"
            >
              <span className="flex items-center gap-2.5">
                <KeyRound className="w-4 h-4 text-[#1D4ED8]" />
                Change password
              </span>
              <ChevronRight className="w-4 h-4 text-[#94A3B8]" />
            </button>
            {canEditDraft && !viewOfficial && (
              <>
                <button
                  type="button"
                  disabled={!hasUnsavedChanges || saving}
                  onClick={() => {
                    setMobileSettingsOpen(false);
                    handleSaveDraft();
                  }}
                  className="w-full flex items-center justify-between px-3.5 py-3 rounded-[14px] hover:bg-slate-50 text-sm font-semibold text-[#0F172A] disabled:opacity-40"
                >
                  <span className="flex items-center gap-2.5">
                    <Save className="w-4 h-4 text-[#1D4ED8]" />
                    Save draft
                  </span>
                </button>
                <button
                  type="button"
                  disabled={submitting || saving}
                  onClick={() => {
                    setMobileSettingsOpen(false);
                    openSubmit();
                  }}
                  className="w-full flex items-center justify-between px-3.5 py-3 rounded-[14px] hover:bg-slate-50 text-sm font-semibold text-[#1D4ED8] disabled:opacity-40"
                >
                  <span className="flex items-center gap-2.5">
                    <Send className="w-4 h-4" />
                    Submit for verification
                  </span>
                </button>
                <button
                  type="button"
                  disabled={!canDiscard || discarding}
                  onClick={() => {
                    setMobileSettingsOpen(false);
                    setConfirm('discard');
                  }}
                  className="w-full flex items-center justify-between px-3.5 py-3 rounded-[14px] hover:bg-red-50 text-sm font-semibold text-red-600 disabled:opacity-40"
                >
                  <span className="flex items-center gap-2.5">
                    <RotateCcw className="w-4 h-4" />
                    Discard draft changes
                  </span>
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* Section Detail Sheet / Modal */}
      {activeMobileRow && (
        <div
          className="fixed inset-0 z-40 flex flex-col justify-end md:items-center md:justify-center md:p-4"
          role="dialog"
          aria-modal="true"
          aria-label={activeMobileRow.label}
        >
          <div
            className="absolute inset-0 bg-black/45 backdrop-blur-[1px]"
            onClick={() => setMobileSection(null)}
          />
          <div className="relative bg-[#F4F6FB] rounded-t-[24px] md:rounded-[24px] md:w-full md:max-w-xl shadow-2xl max-h-[88vh] flex flex-col overflow-hidden">
            <div className="bg-white px-4 py-3.5 border-b border-[#E5E9F2] flex items-center justify-between gap-3 shrink-0">
              <div className="min-w-0">
                <h3 className="text-[17px] font-extrabold text-[#0F172A] truncate">
                  {activeMobileRow.label}
                </h3>
                <p className="text-[11.5px] text-[#64748B]">
                  {isPending
                    ? 'Under review by faculty advisor'
                    : viewOfficial
                    ? 'Verified profile snapshot'
                    : editable
                    ? 'Tap edit or add to update your draft'
                    : 'Read-only view'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setMobileSection(null)}
                className="w-9 h-9 rounded-xl bg-[#F4F6FB] text-[#475569] flex items-center justify-center shrink-0"
                aria-label="Close section"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="overflow-y-auto px-4 py-4 space-y-4 flex-1">
              {isPending && lifecycle === 'ACTIVE' && !viewOfficial && (
                <div className="bg-[#FFF8E6] border border-[#FCD9A0] rounded-[16px] p-3.5 flex items-center justify-between gap-3">
                  <div className="flex items-start gap-2.5 min-w-0">
                    <Lock className="w-4 h-4 text-[#92400E] shrink-0 mt-0.5" />
                    <p className="text-xs text-[#92400E] leading-snug">
                      <span className="font-bold text-[#0F172A]">Editing locked while under review.</span>{' '}
                      Withdraw your pending request to add or edit items here.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setConfirm('withdraw')}
                    disabled={withdrawing}
                    className="shrink-0 bg-white border border-[#FCD34D] text-[#92400E] hover:bg-[#FFFBEB] text-xs font-bold px-3 py-1.5 rounded-xl transition cursor-pointer disabled:opacity-50"
                  >
                    Withdraw
                  </button>
                </div>
              )}

              {mobileSection === 'PERSONAL' && (
                <>
                  <SectionCard
                    icon={Phone}
                    title="Personal & Contact Details"
                    subtitle="Name, contact details and profile links."
                    {...sectionProps('PERSONAL')}
                    action={
                      editable && (
                        <button
                          type="button"
                          onClick={() => openModal({ type: 'personal' })}
                          className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-3.5 py-2 rounded-xl transition flex items-center gap-1.5"
                        >
                          <Pencil className="w-3.5 h-3.5" /> Edit Details
                        </button>
                      )
                    }
                  >
                    <div className="space-y-2.5">
                      {[
                        { icon: Phone, label: 'Phone', value: personal.phone },
                        { icon: Mail, label: 'Email', value: managed.email, locked: true },
                        { icon: MapPin, label: 'Address', value: personal.address },
                      ].map(({ icon: RowIcon, label, value, locked }) => (
                        <div key={label} className="flex items-start gap-3 p-3 bg-gray-50 rounded-xl min-w-0">
                          <RowIcon className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" aria-hidden="true" />
                          <div className="min-w-0">
                            <p className="text-[11px] text-gray-400 uppercase font-semibold flex items-center gap-1">
                              {label} {locked && <Lock className="w-3 h-3" />}
                            </p>
                            <p className="text-sm font-medium text-gray-800 break-all">{displayValue(value)}</p>
                          </div>
                        </div>
                      ))}
                      {[
                        ['GitHub', personal.githubUrl],
                        ['LinkedIn', personal.linkedinUrl],
                        ['Portfolio', personal.portfolioUrl],
                      ].map(([label, url]) => (
                        <div key={label} className="flex items-start gap-3 p-3 bg-gray-50 rounded-xl min-w-0">
                          <LinkIcon className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" aria-hidden="true" />
                          <div className="min-w-0">
                            <p className="text-[11px] text-gray-400 uppercase font-semibold">{label}</p>
                            {url ? (
                              <a
                                href={url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-sm font-medium text-blue-600 hover:underline break-all inline-flex items-center gap-1"
                              >
                                {url.replace(/^https?:\/\//, '')} <ExternalLink className="w-3 h-3 shrink-0" />
                              </a>
                            ) : (
                              <p className="text-sm font-medium text-gray-800">Not provided</p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </SectionCard>

                  <div className="bg-white p-4 rounded-[20px] border border-[#E5E9F2]">
                    <div className="flex justify-between items-center mb-2">
                      <h4 className="font-bold text-[15px] text-[#0F172A]">About Me</h4>
                      {editable && !editAbout && (
                        <button
                          type="button"
                          onClick={() => {
                            setAboutDraft(personal.about || '');
                            setEditAbout(true);
                          }}
                          className="text-blue-600 text-xs font-semibold flex items-center gap-1"
                        >
                          <Pencil className="w-3.5 h-3.5" /> Edit
                        </button>
                      )}
                    </div>
                    {editable && editAbout ? (
                      <div className="space-y-2.5">
                        <textarea
                          value={aboutDraft}
                          onChange={(e) => setAboutDraft(e.target.value)}
                          rows={4}
                          maxLength={2000}
                          placeholder="A concise professional summary…"
                          className="w-full border border-gray-300 rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-gray-400">{aboutDraft.length} / 2000</span>
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() => setEditAbout(false)}
                              className="text-gray-600 text-xs px-3 py-1.5 rounded-lg hover:bg-gray-100"
                            >
                              Cancel
                            </button>
                            <button
                              type="button"
                              onClick={saveAbout}
                              className="bg-blue-600 text-white text-xs font-semibold px-3.5 py-1.5 rounded-lg"
                            >
                              Update draft
                            </button>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <p className="text-sm text-gray-600 whitespace-pre-line break-words">
                        {personal.about || <span className="text-gray-400 italic">No summary provided yet.</span>}
                      </p>
                    )}
                  </div>
                </>
              )}

              {mobileSection === 'ACADEMIC' && (
                <SectionCard
                  icon={GraduationCap}
                  title="Academic Overview"
                  subtitle="CGPA, backlogs and semester are verified by your faculty advisor."
                  {...sectionProps('ACADEMIC')}
                  action={
                    editable && (
                      <button
                        type="button"
                        onClick={() => openModal({ type: 'academic' })}
                        className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-3.5 py-2 rounded-xl transition flex items-center gap-1.5"
                      >
                        <Pencil className="w-3.5 h-3.5" /> Edit Academics
                      </button>
                    )
                  }
                >
                  <div className="grid grid-cols-2 gap-2.5 text-center">
                    <div className="p-3 bg-green-50/60 rounded-xl">
                      <p className="text-xs text-gray-500 font-medium">CGPA</p>
                      <p className="text-sm font-bold text-green-900 mt-1">
                        {academic.cgpa != null ? `${academic.cgpa} / 10` : 'Not provided'}
                      </p>
                    </div>
                    <div className="p-3 bg-purple-50/60 rounded-xl">
                      <p className="text-xs text-gray-500 font-medium">Semester</p>
                      <p className="text-sm font-bold text-purple-900 mt-1">
                        {academic.semester != null ? `Semester ${academic.semester}` : 'N/A'}
                      </p>
                    </div>
                    <div className="p-3 bg-amber-50/60 rounded-xl">
                      <p className="text-xs text-gray-500 font-medium">Active Backlogs</p>
                      <p className="text-sm font-bold text-amber-900 mt-1">{displayValue(academic.activeBacklogs)}</p>
                    </div>
                    <div className="p-3 bg-orange-50/60 rounded-xl">
                      <p className="text-xs text-gray-500 font-medium">Total Backlogs</p>
                      <p className="text-sm font-bold text-orange-900 mt-1">{displayValue(academic.totalBacklogs)}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 gap-2.5 mt-3 text-sm">
                    {[
                      ['Department', managed.department],
                      ['Batch', managed.batch],
                      ['Degree', managed.degree],
                    ].map(([label, value]) => (
                      <div key={label} className="p-3 bg-gray-50 rounded-xl">
                        <p className="text-xs text-gray-500 font-medium flex items-center gap-1">
                          <Lock className="w-3 h-3" /> {label}
                        </p>
                        <p className="font-semibold text-gray-800 mt-0.5 break-words">{displayValue(value)}</p>
                      </div>
                    ))}
                  </div>
                </SectionCard>
              )}

              {mobileSection === 'SKILLS' && (
                <SectionCard
                  icon={Sparkles}
                  title="Technical Skills"
                  subtitle="Skills visible to recruiters once verified."
                  {...sectionProps('SKILLS')}
                >
                  <ul className="flex flex-wrap gap-2" aria-label="Skills">
                    {displayData.skills.map((skill, i) => (
                      <li
                        key={itemKey(skill, i)}
                        className="bg-blue-50 text-blue-700 border border-blue-200 pl-3 pr-1.5 py-1 rounded-full text-xs font-medium flex items-center gap-1"
                      >
                        {skill.skillName}
                        <span className="text-[10px] text-blue-500">· {enumLabel(skill.proficiency)}</span>
                        {editable && (
                          <button
                            type="button"
                            onClick={() => removeSkill(i)}
                            className="ml-0.5 p-0.5 rounded-full hover:bg-red-100 hover:text-red-600"
                            aria-label={`Remove skill ${skill.skillName}`}
                          >
                            <X className="w-3 h-3" />
                          </button>
                        )}
                      </li>
                    ))}
                    {displayData.skills.length === 0 && (
                      <li className="text-xs text-gray-400 italic">No skills added yet.</li>
                    )}
                  </ul>
                  {editable && (
                    <form onSubmit={addSkill} className="mt-3 space-y-2">
                      <input
                        type="text"
                        value={skillInput}
                        maxLength={60}
                        onChange={(e) => setSkillInput(e.target.value)}
                        placeholder="Add a skill, e.g. React"
                        className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <div className="flex gap-2">
                        <select
                          value={skillLevel}
                          onChange={(e) => setSkillLevel(e.target.value)}
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-xl text-sm bg-white"
                        >
                          {SKILL_PROFICIENCIES.map((p) => (
                            <option key={p} value={p}>{enumLabel(p)}</option>
                          ))}
                        </select>
                        <button
                          type="submit"
                          className="bg-blue-600 text-white px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-1"
                        >
                          <Plus className="w-3.5 h-3.5" /> Add
                        </button>
                      </div>
                    </form>
                  )}
                </SectionCard>
              )}

              {mobileSection === 'PROJECTS' && (
                <SectionCard
                  icon={Layers}
                  iconClass="text-purple-600"
                  title="Projects Showcase"
                  subtitle="Portfolio projects visible to recruiters once verified."
                  {...sectionProps('PROJECTS')}
                  action={
                    editable && (
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => navigate('/student/add-project')}
                          disabled={hasUnsavedChanges}
                          className="text-xs font-semibold px-3 py-2 rounded-xl border border-gray-300 text-gray-700 disabled:opacity-40"
                        >
                          Full form
                        </button>
                        <button
                          type="button"
                          onClick={() => openModal({ type: 'item', sectionKey: 'PROJECTS', index: null })}
                          className="bg-blue-600 text-white text-xs font-semibold px-3.5 py-2 rounded-xl flex items-center gap-1.5"
                        >
                          <Plus className="w-3.5 h-3.5" /> Add Project
                        </button>
                      </div>
                    )
                  }
                >
                  {displayData.projects.length > 0 ? (
                    <div className="space-y-3">
                      {displayData.projects.map((proj, index) => (
                        <ProjectItem
                          key={itemKey(proj, index)}
                          item={proj}
                          actions={
                            <ItemActions
                              editable={editable}
                              label={itemLabel('PROJECTS', proj)}
                              onEdit={() => openModal({ type: 'item', sectionKey: 'PROJECTS', index })}
                              onRemove={() => removeListItem('PROJECTS', index)}
                            />
                          }
                        />
                      ))}
                    </div>
                  ) : (
                    <EmptyState
                      type="empty"
                      icon={Layers}
                      title="No projects yet"
                      description={editable ? 'Add projects to showcase your work.' : undefined}
                      action={editable ? { label: 'Add First Project', onClick: () => openModal({ type: 'item', sectionKey: 'PROJECTS', index: null }), icon: Plus } : undefined}
                      compact
                    />
                  )}
                </SectionCard>
              )}

              {['EDUCATION', 'EXPERIENCE', 'CERTIFICATIONS', 'ACHIEVEMENTS'].includes(mobileSection) &&
                listSection(mobileSection)}

              {mobileSection === 'RESUME_DOCS' && (
                <>
                  <SectionCard
                    icon={FileText}
                    title="Resume"
                    subtitle="PDF up to 10 MB. Recruiters see the resume once approved."
                    {...sectionProps('RESUME')}
                  >
                    {editable ? (
                      <VerificationFileField
                        section="RESUME"
                        extensions={['pdf']}
                        fileUrl={displayData.resume.resumeUrl}
                        fileName={displayData.resume.fileName}
                        onUploaded={(r) => setSection('resume', { resumeUrl: r.fileUrl, fileName: r.fileName })}
                        onRemove={() => setSection('resume', { resumeUrl: null, fileName: null })}
                      />
                    ) : displayData.resume.resumeUrl ? (
                      <VerificationFileField
                        section="RESUME"
                        disabled
                        fileUrl={displayData.resume.resumeUrl}
                        fileName={displayData.resume.fileName}
                        onUploaded={() => {}}
                      />
                    ) : (
                      <p className="text-sm text-gray-400 italic">No resume uploaded.</p>
                    )}
                  </SectionCard>

                  {listSection('DOCUMENTS')}

                  {!viewOfficial && (
                    <SectionCard
                      icon={Paperclip}
                      iconClass="text-gray-600"
                      title="Evidence for your advisor"
                      subtitle="Extra supporting files visible only to your advisor."
                    >
                      {data.evidence.length > 0 ? (
                        <ul className="space-y-2 mb-3">
                          {data.evidence.map((ev, index) => (
                            <li
                              key={`${ev.fileUrl}-${index}`}
                              className="border border-gray-200 rounded-xl p-3 bg-gray-50/50 flex items-start justify-between gap-2"
                            >
                              <div className="min-w-0">
                                <ProtectedFileLink url={ev.fileUrl} className="text-sm font-semibold text-blue-600 break-all text-left">
                                  {ev.fileName || 'Evidence file'}
                                </ProtectedFileLink>
                                <p className="text-[11px] text-gray-500">
                                  For: {sectionLabel(ev.section)}
                                  {ev.size ? ` · ${formatFileSize(ev.size)}` : ''}
                                </p>
                              </div>
                              {editable && (
                                <button
                                  type="button"
                                  onClick={() => setSection('evidence', data.evidence.filter((_, i) => i !== index))}
                                  className="text-gray-400 hover:text-red-600 p-1"
                                  aria-label={`Remove evidence ${ev.fileName || ''}`}
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              )}
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-sm text-gray-400 italic mb-3">No evidence attached.</p>
                      )}
                      {editable && (
                        <div className="space-y-2.5">
                          <SelectField
                            label="Supports section"
                            value={evidenceSection}
                            onChange={setEvidenceSection}
                            options={EVIDENCE_SECTIONS.map((k) => ({ value: k, label: sectionLabel(k) }))}
                          />
                          <input
                            type="text"
                            maxLength={255}
                            value={evidenceNote}
                            onChange={(e) => setEvidenceNote(e.target.value)}
                            placeholder="Optional note (e.g. Sem 6 grade sheet)"
                            className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm"
                          />
                          <VerificationFileField
                            compact
                            section={evidenceSection}
                            fileUrl={null}
                            onUploaded={(r) => {
                              if (data.evidence.length >= MAX_ITEMS) {
                                toastError(`You can attach at most ${MAX_ITEMS} evidence files.`);
                                return;
                              }
                              setSection('evidence', [
                                ...data.evidence,
                                {
                                  section: evidenceSection,
                                  fileUrl: r.fileUrl,
                                  fileName: r.fileName,
                                  contentType: r.contentType,
                                  size: r.size,
                                  note: evidenceNote.trim() || null,
                                },
                              ]);
                              setEvidenceNote('');
                            }}
                          />
                        </div>
                      )}
                    </SectionCard>
                  )}
                </>
              )}
            </div>

            {canEditDraft && !viewOfficial && (hasUnsavedChanges || changedSections.length > 0) && (
              <div className="bg-white border-t border-[#E5E9F2] px-4 py-3 flex items-center gap-2 shrink-0 pb-[calc(12px+env(safe-area-inset-bottom))]">
                {hasUnsavedChanges && (
                  <button
                    type="button"
                    onClick={handleSaveDraft}
                    disabled={saving}
                    className="flex-1 inline-flex items-center justify-center gap-1.5 border border-[#93C5FD] bg-[#EFF6FF] text-[#1D4ED8] text-xs font-bold py-2.5 rounded-xl disabled:opacity-50"
                  >
                    {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                    Save draft
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => {
                    setMobileSection(null);
                    openSubmit();
                  }}
                  disabled={submitting || saving}
                  className="flex-1 inline-flex items-center justify-center gap-1.5 bg-[#1D4ED8] text-white text-xs font-bold py-2.5 rounded-xl disabled:opacity-50"
                >
                  <Send className="w-3.5 h-3.5" /> Submit for review
                </button>
              </div>
            )}
          </div>
        </div>
      )}


      <ChangePasswordModal open={showChangePassword} onClose={() => setShowChangePassword(false)} registerNumber={profile?.rollNo || ''} />

      {/* ── Modals (shared across mobile & desktop) ── */}
      {modal?.type === 'personal' && (
        <PersonalDetailsModal
          key={`personal-${modalSeq}`}
          personal={data.personal}
          managed={managed}
          onClose={closeModal}
          onSave={(p) => {
            setSection('personal', p);
            closeModal();
          }}
        />
      )}
      {modal?.type === 'academic' && (
        <AcademicModal
          key={`academic-${modalSeq}`}
          academic={data.academic}
          managed={managed}
          onClose={closeModal}
          onSave={(a) => {
            setSection('academic', a);
            closeModal();
          }}
        />
      )}
      {modal?.type === 'item' && (
        <ItemEditorModal
          key={`item-${modalSeq}`}
          sectionKey={modal.sectionKey}
          item={editingItem}
          onClose={closeModal}
          onSave={(item) => saveListItem(modal.sectionKey, modal.index, item)}
        />
      )}
      <FormModal
        open={modal?.type === 'submit'}
        title="Submit for verification"
        icon={Send}
        onClose={() => !submitting && closeModal()}
        onSubmit={handleSubmit}
        submitLabel="Submit"
        busy={submitting}
      >
        <div className="text-sm text-gray-600 space-y-2">
          <p>
            Your faculty advisor will review these sections:{' '}
            <span className="font-semibold text-gray-800">{changedSections.map(sectionLabel).join(', ')}</span>.
          </p>
          <p>Editing is locked until they decide. You can withdraw the request at any time to make more changes.</p>
        </div>
        <TextAreaField
          label="Note to your advisor (optional)"
          value={submitNote}
          onChange={setSubmitNote}
          maxLength={1000}
          rows={3}
          placeholder="e.g. CGPA updated after semester 6 results; marksheet attached."
        />
      </FormModal>

      <ConfirmDialog
        open={confirm === 'discard'}
        title={draft?.status === 'DRAFT' && draft?.versionId != null ? 'Discard draft?' : 'Discard unsaved changes?'}
        message={
          draft?.status === 'DRAFT' && draft?.versionId != null
            ? 'All changes in your saved draft will be thrown away and your profile will show the verified version again. Uploaded files stay on the server but will no longer be referenced.'
            : 'Your unsaved edits will be lost.'
        }
        confirmLabel="Discard"
        busy={discarding}
        onConfirm={handleDiscard}
        onCancel={() => setConfirm(null)}
      />
      <ConfirmDialog
        open={confirm === 'withdraw'}
        title="Withdraw verification request?"
        message="Your advisor will no longer see this request. Your changes stay in a draft so you can edit and resubmit them."
        confirmLabel="Withdraw"
        busy={withdrawing}
        onConfirm={handleWithdraw}
        onCancel={() => setConfirm(null)}
      />
    </>
  );
}
