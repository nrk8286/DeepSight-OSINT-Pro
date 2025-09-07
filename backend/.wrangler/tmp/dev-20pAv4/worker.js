var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// .wrangler/tmp/bundle-HBPMhB/strip-cf-connecting-ip-header.js
function stripCfConnectingIPHeader(input, init) {
  const request = new Request(input, init);
  request.headers.delete("CF-Connecting-IP");
  return request;
}
__name(stripCfConnectingIPHeader, "stripCfConnectingIPHeader");
globalThis.fetch = new Proxy(globalThis.fetch, {
  apply(target, thisArg, argArray) {
    return Reflect.apply(target, thisArg, [
      stripCfConnectingIPHeader.apply(null, argArray)
    ]);
  }
});

// worker.js
var cors = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "GET,POST,PUT,DELETE,OPTIONS",
  "access-control-allow-headers": "content-type, authorization"
};
var json = /* @__PURE__ */ __name((data, init = {}) => new Response(JSON.stringify(data), {
  ...init,
  headers: { "content-type": "application/json; charset=utf-8", ...cors, ...init.headers || {} }
}), "json");
var notFound = /* @__PURE__ */ __name(() => json({ error: "not_found" }, { status: 404 }), "notFound");
var badRequest = /* @__PURE__ */ __name((msg) => json({ error: "bad_request", message: msg }, { status: 400 }), "badRequest");
async function handleOptions(request) {
  if (request.headers.get("origin") !== null && request.headers.get("access-control-request-method") !== null) {
    return new Response(null, { headers: cors });
  }
  return new Response(null, { headers: cors });
}
__name(handleOptions, "handleOptions");
function safeKey(input) {
  let k = String(input || "").trim();
  while (k.startsWith("/"))
    k = k.slice(1);
  if (k.includes(".."))
    return null;
  if (!/^[a-zA-Z0-9_\-\/\.]+$/.test(k))
    return null;
  return k;
}
__name(safeKey, "safeKey");
function authFailed() {
  return json({ error: "unauthorized" }, { status: 401, headers: { "www-authenticate": "Bearer" } });
}
__name(authFailed, "authFailed");
function requireAdmin(request, env) {
  const token = env.ADMIN_TOKEN;
  if (!token)
    return true;
  const hdr = request.headers.get("authorization") || "";
  const m = /^Bearer\s+(.+)$/.exec(hdr);
  if (!m)
    return false;
  return m[1] === token;
}
__name(requireAdmin, "requireAdmin");
async function router(request, env) {
  const url = new URL(request.url);
  const { pathname, searchParams } = url;
  if (request.method === "OPTIONS")
    return handleOptions(request);
  if (pathname === "/api/health") {
    return json({ ok: true, ts: Date.now() });
  }
  if (pathname === "/api/images/list") {
    const limit = Math.min(parseInt(searchParams.get("limit") || "24", 10) || 24, 200);
    const page = Math.max(parseInt(searchParams.get("page") || "0", 10) || 0, 0);
    const offset = page * limit;
    try {
      const countRes = await env.DB.prepare("SELECT COUNT(*) as c FROM images").all();
      const total = countRes?.results?.[0]?.c || 0;
      const stmt = env.DB.prepare(
        'SELECT id, url, created_at, json_extract(metadata, "$.r2_key") AS r2_key, json_extract(metadata, "$.text") AS text FROM images ORDER BY datetime(created_at) DESC LIMIT ? OFFSET ?'
      );
      const result = await stmt.bind(limit, offset).all();
      const rows = Array.isArray(result?.results) ? result.results : [];
      const next = offset + limit < total ? page + 1 : null;
      return json({ items: rows, next_page: next, total });
    } catch (err) {
      return json({ items: [], next_page: null, total: 0, note: "images table missing or query failed" });
    }
  }
  if (pathname === "/api/images") {
    if (request.method !== "POST")
      return badRequest("method_not_allowed");
    if (!requireAdmin(request, env))
      return authFailed();
    try {
      const body = await request.json();
      const id = body?.id || crypto.randomUUID();
      const urlStr = body?.url || "";
      const title = body?.text || body?.title || null;
      const metadata = JSON.stringify({
        r2_key: body?.r2_key,
        bytes: body?.bytes,
        text: body?.text
      });
      await env.DB.prepare("INSERT OR REPLACE INTO images (id, url, created_at, title, metadata) VALUES (?, ?, CURRENT_TIMESTAMP, ?, ?)").bind(id, urlStr, title, metadata).run();
      return json({ ok: true, id });
    } catch (e) {
      return json({ ok: false, error: "insert_failed" }, { status: 500 });
    }
  }
  if (pathname === "/api/search") {
    const kind = (searchParams.get("kind") || "text").toLowerCase();
    if (kind === "text") {
      const q = (searchParams.get("q") || "").trim();
      const k = Math.min(parseInt(searchParams.get("k") || "24", 10) || 24, 200);
      if (!q)
        return json({ matches: [] });
      try {
        const stmt = env.DB.prepare(
          'SELECT id, url, created_at, json_extract(metadata, "$.r2_key") AS r2_key, json_extract(metadata, "$.text") AS text FROM images WHERE url LIKE ? OR json_extract(metadata, "$.text") LIKE ? ORDER BY datetime(created_at) DESC LIMIT ?'
        );
        const like = `%${q}%`;
        const res = await stmt.bind(like, like, k).all();
        const rows = res?.results || [];
        return json({ matches: rows });
      } catch (e) {
        return json({ matches: [] });
      }
    }
    if (kind === "phash") {
      return json({ matches: [] });
    }
    return json({ matches: [] });
  }
  if (pathname === "/api/stats") {
    try {
      const r = await env.DB.prepare("SELECT COUNT(*) as images FROM images").all();
      const images = r?.results?.[0]?.images || 0;
      return json({ images });
    } catch {
      return json({ images: 0 });
    }
  }
  if (pathname === "/api/crawl") {
    if (request.method !== "POST")
      return badRequest("method_not_allowed");
    if (!requireAdmin(request, env))
      return authFailed();
    return json({ queued: true });
  }
  if (pathname === "/api/images/upload-url") {
    if (request.method !== "POST")
      return badRequest("method_not_allowed");
    if (!requireAdmin(request, env))
      return authFailed();
    try {
      const { key } = await request.json();
      const k = safeKey(key);
      if (!k)
        return badRequest("invalid key");
      const origin = url.origin;
      const put = `${origin}/api/r2/object/${encodeURIComponent(k)}`;
      const get = `${origin}/r2/${encodeURIComponent(k)}`;
      return json({ put, get });
    } catch (e) {
      return badRequest("invalid_json");
    }
  }
  if (pathname.startsWith("/api/r2/object/")) {
    if (request.method === "OPTIONS")
      return handleOptions(request);
    if (!env.R2)
      return json({ error: "r2_not_configured" }, { status: 501 });
    if (!requireAdmin(request, env))
      return authFailed();
    const key = decodeURIComponent(pathname.replace("/api/r2/object/", ""));
    const k = safeKey(key);
    if (!k)
      return badRequest("invalid key");
    if (request.method === "PUT") {
      const ct = request.headers.get("content-type") || void 0;
      await env.R2.put(k, request.body, { httpMetadata: { contentType: ct } });
      return json({ ok: true, key: k });
    }
    if (request.method === "DELETE") {
      await env.R2.delete(k);
      return json({ ok: true, key: k });
    }
    return badRequest("method_not_allowed");
  }
  if (pathname.startsWith("/r2/")) {
    if (!env.R2)
      return json({ error: "r2_not_configured" }, { status: 501 });
    const key = decodeURIComponent(pathname.replace("/r2/", ""));
    const k = safeKey(key);
    if (!k)
      return badRequest("invalid key");
    const obj = await env.R2.get(k);
    if (!obj)
      return notFound();
    const headers = { ...cors };
    const ct = obj.httpMetadata?.contentType || "application/octet-stream";
    headers["content-type"] = ct;
    headers["cache-control"] = "public, max-age=3600";
    return new Response(obj.body, { headers });
  }
  if (pathname.startsWith("/api/images/")) {
    if (request.method !== "DELETE")
      return badRequest("method_not_allowed");
    if (!requireAdmin(request, env))
      return authFailed();
    const id = decodeURIComponent(pathname.replace("/api/images/", ""));
    if (!id)
      return badRequest("id required");
    try {
      const rowRes = await env.DB.prepare(
        'SELECT id, json_extract(metadata, "$.r2_key") as r2_key FROM images WHERE id = ?'
      ).bind(id).all();
      const row = rowRes?.results?.[0];
      if (row?.r2_key && env.R2) {
        const rk = safeKey(row.r2_key);
        if (rk)
          await env.R2.delete(rk);
      }
      await env.DB.prepare("DELETE FROM images WHERE id = ?").bind(id).run();
      return json({ ok: true, id });
    } catch (e) {
      return json({ ok: false, error: "delete_failed" }, { status: 500 });
    }
  }
  return notFound();
}
__name(router, "router");
var worker_default = {
  /** @param {Request} request @param {Env} env */
  fetch: (request, env) => router(request, env)
};

// ../../../../AppData/Local/npm-cache/_npx/0eedb5afd4158ff3/node_modules/wrangler/templates/middleware/middleware-ensure-req-body-drained.ts
var drainBody = /* @__PURE__ */ __name(async (request, env, _ctx, middlewareCtx) => {
  try {
    return await middlewareCtx.next(request, env);
  } finally {
    try {
      if (request.body !== null && !request.bodyUsed) {
        const reader = request.body.getReader();
        while (!(await reader.read()).done) {
        }
      }
    } catch (e) {
      console.error("Failed to drain the unused request body.", e);
    }
  }
}, "drainBody");
var middleware_ensure_req_body_drained_default = drainBody;

// ../../../../AppData/Local/npm-cache/_npx/0eedb5afd4158ff3/node_modules/wrangler/templates/middleware/middleware-miniflare3-json-error.ts
function reduceError(e) {
  return {
    name: e?.name,
    message: e?.message ?? String(e),
    stack: e?.stack,
    cause: e?.cause === void 0 ? void 0 : reduceError(e.cause)
  };
}
__name(reduceError, "reduceError");
var jsonError = /* @__PURE__ */ __name(async (request, env, _ctx, middlewareCtx) => {
  try {
    return await middlewareCtx.next(request, env);
  } catch (e) {
    const error = reduceError(e);
    return Response.json(error, {
      status: 500,
      headers: { "MF-Experimental-Error-Stack": "true" }
    });
  }
}, "jsonError");
var middleware_miniflare3_json_error_default = jsonError;

// .wrangler/tmp/bundle-HBPMhB/middleware-insertion-facade.js
var __INTERNAL_WRANGLER_MIDDLEWARE__ = [
  middleware_ensure_req_body_drained_default,
  middleware_miniflare3_json_error_default
];
var middleware_insertion_facade_default = worker_default;

// ../../../../AppData/Local/npm-cache/_npx/0eedb5afd4158ff3/node_modules/wrangler/templates/middleware/common.ts
var __facade_middleware__ = [];
function __facade_register__(...args) {
  __facade_middleware__.push(...args.flat());
}
__name(__facade_register__, "__facade_register__");
function __facade_invokeChain__(request, env, ctx, dispatch, middlewareChain) {
  const [head, ...tail] = middlewareChain;
  const middlewareCtx = {
    dispatch,
    next(newRequest, newEnv) {
      return __facade_invokeChain__(newRequest, newEnv, ctx, dispatch, tail);
    }
  };
  return head(request, env, ctx, middlewareCtx);
}
__name(__facade_invokeChain__, "__facade_invokeChain__");
function __facade_invoke__(request, env, ctx, dispatch, finalMiddleware) {
  return __facade_invokeChain__(request, env, ctx, dispatch, [
    ...__facade_middleware__,
    finalMiddleware
  ]);
}
__name(__facade_invoke__, "__facade_invoke__");

// .wrangler/tmp/bundle-HBPMhB/middleware-loader.entry.ts
var __Facade_ScheduledController__ = class {
  constructor(scheduledTime, cron, noRetry) {
    this.scheduledTime = scheduledTime;
    this.cron = cron;
    this.#noRetry = noRetry;
  }
  #noRetry;
  noRetry() {
    if (!(this instanceof __Facade_ScheduledController__)) {
      throw new TypeError("Illegal invocation");
    }
    this.#noRetry();
  }
};
__name(__Facade_ScheduledController__, "__Facade_ScheduledController__");
function wrapExportedHandler(worker) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__ === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__.length === 0) {
    return worker;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__) {
    __facade_register__(middleware);
  }
  const fetchDispatcher = /* @__PURE__ */ __name(function(request, env, ctx) {
    if (worker.fetch === void 0) {
      throw new Error("Handler does not export a fetch() function.");
    }
    return worker.fetch(request, env, ctx);
  }, "fetchDispatcher");
  return {
    ...worker,
    fetch(request, env, ctx) {
      const dispatcher = /* @__PURE__ */ __name(function(type, init) {
        if (type === "scheduled" && worker.scheduled !== void 0) {
          const controller = new __Facade_ScheduledController__(
            Date.now(),
            init.cron ?? "",
            () => {
            }
          );
          return worker.scheduled(controller, env, ctx);
        }
      }, "dispatcher");
      return __facade_invoke__(request, env, ctx, dispatcher, fetchDispatcher);
    }
  };
}
__name(wrapExportedHandler, "wrapExportedHandler");
function wrapWorkerEntrypoint(klass) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__ === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__.length === 0) {
    return klass;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__) {
    __facade_register__(middleware);
  }
  return class extends klass {
    #fetchDispatcher = (request, env, ctx) => {
      this.env = env;
      this.ctx = ctx;
      if (super.fetch === void 0) {
        throw new Error("Entrypoint class does not define a fetch() function.");
      }
      return super.fetch(request);
    };
    #dispatcher = (type, init) => {
      if (type === "scheduled" && super.scheduled !== void 0) {
        const controller = new __Facade_ScheduledController__(
          Date.now(),
          init.cron ?? "",
          () => {
          }
        );
        return super.scheduled(controller);
      }
    };
    fetch(request) {
      return __facade_invoke__(
        request,
        this.env,
        this.ctx,
        this.#dispatcher,
        this.#fetchDispatcher
      );
    }
  };
}
__name(wrapWorkerEntrypoint, "wrapWorkerEntrypoint");
var WRAPPED_ENTRY;
if (typeof middleware_insertion_facade_default === "object") {
  WRAPPED_ENTRY = wrapExportedHandler(middleware_insertion_facade_default);
} else if (typeof middleware_insertion_facade_default === "function") {
  WRAPPED_ENTRY = wrapWorkerEntrypoint(middleware_insertion_facade_default);
}
var middleware_loader_entry_default = WRAPPED_ENTRY;
export {
  __INTERNAL_WRANGLER_MIDDLEWARE__,
  middleware_loader_entry_default as default
};
//# sourceMappingURL=worker.js.map
