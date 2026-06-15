import React, { useEffect, useMemo, useState } from "react";
import {
  FaTimes, FaTrash, FaPlus, FaCheckCircle, FaExclamationTriangle,
  FaLink, FaUserPlus, FaTag,
} from "react-icons/fa";
import styles from "./pm.module.css";
import {
  pm,
  STATUSES,
  PRIORITIES,
  WORK_ITEM_TYPES,
  WORK_ITEM_TYPE_LABEL,
  WORK_ITEM_TYPE_COLOR,
  ALLOWED_PARENT_TYPE,
  fmtDateLong,
} from "./pmApi";
import { StatusBadge, PriorityBadge, TagBadge } from "./Badges";
import Avatar, { AvatarStack } from "./Avatar";
import toast from "../Toaster/toast";

// Full task editor. Opens centered as a modal and writes
// changes back through the PM API. Designed to be the single
// place users add tags, change dates, assign people, edit
// dependencies, change status, and discuss in comments.
//
// Layout discipline:
//   - every field is wrapped in <div className={styles.modalField}>
//     (label-above-control, gap:6) so labels never collide with
//     their inputs;
//   - chip-style fields (tags / dependencies / assignees) use a
//     bordered chipRow with the badges *inside* it and a small
//     `chipBtn` add trigger that anchors a popover via
//     `popoverAnchor`, so the dropdown always appears below the
//     trigger and never overlaps the next field.
export default function TaskModal({ task, project, allTasks = [], onClose, onSaved, onDeleted }) {
  const isNew = !task?._id;
  const [draft, setDraft] = useState(() => normaliseDraft(task));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [warning, setWarning] = useState(null);
  const [confirmForce, setConfirmForce] = useState(false);
  const [newComment, setNewComment] = useState("");
  const [openMenu, setOpenMenu] = useState(null); // 'tags' | 'deps' | 'assignees' | null
  const [availability, setAvailability] = useState(null);

  useEffect(() => {
    setDraft(normaliseDraft(task));
    setError(null);
    setWarning(null);
    setConfirmForce(false);
    setOpenMenu(null);
  }, [task]);

  // Close any open popover when the user clicks elsewhere.
  useEffect(() => {
    if (!openMenu) return;
    const onDocClick = (e) => {
      if (!e.target.closest?.(`.${styles.popoverAnchor}`)) setOpenMenu(null);
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [openMenu]);

  // Background availability fetch for the assignee picker so we
  // can grey out members whose calendar is already full on the
  // task's planned date range.
  useEffect(() => {
    if (openMenu !== "assignees" || !project?.members?.length) return;
    if (!draft.startDate && !draft.dueDate) { setAvailability(null); return; }
    const users = project.members.map((m) => m.user?._id || m.user).join(",");
    pm.getAvailability({
      users,
      from: draft.startDate || draft.dueDate,
      to: draft.dueDate || draft.startDate,
    })
      .then((d) => setAvailability(d.availability || []))
      .catch(() => setAvailability(null));
  }, [openMenu, draft.startDate, draft.dueDate, project]);

  const availabilityById = useMemo(() => {
    const m = new Map();
    for (const a of availability || []) m.set(String(a.user._id), a);
    return m;
  }, [availability]);

  const taskById = useMemo(() => {
    const m = new Map();
    for (const t of allTasks) m.set(String(t._id), t);
    return m;
  }, [allTasks]);

  const set = (patch) => setDraft((d) => ({ ...d, ...patch }));

  const toggleAssignee = (memberUser) => {
    const id = String(memberUser._id || memberUser.user?._id || memberUser.user);
    const present = draft.assignees.some((a) => String(a.user) === id);
    if (present) {
      set({ assignees: draft.assignees.filter((a) => String(a.user) !== id) });
    } else {
      set({
        assignees: [
          ...draft.assignees,
          {
            user: memberUser._id || memberUser.user?._id || memberUser.user,
            name: memberUser.name || memberUser.user?.name,
            email: memberUser.email || memberUser.user?.email,
            profilePicture: memberUser.profilePicture || memberUser.user?.profilePicture,
          },
        ],
      });
    }
  };

  const toggleTag = (tag) => {
    const present = draft.tags.some((t) => t.name === tag.name);
    if (present) set({ tags: draft.tags.filter((t) => t.name !== tag.name) });
    else set({ tags: [...draft.tags, { name: tag.name, color: tag.color }] });
  };

  const toggleDep = (otherId) => {
    const id = String(otherId);
    const present = draft.dependencies.some((d) => String(d) === id);
    if (present) set({ dependencies: draft.dependencies.filter((d) => String(d) !== id) });
    else set({ dependencies: [...draft.dependencies, otherId] });
  };

  const removeAssignee = (id) =>
    set({ assignees: draft.assignees.filter((a) => String(a.user) !== String(id)) });
  const removeTag = (name) =>
    set({ tags: draft.tags.filter((t) => t.name !== name) });
  const removeDep = (id) =>
    set({ dependencies: draft.dependencies.filter((d) => String(d) !== String(id)) });

  const buildPayload = () => {
    const type = draft.workItemType || "task";
    const isTask = type === "task";
    return {
      title: draft.title.trim(),
      description: draft.description,
      project: project._id,
      // Epics & stories derive their status from children — the
      // backend ignores any incoming `status` for containers but
      // we omit it on the wire as well to keep payloads honest.
      ...(isTask ? { status: draft.status } : {}),
      priority: draft.priority,
      tags: draft.tags,
      assignees: draft.assignees.map((a) => ({ user: a.user })),
      startDate: draft.startDate || null,
      dueDate: draft.dueDate || null,
      // Hours / dependencies only carry meaning for actual tasks;
      // strip them on epics & stories so old values can't leak in
      // after a type change.
      estimatedHours: isTask ? Number(draft.estimatedHours) || 0 : 0,
      actualHours: isTask ? Number(draft.actualHours) || 0 : 0,
      dependencies: isTask ? draft.dependencies : [],
      workItemType: type,
      // Empty string means "no parent" — the backend handles the
      // unset for us.
      parent: draft.parent || null,
    };
  };

  const save = async ({ force = false } = {}) => {
    if (!draft.title.trim()) { setError("Title is required"); return; }
    setSaving(true);
    setError(null);
    setWarning(null);
    try {
      const payload = buildPayload();
      const res = isNew
        ? await pm.createTask(payload, { force })
        : await pm.updateTask(task._id, payload, { force });
      toast.success(isNew ? "Task created" : "Task updated");
      onSaved?.(res.task);
      onClose?.();
    } catch (err) {
      if (err.code === "WORKLOAD_EXCEEDED" || err.code === "DEPENDENCY_BLOCKED") {
        setWarning(err.message);
        setConfirmForce(true);
      } else {
        setError(err.message || "Failed to save");
      }
    } finally {
      setSaving(false);
    }
  };

  const onAddComment = async () => {
    const body = newComment.trim();
    if (!body || !task?._id) return;
    try {
      const res = await pm.addComment(task._id, { body });
      onSaved?.(res.task);
      setNewComment("");
    } catch (err) {
      toast.error(err.message || "Failed to add comment");
    }
  };

  const onDelete = async () => {
    if (!task?._id) return;
    if (!window.confirm("Delete this task? This cannot be undone.")) return;
    try {
      await pm.deleteTask(task._id);
      toast.success("Task deleted");
      onDeleted?.(task._id);
      onClose?.();
    } catch (err) {
      toast.error(err.message || "Failed to delete");
    }
  };

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modalWindow} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <div className={styles.modalTitleRow}>
            <span
              className={styles.modalTitle}
              style={{
                color: WORK_ITEM_TYPE_COLOR[draft.workItemType] || undefined,
              }}
            >
              {isNew ? "New " : "Edit "}
              {WORK_ITEM_TYPE_LABEL[draft.workItemType] || "Task"}
            </span>
            <StatusBadge status={draft.status} />
            <PriorityBadge priority={draft.priority} />
          </div>
          <button className={styles.modalCloseBtn} onClick={onClose} aria-label="Close">
            <FaTimes />
          </button>
        </div>

        <div className={styles.modalBody}>
          {/* ----- left column ----- */}
          <div className={styles.modalSection}>
            <div className={styles.modalField}>
              <input
                className={styles.titleInput}
                placeholder="Task title"
                value={draft.title}
                onChange={(e) => set({ title: e.target.value })}
              />
            </div>

            <div className={styles.modalField}>
              <label className={styles.modalLabel}>Description</label>
              <textarea
                className={styles.textarea}
                placeholder="Describe what needs to be done..."
                value={draft.description}
                onChange={(e) => set({ description: e.target.value })}
              />
            </div>

            {/* Tags */}
            <div className={styles.modalField}>
              <label className={styles.modalLabel}>Tags</label>
              <div className={styles.chipRow}>
                {draft.tags.map((t) => (
                  <span
                    key={t.name}
                    onClick={() => removeTag(t.name)}
                    title="Click to remove"
                    style={{ cursor: "pointer" }}
                  >
                    <TagBadge tag={t} />
                  </span>
                ))}
                <span className={styles.popoverAnchor}>
                  <button
                    type="button"
                    className={styles.chipBtn}
                    onClick={() => setOpenMenu(openMenu === "tags" ? null : "tags")}
                  >
                    <FaTag /> Tag
                  </button>
                  {openMenu === "tags" && (
                    <div className={styles.popover}>
                      {(project?.tags || []).length === 0 ? (
                        <div className={styles.popoverEmpty}>
                          No tags yet — add some on the Tags tab.
                        </div>
                      ) : (
                        (project?.tags || []).map((t) => {
                          const active = draft.tags.some((d) => d.name === t.name);
                          return (
                            <div
                              key={t.name}
                              className={styles.popoverItem}
                              onClick={() => toggleTag(t)}
                            >
                              <span className={styles.dot} style={{ background: t.color }} />
                              <span style={{ flex: 1 }}>{t.name}</span>
                              {active && <FaCheckCircle style={{ color: "#16a34a" }} />}
                            </div>
                          );
                        })
                      )}
                    </div>
                  )}
                </span>
              </div>
            </div>

            {/* Dependencies — only meaningful for tasks. Epics
                and stories are containers, so we hide the
                predecessor picker to keep the modal focused on
                what actually applies to them. */}
            {draft.workItemType === "task" && (
            <div className={styles.modalField}>
              <label className={styles.modalLabel}>Depends on</label>
              <div className={styles.chipRow}>
                {draft.dependencies.map((depId) => {
                  const t = taskById.get(String(depId));
                  if (!t) return null;
                  const done = t.status === "Done";
                  return (
                    <span
                      key={depId}
                      className={styles.tagBadge}
                      style={{
                        background: done ? "#dcfce7" : "#fef3c7",
                        color: done ? "#065f46" : "#92400e",
                        borderColor: done ? "#86efac" : "#fde68a",
                        cursor: "pointer",
                      }}
                      title={`${done ? "Done" : "Not done yet"} — click to remove`}
                      onClick={() => removeDep(depId)}
                    >
                      <FaLink /> {t.title}
                    </span>
                  );
                })}
                <span className={styles.popoverAnchor}>
                  <button
                    type="button"
                    className={styles.chipBtn}
                    onClick={() => setOpenMenu(openMenu === "deps" ? null : "deps")}
                  >
                    <FaPlus /> Add
                  </button>
                  {openMenu === "deps" && (
                    <div className={styles.popover}>
                      {allTasks.filter((t) => !task || String(t._id) !== String(task._id)).length === 0 ? (
                        <div className={styles.popoverEmpty}>
                          No other tasks on this project yet.
                        </div>
                      ) : (
                        allTasks
                          .filter((t) => !task || String(t._id) !== String(task._id))
                          .map((t) => {
                            const active = draft.dependencies.some((d) => String(d) === String(t._id));
                            return (
                              <div
                                key={t._id}
                                className={styles.popoverItem}
                                onClick={() => toggleDep(t._id)}
                              >
                                <StatusBadge status={t.status} />
                                <span style={{ flex: 1 }}>{t.title}</span>
                                {active && <FaCheckCircle style={{ color: "#16a34a" }} />}
                              </div>
                            );
                          })
                      )}
                    </div>
                  )}
                </span>
              </div>
            </div>
            )}

            {/* Comments (only on existing tasks) */}
            {!isNew && (
              <div className={styles.modalField}>
                <label className={styles.modalLabel}>Comments</label>
                <div className={styles.commentList}>
                  {(task?.comments || []).length === 0 ? (
                    <div className={styles.popoverEmpty} style={{ background: "#f9fafb", border: "1px dashed #e5e7eb", borderRadius: 8 }}>
                      No comments yet — kick things off.
                    </div>
                  ) : (
                    (task?.comments || []).slice().reverse().map((c) => (
                      <div key={c._id} className={styles.commentRow}>
                        <Avatar size="sm" user={{ name: c.authorName }} />
                        <div className={styles.commentBubble}>
                          <div className={styles.commentMeta}>
                            {c.authorName || "User"} · {new Date(c.createdAt).toLocaleString()}
                          </div>
                          {c.body}
                        </div>
                      </div>
                    ))
                  )}
                </div>
                <div className={styles.commentForm}>
                  <input
                    className={styles.input}
                    placeholder="Add a comment..."
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") onAddComment(); }}
                  />
                  <button className={styles.primaryBtn} onClick={onAddComment}>Post</button>
                </div>
              </div>
            )}
          </div>

          {/* ----- right column (meta) ----- */}
          <div className={styles.modalSection}>
            <div className={styles.modalRow2}>
              <div className={styles.modalField}>
                <label className={styles.modalLabel}>Type</label>
                <select
                  className={styles.select}
                  value={draft.workItemType}
                  onChange={(e) => {
                    const nextType = e.target.value;
                    // Clear an incompatible parent when the type
                    // changes so the user notices they need to
                    // pick one of the new allowed parents.
                    const allowedParent = ALLOWED_PARENT_TYPE[nextType];
                    const parentTask = draft.parent ? taskById.get(String(draft.parent)) : null;
                    const parentOk =
                      !draft.parent ||
                      (allowedParent && parentTask?.workItemType === allowedParent);
                    set({
                      workItemType: nextType,
                      parent: parentOk ? draft.parent : "",
                    });
                  }}
                  style={{ color: WORK_ITEM_TYPE_COLOR[draft.workItemType] }}
                >
                  {WORK_ITEM_TYPES.map((t) => (
                    <option key={t} value={t}>{WORK_ITEM_TYPE_LABEL[t]}</option>
                  ))}
                </select>
              </div>
              <div className={styles.modalField}>
                <label className={styles.modalLabel}>Parent</label>
                {(() => {
                  const allowedParentType = ALLOWED_PARENT_TYPE[draft.workItemType];
                  const candidates = (allTasks || []).filter(
                    (t) =>
                      t.workItemType === allowedParentType &&
                      String(t._id) !== String(task?._id || "")
                  );
                  return (
                    <select
                      className={styles.select}
                      value={draft.parent || ""}
                      onChange={(e) => set({ parent: e.target.value })}
                      disabled={!allowedParentType}
                      title={
                        allowedParentType
                          ? `Pick a ${allowedParentType} as parent`
                          : "Epics cannot have a parent"
                      }
                    >
                      <option value="">
                        {allowedParentType
                          ? `No parent (${WORK_ITEM_TYPE_LABEL[draft.workItemType]} at root)`
                          : "—"}
                      </option>
                      {candidates.map((c) => (
                        <option key={c._id} value={c._id}>{c.title}</option>
                      ))}
                    </select>
                  );
                })()}
              </div>
            </div>

            <div className={styles.modalRow2}>
              <div className={styles.modalField}>
                <label className={styles.modalLabel}>Status</label>
                {draft.workItemType === "task" ? (
                  <select
                    className={styles.select}
                    value={draft.status}
                    onChange={(e) => set({ status: e.target.value })}
                  >
                    {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                ) : (
                  <div
                    className={styles.derivedStatusBox}
                    title={`A ${draft.workItemType}'s status is rolled up from its ${draft.workItemType === "epic" ? "stories" : "tasks"}.`}
                  >
                    <StatusBadge status={draft.status} />
                    <span className={styles.memberMeta}>
                      Auto from {draft.workItemType === "epic" ? "stories" : "tasks"}
                    </span>
                  </div>
                )}
              </div>
              <div className={styles.modalField}>
                <label className={styles.modalLabel}>Priority</label>
                <select
                  className={styles.select}
                  value={draft.priority}
                  onChange={(e) => set({ priority: e.target.value })}
                >
                  {PRIORITIES.map((p) => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
            </div>

            <div className={styles.modalRow2}>
              <div className={styles.modalField}>
                <label className={styles.modalLabel}>Start</label>
                <input
                  type="date"
                  className={styles.input}
                  value={draft.startDate || ""}
                  onChange={(e) => set({ startDate: e.target.value })}
                />
              </div>
              <div className={styles.modalField}>
                <label className={styles.modalLabel}>Due</label>
                <input
                  type="date"
                  className={styles.input}
                  value={draft.dueDate || ""}
                  onChange={(e) => set({ dueDate: e.target.value })}
                />
              </div>
            </div>

            {/* Hours tracking only applies to tasks — epics and
                stories roll up their child task hours instead of
                holding their own estimate / logged values. */}
            {draft.workItemType === "task" && (
              <div className={styles.modalRow2}>
                <div className={styles.modalField}>
                  <label className={styles.modalLabel}>Estimate (h)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.5"
                    className={styles.input}
                    value={draft.estimatedHours}
                    onChange={(e) => set({ estimatedHours: e.target.value })}
                  />
                </div>
                <div className={styles.modalField}>
                  <label className={styles.modalLabel}>Logged (h)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.5"
                    className={styles.input}
                    value={draft.actualHours}
                    onChange={(e) => set({ actualHours: e.target.value })}
                  />
                </div>
              </div>
            )}

            <div className={styles.modalField}>
              <label className={styles.modalLabel}>Assignees</label>
              <div className={styles.chipRow}>
                {draft.assignees.length === 0 ? null : (
                  draft.assignees.map((a) => (
                    <span
                      key={a.user}
                      onClick={() => removeAssignee(a.user)}
                      title={`Click to remove ${a.name || a.email}`}
                      style={{ cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 4 }}
                    >
                      <Avatar size="sm" user={a} />
                    </span>
                  ))
                )}
                <span className={styles.popoverAnchor}>
                  <button
                    type="button"
                    className={styles.chipBtn}
                    onClick={() => setOpenMenu(openMenu === "assignees" ? null : "assignees")}
                  >
                    <FaUserPlus /> Assign
                  </button>
                  {openMenu === "assignees" && (
                    <div className={`${styles.popover} ${styles.right}`}>
                      {(project?.members || []).length === 0 ? (
                        <div className={styles.popoverEmpty}>
                          No members on this project yet. Add them from the Team tab.
                        </div>
                      ) : (
                        (project?.members || []).map((m) => {
                          const u = m.user || {};
                          const uid = String(u._id || m.user);
                          const a = availabilityById.get(uid);
                          const overloaded = (a?.overloadedDays || []).length > 0;
                          const active = draft.assignees.some((x) => String(x.user) === uid);
                          return (
                            <div
                              key={uid}
                              className={`${styles.popoverItem} ${overloaded && !active ? styles.disabled : ""}`}
                              onClick={() => {
                                if (overloaded && !active && !window.confirm(`${u.name || "This user"} is already at capacity on the chosen day(s). Assign anyway?`)) return;
                                toggleAssignee(u);
                              }}
                              title={a ? `${a.availableHours.toFixed(1)}h available / ${a.user.capacity}h/day` : ""}
                            >
                              <Avatar size="sm" user={u} />
                              <span style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                  {u.name || u.email}
                                </div>
                                {a && (
                                  <div className={styles.memberMeta}>
                                    {overloaded
                                      ? `Full on ${a.overloadedDays.length} day(s)`
                                      : `${a.availableHours.toFixed(1)}h free`}
                                  </div>
                                )}
                              </span>
                              {active && <FaCheckCircle style={{ color: "#16a34a" }} />}
                            </div>
                          );
                        })
                      )}
                    </div>
                  )}
                </span>
              </div>
            </div>

            {!isNew && task?.createdAt && (
              <div className={styles.memberMeta}>
                Created {fmtDateLong(task.createdAt)}
                {task.completedAt && ` · Completed ${fmtDateLong(task.completedAt)}`}
              </div>
            )}
          </div>
        </div>

        {error && <div className={styles.errorBanner}><FaExclamationTriangle /> {error}</div>}
        {warning && <div className={styles.warningBanner}><FaExclamationTriangle /> {warning}</div>}

        <div className={styles.modalFooter}>
          <div>
            {!isNew && (
              <button className={styles.dangerBtn} onClick={onDelete}>
                <FaTrash /> Delete
              </button>
            )}
          </div>
          <div className={styles.modalFooterRight}>
            <button className={styles.ghostBtn} onClick={onClose}>Cancel</button>
            {confirmForce && (
              <button
                className={styles.dangerBtn}
                onClick={() => save({ force: true })}
                disabled={saving}
                title="Save despite the warning above"
              >
                Save anyway
              </button>
            )}
            <button className={styles.primaryBtn} onClick={() => save()} disabled={saving}>
              {saving ? "Saving..." : isNew ? "Create Task" : "Save Changes"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function normaliseDraft(task) {
  return {
    title: task?.title || "",
    description: task?.description || "",
    status: task?.status || "To Do",
    priority: task?.priority || "Medium",
    tags: task?.tags || [],
    assignees: (task?.assignees || []).map((a) => ({
      user: a.user?._id || a.user,
      name: a.name,
      email: a.email,
      profilePicture: a.profilePicture,
    })),
    startDate: task?.startDate ? new Date(task.startDate).toISOString().slice(0, 10) : "",
    dueDate: task?.dueDate ? new Date(task.dueDate).toISOString().slice(0, 10) : "",
    estimatedHours: task?.estimatedHours ?? 4,
    actualHours: task?.actualHours ?? 0,
    dependencies: (task?.dependencies || []).map((d) => d?._id || d),
    workItemType: task?.workItemType || "task",
    parent: task?.parent ? (task.parent._id || task.parent) : "",
  };
}
