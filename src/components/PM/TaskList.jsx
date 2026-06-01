import React from "react";
import styles from "./pm.module.css";
import { StatusBadge, PriorityBadge, TagBadge } from "./Badges";
import { AvatarStack } from "./Avatar";
import { fmtDate } from "./pmApi";

// Dense table view of every task in the project. Faster to scan
// for power users than the Kanban board. Click any row to open
// the task modal.
export default function TaskList({ tasks, onOpenTask }) {
  if (tasks.length === 0) {
    return <div className={styles.emptyState}>No tasks yet.</div>;
  }
  return (
    <div style={{ overflowX: "auto" }}>
      <table className={styles.dataTable}>
        <thead>
          <tr>
            <th>Task</th>
            <th style={{ width: 120 }}>Status</th>
            <th style={{ width: 90 }}>Priority</th>
            <th style={{ width: 200 }}>Tags</th>
            <th style={{ width: 110 }}>Start</th>
            <th style={{ width: 110 }}>Due</th>
            <th style={{ width: 70 }}>Est.</th>
            <th style={{ width: 160 }}>Assignees</th>
          </tr>
        </thead>
        <tbody>
          {tasks.map((t) => {
            const overdue =
              t.status !== "Done" && t.dueDate && new Date(t.dueDate) < new Date();
            return (
              <tr key={t._id} onClick={() => onOpenTask?.(t)}>
                <td style={{ fontWeight: 600 }}>{t.title}</td>
                <td><StatusBadge status={t.status} /></td>
                <td><PriorityBadge priority={t.priority} /></td>
                <td>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                    {(t.tags || []).map((tag) => <TagBadge key={tag.name} tag={tag} />)}
                  </div>
                </td>
                <td>{fmtDate(t.startDate)}</td>
                <td style={{ color: overdue ? "#dc2626" : "inherit", fontWeight: overdue ? 700 : 400 }}>
                  {fmtDate(t.dueDate)}
                </td>
                <td>{t.estimatedHours ? `${t.estimatedHours}h` : "—"}</td>
                <td><AvatarStack users={t.assignees || []} max={4} /></td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
