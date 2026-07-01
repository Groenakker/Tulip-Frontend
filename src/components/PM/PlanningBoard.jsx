import React, { useEffect, useMemo, useState } from "react";
import { FaCalendarDay, FaInbox, FaTimes, FaTrash, FaUndo } from "react-icons/fa";
import styles from "./PlanningBoard.module.css";
import { pm, PRIORITY_COLORS, STATUS_COLORS, isoDay } from "./pmApi";
import toast from "../Toaster/toast";

// "My Workload" planning board.
//
// One column per business day in the requested window, plus a
// fixed "Unplanned" column on the left containing every task
// assigned to the current user that hasn't been explicitly
// dragged onto a day yet (i.e. has no workPlan entries for
// this user).
//
// Drag a task chip from Unplanned onto a day → the backend
// writes a workPlan entry for the user (default hours =
// remaining unplanned hours, capped at the user's daily
// capacity). Drag a chip between days → moves the entry. Drag
// onto the trash zone → unplans the task for that day.
//
// All writes go through pm.updateWorkPlan, which replaces the
// CURRENT user's full slice of workPlan in one call. We always
// send the canonical full set so an interrupted drag never
// leaves a partial state on the server.
export default function PlanningBoard({
  events,           // array of task events from /workload (each has workPlan[])
  byDay,            // map of YYYY-MM-DD -> { hours, tasks } for the heatmap totals
  from,             // Date or ISO
  to,               // Date or ISO
  capacity,         // user's daily capacity in hours
  onChanged,        // () => Promise<void> — called after any successful write
}) {
  // Local cache keyed by taskId so we can do optimistic
  // updates without waiting for the parent to refetch. The
  // parent refetch on `onChanged` then re-syncs us.
  const [planCache, setPlanCache] = useState(() => buildCache(events));
  // (drop target highlight tracking)
  const [dragOverKey, setDragOverKey] = useState(null);
  const [dragOverTrash, setDragOverTrash] = useState(false);
  const [busyTaskId, setBusyTaskId] = useState(null);

  // Re-sync the local cache whenever the parent gives us a
  // fresh `events` array (after a refetch / capacity change).
  useEffect(() => { setPlanCache(buildCache(events)); }, [events]);

  // Build the day axis (weekdays only — weekend planning is a
  // power-user feature we can add later if asked).
  const days = useMemo(() => {
    const start = new Date(from);
    const end = new Date(to);
    start.setHours(0, 0, 0, 0);
    end.setHours(0, 0, 0, 0);
    const out = [];
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const dow = d.getDay();
      if (dow === 0 || dow === 6) continue; // skip weekends
      out.push(new Date(d));
    }
    return out;
  }, [from, to]);

  // Derive: for each task, the per-day planned hours and
  // total. Used by both the day columns and the unplanned list.
  const planByTask = useMemo(() => {
    const out = {};
    for (const t of events) {
      const cached = planCache[t._id];
      const entries = cached ?? (t.workPlan || []);
      out[t._id] = {
        entries,
        total: entries.reduce((s, e) => s + (Number(e.hours) || 0), 0),
      };
    }
    return out;
  }, [events, planCache]);

  // Tasks the user hasn't planned at all (or that still have
  // remaining hours below their estimate). We show "remaining"
  // hours on the chip so the user knows what's left to slot in.
  const unplanned = useMemo(() => {
    const open = events.filter((e) => e.status !== "Done");
    return open
      .map((t) => {
        const { total } = planByTask[t._id] || { total: 0 };
        const remaining = Math.max(
          0,
          Number((Number(t.estimatedHours || 0) - total).toFixed(2))
        );
        return { ...t, planned: total, remaining };
      })
      .filter((t) => t.remaining > 0 || t.planned === 0)
      .sort((a, b) => {
        // Soonest due date first, then highest remaining hours.
        const da = a.dueDate ? new Date(a.dueDate).getTime() : Infinity;
        const db = b.dueDate ? new Date(b.dueDate).getTime() : Infinity;
        if (da !== db) return da - db;
        return b.remaining - a.remaining;
      });
  }, [events, planByTask]);

  // Per-day chips, derived from planByTask. Each chip carries
  // the task id, hours, and the day it lives on so the drop
  // handler can move it cleanly.
  const dayChips = useMemo(() => {
    const out = {};
    for (const d of days) out[isoDay(d)] = [];
    for (const t of events) {
      const { entries } = planByTask[t._id] || { entries: [] };
      for (const e of entries) {
        const k = isoDay(e.date);
        if (!(k in out)) continue;
        out[k].push({ task: t, date: k, hours: Number(e.hours) || 0 });
      }
    }
    // Stable ordering: project then title.
    for (const k of Object.keys(out)) {
      out[k].sort((a, b) => (a.task.title || "").localeCompare(b.task.title || ""));
    }
    return out;
  }, [events, planByTask, days]);

  // ----------------------------------------------------------
  // Persistence — every drop / hours-tweak goes through here.
  // We rewrite the FULL plan for the affected task because the
  // backend endpoint takes the whole slice (atomic + idempotent).
  // ----------------------------------------------------------
  const persistTaskPlan = async (taskId, entries) => {
    setBusyTaskId(taskId);
    // Optimistic update so the UI moves instantly.
    setPlanCache((c) => ({ ...c, [taskId]: entries.map((e) => ({ ...e })) }));
    try {
      const res = await pm.updateWorkPlan(taskId, entries);
      setPlanCache((c) => ({ ...c, [taskId]: res.workPlan || [] }));
      onChanged?.();
    } catch (err) {
      toast.error(err.message || "Failed to save plan");
      // Roll back to whatever was on the event last.
      const t = events.find((x) => x._id === taskId);
      setPlanCache((c) => ({ ...c, [taskId]: t?.workPlan || [] }));
    } finally {
      setBusyTaskId(null);
    }
  };

  // Helper: produce the new entries list for "add task X on day Y with H hours,
  // removing any prior entry it had on day Y".
  const upsertEntry = (taskId, dateKey, hours) => {
    const current = planByTask[taskId]?.entries || [];
    const filtered = current.filter((e) => isoDay(e.date) !== dateKey);
    if (hours > 0) filtered.push({ date: dateKey, hours });
    return filtered;
  };

  const removeEntry = (taskId, dateKey) =>
    (planByTask[taskId]?.entries || []).filter((e) => isoDay(e.date) !== dateKey);

  // ----------------------------------------------------------
  // Drag / drop handlers
  // ----------------------------------------------------------
  // Data shape on dataTransfer: JSON-encoded { taskId, fromDate?, hours? }.
  // fromDate is undefined when dragging from the Unplanned column.
  const startDrag = (e, payload) => {
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("application/json", JSON.stringify(payload));
  };

  const handleDropOnDay = async (e, dateKey) => {
    e.preventDefault();
    setDragOverKey(null);
    const raw = e.dataTransfer.getData("application/json");
    if (!raw) return;
    let payload;
    try { payload = JSON.parse(raw); } catch { return; }
    const { taskId, fromDate, hours: dragHours } = payload;
    if (!taskId) return;

    const task = events.find((t) => t._id === taskId);
    if (!task) return;

    // No-op when a day chip is dropped onto its own column.
    if (fromDate && fromDate === dateKey) return;

    const current = planByTask[taskId]?.entries || [];
    const existingOnDay = current.find((x) => isoDay(x.date) === dateKey);
    const existingHoursOnDay = Number(existingOnDay?.hours) || 0;

    // How many hours to add to the target day:
    //   - moving a day-chip: the chip's own hours;
    //   - promoting from Unplanned: remaining estimated hours
    //     capped at the user's daily capacity, falling back to
    //     1h when we have no estimate at all.
    let add;
    if (fromDate) {
      add = Number(dragHours) || 0;
    } else {
      const total = planByTask[taskId]?.total || 0;
      const remaining = Math.max(0, Number(task.estimatedHours || 0) - total);
      add = remaining > 0 ? Math.min(remaining, capacity || 8) : 1;
    }
    if (!Number.isFinite(add) || add <= 0) add = 1;

    // Start from the current entries, drop the source day if
    // this was a move, then accumulate onto the target day.
    const without = fromDate ? removeEntry(taskId, fromDate) : current;
    const next = [
      ...without.filter((e2) => isoDay(e2.date) !== dateKey),
      { date: dateKey, hours: existingHoursOnDay + add },
    ];
    await persistTaskPlan(taskId, next);
  };

  const handleDropOnUnplanned = async (e) => {
    e.preventDefault();
    setDragOverTrash(false);
    const raw = e.dataTransfer.getData("application/json");
    if (!raw) return;
    let payload;
    try { payload = JSON.parse(raw); } catch { return; }
    const { taskId, fromDate } = payload;
    if (!taskId || !fromDate) return; // only meaningful for day chips
    const next = removeEntry(taskId, fromDate);
    await persistTaskPlan(taskId, next);
  };

  // ----------------------------------------------------------
  // Inline hours editing on a day chip
  // ----------------------------------------------------------
  const adjustHours = async (taskId, dateKey, nextHours) => {
    const h = Math.max(0, Number(nextHours) || 0);
    const next = upsertEntry(taskId, dateKey, h);
    await persistTaskPlan(taskId, next);
  };

  const clearTaskPlan = async (taskId) => {
    await persistTaskPlan(taskId, []);
  };

  return (
    <div className={styles.planBoard}>
      {/* Unplanned column. Doubles as the drop target for
          "remove from day": dropping a day chip here unplans
          that specific day. */}
      <div
        className={`${styles.planColumn} ${styles.unplannedCol} ${dragOverTrash ? styles.dropTarget : ""}`}
        onDragOver={(e) => { e.preventDefault(); setDragOverTrash(true); }}
        onDragLeave={() => setDragOverTrash(false)}
        onDrop={handleDropOnUnplanned}
      >
        <div className={styles.planColumnHeader}>
          <span className={styles.planColumnTitle}>
            <FaInbox /> Unplanned
          </span>
          <span className={styles.planColumnCount}>{unplanned.length}</span>
        </div>

        <div className={styles.planColumnBody}>
          {unplanned.length === 0 && (
            <div className={styles.emptyHint}>
              Nothing left to plan. Drag a day chip back here to free it up.
            </div>
          )}
          {unplanned.map((t) => (
            <div
              key={t._id}
              className={`${styles.taskChip} ${busyTaskId === t._id ? styles.busy : ""}`}
              draggable
              onDragStart={(e) => startDrag(e, { taskId: t._id })}
              title={`${t.title}\n${t.remaining}h remaining of ${t.estimatedHours || 0}h estimated`}
              style={{ borderLeftColor: STATUS_COLORS[t.status] || "#9ca3af" }}
            >
              <div className={styles.taskChipTitle}>{t.title}</div>
              <div className={styles.taskChipMeta}>
                <span
                  className={styles.priorityDot}
                  style={{ background: PRIORITY_COLORS[t.priority] || "#9ca3af" }}
                />
                {t.dueDate && (
                  <span className={styles.dueLabel}>
                    Due {new Date(t.dueDate).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                  </span>
                )}
                <span className={styles.remainingPill}>
                  {t.remaining}h left
                </span>
              </div>
            </div>
          ))}

          {/* Tasks with a partial plan that aren't here get a
              quick "reset" affordance from the day chip itself
              (the trash icon) — see below. */}
        </div>

        <div className={styles.legend}>
          <FaUndo size={10} /> Tip: drag a day chip back here to unplan it.
        </div>
      </div>

      {/* Day columns. Horizontally scrolling so up to 20 weekday
          columns fit in a 4-week window without squishing. */}
      <div className={styles.daysScroller}>
        {days.map((d) => {
          const key = isoDay(d);
          const chips = dayChips[key] || [];
          const dayTotal = chips.reduce((s, c) => s + c.hours, 0);
          const over = dayTotal > capacity + 0.001;
          const isToday = key === isoDay(new Date());
          const isTarget = dragOverKey === key;
          return (
            <div
              key={key}
              className={[
                styles.planColumn,
                styles.dayCol,
                isTarget ? styles.dropTarget : "",
                isToday ? styles.today : "",
              ].join(" ")}
              onDragOver={(e) => { e.preventDefault(); setDragOverKey(key); }}
              onDragLeave={() => setDragOverKey((c) => (c === key ? null : c))}
              onDrop={(e) => handleDropOnDay(e, key)}
            >
              <div className={styles.planColumnHeader}>
                <span className={styles.planColumnTitle}>
                  <FaCalendarDay />
                  {d.toLocaleDateString(undefined, { weekday: "short" })}{" "}
                  {d.toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                </span>
                <span
                  className={styles.planColumnCount}
                  style={over ? { background: "#dc2626", color: "white", borderColor: "#dc2626" } : undefined}
                  title={`${dayTotal.toFixed(1)}h booked / ${capacity}h capacity`}
                >
                  {dayTotal.toFixed(dayTotal >= 10 ? 0 : 1)} / {capacity}h
                </span>
              </div>

              <div className={styles.planColumnBody}>
                {chips.length === 0 && (
                  <div className={styles.dropHere}>Drop a task here</div>
                )}
                {chips.map((c) => (
                  <DayChip
                    key={`${c.task._id}-${key}`}
                    chip={c}
                    onDragStart={(e) =>
                      startDrag(e, {
                        taskId: c.task._id,
                        fromDate: key,
                        hours: c.hours,
                      })
                    }
                    onChangeHours={(h) => adjustHours(c.task._id, key, h)}
                    onRemove={() => adjustHours(c.task._id, key, 0)}
                    onClearAll={() => clearTaskPlan(c.task._id)}
                    busy={busyTaskId === c.task._id}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Single planned-on-this-day card. The hours input commits on
// blur / Enter so the user can scrub multiple times without
// every keystroke hitting the network.
function DayChip({ chip, onDragStart, onChangeHours, onRemove, onClearAll, busy }) {
  const [hours, setHours] = useState(chip.hours);
  useEffect(() => { setHours(chip.hours); }, [chip.hours]);

  const commit = () => {
    const next = Number(hours);
    if (!Number.isFinite(next) || next === chip.hours) return;
    onChangeHours(next);
  };

  return (
    <div
      className={`${styles.dayChip} ${busy ? styles.busy : ""}`}
      draggable
      onDragStart={onDragStart}
      style={{ borderLeftColor: STATUS_COLORS[chip.task.status] || "#9ca3af" }}
    >
      <div className={styles.dayChipRow}>
        <div className={styles.dayChipTitle} title={chip.task.title}>
          {chip.task.title}
        </div>
        <button
          type="button"
          className={styles.iconBtn}
          title="Remove from this day"
          onClick={(e) => { e.stopPropagation(); onRemove(); }}
        >
          <FaTimes />
        </button>
      </div>
      <div className={styles.dayChipRow}>
        <span
          className={styles.priorityDot}
          style={{ background: PRIORITY_COLORS[chip.task.priority] || "#9ca3af" }}
        />
        <div className={styles.hoursWrap}>
          <input
            type="number"
            min={0}
            max={24}
            step={0.5}
            value={hours}
            onChange={(e) => setHours(e.target.value)}
            onBlur={commit}
            onKeyDown={(e) => { if (e.key === "Enter") { e.currentTarget.blur(); } }}
            onClick={(e) => e.stopPropagation()}
            // Stop the chip from being drag-grabbed when the
            // user is trying to type into the input.
            onMouseDown={(e) => e.stopPropagation()}
            draggable={false}
            className={styles.hoursInput}
          />
          <span className={styles.hoursSuffix}>h</span>
        </div>
        <button
          type="button"
          className={styles.iconBtn}
          title="Clear all planned days for this task"
          onClick={(e) => { e.stopPropagation(); onClearAll(); }}
        >
          <FaTrash />
        </button>
      </div>
    </div>
  );
}

// ----- helpers -----
function buildCache(events) {
  const out = {};
  for (const t of events || []) {
    out[t._id] = (t.workPlan || []).map((e) => ({
      _id: e._id,
      date: e.date,
      hours: Number(e.hours) || 0,
    }));
  }
  return out;
}
