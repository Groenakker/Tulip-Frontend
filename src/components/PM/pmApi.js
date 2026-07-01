// Thin fetch wrapper for the Project Management endpoints.
// Centralises base URL + credentials so the call sites stay
// readable, and translates 4xx/5xx bodies into thrown Errors so
// React components can `catch` them uniformly.
const BASE = import.meta.env.VITE_BACKEND_URL;

const j = async (res) => {
  const text = await res.text();
  let body;
  try { body = text ? JSON.parse(text) : {}; } catch { body = { message: text }; }
  if (!res.ok) {
    const err = new Error(body.message || `HTTP ${res.status}`);
    err.status = res.status;
    err.code = body.code;
    err.details = body.details;
    throw err;
  }
  return body;
};

const req = (method, path, body, opts = {}) =>
  fetch(`${BASE}${path}`, {
    method,
    credentials: "include",
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
    ...opts,
  }).then(j);

// Multipart helper for endpoints that receive a single file
// (task attachment paste/drop/pick). We deliberately *don't*
// set a Content-Type header so the browser fills in the multi-
// part boundary itself.
const reqForm = (method, path, formData) =>
  fetch(`${BASE}${path}`, {
    method,
    credentials: "include",
    body: formData,
  }).then(j);

export const pm = {
  // tasks
  listTasks: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return req("GET", `/api/tasks${qs ? `?${qs}` : ""}`);
  },
  getTask: (id) => req("GET", `/api/tasks/${id}`),
  createTask: (body, { force } = {}) =>
    req("POST", `/api/tasks${force ? "?force=true" : ""}`, body),
  updateTask: (id, body, { force } = {}) =>
    req("PUT", `/api/tasks/${id}${force ? "?force=true" : ""}`, body),
  updateStatus: (id, body, { force } = {}) =>
    req("PATCH", `/api/tasks/${id}/status${force ? "?force=true" : ""}`, body),
  addComment: (id, body) => req("POST", `/api/tasks/${id}/comments`, body),
  // file: a File / Blob from clipboard, drag-drop, or input.
  // optional `filename` overrides the synthesized one — handy
  // when the user typed a name alongside a clipboard paste.
  addAttachment: (id, file, filename) => {
    const fd = new FormData();
    // Falling back to "pasted-image" gives the server a hint
    // when the browser doesn't supply a name (some paste paths
    // hand us a nameless Blob).
    fd.append("file", file, file.name || filename || "pasted-image");
    if (filename) fd.append("filename", filename);
    return reqForm("POST", `/api/tasks/${id}/attachments`, fd);
  },
  removeAttachment: (id, attachmentId) =>
    req("DELETE", `/api/tasks/${id}/attachments/${attachmentId}`),
  deleteTask: (id) => req("DELETE", `/api/tasks/${id}`),

  // workload / availability
  getWorkload: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return req("GET", `/api/tasks/workload${qs ? `?${qs}` : ""}`);
  },
  getAvailability: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return req("GET", `/api/tasks/availability${qs ? `?${qs}` : ""}`);
  },
  // Replaces the CURRENT user's per-day plan for a task.
  // entries: [{ date: "YYYY-MM-DD" | Date, hours: number }]
  // Hours === 0 entries are treated as deletions by the backend.
  updateWorkPlan: (taskId, entries) =>
    req("PUT", `/api/tasks/${taskId}/work-plan`, {
      entries: (entries || []).map((e) => ({
        date: typeof e.date === "string" ? e.date : new Date(e.date).toISOString().slice(0, 10),
        hours: Number(e.hours) || 0,
      })),
    }),

  // projects (PM extensions)
  getInsights: (projectId) => req("GET", `/api/projects/${projectId}/insights`),
  getTeamSummary: (projectId) => req("GET", `/api/projects/${projectId}/team-summary`),
  addMember: (projectId, body) => req("POST", `/api/projects/${projectId}/members`, body),
  updateMember: (projectId, memberId, body) =>
    req("PUT", `/api/projects/${projectId}/members/${memberId}`, body),
  removeMember: (projectId, memberId) =>
    req("DELETE", `/api/projects/${projectId}/members/${memberId}`),
  setTags: (projectId, tags) => req("PUT", `/api/projects/${projectId}/tags`, { tags }),

  // users
  listUsers: () => req("GET", `/api/users`),
  updateCapacity: (userId, dailyCapacityHours) =>
    req("PATCH", `/api/users/${userId}/capacity`, { dailyCapacityHours }),
};

// Shared display constants used by the Kanban columns, badges,
// and chart legends so the colour story stays consistent.
export const STATUSES = ["Backlog", "To Do", "In Progress", "In Review", "Done", "Blocked"];
export const STATUS_COLORS = {
  Backlog: "#6b7280",
  "To Do": "#4570B6",
  "In Progress": "#2563eb",
  "In Review": "#f59e0b",
  Done: "#16a34a",
  Blocked: "#dc2626",
};
export const PRIORITIES = ["Low", "Medium", "High", "Urgent"];
export const PRIORITY_COLORS = {
  Low: "#9ca3af",
  Medium: "#2563eb",
  High: "#f97316",
  Urgent: "#dc2626",
};

// Work-item taxonomy used by the Hierarchy view and the
// task editor's "Type" selector. The colour palette doubles
// as the badge / tree icon colour so all three views agree.
export const WORK_ITEM_TYPES = ["epic", "story", "task"];
export const WORK_ITEM_TYPE_LABEL = {
  epic: "Epic",
  story: "Story",
  task: "Task",
};
export const WORK_ITEM_TYPE_COLOR = {
  epic: "#7c3aed",   // purple
  story: "#16a34a",  // green
  task: "#2563eb",   // blue
};
// Only certain parent->child shapes are valid. Mirrors the
// rule enforced by the backend in `validateWorkItemHierarchy`.
export const ALLOWED_PARENT_TYPE = {
  epic: null,      // epics cannot be parented
  story: "epic",
  task: "story",
};

// Date helpers (kept here so every PM view formats the same way).
export const fmtDate = (d) =>
  d ? new Date(d).toLocaleDateString(undefined, { month: "short", day: "numeric" }) : "—";
export const fmtDateLong = (d) =>
  d ? new Date(d).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" }) : "—";
export const isoDay = (d) => {
  const x = new Date(d);
  x.setUTCHours(0, 0, 0, 0);
  return x.toISOString().slice(0, 10);
};
export const daysBetween = (a, b) => {
  const ms = new Date(b).getTime() - new Date(a).getTime();
  return Math.max(1, Math.round(ms / 86400000) + 1);
};
