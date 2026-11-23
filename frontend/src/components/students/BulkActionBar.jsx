import { useState } from 'react';
import { Archive, Ban, Loader2, Power, RotateCcw, Trash2, X } from 'lucide-react';
import { Field, Modal } from './Modal';
import { inputClass } from './formStyles';
import { isBulkDeleteConfirmed } from '../../utils/studentQuery';

const BULK_ACTION_META = {
  DISABLE: { label: 'Disable', icon: Ban, cls: 'border-gray-300 text-gray-700 hover:bg-gray-50', confirm: 'bg-gray-700 hover:bg-gray-800' },
  ENABLE: { label: 'Enable', icon: Power, cls: 'border-green-200 text-green-700 hover:bg-green-50', confirm: 'bg-green-600 hover:bg-green-700' },
  ARCHIVE: { label: 'Archive', icon: Archive, cls: 'border-amber-200 text-amber-700 hover:bg-amber-50', confirm: 'bg-amber-600 hover:bg-amber-700' },
  RESTORE: { label: 'Restore', icon: RotateCcw, cls: 'border-blue-200 text-blue-700 hover:bg-blue-50', confirm: 'bg-blue-600 hover:bg-blue-700' },
  DELETE: { label: 'Delete', icon: Trash2, cls: 'border-red-200 text-red-700 hover:bg-red-50', confirm: 'bg-red-600 hover:bg-red-700' },
};

const DESCRIPTIONS = {
  DISABLE: 'They will be signed out and cannot sign in until enabled again. Their data is kept.',
  ENABLE: 'They will be able to sign in again. Archived students are skipped (restore them instead).',
  ARCHIVE: 'They keep read-only access but cannot apply for jobs or edit their profile, and are hidden from the default lists and job alerts. History is kept.',
  RESTORE: 'Archived students become active again.',
  DELETE: 'They are removed from the portal and cannot sign in. Applications are kept for the records. This cannot be undone from here.',
};

/**
 * Sticky bar shown while students are selected: the count, "select all N matching", and the
 * actions allowed for the current tab.
 */
export function BulkActionBar({ count, pageCount, matchingTotal, allMatchingSelected, selectingAll, onSelectAllMatching, onClear, actions, onAction, busy }) {
  if (count === 0) return null;
  const canSelectMore = !allMatchingSelected && matchingTotal > count;
  return (
    <div className="sticky top-16 z-10 bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 mb-3 flex flex-col lg:flex-row lg:items-center gap-3" role="region" aria-label="Bulk actions">
      <div className="flex-1 text-sm text-blue-900 flex flex-wrap items-center gap-x-3 gap-y-1">
        <span className="font-semibold">{count} selected</span>
        {canSelectMore && count >= pageCount && (
          <button type="button" onClick={onSelectAllMatching} disabled={selectingAll} className="text-blue-700 underline font-medium disabled:opacity-50 inline-flex items-center gap-1">
            {selectingAll && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            Select all {matchingTotal} matching
          </button>
        )}
        {allMatchingSelected && <span className="text-xs text-blue-800">All matching students are selected.</span>}
        <button type="button" onClick={onClear} className="inline-flex items-center gap-1 text-xs text-gray-600 hover:text-gray-900">
          <X className="w-3.5 h-3.5" /> Clear
        </button>
      </div>
      <div className="flex flex-wrap gap-2">
        {actions.map((a) => {
          const meta = BULK_ACTION_META[a];
          const Icon = meta.icon;
          return (
            <button
              key={a}
              type="button"
              disabled={busy}
              onClick={() => onAction(a)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border bg-white text-xs font-semibold disabled:opacity-50 ${meta.cls}`}
            >
              <Icon className="w-3.5 h-3.5" /> {meta.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/** Confirmation for a bulk action, stating the count; DELETE requires typing the count or DELETE. */
export function BulkConfirmDialog({ action, count, busy, onConfirm, onCancel }) {
  const [typed, setTyped] = useState('');
  const [reason, setReason] = useState('');
  if (!action) return null;
  const meta = BULK_ACTION_META[action];
  const isDelete = action === 'DELETE';
  const blocked = busy || (isDelete && !isBulkDeleteConfirmed(typed, count));
  const noun = `${count} student${count === 1 ? '' : 's'}`;

  return (
    <Modal title={`${meta.label} ${noun}?`} onClose={onCancel} locked={busy}>
      <p className="text-sm text-gray-600 mb-4">{DESCRIPTIONS[action]}</p>
      {(action === 'ARCHIVE' || action === 'DISABLE' || isDelete) && (
        <div className="mb-4">
          <Field label="Reason (optional, kept in the audit log)" htmlFor="bulk-reason">
            <input id="bulk-reason" value={reason} maxLength={255} onChange={(e) => setReason(e.target.value)} className={inputClass(false)} disabled={busy} />
          </Field>
        </div>
      )}
      {isDelete && (
        <Field label={`Type ${count} or DELETE to confirm`} htmlFor="bulk-typed">
          <input id="bulk-typed" value={typed} onChange={(e) => setTyped(e.target.value)} autoComplete="off" className={inputClass(false)} disabled={busy} />
        </Field>
      )}
      <div className="flex justify-end gap-2 mt-5">
        <button type="button" onClick={onCancel} disabled={busy} className="px-4 py-2 rounded-lg text-sm border border-gray-300 hover:bg-gray-50 disabled:opacity-50">
          Cancel
        </button>
        <button
          type="button"
          onClick={() => onConfirm(reason)}
          disabled={blocked}
          className={`flex items-center gap-1.5 text-white px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50 ${meta.confirm}`}
        >
          {busy && <Loader2 className="w-4 h-4 animate-spin" />}
          {meta.label} {noun}
        </button>
      </div>
    </Modal>
  );
}
