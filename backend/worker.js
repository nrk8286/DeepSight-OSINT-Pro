// Minimal Cloudflare Worker for DeepSight API
// - Binds D1 as `DB` via wrangler.toml (auto-injected by deploy scripts)
// - Optionally binds R2 bucket as `R2` for object storage
// - Provides health check, images listing, uploads, and static reads

/**
 * @typedef {Object} Env
 * @property {D1Database} DB
 * @property {R2Bucket} [R2]
 */

const cors = {
  'access-control-allow-origin': '*',
  'access-control-allow-methods': 'GET,POST,PUT,DELETE,OPTIONS',
  'access-control-allow-headers': 'content-type, authorization',
};

const json = (data, init = {}) =>
  new Response(JSON.stringify(data), {
    ...init,
    headers: { 'content-type': 'application/json; charset=utf-8', ...cors, ...(init.headers || {}) },
  });

const text = (body, init = {}) => new Response(body, { ...init, headers: { ...cors, ...(init.headers || {}) } });

const notFound = () => json({ error: 'not_found' }, { status: 404 });
const badRequest = (msg) => json({ error: 'bad_request', message: msg }, { status: 400 });

async function handleOptions(request) {
  if (request.headers.get('origin') !== null && request.headers.get('access-control-request-method') !== null) {
    return new Response(null, { headers: cors });
  }
  return new Response(null, { headers: cors });
}

function safeKey(input) {
  let k = String(input || '').trim();
  while (k.startsWith('/')) k = k.slice(1);
  if (k.includes('..')) return null;
  if (!/^[a-zA-Z0-9_\-\/\.]+$/.test(k)) return null;
  return k;
}

function authFailed() {
  return json({ error: 'unauthorized' }, { status: 401, headers: { 'www-authenticate': 'Bearer' } });
}

// Require admin for non-GET when ADMIN_TOKEN is configured; allow if unset (dev)
function requireAdmin(request, env) {
  const token = env.ADMIN_TOKEN;
  if (!token) return true;
  const hdr = request.headers.get('authorization') || '';
  const m = /^Bearer\s+(.+)$/.exec(hdr);
  if (!m) return false;
  return m[1] === token;
}

/** @param {Request} request @param {Env} env */
async function router(request, env) {
  const url = new URL(request.url);
  const { pathname, searchParams } = url;

  if (request.method === 'OPTIONS') return handleOptions(request);

  if (pathname === '/api/health') {
    return json({ ok: true, ts: Date.now() });
  }

  if (pathname === '/api/images/list') {
    const limit = Math.min(parseInt(searchParams.get('limit') || '24', 10) || 24, 200);
    const page = Math.max(parseInt(searchParams.get('page') || '0', 10) || 0, 0);
    const offset = page * limit;
    try {
      const countRes = await env.DB.prepare('SELECT COUNT(*) as c FROM images').all();
      const total = countRes?.results?.[0]?.c || 0;
      const stmt = env.DB.prepare(
        'SELECT id, url, created_at, json_extract(metadata, "$.r2_key") AS r2_key, json_extract(metadata, "$.text") AS text FROM images ORDER BY datetime(created_at) DESC LIMIT ? OFFSET ?'
      );
      const result = await stmt.bind(limit, offset).all();
      const rows = Array.isArray(result?.results) ? result.results : [];
      const next = offset + limit < total ? page + 1 : null;
      return json({ items: rows, next_page: next, total });
    } catch (err) {
      return json({ items: [], next_page: null, total: 0, note: 'images table missing or query failed' });
    }
  }

  if (pathname === '/api/images') {
    if (request.method !== 'POST') return badRequest('method_not_allowed');
    if (!requireAdmin(request, env)) return authFailed();
    try {
      const body = await request.json();
      const id = body?.id || crypto.randomUUID();
      const urlStr = body?.url || '';
      const title = body?.text || body?.title || null;
      const metadata = JSON.stringify({
        r2_key: body?.r2_key,
        bytes: body?.bytes,
        text: body?.text,
      });
      await env.DB.prepare('INSERT OR REPLACE INTO images (id, url, created_at, title, metadata) VALUES (?, ?, CURRENT_TIMESTAMP, ?, ?)')
        .bind(id, urlStr, title, metadata)
        .run();
      return json({ ok: true, id });
    } catch (e) {
      return json({ ok: false, error: 'insert_failed' }, { status: 500 });
    }
  }

  if (pathname === '/api/search') {
    const kind = (searchParams.get('kind') || 'text').toLowerCase();
    if (kind === 'text') {
      const q = (searchParams.get('q') || '').trim();
      const k = Math.min(parseInt(searchParams.get('k') || '24', 10) || 24, 200);
      if (!q) return json({ matches: [] });
      try {
        const stmt = env.DB.prepare(
          'SELECT id, url, created_at, json_extract(metadata, "$.r2_key") AS r2_key, json_extract(metadata, "$.text") AS text FROM images WHERE url LIKE ? OR json_extract(metadata, "$.text") LIKE ? ORDER BY datetime(created_at) DESC LIMIT ?'
        );
        const like = `%${q}%`;
        const res = await stmt.bind(like, like, k).all();
        const rows = res?.results || [];
        // Shape similar to frontend expectations (array of matches)
        return json({ matches: rows });
      } catch (e) {
        return json({ matches: [] });
      }
    }
    if (kind === 'phash') {
      // Not implemented; return empty for preview
      return json({ matches: [] });
    }
    return json({ matches: [] });
  }

  if (pathname === '/api/stats') {
    try {
      const r = await env.DB.prepare('SELECT COUNT(*) as images FROM images').all();
      const images = r?.results?.[0]?.images || 0;
      return json({ images });
    } catch {
      return json({ images: 0 });
    }
  }

  if (pathname === '/api/crawl') {
    if (request.method !== 'POST') return badRequest('method_not_allowed');
    if (!requireAdmin(request, env)) return authFailed();
    // Preview stub: accept payload and respond queued=true
    return json({ queued: true });
  }

  if (pathname === '/api/images/upload-url') {
    if (request.method !== 'POST') return badRequest('method_not_allowed');
    if (!requireAdmin(request, env)) return authFailed();
    try {
      const { key } = await request.json();
      const k = safeKey(key);
      if (!k) return badRequest('invalid key');
      const origin = url.origin;
      // Direct Worker-managed endpoints (no presign):
      const put = `${origin}/api/r2/object/${encodeURIComponent(k)}`;
      const get = `${origin}/r2/${encodeURIComponent(k)}`;
      return json({ put, get });
    } catch (e) {
      return badRequest('invalid_json');
    }
  }

  if (pathname.startsWith('/api/r2/object/')) {
    if (request.method === 'OPTIONS') return handleOptions(request);
    if (!env.R2) return json({ error: 'r2_not_configured' }, { status: 501 });
    if (!requireAdmin(request, env)) return authFailed();
    const key = decodeURIComponent(pathname.replace('/api/r2/object/', ''));
    const k = safeKey(key);
    if (!k) return badRequest('invalid key');
    if (request.method === 'PUT') {
      const ct = request.headers.get('content-type') || undefined;
      await env.R2.put(k, request.body, { httpMetadata: { contentType: ct } });
      return json({ ok: true, key: k });
    }
    if (request.method === 'DELETE') {
      await env.R2.delete(k);
      return json({ ok: true, key: k });
    }
    return badRequest('method_not_allowed');
  }

  if (pathname.startsWith('/r2/')) {
    if (!env.R2) return json({ error: 'r2_not_configured' }, { status: 501 });
    const key = decodeURIComponent(pathname.replace('/r2/', ''));
    const k = safeKey(key);
    if (!k) return badRequest('invalid key');
    const obj = await env.R2.get(k);
    if (!obj) return notFound();
    const headers = { ...cors };
    const ct = obj.httpMetadata?.contentType || 'application/octet-stream';
    headers['content-type'] = ct;
    headers['cache-control'] = 'public, max-age=3600';
    return new Response(obj.body, { headers });
  }

  if (pathname.startsWith('/api/images/')) {
    if (request.method !== 'DELETE') return badRequest('method_not_allowed');
    if (!requireAdmin(request, env)) return authFailed();
    const id = decodeURIComponent(pathname.replace('/api/images/', ''));
    if (!id) return badRequest('id required');
    try {
      const rowRes = await env.DB.prepare(
        'SELECT id, json_extract(metadata, "$.r2_key") as r2_key FROM images WHERE id = ?'
      ).bind(id).all();
      const row = rowRes?.results?.[0];
      if (row?.r2_key && env.R2) {
        const rk = safeKey(row.r2_key);
        if (rk) await env.R2.delete(rk);
      }
      await env.DB.prepare('DELETE FROM images WHERE id = ?').bind(id).run();
      return json({ ok: true, id });
    } catch (e) {
      return json({ ok: false, error: 'delete_failed' }, { status: 500 });
    }
  }

  return notFound();
}

export default {
  /** @param {Request} request @param {Env} env */
  fetch: (request, env) => router(request, env),
};
