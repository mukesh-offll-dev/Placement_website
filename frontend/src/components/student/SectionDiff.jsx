import { ArrowRight, Minus, Plus, RefreshCw } from 'lucide-react';
import { ProtectedFileLink } from '../ProtectedMedia';
import { isApiFileUrl } from '../../services/api/fileService';
import { diffSection, FILE_FIELDS, formatValue, sectionLabel } from '../../utils/profileDraft';
import { ChangedBadge, ReviewerComment } from './SectionCard';

function Value({ field, value }) {
  if (FILE_FIELDS.has(field) && typeof value === 'string' && value) {
    return (
      <ProtectedFileLink url={value} className="text-blue-600 hover:underline font-medium break-all text-left">
        {isApiFileUrl(value) ? 'View file' : value}
      </ProtectedFileLink>
    );
  }
  return <span className="break-words whitespace-pre-line">{formatValue(value)}</span>;
}

function ItemSummary({ item }) {
  const entries = Object.entries(item || {}).filter(
    ([k, v]) => k !== 'id' && !k.startsWith('_') && v !== null && v !== undefined && v !== '' && !(Array.isArray(v) && !v.length) && v !== false
  );
  if (!entries.length) return null;
  return (
    <dl className="mt-1 grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-0.5 text-[11px] text-gray-600">
      {entries.map(([k, v]) => (
        <div key={k} className="flex gap-1 min-w-0">
          <dt className="text-gray-400 shrink-0">{k.replace(/([A-Z])/g, ' $1').toLowerCase()}:</dt>
          <dd className="min-w-0">
            <Value field={k} value={v} />
          </dd>
        </div>
      ))}
    </dl>
  );
}

/**
 * Readable old-vs-new comparison of one profile section.
 * `before` and `after` are whole ProfileData objects.
 */
export default function SectionDiff({ sectionKey, before, after, comment }) {
  const diff = diffSection(sectionKey, before, after);

  let body;
  if (diff.kind === 'fields') {
    const rows = diff.rows.filter((r) => r.changed);
    body = rows.length ? (
      <div className="overflow-x-auto -mx-1">
        <table className="w-full text-xs min-w-[320px]">
          <thead>
            <tr className="text-left text-gray-400 uppercase tracking-wide text-[10px]">
              <th scope="col" className="py-1.5 px-1 font-semibold w-1/4">Field</th>
              <th scope="col" className="py-1.5 px-1 font-semibold">Before</th>
              <th scope="col" className="py-1.5 px-1 font-semibold">After</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.field} className="border-t border-gray-100 align-top">
                <th scope="row" className="py-2 px-1 text-left font-semibold text-gray-700">{r.label}</th>
                <td className="py-2 px-1 text-red-700 bg-red-50/50">
                  <Value field={r.field} value={r.before} />
                </td>
                <td className="py-2 px-1 text-green-800 bg-green-50/50">
                  <Value field={r.field} value={r.after} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    ) : (
      <p className="text-xs text-gray-400 italic">No differences.</p>
    );
  } else {
    const nothing = !diff.added.length && !diff.removed.length && !diff.updated.length;
    body = nothing ? (
      <p className="text-xs text-gray-400 italic">No differences.</p>
    ) : (
      <ul className="space-y-2 text-xs">
        {diff.added.map((a, i) => (
          <li key={`a-${i}`} className="p-2.5 rounded-lg bg-green-50 border border-green-200">
            <p className="font-semibold text-green-800 flex items-center gap-1.5">
              <Plus className="w-3.5 h-3.5" aria-hidden="true" /> Added: {a.label}
            </p>
            <ItemSummary item={a.item} />
          </li>
        ))}
        {diff.updated.map((u, i) => (
          <li key={`u-${i}`} className="p-2.5 rounded-lg bg-blue-50 border border-blue-200">
            <p className="font-semibold text-blue-800 flex items-center gap-1.5">
              <RefreshCw className="w-3.5 h-3.5" aria-hidden="true" /> Updated: {u.label}
            </p>
            <ul className="mt-1 space-y-0.5">
              {u.changes.map((c) => (
                <li key={c.field} className="flex flex-wrap items-center gap-1 text-gray-700">
                  <span className="text-gray-500">{c.label}:</span>
                  <span className="line-through text-red-600"><Value field={c.field} value={c.before} /></span>
                  <ArrowRight className="w-3 h-3 text-gray-400" aria-hidden="true" />
                  <span className="text-green-700 font-medium"><Value field={c.field} value={c.after} /></span>
                </li>
              ))}
            </ul>
          </li>
        ))}
        {diff.removed.map((r, i) => (
          <li key={`r-${i}`} className="p-2.5 rounded-lg bg-red-50 border border-red-200">
            <p className="font-semibold text-red-800 flex items-center gap-1.5">
              <Minus className="w-3.5 h-3.5" aria-hidden="true" /> Removed: {r.label}
            </p>
          </li>
        ))}
        {diff.unchanged > 0 && <li className="text-gray-400">{diff.unchanged} unchanged {diff.unchanged === 1 ? 'entry' : 'entries'}</li>}
      </ul>
    );
  }

  return (
    <div className="border border-gray-200 rounded-xl p-3 sm:p-4">
      <h4 className="font-semibold text-sm text-gray-900 flex items-center gap-2 mb-2">
        {sectionLabel(sectionKey)} <ChangedBadge />
      </h4>
      <ReviewerComment comment={comment} />
      {body}
    </div>
  );
}
