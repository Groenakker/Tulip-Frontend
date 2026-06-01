import React from "react";
import { FaRegCalendarAlt, FaRegClock, FaLink, FaCommentDots } from "react-icons/fa";
import styles from "./pm.module.css";
import { PriorityBadge, TagBadge } from "./Badges";
import { AvatarStack } from "./Avatar";
import { fmtDate } from "./pmApi";

// Compact card used on the Kanban board and the dense list
// view. Click opens the modal; the parent owns drag handlers.
export default function TaskCard({ task, onOpen, dragHandlers, dragging }) {
  const overdue =
    task.status !== "Done" && task.dueDate && new Date(task.dueDate) < new Date();
  return (
    <div
      className={`${styles.taskCard} ${dragging ? styles.dragging : ""}`}
      onClick={() => onOpen?.(task)}
      {...(dragHandlers || {})}
    >
      <div style={{ display: "flex", justifyContent: "space-between", gap: 6 }}>
        <div className={styles.taskCardTitle}>{task.title}</div>
        <PriorityBadge priority={task.priority} />
      </div>

      {task.tags?.length > 0 && (
        <div className={styles.taskCardTags}>
          {task.tags.slice(0, 4).map((t) => (
            <TagBadge key={t.name} tag={t} />
          ))}
        </div>
      )}

      <div className={styles.taskCardMeta}>
        {task.dueDate && (
          <span style={{ color: overdue ? "#dc2626" : "inherit", fontWeight: overdue ? 700 : 500 }}>
            <FaRegCalendarAlt /> {fmtDate(task.dueDate)}
          </span>
        )}
        {!!task.estimatedHours && (
          <span><FaRegClock /> {task.estimatedHours}h</span>
        )}
        {task.dependencies?.length > 0 && (
          <span title={`${task.dependencies.length} dependency(ies)`}>
            <FaLink /> {task.dependencies.length}
          </span>
        )}
        {task.comments?.length > 0 && (
          <span><FaCommentDots /> {task.comments.length}</span>
        )}
      </div>

      <div className={styles.taskCardFooter}>
        <AvatarStack users={task.assignees || []} max={3} />
      </div>
    </div>
  );
}
