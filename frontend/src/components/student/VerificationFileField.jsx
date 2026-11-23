import { useRef, useState } from 'react';
import { Eye, FileText, Loader2, Trash2, Upload } from 'lucide-react';
import { uploadVerificationFile } from '../../services/api/studentDraftService';
import { validateFile, formatFileSize } from '../../services/api/fileService';
import { ProtectedFileLink } from '../ProtectedMedia';
import { toastError, toastSuccess } from '../../utils/toast';

const MAX_BYTES = 10 * 1024 * 1024;
const DEFAULT_EXTENSIONS = ['pdf', 'png', 'jpg', 'jpeg', 'webp'];

/**
 * Picks a file, uploads it through POST /student/verification/files and reports
 * {fileUrl, fileName, contentType, size} to `onUploaded`. The stored file is viewed through
 * an authenticated blob fetch (ProtectedFileLink); no token ever goes in a URL.
 */
export default function VerificationFileField({
  label,
  section,
  fileUrl,
  fileName,
  fileSize,
  onUploaded,
  onRemove,
  extensions = DEFAULT_EXTENSIONS,
  disabled = false,
  required = false,
  error,
  compact = false,
}) {
  const inputRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const accept = extensions.map((e) => `.${e}`).join(',');

  const handleChange = async (e) => {
    const file = e.target.files?.[0];
    if (inputRef.current) inputRef.current.value = '';
    if (!file) return;
    const check = validateFile(file, extensions, MAX_BYTES);
    if (!check.valid) {
      toastError(check.error);
      return;
    }
    setUploading(true);
    try {
      const result = await uploadVerificationFile(file, section);
      onUploaded({
        fileUrl: result.fileUrl,
        fileName: result.fileName || file.name,
        contentType: result.contentType || file.type || null,
        size: result.size ?? file.size,
      });
      toastSuccess(`"${file.name}" uploaded.`);
    } catch (err) {
      toastError(err, 'The file could not be uploaded. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div>
      {label && (
        <span className="block text-xs font-semibold text-gray-700 mb-1">
          {label} {required && <span className="text-red-500">*</span>}
        </span>
      )}
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        onChange={handleChange}
        className="hidden"
        aria-label={label || 'Choose file'}
        disabled={disabled || uploading}
      />
      {fileUrl ? (
        <div className={`border border-gray-200 rounded-xl ${compact ? 'p-2.5' : 'p-3'} bg-gray-50/70 flex flex-wrap items-center justify-between gap-2`}>
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="bg-blue-100 p-2 rounded-lg text-blue-600 shrink-0">
              <FileText className="w-4 h-4" aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-gray-800 truncate max-w-[180px] sm:max-w-[260px]" title={fileName || undefined}>
                {fileName || 'Attached file'}
              </p>
              {fileSize ? <p className="text-[11px] text-gray-400">{formatFileSize(fileSize)}</p> : null}
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <ProtectedFileLink
              url={fileUrl}
              title="View file"
              className="inline-flex items-center gap-1 text-xs font-semibold text-gray-700 bg-white hover:bg-gray-50 border border-gray-200 px-2.5 py-1.5 rounded-lg transition"
            >
              <Eye className="w-3.5 h-3.5" /> View
            </ProtectedFileLink>
            {!disabled && (
              <button
                type="button"
                onClick={() => inputRef.current?.click()}
                disabled={uploading}
                className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 border border-blue-200 px-2.5 py-1.5 rounded-lg transition disabled:opacity-50"
              >
                {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />} Replace
              </button>
            )}
            {!disabled && onRemove && (
              <button
                type="button"
                onClick={onRemove}
                disabled={uploading}
                className="inline-flex items-center text-xs font-semibold text-red-600 hover:bg-red-50 border border-red-200 px-2 py-1.5 rounded-lg transition"
                aria-label="Remove file"
                title="Remove file"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={disabled || uploading}
          className={`w-full border-2 border-dashed rounded-xl ${compact ? 'p-3' : 'p-5'} text-center transition flex flex-col items-center gap-1 disabled:opacity-60 disabled:cursor-not-allowed ${
            error ? 'border-red-300 bg-red-50/40' : 'border-gray-300 hover:border-blue-400 hover:bg-blue-50/30'
          }`}
        >
          {uploading ? (
            <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />
          ) : (
            <Upload className="w-5 h-5 text-gray-400" aria-hidden="true" />
          )}
          <span className="text-sm font-semibold text-gray-700">{uploading ? 'Uploading…' : 'Choose a file to upload'}</span>
          <span className="text-[11px] text-gray-400">
            {extensions.map((e) => e.toUpperCase()).join(', ')} up to 10 MB
          </span>
        </button>
      )}
      {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
    </div>
  );
}
