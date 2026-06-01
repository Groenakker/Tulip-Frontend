/**
 * Tox API client.
 *
 * Thin wrapper around `fetch` that targets the ToxIntelligence routes
 * we ported into Tulip-Backend at `/api/tox/v1/*`. Mirrors the simple
 * call-style already used by Tulip pages (see ProjectList.jsx) so the
 * 401-refresh interceptor wired up inside `AuthContext.jsx` (which
 * monkey-patches `window.fetch`) automatically applies to Tox calls
 * too — no extra plumbing required.
 *
 * Every method returns the parsed JSON response. On non-2xx responses
 * an Error is thrown whose `message` contains the server `detail` when
 * available, so React Query / try/catch in pages get something useful
 * to display.
 *
 * Usage:
 *   import { tox } from '@/lib/toxApi.js' // wait, Tulip has no @ alias
 *   import { tox } from '../../lib/toxApi'
 *
 *   const { items } = await tox.get('/library/', { page: 1, page_size: 20 })
 *   await tox.post('/tra-projects', { name: 'New project' })
 */

const BASE = `${import.meta.env.VITE_BACKEND_URL}/api/tox/v1`

async function request(path, { method = "GET", body, query, formData, signal } = {}) {
  // Build the URL with optional query params. We use the WHATWG URL
  // class so callers don't have to worry about encoding.
  const url = new URL(BASE + path, window.location.origin);
  if (query) {
    for (const [k, v] of Object.entries(query)) {
      if (v === undefined || v === null || v === "") continue;
      if (Array.isArray(v)) v.forEach((vv) => url.searchParams.append(k, String(vv)));
      else url.searchParams.set(k, String(v));
    }
  }

  // multipart uploads use FormData (browser sets the boundary header).
  let requestBody;
  let headers;
  if (formData) {
    requestBody = formData;
  } else if (body !== undefined) {
    requestBody = JSON.stringify(body);
    headers = { "Content-Type": "application/json" };
  }

  const res = await fetch(url, {
    method,
    credentials: "include",
    headers,
    body: requestBody,
    signal,
  });

  // Surface the most useful error string we can without forcing the
  // caller to remember the exact shape of FastAPI/Express error bodies.
  if (!res.ok) {
    let detail = "";
    try {
      const txt = await res.text();
      try {
        const j = JSON.parse(txt);
        detail = j?.detail ?? j?.message ?? txt;
        if (typeof detail !== "string") detail = JSON.stringify(detail);
      } catch {
        detail = txt;
      }
    } catch {
      /* swallow */
    }
    throw new Error(detail || `${method} ${path} failed (${res.status})`);
  }

  // Some delete endpoints return 204 with no body.
  if (res.status === 204) return null;
  const ct = res.headers.get("content-type") || "";
  if (ct.includes("application/json")) return res.json();
  return res.text();
}

export const tox = {
  get: (path, query) => request(path, { query }),
  post: (path, body, opts = {}) => request(path, { method: "POST", body, ...opts }),
  postForm: (path, formData) => request(path, { method: "POST", formData }),
  patch: (path, body) => request(path, { method: "PATCH", body }),
  put: (path, body) => request(path, { method: "PUT", body }),
  del: (path) => request(path, { method: "DELETE" }),
};

export const TOX_API_BASE = BASE;
