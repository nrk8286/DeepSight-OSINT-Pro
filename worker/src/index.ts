
export interface Env {
  DB: D1Database;
  IMAGES: R2Bucket;
  VEC_TEXT: VectorizeIndex;
  VEC_IMAGE: VectorizeIndex;
  CRAWL_QUEUE: Queue;
  AI: Ai;
  CORS_ORIGINS: string;
}

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { "content-type": "application/json" } });

function withCORS(req: Request, res: Response, originsCsv: string) {
  const h = new Headers(res.headers);
  const origin = req.headers.get("origin") || "";
  const allow = originsCsv.split(",").map(s => s.trim());
  if (allow.some(p => p === origin || (p.includes("*") && origin.endsWith(p.replace("*.", ""))))) {
    h.set("access-control-allow-origin", origin);
    h.set("vary", "origin");
  }
  h.set("access-control-allow-headers", "content-type, authorization");
  h.set("access-control-allow-methods", "GET,POST,PUT,DELETE,OPTIONS");
  return new Response(res.body, { status: res.status, headers: h });
}

async function embedText(env: Env, text: string): Promise<number[]> {
  const out: any = await env.AI.run("@cf/baai/bge-base-en-v1.5", { text });
  const vec = out?.data?.[0] ?? (Array.isArray(out) ? out[0] : out);
  return vec as number[];
}

export default {
  async fetch(req: Request, env: Env) {
    if (req.method === "OPTIONS") return withCORS(req, new Response(null, { status: 204 }), env.CORS_ORIGINS);
    const { pathname, searchParams } = new URL(req.url);

    if (pathname === "/api/health") return withCORS(req, json({ ok: true }), env.CORS_ORIGINS);

    if (pathname === "/api/stats") {
      const { results } = await env.DB.prepare("SELECT COUNT(*) AS images FROM images").all();
      return withCORS(req, json(results?.[0] || { images: 0 }), env.CORS_ORIGINS);
    }

    if (pathname === "/api/images/list" && req.method === "GET") {
      const page = Math.max(Number(searchParams.get("page") || "0"), 0);
      const limit = Math.min(Math.max(Number(searchParams.get("limit") || "24"), 1), 100);
      const offset = page * limit;
      const { results } = await env.DB.prepare(
        "SELECT * FROM images ORDER BY created_at DESC LIMIT ?1 OFFSET ?2"
      ).bind(limit, offset).all();
      const next_page = (results?.length === limit) ? page + 1 : null;
      return withCORS(req, json({ items: results || [], next_page }), env.CORS_ORIGINS);
    }

    if (pathname === "/api/images/upload-url" && req.method === "POST") {
      const { key } = await req.json<any>();
      if (!key) return withCORS(req, json({ error: "key required" }, 400), env.CORS_ORIGINS);
      const put = new URL(req.url);
      put.pathname = `/r2/${encodeURIComponent(key)}`;
      put.searchParams.set("put", "1");
      const get = new URL(put);
      get.searchParams.delete("put");
      return withCORS(req, json({ put: put.toString(), get: get.toString() }), env.CORS_ORIGINS);
    }

    if (pathname.startsWith("/r2/")) {
      const key = decodeURIComponent(pathname.slice(4));
      if (req.method === "PUT") {
        await env.IMAGES.put(key, req.body);
        return withCORS(req, new Response("ok"), env.CORS_ORIGINS);
      }
      if (req.method === "GET") {
        const obj = await env.IMAGES.get(key);
        if (!obj) return withCORS(req, new Response("not found", { status: 404 }), env.CORS_ORIGINS);
        const headers = new Headers();
        obj.writeHttpMetadata(headers);
        headers.set("etag", obj.httpEtag);
        return withCORS(req, new Response(obj.body, { headers }), env.CORS_ORIGINS);
      }
    }

    if (pathname === "/api/images" && req.method === "POST") {
      const body: any = await req.json();
      const { id, url, r2_key, phash, ahash, dhash, width, height, bytes, text, image_vec } = body;

      await env.DB.prepare(
        `INSERT OR REPLACE INTO images (id, url, r2_key, phash, ahash, dhash, width, height, bytes)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)`
      ).bind(id, url, r2_key, phash, ahash, dhash, width, height, bytes).run();

      if (typeof text === "string" && text.trim()) {
        const vec = await embedText(env, text.trim());
        await env.VEC_TEXT.upsert([{ id: `t:${id}`, values: vec, metadata: { id, url, r2_key, text } }]);
        await env.DB.prepare(`INSERT OR REPLACE INTO vectors_text (id, dims) VALUES (?1, ?2)`)
          .bind(`t:${id}`, vec.length).run();
      }

      if (Array.isArray(image_vec) && image_vec.length === 512) {
        await env.VEC_IMAGE.upsert([{ id: `i:${id}`, values: image_vec, metadata: { id, url, r2_key } }]);
        await env.DB.prepare(`INSERT OR REPLACE INTO vectors_image (id, dims) VALUES (?1, 512)`)
          .bind(`i:${id}`).run();
      }

      return withCORS(req, json({ ok: true }), env.CORS_ORIGINS);
    }

    if (pathname === "/api/search" && req.method === "GET") {
      const q = searchParams.get("q")?.trim();
      const ph = searchParams.get("phash")?.trim();
      const kind = searchParams.get("kind") || "text";
      const k = Number(searchParams.get("k") ?? 24);

      if (kind === "phash" && ph) {
        const { results } = await env.DB.prepare(
          `SELECT * FROM images WHERE phash = ?1 ORDER BY created_at DESC LIMIT 100`
        ).bind(ph).all();
        return withCORS(req, json({ mode: "phash", results }), env.CORS_ORIGINS);
      }

      if (kind === "text" && q) {
        const vec = await embedText(env, q);
        const matches = await env.VEC_TEXT.query(vec, { topK: k, returnMetadata: "all" });
        return withCORS(req, json({ mode: "text", matches }), env.CORS_ORIGINS);
      }

      if (kind === "image" && searchParams.get("vector")) {
        const vec = JSON.parse(searchParams.get("vector")!);
        const matches = await env.VEC_IMAGE.query(vec, { topK: k, returnMetadata: "all" });
        return withCORS(req, json({ mode: "image", matches }), env.CORS_ORIGINS);
      }

      return withCORS(req, json({ error: "bad query" }, 400), env.CORS_ORIGINS);
    }

    if (pathname === "/api/crawl" && req.method === "POST") {
      const job = await req.json<any>();
      await env.CRAWL_QUEUE.send(job);
      return withCORS(req, json({ queued: true }), env.CORS_ORIGINS);
    }

    return withCORS(req, json({ error: "not found" }, 404), env.CORS_ORIGINS);
  },

  async queue(batch, env: Env) {
    for (const msg of batch.messages) {
      msg.ack();
    }
  }
} satisfies ExportedHandler<Env>;
