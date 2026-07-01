import React, { useCallback, useEffect, useState } from "react";
import Header from "../../components/Header";
import WhiteIsland from "../../components/Whiteisland";
import CalendarMonth from "../../components/PM/CalendarMonth";
import TaskModal from "../../components/PM/TaskModal";
import { pm } from "../../components/PM/pmApi";
import { useAuth } from "../../context/AuthContext";
import toast from "../../components/Toaster/toast";

// Personal calendar — every task the user is assigned to,
// plotted on a month grid. Click a chip to open the full task
// editor in-place (same modal used by ProjectWorkspace) so the
// user can update status / dates / comments without losing the
// monthly context. The CalendarMonth's chip-click flow doesn't
// expose a separate "jump to project" link — the modal carries
// the project field in its header, so users can still navigate
// from there if they need the full project view.
export default function MyCalendar() {
  const { user } = useAuth();
  const [tasks, setTasks] = useState([]);

  const [modalTask, setModalTask] = useState(null);
  const [modalProject, setModalProject] = useState(null);
  const [modalAllTasks, setModalAllTasks] = useState([]);
  const [modalLoading, setModalLoading] = useState(false);

  const load = useCallback(async () => {
    if (!user?._id) return;
    try {
      const r = await pm.listTasks({ mine: "true" });
      setTasks(r.tasks || []);
    } catch (err) {
      toast.error(err.message || "Failed to load tasks");
    }
  }, [user?._id]);

  useEffect(() => { load(); }, [load]);

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

  return (
    <>
      <Header title="My Calendar" />
      <WhiteIsland>
        {modalLoading && (
          <div style={{
            position: "fixed", top: 12, right: 16, zIndex: 1100,
            background: "#1f2937", color: "white", padding: "8px 12px",
            borderRadius: 8, fontSize: 12, boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
          }}>
            Loading task…
          </div>
        )}
        <CalendarMonth tasks={tasks} onOpenTask={openTaskModal} />
      </WhiteIsland>

      {modalTask && modalProject && (
        <TaskModal
          task={modalTask}
          project={modalProject}
          allTasks={modalAllTasks}
          onClose={closeTaskModal}
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
