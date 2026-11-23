import { FileText, ImageOff, Loader2 } from 'lucide-react';
import useProtectedFileUrl from '../hooks/useProtectedFileUrl';
import { isApiFileUrl, openProtectedFile } from '../services/api/fileService';
import { toastError } from '../utils/toast';

/**
 * Preview of a stored file (project media). Backend files need the Authorization header, so
 * the file is fetched as a Blob and shown through an object URL.
 */
export function ProtectedMediaPreview({ url, alt = '', className = '' }) {
  const { src, contentType, loading, error } = useProtectedFileUrl(url);
  const looksLikePdf = /pdf/i.test(contentType || '') || /\.pdf(\?|$)/i.test(String(url || ''));

  if (!url) return null;

  if (loading) {
    return (
      <div className={`w-full h-full flex items-center justify-center bg-gray-50 text-gray-400 ${className}`}>
        <Loader2 className="w-5 h-5 animate-spin" />
      </div>
    );
  }

  if (error || !src) {
    return (
      <div className={`w-full h-full flex items-center justify-center bg-gray-50 text-gray-400 text-xs gap-1.5 ${className}`}>
        <ImageOff className="w-5 h-5" /> Preview unavailable
      </div>
    );
  }

  if (looksLikePdf) {
    return (
      <div className={`w-full h-full flex items-center justify-center bg-gray-50 text-gray-500 text-xs gap-1.5 ${className}`}>
        <FileText className="w-5 h-5 text-red-500" /> PDF Attachment
      </div>
    );
  }

  return <img src={src} alt={alt} className={`w-full h-full object-cover ${className}`} />;
}

/**
 * Link to a stored file. Backend paths open through an authenticated blob fetch in a new tab;
 * any other URL is a plain external link.
 */
export function ProtectedFileLink({ url, className = '', children, title }) {
  if (!url) return null;

  if (!isApiFileUrl(url)) {
    return (
      <a href={url} target="_blank" rel="noopener noreferrer" className={className} title={title}>
        {children}
      </a>
    );
  }

  return (
    <button
      type="button"
      title={title}
      className={className}
      onClick={async () => {
        try {
          await openProtectedFile(url);
        } catch (err) {
          toastError(err, 'Could not open this file.');
        }
      }}
    >
      {children}
    </button>
  );
}
