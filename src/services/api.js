
const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api';

export async function apiRequest(
  endpoint,
  { method = 'GET', body, headers = {}, ...options } = {}
) {
  const token = localStorage.getItem('accessToken');
  const baseUrl = API_BASE_URL.replace(/\/$/, '');
  const path = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  const apiOrigin = new URL(baseUrl, window.location.origin);
  const requestUrl = new URL(`${baseUrl}${path}`, window.location.origin);

  if (!['http:', 'https:'].includes(apiOrigin.protocol) || apiOrigin.username || apiOrigin.password) {
    throw new Error('The configured API URL is invalid');
  }
  if (requestUrl.origin !== apiOrigin.origin) {
    throw new Error('API requests must use the configured API origin');
  }

  const requestHeaders = {
    Accept: 'application/json',
    ...headers,
  };

  if (body !== undefined) {
    requestHeaders['Content-Type'] ??= 'application/json';
  }

  if (token && requestUrl.origin === apiOrigin.origin) {
    requestHeaders.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(requestUrl.href, {
    ...options,
    method,
    headers: requestHeaders,
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });

  const contentType = response.headers.get('content-type') || '';
  const isJson = /application\/(?:[^;]+\+)?json/i.test(contentType);
  let data = null;
  const responseText = await response.text();
  if (responseText) {
    if (isJson) {
      try {
        data = JSON.parse(responseText);
      } catch {
        data = null;
      }
    } else {
      data = responseText;
    }
  }

  if (!response.ok) {
    if (response.status === 401) {
      localStorage.removeItem('accessToken');
      window.dispatchEvent(new Event('auth:unauthorized'));
    }
    throw new Error(
      typeof data === 'object' && data !== null && data.message
        ? data.message
        : `API request failed (${response.status})`
    );
  }

  return data;
}