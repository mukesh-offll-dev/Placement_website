import { useEffect, useState } from 'react';
import { fetchFileBlob, isApiFileUrl } from '../services/api/fileService';

/**
 * Resolve a backend file URL (e.g. project media) to an object URL usable in <img src> or
 * <a href>. The backend only accepts the JWT in the Authorization header, so the file is
 * fetched through axiosClient as a Blob; the object URL is revoked when the URL changes or
 * the component unmounts.
 *
 * URLs that are not backend paths (external links, blob:/data: previews) are returned as-is.
 *
 * @param {string|null|undefined} url
 * @returns {{ src: string|null, contentType: string|null, loading: boolean, error: string }}
 */
export default function useProtectedFileUrl(url) {
  const needsFetch = isApiFileUrl(url);
  const [state, setState] = useState({ key: null, src: null, contentType: null, error: '' });

  useEffect(() => {
    if (!needsFetch) return undefined;

    const controller = new AbortController();
    let objectUrl = null;

    fetchFileBlob(url, { signal: controller.signal })
      .then(({ blob, contentType }) => {
        objectUrl = URL.createObjectURL(blob);
        setState({ key: url, src: objectUrl, contentType, error: '' });
      })
      .catch((err) => {
        if (err?.code === 'ERR_CANCELED') return;
        setState({ key: url, src: null, contentType: null, error: err?.message || 'Could not load file.' });
      });

    return () => {
      controller.abort();
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [url, needsFetch]);

  if (!url) return { src: null, contentType: null, loading: false, error: '' };
  if (!needsFetch) return { src: url, contentType: null, loading: false, error: '' };

  const current = state.key === url;
  return {
    src: current ? state.src : null,
    contentType: current ? state.contentType : null,
    loading: !current,
    error: current ? state.error : '',
  };
}
