import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  FaTimes, FaTrash, FaPlus, FaCheckCircle, FaExclamationTriangle,
  FaLink, FaUserPlus, FaTag, FaPaperclip, FaDownload,
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
import Select from "../Select/Select";

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

  // Local mirror of the task's attachment list so we can show
  // optimistic adds / removes without waiting for the parent to
  // refetch and replace `task`. Reseeded from props whenever the
  // task changes (after onSaved triggers a refetch upstream).
  const [attachments, setAttachments] = useState(task?.attachments || []);
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef(null);
  const attachmentZoneRef = useRef(null);

  useEffect(() => {
    setDraft(normaliseDraft(task));
    setAttachments(task?.attachments || []);
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

  // Date <-> duration linkage helpers.
  //
  // The "Duration" input lets users type how many calendar days
  // the task should span. We treat duration as *inclusive*:
  //   duration = (due - start) + 1
  // so a task with start = due is 1 day long, matching how PM
  // tools like MS Project and Jira advanced roadmaps display it.
  //
  // Behaviour of the three fields when the user changes one:
  //   - change Start:
  //       * if duration is set → recompute Due from Start + duration
  //       * else if Due is set → recompute duration from Start/Due
  //   - change Due:
  //       * if Start is set → recompute duration from Start/Due
  //       * else if duration is set → recompute Start = Due - duration
  //       * else → Start = today, duration = due - today + 1
  //   - change Duration:
  //       * if Start is set → Due = Start + (duration - 1)
  //       * else if Due is set → Start = Due - (duration - 1)
  //       * else → Start = today, Due = today + (duration - 1)
  const onChangeStartDate = (value) => {
    const patch = { startDate: value };
    if (!value) { setDraft((d) => ({ ...d, ...patch })); return; }
    const days = Number(draft.durationDays);
    if (Number.isFinite(days) && days > 0) {
      patch.dueDate = addDaysToISO(value, days - 1);
    } else if (draft.dueDate) {
      const diff = diffDaysInclusive(value, draft.dueDate);
      if (diff > 0) patch.durationDays = String(diff);
    }
    setDraft((d) => ({ ...d, ...patch }));
  };

  const onChangeDueDate = (value) => {
    const patch = { dueDate: value };
    if (!value) { setDraft((d) => ({ ...d, ...patch })); return; }
    if (draft.startDate) {
      const diff = diffDaysInclusive(draft.startDate, value);
      if (diff > 0) patch.durationDays = String(diff);
    } else {
      const days = Number(draft.durationDays);
      if (Number.isFinite(days) && days > 0) {
        patch.startDate = addDaysToISO(value, -(days - 1));
      } else {
        const today = todayISO();
        patch.startDate = today;
        const diff = diffDaysInclusive(today, value);
        if (diff > 0) patch.durationDays = String(diff);
      }
    }
    setDraft((d) => ({ ...d, ...patch }));
  };

  const onChangeDuration = (value) => {
    const patch = { durationDays: value };
    const days = Number(value);
    if (!value || !Number.isFinite(days) || days <= 0) {
      setDraft((d) => ({ ...d, ...patch }));
      return;
    }
    if (draft.startDate) {
      patch.dueDate = addDaysToISO(draft.startDate, days - 1);
    } else if (draft.dueDate) {
      patch.startDate = addDaysToISO(draft.dueDate, -(days - 1));
    } else {
      const today = todayISO();
      patch.startDate = today;
      patch.dueDate = addDaysToISO(today, days - 1);
    }
    setDraft((d) => ({ ...d, ...patch }));
  };

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

  // ---- attachments ----
  // Brand-new tasks have no _id yet, so we can't upload to a
  // task that doesn't exist. We disable upload UI in that case
  // and tell the user to save first; this keeps the contract
  // simple (one round-trip per file, no client-side staging
  // bucket).
  const canUpload = !!task?._id && !uploading;

  const uploadFiles = async (files) => {
    if (!task?._id || !files?.length) return;
    setUploading(true);
    try {
      for (const file of files) {
        const res = await pm.addAttachment(task._id, file);
        if (res?.task) {
          setAttachments(res.task.attachments || []);
          // Propagate so parent lists (kanban / hierarchy) can
          // refresh badges if they show attachment counts.
          onSaved?.(res.task);
        }
      }
    } catch (err) {
      toast.error(err.message || "Failed to upload attachment");
    } finally {
      setUploading(false);
    }
  };

  const removeAttachment = async (attachmentId) => {
    if (!task?._id) return;
    if (!window.confirm("Remove this attachment?")) return;
    try {
      const res = await pm.removeAttachment(task._id, attachmentId);
      if (res?.task) {
        setAttachments(res.task.attachments || []);
        onSaved?.(res.task);
      }
    } catch (err) {
      toast.error(err.message || "Failed to remove attachment");
    }
  };

  const onFilePick = (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length) uploadFiles(files);
    // Reset so picking the same file twice in a row still fires.
    e.target.value = "";
  };

  // Modal-wide paste handler. We *don't* swallow paste events
  // that target form inputs unless the clipboard contains an
  // actual file — that way typing Ctrl+V inside the description
  // still pastes text, but pasting a screenshot anywhere in the
  // modal uploads it as an attachment. Works alongside the
  // comment input's `onPaste` (handled inline below) which adds
  // the same behaviour while typing a comment.
  useEffect(() => {
    if (!task?._id) return;
    const onPaste = (e) => {
      const items = Array.from(e.clipboardData?.items || []);
      const files = items
        .filter((it) => it.kind === "file")
        .map((it) => it.getAsFile())
        .filter(Boolean);
      if (!files.length) return;
      e.preventDefault();
      uploadFiles(files);
    };
    document.addEventListener("paste", onPaste);
    return () => document.removeEventListener("paste", onPaste);
    // We intentionally only depend on the task id so the handler
    // stays bound for the modal's lifetime — uploadFiles closes
    // over current state via React but the dependency array
    // would otherwise re-bind on every keystroke.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [task?._id]);

  // Drag-drop on the attachment zone. `dragenter`/`dragleave`
  // toggle a visual highlight; the actual file extraction
  // happens on `drop`.
  const onDragOver = (e) => {
    if (!task?._id) return;
    e.preventDefault();
    e.stopPropagation();
    if (!dragActive) setDragActive(true);
  };
  const onDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    // Only clear the highlight when leaving the zone itself, not
    // when crossing into a nested chip element.
    if (e.target === attachmentZoneRef.current) setDragActive(false);
  };
  const onDrop = (e) => {
    if (!task?._id) return;
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    const files = Array.from(e.dataTransfer?.files || []);
    if (files.length) uploadFiles(files);
  };

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

            {/* Attachments — only on existing tasks because we
                need a saved task id to POST against. Save first,
                then upload. The zone listens for drag-drop, the
                Attach button opens the OS file picker, and the
                document-wide paste handler (see useEffect above)
                catches Ctrl+V anywhere in the modal so the user
                can drop a screenshot in mid-sentence and have
                it attach automatically. */}
            {!isNew && (
              <div className={styles.modalField}>
                <label className={styles.modalLabel}>Attachments</label>
                <div
                  ref={attachmentZoneRef}
                  className={`${styles.attachmentZone} ${dragActive ? styles.attachmentZoneActive : ""}`}
                  onDragOver={onDragOver}
                  onDragEnter={onDragOver}
                  onDragLeave={onDragLeave}
                  onDrop={onDrop}
                >
                  <div className={styles.attachmentHint}>
                    <span>
                      <FaPaperclip style={{ marginRight: 6 }} />
                      Drop files here, paste a screenshot (Ctrl+V), or
                    </span>
                    <span style={{ display: "inline-flex", gap: 8, alignItems: "center" }}>
                      <button
                        type="button"
                        className={styles.chipBtn}
                        onClick={() => fileInputRef.current?.click()}
                        disabled={!canUpload}
                      >
                        <FaPlus /> {uploading ? "Uploading…" : "Attach file"}
                      </button>
                      <input
                        ref={fileInputRef}
                        type="file"
                        multiple
                        style={{ display: "none" }}
                        onChange={onFilePick}
                      />
                    </span>
                  </div>

                  {attachments.length === 0 ? (
                    <div className={styles.attachmentEmpty}>
                      Nothing attached yet.
                    </div>
                  ) : (
                    <div className={styles.attachmentList}>
                      {attachments.map((a) => (
                        <AttachmentChip
                          key={a._id}
                          attachment={a}
                          onRemove={() => removeAttachment(a._id)}
                        />
                      ))}
                    </div>
                  )}
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
                <Select
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
                </Select>
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
                    <Select
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
                    </Select>
                  );
                })()}
              </div>
            </div>

            <div className={styles.modalRow2}>
              <div className={styles.modalField}>
                <label className={styles.modalLabel}>Status</label>
                {draft.workItemType === "task" ? (
                  <Select
                    className={styles.select}
                    value={draft.status}
                    onChange={(e) => set({ status: e.target.value })}
                  >
                    {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                  </Select>
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
                <Select
                  className={styles.select}
                  value={draft.priority}
                  onChange={(e) => set({ priority: e.target.value })}
                >
                  {PRIORITIES.map((p) => <option key={p} value={p}>{p}</option>)}
                </Select>
              </div>
            </div>

            <div className={styles.modalRow3}>
              <div className={styles.modalField}>
                <label className={styles.modalLabel}>Start</label>
                <input
                  type="date"
                  className={styles.input}
                  value={draft.startDate || ""}
                  onChange={(e) => onChangeStartDate(e.target.value)}
                />
              </div>
              <div className={styles.modalField}>
                <label className={styles.modalLabel}>Due</label>
                <input
                  type="date"
                  className={styles.input}
                  value={draft.dueDate || ""}
                  onChange={(e) => onChangeDueDate(e.target.value)}
                />
              </div>
              <div className={styles.modalField}>
                <label className={styles.modalLabel}>Days</label>
                <input
                  type="number"
                  min="1"
                  step="1"
                  className={styles.input}
                  placeholder="e.g. 5"
                  value={draft.durationDays}
                  onChange={(e) => onChangeDuration(e.target.value)}
                  title="How many calendar days this task spans (inclusive). Auto-syncs Start and Due."
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

// Visual chip for a single attachment. Shows a thumbnail for
// images (Supabase URLs are publicly fetchable), an uppercase
// extension badge for everything else, the filename, a size
// hint, and a remove button. Clicking the filename downloads /
// opens the file via the Supabase public URL.
function AttachmentChip({ attachment, onRemove }) {
  const isImage = (attachment.mimeType || "").startsWith("image/");
  const ext = ((attachment.filename || "").split(".").pop() || "file").slice(0, 4);
  const sizeKb = attachment.size ? Math.max(1, Math.round(attachment.size / 1024)) : null;
  return (
    <div className={styles.attachmentChip} title={attachment.filename}>
      {isImage ? (
        <img className={styles.attachmentChipThumb} src={attachment.url} alt="" />
      ) : (
        <span className={styles.attachmentChipIcon}>{ext}</span>
      )}
      <div className={styles.attachmentChipMeta}>
        <a href={attachment.url} target="_blank" rel="noreferrer noopener">
          <FaDownload style={{ marginRight: 4, fontSize: 10 }} />
          {attachment.filename}
        </a>
        {sizeKb && <small>{sizeKb} KB</small>}
      </div>
      <button
        type="button"
        className={styles.attachmentChipRemove}
        onClick={onRemove}
        title="Remove attachment"
      >
        <FaTimes />
      </button>
    </div>
  );
}

function normaliseDraft(task) {
  const startDate = task?.startDate ? new Date(task.startDate).toISOString().slice(0, 10) : "";
  const dueDate = task?.dueDate ? new Date(task.dueDate).toISOString().slice(0, 10) : "";
  // Seed the duration field so opening an existing task shows
  // the inclusive number of calendar days between start & due.
  const initialDuration =
    startDate && dueDate ? String(Math.max(1, diffDaysInclusive(startDate, dueDate))) : "";
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
    startDate,
    dueDate,
    durationDays: initialDuration,
    estimatedHours: task?.estimatedHours ?? 4,
    actualHours: task?.actualHours ?? 0,
    dependencies: (task?.dependencies || []).map((d) => d?._id || d),
    workItemType: task?.workItemType || "task",
    parent: task?.parent ? (task.parent._id || task.parent) : "",
  };
}

// ---- date helpers ----
// We work in local "YYYY-MM-DD" strings throughout the modal so
// arithmetic doesn't accidentally shift days across timezones
// (the native <input type="date"> emits exactly this format).
function todayISO() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function addDaysToISO(iso, days) {
  if (!iso) return iso;
  const [y, m, d] = iso.split("-").map(Number);
  const date = new Date(y, (m || 1) - 1, d || 1);
  date.setDate(date.getDate() + Number(days || 0));
  const yy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return `${yy}-${mm}-${dd}`;
}

// Inclusive difference in calendar days between two ISO dates:
// diffDaysInclusive("2024-01-01", "2024-01-01") === 1
// diffDaysInclusive("2024-01-01", "2024-01-05") === 5
function diffDaysInclusive(startISO, endISO) {
  if (!startISO || !endISO) return 0;
  const [sy, sm, sd] = startISO.split("-").map(Number);
  const [ey, em, ed] = endISO.split("-").map(Number);
  const s = new Date(sy, (sm || 1) - 1, sd || 1);
  const e = new Date(ey, (em || 1) - 1, ed || 1);
  const ms = e.getTime() - s.getTime();
  return Math.round(ms / (1000 * 60 * 60 * 24)) + 1;
}
