import React from "react";
import styles from "./pm.module.css";
import { STATUS_COLORS, PRIORITY_COLORS } from "./pmApi";

// Coloured pill for task status. The colour comes from the
// shared STATUS_COLORS map so the board column header, badge
// chip, and chart legend stay in sync.
export function StatusBadge({ status }) {
  const color = STATUS_COLORS[status] || "#6b7280";
  return (
    <span
      className={styles.statusBadge}
      style={{
        background: `${color}1A`,
        color: color,
        borderColor: `${color}55`,
      }}
    >
      <span className={styles.dot} style={{ background: color }} /> {status}
    </span>
  );
}

export function PriorityBadge({ priority }) {
  const color = PRIORITY_COLORS[priority] || "#6b7280";
  return (
    <span
      className={styles.priorityBadge}
      style={{
        background: `${color}1A`,
        color: color,
        borderColor: `${color}55`,
      }}
    >
      {priority}
    </span>
  );
}

export function TagBadge({ tag }) {
  const color = tag?.color || "#4570B6";
  return (
    <span
      className={styles.tagBadge}
      style={{
        background: `${color}14`,
        color: color,
        borderColor: `${color}40`,
      }}
    >
      #{tag?.name}
    </span>
  );
}
