import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FaExternalLinkAlt, FaSearch } from "react-icons/fa";
import Header from "../../components/Header";
import WhiteIsland from "../../components/Whiteisland";
import styles from "../../components/PM/pm.module.css";
import { useAuth } from "../../context/AuthContext";
import { pm, STATUSES, STATUS_COLORS, fmtDate } from "../../components/PM/pmApi";
import { StatusBadge, PriorityBadge, TagBadge } from "../../components/PM/Badges";
import TaskModal from "../../components/PM/TaskModal";
import toast from "../../components/Toaster/toast";

// Personal task board for the signed-in user. Pulls every task
// where they're an assignee across every project, then groups
// them by status into Kanban-style columns. Clicking a task
// jumps to the project detail page so the user can use the
// full editor in context.
export default function MyTasks() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [tasks, setTasks] = useState([]);
  const [search, setSearch] = useState("");
  const [projectMap, setProjectMap] = useState(new Map());

  // Task-modal state. We keep:
  //   modalTask         — the task object currently being edited
  //   modalProject      — its project, hydrated with `members`
  //                       (joined with user info via getTeamSummary)
  //                       so the assignee popover works
  //   modalAllTasks     — sibling tasks on the same project so the
  //                       dependencies / parent pickers populate
  //   modalLoading      — true while we fetch the supporting data
  //                       between the user clicking and the modal
  //                       being able to render the team picker.
  const [modalTask, setModalTask] = useState(null);
  const [modalProject, setModalProject] = useState(null);
  const [modalAllTasks, setModalAllTasks] = useState([]);
  const [modalLoading, setModalLoading] = useState(false);

  const load = useCallback(async () => {
    if (!user?._id) return;
    try {
      const r = await pm.listTasks({ mine: "true" });
      setTasks(r.tasks || []);
      // Project names (best-effort) for the chip on each card.
      const ids = Array.from(new Set((r.tasks || []).map((t) => String(t.project))));
      if (ids.length) {
        const ps = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/projects`, { credentials: "include" }).then((x) => x.json());
        const m = new Map();
        for (const p of ps || []) m.set(String(p._id), p);
        setProjectMap(m);
      }
    } catch (err) {
      toast.error(err.message || "Failed to load tasks");
    }
  }, [user?._id]);

  useEffect(() => { load(); }, [load]);

  // Open the full task editor in-place. We need the same three
  // bits ProjectWorkspace passes in: the task itself, its project
  // (with team.members hydrated so the assignee picker works),
  // and the sibling tasks for dependencies / parent. Fetched in
  // parallel — modal pops open once everything arrives so the
  // user never sees an empty Members list.
  const openTaskModal = useCallback(async (task) => {
    if (!task?._id || !task.project) return;
    setModalLoading(true);
    try {
      const [projectRes, teamRes, tasksRes, freshTaskRes] = await Promise.all([
        fetch(`${import.meta.env.VITE_BACKEND_URL}/api/projects/${task.project}`, {
          credentials: "include",
        }).then((r) => (r.ok ? r.json() : null)),
        pm.getTeamSummary(task.project).catch(() => ({ members: [] })),
        pm.listTasks({ project: task.project }).catch(() => ({ tasks: [] })),
        // Refetch the task so we see its latest comments &
        // attachments — the cached `mine` list omits attachments
        // until the next refresh otherwise.
        pm.getTask(task._id).catch(() => null),
      ]);
      if (!projectRes) {
        toast.error("Could not load project for this task");
        return;
      }
      setModalProject({ ...projectRes, members: teamRes?.members || [] });
      setModalAllTasks(tasksRes?.tasks || []);
      setModalTask(freshTaskRes?.task || task);
    } finally {
      setModalLoading(false);
    }
  }, []);

  const closeTaskModal = () => {
    setModalTask(null);
    setModalProject(null);
    setModalAllTasks([]);
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return tasks;
    return tasks.filter((t) => `${t.title} ${t.description || ""}`.toLowerCase().includes(q));
  }, [tasks, search]);

  const grouped = useMemo(() => {
    const g = {};
    for (const s of STATUSES) g[s] = [];
    for (const t of filtered) {
      const s = STATUSES.includes(t.status) ? t.status : "To Do";
      g[s].push(t);
    }
    return g;
  }, [filtered]);

  const totals = useMemo(() => {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const week = new Date(today); week.setDate(week.getDate() + 7);
    return {
      open: tasks.filter((t) => t.status !== "Done").length,
      overdue: tasks.filter((t) => t.status !== "Done" && t.dueDate && new Date(t.dueDate) < today).length,
      thisWeek: tasks.filter((t) => t.status !== "Done" && t.dueDate && new Date(t.dueDate) >= today && new Date(t.dueDate) <= week).length,
      done: tasks.filter((t) => t.status === "Done").length,
    };
  }, [tasks]);

  return (
    <>
      <Header title="My Tasks" />
      <WhiteIsland>
        <div className={styles.kpiGrid}>
          <Kpi label="Open" value={totals.open} />
          <Kpi label="Due this week" value={totals.thisWeek} accent="#2563eb" />
          <Kpi label="Overdue" value={totals.overdue} accent="#dc2626" />
          <Kpi label="Done" value={totals.done} accent="#16a34a" />
        </div>

        <div className={styles.toolbarSingle}>
          <strong style={{ fontSize: 14 }}>All my tasks across projects</strong>
          <label className={styles.searchField} style={{ minWidth: 260 }}>
            <FaSearch />
            <input
              placeholder="Search…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </label>
        </div>

        {modalLoading && (
          <div style={{
            position: "fixed", top: 12, right: 16, zIndex: 1100,
            background: "#1f2937", color: "white", padding: "8px 12px",
            borderRadius: 8, fontSize: 12, boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
          }}>
            Loading task…
          </div>
        )}

        <div className={styles.board}>
          {STATUSES.map((s) => (
            <div key={s} className={styles.boardColumn}>
              <div className={styles.boardColumnHeader}>
                <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                  <span className={styles.dot} style={{ background: STATUS_COLORS[s] }} /> {s}
                </span>
                <span className={styles.boardColumnCount}>{grouped[s].length}</span>
              </div>
              <div className={styles.boardColumnBody}>
                {grouped[s].map((t) => {
                  const proj = projectMap.get(String(t.project));
                  const overdue = t.status !== "Done" && t.dueDate && new Date(t.dueDate) < new Date();
                  return (
                    <div
                      key={t._id}
                      className={styles.taskCard}
                      onClick={() => openTaskModal(t)}
                      style={{ cursor: "pointer" }}
                      title="Open task"
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", gap: 6 }}>
                        <div className={styles.taskCardTitle}>{t.title}</div>
                        <button
                          type="button"
                          onClick={(e) => {
                            // Stop the card click — this button is
                            // the explicit "jump to the project page"
                            // escape hatch, separate from the modal
                            // open behaviour on the card body.
                            e.stopPropagation();
                            navigate(`/Projects/ProjectDetails/${t.project}`);
                          }}
                          title="Open in Project Management"
                          aria-label="Open in Project Management"
                          style={{
                            background: "none",
                            border: "none",
                            padding: "2px 4px",
                            cursor: "pointer",
                            color: "#9ca3af",
                            fontSize: 10,
                            marginTop: 2,
                            display: "inline-flex",
                            alignItems: "center",
                          }}
                          onMouseEnter={(e) => { e.currentTarget.style.color = "#2563eb"; }}
                          onMouseLeave={(e) => { e.currentTarget.style.color = "#9ca3af"; }}
                        >
                          <FaExternalLinkAlt />
                        </button>
                      </div>
                      <div className={styles.taskCardMeta}>
                        <PriorityBadge priority={t.priority} />
                        {proj && <span title={proj.name}>📁 {proj.projectID}</span>}
                        {t.dueDate && (
                          <span style={{ color: overdue ? "#dc2626" : "inherit", fontWeight: overdue ? 700 : 500 }}>
                            Due {fmtDate(t.dueDate)}
                          </span>
                        )}
                      </div>
                      {t.tags?.length > 0 && (
                        <div className={styles.taskCardTags}>
                          {t.tags.slice(0, 4).map((tag) => <TagBadge key={tag.name} tag={tag} />)}
                        </div>
                      )}
                    </div>
                  );
                })}
                {grouped[s].length === 0 && (
                  <div style={{ fontSize: 11, color: "#9ca3af", padding: "8px 4px" }}>
                    Nothing here.
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </WhiteIsland>

      {modalTask && modalProject && (
        <TaskModal
          task={modalTask}
          project={modalProject}
          allTasks={modalAllTasks}
          onClose={closeTaskModal}
          // Refetch the "my tasks" list so any edit (status change,
          // new comment, attachment, etc.) is reflected in the
          // kanban columns immediately. We also patch the modal's
          // own `task` prop so subsequent saves see the freshest
          // version without closing/reopening.
          onSaved={(updated) => {
            if (updated?._id) setModalTask(updated);
            load();
          }}
          onDeleted={() => { closeTaskModal(); load(); }}
        />
      )}
    </>
  );
}

function Kpi({ label, value, accent }) {
  return (
    <div className={styles.kpiCard}>
      <div className={styles.kpiLabel}>{label}</div>
      <div className={styles.kpiValue} style={accent ? { color: accent } : undefined}>{value}</div>
    </div>
  );
}
