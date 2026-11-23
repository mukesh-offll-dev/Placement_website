import { useState } from 'react';
import { Archive, Loader2 } from 'lucide-react';
import { Field, FormError, Modal } from './Modal';
import { inputClass } from './formStyles';
import { archiveBatch, previewArchiveBatch } from '../../services/api/adminService';
import { summarizeBulkResult } from '../../utils/studentQuery';
import { toastSuccess, toastWarning } from '../../utils/toast';

const THIS_YEAR = new Date().getFullYear();

/**
 * Admin-only: archive every active/disabled student of a graduating batch (optionally one
 * department). Step 1 previews the count, step 2 confirms.
 */
export default function ArchiveBatchDialog({ departments = [], onClose, onDone }) {
  const [form, setForm] = useState({ batch: String(THIS_YEAR), departmentCode: '', reason: '' });
  const [preview, setPreview] = useState(null); // {count, batch, departmentCode}
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const set = (field) => (e) => {
    setForm((f) => ({ ...f, [field]: e.target.value }));
    if (field !== 'reason') setPreview(null);
    setError('');
  };

  const validBatch = /^\d{4}(-\d{4})?$/.test(form.batch.trim());

  const runPreview = async (e) => {
    e?.preventDefault();
    if (!validBatch) {
      setError('Enter the graduation year, e.g. 2026.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      const data = await previewArchiveBatch({ batch: form.batch, departmentCode: form.departmentCode });
      setPreview({ count: Number(data?.count) || 0, batch: data?.batch ?? form.batch, departmentCode: data?.departmentCode ?? form.departmentCode });
    } catch (err) {
      setError(err.message || 'Could not count the students in that batch.');
    } finally {
      setBusy(false);
    }
  };

  const confirm = async () => {
    setBusy(true);
    setError('');
    try {
      const result = await archiveBatch(form);
      const summary = summarizeBulkResult('ARCHIVE', result);
      if (Array.isArray(result?.failed) && result.failed.length > 0) toastWarning(summary);
      else toastSuccess(`Batch ${form.batch}: ${summary}.`);
      onDone?.();
      onClose();
    } catch (err) {
      setError(err.message || 'Could not archive the batch.');
      setBusy(false);
    }
  };

  return (
    <Modal title="Archive a batch" subtitle="Graduated students keep read-only access; their history is kept." onClose={onClose} locked={busy}>
      <form onSubmit={runPreview} noValidate className="space-y-4">
        <FormError message={error} />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label="Batch (graduation year)" htmlFor="ab-batch" hint="e.g. 2026 matches 2022-2026">
            <input id="ab-batch" value={form.batch} onChange={set('batch')} inputMode="numeric" maxLength={9} disabled={busy} className={inputClass(!validBatch && form.batch)} />
          </Field>
          <Field label="Department" htmlFor="ab-dept">
            <select id="ab-dept" value={form.departmentCode} onChange={set('departmentCode')} disabled={busy} className={inputClass(false)}>
              <option value="">All departments</option>
              {departments.map((d) => <option key={d.id} value={d.code}>{d.code} · {d.name}</option>)}
            </select>
          </Field>
        </div>
        <Field label="Reason (optional)" htmlFor="ab-reason">
          <input id="ab-reason" value={form.reason} onChange={set('reason')} maxLength={255} placeholder="e.g. Graduated" disabled={busy} className={inputClass(false)} />
        </Field>

        {preview && (
          <div className={`rounded-lg px-3 py-2.5 text-sm ${preview.count > 0 ? 'bg-amber-50 border border-amber-200 text-amber-900' : 'bg-gray-50 text-gray-600'}`} role="status">
            {preview.count > 0
              ? <><strong>{preview.count}</strong> active or disabled student{preview.count === 1 ? '' : 's'} in batch {preview.batch}{preview.departmentCode ? ` (${preview.departmentCode})` : ''} will be archived.</>
              : 'No active or disabled students match. Nothing to archive.'}
          </div>
        )}

        <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-1">
          <button type="button" onClick={onClose} disabled={busy} className="px-4 py-2 rounded-lg text-sm border border-gray-300 hover:bg-gray-50 disabled:opacity-50">Cancel</button>
          {!preview ? (
            <button type="submit" disabled={busy} className="flex items-center justify-center gap-1.5 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700 font-medium disabled:opacity-60">
              {busy && <Loader2 className="w-4 h-4 animate-spin" />} Preview count
            </button>
          ) : (
            <button type="button" onClick={confirm} disabled={busy || preview.count === 0} className="flex items-center justify-center gap-1.5 bg-amber-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-amber-700 font-medium disabled:opacity-50">
              {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Archive className="w-4 h-4" />}
              Archive {preview.count} student{preview.count === 1 ? '' : 's'}
            </button>
          )}
        </div>
      </form>
    </Modal>
  );
}
