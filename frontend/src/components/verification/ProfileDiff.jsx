import { useMemo, useState } from 'react';
import { ChevronDown, ChevronRight, ExternalLink, FileText, MessageSquare } from 'lucide-react';
import { ProtectedFileLink } from '../ProtectedMedia';
import { diffProfile, formatDiffValue } from '../../utils/profileDiff';

const ITEM_STATUS = {
  added: { label: 'Added', cls: 'bg-green-100 text-green-700', border: 'border-green-200', bg: 'bg-green-50/40' },
  removed: { label: 'Removed', cls: 'bg-red-100 text-red-700', border: 'border-red-200', bg: 'bg-red-50/40' },
  changed: { label: 'Changed', cls: 'bg-amber-100 text-amber-700', border: 'border-amber-200', bg: 'bg-amber-50/30' },
  unchanged: { label: 'Unchanged', cls: 'bg-gray-100 text-gray-600', border: 'border-gray-100', bg: '' },
};

/** One value: files open through an authenticated blob fetch, URLs as external links. */
function Value({ value, type }) {
  const text = formatDiffValue(value);
  if (text === '—') return <span className="text-gray-400">—</span>;
  if (type === 'file') {
    return (
      <ProtectedFileLink url={String(value)} className="inline-flex items-center gap-1 text-blue-600 hover:underline text-left break-all" title="Open file">
        <FileText className="w-3.5 h-3.5 shrink-0" /> View file
      </ProtectedFileLink>
    );
  }
  if (type === 'url' && /^https?:\/\//i.test(String(value))) {
    return (
      <a href={String(value)} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-blue-600 hover:underline break-all">
        {text} <ExternalLink className="w-3 h-3 shrink-0" />
      </a>
    );
  }
  return <span className="whitespace-pre-wrap break-words">{text}</span>;
}

/** Field rows: label | verified | proposed, with changed rows highlighted. */
function FieldRows({ fields, onlyChanged = false, side = 'both' }) {
  const rows = onlyChanged ? fields.filter((f) => f.changed) : fields;
  if (rows.length === 0) return null;
  return (
    <div className="divide-y divide-gray-100 text-sm">
      {rows.map((f) => (
        <div key={f.name} className={`grid grid-cols-1 md:grid-cols-[150px_1fr_1fr] gap-1 md:gap-3 px-3 py-2 ${f.changed && side === 'both' ? 'bg-amber-50/60' : ''}`}>
          <div className="text-xs font-semibold text-gray-500 md:pt-0.5">{f.label}</div>
          {side === 'after' ? (
            <div className="hidden md:block text-gray-300 text-xs italic">not present</div>
          ) : (
            <div className={`min-w-0 ${f.changed && side === 'both' ? 'text-red-700 line-through decoration-red-300' : side === 'before' ? 'text-red-700' : 'text-gray-700'}`}>
              <span className="md:hidden text-[10px] uppercase font-semibold text-gray-400 mr-1">Verified:</span>
              <Value value={f.before} type={f.type} />
            </div>
          )}
          {side === 'before' ? (
            <div className="hidden md:block text-gray-300 text-xs italic">removed</div>
          ) : (
            <div className={`min-w-0 ${(f.changed && side === 'both') || side === 'after' ? 'text-green-800 font-medium' : 'text-gray-700'}`}>
              <span className="md:hidden text-[10px] uppercase font-semibold text-gray-400 mr-1">Proposed:</span>
              <Value value={f.after} type={f.type} />
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function ListItem({ item }) {
  const meta = ITEM_STATUS[item.status];
  const [open, setOpen] = useState(item.status !== 'unchanged');
  return (
    <div className={`border rounded-lg ${meta.border} ${meta.bg}`}>
      <button type="button" onClick={() => setOpen((v) => !v)} className="w-full flex items-center gap-2 px-3 py-2 text-left" aria-expanded={open}>
        {open ? <ChevronDown className="w-4 h-4 text-gray-400 shrink-0" /> : <ChevronRight className="w-4 h-4 text-gray-400 shrink-0" />}
        <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold shrink-0 ${meta.cls}`}>{meta.label}</span>
        <span className={`text-sm font-medium truncate ${item.status === 'removed' ? 'line-through text-gray-500' : 'text-gray-900'}`}>{item.title}</span>
        {item.status === 'changed' && (
          <span className="ml-auto text-[11px] text-amber-700 shrink-0">{item.fields.filter((f) => f.changed).length} field(s)</span>
        )}
      </button>
      {open && (
        <div className="border-t border-gray-100 bg-white/70 rounded-b-lg">
          {item.status === 'changed' && <FieldRows fields={item.fields} onlyChanged />}
          {item.status === 'added' && <FieldRows fields={item.fields.filter((f) => f.after != null && f.after !== '')} side="after" />}
          {item.status === 'removed' && <FieldRows fields={item.fields.filter((f) => f.before != null && f.before !== '')} side="before" />}
          {item.status === 'unchanged' && <FieldRows fields={item.fields.filter((f) => f.after != null && f.after !== '')} />}
        </div>
      )}
    </div>
  );
}

function SectionCard({ section, comment, existingComment, onComment, commentsEditable }) {
  const [open, setOpen] = useState(section.changed);
  const counts = section.counts;
  return (
    <section className={`bg-white rounded-xl border shadow-sm ${section.changed ? 'border-amber-200' : 'border-gray-100'}`} aria-label={section.label}>
      <button type="button" onClick={() => setOpen((v) => !v)} className="w-full flex flex-wrap items-center gap-2 px-4 py-3 text-left" aria-expanded={open}>
        {open ? <ChevronDown className="w-4 h-4 text-gray-400" /> : <ChevronRight className="w-4 h-4 text-gray-400" />}
        <h4 className="font-semibold text-gray-900 text-sm">{section.label}</h4>
        {section.changed ? (
          <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold bg-amber-100 text-amber-700">Changed</span>
        ) : (
          <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold bg-gray-100 text-gray-500">No changes</span>
        )}
        {counts && section.changed && (
          <span className="text-[11px] text-gray-500 ml-auto">
            {[counts.added && `${counts.added} added`, counts.changed && `${counts.changed} changed`, counts.removed && `${counts.removed} removed`].filter(Boolean).join(' · ')}
          </span>
        )}
      </button>
      {open && (
        <div className="px-4 pb-4">
          {section.kind === 'object' ? (
            <div className="border border-gray-100 rounded-lg overflow-hidden">
              <div className="hidden md:grid grid-cols-[150px_1fr_1fr] gap-3 px-3 py-2 bg-gray-50 text-[11px] font-semibold text-gray-500 uppercase tracking-wide">
                <div>Field</div><div>Verified (current)</div><div>Proposed</div>
              </div>
              {section.empty ? <p className="px-3 py-3 text-sm text-gray-400">Nothing provided.</p> : <FieldRows fields={section.fields} />}
            </div>
          ) : section.items.length === 0 ? (
            <p className="text-sm text-gray-400">No items in either version.</p>
          ) : (
            <>
              <div className="hidden md:grid grid-cols-[150px_1fr_1fr] gap-3 px-3 pb-1 text-[11px] font-semibold text-gray-500 uppercase tracking-wide">
                <div>Field</div><div>Verified (current)</div><div>Proposed</div>
              </div>
              <div className="space-y-2">
                {section.items.map((item, i) => <ListItem key={`${item.status}-${item.after?.id ?? item.before?.id ?? i}-${i}`} item={item} />)}
              </div>
            </>
          )}

          {existingComment && (
            <div className="mt-3 flex items-start gap-2 bg-red-50 border border-red-100 text-red-800 text-sm rounded-lg px-3 py-2">
              <MessageSquare className="w-4 h-4 mt-0.5 shrink-0" />
              <p className="whitespace-pre-wrap">{existingComment}</p>
            </div>
          )}
          {commentsEditable && section.changed && (
            <div className="mt-3">
              <label htmlFor={`section-comment-${section.key}`} className="block text-xs font-semibold text-gray-700 mb-1">
                Comment on {section.label.toLowerCase()} (optional)
              </label>
              <textarea
                id={`section-comment-${section.key}`}
                rows={2}
                maxLength={2000}
                value={comment || ''}
                onChange={(e) => onComment(section.key, e.target.value)}
                placeholder="What should the student fix in this section?"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-400"
              />
            </div>
          )}
        </div>
      )}
    </section>
  );
}

/**
 * Section-by-section comparison of the verified profile and a proposed version.
 *
 * @param {object} props
 * @param {object} props.before - verified ProfileData
 * @param {object} props.after - proposed ProfileData
 * @param {string[]} [props.changedSections] - backend's list of changed section keys
 * @param {object} [props.existingComments] - {SECTION: comment} from a decided request
 * @param {boolean} [props.commentsEditable] - show per-section comment boxes (reject mode)
 * @param {object} [props.comments] - {SECTION: comment} being written
 * @param {(key: string, value: string) => void} [props.onComment]
 */
export default function ProfileDiff({ before, after, changedSections = [], existingComments = {}, commentsEditable = false, comments = {}, onComment = () => {} }) {
  const sections = useMemo(() => diffProfile(before || {}, after || {}, changedSections), [before, after, changedSections]);
  const [showUnchanged, setShowUnchanged] = useState(false);
  const changed = sections.filter((s) => s.changed);
  const unchanged = sections.filter((s) => !s.changed);

  return (
    <div className="space-y-3">
      {changed.length === 0 && (
        <p className="text-sm text-gray-500 bg-white border border-gray-100 rounded-xl px-4 py-3">No differences from the verified profile.</p>
      )}
      {changed.map((s) => (
        <SectionCard
          key={s.key}
          section={s}
          comment={comments[s.key]}
          existingComment={existingComments?.[s.key]}
          onComment={onComment}
          commentsEditable={commentsEditable}
        />
      ))}
      {unchanged.length > 0 && (
        <button type="button" onClick={() => setShowUnchanged((v) => !v)} className="text-sm text-blue-600 hover:underline font-medium">
          {showUnchanged ? 'Hide' : 'Show'} {unchanged.length} unchanged section{unchanged.length === 1 ? '' : 's'}
        </button>
      )}
      {showUnchanged && unchanged.map((s) => <SectionCard key={s.key} section={s} existingComment={existingComments?.[s.key]} />)}
    </div>
  );
}
