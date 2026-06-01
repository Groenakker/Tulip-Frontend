import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  FaColumns, FaList, FaChartLine, FaStream, FaRegCalendarAlt,
  FaUsers, FaTags, FaChartPie, FaPlus, FaSearch,
} from "react-icons/fa";
import styles from "./pm.module.css";
import { pm } from "./pmApi";
import KanbanBoard from "./KanbanBoard";
import TaskList from "./TaskList";
import GanttChart from "./GanttChart";
import Timeline from "./Timeline";
import CalendarMonth from "./CalendarMonth";
import TeamPanel from "./TeamPanel";
import TagsManager from "./TagsManager";
import Insights from "./Insights";
import TaskModal from "./TaskModal";
import WorkloadHeatmap from "./WorkloadHeatmap";
import toast from "../Toaster/toast";

// Top-level Project Management workspace embedded into the
// project detail page. Owns the active view, search + filter
// state, and the task modal.
//
// Toolbar layout is intentionally two-row:
//   1. View switcher (Board / List / Gantt / ...) — sits on its
//      own underlined row, like tabs.
//   2. Search field (wide, growable) + the two compact filter
//      selects + the "New task" CTA — on the row below.
// That way the search bar is never cramped by the 8 view tabs.
const VIEWS = [
  { id: "board",    label: "Board",    icon: <FaColumns /> },
  { id: "list",     label: "List",     icon: <FaList /> },
  { id: "gantt",    label: "Gantt",    icon: <FaChartLine /> },
  { id: "timeline", label: "Timeline", icon: <FaStream /> },
  { id: "calendar", label: "Calendar", icon: <FaRegCalendarAlt /> },
  { id: "team",     label: "Team",     icon: <FaUsers /> },
  { id: "tags",     label: "Tags",     icon: <FaTags /> },
  { id: "insights", label: "Insights", icon: <FaChartPie /> },
];

const VIEWS_WITH_FILTERS = new Set(["board", "list", "gantt", "timeline", "calendar"]);

export default function ProjectWorkspace({ project, canEdit, onProjectChanged }) {
  const [view, setView] = useState("board");
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [filterAssignee, setFilterAssignee] = useState("");
  const [filterTag, setFilterTag] = useState("");
  const [modalTask, setModalTask] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [team, setTeam] = useState({ members: [] });

  const loadTasks = useCallback(async () => {
    if (!project?._id) return;
    setLoading(true);
    try {
      const r = await pm.listTasks({ project: project._id });
      setTasks(r.tasks || []);
    } catch (err) {
      toast.error(err.message || "Failed to load tasks");
    } finally {
      setLoading(false);
    }
  }, [project?._id]);

  const loadTeam = useCallback(async () => {
    if (!project?._id) return;
    try {
      const t = await pm.getTeamSummary(project._id);
      setTeam(t);
    } catch {
      /* non-fatal */
    }
  }, [project?._id]);

  useEffect(() => { loadTasks(); loadTeam(); }, [loadTasks, loadTeam]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return tasks.filter((t) => {
      if (q && !(`${t.title} ${t.description || ""}`.toLowerCase().includes(q))) return false;
      if (filterAssignee && !(t.assignees || []).some((a) => String(a.user) === filterAssignee)) return false;
      if (filterTag && !(t.tags || []).some((tg) => tg.name === filterTag)) return false;
      return true;
    });
  }, [tasks, search, filterAssignee, filterTag]);

  // Workload heatmap data.
  const [heatmapRows, setHeatmapRows] = useState([]);
  useEffect(() => {
    if (!team.members?.length) { setHeatmapRows([]); return; }
    const userIds = team.members.map((m) => m.user._id).join(",");
    const today = new Date();
    const to = new Date(today);
    to.setDate(to.getDate() + 27);
    pm.getAvailability({ users: userIds, from: today.toISOString().slice(0, 10), to: to.toISOString().slice(0, 10) })
      .then((d) => setHeatmapRows(
        (d.availability || []).map((a) => ({
          user: { ...a.user, dailyCapacityHours: a.user.capacity },
          booked: a.booked,
        }))
      ))
      .catch(() => setHeatmapRows([]));
  }, [team, tasks]);

  const openTask = (task) => { setModalTask(task); setModalOpen(true); };
  const openNewTask = (presetStatus) => {
    setModalTask({ status: presetStatus || "To Do" });
    setModalOpen(true);
  };

  // Optimistic Kanban move. Snap the card to the destination
  // column in local state right away so the UI never shows a
  // refresh, then send the PATCH. If the server rejects
  // (dependency block / other 4xx) we revert and surface a
  // toast — the user gets a single confirm dialog for the
  // dependency case so they can force-override without losing
  // the card's new position on the second attempt.
  const moveTask = async (task, newStatus) => {
    const previousTasks = tasks;
    const patch = (status) =>
      tasks.map((t) =>
        String(t._id) === String(task._id)
          ? {
              ...t,
              status,
              completedAt: status === "Done" ? new Date().toISOString() : null,
            }
          : t
      );
    setTasks(patch(newStatus));

    try {
      await pm.updateStatus(task._id, { status: newStatus });
    } catch (err) {
      if (err.code === "DEPENDENCY_BLOCKED") {
        const ok = window.confirm(
          `${err.message}\n\nMove anyway? (You'll be overriding the predecessor check.)`
        );
        if (!ok) {
          setTasks(previousTasks);
          return;
        }
        try {
          await pm.updateStatus(task._id, { status: newStatus }, { force: true });
        } catch (err2) {
          setTasks(previousTasks);
          toast.error(err2.message || "Failed to move task");
        }
      } else {
        setTasks(previousTasks);
        toast.error(err.message || "Failed to move task");
      }
    }
  };

  const showFilters = VIEWS_WITH_FILTERS.has(view);

  return (
    <div>
      <div className={styles.toolbar}>
        {/* Row 1 - view switcher */}
        <div className={styles.viewSwitcher}>
          {VIEWS.map((v) => (
            <button
              key={v.id}
              className={`${styles.viewBtn} ${view === v.id ? styles.active : ""}`}
              onClick={() => setView(v.id)}
            >
              {v.icon} {v.label}
            </button>
          ))}
        </div>

        {/* Row 2 - search + filters + new task */}
        <div className={styles.toolbarFilters}>
          {showFilters ? (
            <>
              <label className={styles.searchField}>
                <FaSearch />
                <input
                  placeholder="Search tasks…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </label>
              <select
                className={styles.select}
                value={filterAssignee}
                onChange={(e) => setFilterAssignee(e.target.value)}
              >
                <option value="">All assignees</option>
                {team.members.map((m) => (
                  <option key={m.user._id} value={m.user._id}>{m.user.name}</option>
                ))}
              </select>
              <select
                className={styles.select}
                value={filterTag}
                onChange={(e) => setFilterTag(e.target.value)}
              >
                <option value="">All tags</option>
                {(project?.tags || []).map((t) => (
                  <option key={t.name} value={t.name}>#{t.name}</option>
                ))}
              </select>
            </>
          ) : (
            <div style={{ flex: 1 }} />
          )}
          {canEdit && (
            <button className={styles.primaryBtn} onClick={() => openNewTask()}>
              <FaPlus /> New task
            </button>
          )}
        </div>
      </div>

      {loading && <div className={styles.emptyState}>Loading tasks…</div>}

      {!loading && view === "board" && (
        <>
          <KanbanBoard
            tasks={filtered}
            onOpenTask={openTask}
            onAddTask={canEdit ? openNewTask : undefined}
            onMoveTask={moveTask}
          />
          {heatmapRows.length > 0 && (
            <div className={styles.workloadPanel}>
              <div className={styles.workloadPanelTitle}>
                Team workload — next 4 weeks
              </div>
              <WorkloadHeatmap rows={heatmapRows} />
            </div>
          )}
        </>
      )}
      {!loading && view === "list"     && <TaskList tasks={filtered} onOpenTask={openTask} />}
      {!loading && view === "gantt"    && <GanttChart tasks={filtered} onOpenTask={openTask} />}
      {!loading && view === "timeline" && <Timeline tasks={filtered} onOpenTask={openTask} />}
      {!loading && view === "calendar" && <CalendarMonth tasks={filtered} onOpenTask={openTask} />}
      {!loading && view === "team"     && <TeamPanel projectId={project._id} canEdit={canEdit} onChanged={() => { loadTeam(); loadTasks(); }} />}
      {!loading && view === "tags"     && <TagsManager project={project} canEdit={canEdit} onChanged={onProjectChanged} />}
      {!loading && view === "insights" && <Insights projectId={project._id} />}

      {modalOpen && (
        <TaskModal
          task={modalTask?._id ? modalTask : null}
          project={{ ...project, members: team.members }}
          allTasks={tasks}
          onClose={() => { setModalOpen(false); setModalTask(null); }}
          onSaved={() => { loadTasks(); loadTeam(); }}
          onDeleted={() => { loadTasks(); }}
        />
      )}
    </div>
  );
}
