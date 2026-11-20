export const API_ORIGIN = (process.env.REACT_APP_API_ORIGIN || '').trim().replace(/\/+$/, '');
export const apiUrl = (path) => `${API_ORIGIN}${path}`;
export function getAdminToken() {
  try {
    return localStorage.getItem('admin.token') || '';
  } catch {
    return '';
  }
}

async function j(method, path, body) {
  const headers = {};
  if (body) headers['content-type'] = 'application/json';
  const token = getAdminToken();
  if (token) headers['authorization'] = `Bearer ${token}`;
  const r = await fetch(apiUrl(path), {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!r.ok) {
    let msg = `HTTP ${r.status}`;
    try {
      const t = await r.text();
      if (t) msg += `: ${t}`;
    } catch {}
    throw new Error(msg);
  }
  const ct = r.headers.get('content-type') || '';
  if (!ct.includes('application/json')) {
    throw new Error('The API returned an unexpected response. Please try again later.');
  }
  return r.json();
}

export const health = () => j('GET', '/api/health');

export const getSignedUpload = (key) => j('POST', '/api/images/upload-url', { key });

export async function uploadToR2(putUrl, file) {
  const token = getAdminToken();
  const headers = token ? { authorization: `Bearer ${token}` } : undefined;
  const r = await fetch(putUrl, { method: 'PUT', body: file, headers });
  if (!r.ok) throw new Error('upload failed');
  return true;
}

export const saveImageMeta = (meta) => j('POST', '/api/images', meta);

export async function searchText(q, k = 24) {
  const qs = `?kind=text&q=${encodeURIComponent(q)}&k=${encodeURIComponent(String(k))}`;
  return j('GET', `/api/search${qs}`);
}

export async function searchPHash(phash) {
  const qs = `?kind=phash&phash=${encodeURIComponent(phash)}`;
  return j('GET', `/api/search${qs}`);
}

export async function listImages(page = 0, limit = 24) {
  const qs = `?page=${encodeURIComponent(String(page))}&limit=${encodeURIComponent(String(limit))}`;
  return j('GET', `/api/images/list${qs}`);
}

export const enqueueCrawl = (job) => j('POST', '/api/crawl', job);

export const stats = () => j('GET', '/api/stats');
export const deleteImage = (id) => j('DELETE', `/api/images/${encodeURIComponent(id)}`);
export const getFlags = () => j('GET', '/api/flags');
export const track = (event, props) => j('POST', '/api/track', { event, props });
