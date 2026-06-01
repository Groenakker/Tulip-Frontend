import { tox, TOX_API_BASE } from "../../../lib/toxApi";

export function uploadChemistry(file, opts = {}) {
  const fd = new FormData();
  fd.append("file", file);
  const url = new URL(`${TOX_API_BASE}/import/chemistry`, window.location.origin);
  if (opts.projectId) url.searchParams.set("project_id", opts.projectId);
  // We don't reuse tox.postForm here because we need access to the URL
  // search params for the optional `project_id` query.
  return fetch(url, { method: "POST", credentials: "include", body: fd }).then(
    async (res) => {
      if (!res.ok) throw new Error(await res.text().catch(() => "Upload failed"));
      return res.json();
    },
  );
}

export const previewImport = (id) => tox.get(`/import/${id}/preview`);
export const resolveImport = (id) => tox.post(`/import/${id}/resolve`);
export const confirmImport = (id, body) => tox.post(`/import/${id}/confirm`, body);
