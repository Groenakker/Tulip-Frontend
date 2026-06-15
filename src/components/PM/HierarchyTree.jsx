import React, { useMemo, useState } from "react";
import {
  FaChevronDown,
  FaChevronRight,
  FaBolt,
  FaBook,
  FaCheckSquare,
  FaPlus,
} from "react-icons/fa";
import styles from "./pm.module.css";
import { StatusBadge, PriorityBadge } from "./Badges";
import { AvatarStack } from "./Avatar";
import {
  fmtDate,
  WORK_ITEM_TYPE_COLOR,
  WORK_ITEM_TYPE_LABEL,
} from "./pmApi";

// Hierarchy view: Epic -> Story -> Task tree.
//
// The view rebuilds the tree on every render from the flat
// `tasks` array (already filtered by the search/assignee/tag
// controls in ProjectWorkspace). Each node row reuses the
// existing badge components so the visual language stays
// identical to the Board / List views.
//
// Children whose direct parent is missing are surfaced under
// "Orphan stories" / "Orphan tasks" groups so users can
// always see (and re-parent) every record — never silently
// hidden.
export default function HierarchyTree({ tasks, onOpenTask, onAddTask, canEdit }) {
  const [expanded, setExpanded] = useState({});

  // Group tasks by parent id for O(1) child lookup.
  const byParent = useMemo(() => {
    const m = new Map();
    for (const t of tasks) {
      const key = String(t.parent || "root");
      if (!m.has(key)) m.set(key, []);
      m.get(key).push(t);
    }
    for (const arr of m.values()) {
      arr.sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
    }
    return m;
  }, [tasks]);

  const byId = useMemo(() => {
    const m = new Map();
    for (const t of tasks) m.set(String(t._id), t);
    return m;
  }, [tasks]);

  const epics = (byParent.get("root") || []).filter((t) => t.workItemType === "epic");
  const orphanStories = tasks.filter(
    (t) =>
      t.workItemType === "story" &&
      (!t.parent || !byId.has(String(t.parent)))
  );
  const orphanTasks = tasks.filter(
    (t) =>
      (t.workItemType === "task" || !t.workItemType) &&
      (!t.parent || !byId.has(String(t.parent)))
  );

  const toggle = (id) =>
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));

  const isOpen = (id) => expanded[id] !== false; // default open

  const childrenOfType = (parentId, type) =>
    (byParent.get(String(parentId)) || []).filter((t) => t.workItemType === type);

  const renderTask = (task, depth) => (
    <TreeRow
      key={task._id}
      task={task}
      depth={depth}
      icon={<FaCheckSquare style={{ color: WORK_ITEM_TYPE_COLOR.task }} />}
      onOpen={() => onOpenTask?.(task)}
    />
  );

  const renderStory = (story) => {
    const childTasks = childrenOfType(story._id, "task");
    const open = isOpen(story._id);
    return (
      <div key={story._id} className={styles.hTreeBlock}>
        <TreeRow
          task={story}
          depth={1}
          icon={<FaBook style={{ color: WORK_ITEM_TYPE_COLOR.story }} />}
          expandable={childTasks.length > 0}
          isOpen={open}
          onToggle={() => toggle(story._id)}
          onOpen={() => onOpenTask?.(story)}
          countLabel={`${childTasks.length} task${childTasks.length === 1 ? "" : "s"}`}
          rightSlot={
            canEdit && (
              <button
                type="button"
                className={styles.hTreeAddBtn}
                title="Add task under this story"
                onClick={(e) => {
                  e.stopPropagation();
                  onAddTask?.({ workItemType: "task", parent: story._id });
                }}
              >
                <FaPlus />
              </button>
            )
          }
        />
        {open &&
          (childTasks.length > 0 ? (
            childTasks.map((t) => renderTask(t, 2))
          ) : (
            <EmptyChild depth={2} text="No tasks yet" />
          ))}
      </div>
    );
  };

  const renderEpic = (epic) => {
    const stories = childrenOfType(epic._id, "story");
    const open = isOpen(epic._id);
    return (
      <div key={epic._id} className={styles.hTreeBlock}>
        <TreeRow
          task={epic}
          depth={0}
          icon={<FaBolt style={{ color: WORK_ITEM_TYPE_COLOR.epic }} />}
          expandable={stories.length > 0}
          isOpen={open}
          onToggle={() => toggle(epic._id)}
          onOpen={() => onOpenTask?.(epic)}
          countLabel={`${stories.length} stor${stories.length === 1 ? "y" : "ies"}`}
          rightSlot={
            canEdit && (
              <button
                type="button"
                className={styles.hTreeAddBtn}
                title="Add story under this epic"
                onClick={(e) => {
                  e.stopPropagation();
                  onAddTask?.({ workItemType: "story", parent: epic._id });
                }}
              >
                <FaPlus />
              </button>
            )
          }
        />
        {open &&
          (stories.length > 0 ? (
            stories.map((s) => renderStory(s))
          ) : (
            <EmptyChild depth={1} text="No stories yet" />
          ))}
      </div>
    );
  };

  if (!tasks.length) {
    return (
      <div className={styles.emptyState}>
        No work items yet. Use <b>New task</b> to create an epic, story, or task.
      </div>
    );
  }

  return (
    <div className={styles.hTree}>
      <div className={styles.hTreeSectionHeader}>
        <FaBolt style={{ color: WORK_ITEM_TYPE_COLOR.epic }} /> Epics
        <span className={styles.hTreeCount}>{epics.length}</span>
        {canEdit && (
          <button
            type="button"
            className={styles.hTreeAddBtn}
            title="New epic"
            onClick={() => onAddTask?.({ workItemType: "epic" })}
          >
            <FaPlus /> Epic
          </button>
        )}
      </div>
      {epics.length === 0 ? (
        <div className={styles.hTreeEmpty}>No epics yet.</div>
      ) : (
        epics.map((e) => renderEpic(e))
      )}

      {orphanStories.length > 0 && (
        <>
          <div className={styles.hTreeSectionHeader}>
            <FaBook style={{ color: WORK_ITEM_TYPE_COLOR.story }} /> Stories without an epic
            <span className={styles.hTreeCount}>{orphanStories.length}</span>
          </div>
          {orphanStories.map((s) => renderStory(s))}
        </>
      )}

      {orphanTasks.length > 0 && (
        <>
          <div className={styles.hTreeSectionHeader}>
            <FaCheckSquare style={{ color: WORK_ITEM_TYPE_COLOR.task }} /> Standalone tasks
            <span className={styles.hTreeCount}>{orphanTasks.length}</span>
          </div>
          {orphanTasks.map((t) => renderTask(t, 0))}
        </>
      )}
    </div>
  );
}

function TreeRow({
  task,
  depth,
  icon,
  expandable,
  isOpen: open,
  onToggle,
  onOpen,
  countLabel,
  rightSlot,
}) {
  const typeColor = WORK_ITEM_TYPE_COLOR[task.workItemType || "task"];
  return (
    <div
      className={styles.hTreeRow}
      style={{ paddingLeft: 8 + depth * 22, borderLeftColor: typeColor }}
      onClick={onOpen}
    >
      <div className={styles.hTreeRowMain}>
        {expandable ? (
          <button
            type="button"
            className={styles.hTreeCaret}
            onClick={(e) => {
              e.stopPropagation();
              onToggle?.();
            }}
            aria-label={open ? "Collapse" : "Expand"}
          >
            {open ? <FaChevronDown /> : <FaChevronRight />}
          </button>
        ) : (
          <span className={styles.hTreeCaretPlaceholder} />
        )}
        <span className={styles.hTreeIcon}>{icon}</span>
        <span className={styles.hTreeTypeTag} style={{ background: `${typeColor}1A`, color: typeColor }}>
          {WORK_ITEM_TYPE_LABEL[task.workItemType || "task"]}
        </span>
        <span className={styles.hTreeTitle}>{task.title}</span>
        {countLabel && <span className={styles.hTreeCountInline}>{countLabel}</span>}
      </div>
      <div className={styles.hTreeRowMeta}>
        <StatusBadge status={task.status} />
        <PriorityBadge priority={task.priority} />
        {task.dueDate && (
          <span className={styles.hTreeDate}>Due {fmtDate(task.dueDate)}</span>
        )}
        {(task.assignees || []).length > 0 && (
          <AvatarStack users={(task.assignees || []).map((a) => ({ ...a, _id: a.user }))} max={3} />
        )}
        {rightSlot}
      </div>
    </div>
  );
}

function EmptyChild({ depth, text }) {
  return (
    <div className={styles.hTreeChildEmpty} style={{ paddingLeft: 8 + depth * 22 }}>
      {text}
    </div>
  );
}
