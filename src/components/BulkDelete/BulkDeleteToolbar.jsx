import React from "react";
import { FaTrashAlt } from "react-icons/fa";
import styles from "./BulkDelete.module.css";

/**
 * Toolbar fragment shown when one or more rows are selected. Stays invisible
 * (returns null) when nothing is selected so the list page doesn't need to
 * branch on permissions/count itself.
 *
 * Props:
 *   count        — number of currently selected rows
 *   onClear      — clears the selection
 *   onDelete     — opens the confirm modal (parent controls modal state)
 *   disabled     — disables both buttons (e.g. while a delete is in flight)
 *   entityLabel  — short noun for the title, e.g. "project"
 */
export default function BulkDeleteToolbar({
  count = 0,
  onClear,
  onDelete,
  disabled = false,
  entityLabel = "record",
}) {
  if (!count) return null;
  return (
    <>
      <span className={styles.selectionCount}>{count} selected</span>
      <button
        type="button"
        className={styles.clearBtn}
        onClick={onClear}
        disabled={disabled}
      >
        Clear
      </button>
      <button
        type="button"
        className={styles.deleteBtn}
        onClick={onDelete}
        disabled={disabled}
        title={`Delete selected ${entityLabel}${count === 1 ? "" : "s"}`}
      >
        <FaTrashAlt />
        <span>Delete ({count})</span>
      </button>
    </>
  );
}
