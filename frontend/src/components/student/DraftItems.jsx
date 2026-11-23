import {
  Award,
  Briefcase,
  Calendar,
  ExternalLink,
  FileText,
  GraduationCap,
  MapPin,
  Pencil,
  Trophy,
  Trash2,
  BadgeCheck,
} from 'lucide-react';
import { ProtectedMediaPreview, ProtectedFileLink } from '../ProtectedMedia';
import { enumLabel } from '../../utils/profileDraft';
import { formatFileSize } from '../../services/api/fileService';

/** Edit / remove buttons for one draft item; hidden when read-only. */
export function ItemActions({ editable, label, onEdit, onRemove }) {
  if (!editable) return null;
  return (
    <div className="flex items-center gap-1 shrink-0">
      <button
        type="button"
        onClick={onEdit}
        className="text-gray-400 hover:text-blue-600 p-1.5 rounded-lg hover:bg-white border border-transparent hover:border-gray-200 transition"
        aria-label={`Edit ${label}`}
        title="Edit"
      >
        <Pencil className="w-4 h-4" />
      </button>
      <button
        type="button"
        onClick={onRemove}
        className="text-gray-400 hover:text-red-600 p-1.5 rounded-lg hover:bg-white border border-transparent hover:border-gray-200 transition"
        aria-label={`Remove ${label}`}
        title="Remove"
      >
        <Trash2 className="w-4 h-4" />
      </button>
    </div>
  );
}

const NewBadge = ({ item }) =>
  item?.id == null ? (
    <span className="text-[10px] font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded-full">
      New
    </span>
  ) : null;

const DatePill = ({ children }) => (
  <span className="inline-flex items-center gap-1 text-[11px] font-medium text-gray-600 bg-white border border-gray-200 px-2.5 py-0.5 rounded-full">
    <Calendar className="w-3 h-3 text-gray-400" aria-hidden="true" />
    {children}
  </span>
);

const rowCls = 'border border-gray-200 rounded-xl p-3 sm:p-4 bg-gray-50/50 hover:bg-gray-50 transition';

export function EducationItem({ item, actions }) {
  return (
    <div className={`${rowCls} flex items-start justify-between gap-3`}>
      <div className="flex items-start gap-3 min-w-0">
        <div className="bg-blue-100 text-blue-700 p-2.5 rounded-xl shrink-0 mt-0.5 hidden sm:block">
          <GraduationCap className="w-5 h-5" aria-hidden="true" />
        </div>
        <div className="min-w-0">
          <h4 className="font-bold text-sm text-gray-900 flex flex-wrap items-center gap-2 break-words">
            {item.institutionName} <NewBadge item={item} />
          </h4>
          <p className="text-xs font-semibold text-blue-700 mt-0.5">{item.degree}</p>
          {item.boardOrUniversity && <p className="text-xs text-gray-500 mt-0.5">{item.boardOrUniversity}</p>}
          <div className="flex flex-wrap items-center gap-2 mt-2">
            <DatePill>
              {item.startYear || '—'} - {item.isCurrent ? 'Present' : item.endYear || 'N/A'}
            </DatePill>
            {item.grade && (
              <span className="text-[11px] font-semibold text-green-700 bg-green-50 border border-green-200 px-2 py-0.5 rounded-full">
                Grade: {item.grade}
              </span>
            )}
          </div>
        </div>
      </div>
      {actions}
    </div>
  );
}

export function ExperienceItem({ item, actions }) {
  return (
    <div className={rowCls}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0">
          <div className="bg-indigo-100 text-indigo-700 p-2.5 rounded-xl shrink-0 mt-0.5 hidden sm:block">
            <Briefcase className="w-5 h-5" aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h4 className="font-bold text-sm text-gray-900 break-words">{item.jobRole}</h4>
              <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded-full">
                {enumLabel(item.experienceType || 'INTERNSHIP')}
              </span>
              <NewBadge item={item} />
            </div>
            <p className="text-xs font-semibold text-gray-700 mt-0.5">{item.company}</p>
            <div className="flex flex-wrap items-center gap-2 mt-2">
              {item.location && (
                <span className="flex items-center gap-1 text-[11px] text-gray-600">
                  <MapPin className="w-3 h-3 text-gray-400" aria-hidden="true" />
                  {item.location}
                </span>
              )}
              <DatePill>
                {item.startDate || '—'} - {item.isCurrent ? 'Present' : item.endDate || 'N/A'}
              </DatePill>
            </div>
          </div>
        </div>
        {actions}
      </div>
      {item.description && (
        <p className="text-gray-600 text-xs mt-2 leading-relaxed whitespace-pre-line sm:pl-12">{item.description}</p>
      )}
    </div>
  );
}

export function ProjectItem({ item, actions }) {
  const tech = Array.isArray(item.techStack) ? item.techStack : [];
  return (
    <div className="border border-gray-200 rounded-xl p-4 hover:shadow-md transition flex flex-col justify-between bg-white min-w-0">
      <div>
        {item.mediaUrl && (
          <div className="mb-3 rounded-lg overflow-hidden border border-gray-100 h-32 bg-gray-100">
            <ProtectedMediaPreview url={item.mediaUrl} alt={item.title} />
          </div>
        )}
        <div className="flex items-start justify-between gap-2">
          <h4 className="font-bold text-sm text-gray-900 flex flex-wrap items-center gap-2 break-words min-w-0">
            {item.title} <NewBadge item={item} />
          </h4>
          {actions}
        </div>
        {item.description && (
          <p className="text-gray-600 text-xs mt-1.5 mb-3 leading-relaxed line-clamp-3">{item.description}</p>
        )}
        {tech.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-3">
            {tech.map((t) => (
              <span key={t} className="bg-blue-50 text-blue-700 text-[11px] px-2 py-0.5 rounded font-medium">
                {t}
              </span>
            ))}
          </div>
        )}
      </div>
      {(item.liveUrl || item.repoUrl || item.mediaUrl) && (
        <div className="flex flex-wrap items-center gap-3 pt-3 border-t border-gray-100 text-xs">
          {item.liveUrl && (
            <a href={item.liveUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline flex items-center gap-1 font-medium">
              <ExternalLink className="w-3 h-3" /> Live
            </a>
          )}
          {item.repoUrl && (
            <a href={item.repoUrl} target="_blank" rel="noopener noreferrer" className="text-gray-600 hover:underline flex items-center gap-1 font-medium">
              <ExternalLink className="w-3 h-3" /> Code
            </a>
          )}
          {item.mediaUrl && (
            <ProtectedFileLink url={item.mediaUrl} className="text-purple-600 hover:underline flex items-center gap-1 font-medium">
              Media
            </ProtectedFileLink>
          )}
        </div>
      )}
    </div>
  );
}

export function CertificationItem({ item, actions }) {
  return (
    <div className={`${rowCls} flex items-start justify-between gap-3`}>
      <div className="flex items-start gap-3 min-w-0">
        <div className="bg-emerald-100 text-emerald-700 p-2.5 rounded-xl shrink-0 mt-0.5 hidden sm:block">
          <BadgeCheck className="w-5 h-5" aria-hidden="true" />
        </div>
        <div className="min-w-0">
          <h4 className="font-bold text-sm text-gray-900 flex flex-wrap items-center gap-2 break-words">
            {item.name} <NewBadge item={item} />
          </h4>
          {item.issuer && <p className="text-xs font-semibold text-emerald-700 mt-0.5">{item.issuer}</p>}
          <div className="flex flex-wrap items-center gap-2 mt-2 text-[11px] text-gray-600">
            {item.issueDate && <DatePill>Issued {item.issueDate}{item.expiryDate ? ` · Expires ${item.expiryDate}` : ''}</DatePill>}
            {item.credentialId && <span className="break-all">ID: {item.credentialId}</span>}
            {item.credentialUrl && (
              <a href={item.credentialUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline inline-flex items-center gap-1 font-medium">
                <ExternalLink className="w-3 h-3" /> Verify
              </a>
            )}
            {item.fileUrl && (
              <ProtectedFileLink url={item.fileUrl} className="text-purple-600 hover:underline inline-flex items-center gap-1 font-medium">
                <FileText className="w-3 h-3" /> Certificate
              </ProtectedFileLink>
            )}
          </div>
        </div>
      </div>
      {actions}
    </div>
  );
}

export function AchievementItem({ item, actions }) {
  return (
    <div className={`${rowCls} flex items-start justify-between gap-3`}>
      <div className="flex items-start gap-3 min-w-0">
        <div className="bg-amber-100 text-amber-700 p-2.5 rounded-xl shrink-0 mt-0.5 hidden sm:block">
          <Trophy className="w-5 h-5" aria-hidden="true" />
        </div>
        <div className="min-w-0">
          <h4 className="font-bold text-sm text-gray-900 flex flex-wrap items-center gap-2 break-words">
            {item.title} <NewBadge item={item} />
          </h4>
          {item.description && <p className="text-xs text-gray-600 mt-1 whitespace-pre-line">{item.description}</p>}
          <div className="flex flex-wrap items-center gap-2 mt-2 text-[11px]">
            {item.achievedOn && <DatePill>{item.achievedOn}</DatePill>}
            {item.fileUrl && (
              <ProtectedFileLink url={item.fileUrl} className="text-purple-600 hover:underline inline-flex items-center gap-1 font-medium">
                <Award className="w-3 h-3" /> Proof
              </ProtectedFileLink>
            )}
          </div>
        </div>
      </div>
      {actions}
    </div>
  );
}

export function DocumentItem({ item, actions }) {
  return (
    <div className={`${rowCls} flex items-center justify-between gap-3`}>
      <div className="flex items-center gap-3 min-w-0">
        <div className="bg-blue-100 text-blue-600 p-2 rounded-lg shrink-0">
          <FileText className="w-4 h-4" aria-hidden="true" />
        </div>
        <div className="min-w-0">
          <p className="font-semibold text-sm text-gray-900 flex flex-wrap items-center gap-2 break-words">
            {item.documentName} <NewBadge item={item} />
          </p>
          <p className="text-[11px] text-gray-500">
            {enumLabel(item.documentType || 'OTHER')}
            {item.fileSize ? ` · ${formatFileSize(item.fileSize)}` : ''}
            {item.fileUrl && (
              <>
                {' · '}
                <ProtectedFileLink url={item.fileUrl} className="text-blue-600 hover:underline font-medium">
                  View
                </ProtectedFileLink>
              </>
            )}
          </p>
        </div>
      </div>
      {actions}
    </div>
  );
}
