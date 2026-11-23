import { useState } from 'react';
import { AlertTriangle, Check, Copy, KeyRound } from 'lucide-react';
import { Modal } from './students/Modal';
import { toastError } from '../utils/toast';

/**
 * Shows a temporary password returned once by the backend (faculty account create/reset).
 * It is never stored: closing the dialog discards it.
 *
 * @param {{ open: boolean, password: string, account?: { fullName?: string, email?: string }, title?: string, onClose: () => void }} props
 */
export default function OneTimePasswordModal({ open, password, account, title = 'Temporary password', onClose }) {
  const [copied, setCopied] = useState(false);
  if (!open || !password) return null;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(password);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      toastError(err, 'Could not copy. Select the password and copy it manually.');
    }
  };

  const close = () => {
    setCopied(false);
    onClose();
  };

  return (
    <Modal title={title} subtitle={account?.fullName ? `For ${account.fullName}` : undefined} onClose={close}>
      <div className="space-y-4">
        <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 text-amber-900 text-sm px-3 py-2.5 rounded-lg" role="alert">
          <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0 text-amber-600" />
          <p>
            <strong>Shown only once.</strong> Copy it now and share it with the faculty member securely. It cannot be
            displayed again; if it is lost, reset the password.
          </p>
        </div>
        {account?.email && (
          <div>
            <p className="text-xs font-semibold text-gray-700 mb-1">Sign-in email</p>
            <p className="font-mono text-sm text-gray-800 break-all bg-gray-50 border border-gray-200 rounded-lg px-3 py-2">{account.email}</p>
          </div>
        )}
        <div>
          <p className="text-xs font-semibold text-gray-700 mb-1 flex items-center gap-1.5"><KeyRound className="w-3.5 h-3.5" /> Temporary password</p>
          <div className="flex items-stretch gap-2">
            <code className="flex-1 font-mono text-base tracking-wider text-gray-900 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 break-all select-all">
              {password}
            </code>
            <button
              type="button"
              onClick={copy}
              className="inline-flex items-center gap-1.5 px-3 rounded-lg border border-blue-200 bg-blue-50 text-blue-700 text-sm font-semibold hover:bg-blue-100"
            >
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              {copied ? 'Copied' : 'Copy'}
            </button>
          </div>
          <p className="text-xs text-gray-500 mt-1.5">They will be asked to choose a new password the first time they sign in at /faculty/login.</p>
        </div>
        <div className="flex justify-end pt-1">
          <button type="button" onClick={close} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700 font-medium">
            I have saved it
          </button>
        </div>
      </div>
    </Modal>
  );
}
