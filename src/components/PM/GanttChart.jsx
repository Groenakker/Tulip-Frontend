import React, { useMemo } from "react";
import styles from "./pm.module.css";
import { STATUS_COLORS, fmtDate } from "./pmApi";

// SVG-based Gantt. We compute a date range that covers every
// scheduled task, then draw one row per task: name on the left,
// timeline bar on the right. Dependency arrows are simple
// horizontal-then-vertical paths drawn between predecessor end
// and successor start.
//
// Width auto-fits so the parent can scroll horizontally for
// long projects. Tasks without dates are skipped (they live in
// the backlog) — the empty-state explains that.
const DAY = 24 * 60 * 60 * 1000;
const ROW_H = 36;
const NAME_W = 220;
const DAY_W = 28;
const HEADER_H = 36;

export default function GanttChart({ tasks, onOpenTask }) {
  const scheduled = useMemo(
    () => tasks.filter((t) => t.startDate && t.dueDate),
    [tasks]
  );

  const { from, to, totalDays } = useMemo(() => {
    if (scheduled.length === 0) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      return { from: today, to: new Date(today.getTime() + 14 * DAY), totalDays: 15 };
    }
    let min = Infinity;
    let max = -Infinity;
    for (const t of scheduled) {
      min = Math.min(min, new Date(t.startDate).getTime());
      max = Math.max(max, new Date(t.dueDate).getTime());
    }
    const f = new Date(min);
    f.setHours(0, 0, 0, 0);
    const tt = new Date(max);
    tt.setHours(0, 0, 0, 0);
    // Pad a couple of days either side for breathing room.
    f.setDate(f.getDate() - 2);
    tt.setDate(tt.getDate() + 2);
    return { from: f, to: tt, totalDays: Math.round((tt - f) / DAY) + 1 };
  }, [scheduled]);

  const colX = (d) => Math.round(((new Date(d).getTime() - from.getTime()) / DAY) * DAY_W);
  const taskY = (i) => HEADER_H + i * ROW_H;
  const indexById = useMemo(() => {
    const m = new Map();
    scheduled.forEach((t, i) => m.set(String(t._id), i));
    return m;
  }, [scheduled]);

  const totalW = NAME_W + totalDays * DAY_W;
  const totalH = HEADER_H + scheduled.length * ROW_H + 12;

  // Month headers across the top of the timeline.
  const monthSegments = useMemo(() => {
    const out = [];
    const cur = new Date(from);
    while (cur <= to) {
      const monthStart = new Date(cur.getFullYear(), cur.getMonth(), 1);
      if (monthStart < from) monthStart.setTime(from.getTime());
      const monthEnd = new Date(cur.getFullYear(), cur.getMonth() + 1, 0);
      const start = monthStart < from ? from : monthStart;
      const end = monthEnd > to ? to : monthEnd;
      const x = NAME_W + colX(start);
      const w = ((end - start) / DAY + 1) * DAY_W;
      out.push({
        label: start.toLocaleDateString(undefined, { month: "short", year: "numeric" }),
        x,
        w,
      });
      cur.setMonth(cur.getMonth() + 1, 1);
    }
    return out;
  }, [from, to]);

  if (scheduled.length === 0) {
    return (
      <div className={styles.emptyState}>
        No scheduled tasks yet. Add start and due dates on tasks so they
        appear on the Gantt chart.
      </div>
    );
  }

  // Today marker
  const todayX = (() => {
    const t = new Date();
    if (t < from || t > to) return null;
    return NAME_W + colX(t);
  })();

  return (
    <div className={styles.ganttWrapper}>
      <svg width={totalW} height={totalH} role="img" aria-label="Gantt chart">
        {/* Background grid - alternating columns for visual rhythm */}
        {Array.from({ length: totalDays }).map((_, i) => {
          const d = new Date(from.getTime() + i * DAY);
          const isWeekend = d.getDay() === 0 || d.getDay() === 6;
          return (
            <rect
              key={i}
              x={NAME_W + i * DAY_W}
              y={HEADER_H}
              width={DAY_W}
              height={totalH - HEADER_H}
              fill={isWeekend ? "#f3f4f6" : "#ffffff"}
            />
          );
        })}

        {/* Month headers */}
        {monthSegments.map((m, i) => (
          <g key={i}>
            <rect x={m.x} y={0} width={m.w} height={HEADER_H} fill="#f9fafb" stroke="#e5e7eb" />
            <text
              x={m.x + 8}
              y={HEADER_H / 2 + 4}
              fontSize={11}
              fontWeight="700"
              fill="#374151"
            >
              {m.label}
            </text>
          </g>
        ))}

        {/* Name column header */}
        <rect x={0} y={0} width={NAME_W} height={HEADER_H} fill="#f9fafb" stroke="#e5e7eb" />
        <text x={12} y={HEADER_H / 2 + 4} fontSize={11} fontWeight="700" fill="#374151">
          Task
        </text>

        {/* Today line */}
        {todayX !== null && (
          <line
            x1={todayX}
            y1={0}
            x2={todayX}
            y2={totalH}
            stroke="#dc2626"
            strokeWidth={1.5}
            strokeDasharray="4 3"
          />
        )}

        {/* Task rows */}
        {scheduled.map((t, i) => {
          const x = NAME_W + colX(t.startDate);
          const w = Math.max(
            DAY_W,
            (((new Date(t.dueDate) - new Date(t.startDate)) / DAY) + 1) * DAY_W
          );
          const y = taskY(i);
          const color = STATUS_COLORS[t.status] || "#4570B6";
          const progress = clamp(Number(t.actualHours || 0) / Math.max(0.001, Number(t.estimatedHours || 0)), 0, 1);
          return (
            <g key={t._id} onClick={() => onOpenTask?.(t)} style={{ cursor: "pointer" }}>
              {/* Name cell */}
              <rect
                x={0}
                y={y}
                width={NAME_W}
                height={ROW_H}
                fill="#f9fafb"
                stroke="#f1f5f9"
              />
              <text
                x={12}
                y={y + ROW_H / 2 + 4}
                fontSize={12}
                fill="#111827"
                fontWeight="600"
              >
                {clip(t.title, 28)}
              </text>

              {/* Bar */}
              <rect
                x={x}
                y={y + 8}
                width={w}
                height={ROW_H - 16}
                rx={6}
                fill={`${color}33`}
                stroke={color}
              />
              {/* Progress overlay */}
              {progress > 0 && (
                <rect
                  x={x}
                  y={y + 8}
                  width={w * progress}
                  height={ROW_H - 16}
                  rx={6}
                  fill={color}
                />
              )}
              <text
                x={x + 6}
                y={y + ROW_H / 2 + 4}
                fontSize={10}
                fill="#111827"
                fontWeight="600"
              >
                {fmtDate(t.startDate)} → {fmtDate(t.dueDate)}
              </text>
            </g>
          );
        })}

        {/* Dependency arrows */}
        {scheduled.map((t) =>
          (t.dependencies || []).map((depId) => {
            const fromIdx = indexById.get(String(depId));
            if (fromIdx === undefined) return null;
            const dep = scheduled[fromIdx];
            const x1 = NAME_W + colX(dep.dueDate) + DAY_W; // right edge of predecessor bar
            const y1 = taskY(fromIdx) + ROW_H / 2;
            const x2 = NAME_W + colX(t.startDate); // left edge of successor bar
            const y2 = taskY(indexById.get(String(t._id))) + ROW_H / 2;
            const midX = Math.max(x1 + 8, x2 - 8);
            const path = `M ${x1} ${y1} L ${midX} ${y1} L ${midX} ${y2} L ${x2} ${y2}`;
            return (
              <g key={`${t._id}-${depId}`}>
                <path d={path} fill="none" stroke="#94a3b8" strokeWidth={1.5} />
                <polygon
                  points={`${x2},${y2} ${x2 - 6},${y2 - 4} ${x2 - 6},${y2 + 4}`}
                  fill="#94a3b8"
                />
              </g>
            );
          })
        )}
      </svg>
    </div>
  );
}

function clamp(n, min, max) { return Math.max(min, Math.min(max, n)); }
function clip(s, n) { return (s || "").length > n ? (s || "").slice(0, n - 1) + "…" : s; }
