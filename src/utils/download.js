/**
 * Saves a Blob as a file in the browser.
 *
 * Uses an object URL rather than a data: URI: data URIs pass through encodeURI,
 * which cuts the file at the first "#" and mangles non-ASCII text, and browsers
 * cap their length.
 */
export function downloadBlob(blob, filename) {
  if (!(blob instanceof Blob)) {
    throw new Error('Nothing to download: the server did not return a file.');
  }
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  // Revoke after the click has been dispatched so the download can start.
  setTimeout(() => URL.revokeObjectURL(url), 0);
}
