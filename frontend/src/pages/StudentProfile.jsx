import { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  AlertCircle,
  Award,
  BadgeCheck,
  Briefcase,
  CheckCircle2,
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
  Sparkles,
  Trash2,
  Trophy,
  X,
  ExternalLink,
} from 'lucide-react';
import { getProfile, getStudentDashboard, updateProfile } from '../services/api/studentService';
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
import StatusBanner from '../components/student/StatusBanner';
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
import { placementSummary } from '../utils/placement';

const ADMIN_MANAGED_HINT = 'Managed by the placement cell — contact them to correct it.';

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
  const [dashboardStats, setDashboardStats] = useState(null);

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
      const [draftRes, profileRes, statsRes] = await Promise.allSettled([
        getDraft(),
        getProfile(),
        getStudentDashboard(),
      ]);
      if (draftRes.status === 'rejected') throw draftRes.reason;
      applyDraft(draftRes.value);
      setProfile(profileRes.status === 'fulfilled' ? profileRes.value : null);
      setDashboardStats(statsRes.status === 'fulfilled' ? statsRes.value : null);
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

  const scrollToTop = () => {
    setViewOfficial(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
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

  return (
    <main className="flex-1 px-4 md:px-8 py-6 overflow-x-hidden">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Student Profile</h1>
          <p className="text-gray-500 text-sm">
            Edit your profile as a draft and submit it to your faculty advisor for verification.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowChangePassword(true)}
          className="inline-flex items-center gap-2 bg-white text-gray-700 border border-gray-300 text-sm font-semibold px-4 py-2 rounded-xl hover:bg-gray-50 transition shadow-sm w-fit"
        >
          <KeyRound className="w-4 h-4" /> Change Password
        </button>
      </div>

      <ChangePasswordModal open={showChangePassword} onClose={() => setShowChangePassword(false)} registerNumber={profile?.rollNo || ''} />

      {notification && (
        <div
          className={`flex items-start gap-2.5 p-4 rounded-xl mb-6 text-sm ${
            notification.type === 'success' ? 'bg-green-50 border border-green-200 text-green-800' : 'bg-blue-50 border border-blue-200 text-blue-800'
          }`}
        >
          {notification.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 shrink-0 text-green-600" />
          ) : (
            <Sparkles className="w-5 h-5 shrink-0 text-blue-600" />
          )}
          <div className="flex-1 font-medium">{notification.text}</div>
          <button onClick={() => setNotification(null)} className="text-gray-400 hover:text-gray-600" aria-label="Dismiss">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {lifecycle !== 'ACTIVE' ? (
        <div className="flex items-start gap-2.5 p-4 rounded-2xl mb-6 text-sm bg-gray-100 border border-gray-300 text-gray-800" role="note">
          <Lock className="w-5 h-5 shrink-0 text-gray-500" />
          <p>
            <span className="font-semibold">Your account is {lifecycle === 'ARCHIVED' ? 'archived' : 'disabled'}.</span>{' '}
            Your profile is read-only: you can view it but cannot edit or submit changes. Contact the placement cell if this
            is a mistake.
          </p>
        </div>
      ) : draft?.canEdit === false && !isPending ? (
        <div className="flex items-start gap-2.5 p-4 rounded-2xl mb-6 text-sm bg-gray-100 border border-gray-300 text-gray-800" role="note">
          <Lock className="w-5 h-5 shrink-0 text-gray-500" />
          <p>Editing your profile is not available right now. Contact the placement cell if you need to make changes.</p>
        </div>
      ) : null}

      <StatusBanner
        state={bannerState}
        draft={draft}
        changedSections={changedSections}
        hasUnsavedChanges={hasUnsavedChanges}
        verifiedAt={profile?.profileVerifiedAt}
        onWithdraw={lifecycle === 'ACTIVE' ? () => setConfirm('withdraw') : undefined}
        withdrawing={withdrawing}
        onEditRejected={canEditDraft ? scrollToTop : undefined}
      />

      {/* Draft action bar */}
      <div className="sticky top-[68px] z-10 -mx-4 md:mx-0 px-4 md:px-4 py-3 mb-6 bg-white/95 backdrop-blur-md border-y md:border md:rounded-2xl border-gray-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-xs text-gray-600 min-w-0">
          {viewOfficial ? (
            <span className="font-semibold text-green-700 flex items-center gap-1.5">
              <BadgeCheck className="w-4 h-4" /> Viewing your verified profile
            </span>
          ) : hasUnsavedChanges ? (
            <span className="font-semibold text-amber-700 flex items-center gap-1.5">
              <AlertCircle className="w-4 h-4" /> Unsaved changes
            </span>
          ) : (
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-gray-400" />
              {draft?.updatedAt ? `Draft saved ${new Date(draft.updatedAt).toLocaleString()}` : 'No unsaved changes'}
            </span>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setViewOfficial((v) => !v)}
            aria-pressed={viewOfficial}
            className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-xl border border-gray-300 text-gray-700 bg-white hover:bg-gray-50 transition"
          >
            {viewOfficial ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
            {viewOfficial ? 'Back to my draft' : 'View verified version'}
          </button>
          {canEditDraft && !viewOfficial && (
            <>
              <button
                type="button"
                onClick={() => setConfirm('discard')}
                disabled={!canDiscard || discarding}
                className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-xl border border-red-200 text-red-600 bg-white hover:bg-red-50 transition disabled:opacity-40"
              >
                <RotateCcw className="w-3.5 h-3.5" /> Discard
              </button>
              <button
                type="button"
                onClick={handleSaveDraft}
                disabled={!hasUnsavedChanges || saving}
                className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-xl border border-blue-200 text-blue-700 bg-blue-50 hover:bg-blue-100 transition disabled:opacity-40"
              >
                {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />} Save draft
              </button>
              <button
                type="button"
                onClick={openSubmit}
                disabled={submitting || saving}
                className="inline-flex items-center gap-1.5 text-xs font-semibold px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white shadow-sm transition disabled:opacity-50"
              >
                <Send className="w-3.5 h-3.5" /> Submit for verification
              </button>
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ── LEFT: Main Content ── */}
        <div className="lg:col-span-2 space-y-6 min-w-0">
          {/* Profile header card + skills */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="h-28 sm:h-32 bg-gradient-to-r from-blue-600 via-indigo-600 to-sky-500" />
            <div className="p-4 sm:p-6 relative">
              <div className="absolute -top-12 left-4 sm:left-6">
                <div className="w-24 h-24 rounded-full border-4 border-white bg-blue-600 overflow-hidden flex items-center justify-center text-white text-3xl font-bold shadow-md">
                  {personal.avatarUrl ? (
                    <ProtectedMediaPreview url={personal.avatarUrl} alt={studentName} />
                  ) : (
                    studentName.charAt(0).toUpperCase()
                  )}
                </div>
              </div>
              <div className="mt-14">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-xl font-bold text-gray-900 break-words">{studentName}</h2>
                </div>
                <p className="text-gray-600 text-sm mt-0.5">{profile?.degree || 'Degree not provided'}</p>
                {profile?.college && (
                  <p className="text-gray-400 text-xs flex items-center gap-1 mt-1">
                    <GraduationCap className="w-3.5 h-3.5 text-blue-500" /> {profile.college}
                  </p>
                )}
                <div className="flex flex-wrap items-center gap-2 text-xs mt-2">
                  <span className="bg-gray-100 px-2.5 py-0.5 rounded-full font-medium text-gray-700">
                    Roll: {profile?.rollNo || 'Not Assigned'}
                  </span>
                  {profile?.departmentCode && (
                    <span className="bg-blue-50 text-blue-700 px-2.5 py-0.5 rounded-full font-medium">Dept: {profile.departmentCode}</span>
                  )}
                  {academic.cgpa != null && (
                    <span className="bg-green-50 text-green-700 px-2.5 py-0.5 rounded-full font-medium">CGPA: {academic.cgpa}</span>
                  )}
                  {academic.semester != null && (
                    <span className="bg-purple-50 text-purple-700 px-2.5 py-0.5 rounded-full font-medium">Sem: {academic.semester}</span>
                  )}
                </div>
              </div>

              {/* Skills */}
              <div className="mt-5 pt-4 border-t border-gray-100" id="section-skills">
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Technical Skills</p>
                  {sectionProps('SKILLS').changed && (
                    <span className="text-[10px] font-bold uppercase tracking-wide text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
                      Changed
                    </span>
                  )}
                </div>
                {sectionProps('SKILLS').comment && (
                  <p className="mb-2 text-xs p-2.5 rounded-xl bg-red-50 border border-red-200 text-red-800">
                    <span className="font-semibold">Reviewer comment:</span> {sectionProps('SKILLS').comment}
                  </p>
                )}
                {validationErrors.SKILLS && (
                  <p className="mb-2 text-xs p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-800" role="alert">
                    {validationErrors.SKILLS.join(' ')}
                  </p>
                )}
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
                  {displayData.skills.length === 0 && <li className="text-xs text-gray-400 italic">No skills added yet.</li>}
                </ul>
                {editable && (
                  <form onSubmit={addSkill} className="mt-3 flex flex-col sm:flex-row gap-2">
                    <label htmlFor="new-skill" className="sr-only">New skill</label>
                    <input
                      id="new-skill"
                      type="text"
                      value={skillInput}
                      maxLength={60}
                      onChange={(e) => setSkillInput(e.target.value)}
                      placeholder="Add a skill, e.g. React"
                      className="flex-1 min-w-0 px-3 py-2 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <label htmlFor="new-skill-level" className="sr-only">Proficiency</label>
                    <select
                      id="new-skill-level"
                      value={skillLevel}
                      onChange={(e) => setSkillLevel(e.target.value)}
                      className="px-3 py-2 border border-gray-300 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      {SKILL_PROFICIENCIES.map((p) => (
                        <option key={p} value={p}>{enumLabel(p)}</option>
                      ))}
                    </select>
                    <button
                      type="submit"
                      className="border border-dashed border-blue-500 text-blue-600 hover:bg-blue-50 px-3 py-2 rounded-xl text-xs font-semibold transition flex items-center justify-center gap-1"
                    >
                      <Plus className="w-3 h-3" /> Add Skill
                    </button>
                  </form>
                )}
              </div>
            </div>
          </div>

          {/* Personal details */}
          <SectionCard
            id="section-personal"
            icon={Phone}
            title="Personal & Contact Details"
            subtitle="Name, contact details and profile links."
            {...sectionProps('PERSONAL')}
            action={
              editable && (
                <button
                  type="button"
                  onClick={() => openModal({ type: 'personal' })}
                  className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-3.5 py-2 rounded-xl transition flex items-center gap-1.5 shadow-sm"
                >
                  <Pencil className="w-3.5 h-3.5" /> Edit Details
                </button>
              )
            }
          >
            <div className="grid sm:grid-cols-3 gap-3">
              {[
                { icon: Phone, label: 'Phone', value: personal.phone },
                { icon: Mail, label: 'Email', value: managed.email, locked: true },
                { icon: MapPin, label: 'Address', value: personal.address },
              ].map(({ icon: RowIcon, label, value, locked }) => (
                <div key={label} className="flex items-start gap-3 p-3 bg-gray-50 rounded-xl min-w-0">
                  <RowIcon className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" aria-hidden="true" />
                  <div className="min-w-0">
                    <p className="text-xs text-gray-400 uppercase font-semibold flex items-center gap-1">
                      {label} {locked && (
                        <span title={ADMIN_MANAGED_HINT} className="inline-flex">
                          <Lock className="w-3 h-3" aria-label="Managed by the placement cell" />
                        </span>
                      )}
                    </p>
                    <p className="text-sm font-medium text-gray-800 break-all">{displayValue(value)}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="grid sm:grid-cols-3 gap-3 mt-3">
              {[
                ['GitHub', personal.githubUrl],
                ['LinkedIn', personal.linkedinUrl],
                ['Portfolio', personal.portfolioUrl],
              ].map(([label, url]) => (
                <div key={label} className="flex items-start gap-3 p-3 bg-gray-50 rounded-xl min-w-0">
                  <LinkIcon className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" aria-hidden="true" />
                  <div className="min-w-0">
                    <p className="text-xs text-gray-400 uppercase font-semibold">{label}</p>
                    {url ? (
                      <a href={url} target="_blank" rel="noopener noreferrer" className="text-sm font-medium text-blue-600 hover:underline break-all inline-flex items-center gap-1">
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

          {/* About */}
          <div className="bg-white p-4 sm:p-6 rounded-2xl shadow-sm border border-gray-100">
            <div className="flex justify-between items-center mb-3">
              <h3 className="font-semibold text-lg text-gray-900">About Me</h3>
              {editable && !editAbout && (
                <button
                  onClick={() => {
                    setAboutDraft(personal.about || '');
                    setEditAbout(true);
                  }}
                  className="text-gray-400 hover:text-blue-600 p-1 rounded-lg hover:bg-gray-50 transition"
                  aria-label="Edit about description"
                >
                  <Pencil className="w-4 h-4" />
                </button>
              )}
            </div>
            {editable && editAbout ? (
              <div className="space-y-3">
                <label htmlFor="about-text" className="sr-only">About me</label>
                <textarea
                  id="about-text"
                  value={aboutDraft}
                  onChange={(e) => setAboutDraft(e.target.value)}
                  rows={4}
                  maxLength={2000}
                  placeholder="A concise professional summary: career goals, key strengths, areas of expertise…"
                  className="w-full border border-gray-300 rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y"
                />
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs text-gray-400">{aboutDraft.length} / 2000</span>
                  <div className="flex gap-2">
                    <button onClick={() => setEditAbout(false)} className="text-gray-600 text-xs px-3.5 py-1.5 rounded-lg hover:bg-gray-100 transition">
                      Cancel
                    </button>
                    <button onClick={saveAbout} className="bg-blue-600 text-white text-xs font-semibold px-4 py-1.5 rounded-lg hover:bg-blue-700 transition">
                      Update draft
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-gray-600 text-sm leading-relaxed whitespace-pre-line break-words">
                {personal.about || <span className="text-gray-400 italic">No summary provided yet.</span>}
              </p>
            )}
          </div>

          {/* Academic */}
          <SectionCard
            id="section-academic"
            icon={GraduationCap}
            title="Academic Overview"
            subtitle="CGPA, backlogs and semester are verified by your faculty advisor."
            {...sectionProps('ACADEMIC')}
            action={
              editable && (
                <button
                  type="button"
                  onClick={() => openModal({ type: 'academic' })}
                  className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-3.5 py-2 rounded-xl transition flex items-center gap-1.5 shadow-sm"
                >
                  <Pencil className="w-3.5 h-3.5" /> Edit Academics
                </button>
              )
            }
          >
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
              <div className="p-3 bg-green-50/60 rounded-xl">
                <p className="text-xs text-gray-500 font-medium">CGPA</p>
                <p className="text-sm font-bold text-green-900 mt-1">{academic.cgpa != null ? `${academic.cgpa} / 10` : 'Not provided'}</p>
              </div>
              <div className="p-3 bg-purple-50/60 rounded-xl">
                <p className="text-xs text-gray-500 font-medium">Semester</p>
                <p className="text-sm font-bold text-purple-900 mt-1">{academic.semester != null ? `Semester ${academic.semester}` : 'N/A'}</p>
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
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-3 text-sm">
              {[
                ['Department', managed.department],
                ['Batch', managed.batch],
                ['Degree', managed.degree],
              ].map(([label, value]) => (
                <div key={label} className="p-3 bg-gray-50 rounded-xl">
                  <p className="text-xs text-gray-500 font-medium flex items-center gap-1">
                    <Lock className="w-3 h-3" aria-hidden="true" /> {label}
                  </p>
                  <p className="font-semibold text-gray-800 mt-0.5 break-words">{displayValue(value)}</p>
                </div>
              ))}
            </div>
            <p className="text-[11px] text-gray-400 mt-3 flex items-center gap-1">
              <Lock className="w-3 h-3 shrink-0" /> Register number, department, batch, degree and email: {ADMIN_MANAGED_HINT}
            </p>
          </SectionCard>

          {listSection('EDUCATION')}
          {listSection('EXPERIENCE')}

          {/* Projects */}
          <SectionCard
            id="section-projects"
            icon={Layers}
            iconClass="text-purple-600"
            title="Projects Showcase"
            subtitle="Portfolio projects visible to recruiters once verified."
            {...sectionProps('PROJECTS')}
            action={
              editable && (
                <>
                  <button
                    type="button"
                    onClick={() => navigate('/student/add-project')}
                    disabled={hasUnsavedChanges}
                    title={hasUnsavedChanges ? 'Save your draft before opening the full project form' : undefined}
                    className="text-xs font-semibold px-3 py-2 rounded-xl border border-gray-300 text-gray-700 hover:bg-gray-50 transition disabled:opacity-40"
                  >
                    Full form
                  </button>
                  <button
                    type="button"
                    onClick={() => openModal({ type: 'item', sectionKey: 'PROJECTS', index: null })}
                    className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-3.5 py-2 rounded-xl transition flex items-center gap-1.5 shadow-sm"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add Project
                  </button>
                </>
              )
            }
          >
            {displayData.projects.length > 0 ? (
              <div className="grid sm:grid-cols-2 gap-4">
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
                description={editable ? 'Add projects to showcase your practical work to visiting companies.' : undefined}
                action={editable ? { label: 'Add First Project', onClick: () => openModal({ type: 'item', sectionKey: 'PROJECTS', index: null }), icon: Plus } : undefined}
                compact
                className="bg-gray-50/50 border-dashed border-gray-200"
              />
            )}
          </SectionCard>

          {listSection('CERTIFICATIONS')}
          {listSection('ACHIEVEMENTS')}

          {/* Resume */}
          <SectionCard
            id="section-resume"
            icon={FileText}
            title="Resume"
            subtitle="PDF up to 10 MB. Recruiters see the resume once your advisor approves it."
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

          {/* Evidence */}
          {!viewOfficial && (
            <SectionCard
              id="section-evidence"
              icon={Paperclip}
              iconClass="text-gray-600"
              title="Evidence for your advisor"
              subtitle="Extra files that support a change (e.g. a new marksheet for a CGPA update). Only your advisor sees these."
            >
              {data.evidence.length > 0 ? (
                <ul className="space-y-2 mb-4">
                  {data.evidence.map((ev, index) => (
                    <li key={`${ev.fileUrl}-${index}`} className="border border-gray-200 rounded-xl p-3 bg-gray-50/50 flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-gray-800 break-all">
                          <ProtectedFileLink url={ev.fileUrl} className="hover:underline text-left">
                            {ev.fileName || 'Evidence file'}
                          </ProtectedFileLink>
                        </p>
                        <p className="text-[11px] text-gray-500">
                          For: {sectionLabel(ev.section)}
                          {ev.size ? ` · ${formatFileSize(ev.size)}` : ''}
                        </p>
                        {ev.note && <p className="text-xs text-gray-600 mt-1 break-words">{ev.note}</p>}
                      </div>
                      {editable && (
                        <button
                          type="button"
                          onClick={() => setSection('evidence', data.evidence.filter((_, i) => i !== index))}
                          className="text-gray-400 hover:text-red-600 p-1.5 rounded-lg"
                          aria-label={`Remove evidence ${ev.fileName || ''}`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-gray-400 italic mb-4">No evidence attached.</p>
              )}
              {editable && (
                <div className="rounded-xl border border-gray-200 p-3 sm:p-4 space-y-3">
                  <div className="grid sm:grid-cols-2 gap-3">
                    <SelectField
                      label="Supports section"
                      value={evidenceSection}
                      onChange={setEvidenceSection}
                      options={EVIDENCE_SECTIONS.map((k) => ({ value: k, label: sectionLabel(k) }))}
                    />
                    <div>
                      <label htmlFor="evidence-note" className="block text-xs font-semibold text-gray-700 mb-1">
                        Note (optional)
                      </label>
                      <input
                        id="evidence-note"
                        type="text"
                        maxLength={255}
                        value={evidenceNote}
                        onChange={(e) => setEvidenceNote(e.target.value)}
                        placeholder="e.g. Semester 6 grade sheet"
                        className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
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
        </div>

        {/* ── RIGHT: Sidebar Widgets ── */}
        <div className="space-y-6">
          <div className="bg-white p-5 sm:p-6 rounded-2xl shadow-sm border border-gray-100">
            <div className="flex justify-between text-sm font-semibold mb-2">
              <span className="text-gray-900">Profile Completion</span>
              <span className="text-blue-600">{completionPct}%</span>
            </div>
            <div className="w-full bg-gray-100 h-2.5 rounded-full overflow-hidden">
              <div className="bg-blue-600 h-full rounded-full transition-all duration-500" style={{ width: `${completionPct}%` }} />
            </div>
            <p className="text-xs text-gray-400 mt-2">Based on your verified profile.</p>
          </div>

          <div className="bg-white p-5 sm:p-6 rounded-2xl shadow-sm border border-gray-100">
            <h3 className="font-semibold text-sm text-gray-900 mb-3">Placement Status</h3>
            <div
              className={`p-4 rounded-xl border ${
                profile?.placementStatus === 'PLACED' ? 'bg-green-50 border-green-200 text-green-800' : 'bg-blue-50 border-blue-200 text-blue-800'
              }`}
            >
              <div className="flex items-center gap-2 font-bold text-sm">
                <Award className="w-4 h-4" />
                {profile?.placementStatus === 'PLACED' ? 'Placed' : 'Not placed yet'}
              </div>
              <p className="text-xs mt-1 opacity-90">
                {profile?.placementStatus === 'PLACED'
                  ? placementSummary({ status: 'PLACED', companyName: profile?.placedCompany?.name, ctc: profile?.placedCtc })
                  : openToOpportunities
                  ? 'Open to opportunities. You can apply to any number of drives.'
                  : 'Not seeking opportunities right now.'}
              </p>
            </div>
            <div className="flex items-center justify-between gap-3 mt-4">
              <label htmlFor="open-opportunities" className="text-xs text-gray-700 font-medium">
                I am actively seeking placement & internship opportunities
              </label>
              <button
                id="open-opportunities"
                type="button"
                role="switch"
                aria-checked={openToOpportunities}
                onClick={handleToggleOpportunities}
                disabled={!profile || savingPreference || lifecycle !== 'ACTIVE'}
                className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition disabled:opacity-50 ${
                  openToOpportunities ? 'bg-blue-600' : 'bg-gray-300'
                }`}
              >
                <span
                  className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition ${
                    openToOpportunities ? 'translate-x-5' : 'translate-x-0.5'
                  }`}
                />
              </button>
            </div>
            <p className="text-[11px] text-gray-400 mt-1">This preference applies immediately and is not part of verification.</p>
          </div>

          <div className="bg-white p-5 sm:p-6 rounded-2xl shadow-sm border border-gray-100">
            <h3 className="font-semibold text-sm text-gray-900 mb-3">Activity Summary</h3>
            <div className="space-y-3 text-sm">
              {[
                ['Applied Jobs', dashboardStats?.appliedJobsCount ?? 0, 'text-gray-800'],
                ['Active Campus Drives', dashboardStats?.activeJobsCount ?? 0, 'text-blue-600'],
                ['Education Entries', displayData.education.length, 'text-blue-600'],
                ['Internships', displayData.experience.length, 'text-indigo-600'],
                ['Projects', displayData.projects.length, 'text-purple-600'],
                ['Certifications', displayData.certifications.length, 'text-emerald-600'],
                ['Achievements', displayData.achievements.length, 'text-amber-600'],
              ].map(([label, value, cls]) => (
                <div key={label} className="flex justify-between py-1.5 border-b border-gray-100 last:border-0">
                  <span className="text-gray-500">{label}</span>
                  <span className={`font-bold ${cls}`}>{value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── Modals ── */}
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
    </main>
  );
}
