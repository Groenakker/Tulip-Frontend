import React, { useMemo, useState } from "react";
import { FaPlus } from "react-icons/fa";
import styles from "./pm.module.css";
import TaskCard from "./TaskCard";
import { STATUSES, STATUS_COLORS } from "./pmApi";

// Kanban with one column per status. Drag-and-drop uses the
// native HTML5 API so we don't have to pull in a library.
//
// IMPORTANT: the board never calls the API itself. It just
// signals the parent via onMoveTask(taskId, newStatus) and
// trusts the parent to do an optimistic state update + API
// call. That keeps the card visually pinned to the destination
// column from the moment the user releases the mouse — no
// refresh flash, no jump-back-and-jump-forward animation.
export default function KanbanBoard({ tasks, onOpenTask, onAddTask, onMoveTask }) {
  const [dragging, setDragging] = useState(null);
  const [dropCol, setDropCol] = useState(null);

  const groups = useMemo(() => {
    const g = {};
    for (const s of STATUSES) g[s] = [];
    for (const t of tasks) {
      const s = STATUSES.includes(t.status) ? t.status : "To Do";
      g[s].push(t);
    }
    for (const s of STATUSES) g[s].sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
    return g;
  }, [tasks]);

  const dropOn = (status) => {
    setDropCol(null);
    const t = dragging;
    setDragging(null);
    if (!t || t.status === status) return;
    onMoveTask?.(t, status);
  };

  return (
    <div className={styles.board}>
      {STATUSES.map((s) => {
        const color = STATUS_COLORS[s];
        const isTarget = dropCol === s;
        return (
          <div
            key={s}
            className={`${styles.boardColumn} ${isTarget ? styles.dropTarget : ""}`}
            onDragOver={(e) => { e.preventDefault(); setDropCol(s); }}
            onDragLeave={() => setDropCol((c) => (c === s ? null : c))}
            onDrop={(e) => { e.preventDefault(); dropOn(s); }}
          >
            <div className={styles.boardColumnHeader}>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                <span className={styles.dot} style={{ background: color }} />
                {s}
              </span>
              <span className={styles.boardColumnCount}>{groups[s].length}</span>
            </div>

            <div className={styles.boardColumnBody}>
              {groups[s].map((t) => (
                <TaskCard
                  key={t._id}
                  task={t}
                  onOpen={onOpenTask}
                  dragging={dragging?._id === t._id}
                  dragHandlers={{
                    draggable: true,
                    onDragStart: () => setDragging(t),
                    onDragEnd: () => { setDragging(null); setDropCol(null); },
                  }}
                />
              ))}
              {groups[s].length === 0 && (
                <div style={{ fontSize: 11, color: "#9ca3af", padding: "8px 4px" }}>
                  Drop tasks here
                </div>
              )}
            </div>

            <button className={styles.boardAddBtn} onClick={() => onAddTask?.(s)}>
              <FaPlus /> Add task
            </button>
          </div>
        );
      })}
    </div>
  );
}
